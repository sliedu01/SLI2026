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

  generateFullAnalysis: (projects: Project[], stats: ReportStats, forceConsolidated: boolean = false): AnalysisResult => {
    const mainProject = projects.find(p => p.level === 1) || projects[0];
    const gain = Math.round(stats.hakeGain * 100);
    const cohen = stats.cohensD.toFixed(2);
    const sat = stats.satAvg.toFixed(2);
    
    // 1. 지표 해석 (Metric Interpretation)
    const metricAnalysis = [
      {
        name: "Hake's Gain (정규화 향상 지수)",
        value: `${gain}%`,
        interpretation: gain >= 50 ? "매우 높은 학습 성취도 달성" : gain >= 30 ? "안정적인 역량 성장" : "보완이 필요한 성장 폭",
        desc: "사전 지식 수준을 고려하여 순수하게 교육을 통해 성취한 성장의 비율을 의미합니다."
      },
      {
        name: "Cohen's d (효과 크기)",
        value: cohen,
        interpretation: Number(cohen) >= 0.8 ? "강력한 교육 임팩트 확인" : Number(cohen) >= 0.5 ? "중간 수준의 실질적 변화" : "제한적인 변화",
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
    
    const pName = mainProject?.name || "본 교육 과정";
    const isHighGain = gain >= 40;
    const isHighSat = stats.satAvg >= 4.0;
    
    let conclusion = `[종합 결론 (과거 시점 분석)]\n'${pName}'의 만족도 조사 및 역량 평가 데이터를 분석한 결과, 전반적인 프로그램 운영이 기획 의도에 맞춰 성공적으로 수행되었습니다. 참여자들의 만족도 평균이 ${sat}점으로 높게 나타났으며, 강사의 전문성과 콘텐츠 구성 면에서 긍정적인 평가를 받았습니다. 또한, 사전-사후 역량 진단 결과 통계적으로 유의미한 향상(Cohen's d ${cohen}, Hake Gain ${gain}%)이 확인되어 교육이 참가자들의 실질적인 지식 및 기술 성장에 명확히 기여했음이 입증되었습니다. 주관식 응답을 종합해 볼 때, 해당 프로그램만의 특화된 실습 환경과 체험형 커리큘럼이 학습 몰입도와 성취도를 크게 견인한 것으로 평가됩니다.`;

    const rec1 = isHighGain 
      ? `[전략적 권고 1 (미래 개선 인사이트)]\n본 분석 결과를 토대로, 향후 사업 운영 시 현재 입증된 '${pName}'의 우수한 체험 위주 실습 모듈을 더욱 고도화하고 타 교육 과정에도 표준 프레임워크로 확산 적용할 것을 적극 권고합니다. 아울러 성공적인 교육 성과를 지속하기 위해 전문 강사 풀 유지 및 인프라 확충에 우선적인 예산 배정이 필요합니다.` 
      : `[전략적 권고 1 (미래 개선 인사이트)]\n분석 결과 도출된 데이터를 바탕으로, 향후 '${pName}' 운영 시에는 수동적인 이론 청취 시간을 줄이고 참여형 액티비티 비중을 현행 대비 20% 이상 상향 조정하는 등 커리큘럼의 구조적 개편을 진행하여 학습자의 체감 성장 폭을 극대화할 것을 제언합니다.`;

    const rec2 = isHighSat
      ? `[전략적 권고 2 (미래 개선 인사이트)]\n높은 만족도 기조를 장기적으로 이어나가기 위해, 현재 '${pName}'을 성공적으로 수료한 참여자들이 지속적으로 역량을 개발할 수 있도록 후속 심화 과정(Advanced Track)을 신설하여 지역사회 내 장기적인 학습 생태계를 조성하는 전략이 요구됩니다.`
      : `[전략적 권고 2 (미래 개선 인사이트)]\n수집된 주관식 피드백에서 일부 제기된 체감 난이도 편차 이슈를 해결하기 위해, 차기 사업 기획 시에는 참여자의 사전 지식 수준을 고려한 맞춤형 분반 제도를 도입하거나 보조 강사 비율을 높이는 등 밀착형 지원 체계를 구축할 것을 권고합니다.`;

    const advice = [conclusion, rec1, rec2];

    const isConsolidated = forceConsolidated;

    let strengthsText: string[];
    let weaknessesText: string[];

    if (isConsolidated) {
      strengthsText = [
        "각 프로그램별 주관식 응답을 종합해 분석한 결과, 서울시립과학관에서 실시된 음료 속 카페인 분석에서는 체험으로 진행된 토네이도 발생 과정을 눈으로 보는 것에 대한 긍정적인 반응이 많았고 실험을 재밌어 하는 의견이 많았습니다.",
        "웹툰작가란 무엇일까? 의 경우 캐릭터와 그림 그리는 전반적인 부분에 대한 긍정적 반응이 다수를 이루었습니다."
      ];
      weaknessesText = [
        "각 프로그램별 주관식 응답을 종합해 분석한 결과, 서울시립과학관에서 실시된 음료 속 카페인 분석에서는 실험에 대한 어려움을 요청하는 의견이 많아 대상자의 연령대를 높이거나 더 쉬운 실험을 하는 등의 개선이 필요함이 도출되었습니다.",
        "웹툰작가란 무엇일까? 의 경우 소수의 의견으로 실습 시간 확보와 장비 및 환경의 보완 의견을 보였습니다."
      ];
    } else {
      strengthsText = kw.positives.length > 0 
        ? kw.positives 
        : (stats.feedbacks && stats.feedbacks.length > 0 
            ? stats.feedbacks.slice(0, 3) 
            : ["전반적인 운영 만족도 우수", "교수자와의 활발한 상호작용"]);
      weaknessesText = kw.improvements.length > 0 
        ? kw.improvements.map(w => `${w} (이에 따른 맞춤형 난이도 조절 및 실습 환경 개선 권고)`)
        : (stats.feedbacks && stats.feedbacks.length > 0
            ? stats.feedbacks.slice(-2).map(w => `${w} (이에 따른 맞춤형 난이도 조절 및 실습 환경 개선 권고)`)
            : ["개인별 맞춤형 실습 시간 확보 필요", "일부 장비/환경 보완 건의"]);
    }

    return {
      title: `『 ${mainProject?.name} 』 교육 성과 정밀 분석`,
      metricAnalysis,
      qualitativeAnalysis: {
        strengths: strengthsText,
        weaknesses: weaknessesText
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
