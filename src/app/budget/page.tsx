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
  AlertCircle,
  Edit2,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgetStore } from '@/store/use-budget-store';
import { useProjectStore } from '@/store/use-project-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { ExpenditureDialog } from '@/components/expenditure-dialog';
import { CategoryManagementDialog } from '@/components/budget/category-management-dialog';
import { cn } from '@/lib/utils';
import { formatWithCommas, formatInputNumber, parseCommaNumber } from '@/lib/number-format';
import { generateSettlementPDF } from '@/lib/pdf-settlement';

export default function BudgetPage() {
  const [mounted, setMounted] = React.useState(false);
  const { 
    categories, 
    managements, 
    expenditures, 
    addCategory,
    addManagement, 
    fetchBudgets,
    syncBudgets,
    deleteExpenditure,
    activeProjectId,
    setActiveProjectId
  } = useBudgetStore();
  const { projects, fetchProjects, selectedLv1Ids } = useProjectStore();
  const { partners } = usePartnerStore();

  const [expandedCats, setExpandedCats] = React.useState<Set<string>>(new Set());
  const [selectedManagementId, setSelectedManagementId] = React.useState<string | null>(null);
  
  // 다이얼로그 상태
  const [expenditureDialogOpen, setExpenditureDialogOpen] = React.useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = React.useState(false);
  const [editingExpenditure, setEditingExpenditure] = React.useState<any>(null);

  React.useEffect(() => {
    setMounted(true);
    fetchProjects();
    fetchBudgets();
  }, [fetchProjects, fetchBudgets]);

  // 카테고리 로드시 기본으로 모두 펼치기
  React.useEffect(() => {
    if (categories.length > 0) {
      setExpandedCats(new Set(categories.map(c => c.id)));
    }
  }, [categories]);

  // LV1 사업들 필터링 (글로벌 필터 반영)
  const lv1Projects = projects.filter(p => p.level === 1 && (selectedLv1Ids.length === 0 || selectedLv1Ids.includes(p.id)));

  // 글로벌 필터 변경 시 activeProjectId 동기화
  React.useEffect(() => {
    if (!mounted) return;
    
    // 현재 선택된 사업이 필터링된 목록에 없으면 첫 번째 사업으로 변경
    if (lv1Projects.length > 0) {
      const isCurrentProjectValid = lv1Projects.some(p => p.id === activeProjectId);
      if (!isCurrentProjectValid) {
        const nextId = lv1Projects[0].id;
        setActiveProjectId(nextId);
        fetchBudgets(nextId);
      }
    } else if (projects.filter(p => p.level === 1).length > 0) {
        // 필터링된 결과가 아예 없는데(선택은 되어있음), 전체 사업은 있는 경우
        // 이 경우는 드물지만 안전을 위해 처리
    }
  }, [mounted, selectedLv1Ids, lv1Projects, activeProjectId, setActiveProjectId, fetchBudgets]);

  if (!mounted) return null;

  const currentProject = lv1Projects.find(p => p.id === activeProjectId);

  const totalCatBudget = categories.reduce((sum, c) => sum + c.totalBudget, 0);
  const totalCatSpent = categories.reduce((sum, c) => sum + (c.totalExpenditure || 0), 0);
  const totalCatExpected = categories.reduce((sum, c) => sum + (c.totalExpectedExpenditure || 0), 0);
  const totalExecution = totalCatSpent + totalCatExpected;

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const relevantExpenditures = selectedManagementId 
    ? expenditures.filter(exp => exp.managementId === selectedManagementId)
    : expenditures;

  const handleEditExpenditure = (exp: any) => {
    setEditingExpenditure(exp);
    setExpenditureDialogOpen(true);
  };

  const handleDeleteExpenditure = async (exp: any) => {
    // subagent 등 환경에서 confirm이 안 될 수 있으므로 window.confirm 명시
    const ok = window.confirm(`'${exp.subDetail}' 지출 내역을 삭제하시겠습니까?\n첨부된 증빙 파일도 함께 삭제됩니다.`);
    if (ok) {
      try {
        await deleteExpenditure(exp.id, exp.attachmentName);
        alert('삭제되었습니다.');
      } catch (err) {
        console.error('Delete error:', err);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };
  // 엑셀 다운로드 핸들러 (정산데이터 현황)
  const handleExportExcel = () => {
    const excelData: any[] = [];
    categories.forEach(cat => {
      const catMans = managements.filter(m => m.categoryId === cat.id);
      catMans.forEach(man => {
        const manExps = expenditures.filter(exp => exp.managementId === man.id);
        const usageRate = ((man.totalExpenditure / (man.budgetAmount || 1)) * 100).toFixed(1) + '%';
        if (manExps.length === 0) {
          excelData.push({
            '비목(LV1)': cat.name, '관리세목(LV2)': man.name, '세세목(LV3)': '-',
            '배정예산': man.budgetAmount, '집행액': 0, '집행예정액': 0, '집행잔액': man.balance, '사용율': usageRate
          });
        } else {
          manExps.forEach(exp => {
            excelData.push({
              '비목(LV1)': cat.name, '관리세목(LV2)': man.name, '세세목(LV3)': exp.subDetail,
              '배정예산': man.budgetAmount, '집행액': exp.date ? exp.amount : 0, '집행예정액': !exp.date ? exp.amount : 0, '집행잔액': man.balance, '사용율': usageRate
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
  
  // 지출 상세 로그 엑셀 다운로드 핸들러
  const handleExportLogExcel = () => {
    const excelData = relevantExpenditures.sort((a,b) => (b.date || '').localeCompare(a.date || '')).map((exp, idx) => {
      const cat = categories.find(c => c.id === managements.find(m => m.id === exp.managementId)?.categoryId);
      const man = managements.find(m => m.id === exp.managementId);
      return {
        '번호': idx + 1,
        '일자': exp.date || '예정',
        '비목(LV1)': cat?.name || '-',
        '관리세목(LV2)': man?.name || '-',
        '세세목(LV3)': exp.subDetail,
        '총액': exp.amount,
        '지출처': exp.vendor,
        '증빙': exp.proofType === 'TAX_INVOICE' ? '세금계산서' : exp.proofType === 'RECEIPT' ? '영수증' : exp.proofType === 'DEPOSIT' ? '입금증' : exp.proofType === 'CARD' ? '카드전표' : '기타'
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "지출상세로그");
    XLSX.writeFile(workbook, `지출상세로그_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex bg-slate-50/50 rounded-[3rem] border border-slate-200/60 overflow-hidden h-[calc(100vh-140px)] animate-in fade-in duration-700 shadow-2xl shadow-slate-200/20">
      {/* 좌측: 2계층 예산 트리 (LV1, LV2) */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl z-10">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <Wallet className="size-4 text-blue-600" /> 예산 관리
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
              {/* 사업 선택 영역 */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">선택된 사업</p>
                <div className="relative group/select">
                  <select 
                    value={activeProjectId || ''} 
                    onChange={(e) => {
                      const id = e.target.value;
                      setActiveProjectId(id);
                      fetchBudgets(id);
                    }}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-black text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:border-slate-200"
                  >
                    <option value="" disabled>사업을 선택하세요</option>
                    {lv1Projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none group-hover/select:text-slate-600 transition-colors" />
                </div>
              </div>

              <div className="flex justify-between items-end pt-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">배정예산</p>
                 <p className="text-xl font-black text-slate-900 leading-none">₩ {formatWithCommas(totalCatBudget)}</p>
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
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold opacity-60">₩ {formatWithCommas(cat.totalBudget)}</span>
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
                        <div 
                           key={man.id}
                           onClick={() => setSelectedManagementId(man.id === selectedManagementId ? null : man.id)}
                           className={cn(
                             "group flex flex-col p-3 rounded-xl border transition-all cursor-pointer",
                             selectedManagementId === man.id ? "bg-white border-blue-500 shadow-md" : "bg-white/50 border-slate-50 hover:border-slate-200"
                           )}
                        >
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-black text-slate-800">{man.name}</span>
                              <Badge className="text-[9px] bg-slate-100 text-slate-600 border-none px-1 h-4">LV2</Badge>
                           </div>
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-bold text-slate-400">₩ {formatWithCommas(man.budgetAmount)}</span>
                              <div className="flex flex-col items-end">
                                 <span className="text-[9px] font-black text-blue-600">{(man.totalExpenditure/(man.budgetAmount||1)*100).toFixed(0)}%</span>
                                 <div className="w-12 h-0.5 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(man.totalExpenditure/(man.budgetAmount||1)*100, 100)}%` }} />
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
      </div>

      {/* 우측: 정산 데이터 현황 */}
      <div className="flex-1 flex flex-col h-full bg-slate-50/30 overflow-hidden">
         {!activeProjectId ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
              <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 animate-bounce">
                 <Receipt className="size-20 opacity-10" />
              </div>
              <p className="font-black text-sm uppercase tracking-[0.2em]">사업을 선택하세요</p>
           </div>
         ) : (
           <div className="flex-1 flex flex-col overflow-hidden">
               {/* 상단: 정산데이터현황 (LV1, LV2 테이블 구조) */}
               <div className="h-[50%] flex flex-col border-b border-slate-200 bg-white">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between shrink-0">
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <BarChart4 className="size-4 text-indigo-500" /> 정산데이터현황
                     </h3>
                     <div className="flex items-center gap-2">
                        <Button 
                         size="sm"
                         onClick={() => setExpenditureDialogOpen(true)}
                         className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-lg px-4 h-8 shadow-lg shadow-indigo-100"
                        >
                           <PlusCircle className="size-3.5 mr-2" /> 지출 추가
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleExportExcel}
                          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 font-black text-[10px] rounded-lg px-4 h-8"
                        >
                          <FileSpreadsheet className="size-3 mr-2" /> 엑셀 다운로드
                        </Button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                     <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead className="sticky top-0 bg-slate-50 z-20">
                           <tr>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-32">비목(LV1)</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-40">관리세목(LV2)</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 w-48">세세목(LV3)</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 text-right w-32">배정예산</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 text-right w-28">집행액</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 text-right w-28">집행예정액</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 text-right bg-blue-50/50 w-32">집행잔액</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 text-right w-20">사용율</th>
                              <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-24">관리</th>
                           </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-50">
                            {categories.map(cat => {
                              const catMans = managements.filter(m => m.categoryId === cat.id);
                              return (
                                <React.Fragment key={cat.id}>
                                   {catMans.map((man) => {
                                      const manExps = expenditures.filter(e => e.managementId === man.id);
                                      const usageRate = (man.totalExpenditure / (man.budgetAmount || 1)) * 100;
                                      
                                      if (manExps.length === 0) {
                                        return (
                                          <tr key={`${man.id}-empty`} className="hover:bg-slate-50/50 group transition-all">
                                            <td className="px-4 py-3 text-[11px] font-bold text-slate-400 border-r border-slate-50">{cat.name}</td>
                                            <td className="px-4 py-3 text-[11px] font-black text-slate-700 border-r border-slate-50">{man.name}</td>
                                            <td className="px-4 py-3 text-[11px] font-bold text-slate-300 border-r border-slate-50 italic">-</td>
                                            <td className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 border-r border-slate-50">{formatWithCommas(man.budgetAmount)}</td>
                                            <td className="px-4 py-3 text-right text-[11px] font-black text-emerald-600 border-r border-slate-50">0</td>
                                            <td className="px-4 py-3 text-right text-[11px] font-black text-amber-600 border-r border-slate-50">0</td>
                                            <td className="px-4 py-3 text-right bg-blue-50/30 border-r border-slate-50">
                                              <span className="text-[11px] font-black text-blue-700">₩ {formatWithCommas(man.balance)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-[11px] font-black text-slate-400 border-r border-slate-50">0.0%</td>
                                            <td className="px-4 py-3 text-center text-slate-300">-</td>
                                          </tr>
                                        );
                                      }

                                      return manExps.map((exp) => (
                                        <tr 
                                           key={exp.id} 
                                           className={cn(
                                             "group cursor-pointer transition-all hover:bg-slate-50/50",
                                             selectedManagementId === man.id && "bg-indigo-50/10"
                                           )}
                                        >
                                           <td className="px-4 py-3 text-[11px] font-bold text-slate-400 border-r border-slate-50">
                                              {cat.name}
                                           </td>
                                           <td className="px-4 py-3 border-r border-slate-50">
                                              <span className="text-[11px] font-black text-slate-700">{man.name}</span>
                                           </td>
                                           <td className="px-4 py-3 border-r border-slate-50">
                                              <span className="text-[11px] font-black text-indigo-600">{exp.subDetail}</span>
                                           </td>
                                           <td className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 border-r border-slate-50">
                                              {formatWithCommas(man.budgetAmount)}
                                           </td>
                                           <td className="px-4 py-3 text-right text-[11px] font-black text-emerald-600 border-r border-slate-50">
                                              {exp.date ? formatWithCommas(exp.amount) : "0"}
                                           </td>
                                           <td className="px-4 py-3 text-right text-[11px] font-black text-amber-600 border-r border-slate-50">
                                              {!exp.date ? formatWithCommas(exp.amount) : "0"}
                                           </td>
                                           <td className="px-4 py-3 text-right bg-blue-50/30 border-r border-slate-50">
                                              <span className="text-[11px] font-black text-blue-700">
                                                 ₩ {formatWithCommas(man.balance)}
                                              </span>
                                           </td>
                                           <td className="px-4 py-3 text-right text-[11px] font-black text-indigo-500 border-r border-slate-50">
                                              {usageRate.toFixed(1)}%
                                           </td>
                                           <td className="px-4 py-3">
                                              <div className="flex justify-center gap-1">
                                                 <Button 
                                                   variant="ghost" 
                                                   size="icon" 
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     handleEditExpenditure(exp);
                                                   }}
                                                   className="size-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                 >
                                                    <Edit2 className="size-3" />
                                                 </Button>
                                                 <Button 
                                                   variant="ghost" 
                                                   size="icon" 
                                                   onClick={(e) => {
                                                     e.stopPropagation();
                                                     handleDeleteExpenditure(exp);
                                                   }}
                                                   className="size-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                 >
                                                    <Trash2 className="size-3" />
                                                 </Button>
                                              </div>
                                           </td>
                                        </tr>
                                      ));
                                   })}
                                </React.Fragment>
                              );
                            })}
                         </tbody>
                     </table>
                  </div>
               </div>

              {/* 하단: 정산 상세 내역 (지출 로그) */}
              <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
                 <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <FileText className="size-4 text-slate-500" /> 지출 상세 로그
                    </h3>
                    <div className="flex items-center gap-3">
                       <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExportLogExcel}
                        className="h-8 rounded-lg text-[10px] font-black gap-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                       >
                          <FileSpreadsheet className="size-3" /> 엑셀 다운로드
                       </Button>
                       <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                           const managementName = selectedManagementId ? managements.find(m => m.id === selectedManagementId)?.name : "전체";
                           generateSettlementPDF("서울2026", managementName || "정산내역서", relevantExpenditures);
                        }}
                        className="h-8 rounded-lg text-[10px] font-black gap-2 border-slate-200"
                       >
                          <Download className="size-3" /> 증빙자료 PDF 다운로드
                       </Button>
                    </div>
                 </div>

                 <div className="flex-1 overflow-auto custom-scrollbar p-6">
                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                       <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[1300px]">
                              <thead>
                                 <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-12">No.</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">일자</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">비목(LV1)</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">관리세목(LV2)</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">세세목(LV3)</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">총액</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">지출처</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">증빙</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">첨부</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">작업</th>
                                 </tr>
                              </thead>
                             <tbody className="divide-y divide-slate-50">
                                {relevantExpenditures.sort((a,b) => (b.date || '').localeCompare(a.date || '')).map((exp, idx) => {
                                  const cat = categories.find(c => c.id === managements.find(m => m.id === exp.managementId)?.categoryId);
                                  const man = managements.find(m => m.id === exp.managementId);
                                  return (
                                    <tr key={exp.id} className="group hover:bg-slate-50 transition-all">
                                       <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{idx + 1}</td>
                                       <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{exp.date || <span className="text-amber-500">예정</span>}</td>
                                       <td className="px-6 py-4 text-[11px] font-bold text-slate-400">{cat?.name}</td>
                                       <td className="px-6 py-4 text-[11px] font-black text-slate-700">{man?.name}</td>
                                       <td className="px-6 py-4 text-[11px] font-black text-indigo-600">{exp.subDetail}</td>
                                        <td className="px-6 py-4 text-right">
                                           <span className="text-[11px] font-black text-slate-900">₩ {formatWithCommas(exp.amount)}</span>
                                        </td>
                                       <td className="px-6 py-4 text-[11px] font-bold text-slate-600">{exp.vendor}</td>
                                       <td className="px-6 py-4 text-center">
                                          <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-500">
                                             {exp.proofType === 'TAX_INVOICE' ? '세금계산서' : exp.proofType === 'RECEIPT' ? '영수증' : exp.proofType === 'DEPOSIT' ? '입금증' : exp.proofType === 'CARD' ? '카드전표' : '기타'}
                                          </Badge>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex justify-center">
                                             {exp.attachmentName ? (
                                               <div 
                                                onClick={() => window.open(exp.attachmentUrl, '_blank')}
                                                className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100 group/file cursor-pointer hover:bg-blue-600 hover:text-white transition-all">
                                                  <FileText className="size-3" />
                                                  <span className="text-[9px] font-black truncate max-w-[80px]">{exp.attachmentOriginalName}</span>
                                                  <Download className="size-2.5 opacity-0 group-hover/file:opacity-100" />
                                                </div>
                                             ) : <span className="text-[9px] font-bold text-slate-200">-</span>}
                                          </div>
                                       </td>
                                       <td className="px-6 py-4">
                                          <div className="flex justify-center gap-2">
                                             <Button 
                                               variant="ghost" 
                                               size="icon" 
                                               onClick={() => handleEditExpenditure(exp)}
                                               className="size-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                             >
                                                <Edit2 className="size-3.5" />
                                             </Button>
                                             <Button 
                                               variant="ghost" 
                                               size="icon" 
                                               onClick={() => handleDeleteExpenditure(exp)}
                                               className="size-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                             >
                                                <Trash2 className="size-3.5" />
                                             </Button>
                                          </div>
                                       </td>
                                    </tr>
                                  )
                                })}
                             </tbody>
                          </table>
                       </div>
                    </Card>
                 </div>
              </div>
           </div>
         )}
      </div>

      <ExpenditureDialog 
        open={expenditureDialogOpen}
        onOpenChange={(open) => {
          setExpenditureDialogOpen(open);
          if (!open) setEditingExpenditure(null);
        }}
        initialManagementId={selectedManagementId || undefined}
        initialData={editingExpenditure}
      />

      <CategoryManagementDialog 
        open={categoryManagementOpen}
        onOpenChange={setCategoryManagementOpen}
      />
    </div>
  );
}
