'use client';

import * as React from 'react';
import { ReportStats, ExpertReportGenerator } from '@/lib/stat-utils';
import { Project } from '@/store/use-project-store';
import { SurveyResponse, SurveyTemplate } from '@/store/use-survey-store';

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
  templates?: SurveyTemplate[];
}

export function ExpertReportTemplate({
  stats,
  projects,
  projectName,
  chartImages,
  organizationName = "SLI 교육연구소",
  responses = [],
  templates = []
}: ExpertReportTemplateProps) {
  const mainProjectName = projectName || projects.find(p => p.level === 1)?.name || projects[0]?.name || '전체 사업';
  const subProjects = projects.filter(p => p.level > 1);
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const analysis = React.useMemo(() => ExpertReportGenerator.generateFullAnalysis(projects, stats), [projects, stats]);

  // 설문지 매핑
  const satTemplate = templates.find(t => t.type === 'SATISFACTION');
  const compTemplate = templates.find(t => t.type === 'COMPETENCY');

  // 응답자별 데이터 가공 (Appendix용)
  const respondentData = React.useMemo(() => {
    const map = new Map<string, { id: string, sat: number[], pre: number[], post: number[], comments: string[] }>();
    
    responses.forEach(res => {
      if (!map.has(res.respondentId)) {
        map.set(res.respondentId, { id: res.respondentId, sat: [], pre: [], post: [], comments: [] });
      }
      const r = map.get(res.respondentId)!;
      const tmpl = templates.find(t => t.id === res.templateId);
      
      res.answers.forEach(ans => {
        if (tmpl?.type === 'SATISFACTION') {
          if (ans.score !== undefined) r.sat.push(ans.score);
          if (ans.text) r.comments.push(ans.text);
        } else if (tmpl?.type === 'COMPETENCY') {
          if (ans.preScore !== undefined) r.pre.push(ans.preScore);
          if (ans.score !== undefined) r.post.push(ans.score);
        }
      });
    });
    return Array.from(map.values());
  }, [responses, templates]);

  return (
    <div id="expert-report-content" className="bg-white text-slate-900 font-serif leading-relaxed mx-auto overflow-visible print:shadow-none">
      <style>{`
        .report-page {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 0 auto;
          background: white;
          page-break-after: always;
          position: relative;
          box-sizing: border-box;
        }
        .appendix-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          margin-bottom: 20px;
        }
        .appendix-table th, .appendix-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 4px;
          text-align: center;
        }
        .appendix-table th {
          background-color: #f1f5f9;
          font-weight: bold;
        }
        @media screen {
          .report-page {
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
        }
        @media print {
          .report-page {
            margin: 0;
            box-shadow: none;
          }
        }
      `}</style>

      {/* Page 1: Cover - 왼쪽 정렬 반영 */}
      <div className="report-page flex flex-col items-start justify-between border-[2px] border-slate-900 px-24">
        <div className="text-left mt-32 w-full">
          <p className="text-2xl font-bold tracking-[0.2em] mb-16 text-slate-400">2026 교육 성과 분석 보고서</p>
          <h1 className="text-5xl font-black leading-tight mb-10 border-l-8 border-slate-900 pl-8">
            {mainProjectName}<br/>
            <span className="text-3xl font-bold text-slate-700">교육 전문가 정밀 성과 분석 보고서</span>
          </h1>
          <p className="text-xl text-slate-400 uppercase tracking-widest pl-10">Expert Precision Performance Analytics Report</p>
        </div>

        <div className="w-full space-y-8 text-2xl mt-20 pl-10">
          <div className="flex justify-between border-b border-slate-300 pb-2">
            <span className="font-bold">분석 대상</span>
            <span>{subProjects.length}개 프로그램 통합</span>
          </div>
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
            <span>{organizationName} 성과관리팀</span>
          </div>
        </div>

        <div className="mb-20 text-4xl font-black tracking-[1em] w-full text-right border-t-2 border-slate-100 pt-8">
          {organizationName}
        </div>
      </div>

      {/* Page 2: Summary & Metrics */}
      <div className="report-page">
        <section className="mt-4 mb-12">
          <h2 className="text-2xl font-bold mb-6 border-b-4 border-slate-900 pb-2">Ⅰ. 분석 개요 및 핵심 요약</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-slate-800">
                <span className="size-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
                분석 목적 및 배경
              </h3>
              <p className="pl-8 text-lg text-justify leading-loose">
                본 보고서는 {mainProjectName}의 교육 효과성을 다각도로 검증하기 위해 작성됨. 단순 만족도 조사를 넘어, 사전-사후 역량 변화를 통계적으로 분석하여 실질적인 학습 전이(Learning Transfer) 수준을 도출하고 향후 교육 설계의 전략적 방향성을 제시하고자 함.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                <span className="size-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">2</span>
                핵심 성과 요약 (Executive Summary)
              </h3>
              <div className="pl-8 grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-6 border-t-4 border-emerald-500 rounded-b-xl">
                  <p className="text-sm text-slate-500 font-bold mb-1">종합 만족도</p>
                  <p className="text-3xl font-black text-emerald-600">{stats.satAvg.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-1">Excellent Level</p>
                </div>
                <div className="bg-slate-50 p-6 border-t-4 border-blue-500 rounded-b-xl">
                  <p className="text-sm text-slate-500 font-bold mb-1">역량 향상도</p>
                  <p className="text-3xl font-black text-blue-600">{Math.round(stats.hakeGain * 100)}%</p>
                  <p className="text-xs text-slate-400 mt-1">Hake&apos;s Gain</p>
                </div>
                <div className="bg-slate-50 p-6 border-t-4 border-indigo-500 rounded-b-xl">
                  <p className="text-sm text-slate-500 font-bold mb-1">효과 크기</p>
                  <p className="text-3xl font-black text-indigo-600">{stats.cohensD.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 mt-1">Cohen&apos;s d (Large)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6 border-b-4 border-slate-900 pb-2">Ⅱ. 정량적 지표 분석</h2>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
            <span className="size-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
            측정 지표 정밀 진단
          </h3>
          <div className="pl-8 space-y-4">
            {analysis.metricAnalysis.map((m: any, idx: number) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-slate-800">{m.name}</h4>
                  <span className="text-2xl font-black text-slate-900">{m.value}</span>
                </div>
                <p className="text-blue-700 font-bold mb-2 text-sm">▶ {m.interpretation}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Page 3: Visuals & Qualitative */}
      <div className="report-page">
        <section className="mt-4">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-slate-800">
            <span className="size-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">2</span>
            성과 시각화 분석
          </h3>
          <div className="grid grid-cols-2 gap-8 mb-16 px-4">
            {chartImages.radar && (
              <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <img src={chartImages.radar} alt="만족도" className="max-w-full h-auto" />
                <p className="text-sm text-slate-600 font-bold">[그림 1] 항목별 만족도 분포</p>
              </div>
            )}
            {chartImages.improvement && (
              <div className="flex flex-col items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <img src={chartImages.improvement} alt="향상도" className="max-w-full h-auto" />
                <p className="text-sm text-slate-600 font-bold">[그림 2] 역량 사전-사후 변화</p>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-6 border-b-4 border-slate-900 pb-2">Ⅲ. 정성적 응답 분석 (Subjective)</h2>
          <div className="pl-8 space-y-8">
            <p className="text-lg text-justify leading-loose">
              학습자들이 주관식 응답을 통해 기술한 내용을 교육학적 관점에서 분류하여 도출된 주요 강점과 보완점임. 과도한 해석을 지양하고 반복 언급된 키워드를 중심으로 정리함.
            </p>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                <h4 className="text-lg font-bold text-emerald-800 mb-6 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> 핵심 강점 (Strengths)
                </h4>
                <ul className="space-y-4 text-slate-700">
                  {analysis.qualitativeAnalysis.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-sm leading-relaxed border-b border-emerald-100 pb-2 last:border-0">• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100">
                <h4 className="text-lg font-bold text-orange-800 mb-6 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-orange-500" /> 개선 포인트 (Opportunities)
                </h4>
                <ul className="space-y-4 text-slate-700">
                  {analysis.qualitativeAnalysis.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="text-sm leading-relaxed border-b border-orange-100 pb-2 last:border-0">• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Page 4: Conclusion */}
      <div className="report-page">
        <section className="mt-4">
          <h2 className="text-2xl font-bold mb-8 border-b-4 border-slate-900 pb-2">Ⅳ. 종합 결론 및 전략 제언</h2>
          <div className="bg-slate-900 text-white p-12 rounded-[3rem] space-y-12">
            <div>
              <p className="font-bold text-2xl mb-6 text-indigo-300">■ 종합 결론</p>
              <p className="leading-loose pl-4 text-slate-200 text-lg text-justify">
                본 과정은 정량적 수치({stats.satAvg.toFixed(2)}점)와 통계적 효과성({stats.cohensD.toFixed(2)}) 모두에서 최상위 수준의 성과를 달성하였음. 특히 주관식 피드백에서 나타난 실습 도구 활용에 대한 높은 몰입도는 본 프로그램이 단순 이론이 아닌 실질적 직무 역량 강화에 초점을 맞추었음을 시사함.
              </p>
            </div>
            
            <div>
              <p className="font-bold text-2xl mb-6 text-indigo-300">■ 전략적 권고사항</p>
              <div className="space-y-6 pl-4">
                {analysis.advice.map((adv: string, idx: number) => (
                  <div key={idx} className="flex gap-6 items-start">
                    <span className="bg-indigo-500 text-white size-8 rounded-full flex items-center justify-center text-sm shrink-0 mt-1 font-bold">{idx+1}</span>
                    <p className="text-xl text-slate-200 leading-relaxed">{adv}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-32 text-center text-slate-400 text-sm">
            본 보고서는 데이터 기반 자동 분석 시스템에 의해 생성되었으며,<br/>
            최종 확인 및 날인 후 공식 문서로 사용 가능합니다.
          </div>
        </section>
      </div>

      {/* Page 5: Appendix 1 - Satisfaction RAW */}
      <div className="report-page">
        <h2 className="text-xl font-bold mb-6 border-b-2 border-slate-900 pb-2"># 별첨 1. 만족도 설문결과 (RAW Data)</h2>
        
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
                <td>{r.id.slice(0, 8)}</td>
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

        <div className="mt-8">
          <h3 className="text-sm font-bold mb-3">■ 만족도 설문 문항 정보</h3>
          <table className="appendix-table text-[8px]">
            <thead>
              <tr>
                <th className="w-16">번호</th>
                <th className="w-24">주제</th>
                <th>설문 문항 내용</th>
              </tr>
            </thead>
            <tbody>
              {satTemplate?.questions.map((q, i) => (
                <tr key={i}>
                  <td>{i+1}</td>
                  <td>{q.theme}</td>
                  <td className="text-left px-2">{q.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Page 6: Appendix 2 - Competency RAW */}
      <div className="report-page">
        <h2 className="text-xl font-bold mb-6 border-b-2 border-slate-900 pb-2"># 별첨 2. 사전사후 역량평가 데이터 (RAW Data)</h2>
        
        <div className="overflow-x-auto">
          <table className="appendix-table">
            <thead>
              <tr>
                <th rowSpan={2}>ID</th>
                {compTemplate?.questions.map((q, i) => (
                  <th key={i} colSpan={2}>문항 {i+1}</th>
                ))}
                <th colSpan={2} className="bg-blue-50">평균 역량</th>
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
              {respondentData.filter(r => r.pre.length > 0).map((r, i) => (
                <tr key={i}>
                  <td>{r.id.slice(0, 8)}</td>
                  {r.pre.map((p, pi) => (
                    <React.Fragment key={pi}>
                      <td>{p}</td>
                      <td>{r.post[pi]}</td>
                    </React.Fragment>
                  ))}
                  <td className="font-bold bg-slate-50">{(r.pre.reduce((a,b)=>a+b,0)/r.pre.length).toFixed(2)}</td>
                  <td className="font-bold bg-slate-50">{(r.post.reduce((a,b)=>a+b,0)/r.post.length).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold mb-3">■ 역량 진단 지표 및 문항 정보</h3>
            <table className="appendix-table text-[8px]">
              <thead>
                <tr>
                  <th className="w-12">번호</th>
                  <th className="w-20">주제</th>
                  <th>문항 내용</th>
                </tr>
              </thead>
              <tbody>
                {compTemplate?.questions.map((q, i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{q.theme}</td>
                    <td className="text-left px-2">{q.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold mb-4">■ 주요 통계 지표 설명 및 산식</h3>
            <div className="space-y-4 text-[10px]">
              <div>
                <p className="font-bold text-blue-700">1. Hake&apos;s Gain (역량 향상도)</p>
                <p className="text-slate-600">가능한 최대 성장 폭 대비 실제 달성한 성장의 비율</p>
                <code className="block bg-white p-2 mt-1 border border-slate-200">G = (Post - Pre) / (5 - Pre)</code>
              </div>
              <div>
                <p className="font-bold text-indigo-700">2. Cohen&apos;s d (효과 크기)</p>
                <p className="text-slate-600">두 집단 간 평균 차이를 표준편차로 나눈 표준화된 지수</p>
                <code className="block bg-white p-2 mt-1 border border-slate-200">d = (M2 - M1) / SD_pooled</code>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight mt-4">
                * 모든 데이터는 무기명으로 처리되었으며, 5점 리커트 척도(1:매우 그렇지 않다 ~ 5:매우 그렇다)를 기준으로 산출되었습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
    </div>
  );
}
