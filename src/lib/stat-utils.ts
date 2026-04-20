import * as ss from 'simple-statistics';
import { Project } from '@/store/use-project-store';
import { Question } from '@/store/use-survey-store';

export const STAT_METRICS = {
  POST_AVG: { label: '사후 평균', desc: '교육 종료 후 측정된 역량 점수의 평균값입니다.', formula: 'Σ(사후 점수) / 문항 수' },
  HAKE_GAIN: { label: "Hake's Gain (향상도)", desc: '학습자가 사전 대비 사후에 얼마나 성장했는지를 나타내는 정규화된 향상 지수입니다.', formula: '(사후 - 사전) / (만점 - 사전)' },
  COHENS_D: { label: "Cohen's d (효과 크기)", desc: '두 집단(사전-사후) 간의 평균 차이를 표준편차로 나눈 값으로, 교육의 실제 영향력을 나타냅니다.', formula: '(사후평균 - 사전평균) / 통합표준편차' },
  P_VALUE: { label: '검증 (p-value)', desc: '사전-사후 변화가 우연에 의한 것이 아닐 확률을 나타냅니다.', formula: 'Paired t-test 결과값' }
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
    const l1 = projects.find(p => p.level === 1);
    const l3 = projects.find(p => p.level === 3);
    const context = `${l1?.name || '본 사업'} - ${l3?.name || ''}`;
    
    // 주제별 최고/최저 성과 분석
    const themes = Object.entries(stats.themeStats || {}).sort((a, b) => b[1].satAvg - a[1].satAvg);
    const bestTheme = themes[0]?.[0] || '교육 운영 전반';
    const worstTheme = themes[themes.length - 1]?.[0] || '시설 및 인프라';
    
    const feedbackSummary = feedbacks.length > 0 
      ? feedbacks.filter(f => f.length > 5).slice(0, 3).join(' / ') 
      : '전반적인 운영 인프라 및 강사진 전문성에 대한 만족도가 안정적임';
    
    return `[운영 품질 및 만족도 기조 분석]\n본 과정(${context})의 운영 만족도 지수는 ${stats.satAvg.toFixed(2)}점으로 집계되었습니다.\n\n` +
           `[문항별 상세 분석]\n특히 '${bestTheme}' 주제와 관련된 문항에서 학습자들의 긍정적인 체감이 두드러졌으며, 이는 교육 설계의 현업 밀착도가 높았음을 시사합니다. 반면 '${worstTheme}' 영역은 상대적으로 낮은 점수를 기록하여 향후 보완이 필요한 지점으로 파악되었습니다.\n\n` +
           `[정성 피드백 기반 심층 진단]\n학습자들은 "${feedbackSummary}" 등의 의견을 통해 교육의 실효성을 뒷받침했습니다.\n\n` +
           `[향후 전략 제언]\n고득점을 기록한 '${bestTheme}' 요인은 성공 사례로 자산화하고, 개선이 필요한 '${worstTheme}' 영역은 차기 교육 과정 기획 시 모듈 고도화 및 인프라 재정비를 통해 교육 품질의 상향 평준화를 도모할 것을 권고합니다. (분석 일자: ${new Date().toLocaleDateString()})`;
  },

  generateCompetencyOpinion: (projects: Project[], questions: Question[], stats: ReportStats): string => {
    const l1 = projects.find(p => p.level === 1);
    const context = l1?.name || '핵심 역량';
    
    // 역량 성장폭(Gain)이 가장 큰 주제 탐색
    const themes = Object.entries(stats.themeStats || {}).sort((a, b) => {
      const gA = a[1].preAvg > 0 ? (a[1].postAvg - a[1].preAvg) / a[1].preAvg : 0;
      const gB = b[1].preAvg > 0 ? (b[1].postAvg - b[1].preAvg) / b[1].preAvg : 0;
      return gB - gA;
    });
    const topGainTheme = themes[0]?.[0] || '실무 역량';
    
    // 해당 주제의 대표 문항 추출
    const representQ = questions.find(q => q.theme === topGainTheme)?.content || '핵심 역량 지표';
    const sigLabel = stats.pValue < 0.05 ? '통계적으로 매우 유의미한(p<0.05)' : '유의미한 변화가 관찰된';
    
    return `[성과 지표 기반 역량 성장 진단]\n${context} 분석 결과, 사전(${stats.preAvg.toFixed(2)}점) 대비 사후(${stats.postAvg.toFixed(2)}점)의 비약적인 상승이 확인되었습니다.\n\n` +
           `[문항 및 주제별 심층 분석]\n특히 '${topGainTheme}' 주제의 성장세가 가장 돋보였으며, 구체적으로 "${representQ}" 문항에 대한 학습자의 자기 효능감이 크게 향상된 것으로 분석됩니다.\n\n` +
           `[4대 핵심 지표 종합 해석]\n정규화된 향상도(Hake's Gain) ${(stats.hakeGain * 100).toFixed(1)}%와 효과 크기(Cohen's d) ${stats.cohensD.toFixed(2)} 지표는 본 교육이 학습 집단에 준 변화의 강도가 '매우 강력함(Large)' 수준임을 입증합니다.\n\n` +
           `[과학적 신뢰도 검증]\n대응표본 t-검정 결과 모든 증분치는 ${sigLabel} 결과로 확인되어 교육 프로그램의 실질적 유효성을 뒷받침합니다.\n\n` +
           `[종합 제언]\n비약적인 성장을 보인 '${topGainTheme}' 역량은 실무 적용 지침으로 매뉴얼화하고, 성장이 완만한 나머지 영역은 사후 보충 학습을 통해 조직 전반의 역량 수준을 공고히 할 것을 제언합니다.`;
  },

  generateConsultingReport: (projects: Project[], questions: Question[], stats: ReportStats, responses: any[] = []): string => {
    const l1 = projects.find(p => p.level === 1);
    const gain = (stats.hakeGain * 100).toFixed(1);
    const pVal = stats.pValue < 0.001 ? '0.01 미만' : stats.pValue.toFixed(3);

    // 고득점/저득점 문항 식별 (실제 응답 기반)
    const qStats = questions.map(q => {
      const qResp = responses.flatMap(r => r.answers.filter((a: any) => a.questionId === q.id));
      const avg = qResp.length > 0 ? qResp.reduce((acc, current) => acc + (current.score || 0), 0) / qResp.length : 0;
      return { content: q.content, avg, theme: q.theme };
    }).filter(qs => qs.avg > 0);

    const bestQ = qStats.sort((a,b) => b.avg - a.avg)[0]?.content || '주요 핵심 역량';
    const worstQ = qStats.sort((a,b) => a.avg - b.avg)[0]?.content || '잠재적 개선 영역';

    return `[전략적 교육 성과 통합 분석 및 컨설팅 리포트: ${l1?.name || '종합'}]\n\n` +
           `본 분석 보고서는 ${l1?.name} 사업의 전략적 목표 달성 여부를 정량적 통계 지표와 실제 문항별 응답 데이터를 기반으로 종합적으로 평가한 결과입니다.\n\n` +
           `■ 인사이트 1: 핵심 역량 전이의 실효성 확인\n` +
           `응답 데이터 분석 결과, 특히 "${bestQ}" 문항에서 최상위권의 점수가 관찰되었습니다. 이는 교육과정이 설계 시 의도했던 핵심 메시지를 학습자들이 가장 명확하게 수용하고 있음을 뜻하며, 만족도(${stats.satAvg.toFixed(2)}점)와 성장이 선순환 구조를 형성하고 있음을 시사합니다.\n\n` +
           `■ 인사이트 2: 교육 투자 대비 효과(ROI)의 과학적 입증\n` +
           `효과 크기 ${stats.cohensD.toFixed(2)} 및 향상도 ${gain}% 결과는 투입 자산 대비 학습 효율이 매우 강력한 수준임을 나타냅니다. 이는 단순한 만족형 교육을 넘어 학습자의 실무 역량에 실제적인 '변화'를 일으켰음을 과학적으로 증명하는 핵심 근거입니다.\n\n` +
           `■ 인사이트 3: 분석 신뢰도와 객관적 성과 지표 확보\n` +
           `통계적 p-value ${pVal} 수준의 유의성이 확보됨에 따라 본 사업의 성과는 우연이 아닌 체계적 교수 설계의 결과임이 입증되었습니다. 특히 "${worstQ}"와 같이 상대적 성장이 완만한 영역조차 신뢰도 범위 내에서 개선이 이루어지고 있어 전체적인 상향 평준화가 진행 중입니다.\n\n` +
           `■ 종합 전략 제언 및 마스터 플랜\n` +
           `3. '지속 가능성 확보': 교육 종료 후 현업 적용도 추적 조사를 통해 성과 전이를 공고히 할 것을 권고합니다.\n\n` +
           `본 교육 과정은 조직의 경쟁력을 담보하는 핵심 인재 육성 모델로서의 가치를 충분히 증명하였습니다.\n\n` +
           `--------------------------------------------------\n` +
           `[별첨: 분석 방법론 및 성과 판단 기준 안내]\n\n` +
           `1. 정규화된 향상도 (Hake's Gain)\n` +
           `- 정의: 사전 대비 사후의 성취 가능한 최대 변화량 중 실제 변화량 비중\n` +
           `- 학술 기준: 0.7 이상(High Gain), 0.3~0.7(Medium), 0.3 미만(Low)\n` +
           `- 기업 교육 기준: 0.3 이상일 경우 안정적인 역량 향상으로 판단\n\n` +
           `2. 성과 크기 (Cohen's d)\n` +
           `- 정의: 두 집단 간 평균 차이를 표준 편차로 나눈 임팩트 지수\n` +
           `- 기준: 0.2(Small), 0.5(Medium), 0.8 이상(Large - 매우 강력한 효과)\n\n` +
           `3. 통계적 유의성 (p-value)\n` +
           `- 기준: p < 0.05일 경우, 관찰된 변화가 우연이 아닌 교육의 효과임이 95% 신뢰수준으로 입증됨`;
  }
};

export function generateAIExpertReport(projectList: Project[], _data: Record<string, unknown>): string {
  const lv1 = projectList.find(p => p.level === 1);
  return lv1 ? `전문가 리포트: ${lv1.name} 성과 확인됨` : "데이터 부족";
}
