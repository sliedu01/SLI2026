import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// UI(surveys/page.tsx) 요구 규격에 맞춘 타입 리네임
export type SurveyType = 'COMPETENCY' | 'SATISFACTION';

export interface Question {
  id: string;
  division: string;
  theme: string;
  content: string;
  type: 'SCALE' | 'TEXT';
  order: number;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  type: SurveyType;
  questions: Question[];
  createdAt: number;
}

export interface Answer {
  questionId: string;
  preScore?: number;
  score: number;
  text?: string; // 추가: 텍스트 응답 지원
}

export interface SurveyResponse {
  id: string;
  projectId: string;
  templateId: string;
  respondentId: string;
  answers: Answer[];
  createdAt: number;
}

interface SurveyState {
  templates: SurveyTemplate[];
  responses: SurveyResponse[];
  isLoading: boolean;
  
  // Actions
  fetchSurveys: () => Promise<void>;
  addTemplate: (template: Omit<SurveyTemplate, 'id' | 'createdAt'>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<Omit<SurveyTemplate, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addResponse: (response: Omit<SurveyResponse, 'id' | 'createdAt'>) => Promise<void>;
  deleteResponse: (id: string) => Promise<void>;
  clearProjectResponses: (projectId: string) => Promise<void>;
}

export const useSurveyStore = create<SurveyState>((set, get) => ({
  templates: [],
  responses: [],
  isLoading: false,

  fetchSurveys: async () => {
    set({ isLoading: true });
    
    // 템플릿과 응답 데이터를 동시에 가져옴
    const [tmplRes, respRes] = await Promise.all([
      supabase.from('survey_templates').select('*').order('created_at', { ascending: false }),
      supabase.from('surveys').select('*').order('created_at', { ascending: false }),
    ]);

    const mappedTemplates: SurveyTemplate[] = (tmplRes.data || []).map(t => ({
      id: t.id,
      name: t.name,
      type: t.type as SurveyType,
      questions: t.questions,
      createdAt: new Date(t.created_at).getTime(),
    }));

    const mappedResponses: SurveyResponse[] = (respRes.data || []).map(r => ({
      id: r.id,
      projectId: r.project_id,
      templateId: r.template_id,
      respondentId: r.respondent_id,
      answers: r.answers,
      createdAt: new Date(r.created_at).getTime(),
    }));

    set({ 
      templates: mappedTemplates, 
      responses: mappedResponses, 
      isLoading: false 
    });
  },

  addTemplate: async (template) => {
    const { error } = await supabase.from('survey_templates').insert([{
      name: template.name,
      type: template.type,
      questions: template.questions
    }]);
    if (error) throw error;
    await get().fetchSurveys();
  },

  updateTemplate: async (id, template) => {
    const { error } = await supabase.from('survey_templates').update({
      name: template.name,
      type: template.type,
      questions: template.questions
    }).eq('id', id);
    if (error) throw error;
    await get().fetchSurveys();
  },

  deleteTemplate: async (id) => {
    const { error } = await supabase.from('survey_templates').delete().eq('id', id);
    if (error) throw error;
    await get().fetchSurveys();
  },

  addResponse: async (response) => {
    const { error } = await supabase.from('surveys').insert([{
      project_id: response.projectId,
      template_id: response.templateId,
      respondent_id: response.respondentId,
      answers: response.answers
    }]);
    if (error) throw error;
    await get().fetchSurveys();
  },

  deleteResponse: async (id) => {
    const { error } = await supabase.from('surveys').delete().eq('id', id);
    if (error) throw error;
    await get().fetchSurveys();
  },

  clearProjectResponses: async (projectId) => {
    const { error } = await supabase.from('surveys').delete().eq('project_id', projectId);
    if (error) throw error;
    await get().fetchSurveys();
  }
}));
