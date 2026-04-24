'use client';

import * as React from 'react';
import { 
  Plus,
  ClipboardCheck,
  Trash2,
  TrendingUp,
  Zap,
  MessageSquare,
  Activity,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  BarChart2,
  PieChart as PieChartIcon,
  ChevronRight,
  ChevronDown,
  Layers,
  FileBarChart,
  CheckCircle,
  Target as TargetIcon,
  Sigma,
  FileText,
  BarChart3,
  Settings2,
  LayoutGrid
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import { useProjectStore } from '@/store/use-project-store';
import { useSurveyStore, SurveyTemplate, Question, SurveyResponse } from '@/store/use-survey-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { cn } from "@/lib/utils";
import { ExpertReportGenerator } from "@/lib/stat-utils";

interface RadarTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  textAnchor?: "start" | "middle" | "end" | "inherit";
}

// 레이더 차트의 레이벨이 길 경우 줄바꿈 처리를 위한 커스텀 틱 컴포넌트
const CustomRadarTick = (props: RadarTickProps) => {
  const { payload, x, y, textAnchor } = props;
  if (!payload) return null;
  const words = payload.value.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach((word: string) => {
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + word.length + 1 <= 9) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <g transform={`translate(${x},${y})`}>
      <text 
        dy={-(lines.length - 1) * 6} 
        textAnchor={textAnchor} 
        fill="#64748b" 
        fontSize={11} 
        fontWeight={800}
      >
        {lines.map((line, i) => (
          <tspan x={0} dy={i === 0 ? 0 : 13} key={i}>{line}</tspan>
        ))}
      </text>
    </g>
  );
};

// Charts
import { 
  ResponsiveContainer,
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  LabelList
} from 'recharts';

