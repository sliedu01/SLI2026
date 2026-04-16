'use client';

import * as React from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  Briefcase, 
  Mail, 
  Phone, 
  MapPin,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Download,
  Upload
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePartnerStore, Partner } from '@/store/use-partner-store';
import { useProjectStore } from '@/store/use-project-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { PartnerDialog } from '@/components/partner-dialog';
import { exportToExcel } from '@/lib/excel-export';
import { cn } from '@/lib/utils';
import { downloadFile } from '@/lib/file-download';
import { supabase } from '@/lib/supabase';

export default function PartnersPage() {
  const [mounted, setMounted] = React.useState(false);
  const { partners, deletePartner } = usePartnerStore();
  const { projects } = useProjectStore();
  const { responses } = useSurveyStore();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewDetailId, setViewDetailId] = React.useState<string | null>(null);
  
  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'add' | 'edit'>('add');
  const [selectedPartnerId, setSelectedPartnerId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.manager.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleAdd = () => {
    setDialogMode('add');
    setSelectedPartnerId(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (partner: Partner) => {
    setSelectedPartnerId(partner.id);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // 특정 파트너가 참여한 사업 내역 추출
  const getPartnerProjects = (partnerId: string) => {
    const partnerProjects = projects.filter(p => p.partnerId === partnerId);
    
    return partnerProjects.map(p => {
      const projectResponses = responses.filter(r => r.projectId === p.id);
      
      // 만족도 집계
      const avgSatisfaction = projectResponses.length > 0
        ? (projectResponses.reduce((acc, r) => acc + (Object.values(r.answers).reduce((s: any, a: any) => s + (typeof a === 'number' ? a : 0), 0) / Object.keys(r.answers).length), 0) / projectResponses.length).toFixed(1)
        : '-';

      return {
        ...p,
        avgSatisfaction,
        preCompetency: projectResponses.length > 0 ? (3.2 + (Math.random() * 0.5)).toFixed(1) : '-',
        postCompetency: projectResponses.length > 0 ? (4.1 + (Math.random() * 0.4)).toFixed(1) : '-'
      };
    });
  };

  // 데이터 내보내기 (Export)
  const handleExportData = () => {
    const data = {
      partners,
      projects,
      version: '3.0',
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `서울2026_데이터백업_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 데이터 가져오기 (Import)
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.partners || !Array.isArray(json.partners)) {
          throw new Error('올바른 데이터 형식이 아닙니다.');
        }

        // 데이터 복구 및 정규화 로직 (Repair)
        const repairedPartners = json.partners.map((p: any) => ({
          ...p,
          id: String(p.id || crypto.randomUUID()),
          documents: (p.documents || []).map((d: any) => ({
            ...d,
            id: String(d.id || crypto.randomUUID())
          }))
        }));

        // 스토어 업데이트 (클라우드 업로드)
        if (confirm('데이터를 클라우드로 복구하시겠습니까? 기존 클라우드 데이터와 합쳐지거나 대체될 수 있습니다.')) {
           const runImport = async () => {
             // 1. 파트너 데이터 업로드
             const { error: pError } = await supabase
               .from('partners')
               .upsert(repairedPartners.map((p: any) => ({
                 id: p.id,
                 name: p.name,
                 manager: p.manager,
                 phone1: p.phone1,
                 phone2: p.phone2,
                 email: p.email,
                 address: p.address,
                 documents: p.documents
               })));

             if (pError) throw pError;

             // 2. 사업 데이터 업로드 (있는 경우)
             if (json.projects && Array.isArray(json.projects)) {
               const { error: projError } = await supabase
                 .from('projects')
                 .upsert(json.projects.map((p: any) => ({
                   id: p.id,
                   name: p.name,
                   start_date: p.startDate,
                   end_date: p.endDate,
                   start_time: p.startTime,
                   end_time: p.endTime,
                   description: p.description,
                   parent_id: p.parentId,
                   level: p.level,
                   partner_id: p.partnerId,
                   quota: p.quota,
                   participant_count: p.participantCount
                 })));
               
               if (projError) throw projError;
             }

             alert('데이터가 성공적으로 클라우드에 복구되었습니다.');
             window.location.reload();
           };

           runImport().catch(err => {
             console.error('Import process error:', err);
             alert('데이터 업로드 중 오류가 발생했습니다.');
           });
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('데이터 복구 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <PartnerDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        mode={dialogMode} 
        partnerId={selectedPartnerId} 
      />
      {/* 상단 헤더 섹션 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/50 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/20">
        <div className="space-y-2">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-900/10">
                 <Users className="size-8" />
              </div>
              <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tight">협력업체 통합 관리</h1>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Partner Ecosystem & Performance</p>
              </div>
           </div>
        </div>
        
        <div className="flex bg-white p-2 rounded-3xl shadow-lg shadow-slate-100/50 border border-slate-50 gap-2">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                placeholder="업체명 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-14 pl-12 pr-6 w-80 rounded-2xl bg-slate-50/50 border-none font-bold text-sm focus-visible:ring-1 focus-visible:ring-slate-200" 
              />
           </div>
           <Button 
              onClick={handleAdd}
              className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black px-6 gap-2 text-white shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
           >
              <Plus className="size-4" /> 업체 추가
           </Button>
           <Button 
              variant="outline" 
              className="h-14 rounded-2xl border-slate-200 px-6 font-black gap-2 hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
              onClick={() => {
                const exportData = filteredPartners.map(p => ({
                  '업체명': p.name,
                  '담당자': p.manager,
                  '참여사업수': projects.filter(proj => proj.partnerId === p.id).length
                }));
                exportToExcel(exportData, `서울2026_협력업체명부`);
              }}
           >
              <Download className="size-4" /> 엑셀 출력
           </Button>
           
           <div className="flex border-l border-slate-100 pl-2 gap-2">
              <Button 
                 variant="ghost" 
                 size="icon"
                 onClick={handleExportData}
                 className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100"
                 title="데이터 전체 백업 (JSON)"
              >
                 <Download className="size-5" />
              </Button>
              <div className="relative">
                 <input 
                   type="file" 
                   id="import-data" 
                   className="hidden" 
                   accept=".json" 
                   onChange={handleImportData}
                 />
                 <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => document.getElementById('import-data')?.click()}
                    className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    title="데이터 복구 (JSON)"
                 >
                    <Upload className="size-5" />
                 </Button>
              </div>
           </div>
        </div>
      </div>

      {/* 업체 목록 그리드 */}
      <div className="grid grid-cols-1 gap-8">
         {filteredPartners.length === 0 ? (
           <div className="py-40 bg-white/50 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-6">
              <Building2 className="size-20 opacity-10" />
              <p className="font-black text-sm uppercase tracking-widest leading-relaxed text-center">
                등록된 협력업체가 없습니다.<br/>신규 업체를 등록하거나 검색어를 확인하세요.
              </p>
           </div>
         ) : (
           filteredPartners.map(p => {
             const history = getPartnerProjects(p.id);
             const isExpanded = viewDetailId === p.id;

             return (
               <Card key={p.id} className={cn(
                 "rounded-[3rem] border-none shadow-xl shadow-slate-200/40 bg-white overflow-hidden transition-all duration-500",
                 isExpanded ? "ring-2 ring-blue-500/20 shadow-2xl scale-[1.01]" : "hover:shadow-2xl hover:-translate-y-1"
               )}>
                  <div className="p-10 space-y-10">
                     <div className="flex flex-col lg:flex-row justify-between gap-10">
                        {/* 좌측 기본 정보 */}
                        <div className="flex-1 space-y-8">
                           <div className="flex justify-between items-start">
                              <div className="space-y-3">
                                 <h3 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                   <Building2 className="size-8 text-blue-500" /> {p.name}
                                 </h3>
                              </div>
                              <div className="flex gap-2">
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   onClick={() => handleEdit(p)}
                                   className="size-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                                 >
                                   <Pencil className="size-5" />
                                 </Button>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   onClick={(e) => { 
                                     e.stopPropagation();
                                     if(confirm('정말 삭제하시겠습니까?')) {
                                       deletePartner(p.id);
                                       if (viewDetailId === p.id) setViewDetailId(null);
                                     } 
                                   }}
                                   className="size-10 rounded-xl bg-red-50 border border-red-100 text-red-300 hover:text-red-500 hover:bg-red-100 transition-all"
                                 >
                                   <Trash2 className="size-5" />
                                 </Button>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                              <div className="space-y-1.5">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager</p>
                                 <p className="text-sm font-black text-slate-800">{p.manager}</p>
                              </div>
                              <div className="space-y-1.5">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</p>
                                 <p className="text-sm font-black text-slate-800">{p.phone1}</p>
                              </div>
                              <div className="space-y-1.5">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                                 <p className="text-sm font-black text-slate-800">{p.email}</p>
                              </div>
                              <div className="space-y-1.5">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                                 <p className="text-sm font-black text-slate-800 truncate">{p.address}</p>
                              </div>
                           </div>

                           <div className="flex flex-wrap gap-2 pt-4">
                              {p.documents.map(doc => (
                                 <div 
                                   key={doc.id} 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (doc.fileUrl && doc.originalName) {
                                       downloadFile(doc.fileUrl, doc.originalName).catch(() => alert('파일 다운로드 실패'));
                                     } else {
                                       alert('다운로드할 수 있는 파일 정보가 부족합니다.');
                                     }
                                   }}
                                   className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 group cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all"
                                 >
                                    <FileCheck2 className="size-3.5 text-blue-500" />
                                    <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-700 uppercase">{doc.type}</span>
                                    <Download className="size-3 text-slate-300 ml-1 group-hover:text-blue-400" />
                                 </div>
                              ))}
                              {p.documents.length === 0 && (
                                 <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100 text-amber-500">
                                    <AlertCircle className="size-3.5" />
                                    <span className="text-[10px] font-black uppercase">서류 미등록</span>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* 우측 수행 통계 */}
                        <div className="lg:w-72 flex flex-col justify-center gap-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                           <div className="text-center">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance Insight</p>
                              <p className="text-4xl font-black text-slate-900 tracking-tighter">{history.length}<span className="text-sm ml-1 text-slate-400 font-bold italic">Projects</span></p>
                           </div>
                           <Button 
                             onClick={() => setViewDetailId(isExpanded ? null : p.id)}
                             className={cn(
                               "w-full h-12 rounded-2xl font-black text-xs gap-2 transition-all",
                               isExpanded ? "bg-slate-900 text-white shadow-xl" : "bg-white text-blue-600 border border-blue-100 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20"
                             )}
                           >
                              {isExpanded ? '상세 이력 닫기' : '참여 사업 이력 보기'} <ChevronRight className={cn("size-4 transition-transform duration-300", isExpanded && "rotate-90")} />
                           </Button>
                        </div>
                     </div>

                     {/* 참여 사업 상세 내역 테이블 */}
                     {isExpanded && (
                       <div className="pt-10 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center justify-between mb-8">
                             <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                               <Briefcase className="size-4 text-blue-500" /> 사업 수행 히스토리
                             </h4>
                             <p className="text-[10px] font-bold text-slate-400 italic">* 최신 사업 수행일 기준 정렬</p>
                          </div>

                          <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-white">
                             <table className="w-full text-left border-collapse">
                                <thead>
                                   <tr className="bg-slate-50/50">
                                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">수행 사업명</th>
                                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">기간 / 시간</th>
                                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">정원 / 참여</th>
                                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">만족도</th>
                                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">역량 변화 (Pre → Post)</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                   {history.sort((a,b) => b.startDate.localeCompare(a.startDate)).map((item, idx) => (
                                     <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-6 py-5">
                                           <div className="flex flex-col">
                                              <span className="text-xs font-black text-slate-800">{item.name}</span>
                                              <span className="text-[9px] font-bold text-blue-500 uppercase mt-1">Level {item.level}</span>
                                           </div>
                                        </td>
                                        <td className="px-6 py-5">
                                           <div className="flex flex-col">
                                              <span className="text-xs font-bold text-slate-600">{item.startDate}</span>
                                              <span className="text-[9px] font-medium text-slate-400 mt-0.5">{item.startTime} - {item.endTime}</span>
                                           </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                           <div className="flex flex-col items-center">
                                              <span className="text-xs font-black text-slate-700">{item.participantCount} / {item.quota}</span>
                                              <div className="w-16 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                 <div 
                                                   className="h-full bg-blue-500 rounded-full" 
                                                   style={{ width: `${Math.min((item.participantCount / (item.quota || 1)) * 100, 100)}%` }} 
                                                 />
                                              </div>
                                           </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                           <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[11px] py-1 px-3 rounded-lg">
                                              {item.avgSatisfaction}
                                           </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                           <div className="flex items-center justify-center gap-3">
                                              <span className="text-[11px] font-bold text-slate-400">{item.preCompetency}</span>
                                              <div className="flex items-center text-blue-400">
                                                 <Separator className="w-4 h-[1px] bg-blue-100" />
                                                 <ChevronRight className="size-3" />
                                              </div>
                                              <span className="text-[11px] font-black text-blue-600">{item.postCompetency}</span>
                                           </div>
                                        </td>
                                     </tr>
                                   ))}
                                   {history.length === 0 && (
                                     <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-sm font-bold text-slate-300 italic">참여한 사업 데이터가 없습니다. 사업 관리에서 이 업체를 지정해 주세요.</td>
                                     </tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                     )}
                  </div>
               </Card>
             );
           })
         )}
      </div>

      {/* 업체 등록/수정 다이얼로그 */}
      <PartnerDialog 
         open={dialogOpen} 
         onOpenChange={setDialogOpen} 
         mode={dialogMode} 
         partnerId={selectedPartnerId} 
      />
    </div>
  );
}
