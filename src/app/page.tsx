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
  Wand2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectStore } from '@/store/use-project-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

export default function Home() {
  const [mounted, setMounted] = React.useState(false);
  
  // Stores
  const { projects, selectedLv1Ids, setSelectedLv1Ids, fetchProjects } = useProjectStore();
  const { categories, fetchBudgets } = useBudgetStore();
  const { getAggregatedStats, fetchSurveys } = useSurveyStore();
  const { partners, fetchPartners } = usePartnerStore();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");

  // 대시보드 선택된 사업과 동기화
  React.useEffect(() => {
    if (selectedLv1Ids.length > 0) {
      setSelectedProjectId(selectedLv1Ids[0]);
    } else {
      setSelectedProjectId("all");
    }
  }, [selectedLv1Ids, projects]);

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


  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 상단 헤더 (회의 관리 스타일 적용) */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-xl print:hidden">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Activity className="size-5 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-slate-900 tracking-tight whitespace-nowrap">대시보드</h1>
          </div>

          <div className="flex items-center gap-2 max-w-4xl w-full">
            <Select 
              key={`dashboard-select-${selectedProjectId}-${projects.length}`}
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
                      ? '전체 사업 통합 현황' 
                      : (projects.find(p => p.id === selectedProjectId)?.name || '사업 선택')
                    }
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold">전체 사업 통합 현황</SelectItem>
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
           <div className="bg-white/80 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2 shadow-sm">
              <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600">시스템 정상</span>
           </div>
           <Button className="rounded-lg h-9 px-4 bg-slate-900 hover:bg-slate-800 text-[11px] font-bold gap-2 shadow-md">
              <FileText className="size-3" /> 리포트 출력
           </Button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: '활성 사업 수', value: `${totalProjectsCount}건`, sub: '필터링 적용됨', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '누적 집행율', value: `${budgetExecutionRate.toFixed(1)}%`, sub: `₩${(totalSpent/1000000).toFixed(1)}M 집행`, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: '운영 만족도', value: `${avgSatisfaction.toFixed(2)}점`, sub: '5점 만점 기준', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '학습 효율(GAIN)', value: `${hakeGainPercent}%`, sub: '성과 환산 지표', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '협력 파트너', value: `${totalPartners}개사`, sub: '문서 보호 100%', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi, i) => (
          <Card key={i} className="border-none shadow-sm rounded-xl overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                 <div className={cn("p-1.5 rounded-lg", kpi.bg)}>
                    <kpi.icon className={cn("size-4", kpi.color)} />
                 </div>
                 <ArrowUpRight className="size-3 text-slate-300" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{kpi.label}</p>
              <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{kpi.value}</h3>
              <p className="text-[9px] font-medium text-slate-500 mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 기존 LV1 선택 카드 섹션 제거 - 상단 헤더로 통합됨 */}


      {/* 분석 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl border-none shadow-sm bg-white overflow-hidden min-h-[400px]">
          <CardHeader className="p-6 pb-0">
             <div className="flex justify-between items-end">
                <div>
                   <CardTitle className="text-[14px] font-bold tracking-tight">예산 효율성 및 성과 ROI 분석</CardTitle>
                   <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Budget Execution vs Performance Index</CardDescription>
                </div>
                <div className="flex gap-3">
                   <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-blue-500" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase">집행률</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase">성과지수</span>
                   </div>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
             {dashboardData.length > 0 ? (
               <div className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                         dataKey="name" 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} 
                         dy={5}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                      <Tooltip 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                         cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="executionRate" name="집행률(%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar dataKey="performance" name="성과지수(pt)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                  <BarChart3 className="size-10 opacity-10" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">데이터 부족</p>
               </div>
             )}
          </CardContent>
        </Card>

        {/* AI 브리핑 */}
        <Card className="rounded-2xl border-none shadow-sm bg-slate-900 text-white overflow-hidden flex flex-col p-6">
           <div className="flex items-center gap-2 mb-4">
              <Wand2 className="size-4 text-indigo-400" />
              <Badge className="bg-indigo-500/20 text-indigo-300 border-none font-bold text-[9px] uppercase tracking-wider">Seoul Executive AI</Badge>
           </div>
           <h2 className="text-[14px] font-bold tracking-tight mb-4">인공지능 성과 브리핑</h2>
           
           <div className="flex-1 space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm text-[11px] leading-relaxed font-medium text-indigo-100/90">
                 <p className="italic">
                    &quot;통합 분석 결과, 운영 만족도는 {avgSatisfaction.toFixed(2)}점이며, 
                    학습 효율(Gain)은 {hakeGainPercent}%입니다. 
                    {overallStats && overallStats.pValue < 0.05 ? '통계적으로 유의미한 성과가 입증되었으며, ' : ''}
                    주요 사업군에서 안정적인 ROI를 보이고 있습니다.&quot;
                 </p>
              </div>
              <ul className="space-y-2">
                 {[
                   "핵심 성과역량이 높은 사업은 협력사 문서 구비율 100%입니다.",
                   "잔여 예산 활용을 위한 하반기 심화 교육과정 배정을 추천합니다."
                 ].map((text, i) => (
                   <li key={i} className="flex gap-2">
                      <div className="size-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                         <div className="size-1 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-[11px] text-indigo-100/80">{text}</span>
                   </li>
                 ))}
              </ul>
           </div>
           <Button className="w-full h-10 mt-6 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-[11px] font-bold shadow-sm">
              상세 리포트 다운로드 
           </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
         <Card className="rounded-xl border-none shadow-sm bg-white p-6">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
               <TrendingUp className="size-3 text-emerald-500" /> 주요 비목 집행
            </h3>
            <div className="space-y-2">
               {categories.slice(0, 3).map((c, i) => (
                 <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-700">{c.name}</span>
                    <span className="text-[10px] font-bold text-blue-600">₩{(c.totalExpenditure/1000000).toFixed(1)}M</span>
                 </div>
               ))}
            </div>
         </Card>
         <Card className="lg:col-span-2 rounded-xl border-none shadow-sm bg-white p-6">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
               <Users className="size-3 text-amber-500" /> 협력 네트워크
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-[18px] font-bold text-slate-900">{partners.length}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">총 파트너</p>
                </div>
                <div>
                    <p className="text-[18px] font-bold text-emerald-600">{partners.filter(p => p.documents.length >= 3).length}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">증빙 완비</p>
                </div>
                <div>
                    <p className="text-[18px] font-bold text-blue-600">{projects.length}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">수행 사업</p>
                </div>
            </div>
         </Card>
      </div>
    </div>
  );
}
