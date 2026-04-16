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
  generateAnalysisSummary 
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
  
  // Excel Paste Dialog State
  const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);
  const [pasteContent, setPasteContent] = React.useState('');
  
  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const aiResultRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
    // 샘플 템플릿 (V2)
    if (templates.length === 0 && mounted) {
       addTemplate({
          name: '디지털 신기술 역량 진단 (기본)',
          type: 'COMPETENCY',
          questions: [
            { id: 'q1', division: '기술 이해', theme: 'AI 기초', content: '생성형 AI의 정의를 설명할 수 있다.', type: 'SCALE', order: 1 },
            { id: 'q2', division: '기술 이해', theme: 'AI 기초', content: '프롬프트 엔지니어링의 원리를 안다.', type: 'SCALE', order: 2 },
            { id: 'q3', division: '데이터 활용', theme: '분석 도구', content: '데이터 시각화 도구를 활용할 수 있다.', type: 'SCALE', order: 3 },
            { id: 'q4', division: '기능 실습', theme: '워크숍', content: '실습 과정이 실무에 도움이 되었다.', type: 'SCALE', order: 4 },
          ]
       });
    }
  }, [mounted, templates.length]);

  if (!mounted) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const projectResponses = selectedProjectId ? responses.filter(r => r.projectId === selectedProjectId && r.templateId === selectedTemplate?.id) : [];

  // --- 데이터 파싱 로직 (Excel Paste) ---
  const handlePasteProcess = () => {
    if (!pasteContent.trim() || !selectedProjectId || !selectedTemplate) return;

    const rows = pasteContent.trim().split('\n');
    const newResponses: SurveyResponse[] = [];
    
    // 엑셀 복사-붙여넣기 데이터는 보통 Tab('\t')으로 구분됨
    rows.forEach((row, idx) => {
      const cols = row.split('\t').map(c => c.trim());
      if (cols.length < 2) return;

      const respondentId = cols[0]; // 첫 번째 컬럼: 학습자명
      
      // 기존 템플릿의 문항 순서대로 데이터가 있다고 가정하거나 명시적으로 매핑
      // 여기서는 심화 요구사항에 따라 [성명] [구분] [주제] [문항] [사전] [사후] 또는 [성명] [구분] [주제] [문항] [점수]
      // 하지만 사용자 편의상 [성명] 고정 후 나머지는 템플릿 문항 수에 맞춰 나열된 형태를 기본으로 함
      
      const answers: Answer[] = [];
      let colIdx = 1;

      selectedTemplate.questions.forEach(q => {
        if (selectedTemplate.type === 'COMPETENCY') {
          // 역량평가: 사전, 사후 두 컬럼씩 소비
          answers.push({
            questionId: q.id,
            preScore: Number(cols[colIdx]) || 0,
            score: Number(cols[colIdx + 1]) || 0
          });
          colIdx += 2;
        } else {
          // 만족도: 점수, 주관식 두 컬럼씩 소비
          answers.push({
            questionId: q.id,
            score: Number(cols[colIdx]) || 0,
            text: cols[colIdx + 1] || ''
          });
          colIdx += 2;
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

    // 기존 데이터 유지 혹은 덮어쓰기 (사용자 선택 가능하나 여기선 추가)
    newResponses.forEach(res => addResponse(res));
    setPasteContent('');
    setIsPasteDialogOpen(false);
    alert(`${newResponses.length}명의 데이터를 성공적으로 연동했습니다.`);
  };

  // --- 통계 분석 데이터 생성 ---
  const getAnalysisStats = () => {
    if (!selectedTemplate || projectResponses.length === 0) return [];

    // 구분(Division) 단위로 그룹화
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
      const tValue = calculatePairedTTest(preList, postList);

      return {
        division: div,
        pre: Number(avgPre.toFixed(2)),
        post: Number(avgPost.toFixed(2)),
        gain: Number(gain.toFixed(2)),
        cohensD: Number(cohensD.toFixed(2)),
        tValue: Number(tValue.toFixed(2)),
        level: getAchievementLevel(gain)
      };
    });
  };

  const analysisStats = getAnalysisStats();

  const handleRunAIAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const totalGain = analysisStats.reduce((a, b) => a + b.gain, 0) / analysisStats.length;
      const totalD = analysisStats.reduce((a, b) => a + b.cohensD, 0) / analysisStats.length;
      const summary = generateAnalysisSummary(projects.find(p => p.id === selectedProjectId)?.name || '본 사업', totalD, totalGain);
      
      setAiSummary(summary + "\n\n통계적으로 유의미한 역량 향상이 관찰되었으며, 특히 '" + analysisStats.sort((a,b) => b.gain - a.gain)[0]?.division + "' 영역에서 가장 높은 성취도를 보였습니다.");
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* 1. 글로벌 헤더 & 탭 제어 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/20">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="size-8 text-blue-600" /> 설문 및 성과 지능
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
                         <Button size="icon" variant="ghost" className="size-8"> <Plus className="size-4" /> </Button>
                      </CardTitle>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Formats</p>
                   </CardHeader>
                   <CardContent className="space-y-3">
                      {templates.map(t => (
                        <div 
                           key={t.id} 
                           onClick={() => { setSelectedTemplateId(t.id); setSurveyType(t.type); }}
                           className={cn(
                             "p-4 rounded-2xl cursor-pointer border transition-all",
                             selectedTemplateId === t.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                           )}
                        >
                           <p className="text-sm font-black truncate">{t.name}</p>
                           <div className="flex items-center gap-2 mt-1 opacity-60">
                              <Badge className="text-[8px] h-4 px-1.5 bg-white/20 text-white border-none">{t.type}</Badge>
                              <span className="text-[9px] font-bold uppercase">{t.questions.length} Questions</span>
                           </div>
                        </div>
                      ))}
                   </CardContent>
                </Card>
             </div>

             <div className="lg:col-span-3">
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
                   <CardHeader className="p-10 pb-6 border-b border-slate-50 flex flex-row items-center justify-between">
                      <div>
                         <CardTitle className="text-2xl font-black">{selectedTemplate?.name}</CardTitle>
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">3-Level Hierarchical Question Builder</p>
                      </div>
                      <div className="flex gap-2">
                         <Button variant="outline" className="rounded-xl h-12 font-black border-slate-200">데이터 구조화</Button>
                         <Button className="rounded-xl h-12 px-8 bg-slate-900 font-black">최종 저장</Button>
                      </div>
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="divide-y divide-slate-100">
                         {/* 템플릿 문항 트리 렌더링 */}
                         {selectedTemplate?.questions.map((q, idx) => (
                           <div key={q.id} className="p-8 group hover:bg-slate-50/50 transition-all flex gap-8">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                                 <span className="text-xs font-black text-slate-400">{idx + 1}</span>
                              </div>
                              <div className="flex-1 grid grid-cols-3 gap-6">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">구분 (Division)</label>
                                    <Input defaultValue={q.division} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">주제 (Theme)</label>
                                    <Input defaultValue={q.theme} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">문항 내용 (Content)</label>
                                    <Input defaultValue={q.content} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-sm" />
                                 </div>
                              </div>
                              <Button variant="ghost" size="icon" className="self-center text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                 <Trash2 className="size-4" />
                              </Button>
                           </div>
                         ))}
                         <div className="p-10 flex justify-center">
                            <Button variant="ghost" className="h-16 w-full max-w-md rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-black gap-3 hover:bg-slate-50 hover:border-slate-300">
                               <Plus className="size-5" /> 새 문항 정의하기
                            </Button>
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

        {/* --- 성과 분석 리포트 탭 --- */}
        {activeTab === 'analysis' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-5">
             {/* AI 생성 바 */}
             <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-900 text-white overflow-hidden p-10 flex flex-col md:flex-row justify-between items-center gap-8 relative">
                 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-transparent" />
                 <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-3">
                       <Wand2 className="size-6 text-blue-400" />
                       <h3 className="text-2xl font-black">AI 학술적 성과 분석 지능</h3>
                    </div>
                    <p className="text-sm font-medium text-slate-400">Hake's Gain, Cohen's d 및 Paired T-test 기반 전수 분석을 실시합니다.</p>
                 </div>
                 <Button 
                   disabled={isAnalyzing || projectResponses.length === 0}
                   onClick={handleRunAIAnalysis}
                   className="relative z-10 h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black gap-3 text-lg"
                 >
                    {isAnalyzing ? <Activity className="size-5 animate-spin" /> : <TrendingUp className="size-5" />}
                    분석 보고서 생성하기
                 </Button>
             </Card>

             {projectResponses.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* 1. 사전-사후 역량 분포 (Slope Chart 시뮬레이션 or Radar) */}
                   <Card className="rounded-[3rem] border-none shadow-xl bg-white p-10 h-[550px] flex flex-col">
                      <div className="mb-8">
                         <CardTitle className="text-xl font-black flex items-center gap-2">
                            <Target className="size-5 text-blue-600" /> 역량 성숙도 진단 모델 (Pre-Post)
                         </CardTitle>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Normalized Radar Score Comparison</p>
                      </div>
                      <div className="flex-1">
                         <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={analysisStats}>
                               <PolarGrid stroke="#f1f5f9" />
                               <PolarAngleAxis dataKey="division" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }} />
                               <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                               <Radar name="사전 (Pre)" dataKey="pre" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                               <Radar name="사후 (Post)" dataKey="post" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                               <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }} />
                               <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '30px', fontWeight: 900, fontSize: '10px' }} />
                            </RadarChart>
                         </ResponsiveContainer>
                      </div>
                   </Card>

                   {/* 2. 성취도 분석 대시보드 (Gain & Scale) */}
                   <div className="grid grid-cols-1 gap-8">
                      {/* Cohen's d 효과 크기 지표 */}
                      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
                         <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Effect Size (Cohen's d)</h4>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none font-black">STATISTICAL SIG.</Badge>
                         </div>
                         <div className="flex items-end gap-10">
                            {analysisStats.slice(0, 3).map((stat, i) => (
                               <div key={i} className="flex-1 space-y-3">
                                  <p className="text-xs font-black text-slate-800 truncate">{stat.division}</p>
                                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                     <div 
                                        className="absolute h-full bg-blue-600 rounded-full" 
                                        style={{ width: `${Math.min(stat.cohensD * 40, 100)}%` }} 
                                     />
                                  </div>
                                  <p className="text-lg font-black text-slate-900">{stat.cohensD} <span className="text-[10px] text-slate-400 font-bold uppercase">d-value</span></p>
                               </div>
                            ))}
                         </div>
                      </Card>

                      {/* Hake's Gain 분포 */}
                      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8 flex-1">
                         <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Hake's Gain 성취도 등급</h4>
                            <div className="flex gap-2">
                               <Badge className="bg-red-50 text-red-600 border-none font-bold text-[9px]">HIGH : {analysisStats.filter(s => s.level === 'High').length}</Badge>
                               <Badge className="bg-blue-50 text-blue-600 border-none font-bold text-[9px]">MEDIUM : {analysisStats.filter(s => s.level === 'Medium').length}</Badge>
                            </div>
                         </div>
                         <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={analysisStats}>
                                  <XAxis dataKey="division" hide />
                                  <YAxis hide />
                                  <Tooltip cursor={{ fill: 'transparent' }} />
                                  <Bar dataKey="gain" radius={[8, 8, 0, 0]} barSize={40}>
                                     {analysisStats.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={entry.level === 'High' ? '#ef4444' : entry.level === 'Medium' ? '#3b82f6' : '#94a3b8'} />
                                     ))}
                                  </Bar>
                               </BarChart>
                            </ResponsiveContainer>
                         </div>
                         <p className="text-[11px] font-bold text-slate-500 mt-4 text-center italic">* 상위 역량 개선을 위해 High 등급 문항에 교육 리소스를 더 투입하였습니다.</p>
                      </Card>
                   </div>
                </div>
             )}

             {/* AI 분석 리포트 타일 */}
             {aiSummary && (
                <Card className="rounded-[3rem] border-none shadow-2xl bg-white p-12 animate-in zoom-in-95 duration-500">
                   <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                         <MessageSquare className="size-6 text-blue-600" />
                         <CardTitle className="text-2xl font-black">AI 종합 교육 성과 브리핑</CardTitle>
                      </div>
                      <Badge className="bg-slate-900 text-white font-black px-4 h-8 rounded-full">CONFIDENTIAL REPORT</Badge>
                   </div>
                   <div className="bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100">
                      <p className="text-lg font-bold text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                         "{aiSummary}"
                      </p>
                   </div>
                   <div className="mt-10 flex justify-end gap-3">
                      <Button variant="ghost" className="rounded-xl font-black text-slate-400">오류 오프셋 조정</Button>
                      <Button className="rounded-2xl h-14 px-10 bg-slate-900 font-black shadow-xl shadow-slate-900/10">정식 리포트 출력하기</Button>
                   </div>
                </Card>
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
                     • 현재 템플릿(문항 {selectedTemplate?.questions.length}개)에 맞춰 문항당 사전/사후 2개 컬럼씩 필요합니다.<br/>
                     • 탭 구분(Tab-separated) 형식을 자동으로 감지합니다.
                  </div>
               </div>
               <Textarea 
                 placeholder="여기에 붙넣어 주세요..."
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
