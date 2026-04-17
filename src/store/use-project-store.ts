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

    for (let lv = 4; lv >= 1; lv--) {
      updatedProjects.forEach((p, idx) => {
        if (p.level === lv) {
          if (lv === 4 && p.sessions && p.sessions.length > 0) {
            // LV4는 세션 합계를 자동 반영
            const sessionSum = p.sessions.reduce((sum, s) => sum + (s.participantCount || 0), 0);
            updatedProjects[idx] = { ...p, participantCount: sessionSum };
          }
          
          const children = updatedProjects.filter(child => child.parentId === p.id);
          if (children.length > 0) {
            updatedProjects[idx] = {
              ...updatedProjects[idx], // LV4에서 이미 업데이트되었을 수 있으므로
              quota: children.reduce((sum, c) => sum + (c.quota || 0), 0),
              participantCount: children.reduce((sum, c) => sum + (c.participantCount || 0), 0)
            };
          }
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
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'date') {
        comparison = (a.startDate || '').localeCompare(b.startDate || '');
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  },
}));
