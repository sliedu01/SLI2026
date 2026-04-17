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
  
  // Helpers
  createDefaultQuestions: (type: SurveyType) => Question[];
  getAggregatedStats: (projects: any[], projectId: string | null, partnerId?: string, type?: SurveyType) => Record<string, number>;
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
  },

  createDefaultQuestions: (type) => {
    if (type === 'SATISFACTION') {
      return [
        { id: 'q1', division: '교육 시설', theme: '인프라', content: '강의실 환경 및 시설이 쾌적하였습니까?', type: 'SCALE', order: 1 },
        { id: 'q2', division: '교육 시설', theme: '인프라', content: '교육 장비 및 네트워크가 원활하였습니까?', type: 'SCALE', order: 2 },
        { id: 'q3', division: '교육 내용', theme: '교재/콘텐츠', content: '교육 교재 및 자료가 적절하였습니까?', type: 'SCALE', order: 3 },
        { id: 'q4', division: '교육 내용', theme: '난이도', content: '교육 과정의 난이도가 본인의 수준에 적절하였습니까?', type: 'SCALE', order: 4 },
        { id: 'q5', division: '강사/강의', theme: '전달력', content: '강사의 강의 전달력 및 전문성이 뛰어났습니까?', type: 'SCALE', order: 5 },
        { id: 'q6', division: '강사/강의', theme: '질의응답', content: '질문에 대해 전문적이고 성실하게 답변해 주었습니까?', type: 'SCALE', order: 6 },
        { id: 'q7', division: '종합 만족도', theme: '추천의향', content: '이 교육 과정을 주변에 추천할 의사가 있습니까?', type: 'SCALE', order: 7 },
        { id: 'q8', division: '종합 만족도', theme: '개선제언', content: '교육에 대한 건의사항이나 개선 제언을 자유롭게 작성해 주세요.', type: 'TEXT', order: 8 },
      ];
    } else {
      return [
        { id: 'v1', division: '기술 역량', theme: '기술 이해', content: '대상 기술의 최신 트렌드를 설명할 수 있습니까?', type: 'SCALE', order: 1 },
        { id: 'v2', division: '기술 역량', theme: '도구 활용', content: '업무에 필요한 핵심 도구 및 프레임워크를 조작할 수 있습니까?', type: 'SCALE', order: 2 },
        { id: 'v3', division: '실무 해결', theme: '문제 해결', content: '습득한 기술을 실무 문제 해결에 적용할 수 있습니까?', type: 'SCALE', order: 3 },
        { id: 'v4', division: '실무 해결', theme: '협업 능력', content: '기술적 이슈에 대해 팀원과 원활하게 소통할 수 있습니까?', type: 'SCALE', order: 4 },
      ];
    }
  },

  getAggregatedStats: (projects, projectId, partnerId, type) => {
    const { responses } = get();
    
    // 1. 기초 데이터 확보: 프로젝트별 평균 점수 계산 (LV4, LV3 등 직접 입력 데이터)
    const projectAverages: Record<string, { avg: number, count: number }> = {};
    
    responses.forEach(res => {
      // 1-1. 유형별 필터 (만족도/역량진단)
      if (type) {
        const tmpl = get().templates.find(t => t.id === res.templateId);
        if (tmpl?.type !== type) return;
      }

      // 1-2. 파트너 필터 적용
      if (partnerId) {
        const proj = projects.find(p => p.id === res.projectId);
        if (proj?.partnerId !== partnerId) return;
      }

      const validAnswers = res.answers.filter(a => a.score !== undefined);
      if (validAnswers.length === 0) return;

      const resAvg = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / validAnswers.length;
      
      if (!projectAverages[res.projectId]) {
        projectAverages[res.projectId] = { avg: resAvg, count: 1 };
      } else {
        const current = projectAverages[res.projectId];
        projectAverages[res.projectId] = { 
          avg: (current.avg * current.count + resAvg) / (current.count + 1),
          count: current.count + 1
        };
      }
    });

    // 2. 계층형 집계 (LV4 -> LV3 -> LV2 -> LV1)
    const aggregatedData: Record<string, number> = {};

    const calculateRecursive = (id: string): number => {
      const children = projects.filter(p => p.parentId === id);
      
      // 직접 입력된 데이터가 있는 경우 (주로 LV4, LV3)
      const directAvg = projectAverages[id]?.avg || 0;

      if (children.length === 0) {
        return directAvg;
      }

      // 하위 프로젝트들의 평균의 평균 계산
      const childAvgs = children.map(c => calculateRecursive(c.id)).filter(v => v > 0);
      
      if (childAvgs.length === 0) return directAvg;
      
      // 본인이 점수가 있고 자식도 있는 경우 -> 가중치 없이 평균냄 (보통은 상위는 자식 합산이 원칙)
      const childrenMean = childAvgs.reduce((a, b) => a + b, 0) / childAvgs.length;
      return childrenMean;
    };

    // 타겟이 있으면 해당 타겟부터 시작, 없으면 루트(LV1)들 전체 집계
    if (projectId) {
      aggregatedData[projectId] = calculateRecursive(projectId);
    } else {
      projects.filter(p => p.level === 1).forEach(p => {
        aggregatedData[p.id] = calculateRecursive(p.id);
      });
    }

    return aggregatedData;
  }
}));
