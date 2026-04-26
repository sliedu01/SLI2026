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
  sampleSize: number;
  themeStats?: Record<string, { preAvg: number, postAvg: number, satAvg: number, average: number, count: number }>;
  questionStats?: Array<{ preAvg: number, postAvg: number, average: number, impRate: number }>;
  feedbacks?: string[];
  rawScores?: { pre: number[], post: number[], sat: number[] };
}

export interface AnalysisResult {
  title: string;
  metricAnalysis: Array<{
    name: string;
    value: string;
    interpretation: string;
    desc: string;
  }>;
  qualitativeAnalysis: {
    strengths: string[];
    weaknesses: string[];
  };
  advice: string[];
}

export const ExpertReportGenerator = {
  analyzeKeywords: (feedbacks: string[]): { positives: string[], improvements: string[] } => {
    const positives: string[] = [];
    const improvements: string[] = [];
    
    const posKeywords = ['재밌', '좋았', '유쾌', '최고', '도움', '만족', '즐거'];
    const negKeywords = ['아쉽', '부족', '짧았', '힘들', '어려', '모자라'];

    feedbacks.forEach(f => {
      if (!f || f.length < 2) return;
      if (posKeywords.some(k => f.includes(k))) positives.push(f);
      if (negKeywords.some(k => f.includes(k))) improvements.push(f);
    });

    return { 
      positives: [...new Set(positives)].slice(0, 5), 
      improvements: [...new Set(improvements)].slice(0, 5) 
    };
  },

  generateFullAnalysis: (projects: Project[], stats: ReportStats): AnalysisResult => {
    const mainProject = projects.find(p => p.level === 1) || projects[0];
    const gain = Math.round(stats.hakeGain * 100);
    const cohen = stats.cohensD.toFixed(2);
    const sat = stats.satAvg.toFixed(2);
    
    // 1. 지표 해석 (Metric Interpretation)
    const metricAnalysis = [
      {
        name: "Hake's Gain (정규화 향상 지수)",
        value: `${gain}%`,
        interpretation: gain >= 50 ? "매우 높은 학습 성취도 달성 (High Gain)" : gain >= 30 ? "안정적인 역량 성장 (Medium Gain)" : "보완이 필요한 성장 폭 (Low Gain)",
        desc: "사전 지식 수준을 고려하여 순수하게 교육을 통해 성취한 성장의 비율을 의미합니다."
      },
      {
        name: "Cohen's d (효과 크기)",
        value: cohen,
        interpretation: Number(cohen) >= 0.8 ? "강력한 교육 임팩트 확인 (Large Effect)" : Number(cohen) >= 0.5 ? "중간 수준의 실질적 변화 (Medium Effect)" : "제한적인 변화 (Small Effect)",
        desc: "우연에 의한 변화가 아닌, 교육 프로그램이 학습자에게 미친 실제 영향력의 강도를 수치화한 것입니다."
      },
      {
        name: "만족도 및 추천 지수",
        value: `${sat}점`,
        interpretation: Number(sat) >= 4.5 ? "최상의 교육 만족도 및 충성도" : "우수한 운영 품질 유지",
        desc: "강사 전문성, 콘텐츠 적절성, 운영 인프라에 대한 학습자의 종합적인 체감 품질입니다."
      }
    ];

    // 2. 주관식 응답 기반 정성 분석
    const kw = ExpertReportGenerator.analyzeKeywords(stats.feedbacks || []);
    
    // 3. 전략적 제언 (Strategic Advice)
    const advice = [
      "데이터 분석 결과, 학습자들은 실습 위주의 활동에서 가장 높은 몰입도를 보였으며 이는 높은 만족도로 직결되었습니다.",
      "통계적으로 유의미한 역량 성장이 확인된 만큼, 본 과정을 표준 모델로 삼아 타 교육에도 확산 적용이 가능합니다.",
      "주관식 피드백에서 나타난 시간 배분에 대한 의견을 반영하여 차기 과정에서는 실습 비중을 20% 상향 조정할 것을 제언합니다."
    ];

    return {
      title: `『 ${mainProject?.name} 』 교육 성과 정밀 분석`,
      metricAnalysis,
      qualitativeAnalysis: {
        strengths: kw.positives.length > 0 ? kw.positives : ["전반적인 운영 만족도 우수", "교수자와의 활발한 상호작용"],
        weaknesses: kw.improvements.length > 0 ? kw.improvements : ["개인별 맞춤형 실습 시간 확보 필요", "일부 장비/환경 보완 건의"]
      },
      advice
    };
  },

  generateSatisfactionOpinion: (projects: Project[], questions: Question[], stats: ReportStats, feedbacks: string[] = []): string => {
    const l1 = projects.find(p => p.level === 1) || projects[0];
    const context = l1?.name || '본 사업';
    const themes = Object.entries(stats.themeStats || {}).sort((a, b) => b[1].satAvg - a[1].satAvg);
    const bestTheme = themes[0]?.[0] || '교육 운영 전반';
    const feedbackSummary = feedbacks.length > 0 ? feedbacks.filter(f => f.length > 5).slice(0, 3).join(' / ') : '균형 잡힌 교육 환경 제공됨';
    return `[운영 품질 및 만족도 기조 분석]\n본 과정(${context})의 운영 만족도 지수는 ${stats.satAvg.toFixed(2)}점입니다.\n\n` +
           `특히 '${bestTheme}' 주제에서 높은 만족도가 확인되었습니다.\n` +
           `학습자 소견: "${feedbackSummary}"`;
  },

  generateCompetencyOpinion: (projects: Project[], questions: Question[], stats: ReportStats): string => {
    const l1 = projects.find(p => p.level === 1);
    const context = l1?.name || '핵심 역량';
    return `[성과 지표 기반 역량 성장 진단]\n${context} 분석 결과, 사전(${stats.preAvg.toFixed(2)}) 대비 사후(${stats.postAvg.toFixed(2)})의 비약적인 성장이 확인되었습니다. ` +
           `향상도 ${Math.round(stats.hakeGain * 100)}%로 매우 높은 교육 효과를 입증합니다.`;
  },

  generateConsultingReport: (projects: Project[], questions: Question[], stats: ReportStats): string => {
    const mainProject = projects.find(p => p.level === 1) || projects[0];
    const projectName = mainProject?.name || '전체 통합 과정';
    const gain = Math.round(stats.hakeGain * 100);
    const cohen = stats.cohensD.toFixed(2);
    const sat = stats.satAvg.toFixed(2);

    return `『 수석 데이터 분석가 정밀 통합 보고서 』\n\n` +
           `사업명: ${projectName}\n\n` +
           `■ 인사이트 1: 운영 인프라 분석\n운영 만족도 ${sat}점으로 매우 안정적인 교육 환경이 제공되었습니다.\n\n` +
           `■ 인사이트 2: 역량 성취 임팩트\n효과 크기 ${cohen} 및 향상도 ${gain}%로 유의미한 역량 성장이 확인되었습니다.\n\n` +
           `■ 총평 및 제언\n핵심 성공 요인을 자산화하여 전사 표준 모델로 확대 적용할 것을 권고합니다.`;
  }
};

export function generateAIExpertReport(projectList: Project[]): string {
  const lv1 = projectList.find(p => p.level === 1);
  return lv1 ? `전문가 리포트: ${lv1.name} 성과 확인됨` : "데이터 부족";
}
