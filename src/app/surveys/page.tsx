'use client';

import * as React from 'react';
import { 
  FileText, Clipboard, Download, Plus, Search, 
  BarChart3, Settings2, LayoutDashboard, Share2, AlertTriangle,
  LayoutGrid, FileDown, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger 
} from "@/components/ui/select";
import { useSurveyStore, SurveyTemplate, SurveyResponse } from '@/store/use-survey-store';
import { useProjectStore } from '@/store/use-project-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { useAuthStore } from '@/store/use-auth-store';
import { SurveyStatsCards } from '@/components/surveys/survey-stats-cards';
import { SurveyCharts } from '@/components/surveys/survey-charts';
import { SurveyListTable } from '@/components/surveys/survey-list-table';
import { ProjectTree } from '@/components/surveys/project-tree';
import { PasteDialog, EditDialog } from '@/components/surveys/survey-dialogs';
import { SurveyTemplateSettings } from '@/components/surveys/template-settings';
import { TemplateEditDialog } from '@/components/surveys/template-edit-dialog';
import { useSurveyStats, calculateSurveyStats } from '@/hooks/use-survey-stats';
import { generateSurveyReport, downloadAsHWP } from '@/utils/survey-report-utils';
import { ExpertReportTemplate } from '@/components/surveys/expert-report-template';
import { ExpertReportGenerator } from '@/lib/stat-utils';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

