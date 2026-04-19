import * as ss from 'simple-statistics';
import { Project } from '@/store/use-project-store';

/**
 * 통계 지표 설명 및 산식 (UI Tooltip용)
 */
export const STAT_METrics = {
  POST_AVG: {
    label: '사후 평균',
    desc: '교육 종료 후 측정된 역량 점수의 평균값입니다.',
    formula: 'Σ(사후 점수) / 문항 수'
  },
  HAKE_GAIN: {
    label: "Hake's Gain (향상도)",
    desc: '학습자가 사전 대비 사후에 얼마나 성장했는지를 나타내는 정규화된 향상 지수입니다.',
    formula: '(사후 - 사전) / (만점 - 사전)'
  },
  COHENS_D: {
    label: "Cohen's d (효과 크기)",
    desc: '두 집단(사전-사후) 간의 평균 차이를 표준편차로 나눈 값으로, 교육의 실제 영향력을 나타냅니다. (0.2: 작음, 0.5: 보통, 0.8: 큼)',
    formula: '(사후평균 - 사전평균) / 통합표준편차'
  },
  P_VALUE: {
    label: '검증 (p-value)',
    desc: '사전-사후 변화가 우연에 의한 것이 아닐 확률을 나타냅니다. 0.05 미만일 경우 유의미한 변화로 해석합니다.',
    formula: 'Paired t-test (대응표본 t-검정) 결과값'
  }
};

/**
 * 하이크 게인 (Hake's Gain / Normalized Gain) 계산
 * g = (post - pre) / (max - pre)
 */
export function calculateHakeGain(pre: number, post: number, max: number = 5): number {
  if (pre === max) return post === max ? 1 : 0;
  const gain = (post - pre) / (max - pre);
  return Number(gain.toFixed(3));
}

/**
 * t-value와 자유도(df)를 바탕으로 p-value 근사치 계산
 * 실제 서비스에서는 jstat 같은 통계 라이브러리가 권장되나, 여기서는 주요 임계치에 따른 정밀한 근사치를 제공합니다.
 */
export function getPValueFromT(t: number, df: number): number {
  const absT = Math.abs(t);
  
  // 자유도가 낮을 때는 더 큰 t-value가 필요함 (간이 t-분포 근사)
  const penalty = df < 5 ? 1.5 : df < 15 ? 1.2 : 1.0;
  const adjT = absT / penalty;

  if (adjT > 3.291) return 0.001; // p < .001
  if (adjT > 2.576) return 0.01;  // p < .01
  if (adjT > 1.960) return 0.05;  // p < .05
  if (adjT > 1.645) return 0.1;   // p < .10
  return 0.5;
}

/**
 * 코헨의 d (Cohen's d / Effect Size) 계산
 * d = (m_post - m_pre) / s_pooled
 */
export function calculateCohensD(preScores: number[], postScores: number[]): number {
  if (preScores.length < 2 || postScores.length < 2) return 0;

  const mPre = ss.mean(preScores);
  const mPost = ss.mean(postScores);
  
  const vPre = ss.variance(preScores);
  const vPost = ss.variance(postScores);
  
  const nPre = preScores.length;
  const nPost = postScores.length;
  
  // Pooled Standard Deviation
  const pooledSD = Math.sqrt(
    ((nPre - 1) * vPre + (nPost - 1) * vPost) / (nPre + nPost - 2)
  );

  if (pooledSD === 0) return 0;
  return (mPost - mPre) / pooledSD;
}

/**
 * Paired T-test (t-value) 계산
 * 대응표본 T-검정을 통해 변화의 통계적 유의성 검증을 위한 t-value를 산출합니다.
 */
export function calculatePairedTTest(preScores: number[], postScores: number[]): number {
  if (preScores.length !== postScores.length || preScores.length < 2) return 1.0;
  
  const differences = preScores.map((pre, i) => postScores[i] - pre);
  const n = differences.length;
  const meanDiff = ss.mean(differences);
  const sdDiff = ss.standardDeviation(differences);
  
  if (sdDiff === 0) return meanDiff === 0 ? 1.0 : 0.0;
  
  const tValue = meanDiff / (sdDiff / Math.sqrt(n));
  
  // simple-statistics에는 t-distribution p-value 함수가 직접 없으므로
  // t-value 절대값에 따른 근사치를 반환하거나 직접 수식을 사용해야 함.
  // 여기서는 근사적인 유의성 판단을 위한 로직을 구현 (또는 t-distribution 근사 가능 라이브러리 추가 고려)
  // 단순화를 위해 t-value를 반환하고, UI에서 임계치(1.96 등)와 비교하게 하거나
  // 간단한 근사 함수를 사용합니다.
  
  return tValue; // t-value 자체를 반환하여 UI에서 처리
}

