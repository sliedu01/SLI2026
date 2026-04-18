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
  Info
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
  const { projects } = useProjectStore();
  const { 
    templates, 
    responses, 
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

  const [activeTab, setActiveTab] = React.useState('templates');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = React.useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = React.useState<string | null>(null);

  const [editingTemplate, setEditingTemplate] = React.useState<SurveyTemplate | null>(null);
  const [editingResponse, setEditingResponse] = React.useState<SurveyResponse | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [pasteContent, setPasteContent] = React.useState('');
  const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const aiResultRef = React.useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = React.useState({ start: '', end: '' });
  const [surveyType, setSurveyType] = React.useState<SurveyType>('COMPETENCY');

  const { mergedResponses, templates: projectTemplates } = React.useMemo(() => 
    useSurveyStore.getState().getUnifiedProjectData(selectedProgramId || selectedProjectId || ''),
    [selectedProgramId, selectedProjectId, responses, templates]
  );
  
  const satTmpl = projectTemplates.sat[0];
  const compTmpl = projectTemplates.comp[0];
  const satQuestions = satTmpl?.questions.filter(q => q.type === 'SCALE') || [];
  const compQuestions = compTmpl?.questions.filter(q => q.type === 'SCALE') || [];

  const aggregatedStats = getAggregatedStats(projects, selectedProjectId, selectedPartnerId || undefined, surveyType);
  const partners = Array.from(new Set(projects.map(p => p.partnerId).filter((id): id is string => !!id)));
  const projectResponses = responses.filter(r => r.projectId === selectedProjectId);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (selectedTemplateId) {
      const t = templates.find((i: SurveyTemplate) => i.id === selectedTemplateId);
      if (t) setEditingTemplate({...t, questions: t.questions.map((q: Question) => ({...q}))});
    } else if (templates.length > 0) {
      const t = templates[0];
      setSelectedTemplateId(t.id);
    }
  }, [selectedTemplateId, templates]);

  if (!mounted) return null;

  const selectedTemplate = templates.find((t: SurveyTemplate) => t.id === selectedTemplateId) || templates[0];

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await updateTemplate(editingTemplate.id, {
        name: editingTemplate.name,
        questions: editingTemplate.questions
      });
      alert('템플릿이 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('정말로 이 템플릿을 삭제하시겠습니까?')) return;
    try {
      await deleteTemplate(id);
      if (selectedTemplateId === id) setSelectedTemplateId(null);
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

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

  const handlePasteProcess = async () => {
    const targetId = selectedProgramId || selectedProjectId;
    if (!pasteContent.trim() || !targetId) {
      alert('사업 및 프로그램을 먼저 선택해주세요.');
      return;
    }
    
    const { templates: projectTemplates } = useSurveyStore.getState().getUnifiedProjectData(targetId);
    const targetSatTmpl = projectTemplates.sat[0];
    const targetCompTmpl = projectTemplates.comp[0];

    if (!targetSatTmpl && !targetCompTmpl) {
      alert('현재 선택된 프로그램에 연결된 설문 템플릿이 없습니다. 템플릿에서 사업을 먼저 할당해주세요.');
      return;
    }

    const rows = pasteContent.trim().split('\n');
    let successCount = 0;
    
    try {
      for (const row of rows) {
        const cols = row.split('\t').map(c => c.trim());
        if (cols.length < 2) continue;
        const respondentId = cols[0];
        let currentIdx = 1;

        // 만족도 데이터 처리
        if (targetSatTmpl) {
          const satAnswers: Answer[] = targetSatTmpl.questions.map(q => {
            const val = cols[currentIdx++];
            return q.type === 'SCALE' ? { questionId: q.id, score: Number(val) || 0 } : { questionId: q.id, score: 0, text: val || '' };
          });
          await addResponse({ projectId: targetId, templateId: targetSatTmpl.id, respondentId, answers: satAnswers });
        }

        // 역량 진단 데이터 처리 (사전/사후)
        if (targetCompTmpl) {
          const compAnswers: Answer[] = targetCompTmpl.questions.map(q => {
            if (q.type === 'SCALE') {
              const pre = Number(cols[currentIdx++]) || 0;
              const post = Number(cols[currentIdx++]) || 0;
              return { questionId: q.id, preScore: pre, score: post };
            }
            return { questionId: q.id, score: 0, text: cols[currentIdx++] || '' };
          });
          await addResponse({ projectId: targetId, templateId: targetCompTmpl.id, respondentId, answers: compAnswers });
        }
        successCount++;
      }
      setPasteContent('');
      setIsPasteDialogOpen(false);
      alert(`${successCount}명의 데이터를 [${targetId}] 프로그램으로 연동했습니다.`);
    } catch (err) {
      console.error(err);
      alert('데이터 연동 중 오류가 발생했습니다. 포맷을 확인해주세요.');
    }
  };

  const handleRunAIAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const summary = generateAIExpertReport(projects, aggregatedStats, 'UNIFIED');
      setAiSummary(summary);
      setIsAnalyzing(false);
      setTimeout(() => aiResultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 1500);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="size-8 text-blue-600" /> 설문 및 성과 관리
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">Expert Analytics Dashboard</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: 'templates', label: '템플릿 설계', icon: Settings2 },
            { id: 'data', label: '데이터 연동', icon: TableIcon },
            { id: 'analysis', label: '성과 분석 리포트', icon: TrendingUp },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2", activeTab === tab.id ? "bg-white text-blue-600 shadow-lg" : "text-slate-500 hover:text-slate-700")}>
              <tab.icon className="size-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="min-h-[700px]">
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-[2rem] border-none shadow-xl bg-white sticky top-10">
                   <CardHeader>
                      <CardTitle className="text-lg font-black flex justify-between items-center">
                         템플릿 레지스트리
                         <Popover>
                           <PopoverTrigger>
                             <Button variant="ghost" className="size-8 p-0"><Plus className="size-4" /></Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-56 p-2 rounded-2xl shadow-2xl bg-white">
                              <div className="grid gap-1">
                                 <Button variant="ghost" className="justify-start font-bold gap-2 text-emerald-600" onClick={() => addTemplate({ name: '신규 만족도 조사', type: 'SATISFACTION', questions: createDefaultQuestions('SATISFACTION') })}><ClipboardCheck className="size-4" /> 만족도 조사 생성</Button>
                                 <Button variant="ghost" className="justify-start font-bold gap-2 text-blue-600" onClick={() => addTemplate({ name: '신규 역량 진단', type: 'COMPETENCY', questions: createDefaultQuestions('COMPETENCY') })}><Activity className="size-4" /> 역량 진단 생성</Button>
                              </div>
                           </PopoverContent>
                         </Popover>
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-6">
                      {['SATISFACTION', 'COMPETENCY'].map((type) => (
                        <div key={type} className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type === 'SATISFACTION' ? '교육 만족도' : '역량 진단'}</label>
                          <div className="space-y-2">
                            {templates.filter(t => t.type === type).map((t) => (
                              <div key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={cn("p-4 rounded-2xl cursor-pointer border transition-all group relative", selectedTemplateId === t.id ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100")}>
                                 <p className="text-sm font-black truncate">{t.name}</p>
                                 <Button onClick={(e) => handleDeleteTemplate(t.id, e)} variant="ghost" size="icon" className="absolute top-2 right-2 text-white/40 hover:text-white opacity-0 group-hover:opacity-100"><Trash2 className="size-3" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                   </CardContent>
                </Card>
             </div>

             <div className="lg:col-span-3">
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                    <CardHeader className="p-10 border-b border-slate-50 flex flex-row items-center justify-between">
                       <Input value={editingTemplate?.name || ''} onChange={(e) => setEditingTemplate(prev => prev ? {...prev, name: e.target.value} : null)} className="text-2xl font-black bg-transparent border-none p-0 focus-visible:ring-0 w-1/2" />
                       <Button onClick={handleSaveTemplate} className="rounded-xl h-12 px-8 bg-blue-600 text-white font-black">저장</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                       <div className="divide-y divide-slate-100">
                          {editingTemplate?.questions.map((q, idx) => (
                            <div key={q.id} className="p-8 group hover:bg-slate-50/50 transition-all flex gap-6">
                               <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 font-black text-xs text-slate-400">{idx+1}</div>
                               <div className="flex-1 grid grid-cols-3 gap-4">
                                  <Input value={q.division} onChange={(e) => handleUpdateQuestion(q.id, 'division', e.target.value)} className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                                  <Input value={q.theme} onChange={(e) => handleUpdateQuestion(q.id, 'theme', e.target.value)} className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                                  <Input value={q.content} onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)} className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                               </div>
                               <Button onClick={() => handleUpdateQuestion(q.id, 'type', q.type === 'SCALE' ? 'TEXT' : 'SCALE')} variant="ghost" className="text-[10px] font-black uppercase text-blue-600">{q.type}</Button>
                               <Button onClick={() => setEditingTemplate(prev => prev ? {...prev, questions: prev.questions.filter(qu => qu.id !== q.id)} : null)} variant="ghost" size="icon" className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="size-4" /></Button>
                            </div>
                          ))}
                          <div className="p-10 flex justify-center gap-4">
                             <Button onClick={() => handleAddQuestion('SCALE')} variant="outline" className="h-12 border-dashed border-2 px-8 rounded-xl font-black text-blue-600">+ 객관식 추가</Button>
                             <Button onClick={() => handleAddQuestion('TEXT')} variant="outline" className="h-12 border-dashed border-2 px-8 rounded-xl font-black text-emerald-600">+ 주관식 추가</Button>
                          </div>
                       </div>
                    </CardContent>
                </Card>
             </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5">
             <div className="flex flex-wrap items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                  <div className="space-y-1 min-w-[240px]">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">사업 선택</label>
                     <select value={selectedProjectId || ''} onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedProgramId(null); }} className="w-full h-12 px-4 bg-slate-50 rounded-xl font-black">
                        <option value="">사업을 선택하세요...</option>
                        {projects.filter(p => p.level <= 3).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                  </div>

                  <div className="space-y-1 min-w-[180px]">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">협력업체 필터</label>
                     <select value={selectedPartnerId || ''} onChange={(e) => { setSelectedPartnerId(e.target.value || null); setSelectedProgramId(null); }} className="w-full h-12 px-4 bg-slate-50 rounded-xl font-black">
                        <option value="">전체 업체</option>
                        {partners.map(id => <option key={id} value={id}>{id}</option>)}
                     </select>
                  </div>

                  <div className="space-y-1 min-w-[240px]">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">세부 프로그램(일자)</label>
                     <select value={selectedProgramId || ''} onChange={(e) => setSelectedProgramId(e.target.value || null)} className="w-full h-12 px-4 bg-slate-50 rounded-xl font-black" disabled={!selectedProjectId}>
                        <option value="">프로그램을 선택하세요...</option>
                        {projects.filter(p => p.level === 4 && (!selectedProjectId || p.parentId === selectedProjectId || projects.find(parent => parent.id === p.parentId && parent.parentId === selectedProjectId)) && (!selectedPartnerId || p.partnerId === selectedPartnerId)).map(p => (
                          <option key={p.id} value={p.id}>{p.startDate} - {p.name}</option>
                        ))}
                     </select>
                  </div>

                  {selectedProgramId && (
                     <div className="flex gap-4 ml-auto">
                        <Badge className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border-none">
                          {projectTemplates.all.length}개의 설문 연결됨
                        </Badge>
                        <Button variant="outline" onClick={() => setIsPasteDialogOpen(true)} className="h-12 px-6 rounded-xl border-blue-100 text-blue-600 font-black"><FileSpreadsheet className="size-4 mr-2" /> 엑셀 연동</Button>
                        <Button onClick={() => { if(confirm('초기화하시겠습니까?')) clearProjectResponses(selectedProgramId); }} variant="outline" className="h-12 px-6 rounded-xl text-red-500"><Trash2 className="size-4" /></Button>
                     </div>
                  )}
             </div>

             <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                   <TooltipProvider delay={0}>
                          <table className="w-full border-collapse">
                            <thead>
                               <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                                  <th className="p-6 text-center">No.</th>
                                  <th className="p-6 text-left">학습자</th>
                                  {satQuestions.map((q, idx) => (
                                    <th key={q.id} className="p-4 text-center">
                                      <Tooltip><TooltipTrigger className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full">SAT Q{idx+1}</TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl max-w-xs">{q.content}</TooltipContent></Tooltip>
                                    </th>
                                  ))}
                                  {satTmpl && <th className="p-6 text-center bg-emerald-50/30">개인평균</th>}
                                  {compQuestions.map((q, idx) => (
                                    <th key={q.id} className="p-4 text-center">
                                      <Tooltip><TooltipTrigger className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">COMP Q{idx+1}</TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl max-w-xs">{q.content}</TooltipContent></Tooltip>
                                    </th>
                                  ))}
                                  {compTmpl && (
                                    <>
                                      <th className="p-6 text-center bg-blue-50/30">Avg(Post)</th>
                                      <th className="p-6 text-center bg-blue-50/30">Hake Gain</th>
                                      <th className="p-6 text-center bg-blue-50/30">Cohen's d</th>
                                      <th className="p-6 text-center bg-blue-50/30">t-test</th>
                                    </>
                                  )}
                                  <th className="p-6 text-center">관리</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {mergedResponses.length === 0 ? (
                                  <tr><td colSpan={100} className="p-20 text-center opacity-30 font-black">데이터가 없습니다.</td></tr>
                               ) : (
                                  mergedResponses.map((res, rIdx) => {
                                    const satAnswers = res.satResponses[0]?.answers || [];
                                    const compAnswers = res.compResponses[0]?.answers || [];
                                    
                                    const satScores = satQuestions.map(q => satAnswers.find(a => a.questionId === q.id)?.score || 0);
                                    const satAvg = satScores.length > 0 ? satScores.reduce((a,b)=>a+b,0)/satScores.length : 0;
                                    const compScaleAns = compQuestions.map(q => compAnswers.find(a => a.questionId === q.id));
                                    const preScores = compScaleAns.map(a => a?.preScore || 0);
                                    const postScores = compScaleAns.map(a => a?.score || 0);
                                    const compAvgPost = postScores.length > 0 ? postScores.reduce((a,b)=>a+b,0)/postScores.length : 0;
                                    const compAvgPre = preScores.length > 0 ? preScores.reduce((a,b)=>a+b,0)/preScores.length : 0;
                                    const hake = calculateHakeGain(compAvgPre, compAvgPost);
                                    const cohen = calculateCohensD(preScores, postScores);
                                    const tStat = calculatePairedTTest(preScores, postScores);
                                    const pVal = getPValueFromT(tStat, compQuestions.length - 1);

                                    return (
                                      <tr key={res.respondentId} className="hover:bg-slate-50/50 transition-colors group text-xs font-black">
                                         <td className="p-6 text-center text-slate-300">{rIdx + 1}</td>
                                         <td className="p-6 text-slate-700">{res.respondentId}</td>
                                         {satQuestions.map(q => (
                                           <td key={q.id} className="p-4 text-center">
                                              <Badge className="bg-emerald-50 text-emerald-600 border-none">{satAnswers.find(a => a.questionId === q.id)?.score || 0}</Badge>
                                           </td>
                                         ))}
                                         {satTmpl && <td className="p-6 text-center text-emerald-700 bg-emerald-50/10">{satAvg.toFixed(2)}</td>}
                                         {compQuestions.map(q => {
                                            const ans = compAnswers.find(a => a.questionId === q.id);
                                            return (
                                              <td key={q.id} className="p-4 text-center">
                                                 <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[9px] text-slate-300">PRE {ans?.preScore || 0}</span>
                                                    <Badge className="bg-blue-600 text-white border-none text-[10px]">POST {ans?.score || 0}</Badge>
                                                 </div>
                                              </td>
                                            );
                                         })}
                                         {compTmpl && (
                                           <>
                                             <td className="p-4 text-center bg-blue-50/10">{compAvgPost.toFixed(2)}</td>
                                             <td className="p-4 text-center bg-blue-50/10"><Badge className={cn("border-none text-[10px]", hake >= 0.3 ? "bg-blue-500 text-white" : "bg-slate-200")}>{hake.toFixed(2)}</Badge></td>
                                             <td className="p-4 text-center bg-blue-50/10 text-slate-500">{cohen.toFixed(2)}</td>
                                             <td className="p-4 text-center bg-blue-50/10 text-[9px]">{tStat.toFixed(2)} (p={pVal.toFixed(3)})</td>
                                           </>
                                         )}
                                         <td className="p-6 text-center">
                                            <div className="flex justify-center gap-2">
                                               <Button onClick={() => { setEditingResponse(res.satResponses[0] || res.compResponses[0]); setIsEditDialogOpen(true); }} variant="ghost" size="icon" className="size-8 text-slate-200 hover:text-blue-600"><Edit className="size-4" /></Button>
                                               <Button onClick={() => { if(confirm('삭제하시겠습니까?')) { if(res.satResponses[0]) deleteResponse(res.satResponses[0].id); if(res.compResponses[0]) deleteResponse(res.compResponses[0].id); } }} variant="ghost" size="icon" className="size-8 text-slate-200 hover:text-red-500"><Trash2 className="size-4" /></Button>
                                            </div>
                                         </td>
                                      </tr>
                                    );
                                  })
                               )}
                               {mergedResponses.length > 0 && (
                                  <tr className="bg-slate-900 text-white font-black text-xs">
                                     <td colSpan={2} className="p-6 text-center uppercase tracking-widest text-slate-500">Overall Avg.</td>
                                     {satQuestions.map(q => {
                                        const avg = mergedResponses.reduce((s,r)=>s+(r.satResponses[0]?.answers.find(a=>a.questionId===q.id)?.score||0),0)/mergedResponses.length;
                                        return <td key={q.id} className="p-4 text-center text-emerald-400">{avg.toFixed(2)}</td>;
                                     })}
                                     {satTmpl && <td className="p-6 text-center text-emerald-500 bg-white/5">{(mergedResponses.reduce((s,r)=>{
                                        const ans = r.satResponses[0]?.answers || [];
                                        return s + (ans.reduce((a,b)=>a+b.score,0)/(ans.length||1));
                                     },0)/mergedResponses.length).toFixed(2)}</td>}
                                     {compQuestions.map(q => {
                                        const avg = mergedResponses.reduce((s,r)=>s+(r.compResponses[0]?.answers.find(a=>a.questionId===q.id)?.score||0),0)/mergedResponses.length;
                                        return <td key={q.id} className="p-4 text-center text-blue-400">{avg.toFixed(2)}</td>;
                                     })}
                                     {compTmpl && (
                                       <>
                                         <td className="p-4 text-center text-blue-600 bg-white/5">{(mergedResponses.reduce((s,r)=>{
                                            const ans = r.compResponses[0]?.answers || [];
                                            return s + (ans.reduce((a,b)=>a+b.score,0)/(ans.length||1));
                                         },0)/mergedResponses.length).toFixed(2)}</td>
                                         <td colSpan={4} className="bg-white/5"></td>
                                       </>
                                     )}
                                  </tr>
                               )}
                            </tbody>
                          </table>
                   </TooltipProvider>
                </div>
             </Card>

             <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl rounded-[2.5rem] p-10 bg-white shadow-3xl">
                   <DialogHeader><DialogTitle className="text-2xl font-black">데이터 수정</DialogTitle></DialogHeader>
                   <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {editingResponse?.answers.map((ans, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-slate-50 space-y-3">
                           <p className="text-xs font-black">Q. {editingResponse.templateId === projectTemplates.sat[0]?.id ? projectTemplates.sat[0].questions.find(q=>q.id===ans.questionId)?.content : projectTemplates.comp[0]?.questions.find(q=>q.id===ans.questionId)?.content}</p>
                           <div className="flex gap-4">
                              {ans.preScore !== undefined && <Input type="number" value={ans.preScore} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, preScore: Number(e.target.value)}:a)})} className="bg-white h-12 rounded-xl" placeholder="Pre" />}
                              <Input type="number" value={ans.score} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, score: Number(e.target.value)}:a)})} className="bg-white h-12 rounded-xl" placeholder="Score/Post" />
                           </div>
                        </div>
                      ))}
                   </div>
                   <DialogFooter className="pt-6">
                      <Button onClick={() => setIsEditDialogOpen(false)} variant="ghost">취소</Button>
                      <Button onClick={async () => { if(editingResponse) { const { id, createdAt, ...updates } = editingResponse as any; await updateResponse(id, updates); setIsEditDialogOpen(false); alert('수정되었습니다.'); } }} className="bg-blue-600 text-white px-10 rounded-xl font-black">저장</Button>
                   </DialogFooter>
                </DialogContent>
             </Dialog>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-5">
             <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                <div className="flex flex-wrap items-end gap-6">
                   <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                      <button onClick={() => setSurveyType('SATISFACTION')} className={cn("px-8 py-3 rounded-xl text-sm font-black transition-all", surveyType === 'SATISFACTION' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500")}>만족도 분석</button>
                      <button onClick={() => setSurveyType('COMPETENCY')} className={cn("px-8 py-3 rounded-xl text-sm font-black transition-all", surveyType === 'COMPETENCY' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500")}>역량 분석</button>
                   </div>
                   <div className="flex-1 min-w-[300px] flex gap-2">
                     <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl" />
                     <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl" />
                   </div>
                   <Button onClick={handleRunAIAnalysis} className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black ml-auto shadow-xl"><Wand2 className="size-4 mr-2" /> AI 분석 리포트</Button>
                </div>
             </Card>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <Card className="lg:col-span-2 rounded-[3rem] p-10 bg-white shadow-xl h-[500px]">
                   <CardTitle className="text-xl font-black mb-8 flex items-center gap-2"><BarChart2 className="size-5 text-blue-600" /> 종합 교육 성과 지수</CardTitle>
                   <ResponsiveContainer width="100%" height="85%">
                      <ComposedChart data={projects.filter(p => aggregatedStats[p.id]?.count > 0).map(p => ({
                        name: p.name,
                        satisfaction: Number(aggregatedStats[p.id].satAvg.toFixed(2)),
                        gain: Number(calculateHakeGain(aggregatedStats[p.id].preAvg, aggregatedStats[p.id].postAvg).toFixed(2)) * 5
                      }))}>
                         <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                         <YAxis domain={[0, 5]} axisLine={false} tickLine={false} />
                         <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                         <Bar dataKey="satisfaction" name="만족도" fill="#dbeafe" radius={[10, 10, 0, 0]} barSize={40} />
                         <Line type="monotone" dataKey="gain" name="역량향상도" stroke="#10b981" strokeWidth={4} />
                      </ComposedChart>
                   </ResponsiveContainer>
                </Card>
                <Card className="rounded-[3rem] p-10 bg-white shadow-xl h-[500px]">
                   <CardTitle className="text-xl font-black mb-8 flex items-center gap-2"><PieChartIcon className="size-5 text-emerald-600" /> 향상도 분포</CardTitle>
                   <ResponsiveContainer width="100%" height="70%">
                      <PieChart>
                         <Pie data={[
                           { name: 'High', value: 30, fill: '#10b981' },
                           { name: 'Mid', value: 50, fill: '#3b82f6' },
                           { name: 'Low', value: 20, fill: '#ef4444' }
                         ]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                            <Cell fill="#10b981" /><Cell fill="#3b82f6" /><Cell fill="#ef4444" />
                         </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center text-xs font-black p-3 bg-emerald-50 rounded-xl"><span>High Gain</span><span>최우수 (0.7+)</span></div>
                      <div className="flex justify-between items-center text-xs font-black p-3 bg-blue-50 rounded-xl"><span>Medium Gain</span><span>양호 (0.3+)</span></div>
                   </div>
                </Card>
             </div>

             {aiSummary && (
                <Card ref={aiResultRef} className="rounded-[3rem] p-12 bg-white shadow-2xl border-t-8 border-blue-600 animate-in slide-in-from-bottom-10">
                   <div className="flex items-center gap-3 mb-8"><MessageSquare className="size-6 text-blue-600" /><CardTitle className="text-2xl font-black">AI 전문가 성과 리포트</CardTitle></div>
                   <div className="prose prose-slate max-w-none prose-p:font-bold prose-p:text-slate-600 whitespace-pre-wrap leading-relaxed text-slate-700 text-lg">{aiSummary}</div>
                   <div className="pt-10 flex justify-end gap-4"><Button variant="ghost" className="h-14 px-8 rounded-2xl font-black text-slate-400">CSV 내보내기</Button><Button className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black shadow-xl gap-2"><Download className="size-4" /> 리포트 PDF 저장</Button></div>
                </Card>
             )}
          </div>
        )}
      </main>

      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
         <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="bg-blue-600 text-white p-8">
               <DialogTitle className="text-2xl font-black">데이터 복사/붙여넣기 연동</DialogTitle>
               <DialogDescription className="text-blue-100 font-medium italic">엑셀 데이터를 [학습자명] [만족도순] [역량 사전/사후순]으로 복사해 주세요.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4">
               <Textarea placeholder="여기에 붙여넣으세요..." value={pasteContent} onChange={(e) => setPasteContent(e.target.value)} className="h-64 rounded-2xl border-slate-200 font-mono text-xs p-6 bg-slate-50/50" />
               <Button className="w-full h-16 rounded-2xl bg-blue-600 font-black text-white shadow-xl hover:bg-blue-700" onClick={handlePasteProcess}>연동 데이터 처리</Button>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