export default function SurveysPage() {
  const [mounted, setMounted] = React.useState(false);
  const { projects, fetchProjects, getSortedProjects, selectedLv1Ids } = useProjectStore();
  const { 
    templates, 
    responses, 
    fetchSurveys,
    addTemplate, 
    updateTemplate,
    deleteTemplate,
    getAggregatedStats,
    createDefaultQuestions,
    updateResponse,
    deleteResponse,
    clearProjectResponses
  } = useSurveyStore();
  const { partners, fetchPartners } = usePartnerStore();
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

  const [activeTab, setActiveTab] = React.useState('data');
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
  const [dataDateRange, setDataDateRange] = React.useState({ start: '', end: new Date().toISOString().split('T')[0] });
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [expandedTableIds, setExpandedTableIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = React.useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleTableExpand = (id: string) => {
    setExpandedTableIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = React.useState<SurveyTemplate | null>(null);
  const [editingResponse, setEditingResponse] = React.useState<SurveyResponse | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [pasteContent, setPasteContent] = React.useState('');
  const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean, title: string, description: string, onConfirm: () => void }>({ 
    open: false, title: "", description: "", onConfirm: () => {} 
  });
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const selectionPath = React.useMemo(() => {
    if (selectedProjectIds.length === 0) return '프로젝트를 선택해주세요..';
    if (selectedProjectIds.length === 1) {
      const path: string[] = [];
      let curr = projects.find(p => p.id === selectedProjectIds[0]);
      while (curr) {
        let nameWithPartner = curr.name;
        if (curr.partnerId && curr.partnerId !== 'none') {
           const partner = partners.find(ptr => ptr.id === curr!.partnerId);
           if (partner) nameWithPartner = `[${partner.name}] ${curr.name}`;
        }
        path.unshift(nameWithPartner);
        curr = projects.find(p => p.id === curr?.parentId);
      }
      return path.join(' > ');
    }
    return `${selectedProjectIds.length}개의 프로젝트가 선택되었습니다.`;
  }, [selectedProjectIds, projects, partners]);

  const { templates: projectTemplates } = React.useMemo(() => {
    const targetId = selectedProjectIds[0] || '';
    const data = useSurveyStore.getState().getUnifiedProjectData(targetId);
    if (data.templates.all.length === 0 && templates.length > 0) {
      return {
        ...data,
        templates: {
          all: templates,
          sat: templates.filter(t => t.type === 'SATISFACTION').sort((a,b) => b.createdAt - a.createdAt),
          comp: templates.filter(t => t.type === 'COMPETENCY').sort((a,b) => b.createdAt - a.createdAt)
        }
      };
    }
    return data;
  }, [selectedProjectIds, templates]);
  
  const satTmpl = projectTemplates.sat[0];
  const compTmpl = projectTemplates.comp[0];
  const satQuestions = satTmpl?.questions.filter(q => q.type === 'SCALE') || [];
  const satTextQuestions = satTmpl?.questions.filter(q => q.type === 'TEXT') || [];
  const compQuestions = compTmpl?.questions.filter(q => q.type === 'SCALE') || [];

  const visibleProjectIds = React.useMemo(() => {
    const start = dataDateRange.start;
    const end = dataDateRange.end;
    const set = new Set<string>();
    projects.forEach(p => {
      // 날짜 필터링
      const matchesDate = !start || !end || (p.startDate >= start && p.startDate <= end) || (p.endDate >= start && p.endDate <= end);
      
      // 글로벌 LV1 필터링 적용
      let matchesGlobalFilter = true;
      if (selectedLv1Ids.length > 0) {
        let root: (typeof p) | undefined = p;
        while (root && root.parentId && root.level > 1) {
          const parentId: string = root.parentId;
          root = projects.find(parent => parent.id === parentId);
        }
        matchesGlobalFilter = !!(root && selectedLv1Ids.includes(root.id));
      }

      if (matchesDate && matchesGlobalFilter) {
        let curr: (typeof p) | undefined = p;
        while (curr) { 
          set.add(curr.id); 
          curr = projects.find(parent => parent.id === curr?.parentId); 
        }
      }
    });
    return set;
  }, [projects, dataDateRange, selectedLv1Ids]);

  const effectiveProjectIds = selectedProjectIds.length > 0 ? selectedProjectIds : Array.from(visibleProjectIds);
  const aggregatedStats = React.useMemo(() => 
    getAggregatedStats(projects, effectiveProjectIds.length > 0 ? effectiveProjectIds : undefined, undefined, 'UNIFIED'),
    [getAggregatedStats, projects, effectiveProjectIds]
  );
  const overallStats = aggregatedStats['_overall'];


  const renderNodes = React.useCallback((parentId: string | null, depth: number = 0): React.ReactNode => {
    const filteredRows = getSortedProjects(parentId)
      .filter(p => visibleProjectIds.has(p.id));
    if (filteredRows.length === 0) return null;

    const handleToggle = (projectId: string, isSelected: boolean) => {
      let updatedIds = [...selectedProjectIds];
      const getAllDescendantIds = (nodeId: string) => {
        let ids = [nodeId];
        projects.filter(c => c.parentId === nodeId).forEach(c => {
          ids = [...ids, ...getAllDescendantIds(c.id)];
        });
        return ids;
      };
      
      const targetIds = getAllDescendantIds(projectId);
      if (!isSelected) {
        updatedIds = Array.from(new Set([...updatedIds, ...targetIds]));
      } else {
        updatedIds = updatedIds.filter(id => !targetIds.includes(id));
      }
      setSelectedProjectIds(updatedIds);
    };

    return (
      <div className="flex flex-col gap-1">
        {filteredRows.map(p => {
          const isExpanded = expandedIds.has(p.id);
          const isSelected = selectedProjectIds.includes(p.id);
          const hasVisibleChildren = projects.some(child => child.parentId === p.id && visibleProjectIds.has(child.id));

          return (
            <div key={p.id} className="flex flex-col">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(p.id, isSelected);
                }}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                  isSelected ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-50 text-slate-600"
                )}
              >
                <div className="size-4 flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onChange={() => handleToggle(p.id, isSelected)}
                    className={cn("size-3.5 rounded border transition-colors", isSelected ? "border-white bg-white" : "border-slate-200 group-hover:border-blue-400 bg-white")}
                  />
                </div>
                {hasVisibleChildren ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(p.id, e); }} className={cn("p-0.5 rounded hover:bg-white/20", isSelected ? "text-white" : "text-slate-400")}>
                    {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  </button>
                ) : <div className="size-4 ml-1" />}
                {p.level >= 3 ? (
                  <div className="flex flex-col gap-0 overflow-hidden">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400/80 uppercase tracking-tighter">
                      <span>{p.startDate} ~ {p.endDate}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-blue-500/70">{partners.find(ptr => ptr.id === p.partnerId)?.name || "파트너 없음"}</span>
                    </div>
                    <span className="text-[11px] font-bold truncate leading-tight">
                      {p.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold truncate">{p.name}</span>
                )}
              </div>
              {isExpanded && hasVisibleChildren && renderNodes(p.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }, [projects, visibleProjectIds, expandedIds, selectedProjectIds, partners, toggleExpand, getSortedProjects]);

  React.useEffect(() => {
    setMounted(true);
    fetchSurveys();
    fetchProjects();
    fetchPartners();
  }, [fetchSurveys, fetchProjects, fetchPartners]);

  React.useEffect(() => {
    if (selectedTemplateId) {
      const t = templates.find((i: SurveyTemplate) => i.id === selectedTemplateId);
      if (t) setEditingTemplate({...t, questions: t.questions.map((q: Question) => ({...q}))});
    } else if (templates.length > 0) setSelectedTemplateId(templates[0].id);
  }, [selectedTemplateId, templates]);

  const handleUpdateQuestion = (qId: string, field: keyof Question, value: string | number) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      questions: editingTemplate.questions.map(q => 
        q.id === qId ? { ...q, [field]: value } : q
      )
    });
  };

  const handleAddQuestion = (type: 'SCALE' | 'TEXT' = 'SCALE') => {
    if (!editingTemplate) return;
    const newQ: Question = {
      id: crypto.randomUUID(),
      division: type === 'SCALE' ? '역량 구분' : '텍스트 구분',
      theme: type === 'SCALE' ? '역량 테마' : '텍스트 테마',
      content: type === 'SCALE' ? '역량 질문 내용' : '텍스트 질문 내용',
      type,
      order: editingTemplate.questions.length + 1
    };
    setEditingTemplate({
      ...editingTemplate,
      questions: [...editingTemplate.questions, newQ]
    });
  };

  const handleEditResponse = (response: SurveyResponse) => {
    setEditingResponse({ ...response, answers: response.answers.map(a => ({ ...a })) });
    setIsEditDialogOpen(true);
  };

  const handleDeleteRespondent = async (rid: string, pid: string) => {
    setDeleteConfirm({
      open: true,
      title: "응답 데이터 삭제",
      description: `${rid} 응답자의 모든 설문 데이터(만족도/역량)를 삭제하시겠습니까?`,
      onConfirm: async () => {
        const targetResps = responses.filter(r => r.projectId === pid && r.respondentId === rid);
        for (const r of targetResps) {
          await deleteResponse(r.id);
        }
        setDeleteConfirm(p => ({ ...p, open: false }));
        await fetchSurveys();
        alert('데이터가 삭제되었습니다.');
      }
    });
  };

  if (!mounted) return null;

  const handleCopyReport = () => {
    if (!overallStats) return;
    const reportText = ExpertReportGenerator.generateConsultingReport(
      projects.filter(p => selectedProjectIds.includes(p.id) || p.id === projects.find(p2 => p2.id === selectedProjectIds[0])?.parentId), 
      templates.filter(t => t.type === 'SATISFACTION' || t.type === 'COMPETENCY').flatMap(t => t.questions),
      overallStats
    );
    navigator.clipboard.writeText(reportText).then(() => {
      alert('리포트가 클립보드에 복사되었습니다.');
    });
  };

  const handlePasteProcess = async (shouldClear: boolean = false) => {
    const targetId = selectedProjectIds[0];
    if (!pasteContent.trim() || !targetId || isProcessing) { alert('프로젝트를 선택해주세요.'); return; }
    
    if (shouldClear && !confirm('이 프로젝트의 모든 기존 응답 데이터를 삭제하고 새로 등록하시겠습니까?')) return;

    setIsProcessing(true);
    const { bulkAddResponses, clearProjectResponses, responses: existingResponses } = useSurveyStore.getState();
    const rows = pasteContent.trim().split('\n');
    const newResponses: Omit<SurveyResponse, 'id' | 'createdAt'>[] = [];

    try {
      if (shouldClear) {
        await clearProjectResponses(targetId);
      }

      for (const row of rows) {
        const cols = row.split('\t').map(c => c.trim());
        if (cols.length < 2) continue;
        
        // 헤더 스킵
        if (cols[0].includes('ID') || cols[0].includes('응답자') || cols[0].includes('번호')) continue;

        const respondentName = cols[0];
        let currentIdx = 1;

        if (satTmpl) {
          const satAnswers = satTmpl.questions.map(q => ({
            questionId: q.id,
            score: Number(cols[currentIdx++]) || 0
          }));
          newResponses.push({
            projectId: targetId,
            templateId: satTmpl.id,
            respondentId: respondentName,
            answers: satAnswers
          });
        }

        if (compTmpl) {
          const compAnswers = compTmpl.questions.map(q => ({
            questionId: q.id,
            preScore: Number(cols[currentIdx++]) || 0,
            score: Number(cols[currentIdx++]) || 0
          }));
          newResponses.push({
            projectId: targetId,
            templateId: compTmpl.id,
            respondentId: respondentName,
            answers: compAnswers
          });
        }
      }

      // 중복 데이터 필터링 (초기화 모드가 아닐 때만)
      let finalResponses = newResponses;
      if (!shouldClear) {
        finalResponses = newResponses.filter(nr => 
          !existingResponses.some(er => 
            er.projectId === nr.projectId && 
            er.templateId === nr.templateId && 
            er.respondentId === nr.respondentId
          )
        );
      }

      if (finalResponses.length > 0) {
        await bulkAddResponses(finalResponses);
        const skipCount = newResponses.length - finalResponses.length;
        setPasteContent('');
        setIsPasteDialogOpen(false);
        alert(`데이터 처리가 완료되었습니다.${skipCount > 0 ? `\n(중복 데이터 ${skipCount}건 제외됨)` : ''}`);
      } else {
        alert('등록할 유효한 데이터가 없거나 모두 중복된 데이터입니다.');
      }
    } catch (err: unknown) { 
      const message = err instanceof Error ? err.message : '데이터 처리 중 오류가 발생했습니다.';
      alert(`오류 발생: ${message}`); 
    } finally {
      setIsProcessing(false);
      fetchSurveys(); // 상태 동기화 보장
    }
  };


  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      {/* 액션 바 (회의 관리 스타일 적용) */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-xl print:hidden">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <ClipboardCheck className="size-5 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-slate-900 tracking-tight whitespace-nowrap">설문 및 성과관리</h1>
          </div>

          <div className="flex items-center gap-2 max-w-4xl w-full">
            <Select 
              key={`surveys-select-${selectedProjectId}-${projects.length}`}
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
                      ? '전체 사업 통합 성과' 
                      : (projects.find(p => p.id === selectedProjectId)?.name || '사업 선택')
                    }
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold">전체 사업 통합 성과</SelectItem>
                {projects.filter(p => p.level === 1).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-[11px] font-bold">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex bg-slate-100/50 p-1 rounded-xl shadow-inner border border-slate-200/50">
          {[
            { id: 'templates', label: '설문 템플릿', icon: Settings2 }, 
            { id: 'data', label: '분석 대시보드', icon: BarChart3 }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5", 
                activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="size-3" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'data' && overallStats && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 space-y-2">
                <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-bold uppercase tracking-widest">운영 만족도</span><PieChartIcon className="size-4" /></div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-bold">{overallStats.satAvg.toFixed(2)}</div>
                  <p className="text-[10px] font-medium opacity-80 leading-tight">
                    100점 환산 시 {Math.round(overallStats.satAvg * 20)}점 | {overallStats.satAvg >= 4.5 ? '매우 우수' : '준수'}
                  </p>
                </div>
             </Card>
             <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 space-y-2">
                <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-bold uppercase tracking-widest">역량 향상도 (Hake&apos;s Gain)</span><TrendingUp className="size-4" /></div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-bold">{Math.round(overallStats.hakeGain * 100)}%</div>
                  <p className="text-[10px] font-medium opacity-80 leading-tight">
                    Hake&apos;s Gain 환산 | {overallStats.hakeGain >= 0.7 ? '매우 높음' : overallStats.hakeGain >= 0.3 ? '안정적' : '미흡'}
                  </p>
                </div>
             </Card>
             <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 space-y-2">
                <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-bold uppercase tracking-widest">통계적 효과 크기</span><BarChart2 className="size-4" /></div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-bold">{overallStats.cohensD.toFixed(2)}</div>
                  <p className="text-[10px] font-medium opacity-80 leading-tight">
                    Cohen&apos;s d 환산 | {overallStats.cohensD >= 0.8 ? '매우 큼' : overallStats.cohensD >= 0.5 ? '중간' : '미미'}
                  </p>
                </div>
             </Card>
             <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 space-y-2">
                <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-bold uppercase tracking-widest">통계적 유의확률</span><CheckCircle2 className="size-4" /></div>
                <div className="space-y-0.5">
                  <div className="text-2xl font-bold">{overallStats.pValue < 0.001 ? '< .01' : overallStats.pValue.toFixed(2)}</div>
                  <p className="text-[10px] font-medium opacity-80 leading-tight">
                    Paired t-test 분석 | {overallStats.pValue < 0.05 ? '유의미함' : '유의성 낮음'}
                  </p>
                </div>
             </Card>
          </div>
          
          <Card className="rounded-2xl border-none shadow-xl bg-white p-6 mt-4 relative group/expert">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCopyReport}
              className="absolute top-4 right-4 opacity-0 group-hover/expert:opacity-100 transition-opacity bg-slate-50 border border-slate-100 text-[10px] font-black gap-1.5 h-8 rounded-lg"
            >
              <ClipboardCheck className="size-3.5 text-indigo-600" /> 리포트 전문 복사
            </Button>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-2 py-0.5 rounded-full text-[9px] uppercase">Expert Insight</Badge>
                  <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">데이터 기반 전문가 통합 진단 및 성과 요약</h3>
                </div>
                
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed tracking-tight">
                  {(() => {
                    const levelText = overallStats.satAvg >= 4.5 && overallStats.hakeGain >= 0.3 ? "우수한 만족도와 실질적인 역량 향상이 관찰된 성과이며" : overallStats.satAvg >= 4.0 ? "안정적인 교육 운영과 기대 수준의 성과를 보이고 있으며" : "일부 보완이 필요하나 전반적인 교육 체계는 유지되고 있으며";
                    const coreText = overallStats.cohensD >= 0.8 ? "매우 강력한 통계적 유의미성" : "통계적으로 의미 있는 수준";
                    
                    return `본 과정은 ${levelText}, 특히 ${coreText}의 변화를 보여주고 있습니다. 분석 결과 우수한 학습 전이 효과가 확인되었으며 향후 실무 적용도를 더 높이기 위한 심화 과정 설계를 추천합니다.`;
                  })()}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: '전체 만족도', value: overallStats.satAvg >= 4.5 ? 'S (Excellent)' : overallStats.satAvg >= 4.0 ? 'A (Good)' : 'B (Normal)', color: 'text-emerald-600' },
                    { label: '성장 지표', value: overallStats.hakeGain >= 0.7 ? '높은 향상도' : overallStats.hakeGain >= 0.3 ? '안정적 향상' : '낮은 향상도', color: 'text-blue-600' },
                    { label: '효과 크기', value: overallStats.cohensD >= 0.8 ? '매우 강력' : overallStats.cohensD >= 0.5 ? '중간 수준' : '보통 지표', color: 'text-amber-600' },
                    { label: '통계적 유의성', value: overallStats.pValue < 0.05 ? '유의미함' : '보완 필요', color: 'text-purple-600' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{item.label}</span>
                      <span className={cn("text-[11px] font-bold", item.color)}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}


      <main className="min-h-[700px]">
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
             <div className="lg:col-span-1 space-y-4">
                <Card className="rounded-2xl border-none shadow-lg bg-white sticky top-10">
                   <CardHeader className="p-4 pb-2"><CardTitle className="text-[12px] font-bold flex justify-between items-center">설문 템플릿 목록 <Plus className="size-3.5 cursor-pointer" onClick={() => addTemplate({ name: '새로운 만족도 평가', type: 'SATISFACTION', questions: createDefaultQuestions('SATISFACTION') })} /></CardTitle></CardHeader>
                   <CardContent className="p-4 pt-0 space-y-4">
                      {['SATISFACTION', 'COMPETENCY'].map(type => (
                        <div key={type} className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                            {type === 'SATISFACTION' ? '운영 만족도 평가' : '핵심 역량 진단'}
                          </label>
                          <div className="space-y-1.5">
                            {templates.filter(t => t.type === type).map(t => (
                              <div key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={cn("p-2.5 rounded-xl cursor-pointer border transition-all group relative", selectedTemplateId === t.id ? "bg-slate-900 border-slate-900 text-white shadow-md" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100")}><p className="text-[11px] font-bold truncate">{t.name}</p><Button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, title: "템플릿 삭제", description: "선택하신 템플릿을 삭제하시겠습니까?", onConfirm: async () => { await deleteTemplate(t.id); setDeleteConfirm(p => ({...p, open: false})); } }); }} variant="ghost" size="icon" className="absolute top-1.5 right-1.5 size-5 text-white/40 hover:text-white opacity-0 group-hover:opacity-100"><Trash2 className="size-3" /></Button></div>
                            ))}
                          </div>
                        </div>
                      ))}
                   </CardContent>
                </Card>
             </div>
             <div className="lg:col-span-3">
                <Card className="rounded-2xl border-none shadow-xl bg-white overflow-hidden">
                    <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                       <Input value={editingTemplate?.name || ''} onChange={(e) => setEditingTemplate(p => p ? {...p, name: e.target.value} : null)} className="text-[14px] font-bold bg-transparent border-none p-0 focus-visible:ring-0 w-1/2" />
                       <Button onClick={async () => { if(editingTemplate) { await updateTemplate(editingTemplate.id, { name: editingTemplate.name, questions: editingTemplate.questions }); alert('저장되었습니다.'); } }} className="rounded-lg h-9 px-6 bg-blue-600 text-white text-[11px] font-bold">저장</Button>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-100">
                       {editingTemplate?.questions.map((q, idx) => (
                         <div key={q.id} className="p-4 group hover:bg-slate-50/50 transition-all flex gap-4">
                            <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-400">{idx+1}</div>
                            <div className="flex-1 grid grid-cols-3 gap-3">
                               <Input value={q.division} onChange={(e) => handleUpdateQuestion(q.id, 'division', e.target.value)} className="h-8 rounded-lg bg-slate-50 border-none font-medium text-[11px]" />
                               <Input value={q.theme} onChange={(e) => handleUpdateQuestion(q.id, 'theme', e.target.value)} className="h-8 rounded-lg bg-slate-50 border-none font-medium text-[11px]" />
                               <Input value={q.content} onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)} className="h-8 rounded-lg bg-slate-50 border-none font-medium text-[11px]" />
                            </div>
                            <Button onClick={() => setEditingTemplate(p => p ? {...p, questions: p.questions.filter(qu => qu.id !== q.id)} : null)} variant="ghost" size="icon" className="size-8 text-slate-200 hover:text-red-500"><Trash2 className="size-3.5" /></Button>
                         </div>
                       ))}
                       <div className="p-6 flex justify-center gap-3">
                         <Button onClick={() => handleAddQuestion('SCALE')} variant="outline" className="h-9 border-dashed border-2 px-6 rounded-lg font-bold text-blue-600 hover:bg-blue-50 text-[11px]">+ 역량 질문 추가</Button>
                         <Button onClick={() => handleAddQuestion('TEXT')} variant="outline" className="h-9 border-dashed border-2 px-6 rounded-lg font-bold text-slate-600 hover:bg-slate-50 text-[11px]">+ 텍스트 질문 추가</Button>
                       </div>
                    </CardContent>
                </Card>
             </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-5">
              <div className="flex flex-wrap gap-2 px-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg shadow-md mr-1">
                  <TargetIcon className="size-3" />
                  <span className="text-[10px] font-bold">분석 필터: 프로그램 단위</span>
                </div>
                {projects.filter(p => selectedProjectIds.includes(p.id) && p.level === 4).map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg group hover:bg-white hover:shadow-sm transition-all">
                    <span className="text-[10px] font-bold text-slate-700">{p.name}</span>
                    <button onClick={() => setSelectedProjectIds(prev => prev.filter(id => id !== p.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>

             <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-lg">
                  <div className="flex gap-3 min-w-[280px]">
                    <div className="flex-1 space-y-0.5"><label className="text-[9px] font-bold text-slate-400">시작일</label><Input type="date" value={dataDateRange.start} onChange={(e)=>setDataDateRange(p=>({...p, start:e.target.value}))} className="h-9 bg-slate-50 border-none rounded-lg font-bold text-[11px]" /></div>
                    <div className="flex-1 space-y-0.5"><label className="text-[9px] font-bold text-slate-400">종료일</label><Input type="date" value={dataDateRange.end} onChange={(e)=>setDataDateRange(p=>({...p, end:e.target.value}))} className="h-9 bg-slate-50 border-none rounded-lg font-bold text-[11px]" /></div>
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-[300px]">
                     <label className="text-[9px] font-bold text-slate-400">분석 프로그램</label>
                     <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                        <PopoverTrigger render={
                          <Button variant="outline" className="w-full h-9 justify-start px-3 rounded-lg font-bold text-[11px] gap-2 bg-slate-50 border-none">
                            <Layers className="size-3.5 text-blue-500" /> {selectionPath} <ChevronDown className="size-3.5 ml-auto opacity-50" />
                          </Button>
                        } />
                        <PopoverContent className="w-[480px] p-0 rounded-[2rem] shadow-2xl bg-white"><div className="p-6 border-b font-black text-sm">프로그램 통합 선택</div><div className="p-4 max-h-[500px] overflow-y-auto">{renderNodes(null)}</div></PopoverContent>
                     </Popover>
                  </div>
                  <div className="flex gap-4 ml-auto h-12 items-center">
                    <Button variant="outline" onClick={()=>setIsPasteDialogOpen(true)} className="h-full px-8 rounded-xl border-blue-100 text-blue-600 font-black"><FileSpreadsheet className="size-4 mr-2" /> 엑셀 RAW 붙여넣기</Button>
                    <Button onClick={async ()=>{setDeleteConfirm({ open: true, title: "데이터 전면 삭제", description: `선택된 ${selectedProjectIds.length}개 프로그램의 모든 데이터를 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.`, onConfirm: async () => { await Promise.all(selectedProjectIds.map(id=>clearProjectResponses(id))); await fetchSurveys(); setDeleteConfirm(p => ({...p, open: false})); alert("삭제 완료"); } })}} variant="outline" className="h-full px-6 rounded-xl text-red-500"><Trash2 className="size-4" /></Button>
                  </div>
             </div>

             <Card className="rounded-2xl border-none shadow-xl bg-white overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <TooltipProvider delay={0}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase">
                            <th className="p-4 text-left sticky left-0 z-40 bg-white/95 backdrop-blur shadow-sm border-r min-w-[240px]">분석 테마</th>
                            {satQuestions.map((q, idx) => (
                              <th key={q.id} className="p-1.5 text-center w-12 min-w-[48px]"><Tooltip><TooltipTrigger className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[9px] flex flex-col items-center w-full leading-tight font-bold">Q{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-3 rounded-lg text-[10px]">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                            {satTextQuestions.map((q, idx) => (
                              <th key={q.id} className="p-1.5 text-center w-24 min-w-[90px]"><Tooltip><TooltipTrigger className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded text-[9px] flex flex-col items-center w-full leading-tight font-bold">TX{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-3 rounded-lg text-[10px]">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                             <th className="p-2 text-center bg-emerald-50 text-[9px] w-16 text-emerald-700 font-bold">만족도</th>
                            {compQuestions.map((q, idx) => (
                              <th key={q.id} className="p-1.5 text-center w-12 min-w-[48px]"><Tooltip><TooltipTrigger className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] flex flex-col items-center w-full leading-tight font-bold">Q{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-3 rounded-lg text-[10px]">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                            <th className="p-2 text-center bg-blue-50 text-[9px] w-16 text-blue-700 font-bold">역량</th>
                             <th className="p-2 text-center bg-emerald-50/50 text-emerald-700 font-bold text-[9px]">Gain%</th>
                             <th className="p-2 text-center bg-amber-50/50 text-amber-700 font-bold text-[9px]">d</th>
                             <th className="p-2 text-center bg-purple-50/50 text-purple-700 font-bold text-[9px]">p</th>
                            <th className="p-4 text-center w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(() => {
                            const renderTree = (parentId: string | null, depth = 0): React.ReactNode[] => {
                              const sorted = getSortedProjects(parentId);
                              const displayProjects = depth === 0 
                                ? sorted.filter(p => p.level === 1 && (selectedLv1Ids.length === 0 || selectedLv1Ids.includes(p.id))) 
                                : sorted;

                              const sortedRows = displayProjects.filter(p => visibleProjectIds.has(p.id));
                              return sortedRows.map(p => {
                                const isExpanded = expandedTableIds.has(p.id);
                                const pResponses = responses.filter(r => r.projectId === p.id);
                                const stats = aggregatedStats[p.id];
                                return (
                                  <React.Fragment key={p.id}>
                                    <tr 
                                      onClick={() => toggleTableExpand(p.id)} 
                                      className={cn(
                                        "border-b transition-colors group cursor-pointer", 
                                        depth === 0 ? "bg-slate-100/40" : (depth === 1 ? "bg-slate-50/30" : "bg-transparent"),
                                        "hover:bg-blue-50/60"
                                      )}
                                    >
                                      <td className="p-3 sticky left-0 z-20 bg-inherit group-hover:bg-inherit transition-colors border-r min-w-[240px]">
                                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1}rem` }}>
                                          <div className="flex items-center justify-center size-4 shrink-0">
                                            {projects.some(c => c.parentId === p.id) ? (
                                              <button className="p-0.5 hover:bg-slate-100 rounded transition-colors">
                                                {isExpanded ? <ChevronDown className="size-3 text-slate-400" /> : <ChevronRight className="size-3 text-slate-400" />}
                                              </button>
                                            ) : null}
                                          </div>
                                          <div className="flex flex-col gap-0">
                                            {p.level >= 3 && (
                                              <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400 leading-none">
                                                <span>{p.startDate} ~ {p.endDate}</span>
                                                <span className="text-slate-200">|</span>
                                                <span className="text-blue-500/70">{partners.find(ptr => ptr.id === p.partnerId)?.name || "파트너 없음"}</span>
                                              </div>
                                            )}
                                            <span className="text-[11px] font-bold text-slate-900 truncate max-w-[180px]">
                                              {p.name}
                                            </span>
                                            {p.level >= 3 && p.quota > 0 && (
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className="w-12 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                                                  <div 
                                                    className="h-full bg-blue-400 rounded-full" 
                                                    style={{ width: `${Math.min((p.participantCount / p.quota) * 100, 100)}%` }} 
                                                  />
                                                </div>
                                                <span className="text-[7px] font-bold text-slate-400">{Math.round((p.participantCount / p.quota) * 100)}% ({p.participantCount}/{p.quota}명)</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      {satQuestions.map((_, i) => <td key={i} className="p-4 text-center font-black text-[10px] text-emerald-600/60">{stats?.questionStats?.[i]?.average?.toFixed(2) || '-'}</td>)}
                                      {satTextQuestions.map((q, i) => {
                                        const textResponses = pResponses
                                          .map(res => res.answers.find(ans => ans.questionId === q.id)?.text)
                                          .filter(Boolean) as string[];
                                        
                                        return (
                                          <td key={i} className="p-4 text-center border-r min-w-[100px]">
                                            {textResponses.length > 0 ? (
                                              <Popover>
                                                <PopoverTrigger className="mx-auto">
                                                  <button className="px-2 py-1 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all flex items-center gap-1 mx-auto">
                                                    <MessageSquare className="size-3" />
                                                    <span className="text-[9px] font-black uppercase text-blue-600/60 group-hover:text-blue-600">{textResponses.length}</span>
                                                  </button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="center">
                                                  <div className="bg-slate-50/80 p-4 border-b border-slate-100">
                                                    <h4 className="text-[11px] font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                                                       <FileText className="size-3.5 text-blue-500" /> 주관식 응답 원문 데이터
                                                    </h4>
                                                  </div>
                                                  <ScrollArea className="max-h-[300px]">
                                                    <div className="p-4 space-y-4">
                                                      {textResponses.map((text, tidx) => (
                                                        <div key={tidx} className="group relative">
                                                          <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-blue-100 group-hover:bg-blue-400 transition-all rounded-full" />
                                                          <p className="text-[11px] leading-relaxed text-slate-600 font-medium pl-2 italic">
                                                            &quot;{text}&quot;
                                                          </p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </ScrollArea>
                                                </PopoverContent>
                                              </Popover>
                                            ) : (
                                              <span className="text-[8px] text-slate-200 uppercase font-black tracking-widest">None</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="p-4 text-center font-black text-xs bg-emerald-50/30 text-blue-700">{stats?.satAvg?.toFixed(2) || "-"}</td>
                                      {compQuestions.map((_, i) => (
                                        <td key={i} className="p-4 text-center font-black text-[10px] text-blue-600/60">
                                          <div className="flex flex-col">
                                            <span>{stats?.questionStats?.[i]?.postAvg?.toFixed(2) || '-'}</span>
                                            {stats?.questionStats?.[i]?.impRate !== undefined && (
                                              <Tooltip>
                                                <TooltipTrigger className={cn("text-[7px] font-bold cursor-help", stats?.questionStats?.[i]?.impRate >= 0 ? "text-blue-500" : "text-red-500")}>
                                                  {stats?.questionStats?.[i]?.impRate >= 0 ? '+' : ''}{Math.round(stats?.questionStats?.[i]?.impRate)}%
                                                </TooltipTrigger>
                                                <TooltipContent className="p-3 bg-white border-slate-100 shadow-xl rounded-xl">
                                                  <div className="text-[10px] space-y-1">
                                                    <p className="font-black text-blue-600 underline underline-offset-2">역량 향상도 (Hake&apos;s Gain) 산출 기초</p>
                                                    <p className="text-slate-500 font-bold">[(사후 평균 - 사전 평균) / 사전 평균] * 100</p>
                                                    <p className="text-slate-700 font-black pt-1 border-t border-slate-100 italic">
                                                      {`데이터 분석 결과 사전 대비 사후 역량 평균 (POST)이 약 ${Math.round(stats?.questionStats?.[i]?.impRate)}% ${stats?.questionStats?.[i]?.impRate >= 0 ? "향상" : "감소"}된 것으로 확인되었습니다.`}
                                                    </p>
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            )}
                                          </div>
                                        </td>
                                      ))}
                                      <td className="p-4 text-center font-black text-xs bg-blue-50/30 text-blue-700">
                                        <div className="flex flex-col">
                                          <span>{stats?.postAvg?.toFixed(2) || '-'}</span>
                                          {stats?.impRate !== undefined && (
                                            <Tooltip>
                                              <TooltipTrigger className={cn("text-[8px] font-black cursor-help", stats?.impRate >= 0 ? "text-blue-700" : "text-red-600")}>
                                                {stats?.impRate >= 0 ? '+' : ''}{Math.round(stats?.impRate)}%
                                              </TooltipTrigger>
                                              <TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl">
                                                <div className="text-[11px] space-y-1.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <TrendingUp className="size-3 text-blue-600" />
                                                    <p className="font-black text-slate-800">역량 향상도 (Hake&apos;s Gain) (Hake&apos;s Gain)</p>
                                                  </div>
                                                  <p className="text-slate-400 font-bold px-1 py-0.5 bg-blue-50 rounded w-fit">Formula: (Post - Pre) / Pre %</p>
                                                  <p className="text-slate-700 font-black border-t border-slate-100 pt-1.5">
                                                     {`본 교육 과정을 통해 사전 대비 사후 역량 평균 (POST)이 약 ${Math.round(stats?.impRate)}% ${stats?.impRate >= 0 ? "성장" : "정체"}하였으며, 이는 ${stats?.impRate >= 10 ? "통계적으로 유의미한 성과" : "점진적인 성과 지표"}로 분석됩니다.`}
                                                  </p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </td>
                                      <td className={cn("p-4 text-center text-[10px] font-black", 
                                        (stats?.hakeGain || 0) >= 0.7 ? "text-blue-700 bg-blue-100/50" : 
                                        (stats?.hakeGain || 0) >= 0.3 ? "text-emerald-700 bg-emerald-50/50" : 
                                        "text-slate-400")}>
                                        <div className="flex flex-col">
                                          <span>{Math.round((stats?.hakeGain || 0) * 100)}%</span>
                                          {stats?.hakeGain !== undefined && (
                                            <Tooltip>
                                              <TooltipTrigger className="text-[8px] font-black opacity-60 cursor-help">
                                                <span className="text-[8px] font-black opacity-60">
                                                  {Math.round((stats?.hakeGain ?? 0) * 100)}%
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl">
                                                <div className="text-[11px] space-y-1.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <Zap className="size-3 text-emerald-600" />
                                                    <p className="font-black text-slate-800">역량 향상도 (Hake&apos;s Gain) (Hake&apos;s Gain)</p>
                                                  </div>
                                                  <p className="text-slate-400 font-bold px-1 py-0.5 bg-emerald-50 rounded w-fit">Formula: Gain / Potential Gain %</p>
                                                  <p className="text-slate-700 font-black border-t border-slate-100 pt-1.5">
                                                   {`학습 전이 효과는 약 ${Math.round((stats?.hakeGain ?? 0) * 100)}%로, ${(stats?.hakeGain ?? 0) >= 0.7 ? "최고 수준의 지식 전이가 일어난 성실한 교육 과정" : (stats?.hakeGain ?? 0) >= 0.3 ? "보통 이상의 지식 전이 효과" : "기초 지식 전이 수준"}으로 평가됩니다.`}
                                                  </p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-4 text-center text-[10px] font-black">
                                        {(stats?.cohensD || 0).toFixed(2)}
                                      </td>
                                      <td className={cn("p-4 text-center text-[10px] font-black", 
                                        (stats?.pValue || 1) < 0.05 ? "text-purple-700 bg-purple-50" : 
                                        "text-slate-300")}>
                                        {stats?.pValue?.toFixed(2) || '-'}
                                      </td>
                                      <td className="p-4 text-center opacity-30 text-[9px] font-black">LV{p.level}</td>

                                    </tr>
                                    {isExpanded && projects.some(c => c.parentId === p.id) && renderTree(p.id, depth + 1)}
                                    {isExpanded && (() => {
                                      const mergedResponses = pResponses.reduce((acc, res) => {
                                        const rId = res.respondentId || `anon-${res.id.slice(0, 8)}`;
                                        if (!acc[rId]) acc[rId] = { id: rId, respondentId: res.respondentId, sat: null as SurveyResponse | null, comp: null as SurveyResponse | null };
                                        const tmpl = templates.find(t => t.id === res.templateId);
                                        if (tmpl?.type === 'SATISFACTION') acc[rId].sat = res;
                                        else if (tmpl?.type === 'COMPETENCY') acc[rId].comp = res;
                                        return acc;
                                      }, {} as Record<string, { id: string, respondentId?: string, sat: SurveyResponse | null, comp: SurveyResponse | null }>);

                                      return Object.values(mergedResponses)
                                        .sort((a, b) => {
                                          const aId = a.respondentId || '';
                                          const bId = b.respondentId || '';
                                          return aId.localeCompare(bId, undefined, { numeric: true, sensitivity: 'base' });
                                        })
                                        .map((m) => {
                                          const rSatAnswers = m.sat?.answers.filter(a => satQuestions.some(q => q.id === a.questionId)) || [];
                                          const rSatAvg = rSatAnswers.length > 0 ? rSatAnswers.reduce((prev, curr) => prev + (Number(curr.score) || 0), 0) / rSatAnswers.length : 0;
                                          const rCompAnswers = m.comp?.answers.filter(a => compQuestions.some(q => q.id === a.questionId)) || [];
                                          const rPreAvg = rCompAnswers.length > 0 ? rCompAnswers.reduce((prev, curr) => prev + (Number(curr.preScore) || 0), 0) / rCompAnswers.length : 0;
                                          const rPostAvg = rCompAnswers.length > 0 ? rCompAnswers.reduce((prev, curr) => prev + (Number(curr.score) || 0), 0) / rCompAnswers.length : 0;
                                          const rGain = rPreAvg > 0 || rPostAvg > 0 ? (rPostAvg - rPreAvg) / (5 - rPreAvg) : 0;
                                          
                                          return (
                                            <tr key={m.id} className="border-b bg-white hover:bg-slate-50">
                                              <td className="p-4 sticky left-0 z-20 bg-white border-r min-w-[220px]">
                                                <div className="flex flex-col">
                                                  <span className="text-[10px] font-bold text-slate-500">{m.respondentId || '개별 응답자'}</span>
                                                  <span className="text-[8px] text-emerald-500 font-black">INTEGRATED DATA</span>
                                                </div>
                                              </td>
                                              {satQuestions.map(q => <td key={q.id} className="p-4 text-center text-[10px] font-bold text-emerald-700">{m.sat?.answers.find(a=>a.questionId===q.id)?.score || '-'}</td>)}
                                              {satTextQuestions.map(q => {
                                                const ans = m.sat?.answers.find(a => a.questionId === q.id);
                                                const text = ans?.text || '-';
                                                return (
                                                  <td key={q.id} className="p-4 text-center text-[10px] text-slate-500 bg-slate-50/50 border-r min-w-[110px]">
                                                    {text === '-' ? '-' : (
                                                      <Tooltip>
                                                        <TooltipTrigger className="cursor-help hover:text-blue-600 underline decoration-slate-200 underline-offset-4 decoration-dotted transition-colors">
                                                          {text.length > 8 ? `${text.slice(0, 8)}...` : text}
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-[340px] p-6 bg-white border border-slate-100 text-slate-900 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
                                                          <div className="space-y-3">
                                                            <div className="flex items-center gap-2 mb-2">
                                                              <MessageSquare className="size-3.5 text-blue-500" />
                                                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Qualitative Feedback</span>
                                                            </div>
                                                            <p className="text-sm leading-relaxed font-bold text-slate-800 break-keep">{text}</p>
                                                            <div className="h-1 w-8 bg-blue-100 rounded-full" />
                                                          </div>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                  </td>
                                                );
                                              })}
                                              <td className="p-4 text-center font-black text-[10px] text-blue-700">{rSatAvg.toFixed(2)}</td>
                                              {compQuestions.map(q => {
                                                const ans = m.comp?.answers.find(a=>a.questionId===q.id);
                                                return (
                                                  <td key={q.id} className="p-4 text-center text-[10px]">
                                                    <div className="flex flex-col gap-0.5 font-bold">
                                                      <span className="text-slate-400">{ans?.preScore || '-'}</span>
                                                      <span className="text-blue-700 font-black">{ans?.score || '-'}</span>
                                                      {ans?.preScore !== undefined && ans?.score !== undefined && (
                                                        <span className={cn(
                                                          "text-[7px] font-bold leading-none mt-0.5",
                                                          (ans?.score - ans?.preScore) >= 0 ? "text-blue-500" : "text-red-500"
                                                        )}>
                                                          {ans?.score >= ans?.preScore ? '+' : ''}{Math.round(((ans?.score - ans?.preScore) / (ans?.preScore || 1)) * 100)}%
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                );
                                              })}
                                              <td className="p-4 text-center font-black text-[10px] text-blue-700">{rPostAvg.toFixed(2)}</td>
                                              <td className="p-4 text-center">
                                                <div className="flex flex-col">
                                                  <span className="text-[10px] font-black text-blue-700">{Math.round((rGain ?? 0) * 100)}%</span>
                                                  <span className={cn(
                                                    "text-[8px] font-black leading-none mt-0.5",
                                                    rGain >= 0.7 ? "text-blue-700" : rGain >= 0.3 ? "text-emerald-600" : "text-slate-500"
                                                  )}>
                                                    {Math.round((rGain ?? 0) * 100)}%
                                                  </span>
                                                </div>
                                              </td>
                                              <td colSpan={2} />
                                              <td className="p-4 text-center">
                                                <div className="flex gap-1 justify-center">
                                                  <Button onClick={(e) => { e.stopPropagation(); setEditingResponse(m.sat || m.comp); setIsEditDialogOpen(true); }} variant="ghost" size="icon" className="size-6 text-slate-300"><Edit className="size-3" /></Button>
                                                  <Button onClick={async (e) => { e.stopPropagation(); if(confirm('삭제하시겠습니까?')) { if(m.sat) await deleteResponse(m.sat.id); if(m.comp) await deleteResponse(m.comp.id); await fetchSurveys(); } }} variant="ghost" size="icon" className="size-6 text-slate-300"><Trash2 className="size-3" /></Button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        });
                                    })()}
                                    {isExpanded && (projects.some(c => c.parentId === p.id) || pResponses.length > 0) && (
                                      <tr className="bg-slate-900 text-white font-black text-[10px] border-b-2">
                                        <td className="p-4 sticky left-0 z-30 bg-slate-900 border-r min-w-[300px]"><div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1}rem` }}><Sigma className="size-3 text-emerald-400" /> {p.name} 전체 가중 평균</div></td>
                                        {satQuestions.map((q) => <td key={q.id} className="p-4 text-center text-emerald-400/80">{stats?.questionStats?.find(qs => qs.questionId === q.id)?.average?.toFixed(2) || '-'}</td>)}
                                        {satTextQuestions.map((_, i) => <td key={i} className="p-4 text-center text-slate-500/50 italic">-</td>)}
                                        <td className="p-4 text-center text-emerald-400 bg-white/5">{stats?.satAvg?.toFixed(2) || '-'}</td>
                                        {compQuestions.map((q) => {
                                          const qStat = stats?.questionStats?.find(qs => qs.questionId === q.id);
                                          return (
                                            <td key={q.id} className="p-4 text-center text-blue-400/80">
                                              <div className="flex flex-col">
                                                <span>{qStat?.postAvg?.toFixed(2) || '-'}</span>
                                                {qStat?.impRate !== undefined && (
                                                  <Tooltip>
                                                    <TooltipTrigger className="text-[7px] font-bold text-blue-400/60 cursor-help">
                                                      +{Math.round(qStat.impRate)}%
                                                    </TooltipTrigger>
                                                    <TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl text-slate-900">
                                                      <div className="text-[11px] space-y-1.5">
                                                        <p className="font-black text-blue-600 mb-1">역량 성장 핵심 지표</p>
                                                        <p className="font-bold border-t pt-1.5 border-slate-50 italic">
                                                          {`전체 응답자의 해당 역량이 ${Math.round(qStat.impRate)}% ${qStat.impRate >= 0 ? "강화" : "변화없음"}된 것으로 분석됩니다.`}
                                                        </p>
                                                      </div>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                )}
                                              </div>
                                            </td>
                                          );
                                        })}
                                        <td className="p-4 text-center bg-blue-500/10">
                                          <Tooltip>
                                            <TooltipTrigger className="cursor-help">
                                              <span className="text-sm font-black text-blue-400">{stats?.postAvg?.toFixed(2) || '0.00'}</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-6 bg-slate-900 border-none shadow-3xl rounded-[2rem] w-80 text-white">
                                              <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                  <div className="size-8 rounded-xl bg-blue-500/20 flex items-center justify-center"><Activity className="size-4 text-blue-400" /></div>
                                                  <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Post Average</p><p className="text-white font-black">사후 통합 가중 평균</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">교육 완료 후 핵심 역량 및 만족도 항목에 대한 사후 평가의 산술 평균값을 의미합니다. 이는 교육의 즉각적인 효과성을 측정하는 가장 직관적인 지표입니다.</p>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Calculation</p><p className="text-[11px] font-mono text-blue-300">(전체 사후 점수 합계) / (전체 응답자 수 * 문항 수)</p></div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td className="p-4 text-center bg-emerald-500/10">
                                          <Tooltip>
                                            <TooltipTrigger className="cursor-help">
                                              <span className="text-sm font-black text-emerald-400">{Math.round((stats?.hakeGain ?? 0) * 100)}%</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-6 bg-slate-900 border-none shadow-3xl rounded-[2rem] w-80 text-white">
                                              <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                  <div className="size-8 rounded-xl bg-emerald-500/20 flex items-center justify-center"><TargetIcon className="size-4 text-emerald-400" /></div>
                                                  <div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Hake&apos;s Gain %</p><p className="text-white font-black">역량 향상도 (Hake&apos;s Gain) (Hake&apos;s Gain)</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">사전 점수를 기반으로 도달 가능한 성장폭 대비 실제 달성한 성장폭의 비율을 의미하며, 학습 내용이 실무 지식으로 얼마나 효과적으로 전이되었는지를 나타내는 핵심 성과 지표입니다.</p>
                                                <div className="flex flex-col gap-2">
                                                  <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Interpretation</p><p className="text-[11px] text-emerald-300 font-bold">{(stats?.hakeGain ?? 0) >= 0.7 ? "High Gain (최고 수준)" : (stats?.hakeGain ?? 0) >= 0.3 ? "Medium Gain (보통 수준)" : "Low Gain (기초 수준)"}</p></div>
                                                  <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Formula</p><p className="text-[11px] font-mono text-emerald-200">(Post - Pre) / (5 - Pre) * 100</p></div>
                                                </div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td className="p-4 text-center bg-blue-500/5">
                                          <Tooltip>
                                            <TooltipTrigger className="cursor-help">
                                              <span className="text-sm font-black text-blue-400">{stats?.cohensD?.toFixed(2) || '0.00'}</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-6 bg-slate-900 border-none shadow-3xl rounded-[2rem] w-80 text-white">
                                              <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                  <div className="size-8 rounded-xl bg-blue-500/20 flex items-center justify-center"><BarChart2 className="size-4 text-blue-400" /></div>
                                                  <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Cohen&apos;s d</p><p className="text-white font-black">효과 크기 (Cohen&apos;s d)</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">집단 간의 평균 차이를 분산의 정도로 표준화한 수치로, 표본 크기와 상관없이 교육 프로그램이 미친 실제적인 영향력의 크기를 객관적으로 보여주는 지표입니다.</p>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Benchmark</p><p className="text-[11px] text-blue-300 font-bold">{(stats?.cohensD ?? 0) >= 0.8 ? "Large (매우 강력)" : (stats?.cohensD ?? 0) >= 0.5 ? "Medium (보통 수준)" : "Small (미미한 수준)"}</p></div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td className="p-4 text-center bg-blue-500/5">
                                          <Tooltip>
                                            <TooltipTrigger className="cursor-help">
                                              <span className={cn("text-sm font-black", (stats?.pValue ?? 1) < 0.05 ? "text-emerald-400" : "text-slate-500")}>
                                                {stats?.pValue < 0.001 ? '< .01' : stats?.pValue?.toFixed(2) || '1.00'}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-6 bg-slate-900 border-none shadow-3xl rounded-[2rem] w-80 text-white">
                                              <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                  <div className="size-8 rounded-xl bg-purple-500/20 flex items-center justify-center"><CheckCircle2 className="size-4 text-purple-400" /></div>
                                                  <div><p className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">p-Value</p><p className="text-white font-black">유의확률 (p-value)</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">사전-사후 평가 점수의 변화가 우연에 의한 것인지, 아니면 교육 과정의 영향에 의한 것인지를 검정하는 수치입니다. 0.05 미만일 경우 해당 변화가 통계적으로 매우 의미 있는 성과임을 보증합니다.</p>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Decision</p><p className={cn("text-[11px] font-bold", (stats?.pValue ?? 1) < 0.05 ? "text-emerald-300" : "text-slate-400")}>{(stats?.pValue ?? 1) < 0.05 ? "Statistically Significant (유의미)" : "Not Significant (유의성 부족)"}</p></div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td colSpan={2} />
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              });
                            };
                            return renderTree(null);
                          })()}
                        </tbody>
                      </table>
                    </TooltipProvider>
                </div>
              </Card>
           </div>
        )}

              {/* 전문가 정밀 성과 보고서 (데이터 시각화 및 인사이트) */}
              {selectedProjectIds.length > 0 && (
                <div className="mt-20 border-t-8 border-slate-50 pt-20 space-y-16 animate-in fade-in slide-in-from-bottom-10 print:m-0 print:p-0">
                  <div className="flex items-center justify-between px-10">
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                          <FileBarChart className="size-8 text-white" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                          교육 전문가 분석 기반 정밀 성과 보고서
                        </h2>
                      </div>
                      <p className="text-lg font-bold text-slate-400 ml-14">
                        대상 프로그램 : {selectedProjectIds.length}개 과정 통합 | 분석 기준일 : {format(new Date(), 'yyyy년 MM월 dd일')}
                      </p>
                    </div>
                    <div>
                      <Button 
                        onClick={() => {
                          const exportDOCXContent = () => {
                            const templateMap = new Map((templates || []).map(t => [t.id, t]));
                            const fullHtml = `
                              <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                              <head>
                                <meta charset='utf-8'>
                                <title>교육 전문가 정밀 분석 보고서</title>
                                <style>
                                  body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; line-height: 1.6; color: #333; font-size: 13px; }
                                  table { border-collapse: collapse; width: 100%; margin-bottom: 24px; font-size: 11px; }
                                  th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; }
                                  th { background-color: #f8fafc; font-weight: bold; color: #475569; }
                                  h1 { color: #0f172a; font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-top: 30px; text-align: center; }
                                  h2 { color: #1e293b; font-size: 18px; margin-top: 30px; font-weight: bold; border-left: 4px solid #3b82f6; padding-left: 10px; }
                                  h3 { color: #475569; font-size: 14px; margin-top: 20px; font-weight: bold; }
                                  .notice { background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
                                  .highlight { color: #2563eb; font-weight: bold; }
                                  .success { color: #059669; font-weight: bold; }
                                  .summary-box { background-color: #eff6ff; padding: 20px; border: 1px solid #bfdbfe; font-weight: bold; color: #1e3a8a; }
                                </style>
                              </head>
                              <body>
                                <h1>설문 분석 전문가 성과 지표 보고서</h1>
                                
                                <h2>1. 핵심 성과 지표 요약 (Executive Summary)</h2>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>사후 역량 평균 (POST)</th>
                                      <th>역량 향상도 (Hake&apos;s Gain)</th>
                                      <th>효과 크기 (Cohen's d)</th>
                                      <th>유의확률 (p-value)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td class="success" style="font-size: 18px;">${(overallStats?.postAvg || 0).toFixed(2)}</td>
                                      <td class="highlight" style="font-size: 18px;">${Math.round((overallStats?.hakeGain || 0) * 100)}%</td>
                                      <td style="color:#b45309; font-size: 18px;">${(overallStats?.cohensD || 0).toFixed(2)}</td>
                                      <td style="color:#7e22ce; font-size: 18px;">${(overallStats?.pValue || 0) < 0.001 ? '< .01' : (overallStats?.pValue || 0).toFixed(3)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                                
                                <br />

                                <h2>2. 정밀 분석 리포트 (Step-by-Step Analysis)</h2>
                                
                                <h3>Step 1: 운영 만족도 및 품질 기조 분석</h3>
                                <div class="notice">
                                  ${(overallStats ? ExpertReportGenerator.generateSatisfactionOpinion(
                                     projects.filter(p => selectedProjectIds.includes(p.id) || p.id === (projects.find(p2 => p2.id === selectedProjectIds[0])?.parentId)),
                                     templates?.filter(t => t.type === 'SATISFACTION').flatMap(t => t.questions) || [],
                                     overallStats!,
                                     responses.filter(r => selectedProjectIds.includes(r.projectId)).flatMap(r => r.answers.filter(a => a.text).map(a => a.text!))
                                  ) : '').replace(/\n/g, '<br>')}
                                </div>

                                <h3>Step 2: 핵심 역량 성장 진단 (Pre/Post Comparison)</h3>
                                <div class="notice">
                                  ${(overallStats ? ExpertReportGenerator.generateCompetencyOpinion(
                                     projects.filter(p => selectedProjectIds.includes(p.id) || p.id === (projects.find(p2 => p2.id === selectedProjectIds[0])?.parentId)),
                                     templates?.filter(t => t.type === 'COMPETENCY').flatMap(t => t.questions) || [],
                                     overallStats!
                                  ) : '').replace(/\n/g, '<br>')}
                                </div>

                                <h3>Step 3: 전문가 통합 전략 제언</h3>
                                <div class="summary-box">
                                  ${(overallStats ? ExpertReportGenerator.generateConsultingReport(
                                      projects.filter(p => selectedProjectIds.includes(p.id) || p.id === projects.find(p2 => p2.id === selectedProjectIds[0])?.parentId), 
                                      templates?.filter(t => t.type === 'SATISFACTION' || t.type === 'COMPETENCY').flatMap(t => t.questions) || [],
                                      overallStats!
                                  ) : '').replace(/\n/g, '<br>')}
                                </div>

                                <h2>3. 성과 상세 데이터 (Appendix)</h2>
                                <h3>[별첨 1] 프로젝트별 성과 요약 테이블</h3>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>프로젝트 명칭</th>
                                      <th>운영 만족도 (SAT)</th>
                                      <th>사후 역량 평균 (POST)</th>
                                      <th>역량 향상도 (Hake&apos;s Gain)</th>
                                      <th>효과 크기 (Cohen's d)</th>
                                      <th>유의확률 (p-value)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${effectiveProjectIds.map(pid => {
                                      const p = projects.find(item => item.id === pid);
                                      const stats = aggregatedStats[pid];
                                      if (!p || !stats) return '';
                                      return `
                                        <tr>
                                          <td style="text-align: left; font-weight: bold;">${p.name}</td>
                                          <td class="success">${stats.satAvg?.toFixed(2)}</td>
                                          <td class="highlight">${stats.postAvg?.toFixed(2)}</td>
                                          <td class="highlight">${Math.round((stats.hakeGain || 0) * 100)}%</td>
                                          <td>${(stats.cohensD || 0).toFixed(2)}</td>
                                          <td>${(stats.pValue || 1).toFixed(3)}</td>
                                        </tr>
                                      `;
                                    }).join('')}
                                  </tbody>
                                </table>

                                <h3>[별첨 2] 개별 응답자별 성과 관리 RAW Data</h3>
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr>
                                      <th>No.</th>
                                      <th>응답자(ID)</th>
                                      <th>운영 만족도 (SAT)</th>
                                      <th>사전 역량 평균 (PRE)</th>
                                      <th>사후 역량 평균 (POST)</th>
                                      <th>역량 향상도 (Hake&apos;s Gain)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${(() => {
                                      let idx = 1;
                                      const sortedEffectiveProjects = projects
                                        .filter(p => effectiveProjectIds.includes(p.id))
                                        .sort((a, b) => {
                                           if (a.level !== b.level) return a.level - b.level;
                                           return (a.startDate || "").localeCompare(b.startDate || "");
                                        });

                                      return sortedEffectiveProjects.flatMap(p => {
                                        const pResponses = responses.filter(r => r.projectId === p.id);
                                        const uniqueRespondents = Array.from(new Set(pResponses.map(r => r.respondentId || `anon-${r.id.slice(0, 8)}`)))
                                          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                                        return uniqueRespondents.map(rid => {
                                          const resps = pResponses.filter(r => (r.respondentId || `anon-${r.id.slice(0, 8)}`) === rid);
                                          const sat = resps.find(r => templates.find(t => t.id === r.templateId)?.type === 'SATISFACTION');
                                          const comp = resps.find(r => templates.find(t => t.id === r.templateId)?.type === 'COMPETENCY');

                                          const satTmpl = templateMap.get(sat?.templateId || '');
                                          const rSatAnswers = sat?.answers.filter(a => satTmpl?.questions.find((q: Question) => q.id === a.questionId)?.type === 'SCALE') || [];
                                          const sAvg = rSatAnswers.length > 0 ? rSatAnswers.reduce((a, b) => a + (Number(b.score) || 0), 0) / rSatAnswers.length : 0;
                                          
                                          const compTmpl = templateMap.get(comp?.templateId || '');
                                          const rCompAnswers = comp?.answers.filter(a => compTmpl?.questions.find((q: Question) => q.id === a.questionId)?.type === 'SCALE') || [];
                                          const cPre = rCompAnswers.length > 0 ? rCompAnswers.reduce((a, b) => a + (Number(b.preScore) || 0), 0) / rCompAnswers.length : 0;
                                          const cPost = rCompAnswers.length > 0 ? rCompAnswers.reduce((a, b) => a + (Number(b.score) || 0), 0) / rCompAnswers.length : 0;
                                          
                                          const rGain = (cPre > 0 || cPost > 0) && (5 - cPre) > 0 ? (cPost - cPre) / (5 - cPre) : 0;

                                          return `
                                            <tr>
                                              <td>${idx++}</td>
                                              <td style="text-align: left;">${rid}</td>
                                              <td class="success">${sAvg.toFixed(2)}</td>
                                              <td style="color:#64748b;">${cPre.toFixed(2)}</td>
                                              <td class="highlight">${cPost.toFixed(2)}</td>
                                              <td class="highlight">${cPre >= 5 ? 'N/A' : Math.round(rGain * 100) + '%'}</td>
                                            </tr>
                                          `;
                                        });
                                      }).join('')
                                    })()}
                                  </tbody>
                                  <tfoot>
                                    <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
                                      <td colspan="2" style="text-align: center;">전체 가중 평균 성과</td>
                                      <td class="success">${(overallStats?.satAvg || 0).toFixed(2)}</td>
                                      <td>${(overallStats?.preAvg || 0).toFixed(2)}</td>
                                      <td class="highlight">${(overallStats?.postAvg || 0).toFixed(2)}</td>
                                      <td class="highlight">${Math.round((overallStats?.hakeGain || 0) * 100)}%</td>
                                    </tr>
                                  </tfoot>
                                </table>
                                <p style="font-size: 10px; color: #64748b; margin-top: 5px; text-align: left;">
                                  ※ 주석: 사전 역량 평균 (PRE)이 만점(5.00)인 학습자의 개별 향상도는 산출 불가(N/A) 처리하였으며, 전체 향상도는 그룹 전체의 사전/사후 평균 차이를 바탕으로 산출함.
                                </p>
                                <p style="text-align: center; color: #94a3b8; font-size: 10px;">SLI EXPERT ANALYTICS - FINAL INTEGRATED CONSULTING REPORT</p>
                              </body>
                              </html>
                            `;
                            
                            const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `SLI_분석전문가_정밀분석보고서_${format(new Date(), 'yyMMdd')}.doc`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          };
                          exportDOCXContent();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] px-10 h-16 text-lg font-black gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
                      >
                        <FileText className="size-6" /> 교육 전문가 정밀 분석 보고서 다운로드
                      </Button>
                    </div>

                  </div>

                  {/* 교육 전문가 정밀 성과 보고서 섹션 - 핵심 데이터 및 전문가 제언 */}
                  <div className="px-6 pb-20">
                    <Card id="consulting-report-card" className="rounded-[1rem] border border-slate-200 shadow-2xl bg-white text-slate-900 p-20 space-y-16 overflow-hidden relative min-h-[1000px] print:p-10 print:border-none print:shadow-none">
                        <div className="absolute top-0 left-0 w-full h-3 bg-blue-600 print:h-1" />
                        
                        {/* Header Section */}
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b-2 border-slate-100 pb-12">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="size-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg print:size-10">
                                      <Lightbulb className="size-10 text-amber-400 print:size-6" />
                                    </div>
                                    <div className="space-y-1">
                                      <h3 className="text-4xl font-black text-slate-900 tracking-tight print:text-2xl">교육 전문가 정밀 성과 분석 보고서</h3>
                                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">Integrated Strategic Consulting Report</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 bg-slate-50 px-10 py-8 rounded-3xl border border-slate-100 print:py-4 print:px-6">
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">역량 향상도 (Hake&apos;s Gain)</p>
                                    <p className="text-4xl font-black text-blue-600 print:text-2xl">{Math.round((overallStats?.hakeGain || 0) * 100)}%</p>
                                </div>
                                <div className="h-12 w-px bg-slate-200" />
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">사후 역량 평균 (POST)</p>
                                    <p className="text-4xl font-black text-emerald-600 print:text-2xl">{(overallStats?.postAvg || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Chapter 1: 핵심 역량 및 만족도 상세 분석 (Radar Charts) */}
                        <div className="space-y-10">
                          <div className="flex items-center gap-3 border-l-8 border-blue-600 pl-6 py-2">
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded leading-none uppercase tracking-tighter">Chapter 01</span>
                             <h4 className="text-2xl font-black text-slate-900">핵심 역량 및 만족도 상세 분석</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                             <div className="space-y-6">
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl w-fit">
                                   <TargetIcon className="size-4 text-emerald-500" />
                                   <span className="text-xs font-black text-slate-700">운영 만족도 세부 지표</span>
                                </div>
                                <div className="h-80 w-full bg-slate-50/30 rounded-[2rem] border border-slate-100 p-4">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={(() => {
                                      const stats = overallStats;
                                      if (!stats?.themeStats) return [];
                                      return Object.entries(stats.themeStats).map(([theme, s]) => ({
                                        theme, score: Number((s.satAvg || 0).toFixed(2))
                                      })).filter(d => d.score > 0);
                                    })()}>
                                      <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                      <PolarAngleAxis dataKey="theme" tick={<CustomRadarTick />} />
                                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9 }} />
                                      <Radar name="만족도" dataKey="score" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.3}>
                                        <LabelList dataKey="score" position="outside" offset={8} fill="#059669" fontSize={9} fontWeight="900" />
                                      </Radar>
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                             </div>
                             <div className="space-y-6">
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl w-fit">
                                   <Rocket className="size-4 text-blue-500" />
                                   <span className="text-xs font-black text-slate-700">핵심 역량 성장 지표 분석</span>
                                </div>
                                <div className="h-80 w-full bg-slate-50/30 rounded-[2rem] border border-slate-100 p-4">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={(() => {
                                      const stats = overallStats;
                                      if (!stats?.themeStats) return [];
                                      return Object.entries(stats.themeStats).map(([theme, s]) => ({
                                        theme, pre: Number(s.preAvg.toFixed(2)), post: Number(s.postAvg.toFixed(2))
                                      })).filter(d => d.pre > 0 || d.post > 0);
                                    })()}>
                                      <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                      <PolarAngleAxis dataKey="theme" tick={<CustomRadarTick />} />
                                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9 }} />
                                      <Radar name="사후" dataKey="post" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
                                      <Radar name="사전" dataKey="pre" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4" fill="#64748b" fillOpacity={0.1} />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                             </div>
                          </div>
                        </div>

                        {/* Chapter 2: 성과 분석 리포트 및 전문가 핵심 제언 */}
                        <div className="space-y-16">
                          <div className="flex items-center gap-3 border-l-8 border-blue-600 pl-6 py-2">
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded leading-none uppercase tracking-tighter">Chapter 02</span>
                             <h4 className="text-2xl font-black text-slate-900">성과 분석 리포트 및 전문가 핵심 제언</h4>
                          </div>

                          {/* Step 1: 운영 만족도 분석 */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">1</div>
                              <h5 className="text-xl font-black text-slate-800">운영 만족도 및 교육 품질 기조 분석</h5>
                            </div>
                            <article className="p-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                                <p className="text-[16px] font-bold leading-[2.1] text-slate-700 whitespace-pre-wrap">
                                    {overallStats ? ExpertReportGenerator.generateSatisfactionOpinion(
                                        projects.filter(p => selectedProjectIds.includes(p.id) || p.id === (projects.find(p2 => p2.id === selectedProjectIds[0])?.parentId)),
                                        templates?.filter(t => t.type === 'SATISFACTION').flatMap(t => t.questions) || [],
                                        overallStats,
                                        responses.filter(r => selectedProjectIds.includes(r.projectId)).flatMap(r => r.answers.filter(a => a.text).map(a => a.text!))
                                    ) : '데이터 분석 중...'}
                                </p>
                            </article>
                          </div>

                          {/* Step 2: 핵심 역량 진단 */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-black">2</div>
                              <h5 className="text-xl font-black text-slate-800">핵심 성과 역량 성장 진단 (Pre/Post)</h5>
                            </div>
                            <article className="p-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                                <p className="text-[16px] font-bold leading-[2.1] text-slate-700 whitespace-pre-wrap">
                                    {overallStats ? ExpertReportGenerator.generateCompetencyOpinion(
                                        projects.filter(p => selectedProjectIds.includes(p.id) || p.id === (projects.find(p2 => p2.id === selectedProjectIds[0])?.parentId)),
                                        templates?.filter(t => t.type === 'COMPETENCY').flatMap(t => t.questions) || [],
                                        overallStats
                                    ) : '데이터 분석 중...'}
                                </p>
                            </article>
                          </div>

                          {/* Step 3: 전문가 통합 제언 */}
                          <div className="space-y-6">
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-xs">Final</div>
                              <h5 className="text-xl font-black text-slate-800">전문가 최종 성과 총평 및 통합 전략 제언</h5>
                            </div>
                            <article id="consulting-report-content" className="p-12 bg-blue-600/5 rounded-[3rem] border border-blue-100/50">
                                <p className="text-[17px] font-bold leading-[2.2] text-slate-900 whitespace-pre-wrap selection:bg-blue-100">
                                    {overallStats ? ExpertReportGenerator.generateConsultingReport(
                                        projects.filter(p => selectedProjectIds.includes(p.id) || p.id === projects.find(p2 => p2.id === selectedProjectIds[0])?.parentId), 
                                        templates.filter(t => t.type === 'SATISFACTION' || t.type === 'COMPETENCY').flatMap(t => t.questions),
                                        overallStats
                                    ) : '데이터 분석 중...'}
                                </p>
                            </article>
                          </div>
                        </div>

                        {/* Chapter 3: 성과 데이터 상세 별첨 (Appendix) */}
                        <div className="space-y-10 pt-10">
                          <div className="flex items-center gap-3 border-l-8 border-slate-300 pl-6 py-2">
                             <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded leading-none uppercase tracking-tighter">Appendix</span>
                             <h4 className="text-xl font-black text-slate-500">성과 평가 증빙 데이터 및 상세 RAW Data</h4>
                          </div>
                          
                          <div className="space-y-12 shrink-0">
                            {/* 별첨 1: 주요 요약 테이블 */}
                            <div className="space-y-4">
                              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                                <CheckCircle className="size-3 text-blue-600" /> [별첨 1] 프로젝트별 핵심 성과 지표 요약 테이블
                              </p>
                              <div className="rounded-2xl border border-slate-100 overflow-hidden text-[10px]">
                                <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-50">
                                    <tr className="font-black text-slate-500 uppercase">
                                      <th className="p-3 border-r">프로젝트 명칭</th>
                                      <th className="p-3 text-center border-r">운영 만족도 (SAT)</th>
                                      <th className="p-3 text-center border-r">사전 역량 평균 (PRE)</th>
                                      <th className="p-3 text-center border-r">사후 역량 평균 (POST)</th>
                                      <th className="p-3 text-center">역량 향상도 (Hake&apos;s Gain)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {selectedProjectIds.map(pid => {
                                      const p = projects.find(item => item.id === pid);
                                      const stats = aggregatedStats[pid];
                                      if (!p || !stats) return null;
                                      return (
                                        <tr key={pid} className="font-bold text-slate-600">
                                          <td className="p-3 border-r font-black">{p.name}</td>
                                          <td className="p-3 text-center border-r">{stats.satAvg?.toFixed(2)}</td>
                                          <td className="p-3 text-center border-r">{stats.preAvg?.toFixed(2)}</td>
                                          <td className="p-3 text-center border-r">{stats.postAvg?.toFixed(2)}</td>
                                          <td className="p-3 text-center text-blue-600">{stats.preAvg >= 5 ? 'N/A' : Math.round((stats.hakeGain || 0) * 100) + '%'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* 별첨 2: 상세 RAW Data */}
                            <div className="space-y-4">
                              <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                                <CheckCircle className="size-3 text-blue-600" /> [별첨 2] 개별 응답자별 성과 관리 상세 RAW Data
                              </p>
                              <div className="rounded-2xl border border-slate-100 overflow-x-auto bg-white max-h-[500px] print:max-h-none shadow-sm relative">
                                <table className="w-full text-[9px] border-collapse min-w-[600px]">
                                  <thead className="bg-slate-50 sticky top-0 z-20">
                                    <tr className="font-black text-slate-500 border-b">
                                      <th className="p-3 border-r text-center w-12">No.</th>
                                      <th className="p-3 border-r text-left">응답자(ID)</th>
                                      <th className="p-3 border-r text-center">운영 만족도 (SAT)</th>
                                      <th className="p-3 border-r text-center">사전 역량 평균 (PRE)</th>
                                      <th className="p-3 border-r text-center">사후 역량 평균 (POST)</th>
                                      <th className="p-3 border-r text-center">역량 향상도 (Hake&apos;s Gain)</th>
                                      <th className="p-3 text-center w-32">관리</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {(() => {
                                      let idx = 1;
                                      const templateMap = new Map((templates || []).map(t => [t.id, t]));
                                      
                                      const allRowData = selectedProjectIds.flatMap(pid => {
                                        const pResponses = responses.filter(r => r.projectId === pid);
                                        const uniqueRids = Array.from(new Set(pResponses.map(r => r.respondentId || `anon-${r.id.slice(0, 8)}`)))
                                          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                                        return uniqueRids.map(rid => {
                                          const resps = pResponses.filter(r => (r.respondentId || `anon-${r.id.slice(0, 8)}`) === rid);
                                          const sat = resps.find(r => templates.find(t => t.id === r.templateId)?.type === 'SATISFACTION');
                                          const comp = resps.find(r => templates.find(t => t.id === r.templateId)?.type === 'COMPETENCY');

                                          const satTmpl = templateMap.get(sat?.templateId || '');
                                          const rSatAnswers = sat?.answers.filter(a => satTmpl?.questions.find((q: Question) => q.id === a.questionId)?.type === 'SCALE') || [];
                                          const sAvg = rSatAnswers.length > 0 ? rSatAnswers.reduce((a, b) => a + (Number(b.score) || 0), 0) / rSatAnswers.length : 0;
                                          
                                          const compTmpl = templateMap.get(comp?.templateId || '');
                                          const rCompAnswers = comp?.answers.filter(a => compTmpl?.questions.find((q: Question) => q.id === a.questionId)?.type === 'SCALE') || [];
                                          const cPre = rCompAnswers.length > 0 ? rCompAnswers.reduce((a, b) => a + (Number(b.preScore) || 0), 0) / rCompAnswers.length : 0;
                                          const cPost = rCompAnswers.length > 0 ? rCompAnswers.reduce((a, b) => a + (Number(b.score) || 0), 0) / rCompAnswers.length : 0;
                                          const rGain = (cPre > 0 || cPost > 0) && (5 - cPre) > 0 ? (cPost - cPre) / (5 - cPre) : 0;

                                          return { rid, pid, sAvg, cPre, cPost, rGain, sat, comp };
                                        });
                                      }).sort((a, b) => a.rid.localeCompare(b.rid, undefined, { numeric: true, sensitivity: 'base' }));

                                      const totalCount = allRowData.length || 1;
                                      const totalSat = allRowData.reduce((sum, r) => sum + r.sAvg, 0) / totalCount;
                                      const totalPre = allRowData.reduce((sum, r) => sum + r.cPre, 0) / totalCount;
                                      const totalPost = allRowData.reduce((sum, r) => sum + r.cPost, 0) / totalCount;
                                      const totalGain = allRowData.reduce((sum, r) => sum + r.rGain, 0) / totalCount;

                                      return (
                                        <>
                                          {allRowData.map((row, rIdx) => (
                                            <tr key={`${row.pid}-${row.rid}-${rIdx}`} className="text-slate-600 group hover:bg-slate-50 transition-colors">
                                              <td className="p-3 border-r text-center text-slate-400 font-bold">{idx++}</td>
                                              <td className="p-3 border-r font-bold">{row.rid}</td>
                                              <td className="p-3 border-r text-center font-bold text-emerald-600 bg-emerald-50/20">{row.sAvg.toFixed(2)}</td>
                                              <td className="p-3 border-r text-center font-medium text-slate-400">{row.cPre.toFixed(2)}</td>
                                              <td className="p-3 border-r text-center font-black text-blue-600 bg-blue-50/20">{row.cPost.toFixed(2)}</td>
                                              <td className="p-3 border-r text-center text-blue-700 font-bold">{row.cPre >= 5 ? 'N/A' : `${Math.round(row.rGain * 100)}%`}</td>
                                              <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <TooltipProvider>
                                                    {row.sat && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <Button variant="ghost" size="icon" onClick={() => handleEditResponse(row.sat!)} className="size-7 rounded-lg hover:bg-emerald-50 text-emerald-600">
                                                            <Edit className="size-3.5" />
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>만족도 수정</TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                    {row.comp && (
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <Button variant="ghost" size="icon" onClick={() => handleEditResponse(row.comp!)} className="size-7 rounded-lg hover:bg-blue-50 text-blue-600">
                                                            <Edit className="size-3.5" />
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>역량 수정</TooltipContent>
                                                      </Tooltip>
                                                    )}
                                                    <Tooltip>
                                                      <TooltipTrigger>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRespondent(row.rid, row.pid)} className="size-7 rounded-lg hover:bg-red-50 text-red-400">
                                                          <Trash2 className="size-3.5" />
                                                        </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>전체 삭제</TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                          <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-700 sticky bottom-0 z-20">
                                            <td colSpan={2} className="p-4 text-right bg-slate-800 pr-8 text-[11px] uppercase tracking-widest text-slate-400">전체 가중 평균 성과</td>
                                            <td className="p-4 text-center text-emerald-400 text-xs">{totalSat.toFixed(2)}</td>
                                            <td className="p-4 text-center text-slate-400 text-xs">{totalPre.toFixed(2)}</td>
                                            <td className="p-4 text-center text-blue-400 text-xs">{totalPost.toFixed(2)}</td>
                                            <td className="p-4 text-center text-blue-300 text-xs">{Math.round(totalGain * 100)}%</td>
                                            <td className="bg-slate-800" />
                                          </tr>
                                        </>
                                      );
                                    })()}
                                  </tbody>
                                </table>
                              </div>

                               {/* 성과 지표 요약 카드 */}
                               <div className="grid grid-cols-4 gap-4 mt-6">
                                 <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 flex flex-col gap-2 shadow-sm">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter flex items-center gap-1.5">
                                       <Activity className="size-3" /> 운영 만족도 (AVG)
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                       <span className="text-3xl font-black text-slate-900">{(overallStats?.satAvg || 0).toFixed(2)}</span>
                                       <span className="text-xs font-bold text-slate-400">/ 5.00</span>
                                    </div>
                                 </div>
                                 <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 flex flex-col gap-2 shadow-sm">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter flex items-center gap-1.5">
                                       <TrendingUp className="size-3" /> 역량 향상도 (Hake&apos;s Gain)
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                       <span className="text-3xl font-black text-emerald-600">{Math.round((overallStats?.hakeGain || 0) * 100)}%</span>
                                       <span className="text-[10px] font-bold text-slate-400 ml-1 italic">{overallStats?.hakeGain >= 0.7 ? 'Excellent' : overallStats?.hakeGain >= 0.3 ? 'Good' : 'Needs Focus'}</span>
                                    </div>
                                 </div>
                                 <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 flex flex-col gap-2 shadow-sm">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-tighter flex items-center gap-1.5">
                                       <TargetIcon className="size-3" /> 통계적 효과크기 (Cohen&apos;s D)
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                       <span className="text-3xl font-black text-amber-600">{(overallStats?.cohensD || 0).toFixed(2)}</span>
                                       <span className="text-[10px] font-bold text-slate-400 ml-1 italic">{(overallStats?.cohensD || 0) >= 0.8 ? 'Significant' : 'Moderate'}</span>
                                    </div>
                                 </div>
                                 <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 flex flex-col gap-2 shadow-sm">
                                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-tighter flex items-center gap-1.5">
                                       <Activity className="size-3" /> 통계적 유의확률 (p-value)
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                       <span className="text-3xl font-black text-purple-600">
                                         {(overallStats?.pValue || 1) < 0.001 ? '< .01' : (overallStats?.pValue || 1).toFixed(3)}
                                       </span>
                                       <span className="text-[10px] font-bold text-slate-400 ml-1 italic">{(overallStats?.pValue || 1) < 0.05 ? 'Valid' : 'Not Significant'}</span>
                                    </div>
                                 </div>
                               </div>
                               <p className="mt-2 text-[10px] font-bold text-slate-400">
                                 ※ 주석: 사전 역량 평균 (PRE)이 만점(5.00)인 학습자의 개별 향상도는 산출 불가(N/A) 처리하였으며, 전체 향상도는 그룹 전체의 사전/사후 평균 차이를 바탕으로 산출함.
                               </p>
                             </div>
                           </div>
                         </div>

                        <div className="relative z-10 flex justify-center pt-8 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold font-mono">
                                <Activity className="size-3.5" />
                                <span>SLI EXPERT ANALYTICS - FINAL INTEGRATED CONSULTING REPORT</span>
                            </div>
                        </div>
                    </Card>
                  </div>
                </div>
              )}
      </main>

      <Dialog open={deleteConfirm.open} onOpenChange={(o) => setDeleteConfirm(p => ({...p, open: o}))}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-12 bg-white shadow-3xl">
          <DialogHeader className="space-y-4">
            <div className="size-16 rounded-3xl bg-red-50 flex items-center justify-center mb-2 mx-auto">
              <AlertCircle className="size-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-slate-900">{deleteConfirm.title}</DialogTitle>
            <DialogDescription className="text-sm font-bold text-center text-slate-500 leading-relaxed font-mono">
              {deleteConfirm.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-4 pt-8">
            <Button variant="ghost" onClick={() => setDeleteConfirm(p => ({...p, open: false}))} className="flex-1 h-14 rounded-2xl font-black text-slate-400">취소</Button>
            <Button onClick={deleteConfirm.onConfirm} className="flex-1 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-100">데이터 삭제하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-10 bg-white shadow-3xl">
          <DialogHeader><DialogTitle className="text-2xl font-black">응답 데이터 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
             {editingResponse?.answers.map((ans, idx) => {
               const tmpl = templates.find(t => t.id === editingResponse.templateId);
               const question = tmpl?.questions.find(q => q.id === ans.questionId);
               return (
                <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className="text-[10px] font-black bg-white">{tmpl?.type === 'SATISFACTION' ? '만족도' : '역량 평가'} {idx + 1}</Badge>
                        <span className="text-[10px] font-bold text-slate-400">{question?.theme}</span>
                    </div>
                    <p className="text-sm font-black text-slate-700 leading-relaxed">{question?.content || '평가 문항 정보가 없습니다.'}</p>
                    <div className="flex gap-4">
                      {ans?.preScore !== undefined && (
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1 uppercase">Pre (사전)</label>
                          <Input type="number" min="0" max="100" value={ans?.preScore} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, preScore: Number(e.target.value)}:a)})} className="bg-white rounded-xl h-11 border-none shadow-sm font-bold" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 ml-1 uppercase">{ans?.preScore !== undefined ? 'Post (사후)' : '점수 (SCORE)'}</label>
                        <Input type="number" min="0" max="100" value={ans?.score} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, score: Number(e.target.value)}:a)})} className="bg-white rounded-xl h-11 border-none shadow-sm font-bold" />
                      </div>
                    </div>
                </div>
               );
             })}
          </div>

          <DialogFooter className="pt-6"><Button onClick={async () => { if(editingResponse) { await updateResponse(editingResponse.id, editingResponse); await fetchSurveys(); setIsEditDialogOpen(false); alert('수정되었습니다.'); } }} className="bg-blue-600 text-white px-10 rounded-xl font-black">저장</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-12 bg-white shadow-3xl">
           <DialogHeader><DialogTitle className="text-3xl font-black">대량 응답 데이터 붙여넣기</DialogTitle></DialogHeader>
           <Textarea value={pasteContent} onChange={(e)=>setPasteContent(e.target.value)} placeholder="응답자ID\t점수1\t점수2..." className="min-h-[300px] rounded-2xl bg-slate-50 border-none font-mono text-xs p-6" />
           <DialogFooter className="pt-8 flex gap-4">
             <Button 
               onClick={() => handlePasteProcess(true)} 
               variant="outline"
               size="lg" 
               disabled={isProcessing}
               className="flex-1 h-14 border-2 border-red-100 text-red-500 hover:bg-red-50 rounded-2xl font-black gap-2 transition-all"
             >
               기존 데이터 초기화 후 새로 등록
             </Button>
             <Button 
               onClick={() => handlePasteProcess(false)} 
               size="lg" 
               disabled={isProcessing}
               className="flex-[2] h-14 bg-blue-600 text-white px-12 rounded-2xl font-black gap-2 transition-all shadow-lg shadow-blue-100"
             >
               {isProcessing ? (
                 <>
                   <RefreshCcw className="size-4 animate-spin" /> 데이터 처리 중...
                 </>
               ) : '응답 데이터 분석 및 자동 등록'}
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
