'use client';

import * as React from 'react';
import { 
  Maximize2,
  Minimize2,
  Calendar as CalendarIcon,
  X
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
import { useBudgetStore } from '@/store/use-budget-store';
import { formatWithCommas, formatInputNumber, parseCommaNumber } from '@/lib/number-format';
import { Expenditure } from '@/store/use-budget-store';

interface ExpenditureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialManagementId?: string;
  initialData?: Expenditure;
}

export function ExpenditureDialog({ open, onOpenChange, initialManagementId, initialData }: ExpenditureDialogProps) {
  const { partners } = usePartnerStore();
  const { categories, managements, addExpenditure, updateExpenditure } = useBudgetStore();

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

  // 초기 로드시 managementId가 있으면 상위 카테고리 자동 선택 또는 수정 데이터 로드
  React.useEffect(() => {
    if (open) {
      if (initialData) {
        // 수정 모드
        const man = managements.find(m => m.id === initialData.managementId);
        setDate(initialData.date || '');
        setSelectedCategoryId(man?.categoryId || '');
        setSelectedManagementId(initialData.managementId);
        setSubDetail(initialData.subDetail);
        setSupplyAmount(formatWithCommas(initialData.supplyAmount));
        setVatAmount(formatWithCommas(initialData.vatAmount));
        setProofType(initialData.proofType);
        setSelectedPartnerId(initialData.partnerId || (initialData.vendor ? 'custom' : ''));
        setCustomVendor(initialData.vendor || '');
        setDescription(initialData.description || '');
        if (initialData.attachmentName) {
          setUploadFile({
            originalName: initialData.attachmentOriginalName || '첨부파일',
            fileName: initialData.attachmentName,
            fileUrl: initialData.attachmentUrl || ''
          });
        } else {
          setUploadFile(null);
        }
      } else if (initialManagementId) {
        // 신규 등록 모드 (관리세목 선택된 경우)
        const man = managements.find(m => m.id === initialManagementId);
        if (man) {
          setSelectedCategoryId(man.categoryId);
          setSelectedManagementId(initialManagementId);
        }
        resetForm();
      } else {
        // 기본 신규 등록
        resetForm();
      }
    }
  }, [open, initialData, initialManagementId, managements]);

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

      const lv1Name = categories.find(c => c.id === selectedCategoryId)?.name || '';
      const lv2Name = managements.find(m => m.id === selectedManagementId)?.name || '';

      // 파일명 생성 함수 (YYMMDD_비목_세목_세세목_금액_랜덤)
      const getTargetFileName = (original: string) => {
        const datePart = date ? date.replace(/-/g, '').slice(2) : '000000';
        
        // 파일명에 부적합한 문자 제거 및 언더바로 치환 (Storage 유틸리티와 동기화)
        const sanitize = (str: string) => str
          .replace(/[^a-zA-Z0-9\uAC00-\uD7A3\-]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_+|_+$/g, '');
        
        const lv1Part = sanitize(lv1Name);
        const lv2Part = sanitize(lv2Name);
        const subPart = sanitize(subDetail);
        
        const rand = Math.floor(Math.random() * 900 + 100).toString();
        const ext = original.includes('.') ? original.split('.').pop() : 'pdf';
        
        // 사용자가 요청한 형식: 지출일자_비목명_관리세목명_세세목명_금액
        return `${datePart}_${lv1Part}_${lv2Part}_${subPart}_${total}_${rand}.${ext}`;
      };

      let finalUrl = uploadFile?.fileUrl;
      let storagePath = uploadFile?.fileName;

      // 1. 새 파일 업로드인 경우
      if (uploadFile?.file) {
        const fullKoreanName = getTargetFileName(uploadFile.originalName);
        
        // Storage Key는 한글이 포함되면 'Invalid key' 오류가 발생하므로 영문/숫자 위주의 안전한 경로 생성
        const datePart = date ? date.replace(/-/g, '').slice(2) : '000000';
        const safeFileName = `exp_${datePart}_${total}_${Math.floor(Math.random() * 9000 + 1000)}.pdf`;
        
        storagePath = generateStoragePath('expenditures', safeFileName);
        finalUrl = await uploadFileToStorage('partner-documents', storagePath, uploadFile.file);
        
        // attachmentOriginalName을 사용자가 요청한 한글 파일명으로 설정
        uploadFile.originalName = fullKoreanName;

        if (finalUrl?.startsWith('data:')) {
          throw new Error('파일 저장소 업로드에 실패했습니다.');
        }
      } 
      // 2. 기존 파일이 있고 파일명 구성 요소(날짜, 비목 등)가 변경된 경우 (수정 모드)
      else if (initialData?.attachmentName && uploadFile && !uploadFile.file) {
        const newFileName = getTargetFileName(uploadFile.originalName);
        const newPath = `expenditures/${newFileName}`;
        
        if (initialData.attachmentName !== newPath) {
          // 파일명 변경 옵션을 Store에 전달
        }
      }

      const commonData = {
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
        status: (date ? 'COMPLETED' : 'PENDING') as 'COMPLETED' | 'PENDING',
        attachmentOriginalName: uploadFile?.originalName,
        attachmentName: storagePath,
        attachmentUrl: finalUrl,
      };

      if (initialData) {
        // 수정 시 파일명 동기화 체크 (기존 파일이 있는 경우)
        const newPath = storagePath;
        
        await updateExpenditure(initialData.id, commonData, {
          prevPath: initialData.attachmentName,
          newPath: uploadFile ? newPath : undefined
        });
        alert('정산 데이터가 성공적으로 수정되었습니다.');
      } else {
        await addExpenditure(commonData);
        alert('정산 데이터가 성공적으로 등록되었습니다.');
      }

      onOpenChange(false);
      resetForm();
    } catch (err: unknown) {
      console.error('Submit execution failed:', err);
      // 구체적인 에러 메시지 표시
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`저장 중 오류가 발생했습니다.\n상세내용: ${errorMessage}`);
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
        <DialogHeader className="bg-emerald-600 p-4 text-white relative">
          <DialogTitle className="text-[14px] font-bold">
            {initialData ? '정산 데이터 수정' : '정산 데이터 입력'}
          </DialogTitle>
          <div className="flex flex-col gap-1 mt-0.5">
             <p className="text-[8px] font-bold text-emerald-100 uppercase tracking-widest">
               {initialData ? 'Edit Settlement Data' : 'Settlement Data Entry'}
             </p>
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
              className="text-emerald-200 hover:text-white transition-colors size-8 flex items-center justify-center"
            >
              <X className="size-5" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={cn(
          "p-6 space-y-6 bg-white overflow-y-auto custom-scrollbar",
          isMaximized ? "h-[calc(95vh-120px)]" : "max-h-[80vh]"
        )}>
          {/* 계층 선택 (LV1, LV2) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">비목 (LV1)</Label>
              <select 
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedManagementId('');
                }}
                className="w-full h-9 px-4 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-100"
              >
                <option value="">비목 선택...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">관리세목 (LV2)</Label>
              <select 
                value={selectedManagementId}
                onChange={(e) => setSelectedManagementId(e.target.value)}
                disabled={!selectedCategoryId}
                className="w-full h-9 px-4 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-100 disabled:opacity-50"
              >
                <option value="">관리세목 선택...</option>
                {filteredManagements.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">세세목 (LV3 - 직접입력)</Label>
              <Input 
                placeholder="예: 강사료, 소모품비 등" 
                value={subDetail}
                onChange={(e) => setSubDetail(e.target.value)}
                className="h-9 px-4 rounded-lg bg-slate-50 border-slate-100 font-bold text-[11px] focus:ring-1 focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">지출 일자</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                <Input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 pl-9 rounded-lg bg-slate-50 border-slate-100 font-bold text-[11px] focus:ring-1 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">공급가액</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">₩</div>
                <Input 
                  type="text"
                  placeholder="0"
                  value={supplyAmount}
                  onChange={(e) => {
                    const val = formatInputNumber(e.target.value);
                    setSupplyAmount(val);
                    const num = parseCommaNumber(val);
                    setVatAmount(formatWithCommas(Math.floor(num * 0.1)));
                  }}
                  className="h-9 pl-9 rounded-lg bg-slate-50 border-slate-100 font-bold text-[11px] focus:ring-1 focus:ring-emerald-100 text-right pr-4"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">부가세</Label>
              <Input 
                type="text"
                placeholder="0"
                value={vatAmount}
                onChange={(e) => setVatAmount(formatInputNumber(e.target.value))}
                className="h-9 px-4 rounded-lg bg-slate-50 border-slate-100 font-bold text-[11px] focus:ring-1 focus:ring-emerald-100 text-right"
              />
            </div>

          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl text-white">
            <span className="text-[10px] font-bold uppercase opacity-60">총 합계 금액 (Total)</span>
            <span className="text-[18px] font-bold">
              ₩ {formatWithCommas(parseCommaNumber(supplyAmount) + parseCommaNumber(vatAmount))}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">지출처 (협력업체)</Label>
              <select 
                value={selectedPartnerId}
                onChange={(e) => {
                  setSelectedPartnerId(e.target.value);
                  if (e.target.value !== 'custom') setCustomVendor('');
                }}
                className="w-full h-9 px-4 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-100"
              >
                <option value="">지출처 선택...</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="custom">+ 직접 입력</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">증빙 유형</Label>
              <select 
                value={proofType}
                onChange={(e) => setProofType(e.target.value)}
                className="w-full h-9 px-4 bg-slate-50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-emerald-100"
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
            <div className="space-y-1.5 animate-in slide-in-from-top-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">지출처 직접 입력</Label>
              <Input 
                placeholder="지출처 명칭 입력" 
                value={customVendor}
                onChange={(e) => setCustomVendor(e.target.value)}
                className="h-9 px-4 rounded-lg bg-white border-slate-200 font-bold text-[11px] focus:ring-1 focus:ring-emerald-100"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">지출 적요</Label>
            <Input 
              placeholder="상세 내용을 입력하세요" 
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              className="h-9 px-4 rounded-lg bg-slate-50 border-slate-100 font-bold text-[11px] focus:ring-1 focus:ring-emerald-100"
            />
          </div>

          <div className="pt-2">
             <Label className="text-xs font-black text-slate-500 uppercase ml-1 block mb-3">증빙 영수증 / 첨부 서류 (자동 명명 규칙 적용)</Label>
             <FileUploadZone
               label="증빙 파일 업로드"
               value={uploadFile}
                 onRename={(originalName) => {
                   const datePart = date ? date.replace(/-/g, '').slice(2) : '000000';
                   const lv1Name = categories.find(c => c.id === selectedCategoryId)?.name || '비목';
                   const lv2Name = managements.find(m => m.id === selectedManagementId)?.name || '세목';
                   const total = parseCommaNumber(supplyAmount) + parseCommaNumber(vatAmount);
                   const rand = Math.floor(Math.random() * 900 + 100).toString();
                   const ext = originalName.includes('.') ? originalName.split('.').pop() : 'pdf';
                   
                   const sanitize = (str: string) => str.replace(/[\/\\:*?"<>|]/g, '').trim();
                   return `${datePart}_${sanitize(lv1Name)}_${sanitize(lv2Name)}_${sanitize(subDetail)}_${total}_${rand}.${ext}`;
                 }}
               onChange={(fileInfo) => setUploadFile(fileInfo)}
               className="h-auto"
             />
          </div>
        </form>

        <DialogFooter className="p-4 bg-slate-50 flex gap-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg font-bold text-[11px] text-slate-400 hover:text-slate-600"
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-md transition-all border-none"
          >
            {isSubmitting ? '저장 중...' : (initialData ? '수정 완료' : '등록 완료')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
