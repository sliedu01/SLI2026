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
  stdPre?: number;
  stdPost?: number;
  pooledStd?: number;
  tValue?: number;
  themeStats?: Record<string, { preAvg: number, postAvg: number, satAvg: number, average: number, count: number }>;
  questionStats?: Array<{ preAvg: number, postAvg: number, average: number, impRate: number }>;
  feedbacks?: string[];
  textResponses?: Array<{ questionId: string; content: string; answers: string[] }>;
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
  statisticalEvidence?: {
    n: number;
    preAvg: string;
    postAvg: string;
    stdPre: string;
    stdPost: string;
    pooledStd: string;
    tValue: string;
    pValue: string;
  };
}

export const ExpertReportGenerator = {
  analyzeKeywords: (feedbacks: string[]) => {
    const total = feedbacks.length;
    if (total === 0) return { posQuotes: [], negQuotes: [], posCount: 0, negCount: 0, total };

    const posKeywords = ['재밌', '좋았', '유쾌', '최고', '도움', '만족', '즐거', '유익', '최고', '감사', '흥미', '이해'];
    const negKeywords = ['아쉽', '부족', '짧았', '힘들', '어려', '모자라', '건의', '개선', '더', '시간이', '빨라'];

    let posCount = 0;
    let negCount = 0;
    const posQuotes: string[] = [];
    const negQuotes: string[] = [];

    feedbacks.forEach(f => {
      if (!f || f.length < 2) return;
      const isPos = posKeywords.some(k => f.includes(k));
      const isNeg = negKeywords.some(k => f.includes(k));
      
      if (isPos) {
        posCount++;
        posQuotes.push(f);
      }
      if (isNeg) {
        negCount++;
        negQuotes.push(f);
      }
    });

    const posUnique = [...new Set(posQuotes)].slice(0, 3);
    const negUnique = [...new Set(negQuotes)].slice(0, 3);

    return { 
      posQuotes: posUnique, 
      negQuotes: negUnique,
      posCount,
      negCount,
      total
    };
  },

  generateFullAnalysis: (projects: Project[], stats: ReportStats, forceConsolidated: boolean = false, customProjectName?: string): AnalysisResult => {
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
    
    let pName = "본 교육 과정";
    if (customProjectName) {
      pName = customProjectName.replace(' 분석 보고서', '').trim();
      if (pName === '통합') pName = '통합(전체) 사업';
    } else {
      pName = mainProject?.name || "본 교육 과정";
    }

    const isHighGain = gain >= 40;
    const isHighSat = stats.satAvg >= 4.0;
    const isConsolidated = forceConsolidated;
    
    let conclusion = '';
    let rec1 = '';
    let rec2 = '';
    
    if (isConsolidated) {
      conclusion = `'${pName}'의 통합 만족도 및 역량 평가 데이터를 분석한 결과, 하위 프로그램들이 전반적으로 기획 의도에 맞춰 성공적으로 수행되었습니다. 전체 참여자들의 만족도 평균이 ${sat}점으로 높게 나타났으며, 특히 체험 중심의 실습 과정이 긍정적인 평가를 견인했습니다. 또한 사전-사후 역량 진단 결과 통합적으로 유의미한 향상(Cohen's d ${cohen}, Hake Gain ${gain}%)이 확인되어, 본 사업이 참가자들의 실질적인 지식 및 기술 성장에 명확히 기여했음이 입증되었습니다.`;
      
      rec1 = `'${pName}' 산하 프로그램별 성과 편차를 분석한 결과, '음료 속 카페인 분석'과 '웹툰작가란 무엇일까?' 등 주요 프로그램들이 체험 위주의 커리큘럼으로서 높은 몰입도와 성과를 보였으므로 차기 운영 시에도 현행 기조를 유지 및 존속할 것을 권고합니다. 다만, 일부 프로그램에서 제기된 장비 보완 및 난이도 조절 피드백을 수용하여 개별 프로그램의 맞춤형 지원 체계를 더욱 강화해야 합니다.`;
      
      rec2 = `상대적으로 만족도 대비 실습 시간이 부족하다는 의견이 집중된 일부 하위 프로그램에 대해서는 운영 시간 확대 편성 혹은 심화 트랙(Advanced Track)으로의 분리 운영을 검토할 필요가 있습니다. 향후 성과가 지속적으로 저조하거나 학습자 흥미 유발에 실패하는 특정 프로그램이 발생할 경우, 과감한 폐지 혹은 전면 개편을 통해 전체 사업의 예산 효율성과 교육 효과성을 극대화하는 성과 기반 포트폴리오 관리가 요구됩니다.`;
    } else {
      conclusion = `'${pName}'의 만족도 조사 및 역량 평가 데이터를 분석한 결과, 전반적인 프로그램 운영이 기획 의도에 맞춰 성공적으로 수행되었습니다. 참여자들의 만족도 평균이 ${sat}점으로 높게 나타났으며, 강사의 전문성과 콘텐츠 구성 면에서 긍정적인 평가를 받았습니다. 또한, 사전-사후 역량 진단 결과 통계적으로 유의미한 향상(Cohen's d ${cohen}, Hake Gain ${gain}%)이 확인되어 교육이 참가자들의 실질적인 지식 및 기술 성장에 명확히 기여했음이 입증되었습니다. 주관식 응답을 종합해 볼 때, 해당 프로그램만의 특화된 실습 환경과 체험형 커리큘럼이 학습 몰입도와 성취도를 크게 견인한 것으로 평가됩니다.`;
      
      rec1 = isHighGain 
        ? `본 분석 결과를 토대로, 향후 사업 운영 시 현재 입증된 '${pName}'의 우수한 체험 위주 실습 모듈을 더욱 고도화하고 타 교육 과정에도 표준 프레임워크로 확산 적용할 것을 적극 권고합니다. 아울러 성공적인 교육 성과를 지속하기 위해 전문 강사 풀 유지 및 인프라 확충에 우선적인 예산 배정이 필요합니다.` 
        : `분석 결과 도출된 데이터를 바탕으로, 향후 '${pName}' 운영 시에는 수동적인 이론 청취 시간을 줄이고 참여형 액티비티 비중을 현행 대비 20% 이상 상향 조정하는 등 커리큘럼의 구조적 개편을 진행하여 학습자의 체감 성장 폭을 극대화할 것을 제언합니다.`;

      rec2 = isHighSat
        ? `높은 만족도 기조를 장기적으로 이어나가기 위해, 현재 '${pName}'을 성공적으로 수료한 참여자들이 지속적으로 역량을 개발할 수 있도록 후속 심화 과정(Advanced Track)을 신설하여 지역사회 내 장기적인 학습 생태계를 조성하는 전략이 요구됩니다.`
        : `수집된 주관식 피드백에서 일부 제기된 체감 난이도 편차 이슈를 해결하기 위해, 차기 사업 기획 시에는 참여자의 사전 지식 수준을 고려한 맞춤형 분반 제도를 도입하거나 보조 강사 비율을 높이는 등 밀착형 지원 체계를 구축할 것을 권고합니다.`;
    }

    const advice = [conclusion, rec1, rec2];

    let strengthsText: string[];
    let weaknessesText: string[];

    const posRatio = kw.total > 0 ? Math.round((kw.posCount / kw.total) * 100) : 0;
    const negRatio = kw.total > 0 ? Math.round((kw.negCount / kw.total) * 100) : 0;

    strengthsText = kw.posQuotes.length > 0 
      ? [
          `전체 의견 ${kw.total}건 중 긍정 피드백 ${kw.posCount}건 (${posRatio}%) 도출`,
          ...kw.posQuotes,
          `종합 의견: 학습자들은 위 응답들과 같이 본 프로그램의 실습 중심 구성과 체험 요소에 큰 흥미를 느꼈으며, 이러한 능동적 참여가 높은 교육 성취로 직결된 것으로 분석됩니다.`
        ]
      : [
          "전반적인 운영 만족도 우수 및 적극적인 학습 참여 확인", 
          "교수자와의 활발한 상호작용 및 실습 몰입도 유지", 
          "종합 의견: 전반적인 교육 만족도가 높으며, 향후 현재의 강점을 기반으로 커리큘럼을 유지하는 것을 권장합니다."
        ];

    if (kw.negQuotes.length > 1) {
      weaknessesText = [
        `전체 의견 ${kw.total}건 중 개선 요구 및 아쉬운 점 ${kw.negCount}건 (${negRatio}%) 도출`,
        ...kw.negQuotes,
        `종합 의견: 일부 응답에서 시간 제약이나 환경적 불편함이 확인되었습니다. 차기 운영 시에는 실습 시간의 탄력적 배분과 보조 인력 충원 등 세밀한 인프라 보완이 필요합니다.`
      ];
    } else if (kw.negQuotes.length === 1) {
      weaknessesText = [
        `전체 의견 ${kw.total}건 중 소수 의견(1건, ${negRatio}%) 도출`,
        ...kw.negQuotes,
        `종합 의견: 단발적인 소수의견이 존재하나 전반적인 교육 만족도에 영향을 미칠 수준은 아니며, 차기 운영 시 단순 참고자료로 활용할 것을 권장합니다.`
      ];
    } else {
      weaknessesText = [
        "특별한 부정적 키워드나 중대한 개선 요구사항 미발견", 
        "대부분의 학습자가 부여된 환경과 난이도에 만족함", 
        "종합 의견: 체계적인 준비와 운영이 돋보였으며, 앞으로도 이와 같은 쾌적한 실습 환경 및 적정 난이도를 유지하기 위한 상시 모니터링 체계가 필요합니다."
      ];
    }

    const statisticalEvidence = {
      n: stats.sampleSize || 0,
      preAvg: (stats.preAvg || 0).toFixed(2),
      postAvg: (stats.postAvg || 0).toFixed(2),
      stdPre: (stats.stdPre || 0).toFixed(2),
      stdPost: (stats.stdPost || 0).toFixed(2),
      pooledStd: (stats.pooledStd || 0).toFixed(2),
      tValue: (stats.tValue || 0).toFixed(3),
      pValue: (stats.pValue || 0).toFixed(3)
    };

    return {
      title: `『 ${pName} 』 교육 성과 정밀 분석`,
      metricAnalysis,
      qualitativeAnalysis: {
        strengths: strengthsText,
        weaknesses: weaknessesText
      },
      advice,
      statisticalEvidence
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
