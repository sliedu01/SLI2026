'use client';

import * as React from 'react';
import { 
  X, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { FileUploadZone } from './file-upload-zone';
import { uploadFileToStorage, generateStoragePath } from '@/lib/storage';
import { cn } from '@/lib/utils';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePartnerStore } from '@/store/use-partner-store';
import { useBudgetStore, BudgetExecution } from '@/store/use-budget-store';
import { useProjectStore } from '@/store/use-project-store';

interface ExpenditureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionItem: BudgetExecution;
}

export function ExpenditureDialog({ open, onOpenChange, executionItem }: ExpenditureDialogProps) {
  const { partners } = usePartnerStore();
  const { addExpenditure } = useBudgetStore();
  const { projects } = useProjectStore();

  const [date, setDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = React.useState('');
  const [selectedPartnerId, setSelectedPartnerId] = React.useState('');
  const [customVendor, setCustomVendor] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<'COMPLETED' | 'PENDING'>('COMPLETED');
  const [uploadFile, setUploadFile] = React.useState<{ originalName: string, fileName: string, fileUrl: string, file?: File } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const project = projects.find(p => p.id === executionItem.projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || (!selectedPartnerId && !customVendor)) {
      alert('금액과 지출처를 확인해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const vendorName = selectedPartnerId === 'custom'
        ? customVendor
        : partners.find(p => p.id === selectedPartnerId)?.name || '';

      let finalUrl = uploadFile?.fileUrl;

      // 파일이 새로 선택된 경우 클라우드 업로드
      if (uploadFile?.file) {
        const path = generateStoragePath('expenditures', uploadFile.fileName);
        finalUrl = await uploadFileToStorage('partner-documents', path, uploadFile.file);
      }

      await addExpenditure({
        executionId: executionItem.id,
        date,
        amount: Number(amount),
        vendor: vendorName,
        description,
        status,
        attachmentOriginalName: uploadFile?.originalName,
        attachmentName: uploadFile?.fileName,
        attachmentUrl: finalUrl,
      });

      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error('Expenditure save error:', err);
      alert('지출 내역 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setAmount('');
    setSelectedPartnerId('');
    setCustomVendor('');
    setDescription('');
    setUploadFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <DialogHeader className="bg-emerald-600 p-8 text-white relative">
          <DialogTitle className="text-2xl font-black">집행 내역 및 증빙 등록</DialogTitle>
          <div className="flex flex-col gap-1 mt-1">
             <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em]">Budget Execution & Evidence</p>
             <p className="text-xs font-bold text-white/90 truncate">
               [{executionItem.name}] {project ? `>> ${project.name}` : ''}
             </p>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-8 right-8 text-emerald-200 hover:text-white transition-colors"
          >
            <X className="size-6" />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">지출 일자</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">집행 금액</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input 
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs font-black text-slate-500 uppercase ml-1">지출처 (협력업체 또는 기타)</Label>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <select 
                  value={selectedPartnerId}
                  onChange={(e) => {
                    setSelectedPartnerId(e.target.value);
                    if (e.target.value !== 'custom') setCustomVendor('');
                  }}
                  className="w-full h-14 pl-12 pr-10 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none appearance-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">지출처 선택...</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="custom">+ 직접 입력</option>
                </select>
              </div>
              
              {selectedPartnerId === 'custom' && (
                <Input 
                  placeholder="지출처를 직접 입력하세요" 
                  value={customVendor}
                  onChange={(e) => setCustomVendor(e.target.value)}
                  className="h-14 px-6 rounded-2xl bg-white border-slate-200 font-bold focus:ring-2 focus:ring-emerald-100 animate-in slide-in-from-top-2"
                />
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs font-black text-slate-500 uppercase ml-1">지출 적요</Label>
            <Input 
              placeholder="예: 실습 재료비 결제, 프로젝트 착수금 등" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-14 px-6 rounded-2xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs font-black text-slate-500 uppercase ml-1">집행 상태</Label>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant={status === 'COMPLETED' ? 'default' : 'outline'}
                onClick={() => setStatus('COMPLETED')}
                className={cn(
                  "flex-1 h-12 rounded-xl font-black text-xs",
                  status === 'COMPLETED' ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg" : "bg-white border-slate-200 text-slate-400"
                )}
              >
                집행완료
              </Button>
              <Button 
                type="button"
                variant={status === 'PENDING' ? 'default' : 'outline'}
                onClick={() => setStatus('PENDING')}
                className={cn(
                  "flex-1 h-12 rounded-xl font-black text-xs",
                  status === 'PENDING' ? "bg-amber-600 hover:bg-amber-700 shadow-lg" : "bg-white border-slate-200 text-slate-400"
                )}
              >
                집행예정
              </Button>
            </div>
          </div>

          <div className="pt-2">
             <Label className="text-xs font-black text-slate-500 uppercase ml-1 block mb-3">증빙 영수증 / 첨부 서류</Label>
             <FileUploadZone
               label="증빙 파일 업로드"
               value={uploadFile}
               onRename={(originalName) => {
                 const vendorName = selectedPartnerId === 'custom' ? customVendor : partners.find(p => p.id === selectedPartnerId)?.name || '기타';
                 const extension = originalName.split('.').pop();
                 return `[${date.replace(/-/g, '')}]_${executionItem.name}_${vendorName}.${extension}`;
               }}
               onChange={(fileInfo) => setUploadFile(fileInfo)}
               className="h-auto"
             />
          </div>
        </form>

        <DialogFooter className="p-8 bg-slate-50 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:text-slate-600"
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-100 active:scale-95 transition-all outline-none border-none"
          >
            {isSubmitting ? '저장 중...' : '집행 내역 등록 완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
