/**
 * 금액 표시 및 입력을 위한 숫자 포맷 유틸리티
 */

/**
 * 숫자를 천 단위 콤마(,)가 포함된 문자열로 변환합니다.
 */
export function formatWithCommas(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('ko-KR');
}

/**
 * 콤마가 포함된 문자열에서 숫자만 추출합니다.
 */
export function parseCommaNumber(value: string): number {
  if (!value) return 0;
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * 입력창용 실시간 포맷팅 처리
 * 입력된 값에서 숫자 외의 문자를 제거하고 콤마를 찍어 반환합니다.
 */
export function formatInputNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('ko-KR');
}
