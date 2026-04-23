import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import fontkit from '@pdf-lib/fontkit';

/**
 * 지출 증빙 PDF 병합 및 푸터 추가 유틸리티
 */
export async function generateSettlementPDF(
  projectName: string, 
  executionName: string, 
  expenditures: any[]
) {
  try {
    // 2. pdf-lib을 이용한 병합
    const mergedPdf = await PDFDocument.create();
    mergedPdf.registerFontkit(fontkit);

    // 한글 폰트 로드 (Google Fonts CDN 사용)
    const fontUrl = 'https://fonts.gstatic.com/s/nanumgothic/v23/PN_oTaWLYAdPhAbS70T9S77_60_v.ttf';
    let customFont: PDFFont | undefined;
    try {
      const fontBytes = await fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`폰트 다운로드 실패 (HTTP ${res.status})`);
        return res.arrayBuffer();
      });
      customFont = await mergedPdf.embedFont(fontBytes);
      console.log('PDF: Custom font loaded successfully');
    } catch (fontErr) {
      console.error('PDF: Custom font load failed:', fontErr);
    }

    // 각 지출 내역의 증빙 병합
    for (const exp of expenditures) {
      if (!exp.attachmentUrl) continue;

      try {
        const response = await fetch(exp.attachmentUrl);
        if (!response.ok) throw new Error(`파일 다운로드 실패 (HTTP ${response.status})`);
        
        const fileBytes = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || '';
        const fileName = exp.attachmentOriginalName || 'attachment.pdf';

        if (contentType.includes('pdf')) {
          const srcPdf = await PDFDocument.load(fileBytes);
          const srcPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          
          srcPages.forEach(page => {
            const { width, height } = page.getSize();
            
            // 폰트가 있는 경우에만 한글 파일명 출력
            if (customFont) {
              const fontSize = 11;
              const textWidth = customFont.widthOfTextAtSize(fileName, fontSize);
              
              // 우측 상단 정렬 (여백 15, 상단에서 15 내려옴)
              // (0,0)은 좌측 하단이므로 height - offset 사용
              page.drawText(fileName, {
                x: width - textWidth - 25,
                y: height - 25,
                size: fontSize,
                font: customFont,
                color: rgb(0.2, 0.2, 0.2),
              });
            } else {
              // 폰트 로드 실패 시 영문으로라도 표시 (디버깅용)
              page.drawText('Header Error: No Font', {
                x: width - 100,
                y: height - 25,
                size: 8,
                color: rgb(1, 0, 0),
              });
            }
            mergedPdf.addPage(page);
          });
        } else if (contentType.includes('image')) {
          // 이미지는 jsPDF로 PDF화 한 뒤 병합
          const imgDoc = new jsPDF();
          const imgData = new Uint8Array(fileBytes);
          const imgProps = imgDoc.getImageProperties(imgData);
          const pdfWidth = imgDoc.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          imgDoc.addImage(imgData, (contentType.split('/')[1] || 'jpeg').toUpperCase(), 0, 0, pdfWidth, pdfHeight);
          const imgPdfBytes = imgDoc.output('arraybuffer');
          
          const imgPdf = await PDFDocument.load(imgPdfBytes);
          const [imgPage] = await mergedPdf.copyPages(imgPdf, [0]);
          
          const { width, height } = imgPage.getSize();
          if (customFont) {
            const fontSize = 11;
            const textWidth = customFont.widthOfTextAtSize(fileName, fontSize);
            
            imgPage.drawText(fileName, {
              x: width - textWidth - 25,
              y: height - 25,
              size: fontSize,
              font: customFont,
              color: rgb(0.2, 0.2, 0.2),
            });
          }
          mergedPdf.addPage(imgPage);
        }
      } catch (err: any) {
        console.error(`PDF: Failed to merge ${exp.attachmentOriginalName}:`, err);
      }
    }

    const pdfBytes = await mergedPdf.save();
    
    // 다운로드 트리거
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `서울2026_증빙합철_${executionName}_${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (err: any) {
    console.error('PDF Generation Error:', err);
    alert(`PDF 생성 중 오류가 발생했습니다.\n상세내용: ${err.message || '알 수 없는 오류'}`);
  }
}
