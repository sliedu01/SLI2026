'use client';

import * as React from 'react';
import { 
  X, 
  DollarSign, 
  Calendar as CalendarIcon, 
  Building2,
  Maximize2,
  Minimize2
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
import { formatWithCommas, formatInputNumber, parseCommaNumber } from '@/lib/number-format';

interface ExpenditureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialManagementId?: string;
}

export function ExpenditureDialog({ open, onOpenChange, initialManagementId }: ExpenditureDialogProps) {
  const { partners } = usePartnerStore();
  const { categories, managements, addExpenditure } = useBudgetStore();

  const [date, setDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');
  const [selectedManagementId, setSelectedManagementId] = React.useState(initialManagementId || '');
  const [subDetail, setSubDetail] = React.useState('');
  const [supplyAmount, setSupplyAmount] = React.useState('');
  const [vatAmount, setVatAmount] = React.useState('');
  const [proofType, setProofType] = React.useState('TAX_INVOICE');
  const [selectedPartnerId, setSelectedPartnerId] = React.useState('');
  const [customVendor, setCustomVendor] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [uploadFile, setUploadFile] = React.useState<{ originalName: string, fileName: string, fileUrl: string, file?: File } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);

  // 초기 로드시 managementId가 있으면 상위 카테고리 자동 선택
  React.useEffect(() => {
    if (initialManagementId) {
      const man = managements.find(m => m.id === initialManagementId);
      if (man) {
        setSelectedCategoryId(man.categoryId);
        setSelectedManagementId(initialManagementId);
      }
    }
  }, [initialManagementId, managements]);

  const filteredManagements = managements.filter(m => m.categoryId === selectedCategoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseCommaNumber(supplyAmount) + parseCommaNumber(vatAmount);
    
    if (!selectedManagementId) {
      alert('관리세목(LV2)을 선택해 주세요.');
      return;
    }

    if (!subDetail) {
      alert('세세목(LV3) 명칭을 입력해 주세요.');
      return;
    }

    if (total <= 0) {
      alert('공급가액 또는 총액이 0보다 커야 합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const vendorName = selectedPartnerId === 'custom'
        ? customVendor
        : partners.find(p => p.id === selectedPartnerId)?.name || '';

      let finalUrl = uploadFile?.fileUrl;
      let storagePath = uploadFile?.fileName;

      if (uploadFile?.file) {
        storagePath = generateStoragePath('expenditures', uploadFile.fileName);
        finalUrl = await uploadFileToStorage('partner-documents', storagePath, uploadFile.file);
      }

      await addExpenditure({
        managementId: selectedManagementId,
        subDetail,
        date,
        amount: total,
        supplyAmount: parseCommaNumber(supplyAmount),
        vatAmount: parseCommaNumber(vatAmount),
        proofType,
        partnerId: selectedPartnerId === 'custom' ? undefined : selectedPartnerId,
        vendor: vendorName,
        description,
        status: date ? 'COMPLETED' : 'PENDING',
        attachmentOriginalName: uploadFile?.originalName,
        attachmentName: storagePath,
        attachmentUrl: finalUrl,
      });

      alert('정산 데이터가 성공적으로 등록되었습니다.');
      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      console.error('Submit execution failed:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSubDetail('');
    setSupplyAmount('');
    setVatAmount('');
    setSelectedPartnerId('');
    setCustomVendor('');
    setDescription('');
    setUploadFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl transition-all duration-300",
        isMaximized ? "max-w-[1700px] w-[98vw] h-[95vh]" : "max-w-lg"
      )}>
        <DialogHeader className="bg-emerald-600 p-8 text-white relative">
          <DialogTitle className="text-2xl font-black">정산 데이터 입력</DialogTitle>
          <div className="flex flex-col gap-1 mt-1">
             <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em]">Settlement Data Entry</p>
          </div>
          <div className="absolute top-8 right-8 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-emerald-100 hover:text-white"
            >
              {isMaximized ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
            </Button>
            <button 
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-emerald-200 hover:text-white transition-colors"
            >
              <X className="size-6" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={cn(
          "p-10 space-y-8 bg-white overflow-y-auto custom-scrollbar",
          isMaximized ? "h-[calc(95vh-160px)]" : "max-h-[80vh]"
        )}>
          {/* 계층 선택 (LV1, LV2) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">비목 (LV1)</Label>
              <select 
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedManagementId('');
                }}
                className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">비목 선택...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">관리세목 (LV2)</Label>
              <select 
                value={selectedManagementId}
                onChange={(e) => setSelectedManagementId(e.target.value)}
                disabled={!selectedCategoryId}
                className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
              >
                <option value="">관리세목 선택...</option>
                {filteredManagements.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">세세목 (LV3 - 직접입력)</Label>
              <Input 
                placeholder="예: 강사료, 소모품비 등" 
                value={subDetail}
                onChange={(e) => setSubDetail(e.target.value)}
                className="h-14 px-6 rounded-2xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">지출 일자 (예정시 비워둠)</Label>
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
          </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">공급가액</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input 
                  type="text"
                  placeholder="0"
                  value={supplyAmount}
                  onChange={(e) => {
                    const val = formatInputNumber(e.target.value);
                    setSupplyAmount(val);
                    // 자동 부가세 계산 (10%)
                    const num = parseCommaNumber(val);
                    setVatAmount(formatWithCommas(Math.floor(num * 0.1)));
                  }}
                  className="h-14 pl-12 rounded-2xl bg-slate-50 border-none font-black focus:ring-2 focus:ring-emerald-100 text-right pr-6"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">부가세</Label>
              <Input 
                type="text"
                placeholder="0"
                value={vatAmount}
                onChange={(e) => setVatAmount(formatInputNumber(e.target.value))}
                className="h-14 px-6 rounded-2xl bg-slate-50 border-none font-black focus:ring-2 focus:ring-emerald-100 text-right"
              />
            </div>

          <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
            <span className="text-xs font-black uppercase opacity-60">총 합계 금액 (Total)</span>
            <span className="text-2xl font-black">
              ₩ {formatWithCommas(parseCommaNumber(supplyAmount) + parseCommaNumber(vatAmount))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">지출처 (협력업체)</Label>
              <select 
                value={selectedPartnerId}
                onChange={(e) => {
                  setSelectedPartnerId(e.target.value);
                  if (e.target.value !== 'custom') setCustomVendor('');
                }}
                className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">지출처 선택...</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="custom">+ 직접 입력</option>
              </select>
            </div>
            <div className="space-y-2.5">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">증빙 유형</Label>
              <select 
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
                className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="TAX_INVOICE">세금계산서</option>
                <option value="RECEIPT">영수증</option>
                <option value="DEPOSIT">입금증</option>
                <option value="CASH_RECEIPT">현금영수증</option>
                <option value="CARD">카드전표</option>
                <option value="OTHER">기타</option>
              </select>
            </div>
          </div>

          {selectedPartnerId === 'custom' && (
            <div className="space-y-2.5 animate-in slide-in-from-top-2">
              <Label className="text-xs font-black text-slate-500 uppercase ml-1">지출처 직접 입력</Label>
              <Input 
                placeholder="지출처 명칭 입력" 
                value={customVendor}
                onChange={(e) => setCustomVendor(e.target.value)}
                className="h-14 px-6 rounded-2xl bg-white border-slate-200 font-bold focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          <div className="space-y-2.5">
            <Label className="text-xs font-black text-slate-500 uppercase ml-1">지출 적요 (100자 이내)</Label>
            <Input 
              placeholder="상세 내용을 입력하세요" 
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              className="h-14 px-6 rounded-2xl bg-slate-50 border-none font-bold focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="pt-2">
             <Label className="text-xs font-black text-slate-500 uppercase ml-1 block mb-3">증빙 영수증 / 첨부 서류 (자동 명명 규칙 적용)</Label>
             <FileUploadZone
               label="증빙 파일 업로드"
               value={uploadFile}
               onRename={(originalName) => {
                 const cleanDate = date ? date.replace(/-/g, '').slice(2) : '260000';
                 const catName = categories.find(c => c.id === selectedCategoryId)?.name || '비목';
                 const manName = managements.find(m => m.id === selectedManagementId)?.name || '세목';
                 const series = Math.floor(Math.random() * 90 + 10).toString(); 
                 const namePrefix = `${cleanDate}_${catName.slice(0,2)}_${manName.slice(0,2)}_${subDetail.slice(0,3)}_${series}_`;
                 return `${namePrefix}${originalName}`;
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
