'use client';

import * as React from 'react';
import { ReportStats, ExpertReportGenerator } from '@/lib/stat-utils';
import { Project } from '@/store/use-project-store';
import { SurveyResponse, SurveyTemplate } from '@/store/use-survey-store';
import { SatisfactionRadarChart, CompetencyBarChart } from '@/components/surveys/survey-charts';

interface ExpertReportTemplateProps {
  stats: ReportStats;
  projects: Project[];
  projectName?: string;
  chartImages: {
    radar?: string;
    improvement?: string;
  };
  organizationName?: string;
  responses?: SurveyResponse[];
  radarData?: any[];
  improvementData?: any[];
  isConsolidated?: boolean;
  partnerName?: string;
  locationName?: string;
  dateRange?: string;
  templates?: SurveyTemplate[];
}

export function ExpertReportTemplate({
  stats,
  projects,
  projectName,
  chartImages,
  organizationName = "SLI교육그룹",
  responses = [],
  templates = [],
  radarData = [],
  improvementData = [],
  isConsolidated = false,
  partnerName,
  locationName,
  dateRange
}: ExpertReportTemplateProps) {
  const [mounted, setMounted] = React.useState(false);
  const [today, setToday] = React.useState('');

  React.useEffect(() => {
    setMounted(true);
    setToday(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  const mainProjectName = projectName || projects.find(p => p.level === 1)?.name || projects[0]?.name || '전체 사업';

  // 프로젝트 명의 중복 단어(분석 분석 보고서 등) 정제 및 표준 표기법 보정
  const cleanProjectTitle = React.useMemo(() => {
    let title = mainProjectName;
    title = title.replace(/\s*분석\s*분석\s*보고서$/, ' 분석 보고서');
    title = title.replace(/\s*분석\s*보고서\s*분석\s*보고서$/, ' 분석 보고서');
    title = title.replace(/\s*보고서\s*보고서$/, ' 보고서');
    if (!title.includes('보고서')) {
      title = `${title} 분석 보고서`;
    }
    return title;
  }, [mainProjectName]);
  
  const subProgramCount = React.useMemo(() => {
    if (!isConsolidated) return 0;
    const uniqueIds = new Set(responses.map(r => r.projectId));
    const subProjectsCount = projects.filter(p => p.level > 1).length;
    return uniqueIds.size > 1 ? uniqueIds.size : subProjectsCount;
  }, [responses, isConsolidated, projects]);

  const analysis = React.useMemo(() => ExpertReportGenerator.generateFullAnalysis(projects, stats, isConsolidated, mainProjectName), [projects, stats, isConsolidated, mainProjectName]);

  // 설문지 매핑
  const satTemplate = templates.find(t => t.type === 'SATISFACTION');
  const compTemplate = templates.find(t => t.type === 'COMPETENCY');

  // 응답자별 데이터 가공 (Appendix용) - 학생 번호순 정렬
  const respondentData = React.useMemo(() => {
    const map = new Map<string, { id: string, sat: number[], pre: number[], post: number[], comments: string[] }>();
    
    responses.forEach(res => {
      if (!map.has(res.respondentId)) {
        map.set(res.respondentId, { id: res.respondentId, sat: [], pre: [], post: [], comments: [] });
      }
      const r = map.get(res.respondentId)!;
      const tmpl = templates.find(t => t.id === res.templateId);
      
      if (tmpl?.type === 'SATISFACTION') {
        tmpl.questions.filter(q => q.type !== 'TEXT').forEach(q => {
          const ans = res.answers.find(a => a.questionId === q.id);
          if (ans && ans.score !== undefined) r.sat.push(ans.score);
        });
        tmpl.questions.filter(q => q.type === 'TEXT').forEach(q => {
          const ans = res.answers.find(a => a.questionId === q.id);
          if (ans && ans.text) r.comments.push(ans.text);
        });
      } else if (tmpl?.type === 'COMPETENCY') {
        tmpl.questions.forEach(q => {
          const ans = res.answers.find(a => a.questionId === q.id);
          if (ans && ans.preScore !== undefined) r.pre.push(ans.preScore);
          if (ans && ans.score !== undefined) r.post.push(ans.score);
        });
      }
    });

    // 학생 번호 기준 자연 정렬 (숫자 추출 후 오름차순)
    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.id.localeCompare(b.id, 'ko');
    });
  }, [responses, templates]);

  return (
    <div id="expert-report-content" className="bg-white text-slate-900 leading-relaxed mx-auto overflow-visible print:shadow-none" style={{ fontFamily: '"Malgun Gothic", "맑은 고딕", dotum, sans-serif' }}>
      <style>{`
        .report-page {
          width: 210mm;
          height: 288mm; /* A4 297mm보다 보수적으로 작게 하여 인쇄 시 하단 잘림을 완벽 차단 */
          padding: 15mm 20mm; /* 내부 상하 여백을 조정해 내부 공간 확보 */
          margin: 0 auto;
          background: white;
          page-break-after: always;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }
        .report-page.cover-page {
          height: 268mm; /* 표지 높이를 268mm로 축소하여 다음 페이지 침범을 완벽 차단 */
          padding: 8mm;
          box-sizing: border-box;
        }
        .cover-inner {
          width: calc(100% - 8px);
          height: calc(100% - 8px);
          margin: 4px auto;
          border: 2px solid #0f172a;
          padding: 15mm 12mm; /* 내부 패딩을 미세하게 압축하여 컨텐츠 수용 공간을 확보 */
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }
        .appendix-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          margin-bottom: 15px;
        }
        .appendix-table th, .appendix-table td {
          border: 1px solid #cbd5e1;
          padding: 5px 3px;
          text-align: center;
        }
        .appendix-table th {
          background-color: #f1f5f9;
          font-weight: bold;
        }
        .report-section {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 1rem;
        }
        @media screen {
          .report-page {
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
        }
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          .report-page {
            margin: 0;
            padding: 15mm 20mm;
            box-shadow: none;
            width: 210mm;
            height: 288mm;
            overflow: hidden;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .report-page.cover-page {
            height: 268mm;
            padding: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Page 1: Cover */}
      <div className="report-page cover-page">
        <div className="cover-inner">
          <div className="text-left w-full shrink-0">
            <p className="text-[14pt] font-bold tracking-[0.2em] mb-10 text-slate-400">2026 교육 성과 분석 보고서</p>
            <h1 className="text-[24pt] sm:text-[28pt] font-black leading-snug mb-6 border-l-8 border-slate-900 pl-8 break-keep">
              {cleanProjectTitle}
            </h1>
          </div>

          <div className="w-full space-y-4 text-[11pt] pl-10 shrink-0">
            {isConsolidated && (
              <div className="flex justify-between border-b border-slate-300 pb-2">
                <span className="font-bold">분석 대상</span>
                <span>{subProgramCount > 0 ? `${subProgramCount}개 프로그램 통합` : '단일 프로그램 분석'}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-300 pb-2">
              <span className="font-bold">분석 표본</span>
              <span>N = {stats.sampleSize || 0} (응답자 전수)</span>
            </div>
            <div className="flex justify-between border-b border-slate-300 pb-2">
              <span className="font-bold">보고 일자</span>
              <span>{today}</span>
            </div>
            <div className="flex justify-between border-b border-slate-300 pb-2">
              <span className="font-bold">주관 부서</span>
              <span>{organizationName} 서울런 현장운영팀</span>
            </div>
            {!isConsolidated && partnerName && (
              <div className="flex justify-between border-b border-slate-300 pb-2">
                <span className="font-bold">협력 기관</span>
                <span>{partnerName}</span>
              </div>
            )}
            {!isConsolidated && locationName && (
              <div className="flex justify-between border-b border-slate-300 pb-2">
                <span className="font-bold">교육 장소</span>
                <span>{locationName}</span>
              </div>
            )}
            {!isConsolidated && dateRange && (
              <div className="flex justify-between border-b border-slate-300 pb-2">
                <span className="font-bold">교육 일시</span>
                <span>{dateRange}</span>
              </div>
            )}
          </div>

          <div className="text-[18pt] font-black tracking-[1em] w-full text-right border-t-2 border-slate-100 pt-4 shrink-0">
            {organizationName}
          </div>
        </div>
      </div>

      {/* Page 2: Summary & Metrics (1~3 Integrated) */}
      <div className="report-page flex flex-col justify-between py-10">
        <div className="space-y-3">
          <h2 className="text-[14pt] font-extrabold mb-4 border-b-4 border-slate-900 pb-2">Ⅰ. 분석 개요 및 핵심 요약</h2>
          
          <div className="report-section mt-7">
            <h3 className="text-[11pt] font-bold mb-1.5 flex items-center gap-2 text-slate-800">
              <span className="size-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[9pt]">1</span>
              분석 목적 및 배경
            </h3>
            <p className="pl-7 text-[9.5pt] text-justify leading-relaxed text-slate-600">
              본 보고서는 {mainProjectName}의 교육 효과성을 다각도로 검증하기 위해 작성됨. 단순 만족도 조사를 넘어, 사전-사후 역량 변화를 통계적으로 분석하여 실질적인 학습 전이(Learning Transfer) 수준을 도출하고 향후 교육 설계의 전략적 방향성을 제시하고자 함.
            </p>
          </div>
          
          <div className="report-section mt-7">
            <h3 className="text-[11pt] font-bold mb-2 flex items-center gap-2 text-slate-800">
              <span className="size-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[9pt]">2</span>
              핵심 성과 요약
            </h3>
            <div className="pl-7 grid grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3.5 border-t-4 border-emerald-500 rounded-b-xl flex flex-col justify-between min-h-[90px] shadow-sm">
                <p className="text-[8.5pt] text-slate-500 font-bold">종합 만족도</p>
                <p className="text-[18pt] font-black text-emerald-600 my-0.5" style={{ color: '#10b981' }}>{stats.satAvg.toFixed(2)}</p>
                <p className="text-[7.5pt] text-slate-400">Excellent Level</p>
              </div>
              <div className="bg-slate-50 p-3.5 border-t-4 border-blue-500 rounded-b-xl flex flex-col justify-between min-h-[90px] shadow-sm">
                <p className="text-[8.5pt] text-slate-500 font-bold">학습 효과 지수</p>
                <p className="text-[18pt] font-black text-blue-600 my-0.5" style={{ color: '#3b82f6' }}>{Math.round(stats.hakeGain * 100)}%</p>
                <p className="text-[7.5pt] text-slate-400">Hake&apos;s Gain</p>
              </div>
              <div className="bg-slate-50 p-3.5 border-t-4 border-indigo-500 rounded-b-xl flex flex-col justify-between min-h-[90px] shadow-sm">
                <p className="text-[8.5pt] text-slate-500 font-bold">효과 크기</p>
                <p className="text-[18pt] font-black text-indigo-600 my-0.5" style={{ color: '#6366f1' }}>{stats.cohensD.toFixed(2)}</p>
                <p className="text-[7.5pt] text-slate-400">Cohen&apos;s d</p>
              </div>
            </div>
          </div>

          {(radarData.length > 0 || improvementData.length > 0) && (
            <div className="report-section mt-7">
              <h3 className="text-[11pt] font-bold mb-2 flex items-center gap-2 text-slate-800">
                <span className="size-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[9pt]">3</span>
                항목별 만족도 분포 및 역량 변화 분석
              </h3>
              <div className="flex flex-col gap-4 items-center w-full">
                {radarData.length > 0 && (
                  <div className="flex flex-col items-center w-full">
                    <p className="text-[9.5pt] font-bold text-slate-700 mb-0.5 text-left w-full pl-7">● 항목별 만족도 분포 (5점 척도)</p>
                    <div className="h-[270px] w-full flex items-center justify-center">
                      <SatisfactionRadarChart radarData={radarData} showTitle={false} isReport={true} />
                    </div>
                  </div>
                )}
                {improvementData.length > 0 && (
                  <div className="flex flex-col items-center w-full">
                    <p className="text-[9.5pt] font-bold text-slate-700 mb-0.5 mt-2 text-left w-full pl-7">● 역량 변화 분석 (사전 vs 사후)</p>
                    <div className="h-[200px] w-full flex items-center justify-center">
                      <CompetencyBarChart improvementData={improvementData} showTitle={false} isReport={true} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page 3: Quantitative Analysis (1~2 Integrated) */}
      <div className="report-page flex flex-col justify-between py-10">
        <div className="space-y-3.5">
          <h2 className="text-[14pt] font-extrabold mb-4 border-b-4 border-slate-900 pb-2">Ⅱ. 정량적 지표 분석</h2>
          
          <div className="report-section mt-7">
            <h3 className="text-[11pt] font-bold mb-2 flex items-center gap-2 text-slate-800">
              <span className="size-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[9pt]">1</span>
              측정 지표 정밀 진단
            </h3>
            <div className="pl-7 space-y-2.5">
              {analysis.metricAnalysis.map((m: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-0.5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10pt] font-bold text-slate-800">{m.name}</h4>
                    <span className="text-[11pt] font-black text-slate-900">{m.value}</span>
                  </div>
                  <p className="text-blue-700 font-bold text-[8.5pt]">▶ {m.interpretation}</p>
                  <p className="text-[8.5pt] text-slate-500 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>

            {/* 만족도 지표 모니터링 요원 코멘트 반영 */}
            {(() => {
              const satComments = projects
                .filter(p => p.monitoringSatComment && p.monitoringSatComment.trim().length > 0)
                .map(p => ({ name: p.name, comment: p.monitoringSatComment! }));

              if (satComments.length === 0) {
                return (
                  <div className="mt-2.5 pl-7">
                    <div className="bg-slate-50/70 border border-slate-200/50 rounded-xl p-2.5 text-center">
                      <p className="text-[8.5pt] text-slate-400 italic font-medium leading-normal">
                        (본 과정의 교육 만족도 수치에 관한 모니터링 종합 의견이 등록되지 않았습니다.)
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="mt-2.5 pl-7">
                  <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-indigo-100/50 rounded-xl p-3 shadow-sm">
                    <h4 className="text-[8.5pt] font-black text-indigo-900 mb-1 flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-3 bg-indigo-600 rounded-full" />
                      현장 모니터링 요원 만족도 종합 평가
                    </h4>
                    <div className="space-y-1">
                      {satComments.map((sc, scIdx) => (
                        <div key={scIdx} className="text-[8.5pt] text-slate-700 leading-relaxed text-justify whitespace-pre-line">
                          {isConsolidated && <span className="font-extrabold text-indigo-700">[{sc.name}] </span>}
                          &ldquo;{sc.comment}&rdquo;
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {analysis.statisticalEvidence && (
            <div className="report-section mt-7">
              <h3 className="text-[11pt] font-bold mb-2 flex items-center gap-2 text-slate-800">
                <span className="size-5 bg-slate-900 text-white rounded-full flex items-center justify-center text-[9pt]">2</span>
                통계 검증 근거 (Statistical Evidence)
              </h3>
              <div className="pl-7">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm space-y-1.5">
                  <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-2 text-center">
                    <div>
                      <p className="text-[7.5pt] text-slate-500 font-bold">표본 수 (N)</p>
                      <p className="text-[10.5pt] font-black text-slate-800">{analysis.statisticalEvidence.n}명</p>
                    </div>
                    <div>
                      <p className="text-[7.5pt] text-slate-500 font-bold">사전/사후 평균</p>
                      <p className="text-[10.5pt] font-black text-slate-800">{analysis.statisticalEvidence.preAvg} / {analysis.statisticalEvidence.postAvg}</p>
                    </div>
                    <div>
                      <p className="text-[7.5pt] text-slate-500 font-bold">통합 표준편차</p>
                      <p className="text-[10.5pt] font-black text-slate-800">{analysis.statisticalEvidence.pooledStd}</p>
                    </div>
                    <div>
                      <p className="text-[7.5pt] text-slate-500 font-bold">유의확률 (p)</p>
                      <p className="text-[10.5pt] font-black text-slate-800">{analysis.statisticalEvidence.pValue}</p>
                    </div>
                  </div>
                  <p className="text-[7.5pt] text-slate-400 text-center">
                    * 대응표본 t-검정(Paired t-test, t={analysis.statisticalEvidence.tValue})을 통해 유의확률이 도출되었습니다.
                  </p>
                </div>
              </div>

              {/* 성숙도 지표 모니터링 요원 코멘트 반영 */}
              {(() => {
                const compComments = projects
                  .filter(p => p.monitoringCompComment && p.monitoringCompComment.trim().length > 0)
                  .map(p => ({ name: p.name, comment: p.monitoringCompComment! }));

                if (compComments.length === 0) {
                  return (
                    <div className="mt-2.5 pl-7">
                      <div className="bg-slate-50/70 border border-slate-200/50 rounded-xl p-2.5 text-center">
                        <p className="text-[8.5pt] text-slate-400 italic font-medium leading-normal">
                          (본 과정의 사전사후 성숙도 변화에 관한 모니터링 종합 의견이 등록되지 않았습니다.)
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="mt-2.5 pl-7">
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border border-blue-100/50 rounded-xl p-3 shadow-sm">
                      <h4 className="text-[8.5pt] font-black text-blue-900 mb-1 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-3 bg-blue-600 rounded-full" />
                        현장 모니터링 요원 역량 성숙도 평가
                      </h4>
                      <div className="space-y-1">
                        {compComments.map((cc, ccIdx) => (
                          <div key={ccIdx} className="text-[8.5pt] text-slate-700 leading-relaxed text-justify whitespace-pre-line">
                            {isConsolidated && <span className="font-extrabold text-blue-700">[{cc.name}] </span>}
                            &ldquo;{cc.comment}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="report-section pl-7 mt-7">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <h4 className="text-[9pt] font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <span className="text-blue-600">※</span> 정량적 지표의 평가 기준 (참고자료)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[7.5pt]">
                <div className="flex flex-col gap-0.5">
                  <p className="font-bold text-slate-700">[Hake's Gain] 정규화 향상 지수</p>
                  <p className="text-slate-600 pl-1.5 border-l-2 border-slate-200">
                    <span className="font-bold text-emerald-600">70%~:</span> 매우 높음 | 
                    <span className="font-bold text-blue-600"> 30%~70%:</span> 중간 | 
                    <span className="font-bold text-orange-600"> ~30%:</span> 낮음
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-bold text-slate-700">[Cohen's d] 효과 크기</p>
                  <p className="text-slate-600 pl-1.5 border-l-2 border-slate-200">
                    <span className="font-bold text-emerald-600">0.8~:</span> 큰 효과 | 
                    <span className="font-bold text-blue-600"> 0.5~0.8:</span> 중간 | 
                    <span className="font-bold text-orange-600"> 0.2~0.5:</span> 작음
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-bold text-slate-700">만족도 및 추천 지수 (5점 만점)</p>
                  <p className="text-slate-600 pl-1.5 border-l-2 border-slate-200">
                    <span className="font-bold text-emerald-600">4.5~:</span> 최우수 | 
                    <span className="font-bold text-blue-600"> 4.0~4.5:</span> 우수 | 
                    <span className="font-bold text-orange-600"> 3.5~4.0:</span> 보통
                  </p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="font-bold text-slate-700">유의확률 p-value</p>
                  <p className="text-slate-600 pl-1.5 border-l-2 border-slate-200">
                    <span className="font-bold text-emerald-600">p&lt;0.001:</span> 매우 유의 | 
                    <span className="font-bold text-blue-600"> p&lt;0.05:</span> 유의 | 
                    <span className="font-bold text-slate-500"> p≥0.05:</span> 무효
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 4: Qualitative Feedback Analysis */}
      <div className="report-page flex flex-col justify-between py-12">
        <div>
          <h2 className="text-[15pt] font-extrabold mb-6 border-b-4 border-slate-900 pb-2">Ⅲ. 정성적 응답 분석</h2>
          <div className="pl-8 space-y-6">
            <p className="text-[11pt] text-justify leading-loose text-slate-700">
              학습자들이 주관식 응답을 통해 기술한 내용을 교육학적 관점에서 분류하여 도출된 주요 강점과 보완점임. 과도한 해석을 지양하고 반복 언급된 키워드를 중심으로 정리함.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 min-h-[360px] flex flex-col">
                <h4 className="text-[12pt] font-bold text-emerald-800 mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> 핵심 강점
                </h4>
                <ul className="space-y-3 text-slate-700 flex-1">
                  {analysis.qualitativeAnalysis.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-[10pt] leading-relaxed border-b border-emerald-100/50 pb-2 last:border-0">• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 min-h-[360px] flex flex-col">
                <h4 className="text-[12pt] font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-orange-500" /> 개선 포인트
                </h4>
                <ul className="space-y-3 text-slate-700 flex-1">
                  {analysis.qualitativeAnalysis.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="text-[10pt] leading-relaxed border-b border-orange-100/50 pb-2 last:border-0">• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 5: Conclusion & Advice */}
      <div className="report-page flex flex-col justify-between py-12">
        <div>
          <h2 className="text-[15pt] font-extrabold mb-6 border-b-4 border-slate-900 pb-2">Ⅳ. 종합 결론 및 전략 제언</h2>
          <div className="bg-slate-50 text-slate-900 border border-slate-200 p-8 rounded-3xl space-y-6 shadow-sm">
            <div>
              <p className="font-bold text-[12pt] mb-3 text-slate-800">■ 종합 결론</p>
              <p className="leading-relaxed pl-3 text-slate-700 text-[10.5pt] text-justify">
                {analysis.advice[0] || `본 과정은 정량적 수치(${stats.satAvg.toFixed(2)}점)와 통계적 효과성(${stats.cohensD.toFixed(2)}) 모두에서 최상위 수준의 성과를 달성하였음.`}
              </p>
            </div>
            
            <div className="border-t border-slate-200 pt-6">
              <p className="font-bold text-[12pt] mb-4 text-slate-800">■ 전략적 권고사항</p>
              <div className="space-y-4 pl-3">
                {analysis.advice.slice(1).map((adv: string, idx: number) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <span className="bg-slate-800 text-white size-6 rounded-full flex items-center justify-center text-[9pt] shrink-0 mt-0.5 font-bold">{idx+1}</span>
                    <p className="text-[10.5pt] text-slate-700 leading-relaxed text-justify">{adv}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 💡 현장 모니터링 피드백 기반 시사점 및 제언 연계 반영 */}
            {projects.some(p => (p.monitoringSatComment && p.monitoringSatComment.trim().length > 0) || (p.monitoringCompComment && p.monitoringCompComment.trim().length > 0)) && (
              <div className="border-t border-slate-200 pt-5">
                <p className="font-bold text-[12pt] mb-3 text-slate-800">■ 현장 모니터링 피드백 기반 시사점</p>
                <div className="space-y-3.5 pl-3">
                  {projects.map((p, idx) => {
                    if (!(p.monitoringSatComment && p.monitoringSatComment.trim().length > 0) && !(p.monitoringCompComment && p.monitoringCompComment.trim().length > 0)) return null;
                    return (
                      <div key={idx} className="bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4 space-y-2 shadow-sm">
                        <span className="font-extrabold text-indigo-950 text-[10pt] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block" />
                          [{p.name}] 과정의 종합 피드백 연계 권고
                        </span>
                        
                        {p.monitoringSatComment && p.monitoringSatComment.trim().length > 0 && (
                          <div className="pl-3 border-l-2 border-indigo-400">
                            <span className="text-[7.5pt] font-extrabold text-indigo-700 uppercase tracking-wider block mb-0.5">교육 만족도 모니터링 의견</span>
                            <p className="text-[9.5pt] text-slate-600 leading-relaxed italic whitespace-pre-line">&ldquo;{p.monitoringSatComment}&rdquo;</p>
                          </div>
                        )}
                        
                        {p.monitoringCompComment && p.monitoringCompComment.trim().length > 0 && (
                          <div className="pl-3 border-l-2 border-blue-400 mt-2">
                            <span className="text-[7.5pt] font-extrabold text-blue-700 uppercase tracking-wider block mb-0.5">역량 성숙도 모니터링 의견</span>
                            <p className="text-[9.5pt] text-slate-600 leading-relaxed italic whitespace-pre-line">&ldquo;{p.monitoringCompComment}&rdquo;</p>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t border-slate-100 mt-2">
                          <p className="text-[9.5pt] text-slate-700 font-bold flex items-center gap-1 mb-1">
                            👉 <span className="text-indigo-800">시사점:</span>
                          </p>
                          <p className="text-[9.5pt] text-slate-700 leading-relaxed text-justify pl-5">
                            상기 현장 지적 사항에 따라 학습자의 눈높이에 맞춘 체험 프로그램 단위의 교과 난이도 필터링 및 조율을 차기 운영 시 권고함.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page 6: Appendix 1 - Satisfaction RAW Table & Item Details */}
      <div className="report-page flex flex-col justify-between py-12">
        <div className="space-y-5">
          <h2 className="text-[13pt] font-extrabold mb-4 border-b-2 border-slate-900 pb-2"># 별첨 1. 만족도 설문결과 및 문항 정보</h2>
          
          <div>
            <h3 className="text-[10pt] font-bold mb-2">■ 만족도 설문결과 (RAW Data)</h3>
            <table className="appendix-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {satTemplate?.questions.filter(q => q.type === 'SCALE').map((q, i) => (
                    <th key={i}>문항 {i+1}</th>
                  ))}
                  <th>평균</th>
                </tr>
              </thead>
              <tbody>
                {respondentData.filter(r => r.sat.length > 0).map((r, i) => (
                  <tr key={i}>
                    <td>학생 {i + 1}</td>
                    {r.sat.map((s, si) => <td key={si}>{s}</td>)}
                    <td className="font-bold bg-slate-50">{(r.sat.reduce((a,b)=>a+b,0)/r.sat.length).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td>문항평균</td>
                  {satTemplate?.questions.filter(q => q.type === 'SCALE').map((_, qi) => {
                    const qScores = respondentData.map(r => r.sat[qi]).filter(s => s !== undefined);
                    return <td key={qi}>{(qScores.reduce((a,b)=>a+b,0)/qScores.length).toFixed(2)}</td>
                  })}
                  <td className="bg-emerald-100">{stats.satAvg.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-[10pt] font-bold mb-2">■ 만족도 설문 문항 정보</h3>
            <table className="appendix-table text-[8pt]">
              <thead>
                <tr>
                  <th className="w-10">번호</th>
                  <th className="w-[20%]">주제</th>
                  <th>설문 문항 내용</th>
                </tr>
              </thead>
              <tbody>
                {satTemplate?.questions.map((q, i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td className="px-2 leading-relaxed">{q.theme}</td>
                    <td className="!text-left px-3 leading-relaxed">{q.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Page 7: Appendix 1 - Compact Text Responses (Wrap Badge View) */}
      {stats.textResponses && stats.textResponses.length > 0 && (
        <div className="report-page flex flex-col justify-between py-12">
          <div>
            <h2 className="text-[13pt] font-extrabold mb-6 border-b-2 border-slate-900 pb-2"># 별첨 1. 만족도 설문결과 (주관식 의견 RAW)</h2>
            <div className="space-y-6">
              {stats.textResponses.map((tr, qIdx) => (
                <div key={tr.questionId} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <p className="font-bold text-[10pt] text-slate-800 mb-3 border-b border-slate-200 pb-1.5">
                    문항 {satTemplate?.questions.findIndex(q => q.id === tr.questionId) !== -1 ? (satTemplate!.questions.findIndex(q => q.id === tr.questionId) + 1) : '-'}. {tr.content}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[8.5pt] text-slate-700">
                    {tr.answers.map((ans, idx) => (
                      <div key={idx} className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5">
                        <span className="flex-shrink-0 flex items-center justify-center size-4 rounded-full bg-slate-800 text-white text-[7pt] font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{ans}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Page 8: Appendix 2 - Competency RAW Table */}
      <div className="report-page flex flex-col justify-between py-12">
        <div>
          <h2 className="text-[13pt] font-extrabold mb-6 border-b-2 border-slate-900 pb-2"># 별첨 2. 사전사후 역량평가 데이터 (RAW Data)</h2>
          
          <div className="overflow-x-auto">
            <table className="appendix-table">
              <thead>
                <tr>
                  <th rowSpan={2}>ID</th>
                  {compTemplate?.questions.map((q, i) => (
                    <th key={i} colSpan={2}>문항 {i+1}</th>
                  ))}
                  <th colSpan={2} className="bg-blue-50">평균 역량</th>
                  <th rowSpan={2} className="bg-blue-50">단순 평균 증가율<br/>(%)</th>
                  <th rowSpan={2} className="bg-indigo-50">Hake's Gain<br/>(학습 효과 지수)</th>
                  <th rowSpan={2} className="bg-indigo-50">효과크기<br/>(Cohen's d)</th>
                </tr>
                <tr>
                  {compTemplate?.questions.map((_, i) => (
                    <React.Fragment key={i}>
                      <th>사전</th>
                      <th>사후</th>
                    </React.Fragment>
                  ))}
                  <th className="bg-blue-100">사전</th>
                  <th className="bg-blue-100">사후</th>
                </tr>
              </thead>
              <tbody>
                {respondentData.filter(r => r.pre.length > 0).map((r, i) => {
                  const preAvg = r.pre.reduce((a,b)=>a+b,0)/r.pre.length || 0;
                  const postAvg = r.post.reduce((a,b)=>a+b,0)/r.post.length || 0;
                  const gain = preAvg >= 5 ? 0 : (postAvg - preAvg) / (5 - preAvg);
                  const sd = stats.pooledStd || 1;
                  const cohensD = (postAvg - preAvg) / sd;
                  return (
                    <tr key={i}>
                      <td>학생 {i + 1}</td>
                      {r.pre.map((p, pi) => (
                        <React.Fragment key={pi}>
                          <td>{p}</td>
                          <td className="text-blue-700">{r.post[pi]}</td>
                        </React.Fragment>
                      ))}
                      <td className="font-bold bg-slate-50">{preAvg.toFixed(2)}</td>
                      <td className="font-bold bg-slate-50">{postAvg.toFixed(2)}</td>
                      <td className="font-bold text-blue-600 bg-slate-50">{preAvg > 0 ? ((postAvg - preAvg) / preAvg * 100).toFixed(1) + '%' : '0.0%'}</td>
                      <td className="font-bold text-blue-600 bg-slate-50">{(gain * 100).toFixed(1)}%</td>
                      <td className="font-bold text-indigo-600 bg-slate-50">{cohensD.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {respondentData.filter(r => r.pre.length > 0).length > 0 && (
                  <tr className="bg-slate-100 font-bold">
                    <td>전체평균</td>
                    {compTemplate?.questions.map((_, qi) => {
                      const qPres = respondentData.map(r => r.pre[qi]).filter(p => p !== undefined);
                      const qPosts = respondentData.map(r => r.post[qi]).filter(p => p !== undefined);
                      return (
                        <React.Fragment key={qi}>
                          <td>{(qPres.reduce((a,b)=>a+b,0)/qPres.length || 0).toFixed(2)}</td>
                          <td className="text-blue-600">{(qPosts.reduce((a,b)=>a+b,0)/qPosts.length || 0).toFixed(2)}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="bg-blue-100">{stats.preAvg.toFixed(2)}</td>
                    <td className="bg-blue-100 text-blue-700">{stats.postAvg.toFixed(2)}</td>
                    <td className="bg-blue-100 text-blue-700">{stats.preAvg > 0 ? ((stats.postAvg - stats.preAvg) / stats.preAvg * 100).toFixed(1) + '%' : '0.0%'}</td>
                    <td className="bg-indigo-100 text-blue-700">{(stats.hakeGain * 100).toFixed(1)}%</td>
                    <td className="bg-indigo-100 text-indigo-700">{stats.cohensD.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Page 9: Appendix 2 - Competency Item Details & Explanations */}
      <div className="report-page flex flex-col justify-between py-12">
        <div className="space-y-6">
          <h2 className="text-[13pt] font-extrabold mb-4 border-b-2 border-slate-900 pb-2"># 별첨 2. 사전사후 역량평가 데이터 (계속)</h2>
          
          <div>
            <h3 className="text-[11pt] font-bold mb-2">■ 역량 진단 지표 및 문항 정보</h3>
            <table className="appendix-table text-[9pt]">
              <thead>
                <tr>
                  <th className="w-12">번호</th>
                  <th className="w-[25%]">주제</th>
                  <th>문항 내용</th>
                </tr>
              </thead>
              <tbody>
                {compTemplate?.questions.map((q, i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td className="px-2 leading-relaxed">{q.theme}</td>
                    <td className="!text-left px-3 leading-relaxed">{q.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-[11pt] font-bold mb-3">■ 주요 통계 지표 설명 및 산식</h3>
            <div className="space-y-3 text-[9.5pt]">
              <div>
                <p className="font-bold text-blue-700">1. Hake&apos;s Gain (학습 효과 지수)</p>
                <p className="text-slate-600">가능한 최대 성장 폭 대비 실제 달성한 성장의 비율</p>
                <code className="block bg-white p-2 mt-1 border border-slate-200 text-[8.5pt]">지수(G) = (사후 점수 - 사전 점수) / (5 - 사전 점수)</code>
              </div>
              <div>
                <p className="font-bold text-indigo-700">2. Cohen&apos;s d (효과 크기)</p>
                <p className="text-slate-600">두 집단 간 평균 차이를 표준편차로 나눈 표준화된 지수</p>
                <code className="block bg-white p-2 mt-1 border border-slate-200 text-[8.5pt]">효과 크기(d) = (사후 평균 - 사전 평균) / 통합 표준편차</code>
              </div>
              <p className="text-[8.5pt] text-slate-400 leading-tight mt-2">
                * 모든 데이터는 무기명으로 처리되었으며, 5점 리커트 척도(1:매우 그렇지 않다 ~ 5:매우 그렇다)를 기준으로 산출되었습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