export default function SurveyPage() {
  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'data' | 'settings'>('dashboard');
  const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);
  const [pasteContent, setPasteContent] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingResponse, setEditingResponse] = React.useState<any>(null);
  const [isTemplateEditDialogOpen, setIsTemplateEditDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<SurveyTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {}
  });

  const { 
    responses, templates, fetchSurveys, 
    updateResponse, deleteResponse, addResponse, 
    updateTemplate, deleteTemplate 
  } = useSurveyStore();
  const { 
    projects, visibleProjectIds, expandedIds, selectedProjectIds, 
    fetchProjects, toggleExpand, setSelectedProjectIds,
    selectedLv1Ids, setSelectedLv1Ids
  } = useProjectStore();
  const { partners, fetchPartners } = usePartnerStore();
  const { user, permissions, hasModuleAccess, canPerform } = useAuthStore();

  // 모든 Hook은 조기 리턴 전에 선언 (React Hook 규칙)
  const stats = useSurveyStats(responses, templates, selectedProjectIds);
  const currentProject = React.useMemo(() => {
    const id = selectedProjectIds[0];
    if (!id) return null;
    const proj = projects.find(p => p.id === id);
    if (proj) return proj;
    for (const p of projects) {
      const session = p.sessions?.find(s => s.id === id);
      if (session) {
        const idx = p.sessions!.findIndex(s => s.id === id);
        return { id: session.id, name: session.content || `${p.name} - ${idx + 1}차시`, level: p.level + 1 } as any;
      }
    }
    return null;
  }, [selectedProjectIds, projects]);

  const topLevelSelectedIds = React.useMemo(() => {
    return selectedProjectIds.filter(id => {
      const p = projects.find(proj => proj.id === id);
      if (p) {
        return !p.parentId || !selectedProjectIds.includes(p.parentId);
      } else {
        const parentProj = projects.find(proj => proj.sessions?.some(s => s.id === id));
        return !parentProj || !selectedProjectIds.includes(parentProj.id);
      }
    });
  }, [selectedProjectIds, projects]);

  const reportTitle = React.useMemo(() => {
    if (selectedProjectIds.length === 0) return '전체 사업 분석 보고서';
    const rootLv1Names = new Set<string>();
    
    for (const id of selectedProjectIds) {
      let curr = projects.find(proj => proj.id === id);
      if (!curr) {
        const parentProj = projects.find(proj => proj.sessions?.some(s => s.id === id));
        if (parentProj) curr = parentProj;
      }
      if (curr) {
        while (curr && curr.parentId) {
          const parent = projects.find(x => x.id === curr?.parentId);
          if (!parent) break;
          curr = parent;
        }
        if (curr) rootLv1Names.add(curr.name);
      }
    }
    
    const rootNames = Array.from(rootLv1Names);
    if (rootNames.length === 1) {
      return `${rootNames[0]} 분석 보고서`;
    } else if (rootNames.length > 1) {
      return '통합 분석 보고서';
    }
    return '전체 사업 분석 보고서';
  }, [selectedProjectIds, projects]);

  const [isDownloadingPDF, setIsDownloadingPDF] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    fetchSurveys();
    fetchProjects().then(() => {
      // 마운트 시 현재 선택된 LV1 필터에 맞춰 가시성 초기화
      const currentId = useProjectStore.getState().selectedLv1Ids[0];
      if (currentId) {
        const allProjs = useProjectStore.getState().projects;
        const children = allProjs.filter(p => {
          let curr: any = p;
          const visited = new Set<string>();
          while (curr && curr.level > 1 && curr.parentId && !visited.has(curr.id)) {
            visited.add(curr.id);
            curr = allProjs.find(proj => proj.id === curr.parentId);
          }
          return curr?.id === currentId;
        });
        useProjectStore.getState().setVisibleProjectIds([currentId, ...children.map(p => p.id)]);
      } else {
        useProjectStore.getState().setVisibleProjectIds(useProjectStore.getState().projects.map(p => p.id));
      }
    });
    fetchPartners();
  }, []);

  const lv1Projects = projects.filter(p => p.level === 1);
  const currentLv1Id = selectedLv1Ids[0] || 'all';

  const radarData = React.useMemo(() => {
    if (!stats?.themeStats) return [];
    return Object.entries(stats.themeStats)
      .filter(([_, d]) => d.satAvg > 0)
      .map(([theme, d]) => ({
        subject: theme,
        A: d.satAvg,
        fullMark: 5
      }));
  }, [stats]);

  const improvementData = React.useMemo(() => {
    if (!stats?.themeStats) return [];
    const data = Object.entries(stats.themeStats)
      .filter(([_, d]) => d.preAvg > 0 || d.postAvg > 0)
      .map(([theme, d]) => {
        const diff = d.postAvg - d.preAvg;
        const pct = d.preAvg > 0 ? (diff / d.preAvg * 100) : 0;
        const sign = diff > 0 ? '+' : '';
        return {
          name: theme,
          사전: Number(d.preAvg.toFixed(2)),
          사후: Number(d.postAvg.toFixed(2)),
          label: `${sign}${pct.toFixed(1)}%`
        };
      });
      
    if (data.length > 0 && stats.preAvg > 0) {
      const diff = stats.postAvg - stats.preAvg;
      const pct = stats.preAvg > 0 ? (diff / stats.preAvg * 100) : 0;
      const sign = diff > 0 ? '+' : '';
      data.push({
        name: '종합(평균)',
        사전: Number(stats.preAvg.toFixed(2)),
        사후: Number(stats.postAvg.toFixed(2)),
        label: `${sign}${pct.toFixed(1)}%`
      });
    }
    return data;
  }, [stats]);

  // 모든 Hook 선언 후 조기 리턴
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const handleLv1Change = (id: string | null) => {
    if (!id) return;
    if (id === 'all') {
      setSelectedLv1Ids([]);
      // 전체 보기 시 모든 프로젝트 가시성 확보
      useProjectStore.getState().setVisibleProjectIds(projects.map(p => p.id));
    } else {
      setSelectedLv1Ids([id]);
      // 선택된 LV1의 하위 프로젝트들만 가시성 확보
      const children = projects.filter(p => {
        let curr: any = p;
        const visited = new Set<string>();
        while (curr && curr.level > 1 && curr.parentId && !visited.has(curr.id)) {
          visited.add(curr.id);
          curr = projects.find(proj => proj.id === curr.parentId);
        }
        return curr?.id === id;
      });
      useProjectStore.getState().setVisibleProjectIds([id, ...children.map(p => p.id)]);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      await generateSurveyReport('expert-report-content', reportTitle);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadHWP = () => {
    downloadAsHWP('expert-report-content', reportTitle);
  };

  const handleProcessPaste = async (shouldClear: boolean) => {
    const targetId = selectedProjectIds[0];
    if (!pasteContent.trim() || !targetId) return;
    setIsProcessing(true);
    try {
      if (shouldClear) await useSurveyStore.getState().clearProjectResponses(targetId);
      const rows = pasteContent.trim().split('\n');
      const satTemplate = templates.find(t => t.type === 'SATISFACTION');
      const compTemplate = templates.find(t => t.type === 'COMPETENCY');
      
      const newBatch: any[] = [];
      rows.forEach(row => {
        // 탭, 쉼표, 또는 2개 이상의 공백으로 분리
        const parts = row.split(/[\t,]| {2,}/).map(v => v?.trim());
        const rid = parts[0];
        const s = parts[1];
        const pre = parts[2];
        const post = parts[3];

        if (!rid || rid.startsWith('---') || rid.includes('|')) return; // 헤더나 구분선 제외

        if (satTemplate && s && !isNaN(Number(s))) {
          newBatch.push({
            respondentId: rid, projectId: targetId, templateId: satTemplate.id,
            answers: satTemplate.questions.map(q => ({ questionId: q.id, score: Number(s) || 0, text: '' }))
          });
        }
        if (compTemplate && (pre || post)) {
          newBatch.push({
            respondentId: rid, projectId: targetId, templateId: compTemplate.id,
            answers: compTemplate.questions.map(q => ({
              questionId: q.id, 
              preScore: !isNaN(Number(pre)) ? Number(pre) : 0,
              score: !isNaN(Number(post)) ? Number(post) : 0,
              text: ''
            }))
          });
        }
      });
      if (newBatch.length > 0) {
        await useSurveyStore.getState().bulkAddResponses(newBatch);
      } else {
        console.warn('No valid data rows found in paste content');
      }
      setIsPasteDialogOpen(false);
      setPasteContent('');
      await fetchSurveys();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-4rem)]">
      {/* Sidebar - Project Selection */}
      <Card className="w-80 flex flex-col border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black flex items-center gap-2">
              <Settings2 className="size-4 text-indigo-600" />
              사업 필터링
            </h2>
          </div>
          <ProjectTree 
            projects={projects} partners={partners} 
            visibleProjectIds={visibleProjectIds} expandedIds={expandedIds} 
            selectedProjectIds={selectedProjectIds} 
            onToggleExpand={toggleExpand} 
            onSelect={(ids) => {
              const id = ids[0];
              if (!id) return;
              
              // 선택된 프로젝트의 모든 하위 프로젝트 및 차시 ID 수집 (재귀적)
              const getAllDescendantIds = (parentId: string): string[] => {
                const parent = projects.find(p => p.id === parentId);
                let result: string[] = [];
                if (parent && parent.sessions) {
                  result = [...parent.sessions.map(s => s.id)];
                }

                const children = projects.filter(p => p.parentId === parentId);
                result = [...result, ...children.map(c => c.id)];
                children.forEach(c => {
                  result = [...result, ...getAllDescendantIds(c.id)];
                });
                return result;
              };

              const descendantIds = getAllDescendantIds(id);
              const allRelatedIds = [id, ...descendantIds];

              if (selectedProjectIds.includes(id)) {
                // 선택 해제: 본인 및 모든 하위 항목 제거
                setSelectedProjectIds(selectedProjectIds.filter(x => !allRelatedIds.includes(x)));
              } else {
                // 다중 선택: 기존 선택 항목 유지 + 새로 클릭한 항목 및 하위 항목 추가
                setSelectedProjectIds(Array.from(new Set([...selectedProjectIds, ...allRelatedIds])));
              }
            }} 
          />
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-full">
          <div className="flex items-center gap-1.5">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="분석 대시보드" />
            {(canPerform('update') || user?.role === 'admin') && (
              <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')} icon={BarChart3} label="Raw 데이터 관리" />
            )}
            {user?.role === 'admin' && (
              <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings2} label="설문 템플릿 설정" />
            )}
          </div>
          
          <div className="flex items-center gap-2 pr-2 border-l border-slate-200 dark:border-slate-800 ml-2 pl-4">
            <div className="size-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutGrid className="size-3.5 text-white" />
            </div>
            <Select value={currentLv1Id} onValueChange={handleLv1Change}>
              <SelectTrigger className="h-8 w-64 rounded-xl font-bold text-[10px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <span className="truncate">
                  {currentLv1Id === 'all' ? '전체 사업 통합 보기' : projects.find(p => p.id === currentLv1Id)?.name}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-2xl border-slate-100 dark:border-slate-800">
                <SelectItem value="all" className="text-[10px] font-bold">전체 사업 통합 보기</SelectItem>
                {lv1Projects.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-8">
          {activeTab === 'dashboard' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight mb-1">성과 분석 리포트</h1>
                  <p className="text-sm text-slate-500 font-medium">실시간 데이터 기반 교육 성과 정밀 진단</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800 font-bold" onClick={() => setIsPasteDialogOpen(true)}>
                    <Clipboard className="size-4 mr-2" />
                    데이터 붙여넣기
                  </Button>
                  <Button disabled={isDownloadingPDF} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl font-bold" onClick={handleDownloadPDF}>
                    {isDownloadingPDF ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
                    보고서 PDF 다운로드
                  </Button>
                  <Button variant="outline" className="rounded-xl border-slate-900 dark:border-slate-100 dark:text-slate-100 font-bold" onClick={handleDownloadHWP}>
                    <FileDown className="size-4 mr-2 text-blue-600" />
                    보고서 HWP 다운로드
                  </Button>
                </div>
              </div>

              <SurveyStatsCards stats={stats} />
              <SurveyCharts radarData={radarData} improvementData={improvementData} />

              <Card className="p-8 border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 shadow-2xl rounded-[2.5rem]">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <FileText className="size-6 text-indigo-600" />
                    보고서 프리뷰
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-900 dark:border-slate-100 font-bold" onClick={handleDownloadHWP}>
                      <FileDown className="size-4 mr-2 text-blue-600" />
                      HWP 다운로드
                    </Button>
                    <Button disabled={isDownloadingPDF} size="sm" className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl font-bold" onClick={handleDownloadPDF}>
                      {isDownloadingPDF ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
                      PDF 다운로드
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => {
                      if (!stats) return;
                      const text = ExpertReportGenerator.generateConsultingReport(projects, [], stats);
                      navigator.clipboard.writeText(text);
                      alert('복사되었습니다.');
                    }}>
                      <Share2 className="size-4 mr-2" />
                      텍스트 복사
                    </Button>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-12 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 overflow-x-auto">
                  <div id="expert-report-content" className="bg-white min-w-[210mm]">
                    
                    {/* 통합 보고서 */}
                    <div className="report-page-wrapper">
                      <ExpertReportTemplate 
                        projects={projects.filter(p => selectedProjectIds.includes(p.id))}
                        projectName={reportTitle} 
                        organizationName="SLI교육그룹"
                        stats={stats || {
                          satAvg: 0,
                          preAvg: 0,
                          postAvg: 0,
                          hakeGain: 0,
                          cohensD: 0,
                          pValue: 1,
                          sampleSize: 0
                        }}
                        responses={responses.filter(r => selectedProjectIds.includes(r.projectId))}
                        templates={templates}
                        radarData={radarData}
                        improvementData={improvementData}
                        chartImages={{ radar: '', improvement: '' }}
                        isConsolidated={true}
                      />
                    </div>

                    {/* 개별 보고서들 (다중 선택 시) */}
                    {topLevelSelectedIds.length > 1 && topLevelSelectedIds.map(id => {
                      const getAllDescendantIds = (parentId: string): string[] => {
                        const parent = projects.find(p => p.id === parentId);
                        let result: string[] = [];
                        if (parent && parent.sessions) {
                          result = [...parent.sessions.map(s => s.id)];
                        }
                        const children = projects.filter(p => p.parentId === parentId);
                        result = [...result, ...children.map(c => c.id)];
                        children.forEach(c => {
                          result = [...result, ...getAllDescendantIds(c.id)];
                        });
                        return result;
                      };
                      
                      const descendantIds = getAllDescendantIds(id);
                      const individualIds = [id, ...descendantIds];
                      const indStats = calculateSurveyStats(responses, templates, individualIds);
                      if (!indStats) return null;

                      const p = projects.find(proj => proj.id === id);
                      let name = p?.name || '';
                      if (!p) {
                         const parentProj = projects.find(proj => proj.sessions?.some(s => s.id === id));
                         const session = parentProj?.sessions?.find(s => s.id === id);
                         const idx = parentProj?.sessions?.findIndex(s => s.id === id);
                         name = session?.content || `${parentProj?.name} - ${idx! + 1}차시`;
                      }

                      const targetProject = p || projects.find(proj => proj.sessions?.some(s => s.id === id));
                      const partner = partners.find(pt => pt.id === targetProject?.partnerId);
                      const partnerName = partner?.name || '';
                      
                      let locationName = targetProject?.location || '';
                      if (!locationName) {
                         const parentProj = projects.find(proj => proj.sessions?.some(s => s.id === id));
                         if (parentProj?.location) locationName = parentProj.location;
                      }

                      let dateRange = '';
                      if (targetProject?.startDate) {
                        const sD = new Date(targetProject.startDate);
                        const sStr = `${sD.getFullYear()}.${String(sD.getMonth()+1).padStart(2,'0')}.${String(sD.getDate()).padStart(2,'0')}`;
                        let eStr = '';
                        if (targetProject.endDate) {
                          const eD = new Date(targetProject.endDate);
                          eStr = `${eD.getFullYear()}.${String(eD.getMonth()+1).padStart(2,'0')}.${String(eD.getDate()).padStart(2,'0')}`;
                        }
                        
                        const timeStr = targetProject.startTime ? ` (${targetProject.startTime}${targetProject.endTime ? `~${targetProject.endTime}` : ''})` : '';

                        if (eStr && sStr !== eStr) {
                          dateRange = `${sStr} ~ ${eStr}${timeStr}`;
                        } else {
                          dateRange = `${sStr}${timeStr}`;
                        }
                      }

                      return (
                        <div key={id} className="report-page-wrapper mt-16 border-t-[12px] border-slate-200 pt-16">
                          <div className="px-16 pb-8 text-center print:hidden">
                             <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-100 text-slate-500 font-bold text-sm tracking-widest border border-slate-200">
                               개별 분석 보고서 : {name}
                             </div>
                          </div>
                          <ExpertReportTemplate 
                            projects={projects.filter(proj => individualIds.includes(proj.id))}
                            projectName={`${name} 분석 보고서`} 
                            organizationName="SLI교육그룹"
                            stats={indStats}
                            responses={responses.filter(r => individualIds.includes(r.projectId))}
                            templates={templates}
                            radarData={radarData}
                            improvementData={improvementData}
                            chartImages={{ radar: '', improvement: '' }}
                            isConsolidated={false}
                            partnerName={partnerName}
                            locationName={locationName}
                            dateRange={dateRange}
                          />
                        </div>
                      );
                    })}

                  </div>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'data' && (
            <SurveyListTable 
              responses={responses} templates={templates} 
              selectedProjectIds={selectedProjectIds} 
              onEdit={(r) => { setEditingResponse(r); setIsEditDialogOpen(true); }}
              onDelete={(rid, pid) => setDeleteConfirm({
                open: true, title: "데이터 삭제", description: "삭제하시겠습니까?", 
                onConfirm: async () => { await deleteResponse(rid); setDeleteConfirm(p => ({...p, open: false})); }
              })}
            />
          )}

          {activeTab === 'settings' && (
            <SurveyTemplateSettings 
              templates={templates} 
              onAdd={(type) => {
                const defaultQuestions = useSurveyStore.getState().createDefaultQuestions(type);
                useSurveyStore.getState().addTemplate({
                  name: type === 'SATISFACTION' ? "신규 만족도 템플릿" : "신규 역량진단 템플릿",
                  type, 
                  questions: defaultQuestions
                });
              }}
              onEdit={(tmpl) => {
                setEditingTemplate(tmpl);
                setIsTemplateEditDialogOpen(true);
              }}
              onDelete={async (id) => {
                if(confirm('템플릿을 삭제하시겠습니까?')) await deleteTemplate(id);
              }}
            />
          )}
        </div>
      </div>

      <PasteDialog 
        open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen} 
        content={pasteContent} onContentChange={setPasteContent} 
        isProcessing={isProcessing} onProcess={handleProcessPaste} 
      />
      <EditDialog 
        open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} 
        response={editingResponse} questions={templates.flatMap(t => t.questions)} 
        onSave={async (id, data) => { await updateResponse(id, data); setIsEditDialogOpen(false); }}
        onUpdateAnswer={(qId, score) => setEditingResponse((prev: any) => ({
          ...prev, answers: prev.answers.map((a: any) => a.questionId === qId ? {...a, score} : a)
        }))}
      />
      <TemplateEditDialog 
        open={isTemplateEditDialogOpen} 
        onOpenChange={setIsTemplateEditDialogOpen}
        template={editingTemplate}
        onSave={async (id, data) => {
          await updateTemplate(id, data);
        }}
      />
      <DeleteConfirmDialog confirm={deleteConfirm} setConfirm={setDeleteConfirm} />
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300",
        active 
          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50" 
          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
      )}
    >
      <Icon className={cn("size-3.5", active ? "text-indigo-600" : "text-slate-400")} />
      {label}
    </button>
  );
}

interface DeleteConfirmState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
}

function DeleteConfirmDialog({
  confirm,
  setConfirm
}: {
  confirm: DeleteConfirmState;
  setConfirm: React.Dispatch<React.SetStateAction<DeleteConfirmState>>;
}) {
  return (
    <Dialog open={confirm.open} onOpenChange={(o) => setConfirm((p) => ({ ...p, open: o }))}>
      <DialogContent className="rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <div className="size-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="size-6 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-black">{confirm.title}</DialogTitle>
          <DialogDescription className="text-slate-500">{confirm.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setConfirm((p) => ({ ...p, open: false }))} className="rounded-xl">취소</Button>
          <Button onClick={confirm.onConfirm} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">삭제 실행</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
