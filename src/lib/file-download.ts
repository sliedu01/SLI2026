/**
 * 서울런 3.0 방식의 초견고 파일 다운로드 유틸리티
 * fetch API의 제약을 받지 않고 브라우저 내에서 직접 Base64를 Blob으로 변환하여
 * 원본 파일명과 포맷을 100% 보존합니다.
 */

/**
 * Data URL (Base64)을 Blob 객체로 수동 변환 (Legacy 및 대용량 대응)
 */
function dataURLtoBlob(dataurl: string) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error("Invalid Data URL");
  
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

export async function downloadFile(fileUrl: string | undefined, fileName?: string) {
  if (!fileUrl) return;

  try {
    let blob: Blob;
    let fetchedFileName = '';

    // 1. Data URL인 경우 직접 변환하여 fetch 오버헤드 및 실패 방지
    if (fileUrl.startsWith('data:')) {
      blob = dataURLtoBlob(fileUrl);
    } else {
      // 2. 일반 URL인 경우 fetch 사용
      const response = await fetch(fileUrl);
      blob = await response.blob();
      
      // 헤더에서 Content-Disposition을 추출하여 파일명 파싱
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          fetchedFileName = filenameMatch[1].replace(/['"]/g, '');
          fetchedFileName = decodeURIComponent(fetchedFileName);
        }
      }
    }
    
    // 파일명이 제공되지 않은 경우, 헤더에서 추출한 파일명을 사용, 그래도 없으면 URL에서 추출
    let finalFileName = fileName || fetchedFileName;
    if (!finalFileName) {
      try {
        const urlPart = fileUrl.split('/').pop()?.split('?')[0];
        finalFileName = urlPart ? decodeURIComponent(urlPart) : 'download';
      } catch (e) {
        finalFileName = 'download';
      }
    }
    
    // 3. 안정적인 Object URL 생성
    const blobUrl = URL.createObjectURL(blob);
    
    // 4. 강제 다운로드 트리거
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    
    // 5. 자원 정리
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 300);
  } catch (error) {
    console.error("Advanced Download Error:", error);
    alert("파일 다운로드에 실패했습니다. 형식 또는 용량을 확인해주세요.");
  }
}
