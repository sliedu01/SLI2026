import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Project } from './use-project-store';

// UI(surveys/page.tsx) 요구 규격에 맞춘 타입 리네임
export type SurveyType = 'COMPETENCY' | 'SATISFACTION' | 'UNIFIED';

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
    const { calculateHakeGain, calculateCohensD, calculatePairedTTest, getPValueFromT } = require('@/lib/stat-utils');

    // 1. 빠른 탐색을 위한 인덱스 생성 (O(1) 접근)
    const templateMap = new Map(templates.map(t => [t.id, t]));
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const childrenMap = new Map<string | null, Project[]>();
    projects.forEach(p => {
      const parent = p.parentId;
      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent)!.push(p);
    });

    // 2. 프로젝트별 RAW 데이터 수집 (O(R))
    const projectData: Record<string, { 
      preScores: number[][],
      postScores: number[][],
      satScores: number[][],
      responses: SurveyResponse[]
    }> = {};

    responses.forEach(res => {
      const tmpl = templateMap.get(res.templateId);
      if (!tmpl) return;
      if (type && type !== 'UNIFIED' && tmpl.type !== type) return;

      if (partnerId) {
        const proj = projectMap.get(res.projectId);
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
          // 주관식 문항(TEXT)은 통계 계산에서 제외 (분모 왜곡 방지)
          if (tmpl.questions[idx]?.type !== 'SCALE') return;
          
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

    // 3. 재귀적 통계 합산 (Memoization 패턴)
    const calculateRecursive = (id: string) => {
      if (aggregated[id]) return aggregated[id];

      const children = childrenMap.get(id) || [];
      const currentRaw = projectData[id] || { preScores: [], postScores: [], satScores: [], responses: [] };
      
      let combined = {
        preScores: currentRaw.preScores.map(s => [...s]),
        postScores: currentRaw.postScores.map(s => [...s]),
        satScores: currentRaw.satScores.map(s => [...s]),
        count: currentRaw.responses.length
      };

      children.forEach(c => {
        const cStats = calculateRecursive(c.id);
        if (!cStats || !cStats._raw) return;
        
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
        hakeGain: calculateHakeGain(preAvg, postAvg),
        cohensD: calculateCohensD(allPre, allPost),
        pValue: getPValueFromT(calculatePairedTTest(allPre, allPost), Math.max(1, allPost.length - 1)),
        count: combined.count,
        questionStats,
        _raw: combined 
      };
      
      aggregated[id] = result;
      return result;
    };

    // 4. 대상 프로젝트별 실행
    if (projectIds && projectIds.length > 0) {
      projectIds.forEach(id => calculateRecursive(id));
      
      // 전체 요약 통계 계산 (_overall)
      const overallCombined = { preScores: [] as number[][], postScores: [] as number[][], satScores: [] as number[][], count: 0 };
      projectIds.forEach(id => {
        const stats = aggregated[id];
        if (!stats?._raw) return;
        stats._raw.preScores.forEach((s: any, i: any) => { if(!overallCombined.preScores[i]) overallCombined.preScores[i]=[]; overallCombined.preScores[i].push(...s); });
        stats._raw.postScores.forEach((s: any, i: any) => { if(!overallCombined.postScores[i]) overallCombined.postScores[i]=[]; overallCombined.postScores[i].push(...s); });
        stats._raw.satScores.forEach((s: any, i: any) => { if(!overallCombined.satScores[i]) overallCombined.satScores[i]=[]; overallCombined.satScores[i].push(...s); });
        overallCombined.count += stats.count;
      });

      if (overallCombined.count > 0) {
        const allPre = overallCombined.preScores.flat();
        const allPost = overallCombined.postScores.flat();
        const pre = allPre.length > 0 ? allPre.reduce((a,b)=>a+b,0)/allPre.length : 0;
        const post = allPost.length > 0 ? allPost.reduce((a,b)=>a+b,0)/allPost.length : 0;
        aggregated['_overall'] = {
          preAvg: pre, 
          postAvg: post,
          satAvg: overallCombined.satScores.flat().length > 0 ? overallCombined.satScores.flat().reduce((a,b)=>a+b,0)/overallCombined.satScores.flat().length : 0,
          hakeGain: calculateHakeGain(pre, post),
          cohensD: calculateCohensD(allPre, allPost),
          pValue: getPValueFromT(calculatePairedTTest(allPre, allPost), Math.max(1, allPost.length - 1)),
          count: overallCombined.count
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
