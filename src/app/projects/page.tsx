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

import { useSearchParams } from 'next/navigation';

export default function ProjectsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">로딩 중...</div>}>
      <ProjectsPageContent />
    </React.Suspense>
  );
}

import { ProjectSession } from '@/store/use-project-store';

function ProjectsPageContent() {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => { setHasMounted(true); }, []);
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');

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
  const { fetchPartners } = usePartnerStore();

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
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");

  const { setSelectedLv1Ids } = useProjectStore();

  // 대시보드 선택된 사업과 동기화
  React.useEffect(() => {
    if (selectedLv1Ids.length > 0) {
      setSelectedProjectId(selectedLv1Ids[0]);
    } else {
      setSelectedProjectId("all");
    }
  }, [selectedLv1Ids, projects]);

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  // 하이드레이션 오류 방지 및 초기 데이터 로딩
  React.useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      await fetchProjects();
      await fetchPartners();
    };
    loadData();
  }, [fetchProjects, fetchPartners]);

  // editId 파라미터 처리
  React.useEffect(() => {
    if (mounted && editId && projects.length > 0) {
      const project = projects.find(p => p.id === editId);
      if (project) {
        setDialogMode('edit');
        setSelectedProject(project);
        setParentProject(undefined);
        setCurrentLevel(project.level);
        setIsDialogOpen(true);
      }
    }
  }, [mounted, editId, projects]);

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
    const getAllDescendantIds = (parentId: string): string[] => {
      const children = projects.filter(child => child.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...getAllDescendantIds(c.id)];
      });
      return ids;
    };

    const descendantIds = getAllDescendantIds(p.id);
    const uniquePartnerCount = new Set(
      projects
        .filter(proj => descendantIds.includes(proj.id) && proj.partnerId && proj.partnerId !== 'none')
        .map(proj => proj.partnerId)
    ).size;

    const { getAggregatedStats } = useSurveyStore();
    const satisfactionStats = getAggregatedStats(projects, [p.id], undefined, 'SATISFACTION');
    const competencyStats = getAggregatedStats(projects, [p.id], undefined, 'COMPETENCY');

    const avgSatisfaction = satisfactionStats[p.id]?.avg || 0;
    const avgScore = competencyStats[p.id]?.avg || 0;
    const avgGain = avgScore > 0 ? avgScore : 0;

    const partner = partners.find(ptr => ptr.id === p.partnerId);

    return (
      <div 
        className={cn(
          "group flex items-center justify-between p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100",
          depth === 1 && "ml-2 bg-slate-50/50",
          depth === 2 && "ml-4 bg-slate-100/30",
          depth === 3 && "ml-6 bg-slate-200/20"
        )}
      >
        <div className="flex items-center gap-2">
          {(p.level < 4 || (p.sessions && p.sessions.length > 0)) ? (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(p.id);
              }}
              className="p-0.5 hover:bg-slate-200 rounded transition-colors"
            >
              {expandedIds.has(p.id) ? (
                <ChevronDown className="size-3 text-slate-500" />
              ) : (
                <ChevronRight className="size-3 text-slate-500" />
              )}
            </button>
          ) : (
            <div className="size-4 shrink-0" />
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "font-bold tracking-tight text-[11px]",
                p.level === 1 ? "text-slate-900" : "text-slate-700"
              )}>
                {p.name}
              </span>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[7px] font-bold uppercase text-slate-400 border-slate-200 h-3.5 px-1">Lv {p.level}</Badge>
                {partner && (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[8px] h-3.5 px-1">
                    {partner.name}
                  </Badge>
                )}
                <div className="flex items-center gap-1 ml-1 py-0 px-1 bg-slate-100/50 rounded">
                   <span className="text-[8px] font-bold text-slate-400 uppercase">참가</span>
                   <span className="text-[10px] font-bold text-blue-600">{p.participantCount?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-medium">
                 <Calendar className="size-2.5" />
                 {p.startDate} ~ {p.endDate}
              </div>
              {p.level <= 2 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-1 py-0 bg-blue-50/80 rounded border border-blue-100">
                    <span className="text-[7px] font-bold text-blue-500 uppercase tracking-tight">협력사 {uniquePartnerCount}</span>
                  </div>
                  {avgSatisfaction > 0 && (
                    <div className="flex items-center gap-1 px-1 py-0 bg-amber-50/80 rounded border border-amber-100">
                      <span className="text-[7px] font-bold text-amber-500 uppercase tracking-tight">만족도 {avgSatisfaction.toFixed(2)}</span>
                    </div>
                  )}
                  {avgGain !== 0 && (
                    <div className="flex items-center gap-1 px-1 py-0 bg-emerald-50/80 rounded border border-emerald-100">
                      <span className="text-[7px] font-bold text-emerald-500 uppercase tracking-tight">성과 +{avgGain.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {p.level < 4 && (
            <Button 
              variant="ghost" 
              size="icon" 
              type="button"
              className="size-6 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => handleAddChild(p)}
            >
              <Plus className="size-3.5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-6 text-emerald-600 hover:bg-emerald-50 rounded"
            onClick={() => {
              setSelectedSurveyProject(p);
              setSelectedSurveyType('SATISFACTION');
              setSurveyEntryDialogOpen(true);
            }}
          >
            <ClipboardCheck className="size-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-6 text-blue-600 hover:bg-blue-50 rounded"
            onClick={() => {
              setSelectedSurveyProject(p);
              setSelectedSurveyType('COMPETENCY');
              setSurveyEntryDialogOpen(true);
            }}
          >
            <Activity className="size-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-6 text-indigo-400 hover:bg-indigo-50 rounded"
            onClick={() => {
              if (confirm('전체 정보를 복사하시겠습니까?')) copyProject(p.id);
            }}
          >
            <Copy className="size-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-6 text-slate-400 hover:bg-slate-100 rounded"
            onClick={() => handleEdit(p)}
          >
            <Pencil className="size-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="size-6 text-red-400 hover:bg-red-50 rounded"
            onClick={() => {
              if(confirm('정말 삭제하시겠습니까?')) deleteProject(p.id);
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    );
  };

  const SessionRow = ({ session, index, depth }: { session: ProjectSession, index: number, depth: number }) => {
    return (
      <div 
        className={cn(
          "group flex items-center justify-between p-2 rounded-lg transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100",
          depth === 1 && "ml-2 bg-slate-50/50",
          depth === 2 && "ml-4 bg-slate-100/30",
          depth === 3 && "ml-6 bg-slate-200/20",
          depth >= 4 && "ml-8 bg-slate-50/30"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="size-4 shrink-0" />
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-[11px] text-slate-600">
                {session.content || `교육일정 ${index + 1}회차`}
              </span>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[7px] font-bold uppercase text-slate-400 border-slate-200 h-3.5 px-1">
                  {index + 1}차시
                </Badge>
                <div className="flex items-center gap-1 ml-1 py-0 px-1 bg-slate-100/50 rounded">
                   <span className="text-[8px] font-bold text-slate-400 uppercase">참가</span>
                   <span className="text-[10px] font-bold text-blue-600">{session.participantCount?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-medium">
                 <Calendar className="size-2.5" />
                 {session.startDate} {session.startTime} ~ {session.endDate} {session.endTime}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectRows = (parentId: string | null, depth: number = 0) => {
    const sorted = getSortedProjects(parentId);
    const displayProjects = depth === 0 
      ? sorted.filter(p => p.level === 1 && (selectedLv1Ids.length === 0 || selectedLv1Ids.includes(p.id))) 
      : sorted;

    return (
      <div className="flex flex-col gap-1">
        {displayProjects.map((p) => (
          <React.Fragment key={p.id}>
            <ProjectRow p={p} depth={depth} />
            {expandedIds.has(p.id) && p.sessions && p.sessions.length > 0 && (
              <div className="flex flex-col gap-1">
                {p.sessions.map((session, index) => (
                  <SessionRow key={session.id} session={session} index={index} depth={depth + 1} />
                ))}
              </div>
            )}
            {expandedIds.has(p.id) && renderProjectRows(p.id, depth + 1)}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderOrphans = () => {
    const orphans = projects.filter(p => p.parentId === null && p.level > 1);
    if (orphans.length === 0) return null;
    if (!hasMounted) return null;
  return (
      <div className="mt-8 bg-red-50/20 rounded-xl p-4 border border-dashed border-red-200">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="size-4 text-red-500" />
          <h2 className="text-[11px] font-bold text-red-900 uppercase">미지정 보관함</h2>
        </div>
        <div className="flex flex-col gap-1">
          {orphans.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-red-50">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700">{p.name}</span>
                <span className="text-[8px] px-1 py-0.5 rounded-full bg-red-100 text-red-500 font-bold">Lv {p.level}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-7 text-slate-400" onClick={() => handleEdit(p)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-red-400" onClick={() => { if(confirm('삭제하시겠습니까?')) deleteProject(p.id); }}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const GanttView = () => {
    const filteredProjects = projects.filter(p => {
      if (selectedLv1Ids.length === 0) return true;
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
      <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-[11px] font-bold text-slate-400">
         타임라인 데이터 없음
      </div>
    );

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="flex border-b border-slate-100 bg-slate-50/50 sticky top-0 z-20">
          <div className="w-[200px] shrink-0 p-3 border-r border-slate-100 font-bold text-[9px] text-slate-400 uppercase tracking-wider flex items-center">
            사업 리스트
          </div>
          <div className="flex-1 flex relative h-10">
            {months.map((m, i) => (
              <div key={i} className="flex-1 border-l border-slate-100/50 flex flex-col items-center justify-center">
                <span className="font-bold text-[9px] text-slate-600">{m.getMonth() + 1}월</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredProjects.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(p => {
             const left = getPos(p.startDate);
             const right = getPos(p.endDate);
             const width = Math.max(right - left, 2);
             return (
              <div key={p.id} className="flex border-b border-slate-50 hover:bg-slate-50/50 group">
                <div className="w-[200px] shrink-0 p-3 border-r border-slate-50 flex flex-col gap-0.5 overflow-hidden">
                   <div className="flex items-center gap-1.5">
                      <Badge className="text-[7px] h-3 px-1 border-none bg-slate-100 text-slate-500">LV{p.level}</Badge>
                      <span className="text-[10px] font-bold text-slate-700 truncate">{p.name}</span>
                   </div>
                </div>
                <div className="flex-1 relative h-12 flex items-center">
                   <div className="absolute inset-0 flex">
                      {months.map((_, i) => (
                        <div key={i} className="flex-1 border-l border-slate-50/30 h-full" />
                      ))}
                   </div>
                   <div 
                     className={cn(
                       "h-5 rounded-full shadow-sm relative z-10 flex items-center px-2 cursor-pointer",
                       p.level === 1 ? "bg-indigo-600" : p.level === 2 ? "bg-blue-400" : "bg-slate-400"
                     )}
                     style={{ marginLeft: `${left}%`, width: `${width}%` }}
                     onClick={() => handleEdit(p)}
                   >
                      <span className="text-[8px] font-bold text-white truncate whitespace-nowrap overflow-hidden">
                        {p.name}
                      </span>
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
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
      {/* 액션 바 (회의 관리 스타일 적용) */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-xl print:hidden">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Layers className="size-5 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-slate-900 tracking-tight whitespace-nowrap">사업관리</h1>
          </div>

          <div className="flex items-center gap-2 max-w-4xl w-full">
            <Select 
              key={`projects-select-${selectedProjectId}-${projects.length}`}
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
                      ? '전체 사업 목록' 
                      : (projects.find(p => p.id === selectedProjectId)?.name || '사업 선택')
                    }
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold">전체 사업 목록</SelectItem>
                {projects.filter(p => p.level === 1).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-[11px] font-bold">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100/50 p-1 rounded-lg mr-1 shadow-sm border border-slate-200/50">
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('list')}
              className="h-7 text-[10px] font-bold rounded-md px-3"
            >
              리스트
            </Button>
            <Button 
              variant={viewMode === 'gantt' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('gantt')}
              className="h-7 text-[10px] font-bold rounded-md px-3"
            >
              타임라인
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-lg border px-3 h-9 shadow-sm">
            <Search className="size-3 text-slate-400" />
            <Input 
              placeholder="검색..." 
              className="border-none bg-transparent h-6 w-32 focus-visible:ring-0 font-medium text-[11px]"
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
            <SelectTrigger className="w-[110px] h-9 bg-white shadow-sm font-bold text-[10px] rounded-lg border-slate-200">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="name-asc" className="text-[11px] font-bold">이름↑</SelectItem>
              <SelectItem value="name-desc" className="text-[11px] font-bold">이름↓</SelectItem>
              <SelectItem value="date-asc" className="text-[11px] font-bold">날짜↑</SelectItem>
              <SelectItem value="date-desc" className="text-[11px] font-bold">날짜↓</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={handleAddLv1} 
            className="rounded-lg h-9 bg-slate-900 hover:bg-slate-800 font-bold gap-1.5 px-4 text-[11px] shadow-md"
          >
            <Plus className="size-3.5" /> 
            신규 사업 등록
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-1 min-h-[300px]">
        {!mounted ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mb-2"></div>
             <p className="text-[11px] text-slate-400 font-bold">로딩 중...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
            <Layers className="size-8 text-slate-200 mb-2" />
            <p className="text-[11px] text-slate-400 font-bold">등록된 사업이 없습니다.</p>
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
