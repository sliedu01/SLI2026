'use client';

import * as React from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  Settings2,
  Table as TableIcon,
  Wand2,
  ArrowRight,
  TrendingUp,
  Zap,
  ArrowUpDown,
  Users,
  MessageSquare,
  Activity,
  Download, 
  Check, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  BarChart2,
  PieChart as PieChartIcon,
  Edit,
  Info,
  Scale,
  ChevronRight,
  ChevronDown,
  Layers,
  FileBarChart,
  Target,
  CheckCircle,
  Target as TargetIcon,
  Search,
  Calendar,
  Sigma,
  Calculator,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  Rocket
} from 'lucide-react';

import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from 'components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from 'components/ui/input';
import { Badge } from 'components/ui/badge';
import { Textarea } from 'components/ui/textarea';
import { Separator } from 'components/ui/separator';
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from 'components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useProjectStore } from 'store/use-project-store';
import { useSurveyStore, SurveyTemplate, SurveyResponse, Answer, Question, SurveyType } from 'store/use-survey-store';
import { usePartnerStore } from 'store/use-partner-store';
import { cn } from 'lib/utils';
import { 
  ExpertReportGenerator,
  calculateHakeGain,
  calculateCohensD,
  calculatePairedTTest,
  getPValueFromT
} from 'lib/stat-utils';

// Charts
import { 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  Line,
  ComposedChart,
  CartesianGrid,
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Legend,
  Tooltip as ChartTooltip,
  LabelList
} from 'recharts';

