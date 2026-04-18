import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Project } from './use-project-store';

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
  updateResponse: (id: string, response: Partial<Omit<SurveyResponse, 'id' | 'createdAt'>>) => Promise<void>;
  deleteResponse: (id: string) => Promise<void>;
  clearProjectResponses: (projectId: string) => Promise<void>;
  
  // Helpers
  createDefaultQuestions: (type: SurveyType) => Question[];
  getAggregatedStats: (projects: Project[], projectId: string | null, partnerId?: string, type?: SurveyType) => Record<string, { 
    avg: number; 
    satAvg: number; 
    preAvg: number; 
    postAvg: number; 
    satCount: number;
    compCount: number;
    count: number 
  }>;
  getUnifiedProjectData: (projectId: string) => {
    mergedResponses: Array<{
      respondentId: string;
      satResponses: SurveyResponse[];
      compResponses: SurveyResponse[];
      lastUpdate: number;
    }>;
    templates: {
      all: SurveyTemplate[];
      sat: SurveyTemplate[];
      comp: SurveyTemplate[];
    };
  };
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

  updateResponse: async (id, response) => {
    const { error } = await supabase.from('surveys').update({
      project_id: response.projectId,
      template_id: response.templateId,
      respondent_id: response.respondentId,
      answers: response.answers
    }).eq('id', id);
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
    const { responses, templates } = get();
    
    // 1. 기초 데이터 확보: 프로젝트별 평균 점수 계산
    const projectAverages: Record<string, { 
      avg: number, // Legacy 지원용 (POST 평균)
      satAvg: number, 
      preAvg: number, 
      postAvg: number, 
      satCount: number,
      compCount: number,
      count: number 
    }> = {};
    
    responses.forEach(res => {
      const tmpl = templates.find(t => t.id === res.templateId);
      if (!tmpl) return;

      // 1-1. 유형별 필터 (요청된 경우에만 적용)
      if (type && tmpl.type !== type) return;

      // 1-2. 파트너 필터 적용
      if (partnerId) {
        const proj = projects.find(p => p.id === res.projectId);
        if (proj?.partnerId !== partnerId) return;
      }

      const validAnswers = res.answers.filter(a => a.score !== undefined);
      if (validAnswers.length === 0) return;

      const resPostTotal = validAnswers.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
      const resAvg = resPostTotal / validAnswers.length;

      if (!projectAverages[res.projectId]) {
        projectAverages[res.projectId] = { avg: 0, satAvg: 0, preAvg: 0, postAvg: 0, satCount: 0, compCount: 0, count: 0 };
      }

      const current = projectAverages[res.projectId];
      
      if (tmpl.type === 'SATISFACTION') {
        const newCount = current.satCount + 1;
        current.satAvg = (current.satAvg * current.satCount + resAvg) / newCount;
        current.satCount = newCount;
      } else {
        const resPreTotal = validAnswers.reduce((sum, a) => sum + (Number(a.preScore) || 0), 0);
        const resPreAvg = resPreTotal / validAnswers.length;
        const newCount = current.compCount + 1;
        current.preAvg = (current.preAvg * current.compCount + resPreAvg) / newCount;
        current.postAvg = (current.postAvg * current.compCount + resAvg) / newCount;
        current.compCount = newCount;
      }
      
      // 전체 통합 카운트 및 평균 (POST 기준)
      const newTotalCount = current.count + 1;
      current.avg = (current.avg * current.count + resAvg) / newTotalCount;
      current.count = newTotalCount;
    });

    // 2. 계층형 집계 (LV4 -> LV3 -> LV2 -> LV1)
    const aggregatedData: Record<string, { 
      avg: number; 
      satAvg: number; 
      preAvg: number; 
      postAvg: number; 
      satCount: number;
      compCount: number;
      count: number 
    }> = {};

    const calculateRecursive = (id: string): { 
      avg: number; 
      satAvg: number; 
      preAvg: number; 
      postAvg: number; 
      satCount: number;
      compCount: number;
      count: number 
    } => {
      const children = projects.filter(p => p.parentId === id);
      const directData = projectAverages[id] || { avg: 0, satAvg: 0, preAvg: 0, postAvg: 0, satCount: 0, compCount: 0, count: 0 };

      if (children.length === 0) return directData;

      const childStats = children.map(c => calculateRecursive(c.id)).filter(s => s.count > 0 || s.avg > 0);
      if (childStats.length === 0) return directData;
      
      const totalCount = childStats.reduce((acc, s) => acc + s.count, 0) + directData.count;
      const satTotalCount = childStats.reduce((acc, s) => acc + s.satCount, 0) + directData.satCount;
      const compTotalCount = childStats.reduce((acc, s) => acc + s.compCount, 0) + directData.compCount;

      const weightedAvg = (childStats.reduce((acc, s) => acc + s.avg * s.count, 0) + directData.avg * directData.count) / (totalCount || 1);
      const weightedSatAvg = (childStats.reduce((acc, s) => acc + s.satAvg * s.satCount, 0) + directData.satAvg * directData.satCount) / (satTotalCount || 1);
      const weightedPreAvg = (childStats.reduce((acc, s) => acc + s.preAvg * s.compCount, 0) + directData.preAvg * directData.compCount) / (compTotalCount || 1);
      const weightedPostAvg = (childStats.reduce((acc, s) => acc + s.postAvg * s.compCount, 0) + directData.postAvg * directData.compCount) / (compTotalCount || 1);

      return {
        avg: weightedAvg,
        satAvg: weightedSatAvg,
        preAvg: weightedPreAvg,
        postAvg: weightedPostAvg,
        satCount: satTotalCount,
        compCount: compTotalCount,
        count: totalCount
      };
    };

    if (projectId) {
      aggregatedData[projectId] = calculateRecursive(projectId);
    } else {
      projects.filter(p => p.level === 1).forEach(p => {
        aggregatedData[p.id] = calculateRecursive(p.id);
      });
    }

    return aggregatedData;
  },

  // 프로젝트 단위의 통합 데이터 및 동적 템플릿 정보 반환
  getUnifiedProjectData: (targetId: string) => {
    const { responses, templates } = get();
    
    // 대상 ID가 세부 프로그램(LV4)인 경우와 상위 사업(LV1~3)인 경우를 모두 고려
    // 단순히 responses.filter(r => r.projectId === targetId) 뿐만 아니라 
    // 실제 해당 단위에 속한 데이터를 더 정확히 가져오도록 필터링함
    const projectResponses = responses.filter(r => r.projectId === targetId);
    
    if (projectResponses.length === 0 && targetId) {
      // 만약 직접적인 매칭이 없다면, 상위 레벨에서 하위의 모든 응답을 긁어오는 로직 (필요시)
      // 현재는 프로젝트 ID가 리프 노드(LV4)라고 가정함
    }

    // 이 프로젝트/프로그램에서 사용된 모든 템플릿 추출
    const usedTemplateIds = Array.from(new Set(projectResponses.map(r => r.templateId)));
    const relevantTemplates = templates.filter(t => usedTemplateIds.includes(t.id));
    
    // 유형별 최신 템플릿 (UI 레이아웃 결정용 또는 기본 템플릿용)
    const satTemplates = relevantTemplates.filter(t => t.type === 'SATISFACTION').sort((a,b) => b.createdAt - a.createdAt);
    const compTemplates = relevantTemplates.filter(t => t.type === 'COMPETENCY').sort((a,b) => b.createdAt - a.createdAt);

    // respondentId 기준으로 데이터 병합
    const mergedMap = new Map<string, {
      respondentId: string;
      satResponses: SurveyResponse[];
      compResponses: SurveyResponse[];
      lastUpdate: number;
    }>();

    projectResponses.forEach(res => {
      const tmpl = relevantTemplates.find(t => t.id === res.templateId);
      if (!tmpl) return;

      if (!mergedMap.has(res.respondentId)) {
        mergedMap.set(res.respondentId, {
          respondentId: res.respondentId,
          satResponses: [],
          compResponses: [],
          lastUpdate: res.createdAt
        });
      }

      const entry = mergedMap.get(res.respondentId)!;
      if (tmpl.type === 'SATISFACTION') entry.satResponses.push(res);
      else entry.compResponses.push(res);
      if (res.createdAt > entry.lastUpdate) entry.lastUpdate = res.createdAt;
    });

    return {
      mergedResponses: Array.from(mergedMap.values()).sort((a, b) => a.respondentId.localeCompare(b.respondentId)),
      templates: {
        all: relevantTemplates,
        sat: satTemplates,
        comp: compTemplates
      }
    };
  }
}));
