import * as XLSX from 'xlsx';

/**
 * 데이터를 엑셀 파일(.xlsx)로 내보냅니다.
 * @param data 내보낼 객체 배열
 * @param fileName 확장자를 제외한 파일명
 * @param sheetName 시트 이름
 * @param summaryKey 합계를 구할 키 (선택 사항)
 */
export const exportToExcel = (
  data: Record<string, unknown>[], 
  fileName: string, 
  sheetName: string = 'Sheet1',
  summaryKey?: string
) => {
  try {
    // 1. 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 2. 워크시트 생성 (JSON to Sheet)
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 3. 요약 행 추가 (summaryKey가 제공된 경우)
    if (summaryKey && data.length > 0) {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const rowCount = range.e.r + 1;
      const colIndex = Object.keys(data[0]).indexOf(summaryKey);
      
      if (colIndex !== -1) {
        const colAddress = XLSX.utils.encode_col(colIndex);
        const formula = `SUM(${colAddress}2:${colAddress}${rowCount})`;
        
        ws[`${colAddress}${rowCount + 1}`] = { f: formula, t: 'n' };
        ws[`${XLSX.utils.encode_col(colIndex - 1)}${rowCount + 1}`] = { v: '합계', t: 's' };
        
        range.e.r += 1;
        ws['!ref'] = XLSX.utils.encode_range(range.s, range.e);
      }
    }

    // 4. 열 너비 자동 조정
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const maxWidths = headers.map((key, i) => {
      const headerLen = key.length;
      const maxDataLen = data.reduce((max, row) => {
        const val = row[key] ? String(row[key]) : '';
        return Math.max(max, val.length);
      }, 0);
      return Math.max(headerLen, maxDataLen);
    });
    
    ws['!cols'] = maxWidths.map((w: number) => ({ wch: Math.min(Math.max(w + 2, 10), 50) }));

    // 5. 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // 6. 파일 다운로드 트리거
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
    alert('엑셀 내보내기 중 오류가 발생했습니다.');
  }
};