export default function SurveysPage() {
  const [mounted, setMounted] = React.useState(false);
  const { projects, fetchProjects } = useProjectStore();
  const { 
    templates, 
    responses, 
    fetchSurveys,
    addTemplate, 
    updateTemplate,
    deleteTemplate,
    addResponse,
    clearProjectResponses,
    getAggregatedStats,
    createDefaultQuestions,
    updateResponse,
    deleteResponse
  } = useSurveyStore();
  const { partners, fetchPartners } = usePartnerStore();

  const [activeTab, setActiveTab] = React.useState('data');
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
  const [dataDateRange, setDataDateRange] = React.useState({ start: '', end: new Date().toISOString().split('T')[0] });
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = React.useState(false);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [expandedTableIds, setExpandedTableIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
  
  const [surveyType, setSurveyType] = React.useState<SurveyType>('UNIFIED');

  const selectionPath = React.useMemo(() => {
    if (selectedProjectIds.length === 0) return '대상을 선택하세요...';
    if (selectedProjectIds.length === 1) {
      const path: string[] = [];
      let curr = projects.find(p => p.id === selectedProjectIds[0]);
      while (curr) {
        path.unshift(curr.name);
        curr = projects.find(p => p.id === curr?.parentId);
      }
      return path.join(' > ');
    }
    return `${selectedProjectIds.length}개의 사업/프로그램 선택됨`;
  }, [selectedProjectIds, projects]);

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
  }, [selectedProjectIds, responses, templates]);
  
  const satTmpl = projectTemplates.sat[0];
  const compTmpl = projectTemplates.comp[0];
  const satQuestions = satTmpl?.questions.filter(q => q.type === 'SCALE') || [];
  const satTextQuestions = satTmpl?.questions.filter(q => q.type === 'TEXT') || [];
  const compQuestions = compTmpl?.questions.filter(q => q.type === 'SCALE') || [];

  const aggregatedStats = getAggregatedStats(projects, selectedProjectIds.length > 0 ? selectedProjectIds : undefined, undefined, 'UNIFIED');
  const overallStats = aggregatedStats['_overall'];

  // 지표별 상세 설명 상수 (15년차 컨설턴트 관점)
  const metricGuides = {
    satAvg: {
      title: "만족도 평균 (Satisfaction Score)",
      formula: "평균 = (각 문항 점수의 합) / 문항 수",
      criteria: "4.5↑ 매우우수 | 4.0↑ 우수 | 3.5↑ 보통 | 3.0↑ 미흡 | 3.0↓ 매우미흡",
      effect: "교육 과정의 매력도, 진행 적절성, 강사 만족도 등 전반적인 학습 경험의 질을 측정함."
    },
    gain: {
      title: "역량 향상도 (Hake's Gain %)",
      formula: "G = (사후 - 사전) / (최대점수 - 사전) × 100",
      criteria: "70%↑ 고성과(High) | 30~70% 중성과(Medium) | 30%↓ 저성과(Low)",
      effect: "학습자가 교육을 통해 잠재적 성장 가능성을 얼마나 실제 역량으로 전환시켰는지 측정하는 핵심 지표."
    },
    cohensD: {
      title: "효과 크기 (Cohen's d)",
      formula: "d = (사후평균 - 사전평균) / 통합표준편차",
      criteria: "0.8↑ 강력한 효과(Large) | 0.5↑ 중간 효과(Medium) | 0.2↑ 낮은 효과(Small)",
      effect: "표본 크기와 관계없이 교육 프로그램이 학습자에게 준 실질적인 '충격'과 '변화의 강도'를 의미함."
    },
    pValue: {
      title: "통계적 유의성 (p-value)",
      formula: "대응표본 t-검정 (Paired t-test) 유의확률",
      criteria: "0.05↓ 통계적으로 유의미함 | 0.01↓ 매우 유의미함",
      effect: "관찰된 역량 변화가 우연이 아닌 프로그램의 효과일 확률을 과학적으로 신뢰할 수 있는지 검증함."
    }
  };

  
  const visibleProjectIds = React.useMemo(() => {
    const start = dataDateRange.start;
    const end = dataDateRange.end;
    const set = new Set<string>();
    projects.forEach(p => {
      if (!start || !end || (p.startDate >= start && p.startDate <= end) || (p.endDate >= start && p.endDate <= end)) {
        let curr: (typeof p) | undefined = p;
        while (curr) { 
          set.add(curr.id); 
          curr = projects.find(parent => parent.id === curr?.parentId); 
        }
      }
    });
    return set;
  }, [projects, dataDateRange]);

  const renderNodes = React.useCallback((parentId: string | null, depth: number = 0): React.ReactNode => {
    const filteredRows = projects.filter(p => p.parentId === parentId && visibleProjectIds.has(p.id));
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
                  "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                  isSelected ? "bg-blue-600 text-white shadow-md lg:scale-[1.02]" : "hover:bg-slate-50 text-slate-600"
                )}
                style={{ marginLeft: `${depth * 1.5}rem` }}
              >
                <div className="size-5 flex items-center justify-center shrink-0">
                  <Checkbox 
                    checked={isSelected}
                    onChange={() => handleToggle(p.id, isSelected)}
                    className={cn("size-4 rounded border-2 transition-colors", isSelected ? "border-white bg-white" : "border-slate-200 group-hover:border-blue-400 bg-white")}
                  />
                </div>
                {hasVisibleChildren ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(p.id, e); }} className={cn("p-1 rounded hover:bg-white/20", isSelected ? "text-white" : "text-slate-400")}>
                    {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : <div className="size-5.5 ml-1" />}
                {p.level >= 3 ? (
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400/80 uppercase tracking-tighter">
                      <span>{p.startDate} ~ {p.endDate}</span>
                      {p.location && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="text-blue-500/70">{p.location}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs font-black truncate">
                      {p.partnerId ? `${partners.find(ptr => ptr.id === p.partnerId)?.name || '미지정'} (${p.name})` : p.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-black truncate">{p.name}</span>
                )}
              </div>
              {isExpanded && hasVisibleChildren && renderNodes(p.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }, [projects, visibleProjectIds, expandedIds, selectedProjectIds, partners, toggleExpand]);

  React.useEffect(() => {
    setMounted(true);
    fetchSurveys(); fetchProjects(); fetchPartners();
  }, []);

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
      division: type === 'SCALE' ? '신규 구분' : '종합 의견',
      theme: type === 'SCALE' ? '신규 주제' : '주관식 제언',
      content: type === 'SCALE' ? '신규 문항 내용을 입력하세요' : '자유로운 의견을 입력해 주세요.',
      type,
      order: editingTemplate.questions.length + 1
    };
    setEditingTemplate({
      ...editingTemplate,
      questions: [...editingTemplate.questions, newQ]
    });
  };

  if (!mounted) return null;

  const handlePasteProcess = async () => {
    const targetId = selectedProjectIds[0];
    if (!pasteContent.trim() || !targetId) { alert('대상 프로그램을 선택해주세요.'); return; }
    const rows = pasteContent.trim().split('\n');
    try {
      for (const row of rows) {
        const cols = row.split('\t').map(c => c.trim());
        if (cols.length < 2) continue;
        const respondentName = cols[0];
        let currentIdx = 1;
        if (satTmpl) {
          const satAnswers = satTmpl.questions.map(q => ({ questionId: q.id, score: Number(cols[currentIdx++]) || 0 }));
          await addResponse({ projectId: targetId, templateId: satTmpl.id, respondentId: respondentName, answers: satAnswers });
        }
        if (compTmpl) {
          const compAnswers = compTmpl.questions.map(q => ({ questionId: q.id, preScore: Number(cols[currentIdx++]) || 0, score: Number(cols[currentIdx++]) || 0 }));
          await addResponse({ projectId: targetId, templateId: compTmpl.id, respondentId: respondentName, answers: compAnswers });
        }
      }
      setPasteContent(''); setIsPasteDialogOpen(false); await fetchSurveys(); alert('데이터 연동 완료');
    } catch (err: unknown) { 
      const message = err instanceof Error ? err.message : '데이터 형식을 확인해주세요.';
      alert(`오류 발생: ${message}`); 
    }
  };


  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3"><ClipboardCheck className="size-8 text-blue-600" /> 통합 성과 및 설문 관리</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">Expert Analytics System</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          {[{ id: 'templates', label: '디자인', icon: Settings2 }, { id: 'data', label: '성과 대시보드', icon: BarChart3 }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2", activeTab === tab.id ? "bg-white text-blue-600 shadow-lg" : "text-slate-500 hover:text-slate-700")}><tab.icon className="size-3.5" /> {tab.label}</button>
          ))}
        </div>
      </div>

      {activeTab === 'data' && overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-1000">
           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 space-y-2">
              <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-black uppercase tracking-widest">만족도 평균</span><PieChartIcon className="size-4" /></div>
              <div className="text-4xl font-black">{overallStats.satAvg.toFixed(2)}</div>
              <p className="text-[10px] font-bold opacity-70">전체 응답 {overallStats.count.toFixed(2)}건 기준</p>
           </Card>
           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 space-y-2">
              <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-black uppercase tracking-widest">역량 향상도 (Gain %)</span><TrendingUp className="size-4" /></div>
              <div className="text-4xl font-black">{(overallStats.hakeGain * 100).toFixed(1)}%</div>
              <div className="flex items-center gap-2">
                 <Badge className={cn("text-[9px] border-none", overallStats.hakeGain >= 0.7 ? "bg-white text-blue-600" : "bg-blue-400/30 text-white")}>
                   {overallStats.hakeGain >= 0.7 ? '높은 성과' : overallStats.hakeGain >= 0.3 ? '중간 성과' : '보통'}
                 </Badge>
              </div>
           </Card>
           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 space-y-2">
              <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-black uppercase tracking-widest">성과 크기 (Effect Size)</span><BarChart2 className="size-4" /></div>
              <div className="text-4xl font-black">{overallStats.cohensD.toFixed(2)}</div>
              <p className="text-[10px] font-bold opacity-70">Cohen&apos;s d 지표 (0.8 이상 강력)</p>
           </Card>
           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 space-y-2">
              <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-black uppercase tracking-widest">통계적 유의성</span><CheckCircle2 className="size-4" /></div>
              <div className="text-4xl font-black">{overallStats.pValue < 0.001 ? '< .01' : overallStats.pValue.toFixed(2)}</div>
              <Badge className={cn("text-[9px] border-none", overallStats.pValue < 0.05 ? "bg-white text-purple-600" : "bg-purple-400/30 text-white")}>
                 {overallStats.pValue < 0.05 ? '유의미한 변화' : '유의미하지 않음'}
              </Badge>
           </Card>
        </div>
      )}


      <main className="min-h-[700px]">
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-[2rem] border-none shadow-xl bg-white sticky top-10">
                   <CardHeader><CardTitle className="text-lg font-black flex justify-between items-center">템플릿 레지스트리 <Plus className="size-4 cursor-pointer" onClick={() => addTemplate({ name: '신규 조사', type: 'SATISFACTION', questions: createDefaultQuestions('SATISFACTION') })} /></CardTitle></CardHeader>
                   <CardContent className="space-y-6">
                      {['SATISFACTION', 'COMPETENCY'].map(type => (
                        <div key={type} className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                            {type === 'SATISFACTION' ? '교육 만족도' : '역량 진단'}
                            {type === 'SATISFACTION' && templates.filter(t => t.type === 'SATISFACTION').length === 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => addTemplate({ name: '기본 교육 만족도 조사', type: 'SATISFACTION', questions: createDefaultQuestions('SATISFACTION') })}
                                className="h-6 text-[9px] font-black text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-blue-50/50 rounded-lg px-2"
                              >
                                <Wand2 className="size-2 mr-1" /> 기본 복구
                              </Button>
                            )}
                          </label>
                          <div className="space-y-2">
                            {templates.filter(t => t.type === type).map(t => (
                              <div key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={cn("p-4 rounded-2xl cursor-pointer border transition-all group relative", selectedTemplateId === t.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100")}><p className="text-sm font-black truncate">{t.name}</p><Button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, title: "템플릿 삭제", description: "이 템플릿과 연결된 모든 데이터가 영향을 받을 수 있습니다. 계속하시겠습니까?", onConfirm: async () => { await deleteTemplate(t.id); setDeleteConfirm(p => ({...p, open: false})); } }); }} variant="ghost" size="icon" className="absolute top-2 right-2 text-white/40 hover:text-white opacity-0 group-hover:opacity-100"><Trash2 className="size-3" /></Button></div>
                            ))}
                          </div>
                        </div>
                      ))}
                   </CardContent>
                </Card>
             </div>
             <div className="lg:col-span-3">
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                    <CardHeader className="p-10 border-b border-slate-50 flex items-center justify-between">
                       <Input value={editingTemplate?.name || ''} onChange={(e) => setEditingTemplate(p => p ? {...p, name: e.target.value} : null)} className="text-2xl font-black bg-transparent border-none p-0 focus-visible:ring-0 w-1/2" />
                       <Button onClick={async () => { if(editingTemplate) { await updateTemplate(editingTemplate.id, { name: editingTemplate.name, questions: editingTemplate.questions }); alert('저장됨'); } }} className="rounded-xl h-12 px-8 bg-blue-600 text-white font-black">저장</Button>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-100">
                       {editingTemplate?.questions.map((q, idx) => (
                         <div key={q.id} className="p-8 group hover:bg-slate-50/50 transition-all flex gap-6">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 font-black text-xs text-slate-400">{idx+1}</div>
                            <div className="flex-1 grid grid-cols-3 gap-4">
                               <Input value={q.division} onChange={(e) => handleUpdateQuestion(q.id, 'division', e.target.value)} className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                               <Input value={q.theme} onChange={(e) => handleUpdateQuestion(q.id, 'theme', e.target.value)} className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                               <Input value={q.content} onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)} className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                            </div>
                            <Button onClick={() => setEditingTemplate(p => p ? {...p, questions: p.questions.filter(qu => qu.id !== q.id)} : null)} variant="ghost" size="icon" className="text-slate-200 hover:text-red-500"><Trash2 className="size-4" /></Button>
                         </div>
                       ))}
                       <div className="p-10 flex justify-center gap-4">
                         <Button onClick={() => handleAddQuestion('SCALE')} variant="outline" className="h-12 border-dashed border-2 px-8 rounded-xl font-black text-blue-600 hover:bg-blue-50 transition-all">+ 객관식 문항 추가</Button>
                         <Button onClick={() => handleAddQuestion('TEXT')} variant="outline" className="h-12 border-dashed border-2 px-8 rounded-xl font-black text-slate-600 hover:bg-slate-50 transition-all">+ 주관식 문항 추가</Button>
                       </div>
                    </CardContent>
                </Card>
             </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5">

              {/* 상단 분석 대상 선택 퀵 위젯 */}
              <div className="flex flex-wrap gap-3 px-2">
                <div className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl mr-2">
                  <TargetIcon className="size-4" />
                  <span className="text-xs font-black">분석 리포트 대상 구성</span>
                </div>
                {projects.filter(p => selectedProjectIds.includes(p.id) && p.level === 4).map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl group hover:bg-white hover:shadow-md transition-all">
                    <Checkbox 
                      checked={true}
                      onChange={() => setSelectedProjectIds(prev => prev.filter(id => id !== p.id))}
                      className="size-3.5"
                    />
                    <span className="text-[11px] font-black text-slate-700">{p.name}</span>
                    <button onClick={() => setSelectedProjectIds(prev => prev.filter(id => id !== p.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
                {selectedProjectIds.length === 0 && (
                  <div className="text-xs font-bold text-slate-400 py-2">상단 사업 탐색기에서 분석할 사업을 선택해 주세요.</div>
                )}
              </div>

             <div className="flex flex-wrap items-end gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-visible">
                  <div className="flex gap-4 min-w-[320px]">
                    <div className="flex-1 space-y-1"><label className="text-[10px] font-black text-slate-400">시작일</label><Input type="date" value={dataDateRange.start} onChange={(e)=>setDataDateRange(p=>({...p, start:e.target.value}))} className="h-12 bg-slate-50 border-none rounded-xl font-bold" /></div>
                    <div className="flex-1 space-y-1"><label className="text-[10px] font-black text-slate-400">종료일</label><Input type="date" value={dataDateRange.end} onChange={(e)=>setDataDateRange(p=>({...p, end:e.target.value}))} className="h-12 bg-slate-50 border-none rounded-xl font-bold" /></div>
                  </div>
                  <div className="space-y-1 flex-1 min-w-[400px]">
                     <label className="text-[10px] font-black text-slate-400">사업 탐색기</label>
                     <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                        <PopoverTrigger render={<Button variant="outline" className="w-full h-12 justify-start px-4 rounded-xl font-black text-sm gap-3 bg-slate-50 border-none"><Layers className="size-4 text-blue-500" /> {selectionPath} <ChevronDown className="size-4 ml-auto opacity-50" /></Button>} />
                        <PopoverContent className="w-[480px] p-0 rounded-[2rem] shadow-2xl bg-white"><div className="p-6 border-b font-black text-sm">사업 다중 선택</div><div className="p-4 max-h-[500px] overflow-y-auto">{renderNodes(null)}</div></PopoverContent>
                     </Popover>
                  </div>
                  <div className="flex gap-4 ml-auto h-12 items-center">
                    <Button variant="outline" onClick={()=>setIsPasteDialogOpen(true)} className="h-full px-8 rounded-xl border-blue-100 text-blue-600 font-black"><FileSpreadsheet className="size-4 mr-2" /> 엑셀 RAW 연동</Button>
                    <Button onClick={async ()=>{setDeleteConfirm({ open: true, title: "데이터 초기화", description: `선택된 {selectedProjectIds.length}개 사업의 모든 응답 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`, onConfirm: async () => { await Promise.all(selectedProjectIds.map(id=>clearProjectResponses(id))); await fetchSurveys(); setDeleteConfirm(p => ({...p, open: false})); alert("삭제 완료"); } })}} variant="outline" className="h-full px-6 rounded-xl text-red-500"><Trash2 className="size-4" /></Button>
                  </div>
             </div>

             <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <TooltipProvider delay={0}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                            <th className="p-6 text-left sticky left-0 z-40 bg-white/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r min-w-[300px]">탐색 항목 / 학습자</th>
                            {satQuestions.map((q, idx) => (
                              <th key={q.id} className="p-2 text-center w-16 min-min-w-[64px]"><Tooltip><TooltipTrigger className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg flex flex-col items-center w-full leading-tight font-black">Q{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-4 rounded-xl">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                            {satTextQuestions.map((q, idx) => (
                              <th key={q.id} className="p-2 text-center w-28 min-w-[110px]"><Tooltip><TooltipTrigger className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg flex flex-col items-center w-full leading-tight font-black">TX{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-4 rounded-xl">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                             <th className="p-4 text-center bg-emerald-50 text-[10px] w-20 text-emerald-700 font-black">
                               <Tooltip>
                                 <TooltipTrigger className="cursor-help uppercase">만족도 평균</TooltipTrigger>
                                 <TooltipContent className="p-5 bg-slate-900 text-white rounded-[1.5rem] border-none shadow-2xl space-y-3 min-w-[280px]">
                                   <p className="text-emerald-400 font-black text-sm">{metricGuides.satAvg.title}</p>
                                   <div className="space-y-2 text-[11px] opacity-90 leading-relaxed font-medium">
                                     <p><span className="text-white font-black">[산식]</span> {metricGuides.satAvg.formula}</p>
                                     <p><span className="text-white font-black">[기준]</span> {metricGuides.satAvg.criteria}</p>
                                     <p><span className="text-white font-black">[기대효과]</span> {metricGuides.satAvg.effect}</p>
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             </th>
                            {compQuestions.map((q, idx) => (
                              <th key={q.id} className="p-2 text-center w-16 min-min-w-[64px]"><Tooltip><TooltipTrigger className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg flex flex-col items-center w-full leading-tight font-black">Q{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-4 rounded-xl">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                            <th className="p-4 text-center bg-blue-50 text-[10px] w-20 text-blue-700 font-black">역량 평균</th>
                             <th className="p-4 text-center bg-emerald-50/50 text-emerald-700 font-black text-[10px]">
                               <Tooltip>
                                 <TooltipTrigger className="cursor-help uppercase">Gain %</TooltipTrigger>
                                 <TooltipContent className="p-5 bg-slate-900 text-white rounded-[1.5rem] border-none shadow-2xl space-y-3 min-w-[280px]">
                                   <p className="text-blue-400 font-black text-sm">{metricGuides.gain.title}</p>
                                   <div className="space-y-2 text-[11px] opacity-90 leading-relaxed font-medium">
                                     <p><span className="text-white font-black">[산식]</span> {metricGuides.gain.formula}</p>
                                     <p><span className="text-white font-black">[기준]</span> {metricGuides.gain.criteria}</p>
                                     <p><span className="text-white font-black">[기대효과]</span> {metricGuides.gain.effect}</p>
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             </th>
                             <th className="p-4 text-center bg-amber-50/50 text-amber-700 font-black text-[10px]">
                               <Tooltip>
                                 <TooltipTrigger className="cursor-help uppercase">Cohen&apos;s d</TooltipTrigger>
                                 <TooltipContent className="p-5 bg-slate-900 text-white rounded-[1.5rem] border-none shadow-2xl space-y-3 min-w-[280px]">
                                   <p className="text-amber-400 font-black text-sm">{metricGuides.cohensD.title}</p>
                                   <div className="space-y-2 text-[11px] opacity-90 leading-relaxed font-medium">
                                     <p><span className="text-white font-black">[산식]</span> {metricGuides.cohensD.formula}</p>
                                     <p><span className="text-white font-black">[기준]</span> {metricGuides.cohensD.criteria}</p>
                                     <p><span className="text-white font-black">[기대효과]</span> {metricGuides.cohensD.effect}</p>
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             </th>
                             <th className="p-4 text-center bg-purple-50/50 text-purple-700 font-black text-[10px]">
                               <Tooltip>
                                 <TooltipTrigger className="cursor-help uppercase">t-test</TooltipTrigger>
                                 <TooltipContent className="p-5 bg-slate-900 text-white rounded-[1.5rem] border-none shadow-2xl space-y-3 min-w-[280px]">
                                   <p className="text-purple-400 font-black text-sm">{metricGuides.pValue.title}</p>
                                   <div className="space-y-2 text-[11px] opacity-90 leading-relaxed font-medium">
                                     <p><span className="text-white font-black">[산식]</span> {metricGuides.pValue.formula}</p>
                                     <p><span className="text-white font-black">[기준]</span> {metricGuides.pValue.criteria}</p>
                                     <p><span className="text-white font-black">[기대효과]</span> {metricGuides.pValue.effect}</p>
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             </th>
                            <th className="p-6 text-center">관리</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(() => {
                            const rootProjects = projects.filter(p => p.level === 1 && visibleProjectIds.has(p.id));
                            let filteredRoots = rootProjects;
                            if (selectedProjectIds.length > 0) {
                              const ancestors = new Set<string>();
                              selectedProjectIds.forEach(id => {
                                let curr = projects.find(p => p.id === id);
                                while(curr) { ancestors.add(curr.id); curr = projects.find(p => p.id === curr?.parentId); }
                              });
                              filteredRoots = rootProjects.filter(p => ancestors.has(p.id));
                            }
                            
                            const renderTree = (rows: typeof projects, depth = 0): React.ReactNode[] => {
                              return rows.map(p => {
                                const isExpanded = expandedTableIds.has(p.id);
                                const hasChildren = projects.some(c => c.parentId === p.id);
                                const pResponses = responses.filter(r => r.projectId === p.id);
                                const stats = aggregatedStats[p.id];
                                const childRows = projects.filter(c => c.parentId === p.id && visibleProjectIds.has(c.id));
                                return (
                                  <React.Fragment key={p.id}>
                                    <tr onClick={() => toggleTableExpand(p.id)} className={cn("border-b transition-colors group cursor-pointer", depth === 0 ? "bg-slate-50/50" : "bg-transparent", "hover:bg-blue-50/40")}>
                                      <td className="p-4 sticky left-0 z-20 bg-white group-hover:bg-blue-50/40 transition-colors border-r min-w-[300px]">
                                        <div className="flex items-center gap-3" style={{ paddingLeft: `${depth * 1}rem` }}>
                                          {(hasChildren || p.level === 4) && (
                                            <button className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                                              {isExpanded ? <ChevronDown className="size-3 text-slate-400" /> : <ChevronRight className="size-3 text-slate-400" />}
                                            </button>
                                          )}
                                          <span className="text-[11px] font-black text-slate-900 truncate">
                                            {p.level >= 3 && p.partnerId ? `{partners.find(ptr => ptr.id === p.partnerId)?.name || '협력사'} ({p.name})` : p.name}
                                          </span>
                                        </div>
                                      </td>
                                      {satQuestions.map((_, i) => <td key={i} className="p-4 text-center font-black text-[10px] text-emerald-600/60">{stats?.questionStats?.[i]?.average?.toFixed(2) || '-'}</td>)}
                                      {satTextQuestions.map((_, i) => <td key={i} className="p-4 text-center text-[9px] text-slate-300 italic border-r">SUMMARY</td>)}
                                      <td className="p-4 text-center font-black text-xs bg-emerald-50/30 text-blue-700">{stats?.satAvg?.toFixed(2) || "-"}</td>
                                      {compQuestions.map((_, i) => (
                                        <td key={i} className="p-4 text-center font-black text-[10px] text-blue-600/60">
                                          <div className="flex flex-col">
                                            <span>{stats?.questionStats?.[i]?.postAvg?.toFixed(2) || '-'}</span>
                                            {stats?.questionStats?.[i]?.impRate !== undefined && (
                                              <Tooltip>
                                                <TooltipTrigger className={cn("text-[7px] font-bold cursor-help", stats.questionStats[i].impRate >= 0 ? "text-blue-500" : "text-red-500")}>
                                                  {stats.questionStats[i].impRate >= 0 ? '+' : ''}{stats.questionStats[i].impRate.toFixed(2)}%
                                                </TooltipTrigger>
                                                <TooltipContent className="p-3 bg-white border-slate-100 shadow-xl rounded-xl">
                                                  <div className="text-[10px] space-y-1">
                                                    <p className="font-black text-blue-600 underline underline-offset-2">문항 역량 향상률 분석</p>
                                                    <p className="text-slate-500 font-bold">[(사후 평균 - 사전 평균) / 사전 평균] × 100</p>
                                                    <p className="text-slate-700 font-black pt-1 border-t border-slate-100 italic">
                                                      {"\"해당 문항에서 사전 대비 사후 역량이 " + stats.questionStats[i].impRate.toFixed(2) + "% " + (stats.questionStats[i].impRate >= 0 ? "향상" : "하락") + "된 결과를 보였습니다.\""}
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
                                              <TooltipTrigger className={cn("text-[8px] font-black cursor-help", stats.impRate >= 0 ? "text-blue-700" : "text-red-600")}>
                                                {stats.impRate >= 0 ? '+' : ''}{stats.impRate.toFixed(2)}%
                                              </TooltipTrigger>
                                              <TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl">
                                                <div className="text-[11px] space-y-1.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <TrendingUp className="size-3 text-blue-600" />
                                                    <p className="font-black text-slate-800">종합 역량 향상률 (Skill Growth)</p>
                                                  </div>
                                                  <p className="text-slate-400 font-bold px-1 py-0.5 bg-blue-50 rounded w-fit">Formula: (Post - Pre) / Pre %</p>
                                                  <p className="text-slate-700 font-black border-t border-slate-100 pt-1.5">
                                                     {"전체적으로 사전 대비 사후 역량이 " + stats.impRate.toFixed(2) + "% " + (stats.impRate >= 0 ? "성장" : "감소") + "하며 " + (stats.impRate >= 10 ? "유의미한 성과" : "다소 아쉬운 변화") + "를 보였습니다."}
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
                                          <span>{((stats?.hakeGain || 0) * 100).toFixed(1)}%</span>
                                          {stats?.hakeGain !== undefined && (
                                            <Tooltip>
                                              <TooltipTrigger className="text-[8px] font-black opacity-60 cursor-help">
                                                {stats.hakeGain.toFixed(2)} idx
                                              </TooltipTrigger>
                                              <TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl">
                                                <div className="text-[11px] space-y-1.5">
                                                  <div className="flex items-center gap-1.5">
                                                    <Zap className="size-3 text-emerald-600" />
                                                    <p className="font-black text-slate-800">Hake&apos;s Gain 비율 (Effectiveness %)</p>
                                                  </div>
                                                  <p className="text-slate-400 font-bold px-1 py-0.5 bg-emerald-50 rounded w-fit">Formula: Gain / Potential Gain %</p>
                                                  <p className="text-slate-700 font-black border-t border-slate-100 pt-1.5">
                                                    {"\"학습 도달 효율이 " + (stats.hakeGain * 100).toFixed(1) + "%로, " + (stats.hakeGain >= 0.7 ? "잠재력의 최대치를 이끌어낸 매우 우수한" : stats.hakeGain >= 0.3 ? "목표치를 준수하게 달성한" : "목표 대비 성장이 다소 부족한") + " 결과입니다.\""}
                                                  </p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </td>
                                      <td className={cn("p-4 text-center text-[10px] font-black", 
                                        (stats?.cohensD || 0) >= 0.8 ? "text-amber-700 bg-amber-100/30 shadow-inner" : 
                                        (stats?.cohensD || 0) >= 0.5 ? "text-amber-600" :
                                        "text-slate-400")}>
                                        {stats?.cohensD?.toFixed(2) || '-'}
                                      </td>
                                      <td className={cn("p-4 text-center text-[10px] font-black", 
                                        (stats?.pValue || 1) < 0.05 ? "text-purple-700 bg-purple-50" : 
                                        "text-slate-300")}>
                                        {stats?.pValue?.toFixed(2) || '-'}
                                      </td>
                                      <td className="p-4 text-center opacity-30 text-[9px] font-black">LV{p.level}</td>

                                    </tr>
                                    {isExpanded && childRows.length > 0 && renderTree(childRows, depth + 1)}
                                    {isExpanded && (() => {
                                      const mergedResponses = pResponses.reduce((acc, res) => {
                                        const rId = res.respondentId || `anon-{res.id.slice(0, 8)}`;
                                        if (!acc[rId]) acc[rId] = { id: rId, respondentId: res.respondentId, sat: null as SurveyResponse | null, comp: null as SurveyResponse | null };
                                        const tmpl = templates.find(t => t.id === res.templateId);
                                        if (tmpl?.type === 'SATISFACTION') acc[rId].sat = res;
                                        else if (tmpl?.type === 'COMPETENCY') acc[rId].comp = res;
                                        return acc;
                                      }, {} as Record<string, { id: string, respondentId?: string, sat: SurveyResponse | null, comp: SurveyResponse | null }>);

                                      return Object.values(mergedResponses)
                                        .map(m => {
                                          const rCompAnswers = m.comp?.answers.filter(a => compQuestions.some(q => q.id === a.questionId)) || [];
                                          const rPreAvg = rCompAnswers.length > 0 ? rCompAnswers.reduce((prev, curr) => prev + (Number(curr.preScore) || 0), 0) / rCompAnswers.length : 0;
                                          const rPostAvg = rCompAnswers.length > 0 ? rCompAnswers.reduce((prev, curr) => prev + (Number(curr.score) || 0), 0) / rCompAnswers.length : 0;
                                          const rGain = rPreAvg > 0 || rPostAvg > 0 ? (rPostAvg - rPreAvg) / (5 - rPreAvg) : 0;
                                          return { ...m, rPreAvg, rPostAvg, rGain };
                                        })
                                        .sort((a, b) => {
                                          if (a.rPostAvg !== b.rPostAvg) return a.rPostAvg - b.rPostAvg;
                                          return (a.respondentId || '').localeCompare(b.respondentId || '');
                                        })
                                        .map((m) => {
                                          const rSatAnswers = m.sat?.answers.filter(a => satQuestions.some(q => q.id === a.questionId)) || [];
                                          const rSatAvg = rSatAnswers.length > 0 ? rSatAnswers.reduce((prev, curr) => prev + (Number(curr.score) || 0), 0) / rSatAnswers.length : 0;
                                          const rPostAvg = m.rPostAvg;
                                          const rGain = m.rGain;
                                          
                                          return (
                                            <tr key={m.id} className="border-b bg-white hover:bg-slate-50">
                                              <td className="p-4 sticky left-0 z-20 bg-white border-r min-w-[220px]">
                                                <div className="flex flex-col">
                                                  <span className="text-[10px] font-bold text-slate-500">{m.respondentId || '학습자'}</span>
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
                                                          (ans.score - ans.preScore) >= 0 ? "text-blue-500" : "text-red-500"
                                                        )}>
                                                          {ans.score >= ans.preScore ? '+' : ''}{(((ans.score - ans.preScore) / (ans.preScore || 1)) * 100).toFixed(2)}%
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                );
                                              })}
                                              <td className="p-4 text-center font-black text-[10px] text-blue-700">{rPostAvg.toFixed(2)}</td>
                                              <td className="p-4 text-center">
                                                <div className="flex flex-col">
                                                  <span className="text-[10px] font-black text-blue-700">{(rGain * 100).toFixed(1)}%</span>
                                                  <span className={cn(
                                                    "text-[8px] font-black leading-none mt-0.5",
                                                    rGain >= 0.7 ? "text-blue-700" : rGain >= 0.3 ? "text-emerald-600" : "text-slate-500"
                                                  )}>
                                                    {rGain.toFixed(2)} idx
                                                  </span>
                                                </div>
                                              </td>
                                              <td colSpan={2} />
                                              <td className="p-4 text-center">
                                                <div className="flex gap-1 justify-center">
                                                  <Button onClick={(e) => { e.stopPropagation(); setEditingResponse(m.sat || m.comp); setIsEditDialogOpen(true); }} variant="ghost" size="icon" className="size-6 text-slate-300"><Edit className="size-3" /></Button>
                                                  <Button onClick={async (e) => { e.stopPropagation(); if(confirm('삭제?')) { if(m.sat) await deleteResponse(m.sat.id); if(m.comp) await deleteResponse(m.comp.id); await fetchSurveys(); } }} variant="ghost" size="icon" className="size-6 text-slate-300"><Trash2 className="size-3" /></Button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        });
                                    })()}
                                    {isExpanded && (hasChildren || pResponses.length > 0) && (
                                      <tr className="bg-slate-900 text-white font-black text-[10px] border-b-2">
                                        <td className="p-4 sticky left-0 z-30 bg-slate-900 border-r min-w-[300px]"><div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1}rem` }}><Sigma className="size-3 text-emerald-400" /> {p.name} 종합</div></td>
                                        {satQuestions.map((_, i) => <td key={i} className="p-4 text-center text-emerald-400/80">{stats?.questionStats?.[i]?.average?.toFixed(2) || '-'}</td>)}
                                        {satTextQuestions.map((_, i) => <td key={i} className="p-4 text-center text-slate-500/50 italic">-</td>)}
                                        <td className="p-4 text-center text-emerald-400 bg-white/5">{stats?.satAvg?.toFixed(2) || '-'}</td>
                                        {compQuestions.map((_, i) => (
                                          <td key={i} className="p-4 text-center text-blue-400/80">
                                            <div className="flex flex-col">
                                              <span>{stats?.questionStats?.[i]?.postAvg?.toFixed(2) || '-'}</span>
                                              {stats?.questionStats?.[i]?.impRate !== undefined && (
                                                <Tooltip>
                                                  <TooltipTrigger className="text-[7px] font-bold text-blue-400/60 cursor-help">
                                                    +{stats.questionStats[i].impRate.toFixed(2)}%
                                                  </TooltipTrigger>
                                                  <TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl text-slate-900">
                                                    <div className="text-[11px] space-y-1.5">
                                                      <p className="font-black text-blue-600 mb-1">문항별 평균 성장률</p>
                                                      <p className="font-bold border-t pt-1.5 border-slate-50 italic">
                                                        {"\"종합적으로 이 문항에서 " + stats.questionStats[i].impRate.toFixed(2) + "%의 " + (stats.questionStats[i].impRate >= 0 ? "역량 향상" : "수치 하락") + "이 관찰되었습니다.\""}
                                                      </p>
                                                    </div>
                                                  </TooltipContent>
                                                </Tooltip>
                                              )}
                                            </div>
                                          </td>
                                        ))}
                                        <td className="p-4 text-center bg-blue-500/10">
                                          <Tooltip>
                                            <TooltipTrigger className="cursor-help">
                                              <span className="text-sm font-black text-blue-400">{stats?.postAvg?.toFixed(2) || '0.00'}</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-6 bg-slate-900 border-none shadow-3xl rounded-[2rem] w-80 text-white">
                                              <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                  <div className="size-8 rounded-xl bg-blue-500/20 flex items-center justify-center"><Activity className="size-4 text-blue-400" /></div>
                                                  <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Post Average</p><p className="text-white font-black">사후 역량 종합 평균</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">전체 역량 진단 문항에 대한 사후 측정값의 산술 평균입니다. 교육 후 도달한 학습자의 최종 역량 수준을 나타냅니다.</p>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Calculation</p><p className="text-[11px] font-mono text-blue-300">Σ(사후 점수) / (응답자 수 × 문항 수)</p></div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td className="p-4 text-center bg-blue-500/5">
                                          <Tooltip>
                                            <TooltipTrigger className="cursor-help">
                                              <span className="text-sm font-black text-blue-400">{(stats?.hakeGain * 100).toFixed(1)}%</span>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-6 bg-slate-900 border-none shadow-3xl rounded-[2rem] w-80 text-white">
                                              <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                  <div className="size-8 rounded-xl bg-emerald-500/20 flex items-center justify-center"><TargetIcon className="size-4 text-emerald-400" /></div>
                                                  <div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Hake&apos;s Gain %</p><p className="text-white font-black">정규화된 향상도</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">사전 점수를 고려하여 잠재적 성장 가능성 중 실제 얼마나 성취했는지를 백분율로 나타낸 지표입니다.</p>
                                                <div className="flex flex-col gap-2">
                                                  <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Interpretation</p><p className="text-[11px] text-emerald-300 font-bold">{stats.hakeGain >= 0.7 ? "High Gain (우수)" : stats.hakeGain >= 0.3 ? "Medium Gain (보통)" : "Low Gain (관심)"}</p></div>
                                                  <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Formula</p><p className="text-[11px] font-mono text-emerald-200">(Post - Pre) / (5 - Pre) × 100</p></div>
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
                                                  <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Cohen&apos;s d</p><p className="text-white font-black">효과 크기 (Effect Size)</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">단순한 평균 차이를 넘어, 교육이 학습자 집단에 준 실제적인 영향력의 크기를 표준화하여 나타냅니다.</p>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Benchmark</p><p className="text-[11px] text-blue-300 font-bold">{stats.cohensD >= 0.8 ? "Large (강력함)" : stats.cohensD >= 0.5 ? "Medium (보통)" : "Small (미미함)"}</p></div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td className="p-4 text-center bg-blue-500/5">
                                          <Tooltip>
                                            <TooltipTrigger className="cursor-help">
                                              <span className={cn("text-sm font-black", stats.pValue < 0.05 ? "text-emerald-400" : "text-slate-500")}>
                                                {stats?.pValue < 0.001 ? '< .01' : stats?.pValue?.toFixed(2) || '1.00'}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-6 bg-slate-900 border-none shadow-3xl rounded-[2rem] w-80 text-white">
                                              <div className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                                                  <div className="size-8 rounded-xl bg-purple-500/20 flex items-center justify-center"><CheckCircle2 className="size-4 text-purple-400" /></div>
                                                  <div><p className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">p-Value</p><p className="text-white font-black">통계적 유의성 (t-test)</p></div>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed font-medium">사전-사후의 변화가 우연이 아닐 확률을 의미합니다. 0.05 미만일 때 통계적으로 유의미한 교육 효과가 있었다고 판단합니다.</p>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/10"><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Decision</p><p className={cn("text-[11px] font-bold", stats.pValue < 0.05 ? "text-emerald-300" : "text-slate-400")}>{stats.pValue < 0.05 ? "Statistically Significant (유의)" : "Not Significant (비유의)"}</p></div>
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
                            return renderTree(filteredRoots);
                          })()}
                        </tbody>
                      </table>
                    </TooltipProvider>
                </div>
             </Card>
          </div>
        )}
                    {/* 분석 보고서 섹션 (별도 프레임) */}
              {selectedProjectIds.length > 0 && (
                <div className="mt-20 border-t-8 border-slate-50 pt-20 space-y-16 animate-in fade-in slide-in-from-bottom-10 print:m-0 print:p-0">
                  <div className="flex items-center justify-between px-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                          <FileBarChart className="size-8 text-white" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                          교육 전문가 정밀 분석 보고서
                        </h2>
                      </div>
                      <p className="text-lg font-bold text-slate-400 ml-14">
                        분석 대상: {selectedProjectIds.length}개 사업 유닛 | 기준일: {format(new Date(), 'yyyy년 MM월 dd일')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={() => window.print()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[2rem] px-8 h-14 text-sm font-black gap-2 transition-all"
                      >
                        <Download className="size-5" /> PDF 인쇄
                      </Button>
                      <Button 
                        onClick={() => {
                          const exportHWPX = () => {
                            const reportContent = ExpertReportGenerator.generateConsultingReport(
                              projects.filter(p => selectedProjectIds.includes(p.id)), 
                              overallStats
                            );
                            const blob = new Blob([reportContent], { type: 'application/hwpx' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `SLI_전문가컨설팅보고서_${format(new Date(), 'yyMMdd')}.hwpx`;
                            a.click();
                          };
                          exportHWPX();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] px-10 h-16 text-lg font-black gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
                      >
                        <FileSpreadsheet className="size-6" /> 통합 컨설팅 리포트 (HWPX)
                      </Button>
                    </div>

                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 px-6">
                    <Card className="rounded-[4rem] border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white p-12 space-y-10 group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                        <CheckCircle className="size-48" />
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                          <TargetIcon className="size-6 text-emerald-600" />
                        </div>
                        <div className="flex-1 flex justify-between items-center">
                          <div>
                            <h3 className="text-2xl font-black text-slate-800">교육 운영 만족도 지수</h3>
                            <p className="text-sm font-bold text-slate-400 italic">Satisfaction Radar Analysis</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-400 block uppercase">Overall Average</span>
                            <span className="text-3xl font-black text-emerald-600">{(overallStats?.satAvg || 0).toFixed(2)}<span className="text-sm text-slate-300 ml-1">/ 5.00</span></span>
                          </div>
                        </div>
                      </div>

                      
                      <div className="h-[450px] w-full bg-slate-50/50 rounded-[3rem] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={(() => {
                            const stats = overallStats;
                            if (!stats?.themeStats) return [];
                            return Object.entries(stats.themeStats).map(([theme, s]) => ({
                              theme,
                              score: Number((s.satAvg || 0).toFixed(2))
                            })).filter(d => d.score > 0);
                          })()}>
                            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="theme" tick={{ fill: '#475569', fontSize: 12, fontWeight: 900 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <Radar name="만족도" dataKey="score" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.4}>
                              <LabelList dataKey="score" position="outside" offset={10} fill="#059669" fontSize={10} fontWeight="900" />
                            </Radar>
                            <ChartTooltip content={({ active, payload }) => {
                              if (active && payload?.[0]) {
                                return (
                                  <div className="bg-slate-900 border-none px-6 py-4 rounded-[1.5rem] shadow-3xl">
                                    <p className="text-emerald-400 font-black text-xs mb-1 font-mono">{payload[0].payload.theme}</p>
                                    <p className="text-white text-xl font-black">{payload[0].value}<span className="text-[10px] text-slate-400 ml-1">/ 5.00</span></p>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-[3rem] space-y-6 shadow-inner">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-emerald-700">
                                <Wand2 className="size-6" />
                                <span className="text-sm font-black uppercase tracking-widest font-mono">Expert Evaluation</span>
                            </div>
                            <Badge className="bg-emerald-600 text-white font-black text-[10px] px-3 py-1 rounded-full">500자 정밀 분석</Badge>
                        </div>
                        <p className="text-[15px] font-bold text-slate-800 leading-[1.8] text-pretty whitespace-pre-wrap">
                          {overallStats ? ExpertReportGenerator.generateSatisfactionOpinion(
                            projects.filter(p => selectedProjectIds.includes(p.id)), 
                            overallStats
                          ) : '전체 요약 데이터를 불러오는 중입니다...'}
                        </p>
                      </div>
                    </Card>

                    <Card className="rounded-[4rem] border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white p-12 space-y-10 group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                        <BarChart className="size-48" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                          <Rocket className="size-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800">핵심 역량 증분 비교 분석</h3>
                          <p className="text-sm font-bold text-slate-400 italic">Pre & Post Competency Shift</p>
                        </div>
                      </div>

                      <div className="h-[450px] w-full bg-slate-50/50 rounded-[3rem] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={(() => {
                            const stats = overallStats;
                            if (!stats?.themeStats) return [];
                            return Object.entries(stats.themeStats).map(([theme, s]) => ({
                              theme,
                              pre: Number(s.preAvg.toFixed(2)),
                              post: Number(s.postAvg.toFixed(2))
                            })).filter(d => d.pre > 0 || d.post > 0);
                          })()}>
                            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="theme" tick={{ fill: '#475569', fontSize: 12, fontWeight: 900 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <Radar name="사전 역량" dataKey="pre" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="#94a3b8" fillOpacity={0.2} />
                            <Radar name="사후 역량" dataKey="post" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.4}>
                              <LabelList dataKey="post" position="outside" offset={10} fill="#2563eb" fontSize={10} fontWeight="900" />
                            </Radar>
                            <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: '900' }} />
                            <ChartTooltip content={({ active, payload }) => {
                              if (active && payload && payload.length >= 2) {
                                return (
                                  <div className="bg-slate-900 border-none px-6 py-5 rounded-[1.5rem] shadow-3xl space-y-2">
                                    <p className="text-blue-400 font-black text-xs font-mono">{payload[0].payload.theme}</p>
                                    <div className="grid grid-cols-2 gap-6">
                                      <div><p className="text-slate-400 text-[10px] font-black uppercase">Pre</p><p className="text-white text-xl font-bold">{payload[0].value}</p></div>
                                      <div><p className="text-blue-400 text-[10px] font-black uppercase">Post</p><p className="text-blue-400 text-xl font-black">{payload[1].value}</p></div>
                                    </div>
                                    <p className="pt-2 border-t border-white/10 text-emerald-400 font-black text-sm">성장 증분: +{(Number(payload[1].value) - Number(payload[0].value)).toFixed(2)}</p>
                                  </div>
                                );
                              }
                              return null;
                            }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 p-10 rounded-[3rem] space-y-6 shadow-inner">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-blue-700">
                                <ShieldCheck className="size-6" />
                                <span className="text-sm font-black uppercase tracking-widest font-mono">Statistical Analysis</span>
                            </div>
                            <Badge className="bg-blue-600 text-white font-black text-[10px] px-3 py-1 rounded-full">500자 정밀 분석</Badge>
                        </div>
                        <p className="text-[15px] font-bold text-slate-800 leading-[1.8] text-pretty whitespace-pre-wrap">
                          {overallStats ? ExpertReportGenerator.generateCompetencyOpinion(
                            projects.filter(p => selectedProjectIds.includes(p.id)), 
                            overallStats
                          ) : '성장 분석 데이터를 불러오는 중입니다...'}
                        </p>
                      </div>
                    </Card>
                  </div>

                  {/* 통합 컨설팅 보고서 섹션 */}
                  <div className="px-6 pb-20">
                    <Card className="rounded-[4rem] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] bg-slate-900 text-white p-16 space-y-12 overflow-hidden relative">
                        <div className="absolute -top-20 -right-20 size-80 bg-blue-600/20 blur-[100px] rounded-full" />
                        <div className="absolute -bottom-20 -left-20 size-80 bg-emerald-600/20 blur-[100px] rounded-full" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/10 pb-12">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Lightbulb className="size-10 text-amber-400 fill-amber-400/20" />
                                    <h3 className="text-4xl font-black tracking-tight">전문가 통합 컨설팅 보고서</h3>
                                </div>
                                <p className="text-xl font-bold text-slate-400">Integrated Strategic Consulting Report</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Normalized Gain</p>
                                    <p className="text-3xl font-black text-blue-400">{((overallStats?.hakeGain || 0) * 100).toFixed(1)}%</p>
                                </div>
                                <div className="h-12 w-px bg-white/10" />
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Overall Satisfaction</p>
                                    <p className="text-3xl font-black text-emerald-400">{(overallStats?.satAvg || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 gap-12">
                            <div className="space-y-10">
                                <p className="text-[17px] font-medium leading-[2.2] text-slate-300 whitespace-pre-wrap selection:bg-blue-500/30">
                                    {overallStats ? ExpertReportGenerator.generateConsultingReport(
                                        projects.filter(p => selectedProjectIds.includes(p.id)), 
                                        overallStats
                                    ) : '데이터 로딩 중...'}
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 flex justify-center pt-8">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold font-mono">
                                <Activity className="size-4" />
                                <span>TOTAL ANALYSIS LENGTH: APPROX. 1,500 CHARACTERS</span>
                            </div>
                        </div>
                    </Card>
                  </div>

                  <div className="px-10 space-y-16 mt-20 pb-32">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
                        <div className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-black">별점 1</div>
                        <h4 className="text-2xl font-black text-slate-800">조사결과 사업별 종합 통계 요약</h4>
                      </div>
                      <div className="rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50">
                            <tr className="text-xs font-black text-slate-500 uppercase">
                              <th className="p-6 border-r">사업 구분</th>
                              <th className="p-6 text-center border-r">만족도</th>
                              <th className="p-6 text-center border-r">사전</th>
                              <th className="p-6 text-center border-r">사후</th>
                              <th className="p-6 text-center border-r">향상률</th>
                              <th className="p-6 text-center">GAIN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedProjectIds.map(pid => {
                              const p = projects.find(item => item.id === pid);
                              const stats = aggregatedStats[pid];
                              if (!p || !stats) return null;
                              return (
                                <tr key={pid} className="text-sm font-bold text-slate-700 hover:bg-slate-50">
                                  <td className="p-6 border-r font-black">{p.name}</td>
                                  <td className="p-6 text-center border-r text-emerald-600">{stats.satAvg?.toFixed(2) || '-'}</td>
                                  <td className="p-6 text-center border-r text-slate-400">{stats.preAvg?.toFixed(2) || '-'}</td>
                                  <td className="p-6 text-center border-r text-blue-600">{stats.postAvg?.toFixed(2) || '-'}</td>
                                  <td className="p-6 text-center border-r">{stats.impRate?.toFixed(2)}%</td>
                                  <td className="p-6 text-center text-emerald-500">{(stats.hakeGain * 100).toFixed(1)}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-4">
                        <div className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-black">별첨 2</div>
                        <h4 className="text-2xl font-black text-slate-800">사업별 조사 결과 RAW 데이터 집계</h4>
                      </div>
                      <div className="rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden bg-white">
                        <div className="max-h-[600px] overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-20">
                              <tr className="text-[10px] font-black text-slate-500">
                                <th className="p-6 border-r min-w-[200px]">학습자/사업</th>
                                {satQuestions.map((_, i) => <th key={i} className="p-4 text-center border-r">S-Q{i+1}</th>)}
                                <th className="p-6 text-center border-r bg-emerald-50">만족도</th>
                                {compQuestions.map((_, i) => <th key={i} className="p-4 text-center border-r">C-Q{i+1}</th>)}
                                <th className="p-6 text-center bg-blue-50">역량평균</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedProjectIds.flatMap(pid => {
                                const p = projects.find(item => item.id === pid);
                                const pResponses = responses.filter(r => r.projectId === pid);
                                const merged = Array.from(new Set(pResponses.map(r => r.respondentId))).map(rid => {
                                  const sat = pResponses.find(r => r.respondentId === rid && templates.find(t => t.id === r.templateId)?.type === 'SATISFACTION');
                                  const comp = pResponses.find(r => r.respondentId === rid && templates.find(t => t.id === r.templateId)?.type === 'COMPETENCY');
                                  return { rid, sat, comp, projectName: p?.name };
                                });
                                return merged.map((m) => (
                                  <tr key={`${pid}-${m.rid}`} className="text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">
                                    <td className="p-6 border-r font-black">{m.rid}<br/><span className="text-[9px] text-slate-400 font-medium">{m.projectName}</span></td>
                                    {satQuestions.map((_, i) => <td key={i} className="p-4 text-center border-r">{m.sat?.answers[i]?.score || '-'}</td>)}
                                    <td className="p-6 text-center font-black text-emerald-600 bg-emerald-50/20 border-r">{((m.sat?.answers || []).reduce((a,b)=>a+(Number(b.score) || 0), 0) / (m.sat?.answers?.length || 1)).toFixed(2)}</td>
                                    {compQuestions.map((_, i) => <td key={i} className="p-4 text-center border-r">{m.comp?.answers[i]?.score || '-'}</td>)}
                                    <td className="p-6 text-center font-black text-blue-600 bg-blue-50/20">{((m.comp?.answers || []).reduce((a,b)=>a+(Number(b.score) || 0), 0) / (m.comp?.answers?.length || 1)).toFixed(2)}</td>
                                  </tr>
                                ));
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
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
            <Button onClick={deleteConfirm.onConfirm} className="flex-1 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-100">삭제 진행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl rounded-[2.5rem] p-10 bg-white shadow-3xl">
          <DialogHeader><DialogTitle className="text-2xl font-black">데이터 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
             {editingResponse?.answers.map((ans, idx) => {
               const tmpl = templates.find(t => t.id === editingResponse.templateId);
               const question = tmpl?.questions.find(q => q.id === ans.questionId);
               return (
                <div key={idx} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className="text-[10px] font-black bg-white">{tmpl?.type === 'SATISFACTION' ? '만족도' : '역량 문항'} {idx + 1}</Badge>
                        <span className="text-[10px] font-bold text-slate-400">{question?.theme}</span>
                    </div>
                    <p className="text-sm font-black text-slate-700 leading-relaxed">{question?.content || '삭제된 문항입니다.'}</p>
                    <div className="flex gap-4">
                      {ans.preScore !== undefined && (
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 ml-1 uppercase">Pre (사전)</label>
                          <Input type="number" min="0" max="100" value={ans.preScore} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, preScore: Number(e.target.value)}:a)})} className="bg-white rounded-xl h-11 border-none shadow-sm font-bold" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 ml-1 uppercase">{ans.preScore !== undefined ? 'Post (사후)' : '점수'}</label>
                        <Input type="number" min="0" max="100" value={ans.score} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, score: Number(e.target.value)}:a)})} className="bg-white rounded-xl h-11 border-none shadow-sm font-bold" />
                      </div>
                    </div>
                </div>
               );
             })}
          </div>

          <DialogFooter className="pt-6"><Button onClick={async () => { if(editingResponse) { await updateResponse(editingResponse.id, editingResponse); await fetchSurveys(); setIsEditDialogOpen(false); alert('수정됨'); } }} className="bg-blue-600 text-white px-10 rounded-xl font-black">저장</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-12 bg-white shadow-3xl">
           <DialogHeader><DialogTitle className="text-3xl font-black">엑셀 데이터 연동</DialogTitle></DialogHeader>
           <Textarea value={pasteContent} onChange={(e)=>setPasteContent(e.target.value)} placeholder="학습자명\t점수1\t점수2..." className="min-h-[300px] rounded-2xl bg-slate-50 border-none font-mono text-xs p-6" />
           <DialogFooter className="pt-8"><Button onClick={handlePasteProcess} size="lg" className="bg-blue-600 text-white px-12 rounded-2xl font-black">데이터 일괄 연동</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
