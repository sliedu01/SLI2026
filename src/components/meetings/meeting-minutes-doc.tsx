'use client';

import * as React from 'react';
import { Calendar, Clock, MapPin, Users, Plus, Trash2, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Meeting, MeetingAttendee, MeetingContent } from "@/store/use-meeting-store";
import { Project } from "@/store/use-project-store";
import { cn } from "@/lib/utils";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MeetingMinutesDocProps {
  meeting?: Partial<Meeting>;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<Meeting>) => void;
  onPrint?: () => void;
  onSubmit?: () => void; // 저장 버튼 클릭 시 호출
  onCancel?: () => void; // 취소 버튼 클릭 시 호출
  isSaving?: boolean;
  projects?: Project[];
}

export function MeetingMinutesDoc({ 
  meeting = {}, 
  isEditing = false,
  onUpdate,
  onPrint,
  onSubmit,
  onCancel,
  isSaving = false,
  projects = []
}: MeetingMinutesDocProps) {
  
  const lv1Projects = React.useMemo(() => 
    projects.filter(p => p.level === 1),
  [projects]);
  
  const handleChange = <K extends keyof Meeting>(field: K, value: Meeting[K]) => {
    if (onUpdate) onUpdate({ ...meeting, [field]: value });
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    if (!value) {
      handleChange(field, value);
      return;
    }
    const [hours, minutes] = value.split(':');
    const roundedMinutes = Math.round(parseInt(minutes) / 10) * 10;
    const finalMinutes = roundedMinutes === 60 ? '50' : roundedMinutes.toString().padStart(2, '0');
    handleChange(field, `${hours}:${finalMinutes}`);
  };

  const docRef = React.useRef<HTMLDivElement>(null);

  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownloadPDF = async () => {
    if (!docRef.current) return;
    setIsDownloading(true);
    
    try {
      const element = docRef.current;
      
      // 임시로 다운로드 버튼들을 숨김 (html2canvas 캡처 시 제외되도록)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        ignoreElements: (el) => el.classList.contains('print:hidden') || el.classList.contains('download-ignore'),
        onclone: (clonedDoc) => {
          // oklch, lab, oklab 컬러 함수가 포함된 스타일 태그를 찾아 HEX로 치환
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const tag = styleTags[i];
            if (tag.innerHTML.includes('oklch') || tag.innerHTML.includes('lab') || tag.innerHTML.includes('oklab')) {
              tag.innerHTML = tag.innerHTML.replace(/(?:oklch|lab|oklab)\([^)]+\)/g, '#4f46e5');
            }
          }
          
          // 인라인 스타일에서도 제거
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              const style = el.style;
              if (style.color && (style.color.includes('oklch') || style.color.includes('lab') || style.color.includes('oklab'))) {
                style.color = '#1f2937';
              }
              if (style.backgroundColor && (style.backgroundColor.includes('oklch') || style.backgroundColor.includes('lab') || style.backgroundColor.includes('oklab'))) {
                style.backgroundColor = 'transparent';
              }
              if (style.borderColor && (style.borderColor.includes('oklch') || style.borderColor.includes('lab') || style.borderColor.includes('oklab'))) {
                style.borderColor = '#e2e8f0';
              }
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`회의록_${meeting.title || '미지정'}_${meeting.date || ''}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF 생성 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadHWP = () => {
    // 공문서 서식 HTML 생성
    const title = meeting.title || '회의록';
    const date = meeting.date || '';
    const location = meeting.location || '';
    const attendees = (meeting.attendees || []).map(a => `${a.org} ${a.name}`).join(', ');
    const purpose = meeting.purpose || '';
    const agenda = (meeting.agenda || '').replace(/\n/g, '<br/>');


    const hwpHtml = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: a4; margin: 25mm 20mm; }
            body { 
              font-family: "Batang", "바탕", serif; 
              line-height: 1.8; 
              font-size: 11pt;
              color: #1a1a1a;
            }
            .title { 
              text-align: center; 
              font-size: 28pt; 
              font-weight: 800; 
              margin-top: 40px;
              margin-bottom: 60px; 
              color: #000;
              border-bottom: 3px double #000;
              padding-bottom: 10px;
              display: inline-block;
              width: 100%;
            }
            
            .info-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 40px; 
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
            }
            .info-table th, .info-table td { 
              padding: 12px 15px; 
              text-align: left; 
              border-bottom: 1px solid #eee;
            }
            .info-table th { 
              background-color: #f9fafb; 
              width: 100px; 
              font-weight: bold;
              color: #4b5563;
              border-right: 1px solid #eee;
            }

            .section-title { 
              font-size: 14pt; 
              font-weight: bold; 
              margin-top: 30px; 
              margin-bottom: 15px; 
              color: #000;
              border-left: 4px solid #4f46e5;
              padding-left: 12px;
            }
            
            .content-box {
              padding: 5px 15px 20px 15px;
              min-height: 80px;
            }
            .item-title { font-weight: bold; margin-bottom: 8px; color: #111; display: block; }
            .item-detail { margin-left: 15px; color: #374151; }

            .footer { 
              margin-top: 100px; 
              text-align: center; 
              font-size: 18pt; 
              font-weight: bold; 
              color: #000;
            }
            .official-seal {
              text-align: center;
              margin-top: 10px;
              color: #9ca3af;
              font-size: 9pt;
            }
          </style>
        </head>
        <body>
          <div class="title">회 의 록</div>
          
          <table class="info-table">
            <tr>
              <th>안 건 명</th>
              <td colspan="3" style="font-weight: bold; font-size: 12pt; color: #000;">${title}</td>
            </tr>
            <tr>
              <th>일    시</th>
              <td>${date} (${meeting.startTime || ''} ~ ${meeting.endTime || ''})</td>
              <th>장    소</th>
              <td>${location}</td>
            </tr>
            <tr>
              <th>참 석 자</th>
              <td colspan="3">${attendees}</td>
            </tr>
          </table>

          <div class="section-title">회의 개요 및 목적</div>
          <div class="content-box">${purpose || '내용 없음'}</div>

          <div class="section-title">주요 검토 안건</div>
          <div class="content-box">${agenda || '내용 없음'}</div>

          <div class="section-title">회의 결과 및 결정 사항</div>
          <div class="content-box">
            ${(meeting.content || []).map((item, idx) => `
              <div style="margin-bottom: 20px;">
                <span class="item-title">${idx + 1}. ${item.title}</span>
                <div class="item-detail">
                  ${item.detail.replace(/\n/g, '<br/>')}
                </div>
              </div>
            `).join('') || '기록된 내용이 없습니다.'}
          </div>

          <div class="section-title">기타 및 향후 추진 일정</div>
          <div class="content-box">
            <p style="margin-bottom: 10px;">• 기타사항: ${meeting.others || '-'}</p>
            <p>• 차기일정: ${meeting.nextSchedule || '-'}</p>
          </div>

          <div class="footer">SLI 교육그룹</div>
          <div class="official-seal">[직인생략]</div>
        </body>
      </html>
    `;

    const blob = new Blob([hwpHtml], { type: 'application/haansofthwp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `회의록_${title}_${date}.hwp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAttendeeChange = (idx: number, field: keyof MeetingAttendee, value: string) => {
    const newAttendees = [...(meeting.attendees || [])];
    newAttendees[idx] = { ...newAttendees[idx], [field]: value };
    handleChange('attendees', newAttendees);
  };

  const addAttendee = () => {
    handleChange('attendees', [...(meeting.attendees || []), { org: '', name: '' }]);
  };

  const removeAttendee = (idx: number) => {
    handleChange('attendees', (meeting.attendees || []).filter((_, i) => i !== idx));
  };

  const handleContentChange = (idx: number, field: keyof MeetingContent, value: string) => {
    const newContent = [...(meeting.content || [])];
    newContent[idx] = { ...newContent[idx], [field]: value };
    handleChange('content', newContent);
  };

  const addContent = () => {
    handleChange('content', [...(meeting.content || []), { title: '', detail: '' }]);
  };

  const removeContent = (idx: number) => {
    handleChange('content', (meeting.content || []).filter((_, i) => i !== idx));
  };


  return (
    <div 
      ref={docRef}
      className={cn(
        "bg-white relative print:shadow-none print:border-none print:p-0",
        isEditing 
          ? "p-4 md:p-6 lg:p-8" 
          : "p-6 md:p-8 lg:p-10 shadow-xl rounded-xl border border-slate-200"
      )}>
      
      {/* 관리 도구 (브라우저에서만 보임) */}
      {!isEditing && onPrint && (
        <div className="absolute top-8 right-8 print:hidden flex gap-2">
          <Button onClick={onPrint} variant="outline" className="rounded-xl gap-2 font-black border-slate-200 hover:bg-slate-50 h-10 px-4 text-[11px]">
            <Printer className="size-4" /> 회의록 출력
          </Button>
          <Button onClick={handleDownloadHWP} variant="outline" className="rounded-xl gap-2 font-black border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-10 px-4 text-[11px]">
            <FileDown className="size-4" /> HWP 다운로드
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading}
            variant="default" 
            className="rounded-xl gap-2 font-black bg-slate-900 hover:bg-slate-800 text-white shadow-lg h-10 px-4 text-[11px]"
          >
            <FileDown className="size-4" /> {isDownloading ? "생성 중..." : "PDF 다운로드"}
          </Button>
        </div>
      )}

      {/* 헤더 */}
      <div className="text-center mb-8 px-4">
        {isEditing ? (
          <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="text-center space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">연동 사업 선택 (LV1)</p>
              <select 
                value={meeting.projectId || ''}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const project = projects.find(p => p.id === selectedId);
                  if (project) {
                    if (onUpdate) onUpdate({ 
                      ...meeting, 
                      projectId: selectedId, 
                      title: project.name 
                    });
                  } else {
                    if (onUpdate) onUpdate({ 
                      ...meeting, 
                      projectId: undefined 
                    });
                  }
                }}
                className="w-full max-w-xl h-10 bg-white rounded-lg border border-slate-200 font-bold px-3 text-[11px] focus:border-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="">사업을 선택해 주세요</option>
                {lv1Projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">회의 제목</p>
              <Input 
                value={meeting.title || ''} 
                onChange={(e) => handleChange('title', e.target.value)}
                className="text-[18px] font-bold text-center h-12 rounded-lg border-none bg-white shadow-inner focus:ring-1 focus:ring-indigo-100 transition-all"
                placeholder="회의 주제를 입력하세요"
              />
            </div>
          </div>
        ) : (
          <h1 className="text-[18px] font-bold text-slate-900 border-b-2 border-slate-900 pb-2 inline-block tracking-tight">
            {meeting.title || '제목 없음'} 회의록
          </h1>
        )}
      </div>

      <div className="space-y-8">
        {/* 1. 기본정보 */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
            1. 기본정보
          </h2>
          <div className="border border-slate-900 overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="w-20 md:w-32 bg-slate-50 p-3 font-bold text-slate-700 text-center border-r border-slate-900 shrink-0 text-[11px]">일시</td>
                  <td className="p-3">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2 items-center">
                        <Input 
                          type="date" 
                          value={meeting.date || ''} 
                          onChange={(e) => handleChange('date', e.target.value)}
                          className="w-full md:w-40 h-9 rounded-lg font-bold text-[11px]"
                        />
                        <div className="flex items-center gap-1.5">
                          <Input 
                            type="time" 
                            value={meeting.startTime || ''} 
                            onChange={(e) => handleTimeChange('startTime', e.target.value)}
                            className="w-32 h-9 rounded-lg font-bold text-[11px]"
                            step="600"
                          />
                          <span className="font-bold text-slate-400 text-[11px]">~</span>
                          <Input 
                            type="time" 
                            value={meeting.endTime || ''} 
                            onChange={(e) => handleTimeChange('endTime', e.target.value)}
                            className="w-32 h-9 rounded-lg font-bold text-[11px]"
                            step="600"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 font-bold text-[11px]">
                        <Calendar className="size-3 text-slate-400" />
                        {meeting.date || '-'}
                        <Clock className="size-3 text-slate-400 ml-2" />
                        {meeting.startTime || '00:00'} ~ {meeting.endTime || '00:00'}
                      </div>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-20 md:w-32 bg-slate-50 p-3 font-bold text-slate-700 text-center border-r border-slate-900 shrink-0 text-[11px]">장소</td>
                  <td className="p-3">
                    {isEditing ? (
                      <Input 
                        value={meeting.location || ''} 
                        onChange={(e) => handleChange('location', e.target.value)}
                        placeholder="회의 장소를 입력하세요"
                        className="w-full h-9 rounded-lg font-bold text-[11px]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 font-bold text-[11px]">
                        <MapPin className="size-3 text-slate-400" />
                        {meeting.location || '-'}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="w-20 md:w-32 bg-slate-50 p-3 font-bold text-slate-700 text-center border-r border-slate-900 shrink-0 text-[11px]">참석자</td>
                  <td className="p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        {(meeting.attendees || []).map((att, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input 
                              placeholder="참여기관" 
                              value={att.org} 
                              onChange={(e) => handleAttendeeChange(idx, 'org', e.target.value)}
                              className="w-1/4 h-8 text-[11px]"
                            />
                            <Input 
                              placeholder="참여자명" 
                              value={att.name} 
                              onChange={(e) => handleAttendeeChange(idx, 'name', e.target.value)}
                              className="flex-1 h-8 text-[11px]"
                            />
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => removeAttendee(idx)}>
                              <Trash2 className="size-3.5 text-slate-400" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addAttendee} className="w-full h-8 border-dashed text-[10px] font-bold">
                          <Plus className="size-3 mr-1.5" /> 참석자 추가
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold flex-wrap text-[11px]">
                        <Users className="size-3 text-slate-400 mr-0.5" />
                        {(meeting.attendees || []).map((att, i) => (
                          <span key={i} className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            {att.org} ({att.name})
                          </span>
                        ))}
                        {(!meeting.attendees || meeting.attendees.length === 0) && '-'}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. 회의 */}
        <section>
          <h2 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center gap-2">
            2. 회의
          </h2>
          <div className="border border-slate-900">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="w-24 bg-slate-50 p-2 font-bold text-slate-700 text-center border-r border-slate-900 text-[11px]">목적</td>
                  <td className="p-2">
                    {isEditing ? (
                      <Textarea 
                        value={meeting.purpose || ''} 
                        onChange={(e) => handleChange('purpose', e.target.value.slice(0, 300))}
                        placeholder="회의 목적을 입력하세요 (최대 300자)"
                        className="w-full min-h-[60px] rounded-lg font-medium text-[11px]"
                        maxLength={300}
                      />
                    ) : (
                      <span className="text-slate-700 font-bold text-[11px]">{meeting.purpose || '-'}</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="bg-slate-50 p-2 font-bold text-slate-700 text-center border-r border-slate-900 text-[11px]">주요안건</td>
                  <td className="p-2">
                    {isEditing ? (
                      <Textarea 
                        value={meeting.agenda || ''} 
                        onChange={(e) => handleChange('agenda', e.target.value)}
                        placeholder="주요 안건을 입력하세요"
                        className="w-full min-h-[60px] rounded-lg font-medium text-[11px]"
                      />
                    ) : (
                      <p className="text-slate-700 font-bold text-[11px] whitespace-pre-wrap">{meeting.agenda || '-'}</p>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-24 bg-slate-50 p-2 font-bold text-slate-700 text-center border-r border-slate-900 shrink-0 text-[11px]">준비사항</td>
                  <td className="p-2">
                    {isEditing ? (
                      <Textarea 
                        value={meeting.preparations || ''} 
                        onChange={(e) => handleChange('preparations', e.target.value.slice(0, 300))}
                        placeholder="회의 전 준비사항을 입력하세요 (최대 300자)"
                        className="w-full min-h-[60px] rounded-lg font-medium text-[11px]"
                        maxLength={300}
                      />
                    ) : (
                      <span className="text-slate-700 font-bold text-[11px]">{meeting.preparations || '-'}</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-24 bg-slate-50 p-2 font-bold text-slate-700 text-center border-r border-slate-900 shrink-0 text-[11px]">회의내용</td>
                  <td className="p-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        {(meeting.content || []).map((item, idx) => (
                          <div key={idx} className="space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between">
                               <Input 
                                 placeholder="소제목" 
                                 value={item.title} 
                                 onChange={(e) => handleContentChange(idx, 'title', e.target.value)}
                                 className="h-8 font-bold border-none bg-transparent text-[11px]"
                               />
                               <Button variant="ghost" size="icon" className="size-7" onClick={() => removeContent(idx)}>
                                 <Trash2 className="size-3 text-slate-400" />
                               </Button>
                            </div>
                            <Textarea 
                              placeholder="상세 내용을 입력하세요" 
                              value={item.detail} 
                              onChange={(e) => handleContentChange(idx, 'detail', e.target.value)}
                              className="border-none bg-transparent min-h-[80px] text-[11px]"
                            />
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addContent} className="w-full h-8 border-dashed text-[10px] font-bold">
                          <Plus className="size-3 mr-1.5" /> 내용 추가
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(meeting.content || []).map((item, idx) => (
                          <div key={idx} className="space-y-1 break-inside-avoid py-2">
                            <p className="font-bold text-slate-900 text-[12px]">■ {item.title}</p>
                            <p className="text-slate-700 font-medium leading-relaxed pl-4 whitespace-pre-wrap text-[11px]">{item.detail}</p>
                          </div>
                        ))}
                        {(!meeting.content || meeting.content.length === 0) && '-'}
                      </div>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-24 bg-slate-50 p-2 font-bold text-slate-700 text-center border-r border-slate-900 shrink-0 text-[11px]">기타사항</td>
                  <td className="p-2">
                     {isEditing ? (
                       <Textarea 
                         value={meeting.others || ''} 
                         onChange={(e) => handleChange('others', e.target.value.slice(0, 300))}
                         placeholder="기타 내용 (최대 300자)"
                         className="w-full min-h-[60px] rounded-lg font-medium text-[11px]"
                         maxLength={300}
                       />
                     ) : (
                       <span className="text-slate-700 font-bold text-[11px]">{meeting.others || '-'}</span>
                     )}
                  </td>
                </tr>
                <tr>
                  <td className="w-24 bg-slate-50 p-2 font-bold text-slate-700 text-center border-r border-slate-900 shrink-0 text-[11px]">차기일정</td>
                  <td className="p-2">
                     {isEditing ? (
                       <Textarea 
                         value={meeting.nextSchedule || ''} 
                         onChange={(e) => handleChange('nextSchedule', e.target.value.slice(0, 300))}
                         placeholder="차기 회의 일시 (최대 300자)"
                         className="w-full min-h-[60px] rounded-lg font-medium text-[11px]"
                         maxLength={300}
                       />
                     ) : (
                       <span className="text-slate-700 font-bold text-[11px]">{meeting.nextSchedule || '-'}</span>
                     )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* 저장/취소 버튼 (isEditing 모드 전용) */}
      {isEditing && (
        <div className="mt-8 flex gap-4 print:hidden pb-10">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 font-bold text-[11px] hover:bg-slate-50"
          >
            취소하기
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={isSaving}
            className="flex-[2] h-10 rounded-lg bg-indigo-600 text-white font-bold text-[11px] shadow-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? "처리 중..." : "회의록 저장"}
          </Button>
        </div>
      )}

      {/* 푸터 (브라우저에서만 보임) */}
      <div className="mt-20 pt-8 border-t border-slate-100 text-center print:hidden">
         <p className="text-slate-400 text-xs font-black tracking-[0.2em] uppercase">SLI Integrated Management System - Meeting Report Module</p>
      </div>

      {/* 인쇄 전용 푸터 (출력 시에만 보임) */}
      <div className="hidden print:block absolute bottom-8 left-0 right-0 text-center">
         <p className="text-[#94a3b8] text-[10px] font-bold">SLI EXPERT ANALYTICS - FINAL INTEGRATED CONSULTING REPORT</p>
      </div>

      {/* 인쇄 매체 쿼리용 스타일 */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .sidebar-container, header, .print-hidden, button {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
        }
      `}</style>
    </div>
  );
}
