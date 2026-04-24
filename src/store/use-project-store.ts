import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface ProjectSession {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  content: string;
  participantCount: number;
}

export interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  parentId: string | null; 
  level: number; 
  partnerId?: string; 
  location?: string; 
  quota: number; 
  participantCount: number; 
  sessions?: ProjectSession[]; // 다차시 정보
  abbreviation?: string; // 사업 약어
  createdAt: number;
}

interface ProjectState {
  projects: Project[];
  selectedLv1Ids: string[];
  sortKey: 'name' | 'date';
  sortDirection: 'asc' | 'desc';
  isLoading: boolean;
  
  // Actions
  fetchProjects: () => Promise<void>;
  setSelectedLv1Ids: (ids: string[]) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  copyProject: (id: string) => Promise<void>;
  setSort: (key: 'name' | 'date', direction: 'asc' | 'desc') => void;
  
  // Helpers
  getSortedProjects: (parentId: string | null) => Project[];
  syncTotals: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      selectedLv1Ids: [],
      sortKey: 'name',
      sortDirection: 'asc',
      isLoading: false,

      setSelectedLv1Ids: (ids) => set({ selectedLv1Ids: ids }),

      fetchProjects: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching projects:', error);
        } else {
          // 로컬 스토리지에서 약어 데이터 로드 (DB 컬럼 부재 대비)
          const localAbbrs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('project_abbreviations') || '{}') : {};

          const mappedProjects: Project[] = (data || []).map(p => ({
            id: p.id,
            name: p.name,
            startDate: p.start_date || '',
            endDate: p.end_date || '',
            startTime: p.start_time || '',
            endTime: p.end_time || '',
            description: p.description || '',
            parentId: p.parent_id,
            level: p.level,
            partnerId: p.partner_id || undefined,
            location: p.location || '',
            quota: p.quota || 0,
            participantCount: p.participant_count || 0,
            sessions: p.sessions || [],
            abbreviation: localAbbrs[p.id] || p.abbreviation || '',
            createdAt: new Date(p.created_at).getTime(),
          }));
          set({ projects: mappedProjects });
          get().syncTotals();
        }
        set({ isLoading: false });
      },

      syncTotals: () => {
        const { projects } = get();
        const updatedProjects = [...projects];

        // 하위에서 상위로 (LV4 -> LV1) 통계 및 날짜 합산
        for (let lv = 4; lv >= 1; lv--) {
          updatedProjects.forEach((p, idx) => {
            if (p.level === lv) {
              updatedProjects[idx] = getAggregatedProject(p, updatedProjects);
            }
          });
        }

        set({ projects: updatedProjects });
      },

      addProject: async (projectData) => {
          const newRecord = {
            name: projectData.name,
            start_date: projectData.startDate,
            end_date: projectData.endDate,
            start_time: projectData.startTime,
            end_time: projectData.endTime,
            description: projectData.description,
            parent_id: projectData.parentId,
            level: projectData.level,
            partner_id: projectData.partnerId,
            location: projectData.location || '', 
            quota: projectData.quota,
            participant_count: projectData.participantCount,
            sessions: projectData.sessions || [],
          };

          const { error } = await supabase
            .from('projects')
            .insert([newRecord]);

        if (error) throw error;
        await get().fetchProjects();
      },

      updateProject: async (id, updates) => {
        if (updates.abbreviation !== undefined && typeof window !== 'undefined') {
          const localAbbrs = JSON.parse(localStorage.getItem('project_abbreviations') || '{}');
          localAbbrs[id] = updates.abbreviation;
          localStorage.setItem('project_abbreviations', JSON.stringify(localAbbrs));
        }

        const updateData: Record<string, unknown> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
        if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
        if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
        if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
        if (updates.level !== undefined) updateData.level = updates.level;
        if (updates.partnerId !== undefined) updateData.partner_id = updates.partnerId;
        if (updates.location !== undefined) updateData.location = updates.location; 
        if (updates.quota !== undefined) updateData.quota = updates.quota;
        if (updates.participantCount !== undefined) updateData.participant_count = updates.participantCount;
        if (updates.sessions !== undefined) updateData.sessions = updates.sessions;
        if (updates.abbreviation !== undefined) updateData.abbreviation = updates.abbreviation;

        const { error } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', id);

        if (error) {
          console.warn('Database update failed, but local storage fallback used:', error);
          set(state => ({
            projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
          }));
        } else {
          await get().fetchProjects();
        }
      },

      deleteProject: async (id) => {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) throw error;
        await get().fetchProjects();
      },

      copyProject: async (id) => {
        const { projects, fetchProjects } = get();
        
        const copyRecursive = async (sourceId: string, newParentId: string | null, isRoot: boolean = false) => {
          const source = projects.find(p => p.id === sourceId);
          if (!source) return;

          const newProjectData = {
            name: isRoot ? `[복사] ${source.name}` : source.name,
            start_date: source.startDate,
            end_date: source.endDate,
            start_time: source.startTime,
            end_time: source.endTime,
            description: source.description,
            parent_id: newParentId,
            level: source.level,
            partner_id: source.partnerId,
            location: source.location || '',
            quota: source.quota,
            participant_count: source.participantCount,
            sessions: source.sessions || [],
          };

          const { data, error } = await supabase
            .from('projects')
            .insert([newProjectData])
            .select()
            .single();

          if (error) throw error;
          if (!data) return;

          const children = projects.filter(p => p.parentId === sourceId);
          for (const child of children) {
            await copyRecursive(child.id, data.id, false);
          }
        };

        try {
          set({ isLoading: true });
          await copyRecursive(id, projects.find(p => p.id === id)?.parentId || null, true);
          await fetchProjects();
        } catch (err) {
          console.error('Failed to copy project:', err);
          alert('복사 중 오류가 발생했습니다.');
        } finally {
          set({ isLoading: false });
        }
      },

      setSort: (key, direction) => {
        set({ sortKey: key, sortDirection: direction });
      },

      getSortedProjects: (parentId) => {
        const { projects } = get();
        const filtered = projects.filter((p) => p.parentId === parentId);

        return [...filtered].sort((a, b) => {
          if (a.level <= 2) {
            return a.name.localeCompare(b.name, undefined, { numeric: true });
          }
          if (a.startDate !== b.startDate) {
            return (a.startDate || '').localeCompare(b.startDate || '');
          }
          return (a.endDate || '').localeCompare(b.endDate || '');
        });
      },
    }),
    {
      name: 'project-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selectedLv1Ids: state.selectedLv1Ids }), // selectedLv1Ids만 유지
    }
  )
);

