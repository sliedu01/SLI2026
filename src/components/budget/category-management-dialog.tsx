'use client';

import * as React from 'react';
import { Plus, Trash2, Settings2, FolderTree, Edit2, Check, X } from 'lucide-react';
import { useBudgetStore } from '@/store/use-budget-store';
import { formatInputNumber, parseCommaNumber, formatWithCommas } from '@/lib/number-format';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagementDialog({ open, onOpenChange }: CategoryManagementDialogProps) {
  const { 
    categories, 
    managements, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    addManagement, 
    updateManagement, 
    deleteManagement 
  } = useBudgetStore();
  
  const [newCatName, setNewCatName] = React.useState('');
  const [newManName, setNewManName] = React.useState('');
  const [newManBudget, setNewManBudget] = React.useState('');
  const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);
  
  // 수정 모드 상태
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [editBudget, setEditBudget] = React.useState('');

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName);
      setNewCatName('');
    } catch {
      alert('비목 등록 중 오류가 발생했습니다.');
    }
  };

  const handleAddManagement = async () => {
    if (!selectedCatId || !newManName.trim()) return;
    try {
      await addManagement(selectedCatId, newManName, parseCommaNumber(newManBudget));
      setNewManName('');
      setNewManBudget('');
    } catch {
      alert('관리세목 등록 중 오류가 발생했습니다.');
    }
  };

  const handleUpdate = async (type: 'cat' | 'man', id: string) => {
    try {
      if (type === 'cat') {
        await updateCategory(id, editValue);
      } else {
        await updateManagement(id, { name: editValue, budgetAmount: parseCommaNumber(editBudget) });
      }
      setEditingId(null);
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (type: 'cat' | 'man', id: string, name: string) => {
    if (!confirm(`'${name}' 항목을 삭제하시겠습니까? 하위 항목이 있는 경우 함께 삭제되거나 오류가 발생할 수 있습니다.`)) return;
    try {
      if (type === 'cat') await deleteCategory(id);
      else await deleteManagement(id);
    } catch {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="bg-slate-900 p-8 text-white">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <Settings2 className="size-6 text-indigo-400" />
            예산 체계 관리 (Categories)
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 bg-white">
          <Tabs defaultValue="l1" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-2xl h-14">
              <TabsTrigger value="l1" className="rounded-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-lg">LV1. 비목 관리</TabsTrigger>
              <TabsTrigger value="l2" className="rounded-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-lg">LV2. 관리세목 관리</TabsTrigger>
            </TabsList>

            <TabsContent value="l1" className="space-y-6">
              <div className="flex gap-3">
                <Input 
                  placeholder="새 비목 명칭 입력 (예: 인건비, 사업비)" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="rounded-xl h-12 border-slate-200 focus:ring-slate-900" 
                />
                <Button onClick={handleAddCategory} className="rounded-xl h-12 bg-slate-900 font-black px-6 gap-2">
                  <Plus className="size-4" /> 추가
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar pb-4">
                {categories.map(cat => (
                  <Card key={cat.id} className="rounded-xl border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <CardContent className="p-4 flex items-center justify-between">
                      {editingId === cat.id ? (
                        <div className="flex-1 flex gap-2">
                          <Input 
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-9 rounded-lg"
                          />
                          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 size-9 p-0" onClick={() => handleUpdate('cat', cat.id)}>
                            <Check className="size-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="size-9 p-0" onClick={() => setEditingId(null)}>
                            <X className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400">L1</div>
                            <span className="font-bold text-slate-700">{cat.name}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setEditingId(cat.id);
                                setEditValue(cat.name);
                              }}
                              className="size-8 text-slate-400 hover:text-indigo-600 rounded-lg"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete('cat', cat.id, cat.name)}
                              className="size-8 text-slate-300 hover:text-red-500 rounded-lg"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="l2" className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">상위 비목 선택</p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {categories.map(cat => (
                      <div 
                        key={cat.id}
                        onClick={() => setSelectedCatId(cat.id)}
                        className={cn(
                          "px-4 py-3 rounded-xl cursor-pointer text-xs font-black transition-all",
                          selectedCatId === cat.id ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        {cat.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 space-y-4">
                  {selectedCatId ? (
                    <>
                      <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">신규 관리세목 등록</p>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="관리세목 명칭" 
                            value={newManName}
                            onChange={(e) => setNewManName(e.target.value)}
                            className="rounded-xl h-12 bg-white" 
                          />
                          <Input 
                            placeholder="예산 금액 (₩)" 
                            value={newManBudget}
                            onChange={(e) => setNewManBudget(formatInputNumber(e.target.value))}
                            className="rounded-xl h-12 w-40 bg-white font-bold text-right" 
                          />
                          <Button onClick={handleAddManagement} className="rounded-xl h-12 bg-indigo-600 font-black px-4">
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[16rem] overflow-y-auto pr-2 custom-scrollbar pb-4 mt-2">
                        {managements.filter(m => m.categoryId === selectedCatId).map(man => (
                          <div key={man.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm group">
                            {editingId === man.id ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <Input 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-9 rounded-lg"
                                    placeholder="명칭"
                                  />
                                  <Input 
                                    value={editBudget} 
                                    onChange={(e) => setEditBudget(formatInputNumber(e.target.value))}
                                    className="h-9 rounded-lg w-32 font-bold text-right"
                                    placeholder="예산"
                                  />
                                </div>
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-400" onClick={() => setEditingId(null)}>취소</Button>
                                  <Button size="sm" className="h-8 px-3 bg-indigo-600" onClick={() => handleUpdate('man', man.id)}>저장</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">{man.name}</span>
                                  <span className="text-[10px] font-black text-indigo-500 mt-0.5">₩ {formatWithCommas(man.budgetAmount)}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => {
                                      setEditingId(man.id);
                                      setEditValue(man.name);
                                      setEditBudget(formatWithCommas(man.budgetAmount));
                                    }}
                                    className="size-7 text-slate-400 hover:text-indigo-600 rounded-lg"
                                  >
                                    <Edit2 className="size-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDelete('man', man.id, man.name)}
                                    className="size-7 text-slate-300 hover:text-red-500 rounded-lg"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {managements.filter(m => m.categoryId === selectedCatId).length === 0 && (
                          <div className="py-12 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                            <FolderTree className="size-8 text-slate-100 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-slate-300 uppercase">등록된 관리세목이 없습니다</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 border-2 border-dashed border-slate-50 rounded-3xl py-12">
                      <Settings2 className="size-12 opacity-10 mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-300">좌측에서 비목을 선택하세요</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

