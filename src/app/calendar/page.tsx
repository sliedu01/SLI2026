'use client';

import * as React from 'react';
import { 
  CalendarDays, 
  Loader2, 
  ChevronRight, 
  ChevronDown, 
  LayoutGrid, 
  Plus, 
  Clock,
  Bell,
  Activity,
  Settings2,
  RefreshCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useProjectStore } from '@/store/use-project-store';
import { useMeetingStore } from '@/store/use-meeting-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { usePartnerStore } from '@/store/use-partner-store';
import CalendarView, { CalendarEvent } from './_components/calendar-view';

export default function CalendarPage() {
  const [hasMounted, setMounted] = React.useState(false);
  const { 
    projects, 
    fetchProjects, 
    selectedLv1Ids, 
    setSelectedLv1Ids,
    isLoading: isProjectLoading 
  } = useProjectStore();
  const { meetings, fetchMeetings, getSortedMeetings, isLoading: isMeetingLoading } = useMeetingStore();
  const { expenditures, managements, categories, fetchBudgets, isLoading: isBudgetLoading } = useBudgetStore();
  const { partners, fetchPartners } = usePartnerStore();

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');
  const [selectedLv2Ids, setSelectedLv2Ids] = React.useState<string[]>([]);
  const [showProjects, setShowProjects] = React.useState(true);
  const [showMeetings, setShowMeetings] = React.useState(true);
  const [showBudget, setShowBudget] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);
    fetchProjects();
    fetchMeetings();
    fetchBudgets();
    fetchPartners();
  }, [fetchProjects, fetchMeetings, fetchBudgets, fetchPartners]);

  const isLoading = isProjectLoading || isMeetingLoading || isBudgetLoading;
  const lv1Projects = projects.filter(p => p.level === 1);

  // 글로벌 사업 선택 상태 동기화
  React.useEffect(() => {
    if (selectedLv1Ids.length > 0) {
      setSelectedProjectId(selectedLv1Ids[0]);
    } else {
      setSelectedProjectId('all');
    }
  }, [selectedLv1Ids]);

  // 로컬 선택 변경 시 글로벌 상태도 업데이트
  const handleProjectChange = (id: string | null) => {
    if (!id) return;
    setSelectedProjectId(id);
    if (id === 'all') {
      setSelectedLv1Ids([]);
    } else {
      setSelectedLv1Ids([id]);
    }
  };
  const lv2Projects = React.useMemo(() => {
    if (selectedProjectId === 'all') return [];
    return projects.filter(p => p.parentId === selectedProjectId && p.level === 2);
  }, [selectedProjectId, projects]);

  React.useEffect(() => {
    if (lv2Projects.length > 0) {
      setSelectedLv2Ids(lv2Projects.map(p => p.id));
    } else {
      setSelectedLv2Ids([]);
    }
  }, [lv2Projects]);

  const events = React.useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // 1. 사업 일정 (LV3, LV4)
    if (showProjects) {
      projects.filter(p => p.level >= 3).forEach(p => {
        const parentLv2 = projects.find(parent => parent.id === p.parentId);
        if (parentLv2 && (selectedLv2Ids.length === 0 || selectedLv2Ids.includes(parentLv2.id))) {
          const partner = partners.find(ptr => ptr.id === p.partnerId);
          allEvents.push({
            id: `project-${p.id}`,
            title: `[${partner?.name || '협력사'}] ${p.name}`,
            start: p.startDate,
            end: p.endDate,
            allDay: true,
            extendedProps: {
              type: 'project',
              partner: partner?.name,
              partnerFull: partner?.name ? `[${partner.name}]` : '',
              programName: p.name,
              capacity: p.quota,
              attendance: p.participantCount,
              editId: p.id,
              isPeriod: true,
              color: { bg: '#ecfdf5', text: '#064e3b', border: '#10b981' }
            }
          });
        }
      });
    }

    if (showMeetings) {
      getSortedMeetings().forEach(m => {
        allEvents.push({
          id: `meeting-${m.id}`,
          title: `[회의] ${m.sessionNumber}회차: ${m.title}`,
          start: m.date,
          end: m.date,
          extendedProps: {
            type: 'meeting',
            location: m.location,
            sessionNum: m.sessionNumber,
            meetingTitle: m.title,
            summary: m.summary,
            editId: m.id,
            color: { bg: '#fffbeb', text: '#78350f', border: '#f59e0b' }
          }
        });
      });
    }

    // 3. 지출 내역
    if (showBudget) {
      expenditures.forEach(e => {
        const mgmt = managements.find(m => m.id === e.managementId);
        const cat = categories.find(c => c.id === mgmt?.categoryId);
        
        allEvents.push({
          id: `budget-${e.id}`,
          title: `[지출] ${e.vendor}: ${e.amount.toLocaleString()}원`,
          start: e.date,
          end: e.date,
          extendedProps: {
            type: 'budget',
            category: cat?.name || '미분류',
            managementName: mgmt?.name || '미분류',
            subDetail: e.subDetail,
            vendor: e.vendor,
            amount: e.amount,
            editId: e.id,
            color: { bg: '#eef2ff', text: '#1e1b4b', border: '#6366f1' }
          }
        });
      });
    }

    return allEvents;
  }, [projects, meetings, expenditures, partners, showProjects, showMeetings, showBudget, selectedLv2Ids]);

  const toggleAllLv2 = () => {
    if (selectedLv2Ids.length === lv2Projects.length) {
      setSelectedLv2Ids([]);
    } else {
      setSelectedLv2Ids(lv2Projects.map(p => p.id));
    }
  };

  const toggleLv2 = (id: string) => {
    setSelectedLv2Ids(prev => 
      prev.includes(id) 
        ? prev.filter(sid => sid !== id) 
        : [...prev, id]
    );
  };

  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-12">
      {/* 프리미엄 헤더 섹션 */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <CalendarDays className="size-6 text-indigo-600" />
              캘린더 일정 관리
            </h1>
            <p className="text-[11px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider flex items-center gap-2">
              <Activity className="size-3" /> Project Schedule & Integrated Monitoring
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-slate-500 gap-2">
              <Settings2 className="size-3.5" /> 설정
            </Button>
            <div className="w-px h-4 bg-slate-200" />
            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-indigo-600 gap-2">
              <RefreshCcw className="size-3.5" /> 동기화
            </Button>
          </div>
        </div>

        {/* 통합 필터 컨트롤러 */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* 사업 선택 (4 columns) */}
            <div className="lg:col-span-4 p-4 bg-slate-50/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-6 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-100">
                  <LayoutGrid className="size-3.5 text-white" />
                </div>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">주요 사업 필터</span>
              </div>
              <Select 
                value={selectedProjectId || 'all'} 
              onValueChange={handleProjectChange}
              >
                <SelectTrigger className="h-9 rounded-xl font-bold text-[10px] bg-white border-slate-200 shadow-sm">
                  <span className="truncate">
                    {selectedProjectId === 'all' ? '전체 사업 일정 보기' : projects.find(p => p.id === selectedProjectId)?.name}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                  <SelectItem value="all" className="text-[10px] font-bold">전체 사업 일정 보기</SelectItem>
                  {lv1Projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 유형 선택 (8 columns) */}
            <div className="lg:col-span-8 flex flex-col divide-y divide-slate-100">
              {/* 세부 사업 필터 */}
              <div className="flex items-center min-h-[44px] bg-white">
                <div className="w-[120px] px-4 py-2 bg-slate-50/50 flex items-center shrink-0">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowProjects(!showProjects)}
                    className={cn(
                      "h-6 w-full px-0 text-[10px] font-black justify-start gap-2 hover:bg-transparent uppercase tracking-tight",
                      showProjects ? "text-emerald-600" : "text-slate-400"
                    )}
                  >
                    <div className={cn("size-2 rounded-full", showProjects ? "bg-emerald-500" : "bg-slate-300")} />
                    운영 일정
                  </Button>
                </div>
                <div className="flex-1 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={toggleAllLv2}
                    className={cn(
                      "h-7 px-3 rounded-lg font-bold text-[10px] transition-all border-none shadow-none shrink-0",
                      selectedLv2Ids.length === lv2Projects.length && lv2Projects.length > 0
                        ? "bg-emerald-500 text-white" 
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    )}
                  >
                    전체
                  </Button>
                  {lv2Projects.map((p) => (
                    <Button 
                      key={p.id}
                      variant="outline"
                      size="sm"
                      onClick={() => toggleLv2(p.id)}
                      className={cn(
                        "h-7 px-3 rounded-lg font-bold text-[10px] transition-all border-none shadow-none shrink-0",
                        selectedLv2Ids.includes(p.id) 
                          ? "bg-slate-50 text-emerald-600 ring-1 ring-emerald-500/30" 
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      {p.name}
                    </Button>
                  ))}
                  {lv2Projects.length === 0 && (
                    <span className="text-[10px] text-slate-300 font-bold italic">사업을 먼저 선택해 주세요.</span>
                  )}
                </div>
              </div>

              {/* 기타 유형 필터 */}
              <div className="flex items-center min-h-[44px] divide-x divide-slate-100 bg-white">
                <div className="flex items-center h-full flex-1">
                  <div className="w-[120px] px-4 py-2 bg-slate-50/50 h-full flex items-center shrink-0">
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowMeetings(!showMeetings)}
                      className={cn(
                        "h-6 w-full px-0 text-[10px] font-black justify-start gap-2 hover:bg-transparent uppercase tracking-tight",
                        showMeetings ? "text-amber-600" : "text-slate-400"
                      )}
                    >
                      <div className={cn("size-2 rounded-full", showMeetings ? "bg-amber-500" : "bg-slate-300")} />
                      회의 일정
                    </Button>
                  </div>
                  <div className="px-4 py-2 flex items-center">
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Meetings & Consultations</span>
                  </div>
                </div>
                <div className="flex items-center h-full flex-1">
                  <div className="w-[120px] px-4 py-2 bg-slate-50/50 h-full flex items-center shrink-0">
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowBudget(!showBudget)}
                      className={cn(
                        "h-6 w-full px-0 text-[10px] font-black justify-start gap-2 hover:bg-transparent uppercase tracking-tight",
                        showBudget ? "text-indigo-600" : "text-slate-400"
                      )}
                    >
                      <div className={cn("size-2 rounded-full", showBudget ? "bg-indigo-500" : "bg-slate-300")} />
                      지출 내역
                    </Button>
                  </div>
                  <div className="px-4 py-2 flex items-center">
                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Budget Expenditures</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 캘린더 메인 컨텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="size-8 text-indigo-200 animate-spin" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading Schedule...</p>
              </div>
            </div>
          ) : (
            <CalendarView events={events} />
          )}
        </div>

        {/* 사이드바 - 예정된 일정 */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white p-5">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-5">
               <Bell className="size-3.5 text-amber-500" /> Upcoming Schedule
            </h3>
            <div className="space-y-5">
              {(() => {
                const now = new Date();
                const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                
                const upcoming = events.filter(e => {
                  const eventDate = new Date(e.start);
                  return eventDate >= now && eventDate <= twoWeeksLater;
                }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                if (upcoming.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <Activity className="size-8 text-slate-200 mb-2" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">No upcoming events</p>
                    </div>
                  );
                }

                const grouped = upcoming.reduce((acc, event) => {
                  const type = event.extendedProps?.type || 'other';
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(event);
                  return acc;
                }, {} as Record<string, typeof upcoming>);

                const typeConfig: Record<string, { label: string, color: string, bg: string, icon: any }> = {
                  project: { label: '사업 일정', color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100', icon: CalendarDays },
                  meeting: { label: '회의 일정', color: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-100', icon: Clock },
                  budget: { label: '지출 내역', color: 'text-indigo-600', bg: 'bg-indigo-50/50 border-indigo-100', icon: LayoutGrid }
                };

                return Object.entries(grouped).map(([type, items]) => (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                      <h4 className={cn("text-[9px] font-black uppercase tracking-wider", typeConfig[type]?.color)}>
                        {typeConfig[type]?.label || type}
                      </h4>
                      <span className="text-[8px] font-bold text-slate-300">{items.length} EVENTS</span>
                    </div>
                    <div className="space-y-3">
                      {items.map(e => (
                        <div key={e.id} className={cn("group p-3 rounded-xl border transition-all hover:shadow-md hover:scale-[1.02]", typeConfig[type]?.bg || "bg-slate-50/50 border-slate-100")}>
                          <div className="flex items-center justify-between mb-2">
                            <p className={cn("text-[8px] font-black uppercase tracking-widest", typeConfig[type]?.color)}>
                              {format(new Date(e.start), 'MM.dd (E)')}
                            </p>
                            {React.createElement(typeConfig[type]?.icon || Activity, { className: cn("size-3", typeConfig[type]?.color) })}
                          </div>
                          <p className="text-[11px] font-black text-slate-800 whitespace-pre-wrap break-words leading-snug">
                            {e.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>

          {/* 프리미엄 안내 카드 */}
          <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">System Intelligence</h4>
            <p className="text-[11px] font-bold leading-relaxed mb-4">
              모든 일정은 실시간으로 동기화되며, 사업/회의/지출 데이터를 통합 모니터링합니다.
            </p>
            <Button className="w-full h-8 bg-white/20 hover:bg-white/30 text-[10px] font-black border-none text-white">
              자세히 보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
