'use client';

import * as React from 'react';
import { CalendarDays, Bell, Plus, Loader2, LayoutGrid } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CalendarView, { CalendarEvent } from './_components/calendar-view';
import { useProjectStore } from '@/store/use-project-store';
import { useMeetingStore } from '@/store/use-meeting-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { format, parseISO, addMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";



const getProjectColor = (id: string, isPeriod?: boolean) => {
  if (isPeriod) {
    // 운영 일정: 연한 바탕 + 녹색 테두리
    return { bg: '#f0fdf4', text: '#166534', border: '#22c55e' };
  }
  
  // 일반 일정: 회색/슬레이트 테마
  const colors = [
    { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
    { bg: '#f1f5f9', text: '#334155', border: '#94a3b8' },
    { bg: '#e2e8f0', text: '#1e293b', border: '#64748b' },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function CalendarPage() {
  const { 
    projects, 
    selectedLv1Ids, 
    setSelectedLv1Ids, 
    fetchProjects, 
    isLoading: isProjectsLoading 
  } = useProjectStore();
  const { meetings, fetchMeetings, isLoading: isMeetingsLoading } = useMeetingStore();
  const { expenditures, fetchBudgets, managements, categories, executions, isLoading: isBudgetLoading } = useBudgetStore();
  const { partners, fetchPartners } = usePartnerStore();

  const [hasMounted, setHasMounted] = React.useState(false);
  const [showProjects, setShowProjects] = React.useState(true);
  const [showMeetings, setShowMeetings] = React.useState(true);
  const [showBudget, setShowBudget] = React.useState(true);

  // 현재 선택된 단일 사업 ID (헤더 드롭다운용)
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");

  React.useEffect(() => {
    setHasMounted(true);
    fetchProjects();
    fetchMeetings();
    fetchBudgets();
    fetchPartners();
  }, [fetchProjects, fetchMeetings, fetchBudgets, fetchPartners]);

  // 대시보드 선택된 사업과 동기화
  React.useEffect(() => {
    if (selectedLv1Ids.length > 0) {
      setSelectedProjectId(selectedLv1Ids[0]);
    } else {
      setSelectedProjectId("all");
    }
  }, [selectedLv1Ids]);

  // 0. 필터링 로직
  const lv1Projects = React.useMemo(() => projects.filter(p => p.level === 1), [projects]);
  
  // 헤더 드롭다운 선택값 또는 글로벌 필터값 사용
  const effectiveSelectedIds = React.useMemo(() => {
    if (selectedProjectId === "all") return lv1Projects.map(p => p.id);
    if (selectedProjectId) return [selectedProjectId];
    return selectedLv1Ids.length > 0 ? selectedLv1Ids : lv1Projects.map(p => p.id);
  }, [selectedProjectId, selectedLv1Ids, lv1Projects]);

  const lv2Projects = React.useMemo(() => 
    projects.filter(p => p.level === 2 && effectiveSelectedIds.includes(p.parentId!)),
    [projects, effectiveSelectedIds]
  );

  const [selectedLv2Ids, setSelectedLv2Ids] = React.useState<string[]>([]);

  // LV1 필터가 바뀔 때 LV2 선택 초기화
  React.useEffect(() => {
    setSelectedLv2Ids(prev => {
      const next = prev.filter(id => lv2Projects.some(p => p.id === id));
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) {
        return prev;
      }
      return next;
    });
  }, [lv2Projects]);

  const effectiveLv2Ids = selectedLv2Ids.length > 0 ? selectedLv2Ids : lv2Projects.map(p => p.id);

  const getDescendantIds = React.useCallback((parentIds: string[]): string[] => {
    if (parentIds.length === 0) return [];
    const visited = new Set<string>();
    
    const collect = (ids: string[], depth: number = 0): string[] => {
      if (ids.length === 0 || depth > 10) return []; 
      let result = [...ids];
      const children = projects.filter(p => p.parentId && ids.includes(p.parentId) && !visited.has(p.id));
      
      children.forEach(c => visited.add(c.id));
      
      if (children.length > 0) {
        result = [...result, ...collect(children.map(c => c.id), depth + 1)];
      }
      return result;
    };
    
    return collect(parentIds);
  }, [projects]);

  const filteredProjectIds = React.useMemo(() => {
    // LV2가 선택되어 있으면 LV2부터, 아니면 선택된 LV1부터 하위 모든 ID를 수집
    const startIds = selectedLv2Ids.length > 0 ? selectedLv2Ids : effectiveSelectedIds;
    return getDescendantIds(startIds);
  }, [getDescendantIds, selectedLv2Ids, effectiveSelectedIds]);

  const getLv2Name = React.useCallback((parentId: string | null): string => {
    const visited = new Set<string>();
    const find = (id: string | null, depth: number = 0): string => {
      if (!id || depth > 5 || visited.has(id)) return '';
      visited.add(id);
      const parent = projects.find(p => p.id === id);
      if (!parent) return '';
      if (parent.level === 2) return parent.abbreviation || parent.name;
      return find(parent.parentId, depth + 1);
    };
    return find(parentId);
  }, [projects]);

  const events = React.useMemo(() => {
    try {
      const allEvents: CalendarEvent[] = [];

      // 1. 사업 관리 (필터링 적용: LV3/LV4 중심)
      if (showProjects) {
        const activeLv3s = projects.filter(p => p.level === 3 && effectiveLv2Ids.includes(p.parentId!));
        activeLv3s.forEach(lv3 => {
          const lv2NameFull = projects.find(p => p.id === lv3.parentId)?.name || '';
          const lv2NameAbbr = getLv2Name(lv3.parentId);
          const childrenLv4 = projects.filter(p => p.parentId === lv3.id && p.level === 4);
          const targets = childrenLv4.length > 0 ? childrenLv4 : [lv3];
          
          targets.forEach(p => {
            const partner = partners.find(ptr => ptr.id === p.partnerId);
            const partnerNameFull = partner?.name || '미지정';
            const partnerNameAbbr = partner?.abbreviation || partner?.name || '미지정';

            // 명칭 최적화 함수: 파트너사 이름이 프로젝트명에 포함된 경우 중복 제거
            const getOptimalTitle = (lv2: string, partner: string, name: string) => {
              const allPartnerNames = partners.flatMap(p => [p.name, p.abbreviation].filter(Boolean));
              
              // 1. 프로젝트명이 다른 파트너사 이름인 경우 (데이터 입력 오류 방지)
              const isOtherPartnerName = allPartnerNames.some(pn => pn !== partner && name.includes(pn!));
              if (isOtherPartnerName) {
                 // 파트너명이 중복 노출되지 않도록 lv2와 현재 파트너만 표시
                 return `${lv2}_${partner}`;
              }

              // 2. 프로젝트명이 현재 파트너명과 중복되는 경우
              if (name === partner || name === '운영' || name === '일반' || name === partnerNameFull) {
                return `${lv2}_${partner}`;
              }
              
              if (name.includes(partner) || partner.includes(name)) {
                return `${lv2}_${partner}`;
              }

              return `${lv2}_${partner}_${name}`;
            };

            const isPeriodProject = p.startDate && p.endDate && p.startDate !== p.endDate;

            // 1. 사업 전체 기간 표시 (2일 이상인 경우 상단 바 형태로 표시)
            if (isPeriodProject) {
              const pColor = getProjectColor(p.id, true);
              
              // 종료일 처리: FullCalendar는 end 날짜를 제외하므로 +1일 처리
              let endDateObj = parseISO(p.endDate);
              if (isValid(endDateObj)) {
                endDateObj = addMinutes(endDateObj, 1440);
              }

              // 사업일정 출력 포맷 적용 (좁은 경우 별칭 우선)
              const projectTitle = getOptimalTitle(lv2NameAbbr, partnerNameAbbr, p.name);

              allEvents.push({
                id: `project-period-${p.id}`,
                title: `[운영] ${projectTitle}`,
                start: p.startDate,
                end: isValid(endDateObj) ? format(endDateObj, 'yyyy-MM-dd') : p.endDate,
                allDay: true,
                backgroundColor: pColor.bg, 
                borderColor: pColor.border,
                textColor: pColor.text,
                extendedProps: { 
                  type: 'project', 
                  isPeriod: true,
                  color: pColor,
                  partner: partnerNameAbbr, 
                  partnerFull: partnerNameFull,
                  projectFull: `${lv2NameFull} - ${p.name}`,
                  programName: p.name,
                  location: p.location, 
                  capacity: p.quota,
                  attendance: p.participantCount,
                  editId: p.id 
                }
              });
            }
            
            // 2. 세부 세션 또는 단일 일정 표시
            if (p.sessions && p.sessions.length > 0) {
              p.sessions.forEach((s, idx) => {
                if (!s.startDate) return;
                
                // 만약 [운영] 바가 있고, 세션 시간이 지정되지 않았거나 기본값인 경우 중복 방지를 위해 제외
                const hasSpecificTime = s.startTime && s.startTime !== '09:00';
                if (isPeriodProject && !hasSpecificTime) return;

                // 사업일정 세션 출력 포맷 적용
                const sessionTitle = getOptimalTitle(lv2NameAbbr, partnerNameAbbr, s.content || p.name);

                const pColor = getProjectColor(p.id);
                allEvents.push({
                  id: `session-${p.id}-${idx}`,
                  title: sessionTitle,
                  start: `${s.startDate}T${s.startTime || '09:00'}:00`,
                  end: `${s.endDate || s.startDate}T${s.endTime || '18:00'}:00`,
                  backgroundColor: pColor.bg,
                  borderColor: pColor.border,
                  textColor: pColor.text,
                  extendedProps: { 
                    type: 'project', 
                    color: pColor,
                    partner: partnerNameAbbr, 
                    partnerFull: partnerNameFull,
                    projectFull: `${lv2NameFull} - ${p.name}`,
                    programName: s.content || p.name,
                    location: p.location, 
                    capacity: p.quota,
                    attendance: p.participantCount,
                    editId: p.id 
                  }
                });
              });
            } else if (p.startDate) {
              // [운영] 바가 이미 표시된 경우 단일 일정은 중복이므로 제외
              if (isPeriodProject) return;

              // 사업일정 단일 출력 포맷 적용
              const singleTitle = getOptimalTitle(lv2NameAbbr, partnerNameAbbr, p.name);

              const pColor = getProjectColor(p.id);
              allEvents.push({
                id: `project-${p.id}`,
                title: singleTitle,
                start: `${p.startDate}T${p.startTime || '09:00'}:00`,
                end: `${p.endDate || p.startDate}T${p.endTime || '18:00'}:00`,
                backgroundColor: pColor.bg,
                borderColor: pColor.border,
                textColor: pColor.text,
                extendedProps: { 
                  type: 'project', 
                  color: pColor,
                  partner: partnerNameAbbr, 
                  partnerFull: partnerNameFull,
                  projectFull: `${lv2NameFull} - ${p.name}`,
                  programName: p.name,
                  location: p.location, 
                  capacity: p.quota,
                  attendance: p.participantCount,
                  editId: p.id 
                }
              });
            }
          });
        });
      }

      // 2. 회의 관리
      if (showMeetings) {
        // 회차 계산을 위해 정렬된 회의 목록 가져오기
        const sortedMeetings = [...meetings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        sortedMeetings.forEach((m, idx) => {
          if (!m.date) return;
          if (m.projectId && selectedProjectId !== "all" && !filteredProjectIds.includes(m.projectId)) return;
          
          const project = projects.find(p => p.id === m.projectId);
          const projectPartFull = project ? `[${project.name}] ` : '';
          
          const sessionNum = idx + 1;
          
          allEvents.push({
            id: `meeting-${m.id}`,
            // 회의 출력 포맷: 회차_장소_시간
            title: `${sessionNum}회차, ${m.location || '장소미정'}, ${m.startTime || '시간미정'}`,
            start: `${m.date}T${m.startTime || '00:00'}:00`,
            end: `${m.date}T${m.endTime || '23:59'}:00`,
            extendedProps: { 
              type: 'meeting', 
              location: m.location, 
              sessionNum,
              meetingTitle: m.title,
              projectFull: projectPartFull + (m.title || ''),
              editId: m.id 
            }
          });
        });
      }

      // 3. 예산 및 정산
      if (showBudget) {
        expenditures.forEach(exp => {
          if (!exp.date || exp.date.trim() === '') return;
          const management = managements.find(m => m.id === exp.managementId);
          const category = management ? categories.find(c => c.id === management.categoryId) : null;
          
          let isVisible = false;
          if (exp.executionId) {
            const execution = executions.find(e => e.id === exp.executionId);
            if (execution?.projectId && filteredProjectIds.includes(execution.projectId)) {
              isVisible = true;
            }
          } 
          
          if (!isVisible && category && category.projectId) {
            if (selectedProjectId === "all") {
              isVisible = true;
            } else if (effectiveSelectedIds.includes(category.projectId)) {
              isVisible = selectedLv2Ids.length === 0 || effectiveLv2Ids.some(lv2Id => {
                 const lv2Descendants = getDescendantIds([lv2Id]);
                 return category.projectId && lv2Descendants.includes(category.projectId);
              });
            }
          }
          
          if (isVisible) {
            // 지출 출력 포맷: 관리세목_세세목_지출처_금액
            const budgetTitle = `${management?.name || '관리세목'}, ${exp.subDetail}, ${exp.vendor}, ${(exp.amount || 0).toLocaleString()}원`;
            
            allEvents.push({
              id: `exp-${exp.id}`,
              title: budgetTitle,
              start: exp.date,
              end: exp.date,
              allDay: true,
              extendedProps: {
                type: 'budget',
                category: category?.name,
                managementName: management?.name,
                subDetail: exp.subDetail,
                vendor: exp.vendor,
                amount: exp.amount,
                editId: exp.id
              }
            });
          }
        });
      }

      return allEvents;
    } catch (e) {
      console.error("Error processing calendar events:", e);
      return [];
    }
  }, [projects, filteredProjectIds, effectiveSelectedIds, selectedLv2Ids, effectiveLv2Ids, meetings, expenditures, partners, managements, categories, executions, getLv2Name, showProjects, showMeetings, showBudget, getDescendantIds, selectedProjectId]);

  const isLoading = isProjectsLoading || isMeetingsLoading || isBudgetLoading;

  const toggleAllLv2 = () => {
    if (selectedLv2Ids.length === lv2Projects.length && lv2Projects.length > 0) {
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
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
      {/* 액션 바 (회의 관리 스타일 적용) */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-xl print:hidden">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <CalendarDays className="size-5 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-slate-900 tracking-tight whitespace-nowrap">캘린더(일정)</h1>
          </div>

          <div className="flex items-center gap-2 max-w-4xl w-full">
            <Select 
              key={`calendar-select-${selectedProjectId}-${projects.length}`}
              value={selectedProjectId || 'all'} 
              onValueChange={(val) => {
                const value = val as string;
                setSelectedProjectId(value);
                if (value === 'all') {
                  setSelectedLv1Ids([]);
                } else {
                  setSelectedLv1Ids([value]);
                }
              }}
            >
              <SelectTrigger className="h-9 rounded-lg font-bold text-[11px] bg-white border-slate-200 focus:ring-indigo-500/20">
                <div className="flex items-center gap-2 truncate flex-1">
                  <LayoutGrid className="size-3 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {selectedProjectId === 'all' 
                      ? '전체 사업 일정' 
                      : (projects.find(p => p.id === selectedProjectId)?.name || '사업 선택')
                    }
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold">전체 사업 일정</SelectItem>
                {lv1Projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-[11px] font-bold">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-lg h-9 bg-slate-900 hover:bg-slate-800 font-bold gap-1.5 px-4 text-[11px] shadow-md">
            <Plus className="size-3.5" /> 일정 등록
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        {/* 필터 그리드 (LV1 행 제거) */}
        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30">
          <div className="grid grid-cols-[140px,1fr] divide-y divide-slate-100">
            {/* 1. 사업일정 (LV2) */}
            <div className="flex divide-x divide-slate-100 min-h-10 bg-white">
              <div className="flex items-center px-4 py-1.5 bg-slate-50/50 w-[140px] shrink-0">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowProjects(!showProjects)}
                  className={cn(
                    "h-6 w-full px-0 text-[11px] font-bold justify-start gap-2 hover:bg-transparent",
                    showProjects ? "text-emerald-600" : "text-slate-400"
                  )}
                >
                  <div className={cn("size-2 rounded-full", showProjects ? "bg-emerald-500" : "bg-slate-300")} />
                  사업일정
                </Button>
              </div>
              <div className="flex items-start gap-1.5 p-1.5 bg-white flex-wrap">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={toggleAllLv2}
                  className={cn(
                    "h-8 px-3 rounded-lg font-bold text-[11px] transition-all border-none shadow-none",
                    selectedLv2Ids.length === lv2Projects.length && lv2Projects.length > 0
                      ? "bg-emerald-500 text-white" 
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  )}
                >
                  전체
                </Button>

                <div className="flex flex-wrap gap-1.5 flex-1">
                  {lv2Projects.map((p) => {
                    const isSelected = selectedLv2Ids.includes(p.id);
                    return (
                      <Button 
                        key={p.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toggleLv2(p.id);
                          if (!showProjects) setShowProjects(true);
                        }}
                        className={cn(
                          "h-8 px-3 rounded-lg font-bold text-[11px] transition-all border-none shadow-none min-w-[80px]",
                          isSelected 
                            ? "bg-slate-50 text-emerald-600 ring-1 ring-emerald-500/30" 
                            : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        {p.name}
                      </Button>
                    );
                  })}
                  {lv2Projects.length === 0 && (
                    <p className="text-[10px] text-slate-300 self-center pl-2 font-bold italic">사업을 먼저 선택해 주세요.</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. 회의일정 */}
            <div className="flex divide-x divide-slate-100 min-h-10 bg-white">
              <div className="flex items-center px-4 py-1.5 bg-slate-50/50 w-[140px] shrink-0">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowMeetings(!showMeetings)}
                  className={cn(
                    "h-6 w-full px-0 text-[11px] font-bold justify-start gap-2 hover:bg-transparent",
                    showMeetings ? "text-amber-600" : "text-slate-400"
                  )}
                >
                  <div className={cn("size-2 rounded-full", showMeetings ? "bg-amber-500" : "bg-slate-300")} />
                  회의일정
                </Button>
              </div>
              <div className="bg-white p-1.5 flex items-center">
                 <span className="text-[10px] font-bold text-slate-300 pl-2">회의 일정이 캘린더에 표시됩니다.</span>
              </div>
            </div>

            {/* 3. 지출/집행내역 */}
            <div className="flex divide-x divide-slate-100 min-h-10 bg-white">
              <div className="flex items-center px-4 py-1.5 bg-slate-50/50 w-[140px] shrink-0">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowBudget(!showBudget)}
                  className={cn(
                    "h-6 w-full px-0 text-[11px] font-bold justify-start gap-2 hover:bg-transparent",
                    showBudget ? "text-indigo-600" : "text-slate-400"
                  )}
                >
                  <div className={cn("size-2 rounded-full", showBudget ? "bg-indigo-500" : "bg-slate-300")} />
                  지출/집행내역
                </Button>
              </div>
              <div className="bg-white p-1.5 flex items-center">
                 <span className="text-[10px] font-bold text-slate-300 pl-2">지출 및 집행 내역이 캘린더에 표시됩니다.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="h-full flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Loader2 className="size-8 text-slate-200 animate-spin" />
            </div>
          ) : (
            <CalendarView events={events} />
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-none shadow-sm bg-white p-6">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
               <Bell className="size-3 text-amber-500" /> 다가오는 일정 (2주)
            </h3>
            <div className="space-y-4">
              {(() => {
                const now = new Date();
                const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                
                const upcoming = events.filter(e => {
                  const eventDate = new Date(e.start);
                  return eventDate >= now && eventDate <= twoWeeksLater;
                }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                if (upcoming.length === 0) {
                  return <p className="text-[10px] text-slate-400 text-center py-4">예정된 일정이 없습니다.</p>;
                }

                const grouped = upcoming.reduce((acc, event) => {
                  const type = event.extendedProps?.type || 'other';
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(event);
                  return acc;
                }, {} as Record<string, typeof upcoming>);

                const typeConfig: Record<string, { label: string, color: string, bg: string }> = {
                  project: { label: '사업 일정', color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100' },
                  meeting: { label: '회의 일정', color: 'text-amber-600', bg: 'bg-amber-50/50 border-amber-100' },
                  budget: { label: '지출 내역', color: 'text-indigo-600', bg: 'bg-indigo-50/50 border-indigo-100' }
                };

                return Object.entries(grouped).map(([type, items]) => (
                  <div key={type} className="space-y-2">
                    <h4 className={cn("text-[10px] font-bold uppercase", typeConfig[type]?.color)}>
                      {typeConfig[type]?.label || type}
                    </h4>
                    <div className="space-y-2">
                      {items.map(e => (
                        <div key={e.id} className={cn("p-3 rounded-xl border", typeConfig[type]?.bg || "bg-slate-50/50 border-slate-100")}>
                          <p className={cn("text-[9px] font-bold uppercase mb-1", typeConfig[type]?.color)}>
                            {format(new Date(e.start), 'MM.dd (E)')}
                          </p>
                          <p className="text-[11px] font-bold text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
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
        </div>
      </div>
    </div>
  );
}
