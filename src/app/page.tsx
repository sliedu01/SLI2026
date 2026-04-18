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
import { useProjectStore } from '@/store/use-project-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { cn } from "@/lib/utils";

// Charts
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
  const { projects } = useProjectStore();
  const { categories, executions } = useBudgetStore();
  const { responses } = useSurveyStore();
  const { partners } = usePartnerStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 1. KPI 집계 데이터
  const totalProjects = projects.length;
  const totalBudget = categories.reduce((sum, c) => sum + c.totalBudget, 0);
  const totalSpent = categories.reduce((sum, c) => sum + c.totalExpenditure, 0);
  const budgetExecutionRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const totalPartners = partners.length;
  
  // 설문 만족도 집계
  const allSatisfactionScores = responses.flatMap(r => 
    r.answers
      .map(a => a.score)
      .filter((v): v is number => typeof v === 'number' && v > 0)
  );
  
  const avgSatisfaction = allSatisfactionScores.length > 0 
    ? (allSatisfactionScores.reduce((a, b) => a + b, 0) / allSatisfactionScores.length) 
    : 0;
  const satisfactionIndex = (avgSatisfaction / 5) * 100;

  // 2. 사업별 시각화 데이터
  const dashboardData = projects.filter(p => p.level === 1 || p.level === 4).map(p => {
    // 사업비 항목들 합산 (LV3 중 해당 프로젝트 ID가 있는 것)
    const projectExecutions = executions.filter(ex => ex.projectId === p.id);
    const pBudget = projectExecutions.reduce((s, ex) => s + ex.budgetAmount, 0);
    const pSpent = projectExecutions.reduce((s, ex) => s + ex.expenditureAmount, 0);
    const executionRate = pBudget > 0 ? (pSpent / pBudget) * 100 : 0;

    // 성과 지표
    const pResponses = responses.filter(r => r.projectId === p.id);
    const performance = pResponses.length > 0 ? 85 : 0; // 시뮬레이션

    return {
      name: p.name,
      executionRate: Number(executionRate.toFixed(1)),
      performance: performance,
      budget: pBudget,
      spent: pSpent,
      id: p.id
    };
  }).filter(d => d.budget > 0);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: '활성 사업 수', value: `${totalProjects}건`, sub: '전주 대비 +1', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '누적 집행율', value: `${budgetExecutionRate.toFixed(1)}%`, sub: `₩${(totalSpent/1000000).toFixed(1)}M 집행`, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: '평균 교육 성과', value: `${satisfactionIndex.toFixed(1)}점`, sub: '100점 만점 기준', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
                      &quot;시스템 분석 결과, 현재 통합 예산 집행률은 {budgetExecutionRate.toFixed(1)}%입니다. 
                      성과 지수 측면에서는 주요 사업군에서 안정적인 ROI를 기록 중입니다. 
                      차세대 DX 역량 강화 교육 사업의 성과가 전주 대비 향상되었습니다.&quot;
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
                    <span className="text-xs font-bold text-blue-600">₩{(c.totalExpenditure/1000000).toFixed(1)}M</span>
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
