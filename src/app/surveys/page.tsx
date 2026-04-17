'use client';

import * as React from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  Settings2,
  Table as TableIcon,
  Save,
  Wand2,
  ArrowRight,
  TrendingUp,
  Target,
  Users,
  MessageSquare,
  Activity,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Check,
  Layout,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { useProjectStore } from '@/store/use-project-store';
import { useSurveyStore, SurveyTemplate, SurveyResponse, Answer, Question, SurveyType } from '@/store/use-survey-store';
import { cn } from '@/lib/utils';
import { 
  calculateHakeGain, 
  calculateCohensD, 
  calculatePairedTTest, 
  getAchievementLevel,
  generateAIExpertReport 
} from '@/lib/stat-utils';

// Charts
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  LineChart,
  Line,
  Scatter,
  ComposedChart
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
    clearProjectResponses 
  } = useSurveyStore();

  const [activeTab, setActiveTab] = React.useState('templates');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [surveyType, setSurveyType] = React.useState<SurveyType>('COMPETENCY');
  
  const [selectedPartnerId, setSelectedPartnerId] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<{ start: string; end: string }>({ start: '', end: '' });

  const [editingTemplate, setEditingTemplate] = React.useState<SurveyTemplate | null>(null);
  const [pasteContent, setPasteContent] = React.useState('');
  const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const aiResultRef = React.useRef<HTMLDivElement>(null);

  // 유니크한 협력업체 목록 추출
  const partners = Array.from(new Set(projects.map(p => p.partnerId).filter(Boolean)));

  const { getAggregatedStats, createDefaultQuestions } = useSurveyStore();
  const aggregatedStats = getAggregatedStats(projects, selectedProjectId, selectedPartnerId || undefined);

  React.useEffect(() => {
    setMounted(true);
    // 샘플 템플릿 (V2)
    if (templates.length === 0 && mounted) {
       addTemplate({
          name: '디지털 신기술 역량 진단 (기본)',
          type: 'COMPETENCY',
          questions: createDefaultQuestions('COMPETENCY')
       });
    }
  }, [mounted, templates.length]);

  React.useEffect(() => {
    if (selectedTemplateId) {
      const t = templates.find(i => i.id === selectedTemplateId);
      if (t) setEditingTemplate({...t, questions: t.questions.map(q => ({...q}))});
    } else if (templates.length > 0) {
      // 초기 선택 로직
      const t = templates[0];
      setSelectedTemplateId(t.id);
    }
  }, [selectedTemplateId, templates]);

  if (!mounted) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const projectResponses = selectedProjectId ? responses.filter(r => r.projectId === selectedProjectId && r.templateId === selectedTemplate?.id) : [];

  // --- 템플릿 편집 핸들러 ---
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
    if (!confirm('정말로 이 템플릿을 삭제하시겠습니까? 관련 데이터는 유지되지만 템플릿은 사라집니다.')) return;
    try {
      await deleteTemplate(id);
      if (selectedTemplateId === id) setSelectedTemplateId(null);
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateQuestion = (qId: string, field: keyof Question, value: any) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      questions: editingTemplate.questions.map(q => 
        q.id === qId ? { ...q, [field]: value } : q
      )
    });
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      questions: editingTemplate.questions.filter(q => q.id !== qId)
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

  // --- 데이터 파싱 로직 (Excel Paste) ---
  const handlePasteProcess = () => {
    if (!pasteContent.trim() || !selectedProjectId || !selectedTemplate) return;

    const rows = pasteContent.trim().split('\n');
    const newResponses: SurveyResponse[] = [];
    
    rows.forEach((row, idx) => {
      const cols = row.split('\t').map(c => c.trim());
      if (cols.length < 2) return;

      const respondentId = cols[0]; 
      const answers: Answer[] = [];
      let colIdx = 1;

      selectedTemplate.questions.forEach(q => {
        if (selectedTemplate.type === 'COMPETENCY') {
          if (q.type === 'SCALE') {
            answers.push({
              questionId: q.id,
              preScore: Number(cols[colIdx]) || 0,
              score: Number(cols[colIdx + 1]) || 0
            });
            colIdx += 2;
          } else {
            answers.push({
              questionId: q.id,
              score: 0,
              text: cols[colIdx] || ''
            });
            colIdx += 1;
          }
        } else {
          if (q.type === 'SCALE') {
            answers.push({
              questionId: q.id,
              score: Number(cols[colIdx]) || 0,
            });
            colIdx += 1;
          } else {
            answers.push({
              questionId: q.id,
              score: 0,
              text: cols[colIdx] || ''
            });
            colIdx += 1;
          }
        }
      });

      newResponses.push({
        id: crypto.randomUUID(),
        projectId: selectedProjectId,
        templateId: selectedTemplate.id,
        respondentId,
        answers,
        createdAt: Date.now()
      });
    });

    newResponses.forEach(res => addResponse(res));
    setPasteContent('');
    setIsPasteDialogOpen(false);
    alert(`${newResponses.length}명의 데이터를 성공적으로 연동했습니다.`);
  };

  // --- 통계 분석 데이터 생성 ---
  const getAnalysisStats = () => {
    if (!selectedTemplate || projectResponses.length === 0) return [];
    const divisions = Array.from(new Set(selectedTemplate.questions.map(q => q.division)));
    return divisions.map(div => {
      const divQuestions = selectedTemplate.questions.filter(q => q.division === div);
      const preList: number[] = [];
      const postList: number[] = [];
      projectResponses.forEach(res => {
        divQuestions.forEach(q => {
          const ans = res.answers.find(a => a.questionId === q.id);
          if (ans) {
            preList.push(ans.preScore || 0);
            postList.push(ans.score || 0);
          }
        });
      });
      const avgPre = preList.length > 0 ? preList.reduce((a, b) => a + b, 0) / preList.length : 0;
      const avgPost = postList.length > 0 ? postList.reduce((a, b) => a + b, 0) / postList.length : 0;
      const gain = calculateHakeGain(avgPre, avgPost);
      const cohensD = calculateCohensD(preList, postList);
      return {
        division: div,
        pre: Number(avgPre.toFixed(2)),
        post: Number(avgPost.toFixed(2)),
        gain: Number(gain.toFixed(2)),
        cohensD: Number(cohensD.toFixed(2)),
        level: getAchievementLevel(gain)
      };
    });
  };

  const analysisStats = getAnalysisStats();

  const handleRunAIAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const summary = generateAIExpertReport(projects, aggregatedStats, responses);
      setAiSummary(summary);
      setIsAnalyzing(false);
      setTimeout(() => {
        aiResultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 1500);
  };

  const handleAddDefaultTemplate = (type: SurveyType) => {
    const name = type === 'SATISFACTION' ? '공통 교육 만족도 설문' : '핵심 역량 성취도 진단';
    addTemplate({
      name,
      type,
      questions: createDefaultQuestions(type)
    });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* 1. 글로벌 헤더 & 탭 제어 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/20">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="size-8 text-blue-600" /> 설문 및 성과 관리
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">Statistical Analysis & Survey Intelligence</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {[
            { id: 'templates', label: '템플릿 설계', icon: Settings2 },
            { id: 'data', label: '데이터 연동', icon: TableIcon },
            { id: 'analysis', label: '성과 분석 리포트', icon: TrendingUp },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2",
                activeTab === tab.id ? "bg-white text-blue-600 shadow-lg" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="size-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="min-h-[700px]">
        {/* --- 템플릿 설계 탭 --- */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-[2rem] border-none shadow-xl bg-white sticky top-10">
                   <CardHeader>
                      <CardTitle className="text-lg font-black flex justify-between items-center">
                         템플릿 레지스트리
                          <Popover>
                            <PopoverTrigger className="size-8 p-1 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors">
                               <Plus className="size-4 text-slate-600" />
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2 rounded-2xl shadow-2xl bg-white border border-slate-100 z-50">
                               <div className="grid gap-1">
                                  <Button 
                                    variant="ghost" 
                                    className="justify-start font-bold gap-2 text-emerald-600 hover:bg-emerald-50"
                                    onClick={() => {
                                      const name = prompt('만족도 조사 템플릿 이름을 입력하세요:');
                                      if(name) addTemplate({ name, type: 'SATISFACTION', questions: [] });
                                    }}
                                  >
                                    <ClipboardCheck className="size-4" /> 만족도 조사 생성
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    className="justify-start font-bold gap-2 text-blue-600 hover:bg-blue-50"
                                    onClick={() => {
                                      const name = prompt('역량 진단 템플릿 이름을 입력하세요:');
                                      if(name) addTemplate({ name, type: 'COMPETENCY', questions: [] });
                                    }}
                                  >
                                    <Activity className="size-4" /> 사전사후 역량 진단 생성
                                  </Button>
                               </div>
                            </PopoverContent>
                          </Popover>
                      </CardTitle>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Formats</p>
                   </CardHeader>
                   <CardContent className="space-y-3">
                      {templates.map(t => (
                        <div 
                           key={t.id} 
                           onClick={() => { setSelectedTemplateId(t.id); setSurveyType(t.type); }}
                           className={cn(
                             "p-4 rounded-2xl cursor-pointer border transition-all group relative",
                             selectedTemplateId === t.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                           )}
                        >
                           <div className="flex justify-between items-start pr-8">
                             <div>
                               <p className="text-sm font-black truncate">{t.name}</p>
                               <div className="flex items-center gap-2 mt-1 opacity-60">
                                  <Badge className="text-[8px] h-4 px-1.5 bg-white/20 text-white border-none">{t.type}</Badge>
                                  <span className="text-[9px] font-bold uppercase">{t.questions.length || 0} Questions</span>
                                </div>
                             </div>
                           </div>
                           <Button 
                             onClick={(e) => handleDeleteTemplate(t.id, e)}
                             variant="ghost" 
                             size="icon" 
                             className="absolute top-4 right-2 size-7 text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                           >
                             <Trash2 className="size-3.5" />
                           </Button>
                        </div>
                      ))}
                   </CardContent>
                </Card>
             </div>

             <div className="lg:col-span-3">
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                    <CardHeader className="p-10 pb-6 border-b border-slate-50 flex flex-row items-center justify-between">
                       <div className="flex-1 mr-8">
                          <Input 
                            value={editingTemplate?.name || ''} 
                            onChange={(e) => setEditingTemplate(prev => prev ? {...prev, name: e.target.value} : null)}
                            className="text-2xl font-black bg-transparent border-none p-0 focus-visible:ring-0 h-auto"
                          />
                          <div className="flex items-center gap-3 mt-4">
                             <Button 
                               onClick={() => handleAddDefaultTemplate('SATISFACTION')}
                               variant="outline" 
                               size="sm" 
                               className="text-[10px] font-black h-7 rounded-lg border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                             >
                               만족도 문항 자동구성
                             </Button>
                             <Button 
                               onClick={() => handleAddDefaultTemplate('COMPETENCY')}
                               variant="outline" 
                               size="sm" 
                               className="text-[10px] font-black h-7 rounded-lg border-blue-100 text-blue-600 hover:bg-blue-50"
                             >
                               역량진단 문항 자동구성
                             </Button>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <Button variant="outline" className="rounded-xl h-12 font-black border-slate-200">데이터 구조화</Button>
                          <Button 
                            onClick={handleSaveTemplate}
                            className="rounded-xl h-12 px-8 bg-slate-900 font-black"
                          >
                            최종 저장
                          </Button>
                       </div>
                    </CardHeader>
                   <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                         {editingTemplate?.questions.map((q, idx) => (
                           <div key={q.id} className="p-8 group hover:bg-slate-50/50 transition-all flex gap-8">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                                 <span className="text-xs font-black text-slate-400">{idx + 1}</span>
                              </div>
                              <div className="flex-1 grid grid-cols-4 gap-4">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">구분</label>
                                    <Input 
                                      value={q.division} 
                                      onChange={(e) => handleUpdateQuestion(q.id, 'division', e.target.value)}
                                      className="h-10 rounded-xl bg-slate-100 border-none font-bold text-xs" 
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">주제</label>
                                    <Input 
                                      value={q.theme} 
                                      onChange={(e) => handleUpdateQuestion(q.id, 'theme', e.target.value)}
                                      className="h-10 rounded-xl bg-slate-100 border-none font-bold text-xs" 
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">문항 내용</label>
                                    <Input 
                                      value={q.content} 
                                      onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)}
                                      className="h-10 rounded-xl bg-slate-100 border-none font-bold text-xs" 
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">문항 유형</label>
                                    <Select 
                                      value={q.type || 'SCALE'} 
                                      onValueChange={(val: any) => handleUpdateQuestion(q.id, 'type', val)}
                                    >
                                      <SelectTrigger className={cn(
                                        "h-10 rounded-xl border-none font-black text-[10px] transition-colors",
                                        q.type === 'TEXT' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                                      )}>
                                         <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border-none shadow-xl bg-white">
                                         <SelectItem value="SCALE" className="font-bold text-xs">객관식 (5점척도)</SelectItem>
                                         <SelectItem value="TEXT" className="font-bold text-xs text-emerald-600">주관식 (서술형)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                 </div>
                              </div>
                              <Button 
                                onClick={() => handleDeleteQuestion(q.id)}
                                variant="ghost" 
                                size="icon" 
                                className="self-center text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black"
                              >
                                 <Trash2 className="size-4" />
                              </Button>
                           </div>
                         ))}
                         <div className="p-10 flex flex-col items-center gap-6">
                            <div className="flex items-center gap-4 w-full max-w-2xl">
                               <Button 
                                 onClick={() => handleAddQuestion('SCALE')}
                                 variant="ghost" 
                                 className="flex-1 h-20 rounded-2xl border-2 border-dashed border-blue-200 text-blue-600 font-black gap-3 hover:bg-blue-50 hover:border-blue-300 transition-all flex flex-col items-center justify-center"
                               >
                                  <div className="flex items-center gap-2">
                                     <Plus className="size-5" /> <span className="text-sm">객관식 문항 추가</span>
                                  </div>
                                  <span className="text-[10px] opacity-60 font-bold uppercase tracking-tight">5-Point Likert Scale</span>
                               </Button>
                               <Button 
                                 onClick={() => handleAddQuestion('TEXT')}
                                 variant="ghost" 
                                 className="flex-1 h-20 rounded-2xl border-2 border-dashed border-emerald-200 text-emerald-600 font-black gap-3 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex flex-col items-center justify-center"
                               >
                                  <div className="flex items-center gap-2">
                                     <MessageSquare className="size-5" /> <span className="text-sm">주관식 문항 추가</span>
                                  </div>
                                  <span className="text-[10px] opacity-60 font-bold uppercase tracking-tight">Descriptive Text Input</span>
                               </Button>
                            </div>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
                               <AlertCircle className="size-3" /> 유형에 따라 데이터 연동을 위한 엑셀 컬럼 구성이 달라집니다
                            </p>
                         </div>
                      </div>
                   </CardContent>
                </Card>
             </div>
          </div>
        )}

        {/* --- 데이터 연동 탭 --- */}
        {activeTab === 'data' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5">
             <div className="flex flex-wrap items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                 <div className="space-y-1 min-w-[300px]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">사업 대상 선택</label>
                    <select 
                      value={selectedProjectId || ''} 
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-base font-black text-slate-700 outline-none ring-1 ring-slate-100 focus:ring-blue-600"
                    >
                       <option value="">사업을 선택해 주세요...</option>
                       {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 
                 {selectedProjectId && (
                    <div className="flex gap-4 ml-auto">
                       <Button 
                         variant="outline" 
                         onClick={() => setIsPasteDialogOpen(true)}
                         className="h-14 px-8 rounded-2xl border-blue-100 text-blue-600 font-black gap-3 group"
                       >
                          <FileSpreadsheet className="size-5 group-hover:rotate-12 transition-transform" /> 엑셀 붙여넣기 연동
                       </Button>
                       <Button 
                         onClick={() => {
                            if(confirm('데이터를 초기화하시겠습니까?')) clearProjectResponses(selectedProjectId);
                         }}
                         variant="outline"
                         className="h-14 rounded-2xl border-slate-200 text-slate-400 font-black"
                       >
                          <Trash2 className="size-5" />
                       </Button>
                    </div>
                 )}
             </div>

             {selectedProjectId ? (
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                   <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left">
                         <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                               <th className="p-6 text-[10px] font-black text-slate-400 uppercase w-20 text-center">No.</th>
                               <th className="p-6 text-[10px] font-black text-slate-900 uppercase min-w-[140px]">학습자 식별자</th>
                               {selectedTemplate?.questions.map((q, i) => (
                                 <th key={q.id} className="p-6 text-[10px] font-black text-slate-500 uppercase min-w-[180px]">
                                    <div className="flex flex-col gap-0.5">
                                       <span className="text-blue-500">Q{i+1}</span>
                                       <span className="truncate w-32">{q.content}</span>
                                    </div>
                                 </th>
                               ))}
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                            {projectResponses.map((res, rIdx) => (
                              <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group">
                                 <td className="p-6 text-center text-xs font-black text-slate-300">{rIdx + 1}</td>
                                 <td className="p-6 font-black text-slate-700">{res.respondentId}</td>
                                 {selectedTemplate?.questions.map(q => {
                                    const ans = res.answers.find(a => a.questionId === q.id);
                                    return (
                                      <td key={q.id} className="p-6">
                                         {selectedTemplate.type === 'COMPETENCY' ? (
                                           <div className="flex items-center gap-3">
                                              <div className="flex flex-col items-center">
                                                 <span className="text-[8px] font-black text-slate-400">PRE</span>
                                                 <Badge className="bg-slate-100 text-slate-500 border-none font-black">{ans?.preScore || 0}</Badge>
                                              </div>
                                              <ArrowRight className="size-3 text-slate-300" />
                                              <div className="flex flex-col items-center">
                                                 <span className="text-[8px] font-black text-blue-400">POST</span>
                                                 <Badge className="bg-blue-600 text-white border-none font-black">{ans?.score || 0}</Badge>
                                              </div>
                                           </div>
                                         ) : (
                                           <div className="flex flex-col gap-1">
                                              <Badge className="bg-emerald-100 text-emerald-600 border-none font-black w-fit">{ans?.score || 0}</Badge>
                                              {ans?.text && <p className="text-[10px] text-slate-400 truncate w-32">{ans.text}</p>}
                                           </div>
                                         )}
                                      </td>
                                    )
                                 })}
                              </tr>
                            ))}
                            {projectResponses.length === 0 && (
                              <tr>
                                 <td colSpan={100} className="p-24 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                       <Activity className="size-16" />
                                       <p className="font-black uppercase tracking-widest text-sm">연동된 데이터가 없습니다. 상단의 엑셀 연동 기능을 사용하세요.</p>
                                    </div>
                                 </td>
                              </tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </Card>
             ) : (
                <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                   <Users className="size-20 text-slate-100 mb-6" />
                   <p className="text-slate-300 font-black uppercase tracking-[0.3em]">먼저 대상을 선정해 주세요</p>
                </div>
             )}
          </div>
        )}

        {/* --- 성과 분석 대시보드 탭 --- */}
        {activeTab === 'analysis' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-5">
             {/* 1. 고도화된 필터바 */}
             <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                <div className="flex flex-wrap items-end gap-6">
                   <div className="flex-1 min-w-[200px] space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">교육 기간 범위</label>
                      <div className="flex items-center gap-2">
                         <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold" />
                         <span className="text-slate-300">~</span>
                         <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none px-4 font-bold" />
                      </div>
                   </div>
                   <div className="flex-1 min-w-[200px] space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">협력업체별 조회</label>
                      <select 
                        value={selectedPartnerId || ''} 
                        onChange={(e) => setSelectedPartnerId(e.target.value || null)}
                        className="w-full h-12 px-4 bg-slate-50 rounded-xl font-bold"
                      >
                         <option value="">전체 업체</option>
                         {partners.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                   </div>
                   <Button 
                     onClick={handleRunAIAnalysis}
                     disabled={isAnalyzing}
                     className="h-12 px-8 rounded-xl bg-blue-600 font-black gap-2 shadow-lg shadow-blue-100"
                   >
                      {isAnalyzing ? <Activity className="size-4 animate-spin" /> : <Wand2 className="size-4" />} 리포트 생성
                   </Button>
                </div>
             </Card>

             {/* 2. 시각화 섹션 */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-[3rem] border-none shadow-xl bg-white p-10 h-[500px]">
                   <CardHeader className="p-0 mb-8">
                      <CardTitle className="text-xl font-black flex items-center gap-2">
                         <TrendingUp className="size-5 text-blue-600" /> 사업 계층별 성과 지표 (LV1-4)
                      </CardTitle>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Hierarchical Performance Index</p>
                   </CardHeader>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={Object.entries(aggregatedStats).slice(0, 10).map(([id, score]) => ({
                           name: (projects.find(p => p.id === id)?.name || 'Unknown').slice(0, 10) + '...',
                           score: Number(score.toFixed(2))
                         }))}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                            <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900 }} />
                            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                               {Object.entries(aggregatedStats).map((_, i) => (
                                 <Cell key={i} fill={i % 2 === 0 ? '#3b82f6' : '#94a3b8'} />
                               ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </Card>

                <Card className="rounded-[3rem] border-none shadow-xl bg-slate-900 text-white p-10 h-[500px] flex flex-col">
                   <div className="mb-8">
                      <CardTitle className="text-xl font-black flex items-center gap-2">
                         <Activity className="size-5 text-blue-400" /> 주요 이상치 탐지
                      </CardTitle>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Anomalies Detected</p>
                   </div>
                   <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(aggregatedStats)
                        .filter(([_, score]) => (score < 3.0 && score > 0) || score > 4.8)
                        .map(([id, score], i) => (
                           <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                              <div className="flex justify-between items-center">
                                 <Badge className={cn("text-[8px] font-black border-none", score < 3.0 ? "bg-red-500" : "bg-emerald-500")}>
                                    {score < 3.0 ? "주의" : "최우수"}
                                 </Badge>
                                 <span className="text-xs font-black">{score.toFixed(2)}점</span>
                              </div>
                              <p className="text-xs font-bold text-slate-300 truncate">{projects.find(p => p.id === id)?.name}</p>
                           </div>
                        ))}
                      {Object.values(aggregatedStats).filter(s => (s < 3.0 && s > 0) || s > 4.8).length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                           <Check className="size-10 mb-2" />
                           <p className="text-[11px] font-black uppercase">현재 감지된<br/>이상치가 없습니다</p>
                        </div>
                      )}
                   </div>
                </Card>
             </div>

             {/* 3. AI 전문가 리포트 섹션 */}
             {aiSummary && (
                <div ref={aiResultRef} className="animate-in slide-in-from-bottom-5">
                   <Card className="rounded-[3rem] border-none shadow-2xl bg-white p-12 overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-12 opacity-5">
                         <ClipboardCheck className="size-40" />
                      </div>
                      <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-50">
                         <div className="flex items-center gap-3">
                            <MessageSquare className="size-6 text-blue-600" />
                            <CardTitle className="text-2xl font-black">15년차 시니어 컨설턴트 성과 보고서</CardTitle>
                         </div>
                         <Badge className="bg-slate-900 text-white font-black px-6 h-10 rounded-full text-[10px] tracking-widest uppercase">Expert Analysis</Badge>
                      </div>
                      
                      <div className="prose prose-slate max-w-none prose-h3:text-blue-600 prose-h3:font-black prose-p:font-bold prose-p:text-slate-600 pb-10">
                         <div className="whitespace-pre-wrap leading-relaxed text-slate-600 font-medium text-lg italic">
                            {aiSummary}
                         </div>
                      </div>

                      <div className="pt-8 border-t border-slate-50 flex justify-end gap-3">
                         <Button variant="ghost" className="h-14 px-8 rounded-2xl font-black text-slate-400">데이터 내보내기</Button>
                         <Button className="h-14 px-10 rounded-2xl bg-slate-900 font-black shadow-xl shadow-slate-900/20 gap-2">
                           <Download className="size-4" /> PDF 리포트 저장
                         </Button>
                      </div>
                   </Card>
                </div>
             )}
          </div>
        )}
      </main>

      {/* --- Excel Paste Dialog --- */}
      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
         <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="bg-blue-600 text-white p-8">
               <DialogTitle className="text-2xl font-black">엑셀 데이터 직접 붙여넣기</DialogTitle>
               <DialogDescription className="text-blue-100 font-medium">
                  엑셀(Excel)에서 데이터를 선택하여 복사한 후, 아래 입력창에 붙여넣어 주세요.<br/>
                  순서: <span className="underline">[학습자명] | [사전] | [사후]</span> 나열 구조 지원
               </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
               <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <AlertCircle className="size-5 text-blue-600 shrink-0 mt-1" />
                  <div className="text-[11px] font-bold text-blue-700 leading-relaxed">
                     • 헤더행 없이 실제 데이터만 복사해 주세요.<br/>
                     • 현재 템플릿(문항 {selectedTemplate?.questions.length || 0}개)에 맞춰 문항당 사전/사후 2개 컬럼씩 필요합니다.<br/>
                     • 탭 구분(Tab-separated) 형식을 자동으로 감지합니다.
                  </div>
               </div>
               <Textarea 
                 placeholder="여기에 붙여넣어 주세요..."
                 value={pasteContent}
                 onChange={(e) => setPasteContent(e.target.value)}
                 className="h-64 rounded-2xl border-slate-200 font-mono text-xs p-6 shadow-inner bg-slate-50/50 focus-visible:ring-blue-100"
               />
            </div>
            <DialogFooter className="p-8 bg-slate-50 flex gap-3">
               <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-slate-400" onClick={() => setIsPasteDialogOpen(false)}>취소</Button>
               <Button className="flex-[2] h-14 rounded-2xl bg-blue-600 font-black shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all" onClick={handlePasteProcess}>연동 데이터 처리 실행</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
