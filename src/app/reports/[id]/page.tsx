'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/use-project-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowLeft, TrendingUp, Activity } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { calculateHakeGain, calculateCohensD } from '@/lib/stat-utils';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { projects } = useProjectStore();
  const { executions } = useBudgetStore();
  const { responses: surveys, templates } = useSurveyStore();

  const project = projects.find(p => p.id === projectId);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !project) return null;

  // 하위 사업들 포함 여부 파단 (LV2)
  const lv2Projects = projects.filter(p => p.parentId === project.id);
  
  // 재귀적으로 모든 하위 프로젝트 ID 가져오기
  const getAllChildIds = (pId: string): string[] => {
    const children = projects.filter(p => p.parentId === pId);
    let ids = children.map(c => c.id);
    children.forEach(c => {
      ids = [...ids, ...getAllChildIds(c.id)];
    });
    return ids;
  };

  // const allRelevantProjectIds = ... // Removed unused variable

  // 데이터 가공 및 통계 산출
  const getProjectStats = (pId: string, deep = false) => {
    const targetIds = deep ? [pId, ...getAllChildIds(pId)] : [pId];
    const pSurveys = surveys.filter(s => targetIds.includes(s.projectId));
    
    // 1. 역량 진단 통계 (Pre/Post)
    let compPreSum = 0;
    let compPostSum = 0;
    let compScoreCount = 0;
    const allPreScores: number[] = [];
    const allPostScores: number[] = [];
    let compRespondentCount = 0;

    // 2. 만족도 조사 통계 (Score only)
    let satSum = 0;
    let satScoreCount = 0;
    let satRespondentCount = 0;

    pSurveys.forEach(s => {
      const tmpl = templates.find(t => t.id === s.templateId);
      const isComp = tmpl?.type === 'COMPETENCY';
      
      if (isComp) compRespondentCount++;
      else satRespondentCount++;

      s.answers.forEach(ans => {
        if (ans.score !== undefined) {
          if (isComp) {
            compPreSum += ans.preScore || 0;
            compPostSum += ans.score || 0;
            allPreScores.push(ans.preScore || 0);
            allPostScores.push(ans.score || 0);
            compScoreCount++;
          } else {
            satSum += ans.score || 0;
            satScoreCount++;
          }
        }
      });
    });

    const avgCompPost = compScoreCount > 0 ? compPostSum / compScoreCount : 0;
    const avgCompPre = compScoreCount > 0 ? compPreSum / compScoreCount : 0;
    const hakeGain = calculateHakeGain(avgCompPre, avgCompPost);
    const cohensD = calculateCohensD(allPreScores, allPostScores);
    
    const avgSat = satScoreCount > 0 ? satSum / satScoreCount : 0;
    const normalizedSatScore = (avgSat / 5) * 100;

    // 예산 데이터 집계
    const projectExecutions = executions.filter(ex => ex.projectId && targetIds.includes(ex.projectId));
    const pBudget = projectExecutions.reduce((acc, ex) => acc + ex.budgetAmount, 0);
    const pSpent = projectExecutions.reduce((acc, ex) => acc + ex.expenditureAmount, 0);
    const execRate = pBudget > 0 ? (pSpent / pBudget) * 100 : 0;

    return { 
      normalizedSatScore,
      avgSat,
      execRate, 
      pBudget, 
      pSpent, 
      compRespondentCount,
      satRespondentCount,
      totalRespondentCount: pSurveys.length,
      hakeGain,
      cohensD,
      avgCompPre,
      avgCompPost
    };
  };

  const projectStats = getProjectStats(project.id, true);

  const chartData = lv2Projects.map(p => {
    const stats = getProjectStats(p.id, true);
    return {
      name: p.name,
      '만족도(100)': stats.normalizedSatScore,
      '역량향상(Gain)': stats.hakeGain * 100,
      '집행률(%)': stats.execRate
    };
  });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white p-4 md:p-10">
      {/* 액션 바 */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
        <Button variant="ghost" className="gap-2 font-bold" onClick={() => router.back()}>
          <ArrowLeft className="size-4" /> 돌아가기
        </Button>
        <div className="flex gap-2">
           <Button className="gap-2 font-black bg-slate-900" onClick={() => window.print()}>
             <Printer className="size-4" /> 보고서 인쇄 (PDF)
           </Button>
        </div>
      </div>

      {/* 보고서 본문 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none min-h-[297mm] p-[20mm] relative">
        <header className="border-b-[3px] border-slate-900 pb-10 mb-12">
           <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Final Performance Analysis</p>
           <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight mb-6">
             {project.name} <br/> 
             <span className="text-slate-400">종합 성과 분석 보고서</span>
           </h1>
           <div className="flex justify-between items-end">
              <div className="space-y-1">
                 <p className="text-sm font-bold text-slate-500">사업기간: {project.startDate} ~ {project.endDate}</p>
                 <p className="text-sm font-bold text-slate-500">작성일자: {new Date().toLocaleDateString()}</p>
              </div>
           </div>
        </header>

        {/* 01. 종합 지표 */}
        <section className="mb-16">
           <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
             <span className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center text-sm">01</span>
             핵심 성과 지표 (KPI & ROI)
           </h2>
           
           <div className="grid grid-cols-4 gap-6 mb-10">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">교육 만족도</p>
                 <p className="text-3xl font-black text-slate-900">{projectStats.normalizedSatScore.toFixed(1)}<span className="text-xs text-slate-400 ml-1">/100</span></p>
                 <p className="text-[10px] font-bold text-slate-400 mt-1">평균 {projectStats.avgSat.toFixed(2)}점</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">예산 집행률</p>
                 <p className="text-3xl font-black text-slate-900">{projectStats.execRate.toFixed(1)}%</p>
                 <p className="text-[10px] font-bold text-slate-400 mt-1">₩{(projectStats.pSpent/10000).toLocaleString()}만 지출</p>
              </div>
              <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Hake&apos;s Gain</p>
                 <p className="text-3xl font-black text-indigo-700">{projectStats.hakeGain.toFixed(2)}</p>
                 <p className="text-[10px] font-bold text-indigo-400 mt-1">잠재력 대비 성취도</p>
              </div>
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                 <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Cohen&apos;s d</p>
                 <p className="text-3xl font-black text-emerald-700">{projectStats.cohensD.toFixed(2)}</p>
                 <p className="text-[10px] font-bold text-emerald-400 mt-1">효과 크기 (Effect Size)</p>
              </div>
           </div>

           <div className="h-[250px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                   <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                   <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                   <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                   <Bar dataKey="만족도(100)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} />
                   <Bar dataKey="역량향상(Gain)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                   <Bar dataKey="집행률(%)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={15} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </section>

        {/* 02. 학술적 역량 분석 (NEW) */}
        <section className="mb-16">
           <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
             <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm">02</span>
             교육 성과 심층 분석 (Academic Analysis)
           </h2>
           <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-200/50">
              <div className="grid grid-cols-2 gap-12 items-center">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="size-4 text-orange-500" /> 통계적 유의성 및 효과 크기
                       </h4>
                       <p className="text-sm font-bold text-slate-600 leading-relaxed">
                          본 사업의 대응표본 분석 결과, Cohen&apos;s d 지수는 <span className="text-blue-600 font-black">{projectStats.cohensD.toFixed(2)}</span>로 산출되었습니다. 
                          이는 전통적인 기준에 따라 <span className="underline decoration-blue-200 decoration-4 font-black">&apos;{projectStats.cohensD >= 0.8 ? "매우 강력한" : projectStats.cohensD >= 0.5 ? "우수한" : "보통 수준의"}&apos;</span> 교육 효과가 있음을 나타냅니다.
                       </p>
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp className="size-4 text-blue-500" /> 잠재력 대비 성취도 (Hake&apos;s Gain)
                       </h4>
                       <p className="text-sm font-bold text-slate-600 leading-relaxed">
                          학습자가 도달할 수 있는 최대 성장 폭 대비 실무 역량 향상도는 <span className="text-indigo-600 font-black">{(projectStats.hakeGain * 100).toFixed(1)}%</span>로 집계되었습니다. 
                          이는 학습자의 초기 역량 수준에 관계없이 실질적인 임팩트를 제공했음을 의미합니다.
                       </p>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase mb-4">Competency Growth</p>
                    <div className="flex items-end gap-6 h-32">
                       <div className="flex flex-col items-center gap-2">
                          <div className="w-12 bg-slate-200 rounded-t-xl" style={{ height: `${projectStats.avgCompPre * 20}px` }}></div>
                          <span className="text-[10px] font-black text-slate-400">PRE</span>
                       </div>
                       <div className="flex flex-col items-center gap-2">
                          <div className="w-12 bg-blue-600 rounded-t-xl" style={{ height: `${projectStats.avgCompPost * 20}px` }}></div>
                          <span className="text-[10px] font-black text-blue-600">POST</span>
                       </div>
                    </div>
                    <Badge className="mt-6 bg-blue-50 text-blue-600 border-none font-black px-4">+{(projectStats.avgCompPost - projectStats.avgCompPre).toFixed(2)} Point Up</Badge>
                 </div>
              </div>
           </div>
        </section>

        {/* 03. 하위 사업 성과 내역 */}
        <section className="mt-12">
            <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm">03</span>
              세부 운영 사업별 실적
            </h2>
            <div className="space-y-6">
                {lv2Projects.map((p, idx) => {
                    const stats = getProjectStats(p.id, true);
                    return (
                        <div key={p.id} className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all">
                           <div className="flex justify-between items-center mb-6">
                              <h3 className="font-black text-slate-800">{idx+1}. {p.name}</h3>
                           </div>
                           <div className="grid grid-cols-5 gap-4">
                              <div className="text-center">
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">만족도</p>
                                 <p className="text-base font-black text-emerald-600">{stats.normalizedSatScore.toFixed(1)}</p>
                              </div>
                              <div className="text-center">
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Gain</p>
                                 <p className="text-base font-black text-blue-600">{stats.hakeGain.toFixed(2)}</p>
                              </div>
                              <div className="text-center">
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">집행률</p>
                                 <p className="text-base font-black text-slate-700">{stats.execRate.toFixed(1)}%</p>
                              </div>
                              <div className="text-center">
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">투입예산</p>
                                 <p className="text-base font-black text-slate-700">₩{(stats.pBudget/10000).toLocaleString()}만</p>
                              </div>
                              <div className="text-center">
                                 <p className="text-[9px] font-black text-slate-400 uppercase mb-1">총 인원</p>
                                 <p className="text-base font-black text-slate-700">{stats.totalRespondentCount}명</p>
                              </div>
                           </div>
                        </div>
                    );
                })}
            </div>
        </section>

        <footer className="absolute bottom-[20mm] left-[20mm] right-[20mm] pt-10 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <div>© 2026 Seoul Management System</div>
           <div>Page 01 / 01</div>
        </footer>
      </div>
    </div>
  );
}
