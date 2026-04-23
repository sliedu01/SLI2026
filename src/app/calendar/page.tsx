'use client';

import * as React from 'react';
import { CalendarDays, Bell, ListChecks, Plus, Loader2, CheckSquare, Square, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CalendarView, { CalendarEvent } from './_components/calendar-view';
import { useProjectStore, Project } from '@/store/use-project-store';
import { useMeetingStore } from '@/store/use-meeting-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { format, parseISO, addMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CalendarPage() {
  const { 
    projects, 
    selectedLv1Ids, 
    setSelectedLv1Ids, 
    fetchProjects, 
    isLoading: isProjectsLoading 
  } = useProjectStore();
  const { meetings, fetchMeetings, isLoading: isMeetingsLoading } = useMeetingStore();
  const { expenditures, fetchBudgets, managements, categories, isLoading: isBudgetLoading } = useBudgetStore();
  const { partners, fetchPartners } = usePartnerStore();

  React.useEffect(() => {
    fetchProjects();
    fetchMeetings();
    fetchBudgets();
    fetchPartners();
  }, [fetchProjects, fetchMeetings, fetchBudgets, fetchPartners]);

  // 0. 필터링 로직
  const lv1Projects = projects.filter(p => p.level === 1);
  const effectiveSelectedIds = selectedLv1Ids.length > 0 ? selectedLv1Ids : lv1Projects.map(p => p.id);

  const [selectedLv2Ids, setSelectedLv2Ids] = React.useState<string[]>([]);

  const lv2Projects = React.useMemo(() => 
    projects.filter(p => p.level === 2 && effectiveSelectedIds.includes(p.parentId!)),
    [projects, effectiveSelectedIds]
  );

  // LV1 필터가 바뀔 때 LV2 선택 초기화 (선택된 LV2가 현재 활성 LV1에 속하지 않는 경우 대비)
  React.useEffect(() => {
    setSelectedLv2Ids(prev => prev.filter(id => lv2Projects.some(p => p.id === id)));
  }, [lv2Projects]);

  const effectiveLv2Ids = selectedLv2Ids.length > 0 ? selectedLv2Ids : lv2Projects.map(p => p.id);

  const getDescendantIds = React.useCallback((parentIds: string[]): string[] => {
    if (parentIds.length === 0) return [];
    let result = [...parentIds];
    const children = projects.filter(p => p.parentId && parentIds.includes(p.parentId));
    if (children.length > 0) {
      result = [...result, ...getDescendantIds(children.map(c => c.id))];
    }
    return result;
  }, [projects]);

  const filteredProjectIds = React.useMemo(() => getDescendantIds(effectiveLv2Ids), [getDescendantIds, effectiveLv2Ids]);

  const getLv2Name = React.useCallback((parentId: string | null): string => {
    if (!parentId) return '';
    const parent = projects.find(p => p.id === parentId);
    if (!parent) return '';
    if (parent.level === 2) return parent.name;
    return getLv2Name(parent.parentId);
  }, [projects]);

  const events = React.useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // 1. 사업 관리 (필터링 적용)
    projects
      .filter(p => (p.level === 2 || p.level === 3) && filteredProjectIds.includes(p.id))
      .forEach(p => {
        const lv2Name = p.level === 2 ? p.name : getLv2Name(p.parentId);
        const partner = partners.find(ptr => ptr.id === p.partnerId);
        const partnerName = partner?.name || '미지정';

        if (p.level === 3 && p.sessions && p.sessions.length > 0) {
          p.sessions.forEach((s, idx) => {
            if (!s.startDate) return;
            allEvents.push({
              id: `session-${p.id}-${idx}`,
              title: `${lv2Name}_${partnerName}_${s.content || p.name}`,
              start: `${s.startDate}T${s.startTime || '09:00'}:00`,
              end: `${s.endDate || s.startDate}T${s.endTime || '18:00'}:00`,
              extendedProps: { type: 'project', partner: partnerName, location: p.location }
            });
          });
        } else if (p.startDate) {
          allEvents.push({
            id: `project-${p.id}`,
            title: p.level === 2 ? `[${p.name}] 전체 일정` : `${lv2Name}_${partnerName}_${p.name}`,
            start: `${p.startDate}T${p.startTime || '09:00'}:00`,
            end: `${p.endDate || p.startDate}T${p.endTime || '18:00'}:00`,
            extendedProps: { type: 'project', partner: partnerName, location: p.location }
          });
        }
      });

    // 2. 회의 관리 (필터링 적용)
    meetings.forEach(m => {
      if (!m.date) return;
      
      // 프로젝트가 지정된 경우 필터링
      if (m.projectId && !filteredProjectIds.includes(m.projectId)) return;
      
      allEvents.push({
        id: `meeting-${m.id}`,
        title: `${m.location}, ${m.startTime}`,
        start: `${m.date}T${m.startTime || '00:00'}:00`,
        end: `${m.date}T${m.endTime || '23:59'}:00`,
        extendedProps: { type: 'meeting', location: m.location }
      });
    });

    // 3. 예산 및 정산 (선택된 LV2 사업 관련 지출만)
    expenditures.forEach(exp => {
      if (!exp.date || exp.date.trim() === '') return;
      
      const management = managements.find(m => m.id === exp.managementId);
      const category = management ? categories.find(c => c.id === management.categoryId) : null;
      
      // 1. 실행 내역(LV3 budget)이 있는 경우 프로젝트와 직접 연결 확인
      let isVisible = false;
      if (exp.executionId) {
        const execution = useBudgetStore.getState().executions.find(e => e.id === exp.executionId);
        if (execution?.projectId && filteredProjectIds.includes(execution.projectId)) {
          isVisible = true;
        }
      } 
      
      // 2. 실행 내역이 없거나 연결 안 된 경우 카테고리(LV1) 기준으로 최소한의 필터링
      if (!isVisible && category && category.projectId && effectiveSelectedIds.includes(category.projectId)) {
        // LV2 필터가 활성화된 경우, 해당 LV1에 속한 모든 지출을 보여줄지 아니면 숨길지 결정
        // 여기서는 LV1이 일치하면 일단 보여주되, LV2 필터링은 프로젝트 중심이므로 유지
        isVisible = selectedLv2Ids.length === 0; 
      }
      
      if (isVisible) {
        allEvents.push({
          id: `exp-${exp.id}`,
          title: `${management?.name || '관리세목'}, ${exp.subDetail}, ${exp.vendor}, ${exp.amount.toLocaleString()}원`,
          start: exp.date,
          allDay: true,
          extendedProps: {
            type: 'budget',
            category: category?.name,
            subDetail: exp.subDetail,
            vendor: exp.vendor,
            amount: exp.amount
          }
        });
      }
    });

    return allEvents;
  }, [projects, filteredProjectIds, effectiveSelectedIds, meetings, expenditures, partners, managements, categories, getLv2Name]);

  const isLoading = isProjectsLoading || isMeetingsLoading || isBudgetLoading;

  const toggleLv1 = (id: string) => {
    if (selectedLv1Ids.includes(id)) {
      setSelectedLv1Ids(selectedLv1Ids.filter(sid => sid !== id));
    } else {
      setSelectedLv1Ids([...selectedLv1Ids, id]);
    }
  };

  const toggleLv2 = (id: string) => {
    if (selectedLv2Ids.includes(id)) {
      setSelectedLv2Ids(selectedLv2Ids.filter(sid => sid !== id));
    } else {
      setSelectedLv2Ids([...selectedLv2Ids, id]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-100 shadow-xl">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <CalendarDays className="size-8 text-emerald-600" /> 캘린더(일정)
            </h1>
            <p className="text-slate-500 font-medium mt-1">교육 사업 및 주요 이벤트를 통합 관리합니다.</p>
          </div>

          <div className="h-12 w-px bg-slate-100 mx-2" />

          {/* 사업 필터링 UI */}
          <Popover>
            <PopoverTrigger render={
              <Button variant="outline" className="h-12 rounded-2xl border-slate-200 bg-white font-black gap-2 px-6 shadow-sm hover:bg-slate-50">
                <CheckSquare className="size-4 text-indigo-600" />
                <span>사업 필터링</span>
                {selectedLv1Ids.length > 0 && (
                  <Badge className="ml-1 bg-indigo-600 text-white border-none">{selectedLv1Ids.length}</Badge>
                )}
                <ChevronDown className="size-4 text-slate-400 ml-2" />
              </Button>
            } />
            <PopoverContent className="w-80 p-4 rounded-[2rem] shadow-2xl border-slate-100" align="start">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">표시할 LV1 사업 선택</p>
                <div className="max-h-[300px] overflow-y-auto space-y-1 pr-2">
                  {lv1Projects.map(p => {
                    const isSelected = selectedLv1Ids.includes(p.id);
                    return (
                      <div 
                        key={p.id}
                        onClick={() => toggleLv1(p.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors",
                          isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        {isSelected ? <CheckSquare className="size-5" /> : <Square className="size-5 text-slate-300" />}
                        <span className="text-sm font-black truncate">{p.name}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedLv1Ids.length > 0 && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedLv1Ids([])}
                    className="w-full text-[11px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    필터 초기화 (전체 표시)
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="h-12 w-px bg-slate-100 mx-2" />

          {/* LV2 필터링 버튼 (1, 2, 3...) */}
          <TooltipProvider delay={0}>
            <div className="flex items-center gap-2">
              {lv2Projects.map((p, index) => {
                const isSelected = selectedLv2Ids.includes(p.id);
                return (
                  <Tooltip key={p.id}>
                    <TooltipTrigger render={
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="icon"
                        onClick={() => toggleLv2(p.id)}
                        className={cn(
                          "size-10 rounded-xl font-black text-lg transition-all active:scale-90",
                          isSelected 
                            ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 text-white" 
                            : "border-slate-200 text-slate-300 hover:text-indigo-600 hover:border-indigo-200"
                        )}
                      >
                        {index + 1}
                      </Button>
                    } />
                    <TooltipContent side="bottom" className="rounded-xl border-none shadow-2xl p-3 bg-slate-900">
                      <p className="font-black text-xs text-white">{p.name}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {lv2Projects.length > 0 && selectedLv2Ids.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedLv2Ids([])}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 ml-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </TooltipProvider>
        </div>
        <Button className="rounded-xl h-12 bg-slate-900 font-black gap-2 px-6">
          <Plus className="size-4" /> 일정 등록
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 h-[800px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-white rounded-[2.5rem] shadow-2xl border border-slate-100">
              <Loader2 className="size-12 text-slate-200 animate-spin" />
            </div>
          ) : (
            <CalendarView events={events} />
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Bell className="size-4 text-amber-500" /> 다가오는 일정
            </h3>
            <div className="space-y-4">
              {events
                .filter(e => new Date(e.start) >= new Date())
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                .slice(0, 3)
                .map(e => (
                  <div key={e.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <p className={cn(
                      "text-[10px] font-black uppercase mb-1",
                      e.extendedProps.type === 'project' ? "text-emerald-600" :
                      e.extendedProps.type === 'meeting' ? "text-amber-600" : "text-indigo-600"
                    )}>
                      {format(new Date(e.start), 'MM.dd')}
                    </p>
                    <p className="text-xs font-bold text-slate-700 truncate">{e.title}</p>
                  </div>
                ))}
              {events.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-8">등록된 일정이 없습니다.</p>
              )}
            </div>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
              <ListChecks className="size-4 text-indigo-400" /> 범례
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[11px] font-bold text-indigo-100">사업 일정 (LV3/LV4)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <span className="text-[11px] font-bold text-indigo-100">회의 일정</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                <span className="text-[11px] font-bold text-indigo-100">지출/집행 내역</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
