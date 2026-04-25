'use client';

import * as React from 'react';
import { 
  X, 
  Plus, 
  Trash2,
  RefreshCw,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';

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
import { usePartnerStore, PartnerDocument } from '@/store/use-partner-store';
import { Project } from '@/store/use-project-store';
import { FileUploadZone } from './file-upload-zone';
import { Separator } from '@/components/ui/separator';
import { uploadFileToStorage, generateStoragePath } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface PartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  mode?: 'add' | 'edit';
  partnerId?: string;
}

// 안전한 ID 생성 헬퍼
const generateSafeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export function PartnerDialog({ open, onOpenChange, project, mode = 'add', partnerId }: PartnerDialogProps) {
  const { partners, addPartner, updatePartner } = usePartnerStore();

  const [name, setName] = React.useState('');
  const [abbreviation, setAbbreviation] = React.useState('');
  const [manager, setManager] = React.useState('');
  const [phone1, setPhone1] = React.useState('');
  const [phone2, setPhone2] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);
  
  // 가변 계약서 리스트
  const [contracts, setContracts] = React.useState<{id: string, name: string, originalName?: string, fileUrl?: string, file?: File}[]>([{ id: 'c1', name: '' }]);
  
  // 증빙 서류 상태 관리
  const [docs, setDocs] = React.useState<Record<string, { originalName: string, fileName: string, fileUrl: string, file?: File }>>({});

  // 초기화 함수
  const resetForm = React.useCallback(() => {
    setName('');
    setAbbreviation('');
    setManager('');
    setPhone1('');
    setPhone2('');
    setEmail('');
    setAddress('');
    setDocs({});
    setContracts([{ id: 'c1', name: '' }]);
  }, []);

  // 초기 데이터 세팅
  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && partnerId) {
        const p = partners.find(item => item.id === partnerId);
        if (p) {
          setName(p.name);
          setAbbreviation(p.abbreviation || '');
          setManager(p.manager);
          setPhone1(p.phone1);
          setPhone2(p.phone2);
          setEmail(p.email);
          setAddress(p.address);
          
          const docMap: Record<string, { originalName: string, fileName: string, fileUrl: string }> = {};
          const contractList: {id: string, name: string, originalName?: string, fileUrl?: string}[] = [];
          p.documents.forEach(d => {
            if (d.type.includes('계약서')) {
              contractList.push({ id: d.id, name: d.fileName, originalName: d.originalName, fileUrl: d.fileUrl });
            } else {
              docMap[d.type] = { originalName: d.originalName, fileName: d.fileName, fileUrl: d.fileUrl || '' };
            }
          });
          setDocs(docMap);
          setContracts(contractList.length > 0 ? contractList : [{ id: 'c1', name: '' }]);
        }
      }
    }
  }, [open, mode, partnerId, project, partners, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('업체명을 입력해주세요.'); return; }

    setIsSubmitting(true);
    try {
      // 기존 문서들 중 계약서가 아닌 것들 보관
      const partner = partners.find(p => p.id === partnerId);
      const existingOtherDocs = partner ? partner.documents.filter(d => 
        !['사업자등록증', '통장사본', '보험증권', '사전점검체크리스트'].includes(d.type) && 
        !d.type.includes('계약서')
      ) : [];

      const combinedDocs: PartnerDocument[] = [...existingOtherDocs];
      
      // 1. 공통 증빙 서류 업로드 처리
      const commonTypes = ['사업자등록증', '통장사본', '보험증권', '사전점검체크리스트'];
      for (const type of commonTypes) {
        const info = docs[type];
        if (!info) continue;

        let finalUrl = info.fileUrl;
        let storagePath = info.fileName;
        
        // 새로 선택된 파일이 있는 경우에만 클라우드 업로드 수행
        if (info.file) {
          storagePath = generateStoragePath('partners', info.fileName);
          finalUrl = await uploadFileToStorage('partner-documents', storagePath, info.file);
        }

        if (finalUrl) {
          // [중요] 만약 업로드를 거치지 않아 여전히 Base64(data:) 형태라면 데이터베이스 저장을 차단
          if (finalUrl.startsWith('data:')) {
            throw new Error(`${type} 파일 업로드에 실패했습니다. 다시 시도해 주세요.`);
          }

          combinedDocs.push({
            id: generateSafeId(),
            type,
            originalName: info.fileName, // [수정] pretty name을 보존
            fileName: storagePath,
            fileUrl: finalUrl
          });
        }
      }
      
      // 2. 계약서 및 기타 서류 업로드 처리
      for (let i = 0; i < contracts.length; i++) {
        const c = contracts[i];
        if (c.name) {
          let finalUrl = c.fileUrl;
          let storagePath = c.name;
          
          if (c.file) {
            storagePath = generateStoragePath('partners', c.name);
            finalUrl = await uploadFileToStorage('partner-documents', storagePath, c.file);
          }

          if (finalUrl) {
            // [중요] 만약 업로드를 거치지 않아 여전히 Base64(data:) 형태라면 데이터베이스 저장을 차단
            if (finalUrl.startsWith('data:')) {
              throw new Error(`${i+1}회차 계약서 파일 업로드에 실패했습니다. 다시 시도해 주세요.`);
            }

            combinedDocs.push({
              id: c.id || generateSafeId(),
              type: `${i+1}회차 계약서`,
              originalName: c.originalName || c.name, // 이미 pretty name이거나 수동 입력된 이름
              fileName: storagePath,
              fileUrl: finalUrl
            });
          }
        }
      }

      const partnerData = {
        name,
        abbreviation,
        manager,
        phone1,
        phone2,
        email,
        address,
        documents: combinedDocs,
      };

      if (mode === 'add') {
        await addPartner(partnerData);
      } else if (mode === 'edit' && partnerId) {
        await updatePartner(partnerId, partnerData);
      }

      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Submit error:', err);
      // 구체적인 에러 메시지 제공
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('storage') || errorMsg.includes('upload')) {
        alert(`파일 업로드 중 오류가 발생했습니다. 저장소(Bucket) 권한이나 네트워크를 확인해주세요.\n(에러: ${errorMsg})`);
      } else {
        alert(`데이터 저장 중 오류가 발생했습니다: ${errorMsg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl transition-all duration-300",
        isMaximized ? "max-w-[1700px] w-[98vw] h-[95vh]" : "max-w-[95vw] md:max-w-4xl lg:max-w-5xl"
      )}>
        <DialogHeader className="bg-slate-900 p-8 text-white relative">
           <DialogTitle className="text-2xl font-black">
             {mode === 'add' ? '협력업체 신규 등록' : '협력업체 정보 수정'}
           </DialogTitle>
           <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
             Global Partner Registry & Compliance
           </p>
            <div className="absolute top-8 right-8 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMaximized(!isMaximized)}
                className="text-slate-400 hover:text-white"
              >
                {isMaximized ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
              </Button>
              <button 
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={cn(
          "p-10 space-y-10 overflow-y-auto custom-scrollbar bg-slate-50/50",
          isMaximized ? "h-[calc(95vh-160px)]" : "max-h-[75vh]"
        )}>
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 grid gap-2.5">
                <Label className="text-xs font-black text-blue-600 ml-1 uppercase">업체명 <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="상호명(업체명)을 입력하세요" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 px-6 rounded-2xl bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 font-bold" 
                  required
                />
              </div>
              <div className="grid gap-2.5">
                <Label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-wider">업체 별칭 (약어)</Label>
                <Input 
                  placeholder="약어 입력" 
                  value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value)}
                  className="h-14 px-6 rounded-2xl bg-white border-slate-200 font-bold" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="grid gap-2.5">
                <Label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-wider">담당자 성명</Label>
                <Input 
                  placeholder="담당자 이름을 입력하세요" 
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  className="h-14 px-6 rounded-2xl bg-white border-slate-200" 
                />
              </div>
              <div className="grid gap-2.5">
                <Label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-wider">대표 연락처</Label>
                <Input 
                  placeholder="010-0000-0000" 
                  value={phone1}
                  onChange={(e) => setPhone1(e.target.value)}
                  className="h-14 px-6 rounded-2xl bg-white border-slate-200" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="grid gap-2.5">
                <Label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-wider">담당자 이메일</Label>
                <Input 
                  placeholder="office@partner.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 px-6 rounded-2xl bg-white border-slate-200" 
                />
              </div>
              <div className="grid gap-2.5">
                <Label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-wider">추가 연락처</Label>
                <Input 
                  placeholder="02-000-0000 (선택)" 
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value)}
                  className="h-14 px-6 rounded-2xl bg-white border-slate-200" 
                />
              </div>
            </div>

            <div className="grid gap-2.5">
              <Label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-wider">회사 주소</Label>
              <Input 
                placeholder="상세 주소를 입력하세요" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-14 px-6 rounded-2xl bg-white border-slate-200" 
              />
            </div>
          </section>

          <Separator className="bg-slate-200/60" />

          <section className="space-y-6">
              <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">공통 증빙 서류</h3>
              </div>

              {/* 안내 가이드 섹션 추가 */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Info className="size-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">증빙 서류 제출 가이드</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3">
                  {[
                    { label: '사업자등록증', desc: '파트너사의 상호, 대표자, 업태 및 종목 확인을 위한 필수 서류입니다.' },
                    { label: '통장사본', desc: '정산 대금 결제를 위한 계좌 정보 확인용으로 사용됩니다.' },
                    { label: '보험증권', desc: '영업배상책임 및 사고 보장 범위 확인을 위해 필요합니다.' },
                    { label: '사전점검체크리스트', desc: '교육 시설 및 인프라의 보안/안전 점검 결과를 기록한 서류입니다.' },
                  ].map((guide, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="size-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-black text-slate-700">{guide.label}</p>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{guide.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  '사업자등록증', '통장사본', '보험증권', '사전점검체크리스트'
                ].map(type => (
                  <FileUploadZone
                    key={type}
                    label={type}
                    value={docs[type] ? {
                      originalName: docs[type].originalName,
                      fileName: docs[type].fileName,
                      fileUrl: docs[type].fileUrl
                    } : null}
                    onRename={(originalName) => {
                      const extension = originalName.split('.').pop();
                      // 프로젝트가 있으면 프로젝트명 포함, 없으면 업체명만
                      return `${project?.name || '공통'}_${name || '업체'}_${type}.${extension}`;
                    }}
                    onChange={(fileInfo) => {
                      if (fileInfo) {
                        setDocs(prev => ({ ...prev, [type]: fileInfo }));
                      } else {
                        setDocs(prev => {
                          const next = { ...prev };
                          delete next[type];
                          return next;
                        });
                      }
                    }}
                  />
                ))}
             </div>
          </section>

          <section className="space-y-6">
             <div className="flex items-center justify-between border-l-4 border-slate-400 pl-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">계약서 및 기타 서류</h3>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setContracts(prev => [...prev, { id: generateSafeId(), name: '' }])}
                  className="h-8 rounded-lg font-black text-[10px] text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="size-3 mr-1" /> 서류 항목 추가
                </Button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {contracts.map((c, i) => (
                   <div key={c.id} className="relative group/contract">
                      <FileUploadZone
                        label={c.id === 'c1' && i === 0 ? '기본 계약서' : `추가 서류 ${i+1}`}
                        value={c.name ? {
                          originalName: c.originalName || '',
                          fileName: c.name,
                          fileUrl: c.fileUrl
                        } : null}
                        onRename={(originalName) => {
                          const extension = originalName.split('.').pop();
                          return `${project?.name || '계약'}_${name || '업체'}_문서${i+1}.${extension}`;
                        }}
                        onChange={(fileInfo) => {
                          const newList = [...contracts];
                          if (fileInfo) {
                            newList[i] = {
                              ...newList[i],
                              name: fileInfo.fileName,
                              originalName: fileInfo.originalName,
                              fileUrl: fileInfo.fileUrl,
                              file: fileInfo.file // [수정] 실제 파일 객체 보관
                            };
                          } else {
                            newList[i] = { ...newList[i], name: '', originalName: '', fileUrl: '', file: undefined };
                          }
                          setContracts(newList);
                        }}
                      />
                      {contracts.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => setContracts(prev => prev.filter(item => item.id !== c.id))}
                          className="absolute top-8 -right-2 z-10 size-7 bg-red-100 text-red-600 rounded-full opacity-0 group-hover/contract:opacity-100 flex items-center justify-center transition-all shadow-md"
                        >
                           <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                 ))}
              </div>
           </section>
         </form>
 
         <DialogFooter className="p-8 bg-white border-t border-slate-50 flex gap-3">
           <Button 
             type="button" 
             variant="ghost" 
             onClick={() => onOpenChange(false)}
             className="flex-1 h-16 rounded-2xl border-slate-100 text-slate-500 font-black"
           >
             취소
           </Button>
           <Button 
             onClick={handleSubmit}
             disabled={isSubmitting}
             className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isSubmitting ? (
               <div className="flex items-center gap-2">
                 <RefreshCw className="size-5 animate-spin" />
                 <span>처리 중...</span>
               </div>
             ) : (
               mode === 'add' ? '업체 등록하기' : '정보 수정 완료'
             )}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
  );
}
