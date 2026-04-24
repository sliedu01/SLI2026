'use client';

import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg } from '@fullcalendar/core';

import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, FileDown } from 'lucide-react';
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

  const extractCalendarText = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    const view = calendarApi.view;
    const start = view.activeStart;
    const end = view.activeEnd;

    // 현재 뷰의 이벤트들 가져오기
    const currentEvents = calendarApi.getEvents();
    const visibleEvents = currentEvents.filter((event) => {
      const eventStart = event.start;
      if (!eventStart) return false;
      return eventStart >= start && eventStart < end;
    });

    let text = `[캘린더 일정 추출 - ${view.title}]\n\n`;

    // 날짜별로 정렬
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
        text += `- [회의] ${timeStr} | ${props.sessionNum}회차 | ${props.location || '장소미정'} | 주제: ${props.meetingTitle || '없음'}\n`;
      } else if (props.type === 'project') {
        text += `- [사업] ${timeStr} | ${props.partner || '협력사미상'} | ${props.programName} | 정원: ${props.capacity || 0}명 | 참여: ${props.attendance || 0}명\n`;
      } else if (props.type === 'budget') {
        text += `- [지출] ${timeStr} | ${props.category} | ${props.managementName} | ${props.subDetail} | 지출처: ${props.vendor} | 금액: ${(props.amount || 0).toLocaleString()}원\n`;
      }
    });

    // 텍스트 파일로 저장
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar_export_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden flex flex-col h-full relative">
      <div className="absolute top-4 right-20 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={extractCalendarText}
          className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-slate-50 text-slate-600 font-bold gap-2 shadow-sm"
        >
          <FileDown className="size-4" />
          일정 텍스트 추출
        </Button>
      </div>
      <div className="flex-1 p-1">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
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
                "flex flex-col items-center justify-center min-h-[24px] w-full",
                isSunday || isHoliday ? "text-red-500" : isSaturday ? "text-blue-500" : "text-slate-600"
              )}>
                {isHoliday && <span className="text-[7px] font-black leading-none mb-0.5">{holidayName}</span>}
                <span className="text-[11px] font-bold">{arg.dayNumberText.replace('일', '')}</span>
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
              if (props.isPeriod) {
                // 운영 일정 전용 스타일 (녹색 테마 강제: 연한 바탕 + 녹색 테두리)
                info.el.style.setProperty('background-color', '#f0fdf4', 'important'); 
                info.el.style.setProperty('border', '2px solid #22c55e', 'important');
                info.el.style.setProperty('color', '#166534', 'important');
                info.el.style.setProperty('border-radius', '4px', 'important');
              } else {
                // 일반 일정: 회색/슬레이트 테마 (getProjectColor에서 전달된 값 사용)
                info.el.style.setProperty('background-color', props.color.bg, 'important');
                info.el.style.setProperty('border', `1px solid ${props.color.border}`, 'important');
                info.el.style.setProperty('color', props.color.text, 'important');
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
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-decoration: none !important;
        }
        .fc .fc-daygrid-day-number {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          padding: 6px 10px;
          text-decoration: none !important;
        }
        .fc .fc-day-today .fc-daygrid-day-number {
          color: #0f172a;
          font-weight: 900;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border: 1px solid #f1f5f9;
        }
        .fc .fc-scrollgrid {
          border: none;
        }
        
        /* premium-event start */
        .premium-event {
          padding: 0 !important;
          margin: 2px 0 !important;
          border: none !important;
          background: transparent !important;
        }
        
        .event-inner {
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 6px;
          line-height: 1.4;
          width: 100%;
          min-width: 0;
          border-radius: 4px;
        }

        /* 기간 바(Bar) 특화 스타일: 연한 배경 + 녹색 테두리 */
        .event-period {
          z-index: 10 !important;
          min-height: 28px !important;
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
    <div className="space-y-1 p-1">
      <p className="text-[11px] font-black text-slate-900 border-b border-slate-100 pb-1 mb-1">
        {type === 'project' ? '사업 상세 정보' : type === 'meeting' ? '회의 상세 정보' : '지출 상세 정보'}
      </p>
      {type === 'project' && (
        <>
          <p className="text-[10px] font-bold"><span className="text-slate-400">일시:</span> {displayTime}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">협력업체명:</span> {props.partnerFull}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">프로그램명:</span> {props.programName}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">정원:</span> {props.capacity || 0}명</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">참가인원:</span> {props.attendance || 0}명</p>
        </>
      )}
      {type === 'meeting' && (
        <>
          <p className="text-[10px] font-bold"><span className="text-slate-400">일시:</span> {displayTime}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">회차:</span> {props.sessionNum}회차</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">장소:</span> {props.location || '미지정'}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">회의주제:</span> {props.meetingTitle || '없음'}</p>
        </>
      )}
      {type === 'budget' && (
        <>
          <p className="text-[10px] font-bold"><span className="text-slate-400">일시:</span> {displayTime}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">비목:</span> {props.category}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">관리세목:</span> {props.managementName}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">세세목:</span> {props.subDetail}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">지출처:</span> {props.vendor}</p>
          <p className="text-[10px] font-bold"><span className="text-slate-400">금액:</span> {(props.amount || 0).toLocaleString()}원</p>
        </>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full">
          <div className="event-inner w-full cursor-pointer">
            {type === 'project' && <CalendarIcon className="size-3 shrink-0" />}
            {type === 'meeting' && <Clock className="size-3 shrink-0" />}
            {type === 'budget' && <span className="text-[10px] font-bold shrink-0">₩</span>}
            <span className="truncate">{title}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white/95 backdrop-blur shadow-2xl border-slate-200 rounded-xl p-3 min-w-[200px] z-[9999]">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