/**
 * 성취도 등급 판정 (Hake's Gain 기준)
 * High: > 0.7, Medium: 0.3 ~ 0.7, Low: < 0.3
 */
export function getAchievementLevel(gain: number): 'High' | 'Medium' | 'Low' {
  if (gain >= 0.7) return 'High';
  if (gain >= 0.3) return 'Medium';
  return 'Low';
}

/**
 * 15년차 교육 컨설턴트 페르소나 기반의 분석 보고서 생성 프롬프트
 */
export function generateAIExpertReport(
  projectList: Project[],
  aggregatedData: Record<string, { 
    avg: number; 
    satAvg: number; 
    preAvg: number; 
    postAvg: number; 
    satCount: number;
    compCount: number;
    count: number 
  }>,
  type: 'COMPETENCY' | 'SATISFACTION' | 'UNIFIED' = 'UNIFIED'
): string {
  const lv1s = projectList.filter(p => p.level === 1);
  
  const reportStructure = lv1s.map(lv1 => {
    const stats = aggregatedData[lv1.id];
    if (!stats) return `### [데이터 부족] ${lv1.name} (LV1): 분석할 수 있는 설문 결과가 충분하지 않습니다.`;

    const hakeGain = calculateHakeGain(stats.preAvg, stats.postAvg);
    const children = projectList.filter(p => p.parentId === lv1.id);
    
    return `
### [종합 분석] ${lv1.name} (LV1)
- **성과 요약**: 만족도(${stats.satAvg?.toFixed(2)}점), 사전역량(${stats.preAvg?.toFixed(2)}점) → 사후역량(${stats.postAvg?.toFixed(2)}점)
- **핵심 지표**: **Hake's Gain(향상도): ${hakeGain.toFixed(2)}**, **교육 만족 지수: ${stats.satAvg?.toFixed(2)}**
- **Insight**: 교육 만족도와 실제 역량 향상폭 간의 상관관계 해석. 만족도는 높으나 역량 향상이 미비하거나, 만족도는 낮으나 실질적 역량 향상이 높은 지점이 있는지 탐색.

### [세부 사업 분석] 구성 요소별 연결성 (LV2)
${children.map(lv2 => {
  const lv2Stats = aggregatedData[lv2.id];
  return `- **${lv2.name}**: 만족도 ${lv2Stats?.satAvg?.toFixed(2) || '-'}, 역량 향상도 ${calculateHakeGain(lv2Stats?.preAvg || 0, lv2Stats?.postAvg || 0).toFixed(2)}`;
}).join('\n')}

### [핵심 인사이트] 만족도와 학습 효과의 정합성 (LV3-4)
- 만족도가 높음에도 역량 향상이 낮은 경우 '교육의 재미는 있으나 실무 적용성이 낮음'으로 해석.
- 반대로 만족도는 평이하나 역량 향상이 높은 경우 '학습 강도가 높고 전문성이 뛰어난 교육'으로 해석.
- 데이터 이상치(유난히 높거나 낮은 점수) 발생 원인 추론 포함.

### [제언 및 액션 아이템]
- 향후 교육 설계 시 개선해야 할 구체적인 전략(콘텐츠 고도화, 강사 재배치, 인프라 개선 등) 제시.
    `;
  }).join('\n---\n');

  return `
당신은 대한민국 교육 공학 및 성과 분석 분야에서 15년 이상의 경력을 가진 **시니어 교육 컨설턴트**입니다.
제공된 교육 만족도(Satisfaction)와 사전사후 역량 성취도(Competency) 데이터를 바탕으로, 전문적이고 비판적이며 건설적인 '통합 성과 분석 보고서'를 작성해 주세요.

[분석 포인트]
1. 만족도가 실제 역량 향상(Hake's Gain)으로 전이되었는지 상관관계를 분석하십시오.
2. 데이터의 이상치가 있다면 그 원인을 교육 설계(ID) 관점에서 추론하십시오.
3. 단순 나열이 아닌, 레벨 간의 유기적 관계와 향후 개선 방향에 집중하십시오.

[분석 데이터 요약]
${reportStructure}
  `;
}
