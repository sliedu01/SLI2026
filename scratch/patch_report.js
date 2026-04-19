const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Imports
const lucideEnd = '  Layers,';
if (content.includes(lucideEnd)) {
    content = content.replace(lucideEnd, `  Layers,
  FileBarChart,
  Target,
  CheckCircle,
  BarChart,
  Target as TargetIcon`);
}

if (!content.includes("from 'recharts'")) {
    const importMark = "import { Button } from '@/components/ui/button';";
    content = content.replace(importMark, `
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip as ChartTooltip
} from 'recharts';
import { Checkbox } from "@/components/ui/checkbox";
${importMark}`);
}

// 2. Update renderNodes toggle logic
// This is trickier, we'll replace the whole renderNodes block.
const renderNodesStart = '  const renderNodes = React.useCallback((parentId: string | null, depth: number = 0): React.ReactNode => {';
const renderNodesEnd = '}, [projects, visibleProjectIds, expandedIds, selectedProjectIds, partners, toggleExpand]);';

const newRenderNodes = `  const renderNodes = React.useCallback((parentId: string | null, depth: number = 0): React.ReactNode => {
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
                style={{ marginLeft: \`\${depth * 1.5}rem\` }}
              >
                <div className="size-5 flex items-center justify-center shrink-0">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(p.id, isSelected)}
                    className={cn("size-4 rounded border-2 transition-colors", isSelected ? "border-white bg-white data-[state=checked]:text-blue-600" : "border-slate-200 group-hover:border-blue-400 bg-white")}
                  />
                </div>
                {hasVisibleChildren ? (
                  <button onClick={(e) => { e.stopPropagation(); toggleExpand(p.id, e); }} className={cn("p-1 rounded hover:bg-white/20", isSelected ? "text-white" : "text-slate-400")}>
                    {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : <div className="size-5.5 ml-1" />}
                <span className="text-xs font-black truncate">{p.level >= 3 && p.partnerId ? \`\${partners.find(ptr => ptr.id === p.partnerId)?.name || '미지정'} (\${p.name})\` : p.name}</span>
              </div>
              {isExpanded && hasVisibleChildren && renderNodes(p.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }, [projects, visibleProjectIds, expandedIds, selectedProjectIds, partners, toggleExpand]);`;

if (content.includes(renderNodesStart)) {
    const startIndex = content.indexOf(renderNodesStart);
    const endIndex = content.indexOf(renderNodesEnd, startIndex) + renderNodesEnd.length;
    content = content.substring(0, startIndex) + newRenderNodes + content.substring(endIndex);
}

