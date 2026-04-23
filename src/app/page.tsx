'use client';

import * as React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Wallet,
  ArrowUpRight,
  LayoutGrid,
  Activity,
  Zap,
  FileText,
  Building2,
  Wand2,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectStore, Project } from '@/store/use-project-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { cn } from "@/lib/utils";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { ProjectDialog } from '@/components/project-dialog';
import { Edit2, Trash2, PlusCircle, CheckSquare, Square } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Home() {
  const [mounted, setMounted] = React.useState(false);
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'add' | 'edit'>('add');
  const [selectedProject, setSelectedProject] = React.useState<Project | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [projectToDelete, setProjectToDelete] = React.useState<string | null>(null);

  // Stores
  const { projects, selectedLv1Ids, setSelectedLv1Ids, deleteProject, fetchProjects } = useProjectStore();
  const { categories, expenditures, fetchBudgets, managements } = useBudgetStore();
  const { responses, getAggregatedStats, fetchSurveys } = useSurveyStore();
  const { partners, fetchPartners } = usePartnerStore();

  React.useEffect(() => {
    setMounted(true);
    fetchProjects();
    fetchBudgets();
    fetchSurveys();
    fetchPartners();
  }, [fetchProjects, fetchBudgets, fetchSurveys, fetchPartners]);

  if (!mounted) return null;

  // 0. 프로젝트 필터링 로직
  const lv1Projects = projects.filter(p => p.level === 1);
  
  // 선택된 사업이 없으면 전체 선택으로 간주하거나, 비어있는 상태로 유지
  // 여기서는 사용자가 명시적으로 선택한 것만 필터링하거나, 아무것도 선택 안 했으면 전체를 보여줌
  const effectiveSelectedIds = selectedLv1Ids.length > 0 ? selectedLv1Ids : lv1Projects.map(p => p.id);

  // 선택된 LV1 프로젝트의 모든 하위 프로젝트 ID 수집
  const getDescendantIds = (parentIds: string[]): string[] => {
    let result = [...parentIds];
    const children = projects.filter(p => p.parentId && parentIds.includes(p.parentId));
    if (children.length > 0) {
      result = [...result, ...getDescendantIds(children.map(c => c.id))];
    }
    return result;
  };

  const filteredProjectIds = getDescendantIds(effectiveSelectedIds);
  const filteredProjects = projects.filter(p => filteredProjectIds.includes(p.id));

  // 1. KPI 집계 데이터 (필터링 반영)
  const totalProjectsCount = filteredProjects.length;
  
  // 예산 데이터 필터링
  // BudgetCategory -> Project mapping (Category has projectId)
  const filteredCategories = categories.filter(c => c.projectId && effectiveSelectedIds.includes(c.projectId));
  const totalBudget = filteredCategories.reduce((sum, c) => sum + c.totalBudget, 0);
  const totalSpent = filteredCategories.reduce((sum, c) => sum + c.totalExpenditure, 0);
  const budgetExecutionRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // 파트너는 전체 유지 (또는 필터링된 프로젝트에 참여 중인 파트너만?)
  // 여기서는 시스템 전체 파트너 유지
  const totalPartners = partners.length;
  
  // 전문가 성과 지산 기반 통계 집계 (필터링된 프로그램 단위 전체 합산)
  const programProjectIds = filteredProjects.filter(p => p.level === 4).map(p => p.id);
  const surveyStats = getAggregatedStats(projects, programProjectIds, undefined, 'UNIFIED');
  const overallStats = surveyStats['_overall'];

  const avgSatisfaction = overallStats?.satAvg || 0;
  const hakeGainPercent = Math.round((overallStats?.hakeGain || 0) * 100);

  // 2. 사업별 시각화 데이터 (선택된 LV1들만)
  const dashboardData = lv1Projects
    .filter(p => effectiveSelectedIds.includes(p.id))
    .map(p => {
      const descendants = getDescendantIds([p.id]);
      
      // 해당 LV1 및 하위 프로젝트들의 예산 집계
      const projectCats = categories.filter(c => c.projectId && descendants.includes(c.projectId));
      const pBudget = projectCats.reduce((s, c) => s + c.totalBudget, 0);
      const pSpent = projectCats.reduce((s, c) => s + c.totalExpenditure, 0);
      const executionRate = pBudget > 0 ? (pSpent / pBudget) * 100 : 0;

      // 성과 지표: 하위 프로그램들의 평균 Gain
      const pStats = surveyStats[p.id];
      const performance = pStats ? Math.round(pStats.hakeGain * 100) : 0;

      return {
        name: p.name,
        executionRate: Number(executionRate.toFixed(2)),
        performance: performance,
        budget: pBudget,
        spent: pSpent,
        id: p.id
      };
    });

  const toggleLv1 = (id: string) => {
    if (selectedLv1Ids.includes(id)) {
      setSelectedLv1Ids(selectedLv1Ids.filter(sid => sid !== id));
    } else {
      setSelectedLv1Ids([...selectedLv1Ids, id]);
    }
  };

  const handleAddLv1 = () => {
    setDialogMode('add');
    setSelectedProject(undefined);
    setIsDialogOpen(true);
  };

  const handleEditLv1 = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setDialogMode('edit');
    setSelectedProject(project);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setProjectToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete);
      setProjectToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* 상단 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/20">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
             <Activity className="size-10 text-indigo-600" /> 통합 운영 상황판
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" /> Operational Intelligence & ROI Dashboard
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
           <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-black text-slate-600">시스템 정상 작동 중</span>
           </div>
           <Button className="rounded-2xl h-12 px-6 bg-slate-900 font-black gap-2 shadow-xl shadow-slate-200">
              <FileText className="size-4" /> 전체 리포트 출력
           </Button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: '활성 사업 수', value: `${totalProjectsCount}건`, sub: '필터링 적용됨', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '누적 집행율', value: `${budgetExecutionRate.toFixed(2)}%`, sub: `₩${(totalSpent/1000000).toFixed(2)}M 집행`, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: '운영 만족도 (AVG)', value: `${avgSatisfaction.toFixed(2)}점`, sub: '5점 만점 기준', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '학습 효율 및 전이도 (GAIN)', value: `${hakeGainPercent}%`, sub: 'Hake\'s Gain 성과 환산', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '협력 파트너', value: `${totalPartners}개사`, sub: '문서 보호 100%', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi, i) => (
          <Card key={i} className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                 <div className={cn("p-3 rounded-2xl", kpi.bg)}>
                    <kpi.icon className={cn("size-6", kpi.color)} />
                 </div>
                 <ArrowUpRight className="size-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-2">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 프로젝트 관리 및 선택 */}
      <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden p-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <CheckSquare className="size-6 text-indigo-600" /> 사업 선택 및 관리 (LV1)
            </h2>
            <p className="text-sm font-medium text-slate-400 mt-1">분석 및 관리를 진행할 LV1 사업을 선택하세요. (신규 등록 및 수정 가능)</p>
          </div>
          <Button onClick={handleAddLv1} className="rounded-2xl h-12 bg-slate-900 font-black gap-2 px-6">
            <PlusCircle className="size-4" /> 신규 LV1 사업 등록
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lv1Projects.map(p => {
            const isSelected = selectedLv1Ids.includes(p.id);
            return (
              <div 
                key={p.id}
                onClick={() => toggleLv1(p.id)}
                className={cn(
                  "relative p-6 rounded-3xl border-2 transition-all cursor-pointer group",
                  isSelected 
                    ? "border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-50" 
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckSquare className="size-6 text-indigo-600" />
                    ) : (
                      <Square className="size-6 text-slate-300" />
                    )}
                    <span className="font-black text-slate-900 text-lg tracking-tight">{p.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => handleEditLv1(e, p)}
                      className="size-8 rounded-lg hover:bg-white hover:text-indigo-600"
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => handleDeleteClick(e, p.id)}
                      className="size-8 rounded-lg hover:bg-white hover:text-rose-600"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-[11px] font-bold text-slate-400">
                  <span>{p.startDate} ~ {p.endDate}</span>
                  <div className="size-1 rounded-full bg-slate-300" />
                  <span>하위 {projects.filter(cp => cp.parentId === p.id).length}개 사업</span>
                </div>
              </div>
            );
          })}
          {lv1Projects.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-3xl">
              등록된 LV1 사업이 없습니다.
            </div>
          )}
        </div>
      </Card>

      <ProjectDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        mode={dialogMode}
        project={selectedProject}
        level={1}
        parentId={null}
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md p-8 rounded-[2rem]">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
               사업 삭제 확인
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 mt-2">
              이 사업을 삭제하시겠습니까? 해당 사업에 속한 모든 하위 사업과 예산, 지출 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl font-black">취소</Button>
            <Button onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black px-8">삭제 실행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 분석 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden min-h-[550px]">
          <CardHeader className="p-10 pb-0">
             <div className="flex justify-between items-end">
                <div>
                   <CardTitle className="text-2xl font-black tracking-tight">예산 효율성 및 성과 ROI 분석</CardTitle>
                   <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Budget Execution vs Performance Index (100pt Norm)</CardDescription>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">집행률</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase">성과지수</span>
                   </div>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-10 h-[400px]">
             {dashboardData.length > 0 ? (
               <div className="h-[400px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                         dataKey="name" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} 
                         dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip 
                         contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }}
                         cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="executionRate" name="집행률(%)" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={32} />
                      <Bar dataKey="performance" name="성과지수(pt)" fill="#10b981" radius={[10, 10, 0, 0]} barSize={32} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                  <BarChart3 className="size-16 opacity-10" />
                  <p className="text-xs font-black uppercase tracking-widest">분석을 위한 프로젝트 데이터가 부족합니다.</p>
               </div>
             )}
          </CardContent>
        </Card>

        {/* AI 브리핑 */}
        <Card className="rounded-[3.5rem] border-none shadow-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white overflow-hidden flex flex-col">
          <CardHeader className="p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 size-40 bg-indigo-500/20 rounded-full blur-[60px] -mr-20 -mt-20" />
             <div className="flex items-center gap-3 mb-2 relative z-10">
                <Wand2 className="size-5 text-indigo-400" />
                <Badge className="bg-indigo-500/20 text-indigo-300 border-none font-black text-[9px] uppercase tracking-widest">Seoul Executive AI</Badge>
             </div>
             <CardTitle className="text-2xl font-black tracking-tight relative z-10">인공지능 성과 브리핑</CardTitle>
          </CardHeader>
          <CardContent className="px-10 flex-1 relative z-10">
             <div className="space-y-6 text-indigo-100/90 leading-relaxed font-medium text-sm">
                <div className="p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                   <p className="italic">
                      &quot;통합 성과 분석 결과, 현재 대시보드 기준 운영 만족도는 {avgSatisfaction.toFixed(2)}점이며, 
                      학습 효율(Gain)은 {hakeGainPercent}%를 기록하고 있습니다. 
                      {overallStats && overallStats.pValue < 0.05 ? '통계적으로 유의미한 육성 성과가 입증되었으며, ' : ''}
                      주요 사업군에서 안정적인 ROI를 보이고 있습니다. 차세대 역량 강화 사업의 성취도가 특히 향상되었습니다.&quot;
                   </p>
                </div>
                <ul className="space-y-4">
                   <li className="flex gap-3">
                      <div className="size-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                         <div className="size-1.5 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-[13px]">핵심 성과역량이 높은 사업은 협력사와의 문서 구비율이 100%입니다.</span>
                   </li>
                   <li className="flex gap-3">
                      <div className="size-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                         <div className="size-1.5 rounded-full bg-blue-400" />
                      </div>
                      <span className="text-[13px]">잔여 예산 활용을 위한 하반기 심화 교육과정 배정을 추천합니다.</span>
                   </li>
                </ul>
             </div>
          </CardContent>
          <div className="p-10 mt-auto">
             <Button 
                onClick={() => window.print()}
                className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black gap-2 transition-all shadow-2xl shadow-indigo-500/20"
             >
                상세 인사이트 리포트 다운로드 
             </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-8">
               <TrendingUp className="size-4 text-emerald-500" /> 주요 비목 집행 현황
            </h3>
            <div className="space-y-4">
               {categories.slice(0, 3).map((c, i) => (
                 <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50">
                    <span className="text-xs font-black text-slate-700">{c.name}</span>
                    <span className="text-xs font-bold text-blue-600">₩{(c.totalExpenditure/1000000).toFixed(2)}M</span>
                 </div>
               ))}
            </div>
         </Card>
         <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl bg-white p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-8">
               <Users className="size-4 text-amber-500" /> 협력 네트워크 통계
            </h3>
            <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col items-center">
                    <p className="text-2xl font-black text-slate-900">{partners.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">총 파트너 수</p>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-2xl font-black text-emerald-600">{partners.filter(p => p.documents.length >= 3).length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">증빙 완비</p>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-2xl font-black text-blue-600">{projects.length}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">수행 사업</p>
                </div>
            </div>
         </Card>
      </div>
    </div>
  );
}
