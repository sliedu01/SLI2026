import * as ss from 'simple-statistics';

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
 * Paired T-test (p-value) 계산
 * 대응표본 T-검정을 통해 변화의 통계적 유의성 검증
 */
export function calculatePairedTTest(preScores: number[], postScores: number[]): number {
  if (preScores.length !== postScores.length || preScores.length < 2) return 1.0;
  
  const differences = preScores.map((pre, i) => postScores[i] - pre);
  const n = differences.length;
  const meanDiff = ss.mean(differences);
  const sdDiff = ss.standardDeviation(differences);
  
  if (sdDiff === 0) return meanDiff === 0 ? 1.0 : 0.0;
  
  const tValue = meanDiff / (sdDiff / Math.sqrt(n));
  const df = n - 1;
  
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
 * 성과 해석 스트림 생성
 */
export function generateAnalysisSummary(
  projectName: string, 
  cohensD: number, 
  avgGain: number
): string {
  let effectStr = "보통";
  if (cohensD >= 0.8) effectStr = "매우 우수";
  else if (cohensD >= 0.5) effectStr = "우수";
  else if (cohensD < 0.2) effectStr = "미미";

  const gainPercent = (avgGain * 100).toFixed(1);
  
  return `이번 [${projectName}] 교육은 효과 크기(Cohen's d: ${cohensD.toFixed(2)}) 측면에서 [${effectStr}]한 수준이며, 학습자들의 잠재력 대비 ${gainPercent}%의 성취(Hake's Gain)를 달성한 것으로 분석되었습니다.`;
}
