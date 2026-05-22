'use client';

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 20; // 상하 여백
const USABLE_HEIGHT_MM = A4_HEIGHT_MM - PAGE_PADDING_MM; // 하단 여백만 고려

/**
 * PDF 다운로드: 콘텐츠 인식 페이지 분할로 글자/행 잘림 방지
 * - 각 섹션을 자연 높이로 캡처
 * - A4를 넘는 경우 "안전 절단점" (테이블 행 사이, 블록 사이 빈 공간)을 자동 탐색
 * - 표는 행 단위로 분할되어 페이지에 반영
 */
export async function generateSurveyReport(containerId: string, fileName: string) {
  const container = document.getElementById(containerId);
  if (!container) {
    alert('보고서 콘텐츠를 찾을 수 없습니다. 보고서 프리뷰가 화면에 표시된 상태에서 다시 시도해주세요.');
    return;
  }

  // 캡처 전: overflow 제한 해제 (부모 컨테이너의 overflow:hidden이 캡처를 방해할 수 있음)
  const overflowAnchestors: { el: HTMLElement; orig: string }[] = [];
  let ancestor: HTMLElement | null = container.parentElement;
  while (ancestor && ancestor !== document.body) {
    const cs = getComputedStyle(ancestor);
    if (cs.overflow !== 'visible' || cs.overflowY !== 'visible' || cs.overflowX !== 'visible') {
      overflowAnchestors.push({ el: ancestor, orig: ancestor.style.overflow });
      ancestor.style.overflow = 'visible';
    }
    ancestor = ancestor.parentElement;
  }

  try {
  const pages = container.querySelectorAll('.report-page');
  if (pages.length === 0) {
    alert('보고서 페이지가 없습니다.');
    return;
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  let isFirstPage = true;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i] as HTMLElement;

    // 첫 페이지(표지)는 고정 A4 높이 유지, 나머지는 자연 높이로 캡처
    const origMinHeight = page.style.minHeight;
    const origHeight = page.style.height;
    if (i > 0) {
      page.style.minHeight = 'auto';
      page.style.height = 'auto';
    }

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: page.scrollWidth,
    });

    // 원래 스타일 복원
    if (i > 0) {
      page.style.minHeight = origMinHeight;
      page.style.height = origHeight;
    }

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const pxPerMm = canvasWidth / A4_WIDTH_MM;
    const maxPageHeightPx = USABLE_HEIGHT_MM * pxPerMm;

    // A4 한 페이지 이내인 경우 그대로 삽입
    if (canvasHeight <= maxPageHeightPx * 1.02) {
      if (!isFirstPage) pdf.addPage();
      isFirstPage = false;

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgHeightMm = (canvasHeight / pxPerMm);
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, Math.min(imgHeightMm, A4_HEIGHT_MM));
      continue;
    }

    // A4를 넘는 경우: 안전한 절단점을 찾아 분할
    let yOffset = 0;
    while (yOffset < canvasHeight) {
      const remaining = canvasHeight - yOffset;
      let sliceHeight = Math.min(maxPageHeightPx, remaining);

      // 마지막 조각이 아닌 경우 안전한 절단점 탐색
      if (remaining > maxPageHeightPx) {
        sliceHeight = findSafeCutPoint(canvas, yOffset, sliceHeight, pxPerMm);
      }

      // 이 슬라이스를 새 캔버스로 추출
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvasWidth;
      sliceCanvas.height = Math.ceil(sliceHeight);
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0, yOffset, canvasWidth, Math.ceil(sliceHeight),
        0, 0, canvasWidth, Math.ceil(sliceHeight)
      );

      if (!isFirstPage) pdf.addPage();
      isFirstPage = false;

      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
      const imgHeightMm = sliceHeight / pxPerMm;
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, imgHeightMm);

      yOffset += sliceHeight;
    }
  }

  pdf.save(`${fileName}.pdf`);

  } catch (err: any) {
    console.error('PDF 생성 오류:', err);
    alert(`PDF 생성 중 오류가 발생했습니다.\n\n[오류 내용]\n${err.message || String(err)}`);
  } finally {
    // overflow 스타일 복원
    overflowAnchestors.forEach(({ el, orig }) => {
      el.style.overflow = orig;
    });
  }
}

/**
 * 안전한 절단점 탐색
 * - 이상적인 절단 위치(maxHeight) 부근에서 "거의 흰색"인 가로줄을 찾음
 * - 테이블 행 사이, 블록 요소 사이의 빈 공간이 이에 해당
 * - 검색 범위: 이상 절단점에서 위로 30mm까지
 */
