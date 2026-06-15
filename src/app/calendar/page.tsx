'use client';

import * as React from 'react';
import { 
  CalendarDays, 
  Loader2, 
  LayoutGrid, 
  Clock,
  Bell,
  Activity,
  Settings2,
  RefreshCcw,
  LucideIcon,
  Copy,
  Check
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, addDays, isWithinInterval } from 'date-fns';
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
import { useAuthStore } from '@/store/use-auth-store';
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
  const { fetchMeetings, getSortedMeetings, isLoading: isMeetingLoading } = useMeetingStore();
  const { expenditures, managements, categories, fetchBudgets, isLoading: isBudgetLoading } = useBudgetStore();
  const { partners, fetchPartners } = usePartnerStore();
  const { user, permissions, hasModuleAccess } = useAuthStore();

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');
  const [selectedLv2Ids, setSelectedLv2Ids] = React.useState<string[]>([]);
  const [showProjects, setShowProjects] = React.useState(true);
  const [showMeetings, setShowMeetings] = React.useState(false);
  const [showBudget, setShowBudget] = React.useState(false);

  // 초기 권한에 따른 필터링 상태 설정
  React.useEffect(() => {
    if (user) {
      setShowMeetings(hasModuleAccess('meetings'));
      setShowBudget(hasModuleAccess('budget'));
    }
  }, [user, hasModuleAccess]);

  React.useEffect(() => {
    setMounted(true);
    fetchProjects();
    fetchMeetings();
    fetchBudgets();
    fetchPartners();
  }, [fetchProjects, fetchMeetings, fetchBudgets, fetchPartners]);

  const isLoading = isProjectLoading || isMeetingLoading || isBudgetLoading;
  
  // 권한에 따른 가시적 프로젝트 필터링
  const visibleProjects = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return projects;
    
    const allowedIds = permissions?.allowedProjectIds || [];
    if (allowedIds.includes('*')) return projects;

    return projects.filter(p => {
      let current: any = p;
      const visited = new Set<string>();
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        if (allowedIds.includes(current.id)) return true;
        current = projects.find(parent => parent.id === current.parentId);
      }
      const hasAllowedChild = (parentId: string, visitedChild = new Set<string>()): boolean => {
        if (visitedChild.has(parentId)) return false;
        visitedChild.add(parentId);
        const children = projects.filter(c => c.parentId === parentId);
        return children.some(c => allowedIds.includes(c.id) || hasAllowedChild(c.id, visitedChild));
      };
      return hasAllowedChild(p.id);
    });
  }, [projects, user, permissions]);

  const lv1Projects = visibleProjects.filter(p => p.level === 1);

  // 글로벌 사업 선택 상태 동기화
  React.useEffect(() => {
    if (!hasMounted) return;
    if (selectedLv1Ids.length > 0) {
      const globalId = selectedLv1Ids[0];
      if (globalId !== selectedProjectId) {
        setSelectedProjectId(globalId);
      }
    } else {
      if (selectedProjectId !== 'all') {
        setSelectedProjectId('all');
      }
    }
  }, [hasMounted, selectedLv1Ids, selectedProjectId]);

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
    return visibleProjects.filter(p => p.parentId === selectedProjectId && p.level === 2);
  }, [selectedProjectId, visibleProjects]);

  React.useEffect(() => {
    if (lv2Projects.length > 0) {
      setSelectedLv2Ids(lv2Projects.map(p => p.id));
    } else {
      setSelectedLv2Ids([]);
    }
  }, [lv2Projects]);

  // 부모 체인을 올라가서 특정 레벨의 조상을 찾는 헬퍼
  const findAncestor = React.useCallback((projectId: string, targetLevel: number): typeof projects[0] | undefined => {
    let current = projects.find(p => p.id === projectId);
    const visited = new Set<string>();
    while (current && current.level > targetLevel && current.parentId && !visited.has(current.id)) {
      visited.add(current.id);
      current = projects.find(p => p.id === current!.parentId);
    }
    return current?.level === targetLevel ? current : undefined;
  }, [projects]);

  const events = React.useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // 1. 사업 일정 — 리프 노드(하위 자식이 없는 실제 운영 일정)만 표시
    if (showProjects) {
      // visibleProjects 중 리프 노드만 추출
      const leafProjects = visibleProjects.filter(p => {
        if (p.level < 2) return false;
        // 이 프로젝트를 부모로 가진 하위 프로젝트가 없으면 리프 노드
        const hasChildren = projects.some(child => child.parentId === p.id);
        return !hasChildren;
      });

      leafProjects.forEach(p => {

        // LV2 조상 찾기
        const ancestorLv2 = findAncestor(p.id, 2);
        if (!ancestorLv2) return;

        // LV1 사업 선택 필터링
        const ancestorLv1 = findAncestor(p.id, 1);
        if (selectedProjectId !== 'all' && ancestorLv1?.id !== selectedProjectId) {
          return;
        }

        // LV2 세부 사업 필터링
        if (selectedLv2Ids.length > 0 && !selectedLv2Ids.includes(ancestorLv2.id)) {
          return;
        }

        // 협력사 정보 — 리프 자신 또는 상위에서 가져옴
        const partnerId = p.partnerId || projects.find(pp => pp.id === p.parentId)?.partnerId;
        const partner = partners.find(ptr => ptr.id === partnerId);
        const partnerLabel = partner?.name || '협력사';
        
        // LV4인 경우 상위 LV3 프로그램명도 함께 표시
        const parentLv3 = p.level === 4 ? projects.find(pp => pp.id === p.parentId) : null;
        const baseName = parentLv3 ? `${parentLv3.name} - ${p.name}` : p.name;

        const abbreviation = p.abbreviation || ancestorLv2?.abbreviation || ancestorLv1?.abbreviation || '사업';

        // 차시(sessions)가 있으면 → 각 차시의 실제 교육일만 개별 표시
        if (p.sessions && p.sessions.length > 0) {
          p.sessions.forEach((session, idx) => {
            if (!session.startDate) return; // 날짜가 없는 차시는 건너뜀
            const sessionLabel = session.content || `${idx + 1}차시`;
            const title = p.level === 2 
              ? `[${partnerLabel}] (${sessionLabel})`
              : `[${partnerLabel}] ${baseName} (${sessionLabel})`;

            allEvents.push({
              id: `project-${p.id}-s${idx}`,
              title,
              start: session.startDate,
              end: session.endDate || session.startDate,
              allDay: true,
              extendedProps: {
                type: 'project',
                partner: partner?.name,
                partnerFull: `[${partnerLabel}]`,
                programName: `${baseName} (${sessionLabel})`,
                capacity: p.quota,
                attendance: session.participantCount || p.participantCount,
                editId: p.id,
                isPeriod: false,
                color: { bg: '#ecfdf5', text: '#000000', border: '#059669' },
                startTime: session.startTime || p.startTime,
                endTime: session.endTime || p.endTime,
                abbreviation
              }
            });
          });
        } else {
          // 차시가 없으면 → 프로젝트 기간 전체를 표시
          const title = p.level === 2 
            ? `[${partnerLabel}]` 
            : `[${partnerLabel}] ${baseName}`;

          allEvents.push({
            id: `project-${p.id}`,
            title,
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
              color: { bg: '#ecfdf5', text: '#000000', border: '#059669' },
              startTime: p.startTime,
              endTime: p.endTime,
              abbreviation
            }
          });
        }
      });
    }

    // 2. 회의 일정
    if (showMeetings && hasModuleAccess('meetings')) {
      getSortedMeetings().forEach(m => {
        // 사업 권한 필터링
        if (!visibleProjects.some(vp => vp.id === m.projectId)) {
          return;
        }

        // 사업 선택 필터링
        if (selectedProjectId !== 'all' && m.projectId !== selectedProjectId) {
          return;
        }

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
            purpose: m.purpose,
            agenda: m.agenda,
            content: m.content,
            nextSchedule: m.nextSchedule,
            editId: m.id,
            color: { bg: '#fffbeb', text: '#000000', border: '#d97706' }
          }
        });
      });
    }

    // 3. 지출 내역
    if (showBudget && hasModuleAccess('budget')) {
      expenditures.forEach(e => {
        const mgmt = managements.find(m => m.id === e.managementId);
        const cat = categories.find(c => c.id === mgmt?.categoryId);
        
        // 사업 권한 필터링
        if (cat?.projectId && !visibleProjects.some(vp => vp.id === cat.projectId)) {
          return;
        }

        // 사업 선택 필터링
        if (selectedProjectId !== 'all' && cat?.projectId !== selectedProjectId) {
          return;
        }

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
            color: { bg: '#eef2ff', text: '#000000', border: '#4f46e5' }
          }
        });
      });
    }

    return allEvents;
  }, [projects, expenditures, partners, managements, categories, showProjects, showMeetings, showBudget, selectedLv2Ids, selectedProjectId, findAncestor, getSortedMeetings]);

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

  const [referenceDate, setReferenceDate] = React.useState(new Date());
  
  const windowStart = React.useMemo(() => {
    return startOfWeek(referenceDate, { weekStartsOn: 1 });
  }, [referenceDate]);
  
  const windowEnd = React.useMemo(() => {
    return addDays(addWeeks(windowStart, 2), -1);
  }, [windowStart]);

  const [isUpcomingCopied, setIsUpcomingCopied] = React.useState(false);

  const extractUpcomingText = async () => {
    const upcoming = events.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate >= windowStart && eventDate <= windowEnd;
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (upcoming.length === 0) return;

    let text = `[예정일정 (${format(windowStart, 'MM.dd')}~${format(windowEnd, 'MM.dd')}) 추출]\n\n`;

    const eventsByDate: Record<string, typeof upcoming> = {};
    upcoming.forEach(event => {
      const start = event.start ? new Date(event.start) : null;
      if (!start) return;
      const eventDate = format(start, 'yyyy-MM-dd');
      if (!eventsByDate[eventDate]) eventsByDate[eventDate] = [];
      eventsByDate[eventDate].push(event);
    });

    Object.keys(eventsByDate).forEach((date, dateIdx) => {
      if (dateIdx > 0) text += '\n';
      text += `# ${date}\n`;
      const dateEvents = eventsByDate[date];
      
      const projectGroups = new Map();
      const otherEvents: (typeof upcoming)[0][] = [];
      
      dateEvents.forEach(event => {
        const props = event.extendedProps;
        if (props.type === 'project') {
                      let upperName = props.programName || '';
                      let subName = '';
                      const dashIndex = upperName.indexOf(' - ');
                      if (dashIndex !== -1) {
                        subName = upperName.substring(dashIndex + 3);
                        upperName = upperName.substring(0, dashIndex);
                      } else {
                        subName = upperName;
                      }
                      
                      // 괄호 포함된 사업명(예: "서울시특성화사업 (AI 큐보 로봇)")을 공통 사업명으로 묶기
                      let baseUpperName = upperName;
                      const parenIndex = upperName.indexOf(' (');
                      if (parenIndex !== -1) {
                        baseUpperName = upperName.substring(0, parenIndex).trim();
                      }
                      
                      const partner = props.partner || '협력사미상';
                      const abbreviation = props.abbreviation || '사업';
                      const groupKey = `${partner}|${baseUpperName}`;
                      if (!projectGroups.has(groupKey)) {
                        projectGroups.set(groupKey, {
                           partner,
                           upperName: baseUpperName,
                           abbreviation,
                           items: []
                        });
                      }
          
          let timeKey = '';
          function parseTimeToMinutes(timeStr: string) {
            if (!timeStr) return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return (h || 0) * 60 + (m || 0);
          }
          if (props.startTime && props.endTime) {
            const startMins = parseTimeToMinutes(props.startTime);
            const endMins = parseTimeToMinutes(props.endTime);
            const durHours = (endMins - startMins) / 60;
            if (durHours > 0) {
              const durStr = durHours % 1 === 0 ? durHours : durHours.toFixed(1);
              timeKey = `(${props.startTime}~${props.endTime}/${durStr}시간)`;
            } else {
              timeKey = `(${props.startTime})`;
            }
          } else if (props.startTime) {
            timeKey = `(${props.startTime})`;
          }
          
          let quotaInfo = '';
          if (props.attendance !== undefined && props.attendance !== null && props.attendance > 0) {
            quotaInfo = ` (참여 ${props.attendance}명/정원 ${props.capacity || 0}명)`;
          } else if (props.capacity) {
            quotaInfo = ` (정원: ${props.capacity}명)`;
          }
          
          projectGroups.get(groupKey).items.push({
            subName,
            timeKey,
            quotaInfo,
            rawEvent: event
          });
        } else {
          otherEvents.push(event);
        }
      });
      
      let itemNumber = 1;
      
      projectGroups.forEach(group => {
         let allSameTime = true;
         let firstTimeKey = '';
         if (group.items.length > 0) {
           firstTimeKey = group.items[0].timeKey;
           group.items.forEach((item: any) => {
             if (item.timeKey !== firstTimeKey) allSameTime = false;
           });
         }
         
         const topTimeStr = allSameTime && firstTimeKey ? ` ${firstTimeKey}` : '';
         text += `${itemNumber}. [${group.abbreviation}] | ${group.partner} | ${group.upperName} ${topTimeStr}`.trim() + `\n`;
         
         group.items.forEach((item: any) => {
            const subTimeStr = (!allSameTime && item.timeKey) ? ` ${item.timeKey}` : '';
            const quotaStr = item.quotaInfo || '';
            if (item.subName !== group.upperName) {
              text += `- ${item.subName}${subTimeStr}${quotaStr}\n`;
            } else if (!allSameTime && item.timeKey) {
              text += `- ${group.upperName}${item.timeKey}${quotaStr}\n`;
            } else if (quotaStr) {
              text += `- ${group.upperName}${quotaStr}\n`;
            }
         });
         
         text += '\n';
         itemNumber++;
      });
      
      otherEvents.forEach(e => {
        const props = e.extendedProps;
        const start = e.start ? new Date(e.start) : null;
        const timeStr = e.allDay ? "종일" : start ? format(start, 'HH:mm') : '';
        if (props.type === 'meeting') {
          text += `${itemNumber}. [회의] ${timeStr} | ${props.sessionNum}회차 | ${props.location || '장소미정'}\n`;
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
          text += '\n';
          itemNumber++;
        } else if (props.type === 'budget') {
          text += `${itemNumber}. [지출] ${timeStr} | ${props.category} | ${props.managementName} | ${props.subDetail} | 지출처: ${props.vendor} | 금액: ${(props.amount || 0).toLocaleString()}원\n\n`;
          itemNumber++;
        }
      });
    });

    try {
      await navigator.clipboard.writeText(text);
      setIsUpcomingCopied(true);
      setTimeout(() => setIsUpcomingCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `upcoming_export_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
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
                <div className="flex-1 px-4 py-2 flex flex-wrap items-center gap-1.5">
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
                        "h-7 px-3 rounded-lg font-bold text-[10px] transition-all border-none shadow-none",
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
                {hasModuleAccess('meetings') && (
                  <div className="flex items-center h-full">
                    <div className="px-4 py-2 bg-slate-50/50 h-full flex items-center shrink-0">
                      <Button 
                        variant="ghost" 
                        onClick={() => setShowMeetings(!showMeetings)}
                        className={cn(
                          "h-6 px-0 text-[10px] font-black justify-start gap-2 hover:bg-transparent uppercase tracking-tight",
                          showMeetings ? "text-amber-600" : "text-slate-400"
                        )}
                      >
                        <div className={cn("size-2 rounded-full", showMeetings ? "bg-amber-500" : "bg-slate-300")} />
                        회의 일정
                      </Button>
                    </div>
                  </div>
                )}
                {hasModuleAccess('budget') && (
                  <div className="flex items-center h-full">
                    <div className="px-4 py-2 bg-slate-50/50 h-full flex items-center shrink-0">
                      <Button 
                        variant="ghost" 
                        onClick={() => setShowBudget(!showBudget)}
                        className={cn(
                          "h-6 px-0 text-[10px] font-black justify-start gap-2 hover:bg-transparent uppercase tracking-tight",
                          showBudget ? "text-indigo-600" : "text-slate-400"
                        )}
                      >
                        <div className={cn("size-2 rounded-full", showBudget ? "bg-indigo-500" : "bg-slate-300")} />
                        지출 내역
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 캘린더 메인 컨텐츠 그리드 - 반응형 고도화 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-10 gap-6 h-full min-h-[800px]">
        {/* 캘린더 영역 (모바일: 1열, 800px~1280px(lg): 8/12, 1280px~(xl): 8/10) */}
        <div className="lg:col-span-8 xl:col-span-8 bg-white rounded-3xl border border-slate-200/60 shadow-xl overflow-hidden flex flex-col h-full">
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

        {/* 사이드바 영역 (모바일: 1열, 800px~: 나머지 비율) */}
        <div className="lg:col-span-4 xl:col-span-2 space-y-6">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[10px] font-black text-slate-900 tracking-widest flex items-center gap-2">
                 <Bell className="size-3.5 text-amber-500" /> 예정일정 (2주)
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={extractUpcomingText}
                className={cn(
                  "h-7 text-[10px] font-bold gap-1 px-2 shadow-sm transition-all",
                  isUpcomingCopied ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-slate-600 bg-white"
                )}
              >
                {isUpcomingCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {isUpcomingCopied ? "복사 완료" : "텍스트 추출"}
              </Button>
            </div>
            <div className="flex items-center justify-between mb-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                onClick={() => setReferenceDate(prev => subWeeks(prev, 1))}
              >
                <span className="text-[10px] font-bold">◀</span>
              </Button>
              <div className="text-center">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">
                  {format(windowStart, 'MM.dd')} ~ {format(windowEnd, 'MM.dd')}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                onClick={() => setReferenceDate(prev => addWeeks(prev, 1))}
              >
                <span className="text-[10px] font-bold">▶</span>
              </Button>
            </div>

            <div className="space-y-5">
              {(() => {
                const upcoming = events.filter(e => {
                  const eventDate = new Date(e.start);
                  return eventDate >= windowStart && eventDate <= windowEnd;
                }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                if (upcoming.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <Activity className="size-8 text-slate-200 mb-2" />
                      <p className="text-[10px] text-slate-400 font-bold tracking-tight">2주 내 예정된 일정이 없습니다</p>
                    </div>
                  );
                }

                const eventsByDate: Record<string, typeof upcoming> = {};
                upcoming.forEach(event => {
                  const start = event.start ? new Date(event.start) : null;
                  if (!start) return;
                  const eventDate = format(start, 'yyyy-MM-dd(E)');
                  if (!eventsByDate[eventDate]) eventsByDate[eventDate] = [];
                  eventsByDate[eventDate].push(event);
                });

                return Object.entries(eventsByDate).map(([date, dateEvents]) => {
                  const projectGroups = new Map();
                  const otherEvents: (typeof upcoming)[0][] = [];
                  
                  dateEvents.forEach(event => {
                    const props = event.extendedProps;
                    if (props.type === 'project') {
                      let upperName = props.programName || '';
                      let subName = '';
                      const dashIndex = upperName.indexOf(' - ');
                      if (dashIndex !== -1) {
                        subName = upperName.substring(dashIndex + 3);
                        upperName = upperName.substring(0, dashIndex);
                      } else {
                        subName = upperName;
                      }
                      
                      // 괄호 포함된 사업명(예: "서울시특성화사업 (AI 큐보 로봇)")을 공통 사업명으로 묶기
                      let baseUpperName = upperName;
                      const parenIndex = upperName.indexOf(' (');
                      if (parenIndex !== -1) {
                        baseUpperName = upperName.substring(0, parenIndex).trim();
                      }
                      
                      const partner = props.partner || '협력사미상';
                      const abbreviation = props.abbreviation || '사업';
                      const groupKey = `${partner}|${baseUpperName}`;
                      if (!projectGroups.has(groupKey)) {
                        projectGroups.set(groupKey, {
                           partner,
                           upperName: baseUpperName,
                           abbreviation,
                           items: []
                        });
                      }
                      
                      let timeKey = '';
                      function parseTimeToMinutes(timeStr: string) {
                        if (!timeStr) return 0;
                        const [h, m] = timeStr.split(':').map(Number);
                        return (h || 0) * 60 + (m || 0);
                      }
                      if (props.startTime && props.endTime) {
                        const startMins = parseTimeToMinutes(props.startTime);
                        const endMins = parseTimeToMinutes(props.endTime);
                        const durHours = (endMins - startMins) / 60;
                        if (durHours > 0) {
                          const durStr = durHours % 1 === 0 ? durHours : durHours.toFixed(1);
                          timeKey = `(${props.startTime}~${props.endTime}/${durStr}시간)`;
                        } else {
                          timeKey = `(${props.startTime})`;
                        }
                      } else if (props.startTime) {
                        timeKey = `(${props.startTime})`;
                      }
                      
                      let quotaInfo = '';
                      if (props.attendance !== undefined && props.attendance !== null && props.attendance > 0) {
                        quotaInfo = ` (참여 ${props.attendance}명/정원 ${props.capacity || 0}명)`;
                      } else if (props.capacity) {
                        quotaInfo = ` (정원: ${props.capacity}명)`;
                      }

                      projectGroups.get(groupKey).items.push({
                        subName,
                        timeKey,
                        quotaInfo,
                        rawEvent: event
                      });
                    } else {
                      otherEvents.push(event);
                    }
                  });

                  return (
                    <div key={date} className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-[12px] font-black text-slate-800 tracking-widest">{date}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{dateEvents.length}건</span>
                      </div>
                      <div className="space-y-4">
                        {Array.from(projectGroups.values()).map((group, gIdx) => {
                          let allSameTime = true;
                          let firstTimeKey = '';
                          if (group.items.length > 0) {
                            firstTimeKey = group.items[0].timeKey;
                            group.items.forEach((item: any) => {
                              if (item.timeKey !== firstTimeKey) allSameTime = false;
                            });
                          }
                          const topTimeStr = allSameTime && firstTimeKey ? ` ${firstTimeKey}` : '';
                          
                          return (
                            <div key={gIdx} className="space-y-2">
                              <p className="text-[11px] font-bold text-slate-800 break-words leading-snug">
                                {gIdx + 1}. [{group.abbreviation}] | {group.partner} | {group.upperName} <span className="text-slate-500 font-normal">{topTimeStr}</span>
                              </p>
                              <div className="pl-3 space-y-1 border-l-2 border-emerald-200 ml-1.5">
                                {group.items.map((item: any, iIdx: number) => {
                                  const subTimeStr = (!allSameTime && item.timeKey) ? ` ${item.timeKey}` : '';
                                  const quotaStr = item.quotaInfo || '';
                                  const label = item.subName !== group.upperName ? item.subName : group.upperName;
                                  return (
                                    <p key={iIdx} className="text-[11px] text-slate-600 break-words leading-tight flex gap-1.5">
                                      <span className="text-slate-300">-</span>
                                      <span>
                                        {label} 
                                        <span className="text-slate-400">{subTimeStr}</span>
                                        {quotaStr && <span className="text-indigo-500 font-bold ml-1">{quotaStr}</span>}
                                      </span>
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {otherEvents.map((e, eIdx) => {
                          const props = e.extendedProps;
                          const start = e.start ? new Date(e.start) : null;
                          const timeStr = e.allDay ? "종일" : start ? format(start, 'HH:mm') : '';
                          const offset = Array.from(projectGroups.keys()).length + 1 + eIdx;
                          
                          if (props.type === 'meeting') {
                            return (
                              <div key={`other-${eIdx}`} className="space-y-2">
                                <p className="text-[11px] font-bold text-amber-700 break-words leading-snug">
                                  {offset}. [회의] {timeStr} | {props.sessionNum}회차 | {props.location || '장소미정'}
                                </p>
                                <div className="pl-3 space-y-1 border-l-2 border-amber-200 ml-1.5">
                                  {props.purpose && <p className="text-[11px] text-slate-600 break-words leading-tight flex gap-1.5"><span className="text-amber-300">*</span><span>목적: {props.purpose}</span></p>}
                                  {props.agenda && <p className="text-[11px] text-slate-600 break-words leading-tight flex gap-1.5"><span className="text-amber-300">*</span><span>안건: {props.agenda}</span></p>}
                                  {props.nextSchedule && <p className="text-[11px] text-slate-600 break-words leading-tight flex gap-1.5"><span className="text-amber-300">*</span><span>차기일정: {props.nextSchedule}</span></p>}
                                </div>
                              </div>
                            );
                          } else if (props.type === 'budget') {
                            return (
                              <div key={`other-${eIdx}`} className="space-y-2">
                                <p className="text-[11px] font-bold text-indigo-700 break-words leading-snug">
                                  {offset}. [지출] {timeStr} | {props.category} | {props.managementName} | {props.subDetail} | 지출처: {props.vendor} | 금액: {(props.amount || 0).toLocaleString()}원
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                });
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
