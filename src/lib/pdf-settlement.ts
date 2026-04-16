import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { jsPDF } from 'jspdf';

/**
 * 지출 증빙 PDF 병합 및 푸터 추가 유틸리티
 */
export async function generateSettlementPDF(
  projectName: string, 
  executionName: string, 
  expenditures: any[]
) {
  // 1. 커버 페이지 생성 (jsPDF 사용)
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.text('정산 보고서 (증빙 합철본)', 105, 40, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`사업명: ${projectName}`, 20, 70);
  doc.text(`집행항목: ${executionName}`, 20, 80);
  doc.text(`출력일시: ${new Date().toLocaleString()}`, 20, 90);
  
  doc.line(20, 100, 190, 100);
  
  doc.setFontSize(12);
  doc.text('지출 내역 요약', 20, 115);
  
  let y = 130;
  expenditures.forEach((exp, idx) => {
    doc.text(`${idx + 1}. [${exp.date}] ${exp.vendor} - ₩${exp.amount.toLocaleString()}`, 25, y);
    y += 10;
  });

  const coverPdfBytes = doc.output('arraybuffer');

  // 2. pdf-lib을 이용한 병합 및 푸터 추가
  const mergedPdf = await PDFDocument.create();
  
  // 커버 페이지 추가
  const coverPdf = await PDFDocument.load(coverPdfBytes);
  const [coverPage] = await mergedPdf.copyPages(coverPdf, [0]);
  mergedPdf.addPage(coverPage);

  // 폰트 설정
  const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  // 각 지출 내역의 증빙 병합 (시뮬레이션: 실제 파일이 있으면 fetch해서 병합)
  // 여기서는 로직만 구현하고 파일이 없는 경우 스킵
  for (let i = 0; i < expenditures.length; i++) {
    const exp = expenditures[i];
    if (exp.attachmentUrl) {
      try {
        // 실제 환경에서는 fetch(exp.attachmentUrl)로 bytes를 가져옴
        // 시뮬레이션을 위해 빈 페이지 추가 (또는 이미지가 있다면 jsPDF로 변환 후 추가)
        const page = mergedPdf.addPage();
        const { width, height } = page.getSize();
        
        // 상단에 지출 정보 헤더 추가
        page.drawText(`Evidence [${i+1}]: ${exp.vendor} (₩${exp.amount.toLocaleString()})`, {
          x: 50,
          y: height - 50,
          size: 15,
          font,
          color: rgb(0.1, 0.4, 0.8),
        });

        // 푸터 추가 (p. 2-1, 2-2 등)
        const footerText = `p. ${exp.projectId ? 'P' : 'E'}-${i + 1}`;
        page.drawText(footerText, {
          x: width / 2 - 20,
          y: 30,
          size: 12,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
      } catch (err) {
        console.error('PDF Merge Error:', err);
      }
    }
  }

  const pdfBytes = await mergedPdf.save();
  
  // 다운로드 트리거
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `서울2026_정산보고서_${executionName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
