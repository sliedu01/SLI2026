'use client';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * PDF 다운로드: 페이지별로 캡처하여 잘림 방지
 */
export async function generateSurveyReport(containerId: string, projectName: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pages = container.querySelectorAll('.report-page');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const pageHeight = 297;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;
    
    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight);
  }

  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  pdf.save(`교육성과보고서_${projectName}_${date}.pdf`);
}

/**
 * HWP 다운로드: HTML 서식을 유지하며 HWP로 변환 (HTML-compatible HWP)
 */
export function downloadAsHWP(containerId: string, projectName: string) {
  const element = document.getElementById(containerId);
  if (!element) return;

  // HWP에서 한글 폰트 및 레이아웃이 잘 보이도록 인라인 스타일 강화된 복사본 생성
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>교육 성과 보고서</title>
      <style>
        body { font-family: 'Batang', 'serif'; line-height: 1.6; color: #000; }
        .report-page { width: 100%; page-break-after: always; padding: 40px; border: 1px solid #eee; margin-bottom: 20px; }
        h1 { font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 30px; }
        h2 { font-size: 18pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 40px; }
        h3 { font-size: 14pt; font-weight: bold; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 10px; text-align: center; }
        .bg-slate-900 { background-color: #1a1a1a !important; color: #ffffff !important; }
        .text-white { color: #ffffff !important; }
        .grid { display: block; }
        .p-6, .p-10, .p-12 { padding: 20px; }
        img { max-width: 100%; height: auto; display: block; margin: 20px auto; }
      </style>
    </head>
    <body>
  `;
  const footer = "</body></html>";

  // 현재 화면의 내용을 가져와서 스타일을 인라인화하거나 보정
  const content = element.innerHTML;
  
  // Blob 생성 (MS Word/HWP 호환 MimeType)
  const blob = new Blob([header + content + footer], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  link.href = url;
  link.download = `교육성과분석보고서_${projectName}_${date}.hwp`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
