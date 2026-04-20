import { create } from 'zustand';
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
  createdAt: number;
}

interface ProjectState {
  projects: Project[];
  sortKey: 'name' | 'date';
  sortDirection: 'asc' | 'desc';
  isLoading: boolean;
  
  // Actions
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  copyProject: (id: string) => Promise<void>;
  setSort: (key: 'name' | 'date', direction: 'asc' | 'desc') => void;
  
  // Helpers
  getSortedProjects: (parentId: string | null) => Project[];
  syncTotals: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  sortKey: 'name',
  sortDirection: 'asc',
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
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
          let currentQuota = 0;
          let currentParticipantCount = 0;
          let minDate = p.startDate;
          let maxDate = p.endDate;

          // 1. 해당 사업의 세션(sessions) 기반 통계 및 날짜 계산
          if (p.sessions && p.sessions.length > 0) {
            currentParticipantCount = p.sessions.reduce((sum, s) => sum + (s.participantCount || 0), 0);
            
            const sessionStartDates = p.sessions.map(s => s.startDate).filter(Boolean);
            const sessionEndDates = p.sessions.map(s => s.endDate).filter(Boolean);
            
            if (sessionStartDates.length > 0) {
              minDate = sessionStartDates.reduce((min, cur) => cur < min ? cur : min);
            }
            if (sessionEndDates.length > 0) {
              maxDate = sessionEndDates.reduce((max, cur) => cur > max ? cur : max);
            }
          }
          
          // 2. 하위 사업(children) 기반 통계 합산 (있는 경우 기존 세션 데이터에 추가)
          const children = updatedProjects.filter(child => child.parentId === p.id);
          if (children.length > 0) {
            currentQuota += children.reduce((sum, c) => sum + (c.quota || 0), 0);
            currentParticipantCount += children.reduce((sum, c) => sum + (c.participantCount || 0), 0);
            
            const childStartDates = children.map(c => c.startDate).filter(Boolean);
            const childEndDates = children.map(c => c.endDate).filter(Boolean);
            
            if (childStartDates.length > 0) {
              const childrenMin = childStartDates.reduce((min, cur) => cur < min ? cur : min);
              if (!minDate || childrenMin < minDate) minDate = childrenMin;
            }
            if (childEndDates.length > 0) {
              const childrenMax = childEndDates.reduce((max, cur) => cur > max ? cur : max);
              if (!maxDate || childrenMax > maxDate) maxDate = childrenMax;
            }
          }

          // 최종 값 반영
          updatedProjects[idx] = {
            ...updatedProjects[idx],
            quota: currentQuota || p.quota, // 하위가 없으면 본인 정원 유지
            participantCount: currentParticipantCount,
            startDate: minDate,
            endDate: maxDate
          };
        }
      });
    }

    set({ projects: updatedProjects });
  },

  addProject: async (projectData) => {
    const { error } = await supabase
      .from('projects')
      .insert([{
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
      }]);

    if (error) throw error;
    await get().fetchProjects();
  },

  updateProject: async (id, updates) => {
    const { error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        start_date: updates.startDate,
        end_date: updates.endDate,
        start_time: updates.startTime,
        end_time: updates.endTime,
        description: updates.description,
        parent_id: updates.parentId,
        level: updates.level,
        partner_id: updates.partnerId,
        location: updates.location,
        quota: updates.quota,
        participant_count: updates.participantCount,
        sessions: updates.sessions,
      })
      .eq('id', id);

    if (error) throw error;
    await get().fetchProjects();
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
    
    // 재귀 복사 헬퍼 함수
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

      // 하위 프로젝트 찾기
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
    const { projects, sortKey, sortDirection } = get();
    const filtered = projects.filter((p) => p.parentId === parentId);

    return [...filtered].sort((a, b) => {
      // 1. LV1, LV2는 이름순 (숫자 prefix 고려)
      if (a.level <= 2) {
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      }

      // 2. LV3, LV4는 무조건 일정순 (시작일 ASC -> 종료일 ASC)
      if (a.startDate !== b.startDate) {
        return (a.startDate || '').localeCompare(b.startDate || '');
      }
      return (a.endDate || '').localeCompare(b.endDate || '');
    });
  },
}));
