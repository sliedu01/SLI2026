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
  Search,
  Calendar,
  Sigma,
  Calculator,
  BarChart3
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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

import { useProjectStore } from '@/store/use-project-store';
import { useSurveyStore, SurveyTemplate, SurveyResponse, Answer, Question, SurveyType } from '@/store/use-survey-store';
import { usePartnerStore } from '@/store/use-partner-store';
import { cn } from '@/lib/utils';
import { 
  generateAIExpertReport,
  calculateHakeGain,
  calculateCohensD,
  calculatePairedTTest,
  getPValueFromT
} from '@/lib/stat-utils';

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
  CartesianGrid
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

  
  const visibleProjectIds = React.useMemo(() => {
    const start = dataDateRange.start;
    const end = dataDateRange.end;
    const set = new Set<string>();
    projects.forEach(p => {
      if (!start || !end || (p.startDate >= start && p.startDate <= end) || (p.endDate >= start && p.endDate <= end)) {
        let curr: any = p;
        while (curr) { set.add(curr.id); curr = projects.find(parent => parent.id === curr.parentId); }
      }
    });
    return set;
  }, [projects, dataDateRange]);

  const renderNodes = React.useCallback((parentId: string | null, depth: number = 0): React.ReactNode => {
    const filteredRows = projects.filter(p => p.parentId === parentId && visibleProjectIds.has(p.id));
    if (filteredRows.length === 0) return null;

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
                  setSelectedProjectIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id]);
                }}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                  isSelected ? "bg-blue-600 text-white shadow-md lg:scale-[1.02]" : "hover:bg-slate-50 text-slate-600"
                )}
                style={{ marginLeft: `${depth * 1.5}rem` }}
              >
                <div className="size-5 flex items-center justify-center shrink-0">
                  {isSelected ? (
                    <div className="size-4 rounded border-2 border-white bg-white flex items-center justify-center"><Check className="size-3 text-blue-600 stroke-[4px]" /></div>
                  ) : (
                    <div className="size-4 rounded border-2 border-slate-200 group-hover:border-blue-400 bg-white" />
                  )}
                </div>
                {hasVisibleChildren ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(p.id, e); }} className={cn("p-1 rounded hover:bg-white/20", isSelected ? "text-white" : "text-slate-400")}>
                    {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : <div className="size-5.5 ml-1" />}
                <span className="text-xs font-black truncate">{p.level >= 3 && p.partnerId ? `${partners.find(ptr => ptr.id === p.partnerId)?.name || '미지정'} (${p.name})` : p.name}</span>
              </div>
              {isExpanded && renderNodes(p.id, depth + 1)}
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
      setPasteContent(''); setIsPasteDialogOpen(false); await fetchSurveys(); alert('데이터 연동 완료');
    } catch (err: any) { alert(`오류 발생: ${err.message || '데이터 형식을 확인해주세요.'}`); }
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
              <p className="text-[10px] font-bold opacity-70">전체 응답 {overallStats.count}건 기준</p>
           </Card>
           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 space-y-2">
              <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-black uppercase tracking-widest">역량 향상도 (Gain)</span><TrendingUp className="size-4" /></div>
              <div className="text-4xl font-black">{overallStats.hakeGain.toFixed(2)}</div>
              <div className="flex items-center gap-2">
                 <Badge className={cn("text-[9px] border-none", overallStats.hakeGain >= 0.7 ? "bg-white text-blue-600" : "bg-blue-400/30 text-white")}>
                   {overallStats.hakeGain >= 0.7 ? '높은 성과' : overallStats.hakeGain >= 0.3 ? '중간 성과' : '보통'}
                 </Badge>
              </div>
           </Card>
           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 space-y-2">
              <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-black uppercase tracking-widest">성과 크기 (Effect Size)</span><BarChart2 className="size-4" /></div>
              <div className="text-4xl font-black">{overallStats.cohensD.toFixed(2)}</div>
              <p className="text-[10px] font-bold opacity-70">Cohen's d 지표 (0.8 이상 강력)</p>
           </Card>
           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 space-y-2">
              <div className="flex justify-between items-center opacity-80"><span className="text-[10px] font-black uppercase tracking-widest">통계적 유의성</span><CheckCircle2 className="size-4" /></div>
              <div className="text-4xl font-black">{overallStats.pValue < 0.001 ? '< .001' : overallStats.pValue.toFixed(3)}</div>
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
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type === 'SATISFACTION' ? '교육 만족도' : '역량 진단'}</label>
                          <div className="space-y-2">
                            {templates.filter(t => t.type === type).map(t => (
                              <div key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={cn("p-4 rounded-2xl cursor-pointer border transition-all group relative", selectedTemplateId === t.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100")}><p className="text-sm font-black truncate">{t.name}</p><Button onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }} variant="ghost" size="icon" className="absolute top-2 right-2 text-white/40 hover:text-white opacity-0 group-hover:opacity-100"><Trash2 className="size-3" /></Button></div>
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
                       <div className="p-10 flex justify-center"><Button onClick={() => handleAddQuestion('SCALE')} variant="outline" className="h-12 border-dashed border-2 px-8 rounded-xl font-black text-blue-600">+ 문항 추가</Button></div>
                    </CardContent>
                </Card>
             </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5">
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
                    <Button onClick={async ()=>{if(confirm('삭제?')){await Promise.all(selectedProjectIds.map(id=>clearProjectResponses(id))); await fetchSurveys();}}} variant="outline" className="h-full px-6 rounded-xl text-red-500"><Trash2 className="size-4" /></Button>
                  </div>
             </div>

             <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <TooltipProvider delay={0}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                            <th className="p-6 text-left sticky left-0 bg-white/90 backdrop-blur z-20 w-[300px]">탐색 항목 / 학습자</th>
                            {satQuestions.map((q, idx) => (
                              <th key={q.id} className="p-2 text-center w-16 min-min-w-[64px]"><Tooltip><TooltipTrigger className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg flex flex-col items-center w-full leading-tight font-black">Q{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-4 rounded-xl">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                            <th className="p-4 text-center bg-emerald-50 text-[10px] w-20 text-emerald-700 font-black">만족도 평균</th>
                            {satTextQuestions.map((q, idx) => (
                              <th key={q.id} className="p-2 text-center w-28 min-w-[110px]"><Tooltip><TooltipTrigger className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg flex flex-col items-center w-full leading-tight font-black">TX{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-4 rounded-xl">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                            {compQuestions.map((q, idx) => (
                              <th key={q.id} className="p-2 text-center w-16 min-min-w-[64px]"><Tooltip><TooltipTrigger className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg flex flex-col items-center w-full leading-tight font-black">Q{idx+1}</TooltipTrigger><TooltipContent className="bg-slate-900 text-white p-4 rounded-xl">{q.content}</TooltipContent></Tooltip></th>
                            ))}
                            <th className="p-4 text-center bg-blue-50 text-[10px] w-20 text-blue-700 font-black">역량 평균</th>
                            <th className="p-4 text-center bg-emerald-50/50 text-emerald-700 font-black text-[10px]">Gain</th>
                            <th className="p-4 text-center bg-amber-50/50 text-amber-700 font-black text-[10px]">Cohen's d</th>
                            <th className="p-4 text-center bg-purple-50/50 text-purple-700 font-black text-[10px]">t-test</th>
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
                                      <td className="p-4 sticky left-0 z-10 bg-inherit border-r"><div className="flex items-center gap-3" style={{ paddingLeft: `${depth * 1}rem` }}>{(hasChildren || p.level === 4) && <button className="p-1">{isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}</button>}<span className="text-[11px] font-black text-slate-900 truncate">{p.level >= 3 && p.partnerId ? `${partners.find(ptr => ptr.id === p.partnerId)?.name || '협력사'} (${p.name})` : p.name}</span></div></td>
                                      {satQuestions.map((_, i) => <td key={i} className="p-4 text-center font-black text-[10px] text-emerald-600/60">{stats?.questionStats?.[i]?.average?.toFixed(2) || '-'}</td>)}
                                      <td className="p-4 text-center font-black text-xs bg-emerald-50/30">{stats?.satAvg?.toFixed(2) || '-'}</td>
                                      {satTextQuestions.map((_, i) => <td key={i} className="p-4 text-center text-[9px] text-slate-300 italic border-r">SUMMARY</td>)}
                                      {compQuestions.map((_, i) => <td key={i} className="p-4 text-center font-black text-[10px] text-blue-600/60">{stats?.questionStats?.[i]?.postAvg?.toFixed(2) || '-'}</td>)}
                                      <td className="p-4 text-center font-black text-xs bg-blue-50/30">{stats?.postAvg?.toFixed(2) || '-'}</td>
                                      <td className={cn("p-4 text-center text-[10px] font-black", (stats?.hakeGain || 0) >= 0.7 ? "text-blue-600 bg-blue-50/50" : (stats?.hakeGain || 0) >= 0.3 ? "text-emerald-600" : "text-slate-400")}>{stats?.hakeGain?.toFixed(2) || '-'}</td>
                                      <td className={cn("p-4 text-center text-[10px] font-black", (stats?.cohensD || 0) >= 0.8 ? "text-amber-600 bg-amber-50/50" : "text-slate-400")}>{stats?.cohensD?.toFixed(2) || '-'}</td>
                                      <td className={cn("p-4 text-center text-[10px] font-black", (stats?.pValue || 1) < 0.05 ? "text-purple-600 font-black" : "text-slate-300")}>{stats?.pValue?.toFixed(3) || '-'}</td>
                                      <td className="p-4 text-center opacity-30 text-[9px] font-black">LV{p.level}</td>

                                    </tr>
                                    {isExpanded && childRows.length > 0 && renderTree(childRows, depth + 1)}
                                    {isExpanded && pResponses.map((r, rIdx) => {
                                      const rSatAnswers = r.answers.filter(a => satQuestions.some(q => q.id === a.questionId));
                                      const rSatAvg = rSatAnswers.length > 0 ? rSatAnswers.reduce((prev, curr) => prev + (Number(curr.score) || 0), 0) / rSatAnswers.length : 0;
                                      const rCompAnswers = r.answers.filter(a => compQuestions.some(q => q.id === a.questionId));
                                      const rPostAvg = rCompAnswers.length > 0 ? rCompAnswers.reduce((prev, curr) => prev + (Number(curr.score) || 0), 0) / rCompAnswers.length : 0;
                                      return (
                                        <tr key={r.id} className="border-b bg-white hover:bg-slate-50">
                                          <td className="p-4" style={{ paddingLeft: `${(depth + 1.2) * 1}rem` }}><div className="flex flex-col"><span className="text-[10px] font-bold text-slate-500">{r.respondentId || '학습자'}</span><span className="text-[8px] text-slate-300 font-black">RAW DATA</span></div></td>
                                          {satQuestions.map(q => <td key={q.id} className="p-4 text-center text-[10px] text-emerald-600/30">{r.answers.find(a=>a.questionId===q.id)?.score || '-'}</td>)}
                                          <td className="p-4 text-center font-black text-[10px] text-emerald-600/40">{rSatAvg.toFixed(2)}</td>
                                          {satTextQuestions.map(q => {
                                            const ans = r.answers.find(a => a.questionId === q.id);
                                            const text = ans?.text || '-';
                                            return (
                                              <td key={q.id} className="p-4 text-center text-[10px] text-slate-500 bg-slate-50/50 border-r min-w-[110px]">
                                                {text === '-' ? '-' : (
                                                  <Tooltip>
                                                    <TooltipTrigger className="cursor-help hover:text-blue-600 underline decoration-slate-200 underline-offset-4 decoration-dotted">
                                                      {text.length > 5 ? `${text.slice(0, 5)}...` : text}
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-[300px] p-4 bg-slate-900 text-white rounded-xl shadow-2xl border-none">
                                                      <p className="text-xs leading-relaxed font-medium">{text}</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                )}
                                              </td>
                                            );
                                          })}
                                          {compQuestions.map(q => <td key={q.id} className="p-4 text-center text-[10px] text-blue-600/30">{r.answers.find(a=>a.questionId===q.id)?.score || '-'}</td>)}
                                          <td className="p-4 text-center font-black text-[10px] text-blue-600/40">{rPostAvg.toFixed(2)}</td>
                                          <td colSpan={3} />
                                          <td className="p-4 text-center">
                                            <div className="flex gap-1 justify-center">
                                              <Button onClick={(e) => { e.stopPropagation(); setEditingResponse(r); setIsEditDialogOpen(true); }} variant="ghost" size="icon" className="size-6 text-slate-300"><Edit className="size-3" /></Button>
                                              <Button onClick={async (e) => { e.stopPropagation(); if(confirm('삭제?')) { await deleteResponse(r.id); await fetchSurveys(); } }} variant="ghost" size="icon" className="size-6 text-slate-300"><Trash2 className="size-3" /></Button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {isExpanded && (hasChildren || pResponses.length > 0) && (
                                      <tr className="bg-slate-900 text-white font-black text-[10px] border-b-2">
                                        <td className="p-4 sticky left-0 z-10 bg-slate-900"><div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1}rem` }}><Sigma className="size-3 text-emerald-400" /> {p.name} 종합</div></td>
                                        {satQuestions.map((_, i) => <td key={i} className="p-4 text-center text-emerald-400/80">{stats?.questionStats?.[i]?.average?.toFixed(2) || '-'}</td>)}
                                        <td className="p-4 text-center text-emerald-400 bg-white/5">{stats?.satAvg?.toFixed(2) || '-'}</td>
                                        {satTextQuestions.map((_, i) => <td key={i} className="p-4 text-center text-slate-500/50 italic">-</td>)}
                                        {compQuestions.map((_, i) => <td key={i} className="p-4 text-center text-blue-400/80">{stats?.questionStats?.[i]?.postAvg?.toFixed(2) || '-'}</td>)}
                                        <td className="p-4 text-center text-blue-400 bg-white/5">{stats?.postAvg?.toFixed(2) || '-'}</td>
                                        <td className="p-4 text-center text-emerald-400">{stats?.hakeGain?.toFixed(2) || '-'}</td>
                                        <td className="p-4 text-center text-amber-400">{stats?.cohensD?.toFixed(2) || '-'}</td>
                                        <td className="p-4 text-center text-purple-400">{stats?.pValue?.toFixed(3) || '-'}</td>
                                        <td className="p-4 text-center"><Badge className="bg-emerald-600 text-[8px]">TOTAL</Badge></td>
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
      </main>

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
