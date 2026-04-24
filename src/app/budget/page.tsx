'use client';

import * as React from 'react';
import { 
  Plus, 
  Coins,
  TrendingUp,
  Wallet,
  LayoutGrid,
  BarChart4,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Settings2
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBudgetStore, Expenditure } from '@/store/use-budget-store';
import { useProjectStore } from '@/store/use-project-store';
import { ExpenditureDialog } from '@/components/expenditure-dialog';
import { CategoryManagementDialog } from '@/components/budget/category-management-dialog';
import { cn } from '@/lib/utils';
import { formatWithCommas } from '@/lib/number-format';
import { useSearchParams } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export default function BudgetPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">로딩 중...</div>}>
      <BudgetPageContent />
    </React.Suspense>
  );
}

function BudgetPageContent() {
  const [mounted, setMounted] = React.useState(false);
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');

  const { 
    categories, 
    managements, 
    expenditures, 
    fetchBudgets,
    deleteExpenditure,
    activeProjectId,
    setActiveProjectId
  } = useBudgetStore();
  const { projects, fetchProjects, selectedLv1Ids, setSelectedLv1Ids } = useProjectStore();

  // 다이얼로그 상태
  const [expenditureDialogOpen, setExpenditureDialogOpen] = React.useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = React.useState(false);
  const [editingExpenditure, setEditingExpenditure] = React.useState<Expenditure | undefined>(undefined);

  React.useEffect(() => {
    setMounted(true);
    fetchProjects();
    fetchBudgets();
  }, [fetchProjects, fetchBudgets]);

  // editId 파라미터 처리
  React.useEffect(() => {
    if (mounted && editId && expenditures.length > 0) {
      const expenditure = expenditures.find(e => e.id === editId);
      if (expenditure) {
        const management = managements.find(m => m.id === expenditure.managementId);
        const category = management ? categories.find(c => c.id === management.categoryId) : null;
        const targetProjectId = category?.projectId;

        if (targetProjectId && targetProjectId !== activeProjectId) {
          setActiveProjectId(targetProjectId);
          fetchBudgets(targetProjectId || undefined);
        }
        setEditingExpenditure(expenditure);
        setExpenditureDialogOpen(true);
      }
    }
  }, [mounted, editId, expenditures, activeProjectId, setActiveProjectId, fetchBudgets, categories, managements]);

  // LV1 사업들 필터링
  const lv1Projects = projects.filter(p => p.level === 1);

  // 글로벌 선택과 동기화
  React.useEffect(() => {
    if (!mounted) return;
    if (selectedLv1Ids.length > 0) {
      const globalId = selectedLv1Ids[0];
      if (globalId !== activeProjectId) {
        setActiveProjectId(globalId);
        fetchBudgets(globalId);
      }
    }
  }, [mounted, selectedLv1Ids, activeProjectId, setActiveProjectId, fetchBudgets]);

  // 로컬 선택 변경 시 글로벌 상태도 업데이트
  const handleProjectChange = (id: string | null) => {
    if (!id) return;
    setActiveProjectId(id);
    if (id === 'all') {
      setSelectedLv1Ids([]);
    } else {
      setSelectedLv1Ids([id]);
    }
    fetchBudgets(id === 'all' ? undefined : id);
  };

  if (!mounted) return null;

  const totalCatBudget = categories.reduce((sum, c) => sum + c.totalBudget, 0);
  const totalCatSpent = categories.reduce((sum, c) => sum + (c.totalExpenditure || 0), 0);

  const handleEditExpenditure = (exp: Expenditure) => {
    setEditingExpenditure(exp);
    setExpenditureDialogOpen(true);
  };

  const handleDeleteExpenditure = async (exp: Expenditure) => {
    const ok = window.confirm(`'${exp.subDetail}' 지출 내역을 삭제하시겠습니까?\n첨부된 증빙 파일도 함께 삭제됩니다.`);
    if (ok) {
      try {
        await deleteExpenditure(exp.id as string, exp.attachmentName as string | undefined);
        alert('삭제되었습니다.');
      } catch (err) {
        console.error('Delete error:', err);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleExportExcel = () => {
    const excelData: Record<string, string | number>[] = [];
    categories.forEach(cat => {
      const catMans = managements.filter(m => m.categoryId === cat.id);
      catMans.forEach(man => {
        const manExps = expenditures.filter(exp => exp.managementId === man.id);
        const usageRate = ((man.totalExpenditure / (man.budgetAmount || 1)) * 100).toFixed(1) + '%';
        if (manExps.length === 0) {
          excelData.push({
            '비목(LV1)': cat.name, '관리세목(LV2)': man.name, '세세목(LV3)': '-',
            '배정예산': man.budgetAmount || 0, '집행액': 0, '집행잔액': man.balance || 0, '사용율': usageRate
          });
        } else {
          manExps.forEach(exp => {
            excelData.push({
              '비목(LV1)': cat.name, '관리세목(LV2)': man.name, '세세목(LV3)': exp.subDetail,
              '배정예산': man.budgetAmount || 0, '집행액': exp.amount, '집행잔액': man.balance || 0, '사용율': usageRate
            });
          });
        }
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "정산데이터현황");
    XLSX.writeFile(workbook, `정산데이터현황_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-in fade-in duration-500 pb-10">
      {/* 액션 바 (회의 관리 스타일 적용) */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-xl print:hidden sticky top-0 z-50">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Wallet className="size-5 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-slate-900 tracking-tight whitespace-nowrap">예산 및 정산</h1>
          </div>

          <div className="flex items-center gap-2 max-w-4xl w-full">
            <Select 
              key={`budget-select-${activeProjectId}-${projects.length}`}
              value={activeProjectId || 'all'} 
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="h-9 rounded-lg font-bold text-[11px] bg-white border-slate-200 focus:ring-indigo-500/20">
                <div className="flex items-center gap-2 truncate flex-1">
                  <LayoutGrid className="size-3 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {activeProjectId === null || activeProjectId === undefined
                      ? '전체 사업 통합 예산' 
                      : (projects.find(p => p.id === activeProjectId)?.name || '사업 선택')
                    }
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold">전체 사업 통합 예산</SelectItem>
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
          <Button 
            variant="outline"
            onClick={() => setCategoryManagementOpen(true)}
            className="rounded-lg h-9 text-[11px] font-bold border-slate-200 px-4 hover:bg-slate-50"
          >
            <Settings2 className="size-3.5 mr-1.5" />
            예산구조관리
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportExcel}
            className="rounded-lg h-9 text-[11px] font-bold border-slate-200 px-4 hover:bg-slate-50"
          >
            <FileSpreadsheet className="size-3.5 mr-1.5" />
            엑셀 출력
          </Button>
          <Button 
            onClick={() => {
              setEditingExpenditure(undefined);
              setExpenditureDialogOpen(true);
            }} 
            className="rounded-lg h-9 bg-slate-900 hover:bg-slate-800 font-bold gap-1.5 px-4 text-[11px] shadow-md ml-2"
          >
            <Plus className="size-3.5" /> 
            지출 내역 등록
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '총 예산', value: formatWithCommas(totalCatBudget), color: 'bg-slate-900', icon: Coins },
            { label: '총 지출', value: formatWithCommas(totalCatSpent), color: 'bg-emerald-600', icon: TrendingUp },
            { label: '잔액', value: formatWithCommas(totalCatBudget - totalCatSpent), color: (totalCatBudget - totalCatSpent) < 0 ? 'bg-red-600' : 'bg-blue-600', icon: Wallet }
          ].map((card, idx) => (
            <Card key={idx} className={cn("border-none p-4 text-white rounded-2xl shadow-lg relative overflow-hidden", card.color)}>
              <div className="relative z-10 space-y-0.5">
                <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">{card.label}</p>
                <h3 className="text-[18px] font-bold">{card.value}원</h3>
              </div>
              <card.icon className="absolute right-[-10px] bottom-[-10px] size-16 opacity-10 rotate-12" />
            </Card>
          ))}
        </div>

        {/* 지출 상세 현황 (트리 구조) */}
        <Card className="border-none shadow-lg rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-[12px] font-bold text-slate-900 uppercase flex items-center gap-2">
              <BarChart4 className="size-4 text-indigo-500" /> 지출 상세 현황 (비목별 집계)
            </h3>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 text-[11px] font-bold">
               <FileSpreadsheet className="size-3.5 mr-1.5 text-emerald-600" /> 엑셀 다운로드
            </Button>
          </div>
          <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm">
                <tr>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase w-[40%]">예산항목 및 지출내역</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-right w-[15%]">배정예산</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-right w-[15%]">집행액</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-right w-[15%]">잔액</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-center w-[10%]">집행률</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-center w-[5%]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(cat => {
                  const catMans = managements.filter(m => m.categoryId === cat.id);
                  return (
                    <React.Fragment key={cat.id}>
                      <tr className="bg-slate-50/50 border-t-2 border-slate-200">
                        <td className="px-4 py-2 text-[11px] font-bold text-slate-900 bg-slate-50/80" colSpan={1}>
                          <span className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {cat.name}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[11px] font-bold text-slate-900 text-right bg-slate-50/80">{formatWithCommas(cat.totalBudget)}</td>
                        <td className="px-4 py-2 text-[11px] font-bold text-emerald-600 text-right bg-slate-50/80">{formatWithCommas(cat.totalExpenditure)}</td>
                        <td className="px-4 py-2 text-[11px] font-bold text-blue-600 text-right bg-slate-50/80">{formatWithCommas(cat.totalBudget - cat.totalExpenditure)}</td>
                        <td className="px-4 py-2 text-center bg-slate-50/80" colSpan={2}>
                          <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
                                style={{ width: `${Math.min(100, (cat.totalExpenditure / (cat.totalBudget || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 w-8">
                              {((cat.totalExpenditure / (cat.totalBudget || 1)) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                      {catMans.map(man => {
                        const usageRate = (man.totalExpenditure / (man.budgetAmount || 1)) * 100;
                        return (
                          <tr key={man.id} className="hover:bg-slate-50/30 group border-b border-slate-50">
                            <td className="px-4 py-2 pl-8 text-[11px] font-bold text-slate-700">
                              <span className="flex items-center gap-2">
                                <span className="size-1 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
                                {man.name}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-[11px] font-medium text-slate-600 text-right">{formatWithCommas(man.budgetAmount)}</td>
                            <td className="px-4 py-2 text-[11px] font-bold text-emerald-600 text-right">{formatWithCommas(man.totalExpenditure)}</td>
                            <td className="px-4 py-2 text-[11px] font-medium text-slate-600 text-right">{formatWithCommas(man.balance)}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                usageRate > 100 ? "bg-red-100 text-red-600" : "bg-indigo-50 text-indigo-600"
                              )}>
                                {usageRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">-</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 지출 상세 리스트 (로그형) */}
        <Card className="border-none shadow-lg rounded-2xl overflow-hidden flex flex-col mb-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-[12px] font-bold text-slate-900 uppercase flex items-center gap-2">
              <LayoutGrid className="size-4 text-emerald-500" /> 지출 상세 리스트 (개별 내역)
            </h3>
          </div>
          <div className="overflow-auto custom-scrollbar max-h-[600px]">
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm">
                <tr>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">일자</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">비목(LV1)</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">관리세목(LV2)</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">세세목(LV3)</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-right">금액</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">거래처</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-center">증빙</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase text-center w-[80px]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenditures
                  .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
                  .map(exp => {
                    const management = managements.find(m => m.id === exp.managementId);
                    const category = management ? categories.find(c => c.id === management.categoryId) : null;
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">{exp.date || '-'}</td>
                        <td className="px-4 py-2.5 text-[11px] font-bold text-slate-900">{category?.name || '-'}</td>
                        <td className="px-4 py-2.5 text-[11px] font-medium text-slate-600">{management?.name || '-'}</td>
                        <td className="px-4 py-2.5 text-[11px] font-bold text-slate-700">{exp.subDetail}</td>
                        <td className="px-4 py-2.5 text-[11px] font-black text-emerald-600 text-right">{formatWithCommas(exp.amount)}원</td>
                        <td className="px-4 py-2.5 text-[11px] font-medium text-slate-600">{exp.vendor}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-500 text-[9px] font-bold">
                            {exp.proofType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditExpenditure(exp)} className="size-7 text-slate-300 hover:text-blue-600 transition-colors">
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExpenditure(exp)} className="size-7 text-slate-300 hover:text-red-600 transition-colors">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {expenditures.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-20 text-center text-[11px] text-slate-300 font-bold uppercase tracking-widest">
                      등록된 지출 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ExpenditureDialog 
        open={expenditureDialogOpen}
        onOpenChange={(open) => {
          setExpenditureDialogOpen(open);
          if (!open) setEditingExpenditure(undefined);
        }}
        initialData={editingExpenditure}
      />

      <CategoryManagementDialog 
        open={categoryManagementOpen}
        onOpenChange={setCategoryManagementOpen}
      />
    </div>
  );
}
