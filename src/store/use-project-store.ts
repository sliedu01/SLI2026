import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

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
          const children = updatedProjects.filter(child => child.parentId === p.id);
          if (children.length > 0) {
            updatedProjects[idx] = {
              ...p,
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
