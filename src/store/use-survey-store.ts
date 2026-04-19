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
  getAggregatedStats: (projects: Project[], projectIds?: string[], partnerId?: string, type?: SurveyType) => Record<string, { 
    avg: number; 
    satAvg: number; 
    preAvg: number; 
    postAvg: number; 
    satCount: number;
    compCount: number;
    count: number;
    totalAverage: number;
    hakeGain: number;
    cohensD: number;
    pValue: number;
    questionStats: Array<{
      preAvg: number;
      postAvg: number;
      average: number;
    }>;
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

  getAggregatedStats: (projects, projectIds, partnerId, type) => {
    const { responses, templates } = get();
    // Dynamic import to avoid circular dependency or issues during build
    const { calculateHakeGain, calculateCohensD, calculatePairedTTest, getPValueFromT } = require('@/lib/stat-utils');

    const projectData: Record<string, { 
      preScores: number[][],
      postScores: number[][],
      satScores: number[][],
      responses: SurveyResponse[]
    }> = {};

    responses.forEach(res => {
      const tmpl = templates.find(t => t.id === res.templateId);
      if (!tmpl) return;
      if (type && tmpl.type !== type) return;
      if (partnerId) {
        const proj = projects.find(p => p.id === res.projectId);
        if (proj?.partnerId !== partnerId) return;
      }

      if (!projectData[res.projectId]) {
        projectData[res.projectId] = { preScores: [], postScores: [], satScores: [], responses: [] };
      }
      
      const pData = projectData[res.projectId];
      pData.responses.push(res);

      if (tmpl.type === 'SATISFACTION') {
        res.answers.forEach((ans, idx) => {
          if (ans.score === undefined) return;
          if (!pData.satScores[idx]) pData.satScores[idx] = [];
          pData.satScores[idx].push(Number(ans.score));
        });
      } else {
        res.answers.forEach((ans, idx) => {
          if (ans.score === undefined) return;
          if (!pData.preScores[idx]) pData.preScores[idx] = [];
          if (!pData.postScores[idx]) pData.postScores[idx] = [];
          pData.preScores[idx].push(Number(ans.preScore || 0));
          pData.postScores[idx].push(Number(ans.score));
        });
      }
    });

    const aggregated: Record<string, any> = {};

    const calculateRecursive = (id: string) => {
      const children = projects.filter(p => p.parentId === id);
      
      let combined = {
        preScores: [...(projectData[id]?.preScores || [])],
        postScores: [...(projectData[id]?.postScores || [])],
        satScores: [...(projectData[id]?.satScores || [])],
        count: projectData[id]?.responses.length || 0
      };

      children.forEach(c => {
        const cStats = calculateRecursive(c.id);
        if (!cStats) return;
        
        cStats._raw.preScores.forEach((scores: number[], idx: number) => {
          if (!combined.preScores[idx]) combined.preScores[idx] = [];
          combined.preScores[idx].push(...scores);
        });
        cStats._raw.postScores.forEach((scores: number[], idx: number) => {
          if (!combined.postScores[idx]) combined.postScores[idx] = [];
          combined.postScores[idx].push(...scores);
        });
        cStats._raw.satScores.forEach((scores: number[], idx: number) => {
          if (!combined.satScores[idx]) combined.satScores[idx] = [];
          combined.satScores[idx].push(...scores);
        });
        combined.count += cStats.count;
      });

      if (combined.count === 0) return null;

      const allPre = combined.preScores.flat();
      const allPost = combined.postScores.flat();
      const allSat = combined.satScores.flat();

      const preAvg = allPre.length > 0 ? allPre.reduce((a,b)=>a+b,0)/allPre.length : 0;
      const postAvg = allPost.length > 0 ? allPost.reduce((a,b)=>a+b,0)/allPost.length : 0;
      const satAvg = allSat.length > 0 ? allSat.reduce((a,b)=>a+b,0)/allSat.length : 0;

      const hakeGain = calculateHakeGain(preAvg, postAvg);
      const cohensD = calculateCohensD(allPre, allPost);
      const tValue = calculatePairedTTest(allPre, allPost);
      const pValue = getPValueFromT(tValue, Math.max(1, allPost.length - 1));

      const questionStats = [];
      const maxQs = Math.max(combined.preScores.length, combined.satScores.length);
      for(let i=0; i<maxQs; i++) {
        const qPre = combined.preScores[i] || [];
        const qPost = combined.postScores[i] || [];
        const qSat = combined.satScores[i] || [];
        questionStats.push({
          preAvg: qPre.length > 0 ? qPre.reduce((a,b)=>a+b,0)/qPre.length : 0,
          postAvg: qPost.length > 0 ? qPost.reduce((a,b)=>a+b,0)/qPost.length : 0,
          average: qSat.length > 0 ? qSat.reduce((a,b)=>a+b,0)/qSat.length : (qPost.length > 0 ? qPost.reduce((a,b)=>a+b,0)/qPost.length : 0)
        });
      }

      const result = {
        preAvg,
        postAvg,
        satAvg,
        totalAverage: type === 'SATISFACTION' ? satAvg : postAvg,
        hakeGain,
        cohensD,
        pValue,
        count: combined.count,
        questionStats,
        _raw: combined 
      };
      
      aggregated[id] = result;
      return result;
    };

    if (projectIds && projectIds.length > 0) {
      projectIds.forEach(id => calculateRecursive(id));
      
      // 전체 통계 계산을 위한 가상 ID '_overall'
      const overallCombined = {
        preScores: [] as number[][],
        postScores: [] as number[][],
        satScores: [] as number[][],
        count: 0
      };

      projectIds.forEach(id => {
        const stats = aggregated[id];
        if (!stats) return;
        stats._raw.preScores.forEach((scores: number[], idx: number) => {
          if (!overallCombined.preScores[idx]) overallCombined.preScores[idx] = [];
          overallCombined.preScores[idx].push(...scores);
        });
        stats._raw.postScores.forEach((scores: number[], idx: number) => {
          if (!overallCombined.postScores[idx]) overallCombined.postScores[idx] = [];
          overallCombined.postScores[idx].push(...scores);
        });
        stats._raw.satScores.forEach((scores: number[], idx: number) => {
          if (!overallCombined.satScores[idx]) overallCombined.satScores[idx] = [];
          overallCombined.satScores[idx].push(...scores);
        });
        overallCombined.count += stats.count;
      });

      if (overallCombined.count > 0) {
        const allPre = overallCombined.preScores.flat();
        const allPost = overallCombined.postScores.flat();
        const preAvg = allPre.length > 0 ? allPre.reduce((a,b)=>a+b,0)/allPre.length : 0;
        const postAvg = allPost.length > 0 ? allPost.reduce((a,b)=>a+b,0)/allPost.length : 0;
        const satAvg = overallCombined.satScores.flat().length > 0 ? overallCombined.satScores.flat().reduce((a,b)=>a+b,0)/overallCombined.satScores.flat().length : 0;
        
        aggregated['_overall'] = {
          preAvg,
          postAvg,
          satAvg,
          hakeGain: calculateHakeGain(preAvg, postAvg),
          cohensD: calculateCohensD(allPre, allPost),
          pValue: getPValueFromT(calculatePairedTTest(allPre, allPost), Math.max(1, allPost.length - 1)),
          count: overallCombined.count,
          questionStats: Array.from({ length: Math.max(overallCombined.preScores.length, overallCombined.satScores.length) }).map((_, i) => ({
            preAvg: (overallCombined.preScores[i] || []).length > 0 ? overallCombined.preScores[i].reduce((a,b)=>a+b,0)/overallCombined.preScores[i].length : 0,
            postAvg: (overallCombined.postScores[i] || []).length > 0 ? overallCombined.postScores[i].reduce((a,b)=>a+b,0)/overallCombined.postScores[i].length : 0,
            average: (overallCombined.satScores[i] || []).length > 0 ? overallCombined.satScores[i].reduce((a,b)=>a+b,0)/overallCombined.satScores[i].length : 0
          }))
        };
      }
    } else {
      projects.filter(p => p.level === 1).forEach(p => calculateRecursive(p.id));
    }

    return aggregated;
  },

  // 프로젝트 단위의 통합 데이터 및 동적 템플릿 정보 반환
  getUnifiedProjectData: (targetId: string) => {
    const { responses, templates } = get();
    
    // 대상 ID가 세부 프로그램(LV4)인 경우와 상위 사업(LV1~3)인 경우를 모두 고려
    const projectResponses = responses.filter(r => r.projectId === targetId);
    
    // 이 프로젝트/프로그램에서 사용된 모든 템플릿 추출
    const usedTemplateIds = Array.from(new Set(projectResponses.map(r => r.templateId)));
    const relevantTemplates = templates.filter(t => usedTemplateIds.includes(t.id));
    
    // 유형별 최신 템플릿
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
