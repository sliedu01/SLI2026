'use client';

import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';

import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    type: 'project' | 'meeting' | 'budget';
    color?: { bg: string; text: string; border: string };
    isPeriod?: boolean;
    partner?: string;
    partnerFull?: string;
    projectFull?: string;
    programName?: string;
    location?: string;
    capacity?: number;
    attendance?: number;
    sessionNum?: number;
    meetingTitle?: string;
    category?: string;
    managementName?: string;
    subDetail?: string;
    vendor?: string;
    amount?: number;
    summary?: string;
    purpose?: string;
    agenda?: string;
    content?: { title: string; detail: string }[];
    nextSchedule?: string;
    editId?: string;
  };
}

import { HOLIDAYS_2026 as HOLIDAYS } from './holidays';

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (id: string, type: string) => void;
}

export default function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const calendarRef = React.useRef<FullCalendar>(null);

  const handleEventClick = (info: EventClickArg) => {
    const props = info.event.extendedProps as CalendarEvent['extendedProps'];
    const { editId, type } = props;
    if (editId && onEventClick) {
      onEventClick(editId, type);
    }
  };

  const [isCopied, setIsCopied] = React.useState(false);

  const extractCalendarText = async () => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const view = calendarApi.view;
    const start = view.activeStart;
    const end = view.activeEnd;

    const currentEvents = calendarApi.getEvents();
    const visibleEvents = currentEvents.filter((event) => {
      const eventStart = event.start;
      if (!eventStart) return false;
      return eventStart >= start && eventStart < end;
    });

    let text = `[캘린더 일정 추출 - ${view.title}]\n\n`;
    const sortedEvents = [...visibleEvents].sort((a, b) => 
      (a.start?.getTime() || 0) - (b.start?.getTime() || 0)
    );

    let currentDate = "";
    sortedEvents.forEach((event) => {
      const start = event.start;
      if (!start) return;
      const eventDate = format(start, 'yyyy-MM-dd');
      const props = event.extendedProps;

      if (currentDate !== eventDate) {
        currentDate = eventDate;
        text += `\n# ${currentDate}\n`;
      }

      const timeStr = event.allDay ? "종일" : format(start, 'HH:mm');

      if (props.type === 'meeting') {
        text += `- [회의] ${timeStr} | ${props.sessionNum}회차 | ${props.location || '장소미정'}\n`;
        if (props.purpose) text += `    * 목적: ${props.purpose}\n`;
        if (props.agenda) text += `    * 안건: ${props.agenda}\n`;
        if (props.content && props.content.length > 0) {
          text += `    * 회의내용:\n`;
          props.content.forEach((item: { title?: string; detail?: string }) => {
            if (item.title || item.detail) {
              text += `      - ${item.title}: ${item.detail}\n`;
            }
          });
        }
        if (props.nextSchedule) text += `    * 차기일정: ${props.nextSchedule}\n`;
      } else if (props.type === 'project') {
        text += `- [사업] ${timeStr} | ${props.partner || '협력사미상'} | ${props.programName} | 정원: ${props.capacity || 0}명 | 참여: ${props.attendance || 0}명\n`;
      } else if (props.type === 'budget') {
        text += `- [지출] ${timeStr} | ${props.category} | ${props.managementName} | ${props.subDetail} | 지출처: ${props.vendor} | 금액: ${(props.amount || 0).toLocaleString()}원\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calendar_export_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden flex flex-col h-full relative">
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={extractCalendarText}
          className={cn(
            "bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-slate-50 font-bold gap-2 shadow-sm transition-all",
            isCopied ? "text-emerald-600 border-emerald-200" : "text-slate-600"
          )}
        >
          {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {isCopied ? "복사 완료" : "일정 텍스트 추출"}
        </Button>
      </div>
      <div className="flex-1 p-1">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today dayGridMonth,timeGridWeek,timeGridDay',
            center: 'title',
            right: ''
          }}
          buttonText={{
            today: '오늘',
            month: '월',
            week: '주',
            day: '일'
          }}
          events={events}
          locale="ko"
          dayMaxEvents={false}
          dayCellContent={(arg) => {
            const dateStr = format(arg.date, 'yyyy-MM-dd');
            const holidayName = HOLIDAYS[dateStr];
            const isSunday = arg.date.getDay() === 0;
            const isSaturday = arg.date.getDay() === 6;
            const isHoliday = !!holidayName;

            return (
              <div className={cn(
                "flex flex-col items-center justify-center min-h-[22px] w-full",
                isSunday || isHoliday ? "text-rose-500" : isSaturday ? "text-indigo-400" : "text-slate-500"
              )}>
                {isHoliday && <span className="text-[7px] font-black leading-none mb-0.5 tracking-tighter opacity-80">{holidayName}</span>}
                <span className={cn(
                  "text-[9px] font-bold tracking-tight",
                  arg.isToday ? "text-indigo-600" : ""
                )}>{arg.dayNumberText.replace('일', '')}</span>
              </div>
            );
          }}
          eventContent={(arg) => (
            <EventWithTooltip 
              title={arg.event.title}
              allDay={arg.event.allDay}
              start={arg.event.start}
              extendedProps={arg.event.extendedProps as unknown as CalendarEvent['extendedProps']}
            />
          )}
          eventClick={handleEventClick}
          eventClassNames={(arg) => {
            const type = arg.event.extendedProps.type;
            const isPeriod = arg.event.extendedProps.isPeriod;
            return [
              'premium-event',
              `event-type-${type}`,
              isPeriod ? 'event-period' : 'event-point'
            ];
          }}
          eventDidMount={(info) => {
            const props = info.event.extendedProps;
            if (props.color) {
              // 전달받은 파스텔톤 컬러 적용
              info.el.style.setProperty('background-color', props.color.bg, 'important');
              info.el.style.setProperty('border-left', `4px solid ${props.color.border}`, 'important');
              info.el.style.setProperty('color', props.color.text, 'important');
              
              if (props.isPeriod) {
                // 운영 일정(기간)의 경우 시각적 깊이 추가
                info.el.style.setProperty('box-shadow', '0 1px 2px rgba(0,0,0,0.05)', 'important');
              }
            }
          }}
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={true}
          expandRows={true}
          handleWindowResize={true}
        />
      </div>

      <style jsx global>{`
        .fc {
          --fc-border-color: #f1f5f9;
          --fc-today-bg-color: #f8fafc;
          --fc-page-bg-color: #ffffff;
          font-family: inherit;
        }
        .fc .fc-col-header-cell {
          padding: 8px 0;
          background: #f8fafc;
        }
        .fc .fc-col-header-cell-cushion {
          font-size: 8px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-decoration: none !important;
        }
        .fc .fc-daygrid-day-number {
          font-size: 8px;
          font-weight: 700;
          color: #cbd5e1;
          padding: 4px 8px;
          text-decoration: none !important;
        }
        .fc .fc-day-today {
          background-color: #f5f3ff !important;
        }
        .fc .fc-day-today .fc-daygrid-day-number {
          color: #4f46e5;
          font-weight: 900;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border: 1px solid #f1f5f9;
        }
        .fc .fc-scrollgrid {
          border: none;
        }
        
        .premium-event {
          padding: 0 !important;
          margin: 1px 0 !important;
          border-radius: 4px !important;
          pointer-events: auto !important;
          display: block !important;
          width: 100% !important;
          border: none !important;
          overflow: hidden !important;
          color: #000000 !important;
        }
        
        .event-inner {
          padding: 2px 4px;
          font-size: 10px !important;
          font-weight: 900 !important;
          color: #000000 !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 2px;
          line-height: 1.2;
          width: 100%;
          min-width: 0;
        }

        /* 기간 바(Bar) 특화 스타일: 연한 배경 + 녹색 테두리 */
        .event-period {
          z-index: 10 !important;
          min-height: 20px !important;
          margin: 1px 2px !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .event-period .event-inner {
          font-weight: 900;
          letter-spacing: -0.01em;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        /* FullCalendar 내부 레이아웃 보정 */
        .fc-event-main, .fc-event-main-frame {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
        }

        .fc-daygrid-event {
          border-radius: 4px !important;
        }
        
        /* 주말 색상 강제 적용 */
        .fc-day-sun .fc-col-header-cell-cushion { color: #ef4444 !important; }
        .fc-day-sat .fc-col-header-cell-cushion { color: #3b82f6 !important; }
        .fc-daygrid-day.fc-day-sun .fc-daygrid-day-number { color: #ef4444 !important; }
        .fc-daygrid-day.fc-day-sat .fc-daygrid-day-number { color: #3b82f6 !important; }
        
        /* 공휴일 명칭 스타일 */
        .holiday-label {
          font-size: 7px;
          font-weight: 900;
          color: #ef4444;
          margin-bottom: 1px;
        }
        /* 버튼 커스텀 스타일 */
        .fc .fc-button {
          font-size: 10px !important;
          font-weight: 800 !important;
          padding: 4px 8px !important;
          height: auto !important;
          background: #ffffff !important;
          color: #64748b !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
          transition: all 0.2s !important;
        }
        .fc .fc-button:hover {
          background: #f8fafc !important;
          color: #4f46e5 !important;
          border-color: #4f46e5 !important;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: #4f46e5 !important;
          color: #ffffff !important;
          border-color: #4f46e5 !important;
        }
        
        /* 이전/다음 버튼 간격 */
        .fc .fc-button-group {
          gap: 2px !important;
          margin-right: 8px !important;
        }
        .fc .fc-button-group .fc-button {
          border-radius: 8px !important;
        }

        /* 뷰 전환 버튼 (월, 주, 일) 소형화 */
        .fc .fc-dayGridMonth-button,
        .fc .fc-timeGridWeek-button,
        .fc .fc-timeGridDay-button {
          font-size: 9px !important;
          padding: 3px 6px !important;
          min-width: 28px !important;
        }
        
        /* 툴바 레이아웃 미세 조정 */
        .fc .fc-toolbar-chunk:first-child {
          display: flex !important;
          align-items: center !important;
        }
        .fc .fc-toolbar-title {
          font-size: 16px !important;
          font-weight: 900 !important;
          color: #0f172a !important;
          letter-spacing: -0.02em !important;
        }
      `}</style>
    </div>
  );
}

function EventWithTooltip({ 
  title, 
  allDay, 
  start, 
  extendedProps 
}: { 
  title: string, 
  allDay: boolean, 
  start: Date | null, 
  extendedProps: CalendarEvent['extendedProps'] 
}) {
  const type = extendedProps.type;
  const props = extendedProps;
  
  const timeStr = allDay ? "종일" : start ? format(start, 'HH:mm') : '';
  const dateStr = start ? format(start, 'yyyy-MM-dd') : '';
  const displayTime = `${dateStr} ${timeStr}`;

  const tooltipContent = (
    <div className="space-y-2 p-1 max-w-[280px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
          {type === 'project' ? '사업 상세' : type === 'meeting' ? '회의 상세' : '지출 상세'}
        </p>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
          type === 'project' ? "bg-emerald-50 text-emerald-600" : 
          type === 'meeting' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
        )}>
          {type}
        </div>
      </div>

      <div className="space-y-1.5">
        {type === 'project' && (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">일시</span>
              <p className="text-[10px] font-bold text-slate-800">{displayTime}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">협력업체</span>
              <p className="text-[10px] font-bold text-slate-800">{props.partnerFull}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">프로그램 / 일정명</span>
              <p className="text-[10px] font-bold text-slate-900 leading-tight">{props.programName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">정원</span>
                <p className="text-[10px] font-bold text-slate-800">{props.capacity || 0}명</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">참여</span>
                <p className="text-[10px] font-bold text-slate-800">{props.attendance || 0}명</p>
              </div>
            </div>
          </>
        )}
        
        {type === 'meeting' && (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">일시 / 장소</span>
              <p className="text-[10px] font-bold text-slate-800">{displayTime} | {props.location || '미지정'}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">회차 및 주제</span>
              <p className="text-[10px] font-bold text-slate-900 leading-tight">{props.sessionNum}회차 : {props.meetingTitle || '없음'}</p>
            </div>
            {props.summary && (
              <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-50 mt-1">
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">회의 요약</span>
                <p className="text-[10px] font-medium text-slate-800 leading-normal line-clamp-4 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                  &quot;{props.summary}&quot;
                </p>
              </div>
            )}
          </>
        )}

        {type === 'budget' && (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">집행 일시</span>
              <p className="text-[10px] font-bold text-slate-800">{dateStr}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">비목 / 관리세목</span>
              <p className="text-[10px] font-bold text-slate-800">{props.category} &gt; {props.managementName}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">세세목 및 지출처</span>
              <p className="text-[10px] font-bold text-slate-900 leading-tight">{props.subDetail} | {props.vendor}</p>
            </div>
            <div className="mt-1 pt-1 border-t border-indigo-50">
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">집행 금액</span>
              <p className="text-sm font-black text-slate-900">{(props.amount || 0).toLocaleString()}원</p>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full">
          <div className="event-inner w-full cursor-pointer">
            {type === 'project' && <CalendarIcon className="size-2.5 shrink-0" />}
            {type === 'meeting' && <Clock className="size-2.5 shrink-0" />}
            {type === 'budget' && <span className="text-[8px] font-bold shrink-0">₩</span>}
            <span className="truncate tracking-tighter">{title}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white/95 backdrop-blur shadow-2xl border-slate-200 rounded-xl p-3 min-w-[200px] z-[9999]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
