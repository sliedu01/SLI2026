'use client';

import * as React from 'react';
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  FileCheck2,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Download,
  Upload
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { usePartnerStore, Partner } from '@/store/use-partner-store';
import { useProjectStore, getAggregatedProject } from '@/store/use-project-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { PartnerDialog } from '@/components/partner-dialog';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { LayoutGrid } from 'lucide-react';
import { downloadFile } from '@/lib/file-download';
import { supabase } from '@/lib/supabase';

export default function PartnersPage() {
  const [mounted, setMounted] = React.useState(false);
  const { partners, deletePartner, isLoading, fetchPartners } = usePartnerStore();
  const { projects, fetchProjects, selectedLv1Ids } = useProjectStore();
  const { getAggregatedStats } = useSurveyStore();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [viewDetailId, setViewDetailId] = React.useState<string | null>(null);
  
  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'add' | 'edit'>('add');
  const [selectedPartnerId, setSelectedPartnerId] = React.useState<string | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");

  const { setSelectedLv1Ids } = useProjectStore();

  // 대시보드 선택된 사업과 동기화
  React.useEffect(() => {
    if (selectedLv1Ids.length > 0) {
      setSelectedProjectId(selectedLv1Ids[0]);
    } else {
      setSelectedProjectId("all");
    }
  }, [selectedLv1Ids, projects]);

  React.useEffect(() => {
    setMounted(true);
    fetchPartners();
    fetchProjects();
  }, [fetchPartners, fetchProjects]);

  if (!mounted) return null;

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.manager.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 글로벌 LV1 필터링 적용
    if (selectedLv1Ids.length > 0) {
      const partnerProjectIds = projects.filter(proj => proj.partnerId === p.id).map(proj => proj.id);
      
      // [수정] 사업에 배정되지 않은 신규 업체는 항상 노출 (필터링 예외)
      if (partnerProjectIds.length === 0) return matchesSearch;

      const isRelatedToSelectedLv1 = partnerProjectIds.some(pid => {
        let current = projects.find(proj => proj.id === pid);
        while (current && current.parentId && current.level > 1) {
          current = projects.find(proj => proj.id === current!.parentId);
        }
        return current && selectedLv1Ids.includes(current.id);
      });
      if (!isRelatedToSelectedLv1) return false;
    }

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
    // 실시간으로 프로젝트 데이터를 집계하여 최신 상태 유지 (세션 및 하위 프로젝트 반영)
    const partnerProjects = projects
      .filter(p => p.partnerId === partnerId)
      .filter(p => {
        if (selectedLv1Ids.length === 0) return true;
        let current = p;
        while (current.parentId && current.level > 1) {
          const parent = projects.find(proj => proj.id === current.parentId);
          if (!parent) break;
          current = parent;
        }
        return selectedLv1Ids.includes(current.id);
      })
      .map(p => getAggregatedProject(p, projects));
      
    const projectIds = partnerProjects.map(p => p.id);
    
    // 통합 통계 엔진 호출 (UNIFIED 타입으로 만족도와 역량 데이터 모두 수집)
    const stats = getAggregatedStats(projects, projectIds, partnerId, 'UNIFIED');
    
    return partnerProjects.map(p => {
      const pStats = stats[p.id];
      
      return {
        ...p,
        avgSatisfaction: pStats && pStats.satCount > 0 ? pStats.satAvg.toFixed(2) : '-',
        preCompetency: pStats && pStats.compCount > 0 ? pStats.preAvg.toFixed(2) : '-',
        postCompetency: pStats && pStats.compCount > 0 ? pStats.postAvg.toFixed(2) : '-',
        hakeGain: pStats && pStats.compCount > 0 ? Math.round(pStats.hakeGain * 100) : 0
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
        const repairedPartners = json.partners.map((p: Record<string, unknown>) => ({
          ...p,
          id: String(p.id || crypto.randomUUID()),
          documents: (Array.isArray(p.documents) ? p.documents : []).map((d: Record<string, unknown>) => ({
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
               .upsert(repairedPartners.map((p: Record<string, unknown>) => ({
                 id: p.id as string,
                 name: p.name as string,
                 manager: p.manager as string,
                 phone1: p.phone1 as string,
                 phone2: p.phone2 as string,
                 email: p.email as string,
                 address: p.address as string,
                 documents: p.documents
               })));

             if (pError) throw pError;

             // 2. 사업 데이터 업로드 (있는 경우)
             if (json.projects && Array.isArray(json.projects)) {
               const { error: projError } = await supabase
                 .from('projects')
                 .upsert(json.projects.map((p: Record<string, unknown>) => ({
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

              alert('데이터 복구가 완료되었습니다.');
              window.location.reload();
            };
            runImport();
          }
        } catch (err) {
          console.error(err);
          alert('데이터를 읽는 중 오류가 발생했습니다.');
        }
      };
      reader.readAsText(file);
    };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <PartnerDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        mode={dialogMode} 
        partnerId={selectedPartnerId} 
      />
      {/* 상단 헤더 (회의 관리 스타일 적용) */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-xl print:hidden">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Building2 className="size-5 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-slate-900 tracking-tight whitespace-nowrap">협력업체관리</h1>
          </div>

          <div className="flex items-center gap-2 max-w-4xl w-full">
            <Select 
              key={`partners-select-${selectedProjectId}-${projects.length}`}
              value={selectedProjectId || 'all'} 
              onValueChange={(val) => {
                const value = val as string;
                setSelectedProjectId(value);
                if (value === 'all') {
                  setSelectedLv1Ids([]);
                } else {
                  setSelectedLv1Ids([value]);
                }
              }}
            >
              <SelectTrigger className="h-9 rounded-lg font-bold text-[11px] bg-white border-slate-200 focus:ring-indigo-500/20">
                <div className="flex items-center gap-2 truncate flex-1">
                  <LayoutGrid className="size-3 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {selectedProjectId === 'all' 
                      ? '전체 사업 통합 협력사' 
                      : (projects.find(p => p.id === selectedProjectId)?.name || '사업 선택')
                    }
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold">전체 사업 통합 협력사</SelectItem>
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
           <div className="relative mr-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
              <Input 
                placeholder="업체명 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-8 pr-3 w-40 rounded-lg bg-white border-slate-200 font-bold text-[11px] focus-visible:ring-1 focus-visible:ring-slate-200" 
              />
           </div>
           
           <Button 
              onClick={handleAdd}
              className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold px-4 gap-1.5 text-[11px] text-white shadow-md shadow-blue-100"
           >
              <Plus className="size-3.5" /> 업체 추가
           </Button>

           <div className="flex items-center gap-1.5 ml-2 border-l border-slate-100 pl-3">
              <Button 
                 variant="outline" 
                 size="icon"
                 onClick={handleExportData}
                 className="h-9 w-9 rounded-lg border-slate-200 text-amber-600 hover:bg-amber-50"
                 title="데이터 백업 (JSON)"
              >
                 <Download className="size-4" />
              </Button>
              <div className="relative">
                 <input type="file" id="import-data" className="hidden" accept=".json" onChange={handleImportData} />
                 <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => document.getElementById('import-data')?.click()}
                    className="h-9 w-9 rounded-lg border-slate-200 text-emerald-600 hover:bg-emerald-50"
                    title="데이터 복구 (JSON)"
                 >
                    <Upload className="size-4" />
                 </Button>
              </div>
           </div>
        </div>
      </div>

      {/* 업체 목록 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {isLoading ? (
           <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-32 w-full bg-slate-100 animate-pulse rounded-2xl" />
              ))}
           </div>
         ) : filteredPartners.length === 0 ? (
           <div className="py-24 bg-white/50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-4 md:col-span-2">
              <Building2 className="size-12 opacity-10" />
              <p className="font-bold text-[11px] uppercase tracking-wider text-center">
                등록된 협력업체가 없습니다.
              </p>
           </div>
         ) : (
           filteredPartners.map(p => {
             const history = getPartnerProjects(p.id);
             const isExpanded = viewDetailId === p.id;

             return (
               <Card key={p.id} className={cn(
                 "rounded-2xl border-none shadow-sm bg-white overflow-hidden transition-all duration-300",
                 isExpanded ? "ring-1 ring-blue-500/20 shadow-md md:col-span-2" : "hover:shadow-md"
               )}>
                  <div className="p-5 space-y-5">
                     <div className="flex flex-col gap-4">
                        <div className="space-y-4">
                           <div className="flex justify-between items-start">
                              <h3 className="text-[13px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Building2 className="size-4 text-blue-500" /> {p.name}
                              </h3>
                              <div className="flex gap-1.5">
                                 <Button 
                                   variant="ghost" size="icon" onClick={() => handleEdit(p)}
                                   className="size-7 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900"
                                 >
                                   <Pencil className="size-3.5" />
                                 </Button>
                                 <Button 
                                   variant="ghost" size="icon"
                                   onClick={(e) => { 
                                     e.stopPropagation();
                                     if(confirm('정말 삭제하시겠습니까?')) {
                                       deletePartner(p.id);
                                       if (viewDetailId === p.id) setViewDetailId(null);
                                     } 
                                   }}
                                   className="size-7 rounded-lg bg-red-50 border border-red-100 text-red-300 hover:text-red-500"
                                 >
                                   <Trash2 className="size-3.5" />
                                 </Button>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                              <div>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Manager</p>
                                 <p className="text-[11px] font-bold text-slate-800">{p.manager}</p>
                              </div>
                              <div>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
                                 <p className="text-[11px] font-bold text-slate-800">{p.phone1}</p>
                              </div>
                              <div>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                 <p className="text-[11px] font-bold text-slate-800 truncate">{p.email}</p>
                              </div>
                              <div>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
                                 <p className="text-[11px] font-bold text-slate-800 truncate">{p.address}</p>
                              </div>
                           </div>

                           <div className="flex flex-wrap gap-1.5">
                              {p.documents.map(doc => (
                                 <div 
                                   key={doc.id} 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (doc.fileUrl && doc.originalName) {
                                       downloadFile(doc.fileUrl, doc.originalName).catch(() => alert('파일 다운로드 실패'));
                                     }
                                   }}
                                   className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 group cursor-pointer hover:bg-blue-50 transition-all"
                                 >
                                    <FileCheck2 className="size-3 text-blue-500" />
                                    <span className="text-[9px] font-bold text-slate-500 group-hover:text-blue-700 uppercase">{doc.type}</span>
                                    <Download className="size-2.5 text-slate-300 ml-0.5" />
                                 </div>
                              ))}
                              {p.documents.length === 0 && (
                                 <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100 text-amber-500">
                                    <AlertCircle className="size-3" />
                                    <span className="text-[9px] font-bold uppercase">서류 미등록</span>
                                 </div>
                              )}
                           </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                           <div className="flex-1 flex flex-col">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Performance</p>
                              <p className="text-[14px] font-bold text-slate-900 tracking-tighter">{history.length}<span className="text-[9px] ml-1 text-slate-400 font-medium italic">Projects</span></p>
                           </div>
                           <Button 
                             onClick={() => setViewDetailId(isExpanded ? null : p.id)}
                             variant="secondary"
                             className={cn(
                               "h-8 px-4 rounded-lg font-bold text-[10px] gap-1.5 transition-all",
                               isExpanded ? "bg-slate-900 text-white" : "bg-white text-blue-600 border border-blue-50"
                             )}
                           >
                              {isExpanded ? '닫기' : '이력 보기'} <ChevronRight className={cn("size-3 transition-transform", isExpanded && "rotate-90")} />
                           </Button>
                        </div>
                     </div>

                     {isExpanded && (
                       <div className="pt-6 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                          <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
                            <Briefcase className="size-3.5 text-blue-500" /> 수행 히스토리
                          </h4>

                          <div className="overflow-x-auto rounded-xl border border-slate-100">
                             <table className="w-full text-left border-collapse">
                                <thead>
                                   <tr className="bg-slate-50/50">
                                      <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">수행 사업명</th>
                                      <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">기간</th>
                                      <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">참여</th>
                                      <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">만족도</th>
                                      <th className="px-4 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">성과</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                   {history.sort((a,b) => b.startDate.localeCompare(a.startDate, undefined, { numeric: true, sensitivity: 'base' })).map((item, idx) => (
                                     <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                                        <td className="px-4 py-3">
                                           <div className="flex flex-col">
                                              <span className="text-[11px] font-bold text-slate-800">{item.name}</span>
                                              <span className="text-[8px] font-bold text-blue-500 uppercase">Level {item.level}</span>
                                           </div>
                                        </td>
                                        <td className="px-4 py-3">
                                           <span className="text-[10px] font-medium text-slate-600">{item.startDate}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                           <span className="text-[10px] font-bold text-slate-700">{item.participantCount}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                           <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold text-[10px] py-0.5 px-2">
                                              {item.avgSatisfaction}
                                           </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                           {item.hakeGain !== 0 ? (
                                              <span className="text-[10px] font-bold text-indigo-600">+{item.hakeGain}%</span>
                                           ) : (
                                              <span className="text-[10px] text-slate-300">-</span>
                                           )}
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
    </div>
  );
}
