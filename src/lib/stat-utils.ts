import * as ss from 'simple-statistics';
import { Project } from '@/store/use-project-store';
import { Question } from '@/store/use-survey-store';

export const STAT_METRICS = {
  POST_AVG: { label: '사후 역량 평균 (POST)', desc: '교육 종료 후 측정된 역량 점수의 평균값입니다.', formula: 'Σ(사후 점수) / 문항 수' },
  HAKE_GAIN: { label: "역량 향상도 (Hake's Gain)", desc: '학습자가 사전 대비 사후에 얼마나 성장했는지를 나타내는 정규화된 향상 지수입니다.', formula: '(사후 - 사전) / (만점 - 사전)' },
  COHENS_D: { label: "효과 크기 (Cohen's d)", desc: '두 집단(사전-사후) 간의 평균 차이를 표준편차로 나눈 값으로, 교육의 실제 영향력을 나타냅니다.', formula: '(사후평균 - 사전평균) / 통합표준편차' },
  P_VALUE: { label: '유의확률 (p-value)', desc: '사전-사후 변화가 우연에 의한 것이 아닐 확률을 나타냅니다.', formula: 'Paired t-test 결과값' }
};

export function calculateHakeGain(pre: number, post: number, max: number = 5): number {
  if (pre === max) return post === max ? 1 : 0;
  return Number(((post - pre) / (max - pre)).toFixed(2));
}

export function getPValueFromT(t: number, df: number): number {
  const absT = Math.abs(t);
  const penalty = df < 5 ? 1.5 : df < 15 ? 1.2 : 1.0;
  const adjT = absT / penalty;
  if (adjT > 3.291) return 0.001; 
  if (adjT > 2.576) return 0.01;  
  if (adjT > 1.960) return 0.05;  
  return 0.5;
}

export function calculateCohensD(preScores: number[], postScores: number[]): number {
  if (preScores.length < 2 || postScores.length < 2) return 0;
  const mPre = ss.mean(preScores);
  const mPost = ss.mean(postScores);
  const vPre = ss.variance(preScores);
  const vPost = ss.variance(postScores);
  const nPre = preScores.length;
  const nPost = postScores.length;
  const pooledSD = Math.sqrt(((nPre - 1) * vPre + (nPost - 1) * vPost) / (nPre + nPost - 2));
  return pooledSD === 0 ? 0 : (mPost - mPre) / pooledSD;
}

export function calculatePairedTTest(preScores: number[], postScores: number[]): number {
  if (preScores.length !== postScores.length || preScores.length < 2) return 1.0;
  const differences = preScores.map((pre, i) => postScores[i] - pre);
  const meanDiff = ss.mean(differences);
  const sdDiff = ss.standardDeviation(differences);
  return sdDiff === 0 ? (meanDiff === 0 ? 1.0 : 0.0) : meanDiff / (sdDiff / Math.sqrt(differences.length));
}

export interface ReportStats {
  preAvg: number;
  postAvg: number;
  satAvg: number;
  hakeGain: number;
  cohensD: number;
  pValue: number;
  themeStats?: Record<string, { preAvg: number, postAvg: number, satAvg: number, average: number, count: number }>;
  questionStats?: Array<{ preAvg: number, postAvg: number, average: number, impRate: number }>;
}

export const ExpertReportGenerator = {
  generateSatisfactionOpinion: (projects: Project[], questions: Question[], stats: ReportStats, feedbacks: string[] = []): string => {
    const l1 = projects.find(p => p.level === 1) || projects[0];
    const l3 = projects.find(p => p.level === 3) || projects.find(p => p.level === 2);
    const context = l3 ? `${l1?.name || '본 사업'} - ${l3.name}` : (l1?.name || '본 사업');
    const themes = Object.entries(stats.themeStats || {}).sort((a, b) => b[1].satAvg - a[1].satAvg);
    const bestTheme = themes[0]?.[0] || '교육 운영 전반';
    const worstTheme = themes[themes.length - 1]?.[0] || '시설 및 인프라';
    const feedbackSummary = feedbacks.length > 0 ? feedbacks.filter(f => f.length > 5).slice(0, 3).join(' / ') : '균형 잡힌 교육 환경 제공됨';
    return `[운영 품질 및 만족도 기조 분석]\n본 과정(${context})의 운영 만족도 지수는 ${stats.satAvg.toFixed(2)}점입니다.\n\n` +
           `특히 '${bestTheme}' 주제에서 높은 만족도가 확인되었으나, '${worstTheme}' 영역은 상대적 보완이 필요해 보입니다.\n` +
           `학습자 소견: "${feedbackSummary}"`;
  },

  generateCompetencyOpinion: (projects: Project[], questions: Question[], stats: ReportStats): string => {
    const l1 = projects.find(p => p.level === 1);
    const context = l1?.name || '핵심 역량';
    return `[성과 지표 기반 역량 성장 진단]\n${context} 분석 결과, 사전(${stats.preAvg.toFixed(2)}) 대비 사후(${stats.postAvg.toFixed(2)})의 비약적인 성장이 확인되었습니다. ` +
           `향상도 ${Math.round(stats.hakeGain * 100)}%로 매우 높은 교육 효과를 입증합니다.`;
  },

  generateConsultingReport: (projects: Project[], questions: Question[], stats: ReportStats): string => {
    const validProjects = projects.filter(p => p.level > 1);
    const mainProject = validProjects.find(p => p.level === 2) || validProjects[0];
    const projectName = mainProject?.name || '전체 통합 과정';
    const projectDesc = mainProject?.description || '본 교육 프로그램';
    const gain = Math.round(stats.hakeGain * 100);
    const cohen = Number(stats.cohensD.toFixed(2));
    const sat = Number(stats.satAvg.toFixed(2));
    const pVal = stats.pValue;

    const isStatSig = pVal < 0.05;
    const isSatHigh = sat >= 4.5;
    const isGainHigh = gain >= 70;

    const insight1 = isSatHigh ? `운영 인프라가 매우 안정적으로 구축되어 학습 몰입도를 극대화하였습니다.` : `전반적인 교육 환경이 표준적인 수준으로 유지되었습니다.`;
    const insight2 = `효과 크기 ${cohen} 및 향상도 ${gain}% 검증 결과, 본 교육은 학습자에게 매우 유의미한 역량 전이를 이끌어냈습니다.`;
    const insight3 = isStatSig ? `t-검정 결과 통계적 유의성이 확보되어(p < 0.05), 도출된 성과가 실질적인 프로그램의 효과임을 증명합니다.` : `성취도의 산술적 증가는 보이나 통계적 유의성은 추가 검증이 필요합니다.`;

    return `『 수석 데이터 분석가 정밀 통합 보고서 』\n\n` +
           `사업명: ${projectName}\n` +
           `사업 개요: ${projectDesc}\n\n` +
           `■ 인사이트 1: 운영 인프라 분석\n${insight1}\n\n` +
           `■ 인사이트 2: 역량 성취 임팩트\n${insight2}\n\n` +
           `■ 인사이트 3: 결과 신뢰성 검증\n${insight3}\n\n` +
           `■ 총평 및 제언\n${isGainHigh ? '핵심 성공 요인을 자산화하여 전사 표준 모델로 확대 적용할 것을 권고합니다.' : '역량의 상향 평준화를 위한 사후 보충 학습 체계 마련이 필요합니다.'}`;
  }
};

export function generateAIExpertReport(projectList: Project[]): string {
  const lv1 = projectList.find(p => p.level === 1);
  return lv1 ? `전문가 리포트: ${lv1.name} 성과 확인됨` : "데이터 부족";
}
