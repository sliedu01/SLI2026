'use client';

import * as React from 'react';
import { Plus, Trash2, Settings2, FolderTree } from 'lucide-react';
import { useBudgetStore } from '@/store/use-budget-store';
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
  const { categories, managements, addCategory, addManagement, fetchBudgets } = useBudgetStore();
  const [newCatName, setNewCatName] = React.useState('');
  const [newManName, setNewManName] = React.useState('');
  const [selectedCatId, setSelectedCatId] = React.useState<string | null>(null);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName);
      setNewCatName('');
    } catch (error) {
      alert('비목 등록 중 오류가 발생했습니다.');
    }
  };

  const handleAddManagement = async () => {
    if (!selectedCatId || !newManName.trim()) return;
    try {
      await addManagement(selectedCatId, newManName);
      setNewManName('');
    } catch (error) {
      alert('관리세목 등록 중 오류가 발생했습니다.');
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

              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <Card key={cat.id} className="rounded-xl border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400">L1</div>
                        <span className="font-bold text-slate-700">{cat.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500 rounded-lg">
                        <Trash2 className="size-4" />
                      </Button>
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
                      <div className="flex gap-2">
                        <Input 
                          placeholder="새 관리세목 입력" 
                          value={newManName}
                          onChange={(e) => setNewManName(e.target.value)}
                          className="rounded-xl h-12" 
                        />
                        <Button onClick={handleAddManagement} className="rounded-xl h-12 bg-indigo-600 font-black">
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-[14rem] overflow-y-auto pr-2 custom-scrollbar">
                        {managements.filter(m => m.categoryId === selectedCatId).map(man => (
                          <div key={man.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <span className="text-xs font-bold text-slate-600">{man.name}</span>
                            <Button variant="ghost" size="icon" className="size-7 text-slate-300 hover:text-red-500 rounded-lg">
                              <Trash2 className="size-3.5" />
                            </Button>
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
