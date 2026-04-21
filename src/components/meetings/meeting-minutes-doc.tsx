'use client';

import * as React from 'react';
import { Calendar, Clock, MapPin, Users, Plus, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Meeting, MeetingAttendee, MeetingContent } from "@/store/use-meeting-store";
import { Project } from "@/store/use-project-store";
import { cn } from "@/lib/utils";

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
  
  const handleChange = (field: keyof Meeting, value: any) => {
    if (onUpdate) onUpdate({ ...meeting, [field]: value });
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

  const currentYear = meeting.date ? new Date(meeting.date).getFullYear() : new Date().getFullYear();

  return (
    <div className={cn(
      "bg-white relative print:shadow-none print:border-none print:p-0",
      isEditing 
        ? "p-6 md:p-10 lg:p-16" 
        : "p-8 md:p-16 lg:p-24 shadow-2xl rounded-[1rem] border border-slate-200"
    )}>
      
      {/* 관리 도구 (브라우저에서만 보임) */}
      {!isEditing && onPrint && (
        <div className="absolute top-8 right-8 print:hidden">
          <Button onClick={onPrint} variant="outline" className="rounded-xl gap-2 font-black border-slate-200 hover:bg-slate-50">
            <Printer className="size-4" /> 회의록 출력
          </Button>
        </div>
      )}

      {/* 헤더 */}
      <div className="text-center mb-16 px-10">
        {isEditing ? (
          <div className="space-y-6 bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-center space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">연동 사업 선택 (LV1)</p>
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
                className="w-full max-w-2xl h-14 bg-white rounded-xl border-2 border-slate-200 font-bold px-4 focus:border-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="">사업을 선택해 주세요 (필터링된 LV1 리스트)</option>
                {lv1Projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">회의 제목</p>
              <Input 
                value={meeting.title || ''} 
                onChange={(e) => handleChange('title', e.target.value)}
                className="text-2xl font-black text-center h-16 rounded-xl border-none bg-white shadow-inner focus:ring-2 focus:ring-indigo-100 transition-all font-serif"
                placeholder="사업명 또는 회의 주제를 입력하세요"
              />
            </div>
          </div>
        ) : (
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 border-b-4 border-slate-900 pb-4 inline-block tracking-tighter leading-tight">
            {meeting.title || '제목 없음'} 회의록
          </h1>
        )}
      </div>

      <div className="space-y-12">
        {/* 1. 기본정보 */}
        <section>
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            1. 기본정보
          </h2>
          <div className="border border-slate-900">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="w-24 md:w-48 bg-slate-50 p-6 font-black text-slate-700 text-center border-r border-slate-900 shrink-0">일시</td>
                  <td className="p-6">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-4 items-center">
                        <Input 
                          type="date" 
                          value={meeting.date || ''} 
                          onChange={(e) => handleChange('date', e.target.value)}
                          className="w-full md:w-56 h-14 rounded-xl font-bold text-lg"
                        />
                        <div className="flex items-center gap-2">
                          <Input 
                            type="time" 
                            value={meeting.startTime || ''} 
                            onChange={(e) => handleChange('startTime', e.target.value)}
                            className="w-32 h-12 rounded-xl font-bold"
                          />
                          <span className="font-bold text-slate-400">~</span>
                          <Input 
                            type="time" 
                            value={meeting.endTime || ''} 
                            onChange={(e) => handleChange('endTime', e.target.value)}
                            className="w-32 h-12 rounded-xl font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <Calendar className="size-4 text-slate-400" />
                        {meeting.date || '-'}
                        <Clock className="size-4 text-slate-400 ml-4" />
                        {meeting.startTime || '00:00'} ~ {meeting.endTime || '00:00'}
                      </div>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-24 md:w-48 bg-slate-50 p-6 font-black text-slate-700 text-center border-r border-slate-900 shrink-0">장소</td>
                  <td className="p-6">
                    {isEditing ? (
                      <Input 
                        value={meeting.location || ''} 
                        onChange={(e) => handleChange('location', e.target.value)}
                        placeholder="회의 장소를 입력하세요 (100자 이내)"
                        className="w-full h-14 rounded-xl font-bold text-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <MapPin className="size-4 text-slate-400" />
                        {meeting.location || '-'}
                      </div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="w-24 md:w-48 bg-slate-50 p-6 font-black text-slate-700 text-center border-r border-slate-900 shrink-0">참석자</td>
                  <td className="p-6">
                    {isEditing ? (
                      <div className="space-y-3">
                        {(meeting.attendees || []).map((att, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input 
                              placeholder="참여기관" 
                              value={att.org} 
                              onChange={(e) => handleAttendeeChange(idx, 'org', e.target.value)}
                              className="flex-1"
                            />
                            <Input 
                              placeholder="참여자명" 
                              value={att.name} 
                              onChange={(e) => handleAttendeeChange(idx, 'name', e.target.value)}
                              className="flex-1"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeAttendee(idx)}>
                              <Trash2 className="size-4 text-slate-400" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addAttendee} className="w-full border-dashed">
                          <Plus className="size-4 mr-2" /> 참석자 추가
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 font-bold flex-wrap">
                        <Users className="size-4 text-slate-400 mr-1" />
                        {(meeting.attendees || []).map((att, i) => (
                          <span key={i} className="bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
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
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
            2. 회의
          </h2>
          <div className="border border-slate-900">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="w-32 bg-slate-50 p-4 font-black text-slate-700 text-center border-r border-slate-900">목적</td>
                  <td className="p-4">
                    {isEditing ? (
                      <Input 
                        value={meeting.purpose || ''} 
                        onChange={(e) => handleChange('purpose', e.target.value)}
                        placeholder="회의 목적을 입력하세요 (200자 이내)"
                        className="w-full h-12 rounded-xl font-bold"
                      />
                    ) : (
                      <span className="text-slate-700 font-bold">{meeting.purpose || '-'}</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="bg-slate-50 p-4 font-black text-slate-700 text-center border-r border-slate-900">주요안건</td>
                  <td className="p-4">
                    {isEditing ? (
                      <Textarea 
                        value={meeting.agenda || ''} 
                        onChange={(e) => handleChange('agenda', e.target.value)}
                        placeholder="주요 안건을 입력하세요 (300자 이내)"
                        className="w-full min-h-[80px] rounded-xl font-medium"
                      />
                    ) : (
                      <p className="text-slate-700 font-bold whitespace-pre-wrap">{meeting.agenda || '-'}</p>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-24 md:w-40 bg-slate-50 p-4 font-black text-slate-700 text-center border-r border-slate-900 shrink-0">준비사항</td>
                  <td className="p-4">
                    {isEditing ? (
                      <Input 
                        value={meeting.preparations || ''} 
                        onChange={(e) => handleChange('preparations', e.target.value)}
                        placeholder="회의 전 준비사항을 입력하세요"
                        className="w-full h-12 rounded-xl font-bold"
                      />
                    ) : (
                      <span className="text-slate-700 font-bold">{meeting.preparations || '-'}</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-24 md:w-40 bg-slate-50 p-4 font-black text-slate-700 text-center border-r border-slate-900 shrink-0">회의내용</td>
                  <td className="p-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        {(meeting.content || []).map((item, idx) => (
                          <div key={idx} className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between">
                               <Input 
                                 placeholder="소제목 (예: 1. 인력 운용안 확정)" 
                                 value={item.title} 
                                 onChange={(e) => handleContentChange(idx, 'title', e.target.value)}
                                 className="font-bold border-none bg-transparent"
                               />
                               <Button variant="ghost" size="icon" onClick={() => removeContent(idx)}>
                                 <Trash2 className="size-4 text-slate-400" />
                               </Button>
                            </div>
                            <Textarea 
                              placeholder="상세 내용을 입력하세요" 
                              value={item.detail} 
                              onChange={(e) => handleContentChange(idx, 'detail', e.target.value)}
                              className="border-none bg-transparent min-h-[100px]"
                            />
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addContent} className="w-full border-dashed">
                          <Plus className="size-4 mr-2" /> 내용 추가
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {(meeting.content || []).map((item, idx) => (
                          <div key={idx} className="space-y-2">
                            <p className="font-black text-slate-900 text-lg">■ {item.title}</p>
                            <p className="text-slate-700 font-medium leading-relaxed pl-6 whitespace-pre-wrap">{item.detail}</p>
                          </div>
                        ))}
                        {(!meeting.content || meeting.content.length === 0) && '-'}
                      </div>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="w-24 md:w-40 bg-slate-50 p-4 font-black text-slate-700 text-center border-r border-slate-900 shrink-0">기타사항</td>
                  <td className="p-4">
                     {isEditing ? (
                       <Input 
                         value={meeting.others || ''} 
                         onChange={(e) => handleChange('others', e.target.value)}
                         placeholder="전달사항 등 기타 내용을 입력하세요"
                       />
                     ) : (
                       <span className="text-slate-700 font-bold">{meeting.others || '-'}</span>
                     )}
                  </td>
                </tr>
                <tr>
                  <td className="w-24 md:w-40 bg-slate-50 p-4 font-black text-slate-700 text-center border-r border-slate-900 shrink-0">차기일정</td>
                  <td className="p-4">
                     {isEditing ? (
                       <Input 
                         value={meeting.nextSchedule || ''} 
                         onChange={(e) => handleChange('nextSchedule', e.target.value)}
                         placeholder="차기 회의 일시를 입력하세요 (예: 2026.05.01 14:00)"
                       />
                     ) : (
                       <span className="text-slate-700 font-bold">{meeting.nextSchedule || '-'}</span>
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
        <div className="mt-12 flex gap-6 print:hidden px-20 pb-32">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1 h-20 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-2xl hover:bg-slate-50 shadow-lg"
          >
            취소하기
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={isSaving}
            className="flex-[3] h-20 rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "처리 중..." : "회의록 저장 및 최종 확정"}
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
