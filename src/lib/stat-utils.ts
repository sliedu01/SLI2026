import * as ss from 'simple-statistics';
import { Project } from '@/store/use-project-store';

/**
 * 하이크 게인 (Hake's Gain / Normalized Gain) 계산
 * g = (post - pre) / (max - pre)
 */
export function calculateHakeGain(pre: number, post: number, max: number = 5): number {
  if (pre === max) return post === max ? 1 : 0; // 만점에서 유지되면 1, 떨어지면 0
  const gain = (post - pre) / (max - pre);
  return Math.max(0, gain); // 향상된 경우만 0~1 사이로 반환 (비정상 하락은 0으로 처리)
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
  aggregatedData: Record<string, { avg: number; preAvg?: number; postAvg?: number; count: number }>,
  type: 'COMPETENCY' | 'SATISFACTION' = 'COMPETENCY'
): string {
  const lv1s = projectList.filter(p => p.level === 1);
  
  const reportStructure = lv1s.map(lv1 => {
    const lv1Stats = aggregatedData[lv1.id];
    const lv1Score = lv1Stats?.avg || 0;
    const children = projectList.filter(p => p.parentId === lv1.id);
    
    let analysisTypeLabel = type === 'SATISFACTION' ? '교육 만족도' : '사전사후 역량 향상';
    let metricDetails = type === 'COMPETENCY' && lv1Stats 
      ? `(사전: ${lv1Stats.preAvg?.toFixed(2)}, 사후: ${lv1Stats.postAvg?.toFixed(2)}, 향상도 분석 포함)`
      : `(평균 점수: ${lv1Score.toFixed(2)}점)`;

    return `
### [종합 분석] ${lv1.name} (LV1)
- **분석 유형**: ${analysisTypeLabel}
- **성과 요약**: ${metricDetails}
- **Insight**: 15년차 컨설턴트 관점에서 본 사업의 거시적 성과와 목표 달성 여부 해석.

### [세부 사업 분석] 구성 요소별 연결성 (LV2)
${children.map(lv2 => {
  const lv2Stats = aggregatedData[lv2.id];
  const lv2Score = lv2Stats?.avg || 0;
  return `- **${lv2.name}**: 하위 프로그램들과의 유기적 연결성 평가 (평균: ${lv2Score.toFixed(2)}점)`;
}).join('\n')}

### [핵심 인사이트] ${type === 'SATISFACTION' ? '교육 품질 및 만족 지점' : '역량 향상 및 학습 전이'} (LV3-4)
- ${type === 'SATISFACTION' 
    ? '교육 인프라, 강사, 콘텐츠 중 어떤 요소가 만족도에 가장 큰 기여를 했는지 분석합니다.' 
    : '만족도와 실제 역량 향상폭 간의 상관관계를 탐색하여 교육 내용의 적합성을 분석합니다.'}
- 데이터 이상치(유난히 높거나 낮은 점수) 발생 원인 추론 포함.

### [제언 및 액션 아이템]
- 향후 교육 설계 시 개선해야 할 구체적인 전략 제시.
    `;
  }).join('\n---\n');

  return `
당신은 대한민국 교육 공학 및 성과 분석 분야에서 15년 이상의 경력을 가진 **시니어 교육 컨설턴트**입니다.
제공된 LV1부터 LV4까지의 계층형 데이터를 바탕으로, 전문적이고 비판적이며 건설적인 '성과 분석 보고서'를 작성해 주세요.

[제약 사항]
1. 깔끔한 마크다운 형식을 사용하십시오.
2. 데이터의 이상치가 있다면 그 원인을 교육 설계 관점에서 추론하십시오.
3. 단순 나열이 아닌, 레벨 간의 유기적 관계에 집중하십시오.

[분석 데이터 요약]
${reportStructure}
  `;
}
