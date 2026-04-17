import * as XLSX from 'xlsx';

/**
 * 데이터를 엑셀 파일(.xlsx)로 내보냅니다.
 * @param data 내보낼 객체 배열
 * @param fileName 확장자를 제외한 파일명
 * @param sheetName 시트 이름
 */
export const exportToExcel = (data: Record<string, unknown>[], fileName: string, sheetName: string = 'Sheet1') => {
  try {
    // 1. 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 2. 워크시트 생성 (JSON to Sheet)
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 3. 열 너비 자동 조정 (심플 로직)
    const maxWidths = data.reduce((acc: number[], row) => {
      Object.keys(row).forEach((key, i) => {
        const val = row[key] ? row[key].toString() : '';
        const len = val.length;
        if (!acc[i] || len > acc[i]) acc[i] = len;
      });
      return acc;
    }, []);
    
    ws['!cols'] = maxWidths.map((w: number) => ({ wch: Math.min(Math.max(w, 10), 50) }));

    // 4. 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // 5. 파일 다운로드 트리거
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
    alert('엑셀 내보내기 중 오류가 발생했습니다.');
  }
};
