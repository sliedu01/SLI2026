import { Project } from '@/store/use-project-store';
import { SurveyTemplate, SurveyResponse } from '@/store/use-survey-store';

export const SAMPLE_PROJECTS: Omit<Project, 'id' | 'createdAt'>[] = [
  {
    name: '[핵심] 2026 AI DX 역량 강화 과정',
    startDate: '2026-03-01',
    endDate: '2026-06-30',
    startTime: '09:00',
    endTime: '18:00',
    quota: 100,
    participantCount: 85,
    description: '서울시 기업들의 디지털 전환을 위한 핵심 교육 사업',
    parentId: null,
    level: 1
  },
  {
     name: '생성형 AI 실무 활용 워크숍',
     startDate: '2026-04-10',
     endDate: '2026-05-20',
     startTime: '10:00',
     endTime: '17:00',
     quota: 30,
     participantCount: 28,
     description: 'LLM 및 이미지 생성 도구 실무 적용 교육',
     parentId: 'temp-id-1',
     level: 2
  },
  {
    name: '디지털 거버넌스 및 보안 전략',
    startDate: '2026-05-01',
    endDate: '2026-06-15',
    startTime: '14:00',
    endTime: '18:00',
    quota: 50,
    participantCount: 42,
    description: '기업 DX를 위한 법적/보안 가이드라인',
    parentId: null,
    level: 1
  }
];

export const INITIAL_TEMPLATE: Omit<SurveyTemplate, 'id' | 'createdAt'> = {
  name: '디지털 전환 성숙도 (Maturity)',
  type: 'COMPETENCY',
  questions: [
    { id: 'q1', division: '데이터 활용', theme: 'Tooling', content: '데이터 분석 툴 사용에 익숙하다.', type: 'SCALE', order: 1 },
    { id: 'q2', division: '데이터 활용', theme: 'Decision making', content: '데이터 기반 의사결정이 중요하다고 생각한다.', type: 'SCALE', order: 2 },
    { id: 'q3', division: '기술 이해', theme: 'Generative AI', content: '생성형 AI의 원리를 이해하고 활용할 수 있다.', type: 'SCALE', order: 3 },
    { id: 'q4', division: '기술 이해', theme: 'Cloud', content: '클라우드 컴퓨팅의 장점을 알고 있다.', type: 'SCALE', order: 4 },
    { id: 'q5', division: '협업 역량', theme: 'Remote Work', content: '협업 툴을 활용한 비대면 업무가 능숙하다.', type: 'SCALE', order: 5 },
  ]
};

export function generateSampleResponses(projectId: string, templateId: string): Omit<SurveyResponse, 'id' | 'createdAt'>[] {
  const respondents = ['김철수', '이영희', '박지민', '최수호', '정다은'];
  
  return respondents.map((name, idx) => ({
    projectId,
    templateId,
    respondentId: name,
    answers: [
      { questionId: 'q1', preScore: 2 + (idx % 2), score: 4 + (idx % 2) },
      { questionId: 'q2', preScore: 3, score: 5 },
      { questionId: 'q3', preScore: 1 + (idx % 3), score: 4 },
      { questionId: 'q4', preScore: 2, score: 3 + (idx % 2) },
      { questionId: 'q5', preScore: 3, score: 5 },
    ]
  }));
}
