'use client';

import * as React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Pencil, 
  Trash2, 
  AlertCircle,
  Calendar,
  Layers,
  Search,
  LayoutGrid,
  GanttChartSquare,
  Copy,
  ClipboardCheck,
  Activity
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProjectStore, Project } from '@/store/use-project-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { ProjectDialog } from '@/components/project-dialog';
import { SurveyEntryDialog } from '@/components/survey-entry-dialog';
import { cn } from '@/lib/utils';
import { SurveyType } from '@/store/use-survey-store';

export default function ProjectsPage() {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => { setHasMounted(true); }, []);
  const { 
    projects, 
    fetchProjects, 
    setSort,
    getSortedProjects,
    selectedLv1Ids,
    copyProject,
    deleteProject,
    sortKey,
    sortDirection
  } = useProjectStore();
  const { partners, fetchPartners } = usePartnerStore();

  const [mounted, setMounted] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'add' | 'edit'>('add');
  const [selectedProject, setSelectedProject] = React.useState<Project | undefined>();
  const [parentProject, setParentProject] = React.useState<Project | undefined>();
  const [currentLevel, setCurrentLevel] = React.useState(1);
  const [currentParentId, setCurrentParentId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'list' | 'gantt'>('list');
  
  // 설문 입력 관련 상태
  const [surveyEntryDialogOpen, setSurveyEntryDialogOpen] = React.useState(false);
  const [selectedSurveyProject, setSelectedSurveyProject] = React.useState<Project | null>(null);
  const [selectedSurveyType, setSelectedSurveyType] = React.useState<SurveyType>('SATISFACTION');

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // 하이드레이션 오류 방지 및 초기 데이터 로딩
  React.useEffect(() => {
    setMounted(true);
    fetchProjects();
    fetchPartners();
  }, [fetchProjects, fetchPartners]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddLv1 = () => {
    setDialogMode('add');
    setCurrentLevel(1);
    setCurrentParentId(null);
    setSelectedProject(undefined);
    setParentProject(undefined);
    setIsDialogOpen(true);
  };

  const handleAddChild = (parent: Project) => {
    setDialogMode('add');
    setCurrentLevel(parent.level + 1);
    setCurrentParentId(parent.id);
    setSelectedProject(undefined);
    setParentProject(parent);
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setDialogMode('edit');
    setSelectedProject(project);
    setParentProject(undefined);
    setCurrentLevel(project.level);
    setIsDialogOpen(true);
  };

  // 트리 렌더링 함수
  // 개별 프로젝트 행 컴포넌트 (중첩 방지 및 성능 최적화)
  const ProjectRow = ({ p, depth }: { p: Project, depth: number }) => {
    const { partners } = usePartnerStore();

    // 프로젝트의 모든 하위 ID를 무한 깊이로 가져오는 헬퍼
    const getAllDescendantIds = (parentId: string): string[] => {
      const children = projects.filter(child => child.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...getAllDescendantIds(c.id)];
      });
      return ids;
    };

    const descendantIds = getAllDescendantIds(p.id);
    const allRelevantIds = [p.id, ...descendantIds];

    // 1. 유니크 협력업체 수 계산 (LV1, LV2 전용: 자신을 제외한 하위 전체 합산)
    // 'none' 이나 비어있는 경우는 제외
    const uniquePartnerCount = new Set(
      projects
        .filter(proj => descendantIds.includes(proj.id) && proj.partnerId && proj.partnerId !== 'none')
        .map(proj => proj.partnerId)
    ).size;

    const { getAggregatedStats } = useSurveyStore();
    
    // 만족도 및 역량 향상 지표 계산 (계층 합산 반영)
    const satisfactionStats = getAggregatedStats(projects, [p.id], undefined, 'SATISFACTION');
    const competencyStats = getAggregatedStats(projects, [p.id], undefined, 'COMPETENCY');

    const avgSatisfaction = satisfactionStats[p.id]?.avg || 0;
    const satisfaction100 = avgSatisfaction * 20;
    const avgScore = competencyStats[p.id]?.avg || 0;
    
    // 역량 향상은 현재 로직상 '성취도'로 표시하거나, 
    // 기초 데이터(responses)에서 직접 gap을 계산해야 하므로 하위 호환을 위해 유지합니다.
    // 하지만 상위 집계는 이제 통일된 getAggregatedStats를 따릅니다.
    const avgGain = avgScore > 0 ? avgScore : 0; // 평점으로 표시 최적화

    // 3. 참가자 지표 (사업 본인 + 하위 전체 세션 합계 및 평균)
    let totalSessions = 0;
    projects.filter(proj => allRelevantIds.includes(proj.id)).forEach(proj => {
      if (proj.sessions) totalSessions += proj.sessions.length;
    });
    const avgPerSession = totalSessions > 0 ? p.participantCount / totalSessions : 0;

    const partner = partners.find(ptr => ptr.id === p.partnerId);

    return (
      <div 
        className={cn(
          "group flex items-center justify-between p-4 rounded-2xl transition-all hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100",
          depth === 1 && "ml-8 bg-slate-50/50",
          depth === 2 && "ml-16 bg-slate-100/30",
          depth === 3 && "ml-24 bg-slate-200/20"
        )}
      >
        <div className="flex items-center gap-3">
          {p.level < 4 && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(p.id);
              }}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              {expandedIds.has(p.id) ? (
                <ChevronDown className="size-4 text-slate-500" />
              ) : (
                <ChevronRight className="size-4 text-slate-500" />
              )}
            </button>
          )}
          {p.level === 4 && <div className="size-6 shrink-0" />}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className={cn(
                "font-black tracking-tight",
                p.level === 1 ? "text-slate-900 text-lg" : "text-slate-700 text-sm"
              )}>
                {p.name}
              </span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] font-black uppercase text-slate-400 border-slate-200">Lv {p.level}</Badge>
                {partner && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[10px]">
                    {partner.name}
                  </Badge>
                )}
                <div className="flex items-center gap-2 ml-2 py-0.5 px-2 bg-slate-100/50 rounded-lg">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">정원</span>
                   <span className="text-[11px] font-black text-slate-600">{p.quota?.toLocaleString() || 0}</span>
                   <Separator orientation="vertical" className="h-2 bg-slate-300 mx-1" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase">참가</span>
                   <span className="text-[11px] font-black text-blue-600">{p.participantCount?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            {/* LV1, LV2 사업명 바로 아래에 핵심 지표 명시 (항상 노출 권장) */}
            {p.level <= 2 && (
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50/80 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-tight">참여 협력사</span>
                  <span className="text-[11px] font-black text-blue-700">{uniquePartnerCount}개소</span>
                </div>

                {avgSatisfaction > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 rounded-xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-tight">평균 만족도</span>
                    <span className="text-[11px] font-black text-amber-700">
                      {avgSatisfaction.toFixed(2)}pt ({satisfaction100.toFixed(2)}점)
                    </span>
                  </div>
                )}

                {avgGain !== 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/80 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tight">역량 향상도</span>
                    <span className="text-[11px] font-black text-emerald-700">+{avgGain.toFixed(2)}pt</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                 <Calendar className="size-3" />
                 {p.startDate} ~ {p.endDate}
              </div>
              
              <div className="flex items-center gap-3">
                {/* LV3 전용 인원 지표 */}
                {p.level === 3 && (
                  <div className="flex items-center gap-2">
                    {totalSessions > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 rounded-lg border border-indigo-100/50">
                        <span className="text-[9px] font-black text-indigo-400 uppercase">평균 참가인원</span>
                        <span className="text-[10px] font-black text-indigo-700">{Math.round(avgPerSession)}명</span>
                      </div>
                    )}
                    {p.quota > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 rounded-lg border border-rose-100/50">
                        <span className="text-[9px] font-black text-rose-400 uppercase">참석률</span>
                        <span className="text-[10px] font-black text-rose-700">
                          {Math.round((p.participantCount / p.quota) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100/80 rounded-xl border border-slate-200/50">
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Target</span>
                  <span className="text-xs font-black text-slate-600">{p.quota?.toLocaleString() || 0}</span>
               </div>
               <Separator orientation="vertical" className="h-4 bg-slate-300 mx-1" />
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Actual</span>
                  <span className="text-xs font-black text-blue-600">{p.participantCount?.toLocaleString() || 0}</span>
               </div>
            </div>
            {totalSessions > 0 && (
              <span className="text-[9px] font-bold text-slate-400 mr-1">총 {totalSessions}차시 교육 완료</span>
            )}
          </div>
          {/* 파트너 연동 버튼 제거 (전역에서 관리하므로) */}
          {p.level < 4 && (
            <Button 
              variant="ghost" 
              size="icon" 
              type="button"
              className="size-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
              onClick={() => handleAddChild(p)}
            >
              <Plus className="size-5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
            onClick={() => {
              setSelectedSurveyProject(p);
              setSelectedSurveyType('SATISFACTION');
              setSurveyEntryDialogOpen(true);
            }}
          >
            <ClipboardCheck className="size-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
            onClick={() => {
              setSelectedSurveyProject(p);
              setSelectedSurveyType('COMPETENCY');
              setSurveyEntryDialogOpen(true);
            }}
          >
            <Activity className="size-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-9 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
            onClick={() => {
              if (confirm('하위 항목을 포함한 전체 정보를 복사하시겠습니까?')) {
                copyProject(p.id);
              }
            }}
          >
            <Copy className="size-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
            onClick={() => handleEdit(p)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-9 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
            onClick={() => {
              if(confirm('정말 삭제하시겠습니까? 하위 사업은 미지정 상태로 전환됩니다.')) deleteProject(p.id);
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    );
  };

  // 트리 렌더링 함수
  const renderProjectRows = (parentId: string | null, depth: number = 0) => {
    const sorted = getSortedProjects(parentId);
    
    const displayProjects = depth === 0 
      ? sorted.filter(p => p.level === 1 && (selectedLv1Ids.length === 0 || selectedLv1Ids.includes(p.id))) 
      : sorted;

    return (
      <div className="flex flex-col gap-2">
        {displayProjects.map((p) => (
          <React.Fragment key={p.id}>
            <ProjectRow p={p} depth={depth} />
            {expandedIds.has(p.id) && renderProjectRows(p.id, depth + 1)}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // '미지정 보관함' 렌더링
  const renderOrphans = () => {
    // parentId가 null이지만 level이 1이 아닌 경우 (부모가 삭제된 Lv 2, 3)
    const orphans = projects.filter(p => p.parentId === null && p.level > 1);
    
    if (orphans.length === 0) return null;

    if (!hasMounted) return null;
  return (
      <div className="mt-12 bg-red-50/30 rounded-2xl p-6 border border-dashed border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="size-5 text-red-500" />
          <h2 className="text-sm font-black text-red-900 uppercase tracking-tight">미지정 보관함</h2>
          <span className="text-[10px] text-red-400 font-bold">부모 삭제 등으로 소속이 해제된 항목입니다.</span>
        </div>
        <div className="flex flex-col gap-2">
          {orphans.map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-red-100">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-700">{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 font-bold">Lv {p.level}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">{p.startDate} ~ {p.endDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-8 text-slate-400 hover:text-slate-600"
                  onClick={() => handleEdit(p)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-8 text-red-400 hover:text-red-600"
                  onClick={() => {
                    if(confirm('영구 삭제하시겠습니까?')) deleteProject(p.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- 간트 차트 컴포넌트 ---
  const GanttView = () => {
    // 1. 타임라인 범위 계산
    const filteredProjects = projects.filter(p => {
      if (selectedLv1Ids.length === 0) return true;
      // 상위 레벨 1 프로젝트 찾기
      let current = p;
      while (current.parentId && current.level > 1) {
        const parent = projects.find(prev => prev.id === current.parentId);
        if (!parent) break;
        current = parent;
      }
      return selectedLv1Ids.includes(current.id);
    });

    const allDates = filteredProjects.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
    if (allDates.length === 0) return (
      <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
         <p className="text-slate-400 font-black">표시할 타임라인 데이터가 없습니다.</p>
      </div>
    );

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // 타임라인 앞뒤 여백 추가 (해당 월의 시작과 끝으로 맞춤)
    const viewStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const viewEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    const totalDays = (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24);
    
    const months: Date[] = [];
    const curr = new Date(viewStart);
    while (curr <= viewEnd) {
      months.push(new Date(curr));
      curr.setMonth(curr.getMonth() + 1);
    }

    const getPos = (dateStr: string) => {
      const d = new Date(dateStr);
      const diff = (d.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24);
      return (diff / totalDays) * 100;
    };

    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[500px] animate-in slide-in-from-bottom-4 duration-500">
        {/* 간체 헤더: 타임라인 (월) */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="w-[280px] shrink-0 p-5 border-r border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center">
            전체 사업 리스트
          </div>
          <div className="flex-1 flex relative h-14">
            {months.map((m, i) => (
              <div 
                key={i} 
                className="flex-1 border-l border-slate-100/50 flex flex-col items-center justify-center"
                style={{ width: `${100 / months.length}%` }}
              >
                <span className="font-black text-[10px] text-slate-600 uppercase mb-0.5">{m.getFullYear()}</span>
                <span className="font-bold text-[9px] text-slate-400">{m.getMonth() + 1}월</span>
              </div>
            ))}
          </div>
        </div>

        {/* 간체 본문: 프로젝트 바 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredProjects.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(p => {
             const left = getPos(p.startDate);
             const right = getPos(p.endDate);
             const width = Math.max(right - left, 2); // 최소 너비 보장

             return (
              <div key={p.id} className="flex border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                <div className="w-[280px] shrink-0 p-5 border-r border-slate-50 flex flex-col gap-1.5 overflow-hidden">
                   <div className="flex items-center gap-2">
                      <Badge className={cn(
                        "text-[8px] font-black h-4 px-1.5 border-none",
                        p.level === 1 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                      )}>LV{p.level}</Badge>
                      <span className="text-xs font-black text-slate-700 truncate">{p.name}</span>
                   </div>
                   <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                      <Calendar className="size-3" />
                      <span>{p.startDate} ~ {p.endDate}</span>
                   </div>
                </div>
                <div className="flex-1 relative h-16 flex items-center px-0">
                   {/* 그리드 세로선 시뮬레이션 */}
                   <div className="absolute inset-0 flex">
                      {months.map((_, i) => (
                        <div key={i} className="flex-1 border-l border-slate-50/50 h-full" />
                      ))}
                   </div>
                   {/* 일정 바 */}
                     <div 
                       className={cn(
                         "h-7 rounded-full shadow-lg relative z-10 flex items-center px-3 group-hover:scale-[1.01] transition-all cursor-pointer group/bar",
                         p.level === 1 ? "bg-indigo-600 shadow-indigo-100/50" : 
                         p.level === 2 ? "bg-blue-400 shadow-blue-100/50" : 
                         "bg-slate-400 shadow-slate-100/50"
                       )}
                       style={{ 
                         marginLeft: `${left}%`, 
                         width: `${width}%`
                       }}
                       onClick={() => handleEdit(p)}
                     >
                        <span className="text-[10px] font-black text-white truncate drop-shadow-sm whitespace-nowrap overflow-hidden">
                           {p.partnerId && p.partnerId !== 'none' && partners.find(ptr => ptr.id === p.partnerId) 
                              ? `[${partners.find(ptr => ptr.id === p.partnerId)!.name}] ${p.name}` 
                              : p.name}
                        </span>
                        {/* 툴팁 시뮬레이션 */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                           {p.partnerId && p.partnerId !== 'none' && partners.find(ptr => ptr.id === p.partnerId) 
                              ? `[${partners.find(ptr => ptr.id === p.partnerId)!.name}] ${p.name}` 
                              : p.name} ({p.startDate} ~ {p.endDate})
                           <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                        </div>
                     </div>
                </div>
              </div>
             );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 헤더 및 툴바 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl">
              <Layers className="size-5 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">사업 관리</h1>
          </div>
          <p className="text-slate-500 font-medium">전체 위탁교육 사업의 계층 구조 및 기간을 관리합니다.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner mr-2">
             <Button 
               variant={viewMode === 'list' ? 'default' : 'ghost'} 
               size="sm" 
               onClick={() => setViewMode('list')}
               className="h-8 rounded-lg font-black text-[10px] gap-1.5"
             >
                <LayoutGrid className="size-3" /> 리스트
             </Button>
             <Button 
               variant={viewMode === 'gantt' ? 'default' : 'ghost'} 
               size="sm" 
               onClick={() => setViewMode('gantt')}
               className="h-8 rounded-lg font-black text-[10px] gap-1.5"
             >
                <GanttChartSquare className="size-3" /> 타임라인
             </Button>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl border px-3 h-10 shadow-sm">
            <Search className="size-4 text-slate-400" />
            <Input 
              placeholder="사업명 검색..." 
              className="border-none bg-transparent h-8 w-40 focus-visible:ring-0 font-medium text-sm"
            />
          </div>
          
          <Select 
            value={`${sortKey}-${sortDirection}`} 
            onValueChange={(val) => {
              if (!val) return;
              const [key, dir] = val.split('-');
              setSort(key as 'name' | 'date', dir as 'asc' | 'desc');
            }}
          >
            <SelectTrigger className="w-[160px] h-10 bg-white shadow-sm font-bold text-xs uppercase tracking-wider">
              <SelectValue placeholder="정렬 방식" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc" className="font-bold">이름 오름차순</SelectItem>
              <SelectItem value="name-desc" className="font-bold">이름 내림차순</SelectItem>
              <SelectItem value="date-asc" className="font-bold">날짜 오름차순</SelectItem>
              <SelectItem value="date-desc" className="font-bold">날짜 내림차순</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAddLv1} className="h-10 px-6 font-black gap-2 shadow-md">
            <Plus className="size-4" /> 신규 사업
          </Button>
        </div>
      </div>

      <Separator />

      {/* 트리 리스트 영역 */}
      <div className="flex flex-col gap-2 min-h-[400px]">
        {!mounted ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent mb-4"></div>
             <p className="text-slate-400 font-bold">불러오는 중...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
            <Layers className="size-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-black">등록된 사업이 없습니다.</p>
            <Button variant="link" onClick={handleAddLv1} className="text-blue-600 font-bold mt-2">첫 번째 사업을 만들어보세요</Button>
          </div>
        ) : viewMode === 'gantt' ? (
          <GanttView />
        ) : (
          <>
            {renderProjectRows(null)}
            {renderOrphans()}
          </>
        )}
      </div>

      <ProjectDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        project={selectedProject}
        parentProject={parentProject}
        parentId={currentParentId}
        level={currentLevel}
      />

      {selectedSurveyProject && (
        <SurveyEntryDialog 
          open={surveyEntryDialogOpen}
          onOpenChange={setSurveyEntryDialogOpen}
          projectId={selectedSurveyProject.id}
          projectName={selectedSurveyProject.name}
          type={selectedSurveyType}
        />
      )}
    </div>
  );
}