/**
 * 프로젝트의 세션과 하위 프로젝트를 기반으로 날짜/시간/인원수를 실시간으로 집계하는 헬퍼 함수
 */
export function getAggregatedProject(p: Project, allProjects: Project[]): Project {
  const children = allProjects.filter(child => child.parentId === p.id);
  const aggregatedChildren = children.map(c => getAggregatedProject(c, allProjects));
  
  const hasSessions = p.sessions && p.sessions.length > 0;
  const hasChildren = children.length > 0;

  if (!hasSessions && !hasChildren) {
    return { ...p };
  }

  let minDate = "";
  let maxDate = "";
  let minStartTime = "";
  let maxEndTime = "";
  let totalParticipantCount = 0;
  let totalQuota = hasChildren ? 0 : (p.quota || 0);

  interface TimeSource {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    participantCount: number;
    quota?: number;
  }

  const sources: TimeSource[] = [];
  
  if (hasSessions) {
    p.sessions!.forEach(s => sources.push({
      startDate: s.startDate || "",
      endDate: s.endDate || "",
      startTime: s.startTime || "",
      endTime: s.endTime || "",
      participantCount: s.participantCount || 0
    }));
  }

  if (hasChildren) {
    aggregatedChildren.forEach(c => {
      sources.push({
        startDate: c.startDate || "",
        endDate: c.endDate || "",
        startTime: c.startTime || "",
        endTime: c.endTime || "",
        participantCount: c.participantCount || 0
      });
      totalQuota += (c.quota || 0);
    });
  }

  if (sources.length > 0) {
    minDate = sources.map(s => s.startDate).filter(Boolean).reduce((min, cur) => cur < min ? cur : min);
    maxDate = sources.map(s => s.endDate).filter(Boolean).reduce((max, cur) => cur > max ? cur : max);
    const sameMinDaySources = sources.filter(s => s.startDate === minDate);
    minStartTime = sameMinDaySources.map(s => s.startTime).filter(Boolean).reduce((min, cur) => cur < min ? cur : min, "");
    const sameMaxDaySources = sources.filter(s => s.endDate === maxDate);
    maxEndTime = sameMaxDaySources.map(s => s.endTime).filter(Boolean).reduce((max, cur) => cur > max ? cur : max, "");
    totalParticipantCount = sources.reduce((sum, s) => sum + s.participantCount, 0);
  }

  return {
    ...p,
    startDate: minDate || p.startDate,
    endDate: maxDate || p.endDate,
    startTime: minStartTime || p.startTime,
    endTime: maxEndTime || p.endTime,
    participantCount: totalParticipantCount,
    quota: totalQuota
  };
}