function findSafeCutPoint(
  canvas: HTMLCanvasElement,
  yOffset: number,
  idealHeight: number,
  pxPerMm: number
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return idealHeight;

  const width = canvas.width;
  const searchRangePx = Math.round(30 * pxPerMm); // 30mm 범위 내 탐색
  const minSlicePx = Math.round(40 * pxPerMm); // 최소 40mm는 확보

  const idealCutY = yOffset + idealHeight;
  const searchStart = Math.max(idealCutY - searchRangePx, yOffset + minSlicePx);
  const searchEnd = Math.min(idealCutY, canvas.height - 1);
  const searchHeight = searchEnd - searchStart + 1;

  if (searchHeight <= 0) return idealHeight;

  // 성능 최적화: 전체 탐색 영역의 픽셀 데이터를 한 번에 가져옴
  let imageData;
  try {
    imageData = ctx.getImageData(0, searchStart, width, searchHeight);
  } catch (err) {
    console.warn('getImageData failed (likely tainted canvas), falling back to idealHeight:', err);
    return idealHeight;
  }
  const data = imageData.data;

  // 샘플링 간격
  const sampleStep = Math.max(1, Math.floor(width / 200));

  let bestY = idealHeight;
  let bestScore = -1;

  // 아래에서 위로 탐색 (이상적인 절단점에 가까운 곳 우선)
  for (let row = searchHeight - 1; row >= 0; row--) {
    let whiteCount = 0;
    let sampleCount = 0;
    const rowOffset = row * width * 4;

    for (let x = 0; x < width * 4; x += sampleStep * 4) {
      const idx = rowOffset + x;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > 235 && g > 235 && b > 235) whiteCount++;
      sampleCount++;
    }

    const whiteness = whiteCount / sampleCount;
    const actualY = searchStart + row;

    if (whiteness > 0.95) {
      return actualY - yOffset;
    }

    if (whiteness > bestScore) {
      bestScore = whiteness;
      bestY = actualY - yOffset;
    }
  }

  if (bestScore > 0.80) return bestY;
  return idealHeight;
}

/**
 * HWP 다운로드: PDF 다운로드와 동일하게 html2canvas를 사용하여
 * 디자인을 완벽하게 캡처한 후 이미지 형태의 HWP 문서로 저장합니다.
 */
export async function downloadAsHWP(containerId: string, fileName: string) {
  const container = document.getElementById(containerId);
  if (!container) {
    alert('보고서 콘텐츠를 찾을 수 없습니다. 보고서 프리뷰가 화면에 표시된 상태에서 다시 시도해주세요.');
    return;
  }

  // 캡처 전: overflow 제한 해제 (부모 컨테이너의 overflow:hidden이 캡처를 방해할 수 있음)
  const overflowAnchestors: { el: HTMLElement; orig: string }[] = [];
  let ancestor: HTMLElement | null = container.parentElement;
  while (ancestor && ancestor !== document.body) {
    const cs = getComputedStyle(ancestor);
    if (cs.overflow !== 'visible' || cs.overflowY !== 'visible' || cs.overflowX !== 'visible') {
      overflowAnchestors.push({ el: ancestor, orig: ancestor.style.overflow });
      ancestor.style.overflow = 'visible';
    }
    ancestor = ancestor.parentElement;
  }

  try {
    const pages = container.querySelectorAll('.report-page');
    if (pages.length === 0) {
      alert('보고서 페이지가 없습니다.');
      return;
    }

    const imgTags: string[] = [];
    let isFirstPage = true;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;

      // 첫 페이지(표지)는 고정 A4 높이 유지, 나머지는 자연 높이로 캡처
      const origMinHeight = page.style.minHeight;
      const origHeight = page.style.height;
      if (i > 0) {
        page.style.minHeight = 'auto';
        page.style.height = 'auto';
      }

      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: page.scrollWidth,
      });

      // 원래 스타일 복원
      if (i > 0) {
        page.style.minHeight = origMinHeight;
        page.style.height = origHeight;
      }

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const pxPerMm = canvasWidth / A4_WIDTH_MM;
      const maxPageHeightPx = USABLE_HEIGHT_MM * pxPerMm;

      // A4 한 페이지 이내인 경우 그대로 삽입
      if (canvasHeight <= maxPageHeightPx * 1.02) {
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (!isFirstPage) {
          imgTags.push("<br clear=all style='mso-special-character:line-break;page-break-before:always'>");
        }
        isFirstPage = false;
        imgTags.push(`<img src="${imgData}" style="width: 100%; max-width: ${A4_WIDTH_MM}mm;" />`);
        continue;
      }

      // A4를 넘는 경우: 안전한 절단점을 찾아 분할
      let yOffset = 0;
      while (yOffset < canvasHeight) {
        const remaining = canvasHeight - yOffset;
        let sliceHeight = Math.min(maxPageHeightPx, remaining);

        // 마지막 조각이 아닌 경우 안전한 절단점 탐색
        if (remaining > maxPageHeightPx) {
          sliceHeight = findSafeCutPoint(canvas, yOffset, sliceHeight, pxPerMm);
        }

        // 이 슬라이스를 새 캔버스로 추출
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasWidth;
        sliceCanvas.height = Math.ceil(sliceHeight);
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0, yOffset, canvasWidth, Math.ceil(sliceHeight),
          0, 0, canvasWidth, Math.ceil(sliceHeight)
        );

        const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        if (!isFirstPage) {
          imgTags.push("<br clear=all style='mso-special-character:line-break;page-break-before:always'>");
        }
        isFirstPage = false;
        imgTags.push(`<img src="${imgData}" style="width: 100%; max-width: ${A4_WIDTH_MM}mm;" />`);

        yOffset += sliceHeight;
      }
    }

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>교육 성과 보고서</title>
        <style>
          body { margin: 0; padding: 0; text-align: center; }
          img { display: block; margin: 0 auto; }
        </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const content = imgTags.join('\\n');
    
    const blob = new Blob([header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.hwp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (err: any) {
    console.error('HWP 생성 오류:', err);
    alert(\`HWP 생성 중 오류가 발생했습니다.\\n\\n[오류 내용]\\n\${err.message || String(err)}\`);
  } finally {
    overflowAnchestors.forEach(({ el, orig }) => {
      el.style.overflow = orig;
    });
  }
}