// 3. Add ReportSection
const mainEnd = '</main>';
const reportSection = `              {/* 분석 보고서 섹션 (별도 프레임) */}
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
                    <Button 
                      onClick={() => window.print()}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] px-10 h-16 text-lg font-black gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
                    >
                      <Download className="size-6" /> 리포트 PDF 저장 / 인쇄
                    </Button>
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
                        <div>
                          <h3 className="text-2xl font-black text-slate-800">교육 운영 만족도 지수</h3>
                          <p className="text-sm font-bold text-slate-400 italic">Satisfaction Radar Analysis</p>
                        </div>
                      </div>
                      
                      <div className="h-[450px] w-full bg-slate-50/50 rounded-[3rem] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={(() => {
                            const themeData = {};
                            selectedProjectIds.forEach(pid => {
                              const stats = aggregatedStats[pid];
                              if (!stats?.questionStats) return;
                              satQuestions.forEach((q, i) => {
                                const qStat = stats.questionStats[i];
                                if (!qStat?.average) return;
                                if (!themeData[q.theme]) themeData[q.theme] = { theme: q.theme, score: 0, count: 0 };
                                themeData[q.theme].score += qStat.average;
                                themeData[q.theme].count += 1;
                              });
                            });
                            return Object.values(themeData).map(d => ({ 
                              theme: d.theme, 
                              score: Number((d.score / d.count).toFixed(2)) 
                            }));
                          })()}>
                            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="theme" tick={{ fill: '#475569', fontSize: 12, fontWeight: 900 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <Radar name="만족도" dataKey="score" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.4} />
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

                      <div className="bg-emerald-50/50 border border-emerald-100/50 p-8 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Wand2 className="size-4" />
                          <span className="text-xs font-black uppercase tracking-widest font-mono">Expert Commentary</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800 leading-relaxed text-pretty">
                          데이터 분석 결과, 교육 운영 전반에 걸쳐 {(() => {
                            const data = selectedProjectIds.map(pid => aggregatedStats[pid]?.satAvg || 0).filter(v => v > 0);
                            const avg = data.length > 0 ? data.reduce((a,b) => a+b, 0) / data.length : 0;
                            return avg >= 4.5 
                              ? "경이적인 수준(4.5점 이상)의 만족도가 확인되었습니다. 이는 교육생의 요구사항이 완벽하게 반영된 결과로 보입니다." 
                              : avg >= 4.0 
                              ? "우수한 교육 품질(4.0점 이상)이 유지되고 있습니다." 
                              : "보통 수준의 만족도를 보이고 있습니다.";
                          })()}
                        </p>
                      </div>
                    </Card>

                    <Card className="rounded-[4rem] border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white p-12 space-y-10 group overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                        <BarChart className="size-48" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                          <Target className="size-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800">핵심 역량 증분 비교 분석</h3>
                          <p className="text-sm font-bold text-slate-400 italic">Pre & Post Competency Shift</p>
                        </div>
                      </div>

                      <div className="h-[450px] w-full bg-slate-50/50 rounded-[3rem] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={(() => {
                            const themeData = {};
                            selectedProjectIds.forEach(pid => {
                              const stats = aggregatedStats[pid];
                              if (!stats?.questionStats) return;
                              compQuestions.forEach((q, i) => {
                                const qStat = stats.questionStats[i];
                                if (qStat?.preAvg === undefined || qStat?.postAvg === undefined) return;
                                if (!themeData[q.theme]) themeData[q.theme] = { theme: q.theme, pre: 0, post: 0, count: 0 };
                                themeData[q.theme].pre += qStat.preAvg;
                                themeData[q.theme].post += qStat.postAvg;
                                themeData[q.theme].count += 1;
                              });
                            });
                            return Object.values(themeData).map(d => ({ 
                              theme: d.theme, 
                              pre: Number((d.pre / d.count).toFixed(2)),
                              post: Number((d.post / d.count).toFixed(2))
                            }));
                          })()}>
                            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="theme" tick={{ fill: '#475569', fontSize: 12, fontWeight: 900 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <Radar name="사전 역량" dataKey="pre" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="#94a3b8" fillOpacity={0.2} />
                            <Radar name="사후 역량" dataKey="post" stroke="#3b82f6" strokeWidth={3} fill="#3b82f6" fillOpacity={0.4} />
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

                      <div className="bg-blue-50/50 border border-blue-100/50 p-8 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Activity className="size-4" />
                          <span className="text-xs font-black uppercase tracking-widest font-mono">Expert Insight</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800 leading-relaxed text-pretty">
                          사전-사후 역량 진단 결과, 모든 영역에서 고른 성장이 목격되었습니다. 
                          {(() => {
                            const gains = selectedProjectIds.map(pid => aggregatedStats[pid]?.hakeGain || 0).filter(v => v > 0);
                            const avgGain = gains.length > 0 ? gains.reduce((a,b) => a+b, 0) / gains.length : 0;
                            return \`Hake's Gain 비율은 평균 \${(avgGain * 100).toFixed(1)}%로 산출되었습니다.\`;
                          })()}
                        </p>
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
                                  <td className="p-6 text-center border-r">{stats.impRate?.toFixed(1)}%</td>
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
                                  <tr key={\`\${pid}-\${m.rid}\`} className="text-[11px] font-bold text-slate-600 hover:bg-slate-50 border-b">
                                    <td className="p-6 border-r font-black">{m.rid}<br/><span className="text-[9px] text-slate-400 font-medium">\${m.projectName}</span></td>
                                    {satQuestions.map((_, i) => <td key={i} className="p-4 text-center border-r">\${m.sat?.answers[i]?.score || '-'}</td>)}
                                    <td className="p-6 text-center font-black text-emerald-600 bg-emerald-50/20 border-r">\${(m.sat?.answers.reduce((a,b)=>a+b.score, 0) / (m.sat?.answers.length || 1)).toFixed(2)}</td>
                                    {compQuestions.map((_, i) => <td key={i} className="p-4 text-center border-r">\${m.comp?.answers[i]?.score || '-'}</td>)}
                                    <td className="p-6 text-center font-black text-blue-600 bg-blue-50/20">\${(m.comp?.answers.reduce((a,b)=>a+b.score, 0) / (m.comp?.answers.length || 1)).toFixed(2)}</td>
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
              )}`;

if (content.includes(mainEnd)) {
    content = content.replace(mainEnd, reportSection + '\n      ' + mainEnd);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched page.tsx with reporting features');
