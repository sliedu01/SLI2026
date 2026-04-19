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
  Calendar
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

  const [activeTab, setActiveTab] = React.useState('templates');
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
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const aiResultRef = React.useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = React.useState({ start: '', end: '' }); // 분석용
  const [surveyType, setSurveyType] = React.useState<SurveyType>('COMPETENCY');

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
  const compQuestions = compTmpl?.questions.filter(q => q.type === 'SCALE') || [];

  const aggregatedStats = getAggregatedStats(projects, selectedProjectIds.length > 0 ? selectedProjectIds : undefined, undefined, surveyType);
  
  // 가시 노드 계산 (기간 필터링 및 부모 노드 포함)
  const visibleProjectIds = React.useMemo(() => {
    const start = dataDateRange.start;
    const end = dataDateRange.end;
    const set = new Set<string>();

    const isMatch = (p: any) => {
      if (!start || !end) return true;
      // 시작일 또는 종료일이 지정된 범위 내에 있는 경우
      return (p.startDate >= start && p.startDate <= end) || (p.endDate >= start && p.endDate <= end);
    };

    projects.forEach(p => {
      if (isMatch(p)) {
        let curr: any = p;
        while (curr) {
          set.add(curr.id);
          curr = projects.find(parent => parent.id === curr.parentId);
        }
      }
    });
    return set;
  }, [projects, dataDateRange]);

  const renderNodes = React.useCallback((parentId: string | null, depth: number = 0): React.ReactNode => {
    // visibleProjectIds에 포함된 노드만 표시
    const filteredRows = projects.filter(p => p.parentId === parentId && visibleProjectIds.has(p.id));
    if (filteredRows.length === 0) return null;

    return (
      <div className="flex flex-col gap-1">
        {filteredRows.map(p => {
          const isExpanded = expandedIds.has(p.id);
          const isSelected = selectedProjectIds.includes(p.id);
          // 자식 중 visibleProjectIds에 속한 하나라도 있는지 확인
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
                    <div className="size-4 rounded border-2 border-white bg-white flex items-center justify-center">
                      <Check className="size-3 text-blue-600 stroke-[4px]" />
                    </div>
                  ) : (
                    <div className="size-4 rounded border-2 border-slate-200 group-hover:border-blue-400 bg-white" />
                  )}
                </div>

                {hasVisibleChildren ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleExpand(p.id, e); }}
                    className={cn("p-1 rounded hover:bg-white/20 transition-colors", isSelected ? "text-white" : "text-slate-400")}
                  >
                    {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : (
                  <div className="size-5.5 shrink-0 ml-1 flex items-center justify-center">
                    <div className={cn("size-1.5 rounded-full", isSelected ? "bg-blue-200" : "bg-slate-200")} />
                  </div>
                )}
                
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-black truncate">
                       {p.level === 3 && p.partnerId ? (partners.find(ptr => ptr.id === p.partnerId)?.name || p.name) : 
                        p.level === 4 && p.partnerId ? `${partners.find(ptr => ptr.id === p.partnerId)?.name || '미지정'} (${p.name})` : 
                        p.name}
                     </span>
                     <Badge variant="outline" className={cn(
                       "text-[8px] font-black h-4 px-1 border-none",
                       isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                     )}>{p.level === 3 ? "PARTNER" : p.level === 4 ? "PROG" : `LV${p.level}`}</Badge>
                  </div>
                  <div className={cn("text-[9px] font-bold flex items-center gap-1", isSelected ? "text-blue-100" : "text-slate-400")}>
                     < Calendar className="size-2.5" /> {p.startDate} ~ {p.endDate}
                  </div>
                </div>

                {isSelected && <Badge className="ml-auto bg-blue-500 text-white shadow-sm border-none font-black text-[9px]">SELECTED</Badge>}
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
    fetchSurveys();
    fetchProjects();
    fetchPartners();

    const lv1Projects = useProjectStore.getState().projects.filter(p => p.level === 1);
    if (lv1Projects.length > 0) {
      const earliest = lv1Projects.reduce((min, p) => (p.startDate && p.startDate < min) ? p.startDate : min, lv1Projects[0].startDate || '');
      if (earliest) setDataDateRange(prev => ({ ...prev, start: earliest }));
    }
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
    const targetId = selectedProjectIds[0];
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
        const respondentName = cols[0];
        let currentIdx = 1;

        if (targetSatTmpl) {
          const satAnswers: Answer[] = targetSatTmpl.questions.map(q => {
            const val = cols[currentIdx++];
            return q.type === 'SCALE' ? { questionId: q.id, score: Number(val) || 0 } : { questionId: q.id, score: 0, text: val || '' };
          });
          await addResponse({ projectId: targetId, templateId: targetSatTmpl.id, respondentId: respondentName, answers: satAnswers });
        }

        if (targetCompTmpl) {
          const compAnswers: Answer[] = targetCompTmpl.questions.map(q => {
            if (q.type === 'SCALE') {
              const pre = Number(cols[currentIdx++]) || 0;
              const post = Number(cols[currentIdx++]) || 0;
              return { questionId: q.id, preScore: pre, score: post };
            }
            return { questionId: q.id, score: 0, text: cols[currentIdx++] || '' };
          });
          await addResponse({ projectId: targetId, templateId: targetCompTmpl.id, respondentId: respondentName, answers: compAnswers });
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
                            <PopoverTrigger render={<Button variant="ghost" className="size-8 p-0"><Plus className="size-4" /></Button>} />
                            <PopoverContent className="size-56 p-2 rounded-2xl shadow-2xl bg-white border-none">
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
             <div className="flex flex-wrap items-end gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl overflow-visible">
                  <div className="flex gap-4 min-w-[320px]">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">조회 시작일</label>
                      <Input type="date" value={dataDateRange.start} onChange={(e) => setDataDateRange(prev => ({ ...prev, start: e.target.value }))} className="h-12 bg-slate-50 border-none rounded-xl font-bold" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">조회 종료일</label>
                      <Input type="date" value={dataDateRange.end} onChange={(e) => setDataDateRange(prev => ({ ...prev, end: e.target.value }))} className="h-12 bg-slate-50 border-none rounded-xl font-bold" />
                    </div>
                  </div>

                  <div className="space-y-1 flex-1 min-w-[400px]">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">사업 / 프로그램 탐색기</label>
                     <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                        <PopoverTrigger render={
                          <Button variant="outline" className={cn(
                            "w-full h-12 justify-start px-4 rounded-xl font-black text-sm gap-3 border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all",
                            selectedProjectIds.length > 0 ? "text-slate-900 shadow-sm" : "text-slate-400"
                          )}>
                             <Layers className="size-4 shrink-0 text-blue-500" />
                             <span className="truncate">{selectionPath}</span>
                             {selectedProjectIds.length > 0 && (
                               <Badge className="ml-2 bg-blue-100 text-blue-600 border-none px-2 py-0.5 text-[9px] font-black">
                                 {selectedProjectIds.length}
                               </Badge>
                             )}
                             <ChevronDown className="size-4 ml-auto opacity-50" />
                          </Button>
                        } />
                        <PopoverContent className="w-[480px] p-0 rounded-[2rem] shadow-2xl border-none bg-white overflow-hidden max-h-[600px] flex flex-col" align="start">
                           <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                <Search className="size-4 text-slate-400" /> LV1~LV4 사업 탐색 및 다중 선택
                              </h3>
                              {selectedProjectIds.length > 0 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); setSelectedProjectIds([]); }}
                                  className="h-7 px-3 text-[10px] font-black text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  전체 해제
                                </Button>
                              )}
                           </div>
                           <div className="overflow-y-auto p-4 custom-scrollbar flex-1 bg-white">
                                {renderNodes(null) || (
                                  <div className="py-20 text-center space-y-3">
                                    <AlertCircle className="size-8 text-slate-200 mx-auto" />
                                    <p className="text-slate-400 font-black text-sm">해당 기간에 진행되는 사업이 없습니다.</p>
                                  </div>
                                )}
                           </div>
                           <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tip: 노드 클릭 시 즉시 선택됩니다.</p>
                              <Button size="sm" onClick={() => setIsProjectSelectorOpen(false)} className="h-8 rounded-lg bg-blue-600 font-black text-[10px]">확인</Button>
                           </div>
                        </PopoverContent>
                     </Popover>
                  </div>

                  <div className="flex gap-4 ml-auto h-12 items-center">
                    {selectedProjectIds.length > 0 && (
                       <>
                          <Badge className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl border-none font-black text-xs h-full flex items-center shadow-inner">
                            {projectTemplates.all.length}개의 설문 연결됨
                          </Badge>
                          <Button variant="outline" onClick={() => setIsPasteDialogOpen(true)} className="h-full px-8 rounded-xl border-blue-100 text-blue-600 font-black transition-all hover:bg-blue-50 hover:scale-105 active:scale-95"><FileSpreadsheet className="size-4 mr-2" /> 엑셀 연동</Button>
                          <Button onClick={() => { if(confirm('선택된 항목들의 응답을 초기화하시겠습니까?')) selectedProjectIds.forEach(id => clearProjectResponses(id)); }} variant="outline" className="h-full px-6 rounded-xl text-red-500 border-red-50 hover:bg-red-50 hover:border-red-100 transition-all active:scale-95"><Trash2 className="size-4" /></Button>
                       </>
                    )}
                  </div>
             </div>

             <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                   <TooltipProvider delay={0}>
                          <table className="w-full border-collapse">
                            <thead>
                               <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                                  <th className="p-6 text-center">No.</th>
                                  <th className="p-6 text-left">탐색 항목 / 학습자</th>
                                  {satQuestions.map((q, idx) => (
                                    <th key={q.id} className="p-2 text-center w-16 min-w-[64px]">
                                      <Tooltip>
                                        <TooltipTrigger className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg flex flex-col items-center gap-0 w-full leading-tight">
                                          <span className="text-[8px] font-black opacity-60">만족도</span>
                                          <span className="text-[10px] font-black">Q{idx+1}</span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl max-w-xs">{q.content}</TooltipContent>
                                      </Tooltip>
                                    </th>
                                  ))}
                                  {satTmpl && <th className="p-4 text-center bg-emerald-50/30 text-[10px] w-16">평균</th>}
                                  {compQuestions.map((q, idx) => (
                                    <th key={q.id} className="p-2 text-center w-16 min-w-[64px]">
                                      <Tooltip>
                                        <TooltipTrigger className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg flex flex-col items-center gap-0 w-full leading-tight">
                                          <span className="text-[8px] font-black opacity-60">성숙도</span>
                                          <span className="text-[10px] font-black">Q{idx+1}</span>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl max-w-xs">{q.content}</TooltipContent>
                                      </Tooltip>
                                    </th>
                                  ))}
                                  {compTmpl && (
                                     <>
                                       <th className="p-6 text-center bg-blue-50/30">Avg(Post)</th>
                                       <th className="p-6 text-center bg-blue-50/30">Gain</th>
                                       <th className="p-6 text-center bg-blue-50/30">Cohen's d</th>
                                       <th className="p-6 text-center bg-blue-50/30">t-test</th>
                                     </>
                                   )}
                                  <th className="p-6 text-center">관리</th>
                               </tr>
                            </thead>
                             <tbody className="divide-y divide-slate-50">
                               {(() => {
                                 const rootProjects = projects.filter(p => p.level === 1 && visibleProjectIds.has(p.id));
                                 
                                 let filteredRoots = rootProjects;
                                 
                                 if (selectedProjectIds.length > 0) {
                                   const selectedAncestors = new Set<string>();
                                   selectedProjectIds.forEach(id => {
                                      let curr = projects.find(p => p.id === id);
                                      while(curr) {
                                        selectedAncestors.add(curr.id);
                                        curr = projects.find(p => p.id === curr?.parentId);
                                      }
                                   });
                                   filteredRoots = rootProjects.filter(p => selectedAncestors.has(p.id));
                                 }

                                 if (filteredRoots.length === 0) {
                                   return (
                                     <tr>
                                       <td colSpan={100} className="p-20 text-center text-slate-300 font-black">
                                          조회된 사업 데이터가 없습니다. 상단 필터를 확인해 주세요.
                                       </td>
                                     </tr>
                                   );
                                 }

                                 const renderTree = (rows: typeof projects, depth = 0): React.ReactNode[] => {
                                   return rows.map(p => {
                                     const isExpanded = expandedTableIds.has(p.id);
                                     const hasChildren = projects.some(c => c.parentId === p.id);
                                     const pResponses = responses.filter(r => r.projectId === p.id);
                                     const stats = aggregatedStats[p.id];
                                     const childRows = useProjectStore.getState().getSortedProjects(p.id);

                                     return (
                                       <React.Fragment key={p.id}>
                                         <tr 
                                           onClick={() => toggleTableExpand(p.id)}
                                           className={cn(
                                             "border-b border-slate-50 transition-colors group cursor-pointer",
                                             depth === 0 ? "bg-slate-50/50" : "bg-transparent",
                                             "hover:bg-blue-50/40"
                                           )}>
                                           <td className="p-4 text-center">
                                              <Badge variant="outline" className="bg-slate-100 text-slate-400 border-none font-black text-[9px]">LV{p.level}</Badge>
                                           </td>
                                           <td className="p-4">
                                              <div className="flex items-center gap-3" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                                                 {(hasChildren || p.level === 4) && (
                                                   <button onClick={() => toggleTableExpand(p.id)} className="p-1 rounded hover:bg-white shadow-sm transition-all">
                                                      {isExpanded ? <ChevronDown className="size-3.5 text-blue-500" /> : <ChevronRight className="size-3.5 text-slate-400" />}
                                                   </button>
                                                 )}
                                                 {p.level !== 4 && !hasChildren && <div className="size-5.5" />}
                                                 <div className="flex flex-col gap-0.5 min-w-0">
                                                   <span className={cn("text-xs font-black truncate", 
                                                     depth === 0 ? "text-slate-900" : 
                                                     (p.level >= 3 ? "text-slate-900 font-bold" : "text-slate-600")
                                                   )}>
                                                     {p.level >= 3 && p.partnerId ? `${partners.find(ptr => ptr.id === p.partnerId)?.name || '미지정'} (${p.name})` : p.name}
                                                   </span>
                                                   <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                                                     {p.startDate && (
                                                       <div className="flex items-center gap-1 shrink-0">
                                                         <Calendar className="size-2.5" />
                                                         {p.startDate} ~ {p.endDate}
                                                       </div>
                                                     )}
                                                     {p.level >= 3 && p.partnerId && (
                                                       <>
                                                         <Separator orientation="vertical" className="h-2 bg-slate-200" />
                                                         <span className="text-blue-500/80 truncate opacity-80">
                                                           {partners.find(partner => partner.id === p.partnerId)?.name || '미지정 협력업체'}
                                                         </span>
                                                       </>
                                                     )}
                                                   </div>
                                                 </div>
                                              </div>
                                           </td>
                                           {satQuestions.map((_, qIdx) => (
                                              <td key={qIdx} className="p-4 text-center font-black text-[11px] text-emerald-600/70">
                                                 {stats?.questionStats?.[qIdx]?.average?.toFixed(2) || '-'}
                                              </td>
                                           ))}
                                           {satTmpl && (
                                              <td className="p-4 text-center font-black text-xs text-slate-900 bg-emerald-50/20">
                                                 {stats?.satAvg?.toFixed(2) || '-'}
                                              </td>
                                           )}
                                           {compQuestions.map((_, qIdx) => (
                                              <td key={qIdx} className="p-4 text-center font-black text-[11px] text-blue-600/70">
                                                 {stats?.questionStats?.[qIdx]?.postAvg?.toFixed(2) || '-'}
                                              </td>
                                           ))}
                                           {compTmpl && (
                                              <>
                                                 <td className="p-4 text-center font-black text-xs text-blue-700 bg-blue-50/20">{stats?.postAvg?.toFixed(2) || '-'}</td>
                                                 <td className="p-4 text-center">
                                                    <Badge className={cn("border-none text-[10px]", (stats?.hakeGain || 0) >= 0.3 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}>{stats?.hakeGain?.toFixed(2) || '-'}</Badge>
                                                 </td>
                                                 <td className="p-4 text-center font-black text-xs text-amber-600 bg-amber-50/10">{stats?.cohensD?.toFixed(2) || '-'}</td>
                                                 <td className="p-4 text-center font-black text-xs text-purple-600 bg-purple-50/10">{stats?.pValue?.toFixed(3) || '-'}</td>
                                                 <td className="p-4 text-center">
                                                   <span className="text-slate-300">-</span>
                                                 </td>
                                              </>
                                           )}
                                         </tr>
                                         {isExpanded && childRows.length > 0 && renderTree(childRows, depth + 1)}
                                         {isExpanded && p.level === 4 && pResponses.map((r, rIdx) => {
                                            const rSatStats = r.answers.filter(a => satQuestions.some(q => q.id === a.questionId));
                                            const rTotalSat = rSatStats.length > 0
                                              ? rSatStats.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / satQuestions.length
                                              : 0;
                                            const rCompStats = r.answers.filter(a => compQuestions.some(q => q.id === a.questionId));
                                            const rPostTotal = rCompStats.length > 0
                                              ? rCompStats.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / compQuestions.length
                                              : 0;

                                            return (
                                              <tr key={r.id} className="border-b border-slate-50/50 bg-slate-50/30 hover:bg-white transition-colors animate-in fade-in slide-in-from-left-1 border-l-4 border-l-blue-400">
                                                <td className="p-4 text-center text-[10px] text-slate-400 font-bold opacity-50">{rIdx + 1}</td>
                                                <td className="p-4" style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }}>
                                                  <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase text-blue-500 border-blue-100 bg-white">RAW DATA</Badge>
                                                    <div className="flex flex-col">
                                                       <span className="text-xs font-bold text-slate-600 truncate max-w-[120px]">{r.respondentId || '익명'}</span>
                                                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">SURVEY RESPONSE</span>
                                                    </div>
                                                  </div>
                                                </td>
                                                {satQuestions.map(q => {
                                                  const ans = r.answers.find(a => a.questionId === q.id);
                                                  return <td key={q.id} className="p-4 text-center text-xs font-bold text-emerald-600/50">{ans?.score || '-'}</td>
                                                })}
                                                {satTmpl && <td className="p-4 text-center font-black text-xs text-slate-900 bg-emerald-50/20">{rTotalSat.toFixed(2)}</td>}
                                                {compQuestions.map(q => {
                                                   const ans = r.answers.find(a => a.questionId === q.id);
                                                   return (
                                                      <td key={q.id} className="p-4 text-center">
                                                         <div className="flex flex-col items-center gap-0.5 opacity-80">
                                                            <div className="px-1.5 py-0.5 rounded-full bg-blue-500 text-[9px] font-black text-white">{ans?.score || '-'}</div>
                                                            <div className="text-[8px] font-black text-slate-300">PRE {ans?.preScore || '-'}</div>
                                                         </div>
                                                      </td>
                                                   );
                                                })}
                                                {compTmpl && (
                                                   <>
                                                      <td className="p-4 text-center font-black text-xs text-blue-700 bg-blue-50/20">{rPostTotal.toFixed(2)}</td>
                                                      <td className="p-4 text-center text-slate-200">-</td>
                                                      <td className="p-4 text-center text-slate-200">-</td>
                                                      <td className="p-4 text-center text-slate-200">-</td>
                                                      <td className="p-4 text-center">
                                                         <div className="flex items-center justify-center gap-1 opacity-100 transition-all">
                                                            <Button onClick={() => { setEditingResponse(r); setIsEditDialogOpen(true); }} variant="ghost" size="icon" className="size-8 rounded-xl text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit className="size-4" /></Button>
                                                            <Button onClick={() => { if(confirm('응답을 삭제하시겠습니까?')) useSurveyStore.getState().deleteResponse(r.id); }} variant="ghost" size="icon" className="size-8 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="size-4" /></Button>
                                                         </div>
                                                      </td>
                                                   </>
                                                )}
                                              </tr>
                                            );
                                          })}
                                        </React.Fragment>
                                      );
                                    });
                                  };

                                  const treeContent = renderTree(filteredRoots);
                                   const overall = aggregatedStats['_overall'] || null;

                                  return (
                                    <>
                                      {treeContent}
                                      {projects.length > 0 && (
                                        <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                                           <td colSpan={2} className="p-6 text-center uppercase tracking-widest text-slate-500">Overall Statistics</td>
                                           {satQuestions.map((_, qIdx) => (
                                              <td key={qIdx} className="p-4 text-center text-emerald-400">{overall?.questionStats?.[qIdx]?.average?.toFixed(2) || '0.00'}</td>
                                           ))}
                                           {satTmpl && <td className="p-6 text-center text-emerald-500 bg-white/5">{overall?.satAvg?.toFixed(2) || '0.00'}</td>}
                                           {compQuestions.map((_, qIdx) => (
                                              <td key={qIdx} className="p-4 text-center text-blue-400">{overall?.questionStats?.[qIdx]?.postAvg?.toFixed(2) || '0.00'}</td>
                                           ))}
                                           {compTmpl && (
                                             <>
                                               <td className="p-4 text-center text-blue-600 bg-white/5">{overall?.postAvg?.toFixed(2) || '0.00'}</td>
                                               <td className="p-4 text-center text-emerald-400 bg-white/5">{overall?.hakeGain?.toFixed(2) || '0.00'}</td>
                                               <td className="p-4 text-center text-amber-400 bg-white/5">{overall?.cohensD?.toFixed(2) || '0.00'}</td>
                                               <td className="p-4 text-center text-purple-400 bg-white/5">{overall?.pValue?.toFixed(3) || '0.00'}</td>
                                               <td className="p-4 text-center">-</td>
                                             </>
                                           )}
                                        </tr>
                                      )}
                                    </>
                                  );
                               })()}
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
                            <p className="text-xs font-black">질문 {idx+1}. {editingResponse.templateId === projectTemplates.sat[0]?.id ? projectTemplates.sat[0].questions.find(q=>q.id===ans.questionId)?.content : projectTemplates.comp[0]?.questions.find(q=>q.id===ans.questionId)?.content}</p>
                            <div className="flex gap-4">
                               {ans.preScore !== undefined && <Input type="number" value={ans.preScore} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, preScore: Number(e.target.value)}:a)})} className="bg-white h-12 rounded-xl" placeholder="사전" />}
                               <Input type="number" value={ans.score} onChange={(e)=>setEditingResponse({...editingResponse, answers: editingResponse.answers.map((a,i)=>i===idx?{...a, score: Number(e.target.value)}:a)})} className="bg-white h-12 rounded-xl" placeholder="사후/점수" />
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
                 <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 overflow-visible">
                 <div className="flex flex-wrap items-end gap-6">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                       <button onClick={() => setSurveyType('SATISFACTION')} className={cn("px-8 py-3 rounded-xl text-sm font-black transition-all", surveyType === 'SATISFACTION' ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500")}>만족도 분석</button>
                       <button onClick={() => setSurveyType('COMPETENCY')} className={cn("px-8 py-3 rounded-xl text-sm font-black transition-all", surveyType === 'COMPETENCY' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500")}>역량 분석</button>
                    </div>
                    
                    <div className="flex-1 min-w-[300px] space-y-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">사업 / 프로그램 탐색기 (다중선택)</label>
                       <Popover open={isProjectSelectorOpen} onOpenChange={setIsProjectSelectorOpen}>
                          <PopoverTrigger render={
                            <Button variant="outline" className={cn(
                              "w-full h-12 justify-start px-4 rounded-xl font-black text-sm gap-3 border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all",
                              selectedProjectIds.length > 0 ? "text-slate-900 shadow-sm" : "text-slate-400"
                            )}>
                               <Layers className="size-4 shrink-0 text-blue-500" />
                               <span className="truncate">{selectionPath}</span>
                               {selectedProjectIds.length > 0 && (
                                 <Badge className="ml-2 bg-blue-100 text-blue-600 border-none px-2 py-0.5 text-[9px] font-black">
                                   {selectedProjectIds.length}
                                 </Badge>
                               )}
                               <ChevronDown className="size-4 ml-auto opacity-50" />
                            </Button>
                          } />
                          <PopoverContent className="w-[480px] p-0 rounded-[2rem] shadow-2xl border-none bg-white overflow-hidden max-h-[600px] flex flex-col" align="start">
                             <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                  <Search className="size-4 text-slate-400" /> 사업 탐색 및 다중 선택
                                </h3>
                                {selectedProjectIds.length > 0 && (
                                  <Button variant="ghost" size="sm" onClick={() => setSelectedProjectIds([])} className="h-7 px-3 text-[10px] font-black text-red-500">전체 선택 해제</Button>
                                )}
                             </div>
                             <div className="overflow-y-auto p-4 custom-scrollbar flex-1 bg-white">
                                <div className="py-2 text-[10px] text-slate-400 font-bold mb-2 px-1 lowercase tracking-wider">조회할 사업들을 체크해 주세요.</div>
                                {renderNodes(null) || (
                                  <div className="py-20 text-center space-y-3">
                                    <AlertCircle className="size-8 text-slate-200 mx-auto" />
                                    <p className="text-slate-400 font-black text-sm">해당 기간에 진행되는 사업이 없습니다.</p>
                                  </div>
                                )}
                             </div>
                             <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tip: 노드 클릭 시 즉시 선택됩니다.</p>
                                <Button size="sm" onClick={() => setIsProjectSelectorOpen(false)} className="h-8 rounded-lg bg-blue-600 font-black text-[10px]">확인</Button>
                             </div>
                          </PopoverContent>
                       </Popover>
                    </div>

                    <div className="flex gap-2">
                       <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl font-bold w-36" />
                       <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="h-12 bg-slate-50 border-none rounded-xl font-bold w-36" />
                    </div>
                    <Button onClick={handleRunAIAnalysis} className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black ml-auto shadow-xl transition-all hover:scale-105 active:scale-95"><Wand2 className="size-4 mr-2" /> AI 분석 리포트</Button>
                 </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <Card className="lg:col-span-2 rounded-[3rem] p-10 bg-white shadow-xl h-[500px]">
                    <CardTitle className="text-xl font-black mb-8 flex items-center gap-2"><BarChart2 className="size-5 text-blue-600" /> 종합 교육 성과 지수</CardTitle>
                    <ResponsiveContainer width="100%" height="85%">
                       <ComposedChart data={projects.filter(p => (aggregatedStats[p.id]?.count || 0) > 0 || (p.id === '_overall')).map(p => {
                         const stats = aggregatedStats[p.id];
                         return {
                           name: p.id === '_overall' ? '전체 합계' : 
                                 (p.level === 3 && p.partnerId ? (partners.find(ptr => ptr.id === p.partnerId)?.name || p.name) : 
                                  p.level === 4 && p.partnerId ? `${partners.find(ptr => ptr.id === p.partnerId)?.name || '미지정'} (${p.name})` : 
                                  p.name),
                           satisfaction: Number((stats?.satAvg || 0).toFixed(2)),
                           gain: Number((stats?.hakeGain || 0).toFixed(2)) * 5
                         };
                       })}>
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
                            { name: '대폭 향상', value: 30, fill: '#10b981' },
                            { name: '보통 향상', value: 50, fill: '#3b82f6' },
                            { name: '미미', value: 20, fill: '#ef4444' }
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
