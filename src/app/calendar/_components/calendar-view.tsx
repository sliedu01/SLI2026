'use client';

import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  extendedProps: {
    type: 'project' | 'meeting' | 'budget';
    location?: string;
    amount?: number;
    partner?: string;
    category?: string;
    subDetail?: string;
    vendor?: string;
    description?: string;
  };
}

interface CalendarViewProps {
  events: CalendarEvent[];
}

export default function CalendarView({ events }: CalendarViewProps) {
  const calendarRef = React.useRef<FullCalendar>(null);
  const [viewTitle, setViewTitle] = React.useState('');
  const [currentView, setCurrentView] = React.useState('dayGridMonth');

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
    updateTitle();
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
    updateTitle();
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
    updateTitle();
  };

  const changeView = (view: string) => {
    calendarRef.current?.getApi().changeView(view);
    setCurrentView(view);
    updateTitle();
  };

  const updateTitle = () => {
    if (calendarRef.current) {
      setViewTitle(calendarRef.current.getApi().view.title);
    }
  };

  React.useEffect(() => {
    updateTitle();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
      {/* Custom Header */}
      <div className="flex items-center justify-between p-6 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-slate-900 min-w-[200px]">{viewTitle}</h2>
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 px-3 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900">
              오늘
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          {[
            { id: 'dayGridMonth', label: '월간' },
            { id: 'timeGridWeek', label: '주간' },
            { id: 'timeGridDay', label: '일간' },
          ].map((v) => (
            <Button
              key={v.id}
              variant={currentView === v.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => changeView(v.id)}
              className={cn(
                "h-8 px-4 rounded-lg text-xs font-bold transition-all",
                currentView === v.id 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={events}
          height="100%"
          locale="ko"
          dayMaxEvents={3}
          eventContent={renderEventContent}
          eventClassNames={(arg) => {
            const type = arg.event.extendedProps.type;
            return [
              'premium-event',
              `event-type-${type}`
            ];
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
          padding: 12px 0;
          background: #f8fafc;
        }
        .fc .fc-col-header-cell-cushion {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-decoration: none !important;
        }
        .fc .fc-daygrid-day-number {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          padding: 8px 12px;
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
        
        .premium-event {
          border: none !important;
          background: transparent !important;
          padding: 0 !important;
          margin: 1px 0 !important;
        }
        
        .event-type-project .event-inner {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        .event-type-meeting .event-inner {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }
        .event-type-budget .event-inner {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
        }
        
        .event-inner {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
}

function renderEventContent(eventInfo: any) {
  const type = eventInfo.event.extendedProps.type;
  
  return (
    <div className="event-inner w-full">
      {type === 'project' && <CalendarIcon className="size-3 shrink-0" />}
      {type === 'meeting' && <Clock className="size-3 shrink-0" />}
      {type === 'budget' && <DollarSign className="size-3 shrink-0" />}
      <span className="truncate">{eventInfo.event.title}</span>
    </div>
  );
}
