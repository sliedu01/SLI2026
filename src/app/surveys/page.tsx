'use client';

import * as React from 'react';
import { 
  FileText, Clipboard, Download, Plus, Search, 
  BarChart3, Settings2, LayoutDashboard, Share2, AlertTriangle,
  LayoutGrid, FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger 
} from "@/components/ui/select";
import { useSurveyStore } from '@/store/use-survey-store';
import { useProjectStore } from '@/store/use-project-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { SurveyStatsCards } from '@/components/surveys/survey-stats-cards';
import { SurveyCharts } from '@/components/surveys/survey-charts';
import { SurveyListTable } from '@/components/surveys/survey-list-table';
import { ProjectTree } from '@/components/surveys/project-tree';
import { PasteDialog, EditDialog } from '@/components/surveys/survey-dialogs';
import { SurveyTemplateSettings } from '@/components/surveys/template-settings';
import { useSurveyStats } from '@/hooks/use-survey-stats';
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

  const { responses, templates, fetchSurveys, updateResponse, deleteResponse, addResponse, deleteTemplate } = useSurveyStore();
  const { 
    projects, visibleProjectIds, expandedIds, selectedProjectIds, 
    fetchProjects, toggleExpand, setSelectedProjectIds,
    selectedLv1Ids, setSelectedLv1Ids
  } = useProjectStore();
  const { partners, fetchPartners } = usePartnerStore();

  const stats = useSurveyStats(responses, templates, selectedProjectIds);
  const currentProject = projects.find(p => p.id === selectedProjectIds[0]);

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
          while (curr && curr.level > 1 && curr.parentId) {
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
        while (curr && curr.level > 1 && curr.parentId) {
          curr = projects.find(proj => proj.id === curr.parentId);
        }
        return curr?.id === id;
      });
      useProjectStore.getState().setVisibleProjectIds([id, ...children.map(p => p.id)]);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentProject) return;
    await generateSurveyReport('expert-report-content', currentProject.name);
  };

  const handleDownloadHWP = () => {
    if (!currentProject) return;
    downloadAsHWP('expert-report-content', currentProject.name);
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
    return Object.entries(stats.themeStats)
      .filter(([_, d]) => d.preAvg > 0 || d.postAvg > 0)
      .map(([theme, d]) => ({
        name: theme,
        사전: d.preAvg,
        사후: d.postAvg
      }));
  }, [stats]);

  if (!mounted) return null;

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
            onToggleExpand={toggleExpand} onSelect={setSelectedProjectIds} 
          />
        </div>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-full">
          <div className="flex items-center gap-1.5">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="분석 대시보드" />
            <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')} icon={BarChart3} label="Raw 데이터 관리" />
            <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings2} label="설문 템플릿 설정" />
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
                  <Button className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl font-bold" onClick={handleDownloadPDF}>
                    <Download className="size-4 mr-2" />
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
                <div className="bg-slate-50 dark:bg-slate-950 p-12 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50">
                  <div id="expert-report-preview" className="bg-white">
                    <ExpertReportTemplate 
                      projects={projects.filter(p => selectedProjectIds.includes(p.id))}
                      projectName={projects.find(p => p.id === selectedProjectIds[0])?.name || '전체 사업'} 
                      organizationName="SLI 2026 교육운영팀"
                      stats={stats || {
                        satAvg: 0,
                        preAvg: 0,
                        postAvg: 0,
                        hakeGain: 0,
                        cohensD: 0,
                        pValue: 1,
                        sampleSize: 0
                      }}
                      responses={responses}
                      templates={templates}
                      chartImages={{ radar: '', improvement: '' }}
                    />
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
                // 템플릿 편집 로직 (향후 구현 가능)
                alert('템플릿 편집 기능은 준비 중입니다.');
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
