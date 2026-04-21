'use client';

import * as React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Wallet,
  Receipt,
  FileText,
  PlusCircle,
  Clock,
  Download,
  Building2,
  BarChart4,
  ArrowRight,
  Settings2,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgetStore } from '@/store/use-budget-store';
import { useProjectStore } from '@/store/use-project-store';
import { ExpenditureDialog } from '@/components/expenditure-dialog';
import { CategoryManagementDialog } from '@/components/budget/category-management-dialog';
import { cn } from '@/lib/utils';
// import { exportToExcel } from '@/lib/excel-export'; // Unused in this file
import { generateSettlementPDF } from '@/lib/pdf-settlement';

export default function BudgetPage() {
  const [mounted, setMounted] = React.useState(false);
  const { 
    categories, 
    managements, 
    executions, 
    expenditures, 
    addCategory, 
    addManagement, 
    addExecution, 
    fetchBudgets,
    syncBudgets 
  } = useBudgetStore();
  const { projects } = useProjectStore();

  const [expandedCats, setExpandedCats] = React.useState<Set<string>>(new Set());
  const [expandedMans, setExpandedMans] = React.useState<Set<string>>(new Set());
  const [selectedExecutionId, setSelectedExecutionId] = React.useState<string | null>(null);
  
  // 다이얼로그 상태
  const [expenditureDialogOpen, setExpenditureDialogOpen] = React.useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    fetchBudgets(); // fetchBudgets가 syncBudgets를 호출함
  }, [fetchBudgets]);

  if (!mounted) return null;

  const totalCatBudget = categories.reduce((sum, c) => sum + c.totalBudget, 0);
  const totalCatSpent = categories.reduce((sum, c) => sum + c.totalExpenditure, 0);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMan = (id: string) => {
    setExpandedMans(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedExecution = executions.find(e => e.id === selectedExecutionId);
  const relevantExpenditures = selectedExecutionId 
    ? expenditures.filter(exp => exp.executionId === selectedExecutionId)
    : [];

  return (
    <div className="flex bg-slate-50/50 rounded-[3rem] border border-slate-200/60 overflow-hidden h-[calc(100vh-140px)] animate-in fade-in duration-700 shadow-2xl shadow-slate-200/20">
      {/* 좌측: 3계층 예산 트리 */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl z-10">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <Wallet className="size-4 text-blue-600" /> 예산 관리 체계
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  const name = prompt('새 비목(LV1) 명칭을 입력하세요 (예: 인건비, 사업비)');
                  if(name) addCategory(name);
                }}
                className="size-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
              >
                <Plus className="size-4" />
              </Button>
           </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Framework Budget</p>
                 <p className="text-xl font-black text-slate-900 leading-none">₩ {totalCatBudget.toLocaleString()}</p>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((totalCatSpent / (totalCatBudget || 1)) * 100, 100)}%` }} />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setCategoryManagementOpen(true)}
                className="w-full rounded-xl text-[10px] h-9 font-black uppercase border-slate-100 text-slate-400 hover:text-slate-900 gap-2 mt-2"
              >
                <Settings2 className="size-3" /> 계층 구조(L1/L2) 관리
              </Button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
           {categories.length === 0 ? (
             <div className="py-20 text-center flex flex-col items-center gap-4">
                <BarChart4 className="size-12 text-slate-100" />
                <p className="text-[11px] font-bold text-slate-300 px-10 leading-relaxed uppercase">상단의 + 버튼을 눌러 예산 체계(비목)를 구축하세요.</p>
             </div>
           ) : categories.map(cat => (
             <div key={cat.id} className="space-y-1">
                {/* LV1: Category */}
                <div 
                  onClick={() => toggleCat(cat.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border",
                    expandedCats.has(cat.id) ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white border-slate-100 hover:border-slate-300 text-slate-700"
                  )}
                >
                   <div className="flex items-center gap-2 overflow-hidden">
                      {expandedCats.has(cat.id) ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      <span className="text-xs font-black truncate">{cat.name}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold opacity-60">₩ {(cat.totalBudget / 10000).toLocaleString()}만</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const name = prompt(`${cat.name} 하위의 관리세목(LV2)을 입력하세요`);
                          if(name) addManagement(cat.id, name);
                        }}
                        className="size-6 bg-white/20 hover:bg-white/40 rounded-md text-white border-none"
                      >
                         <Plus className="size-3" />
                      </Button>
                   </div>
                </div>

                {/* LV2: Management */}
                {expandedCats.has(cat.id) && (
                  <div className="ml-4 pl-4 border-l border-slate-200 mt-1 space-y-1">
                     {managements.filter(m => m.categoryId === cat.id).map(man => (
                        <div key={man.id} className="space-y-1">
                           <div 
                             onClick={() => toggleMan(man.id)}
                             className={cn(
                               "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-default transition-all border",
                               expandedMans.has(man.id) ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-white border-slate-50 hover:bg-slate-50 text-slate-600"
                             )}
                           >
                              <div className="flex items-center gap-2 overflow-hidden cursor-pointer">
                                 {expandedMans.has(man.id) ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                                 <span className="text-[11px] font-black truncate">{man.name}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const name = prompt(`${man.name} 하위의 세세목(LV3)을 입력하세요`);
                                  const budget = prompt('할당할 예산 금액을 입력하세요 (숫자만)');
                                  const projectId = prompt('연동할 사업 ID가 있다면 입력하세요 (없으면 엔터)');
                                  if(name && budget) addExecution(man.id, { 
                                    name, 
                                    budgetAmount: Number(budget),
                                    projectId: projectId || undefined 
                                  });
                                }}
                                className="size-5 text-blue-400 hover:text-blue-600"
                              >
                                 <PlusCircle className="size-3.5" />
                              </Button>
                           </div>

                           {/* LV3: Execution */}
                           {expandedMans.has(man.id) && (
                             <div className="ml-2 pl-3 border-l border-slate-100 mt-0.5 space-y-1">
                                {executions.filter(ex => ex.managementId === man.id).map(ex => (
                                   <div 
                                      key={ex.id}
                                      onClick={() => setSelectedExecutionId(ex.id)}
                                      className={cn(
                                        "flex flex-col p-3 rounded-lg border transition-all cursor-pointer",
                                        selectedExecutionId === ex.id 
                                          ? "bg-white border-blue-500/30 shadow-md ring-1 ring-blue-500/10" 
                                          : "bg-white/50 border-transparent hover:border-slate-200"
                                      )}
                                   >
                                      <div className="flex justify-between items-center mb-1">
                                         <span className="text-[10px] font-black text-slate-800">{ex.name}</span>
                                         {ex.projectId && <Badge className="text-[8px] bg-blue-50 text-blue-600 border-none px-1 h-3.5">PROJ</Badge>}
                                      </div>
                                      <div className="flex justify-between items-end">
                                         <span className="text-[10px] font-bold text-slate-400">₩ {ex.budgetAmount.toLocaleString()}</span>
                                         <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-blue-600">{(ex.expenditureAmount/ex.budgetAmount*100).toFixed(0)}%</span>
                                            <div className="w-12 h-0.5 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                                               <div className="h-full bg-blue-500" style={{ width: `${Math.min(ex.expenditureAmount/ex.budgetAmount*100, 100)}%` }} />
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                ))}
                             </div>
                           )}
                        </div>
                     ))}
                  </div>
                )}
             </div>
           ))}
        </div>
      </div>

      {/* 우측: 상세 집행 내역 */}
      <div className="flex-1 overflow-y-auto bg-white/40">
         {!selectedExecutionId ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
              <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 animate-bounce">
                 <Receipt className="size-20 opacity-10" />
              </div>
              <p className="font-black text-sm uppercase tracking-[0.2em]">왼쪽 트리에서 상세 집행 항목(LV3)을 선택하세요</p>
           </div>
         ) : (
           <div className="p-12 space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Wallet className="size-16 text-blue-600" />
                     </div>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Budget</p>
                     <h3 className="text-3xl font-black text-slate-900">₩ {selectedExecution?.budgetAmount.toLocaleString()}</h3>
                     <div className="mt-4 flex items-center gap-2">
                        <Badge className="bg-blue-50 text-blue-600 border-none px-2 h-5 text-[9px] font-black uppercase">Execution Item</Badge>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Receipt className="size-16 text-emerald-600" />
                     </div>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Spent To Date</p>
                     <h3 className="text-3xl font-black text-emerald-600">₩ {selectedExecution?.expenditureAmount.toLocaleString()}</h3>
                     <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-600">{(selectedExecution?.expenditureAmount! / (selectedExecution?.budgetAmount! || 1) * 100).toFixed(1)}% Usage</span>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <AlertCircle className="size-16 text-slate-600" />
                     </div>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Remaining</p>
                     <h3 className="text-3xl font-black text-slate-900">₩ {(selectedExecution?.budgetAmount! - selectedExecution?.expenditureAmount!).toLocaleString()}</h3>
                     <div className="mt-4 flex flex-col gap-2">
                        <Button 
                          onClick={() => setExpenditureDialogOpen(true)}
                          className="h-10 rounded-xl bg-slate-900 text-white font-black hover:scale-105 transition-all text-[10px] uppercase shadow-lg shadow-slate-900/20"
                        >
                           <PlusCircle className="size-3.5 mr-2" /> New Expense
                        </Button>
                     </div>
                  </div>
               </div>

               <div className="flex justify-between items-center bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-600/20 text-white">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedExecution?.name}</h2>
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Detailed Execution Item Management</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const projName = projects.find(p => p.id === selectedExecution?.projectId)?.name || '기본 예산';
                      generateSettlementPDF(projName, selectedExecution?.name || '', relevantExpenditures);
                    }}
                    className="bg-white/10 border-white/20 hover:bg-white/30 text-white rounded-xl h-12 px-6 font-black gap-2"
                  >
                     <Download className="size-4" /> PDF Report
                  </Button>
               </div>

              {/* 지출 목록 테이블 */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <Receipt className="size-4 text-emerald-500" /> 상세 지출 명세 및 증빙
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 italic">* 증빙 파일(이미지/PDF) 마우스 오버 시 미리보기 지원</p>
                 </div>

                 <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-slate-50/50">
                                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount (KRW)</th>
                                 <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Evidence</th>
                              </tr>
                           </thead>
                          <tbody className="divide-y divide-slate-50">
                             {relevantExpenditures.sort((a,b) => b.date.localeCompare(a.date)).map(exp => (
                               <tr key={exp.id} className="group hover:bg-slate-50/30 transition-all">
                                  <td className="px-8 py-6">
                                     <Badge className={cn("text-[9px] font-black uppercase", exp.attachmentName ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                                        {exp.attachmentName ? "Verified" : "Pending"}
                                     </Badge>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="flex items-center gap-3">
                                        <Clock className="size-4 text-slate-300" />
                                        <span className="text-sm font-bold text-slate-600 tracking-tight">{exp.date}</span>
                                     </div>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="flex flex-col">
                                        <span className="text-sm font-black text-slate-800 leading-tight">{exp.description}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Audit Log: {new Date(exp.createdAt).toLocaleTimeString()}</span>
                                     </div>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="flex items-center gap-2">
                                        <Building2 className="size-3.5 text-blue-400" />
                                        <span className="text-sm font-black text-slate-700">{exp.vendor}</span>
                                     </div>
                                  </td>
                                  <td className="px-8 py-6 text-right">
                                     <span className="text-base font-black text-slate-900 tracking-tighter">₩ {exp.amount.toLocaleString()}</span>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="flex justify-center flex-wrap gap-2">
                                        {exp.attachmentName ? (
                                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100 group/file transition-all cursor-pointer hover:bg-blue-600 hover:text-white">
                                             <FileText className="size-3.5" />
                                             <span className="text-[10px] font-black uppercase truncate max-w-[100px]">{exp.attachmentOriginalName}</span>
                                             <Download className="size-3 opacity-0 group-hover/file:opacity-100 transition-opacity ml-1" />
                                          </div>
                                        ) : (
                                          <Badge variant="outline" className="bg-amber-50 text-amber-500 border-amber-100 font-bold text-[9px] uppercase px-3 py-1 rounded-lg">
                                             미첨부 (MISSING)
                                          </Badge>
                                        )}
                                     </div>
                                  </td>
                               </tr>
                             ))}
                             {relevantExpenditures.length === 0 && (
                               <tr>
                                  <td colSpan={5} className="px-8 py-24 text-center">
                                     <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Receipt className="size-16" />
                                        <p className="text-sm font-black uppercase tracking-widest">해당 항목으로 집행된 실적이 없습니다</p>
                                        <p className="text-xs font-medium italic">우측 상단의 버튼을 통해 실시간 지출 및 증빙을 등록하세요.</p>
                                     </div>
                                  </td>
                               </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </Card>
              </div>
           </div>
         )}
      </div>

      {selectedExecution && (
        <ExpenditureDialog 
          open={expenditureDialogOpen}
          onOpenChange={setExpenditureDialogOpen}
          executionItem={selectedExecution}
        />
      )}

      <CategoryManagementDialog 
        open={categoryManagementOpen}
        onOpenChange={setCategoryManagementOpen}
      />
    </div>
  );
}
