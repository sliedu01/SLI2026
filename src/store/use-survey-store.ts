import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface SurveyResponse {
  id: string;
  projectId: string;
  userId: string;
  answers: Record<string, any>;
  metadata: Record<string, any>;
  completedAt: string;
}

interface SurveyState {
  responses: SurveyResponse[];
  isLoading: boolean;
  
  // Actions
  fetchResponses: () => Promise<void>;
  addResponse: (response: Omit<SurveyResponse, 'id' | 'completedAt'>) => Promise<void>;
  updateResponse: (id: string, updates: Partial<SurveyResponse>) => Promise<void>;
  deleteResponse: (id: string) => Promise<void>;
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  responses: [],
  isLoading: false,

  fetchResponses: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching surveys:', error);
    } else {
      const mappedResponses: SurveyResponse[] = (data || []).map(s => ({
        id: s.id,
        projectId: s.project_id,
        userId: s.user_id || '',
        answers: (s.answers as Record<string, any>) || {},
        metadata: (s.metadata as Record<string, any>) || {},
        completedAt: s.completed_at,
      }));
      set({ responses: mappedResponses });
    }
    set({ isLoading: false });
  },

  addResponse: async (responseData) => {
    const { error } = await supabase
      .from('surveys')
      .insert([{
        project_id: responseData.projectId,
        user_id: responseData.userId,
        answers: responseData.answers,
        metadata: responseData.metadata,
      }]);

    if (error) throw error;
    await get().fetchResponses();
  },

  updateResponse: async (id, updates) => {
    const { error } = await supabase
      .from('surveys')
      .update({
        project_id: updates.projectId,
        user_id: updates.userId,
        answers: updates.answers,
        metadata: updates.metadata,
      })
      .eq('id', id);

    if (error) throw error;
    await get().fetchResponses();
  },

  deleteResponse: async (id) => {
    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await get().fetchResponses();
  },
}));
