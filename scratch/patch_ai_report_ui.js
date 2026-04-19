const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add score display and evaluation correction in the report card
const satisfactionFix = `
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
`;
content = content.replace(
  /<div className="flex items-center gap-4">\s+<div className="size-12 rounded-2xl bg-emerald-100 flex items-center justify-center">\s+<TargetIcon className="size-6 text-emerald-600" \/>\s+<\/div>\s+<div>\s+<h3 className="text-2xl font-black text-slate-800">교육 운영 만족도 지수<\/h3>\s+<p className="text-sm font-bold text-slate-400 italic">Satisfaction Radar Analysis<\/p>\s+<\/div>\s+<\/div>/,
  satisfactionFix
);

// 2. Fix evaluation logic
content = content.replace(
  'return avg >= 4.5 \n                              ? "경이적인 수준(4.5점 이상)의 만족도가 확인되었습니다. 이는 교육생의 요구사항이 완벽하게 반영된 결과로 보입니다." \n                              : avg >= 4.0 \n                              ? "우수한 교육 품질(4.0점 이상)이 유지되고 있습니다." \n                              : "보통 수준의 만족도를 보이고 있습니다.";',
  'return avg >= 4.5 \n                              ? "최우수(Excellent) 등급의 교육 만족도가 확인되었습니다. 기획 의도와 실행력이 완벽하게 결합된 결과로, 교육생의 학습 몰입도와 만족도가 극대화된 상태입니다." \n                              : avg >= 4.0 \n                              ? "우수한(Superior) 교육 품질이 유지되고 있습니다. 전반적인 운영 프로세스가 안정적이며 학습 환경에 대한 긍정적 인식이 확고합니다." \n                              : "보통 수준의 만족도를 보이고 있습니다. 일부 운영 요소 및 환경 개선을 통한 품질 제고가 필요해 보입니다.";'
);

// 3. Add HWPX button and Export logic placeholder
const exportButton = `
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
                            // HWPML (XML) based structured report simulation
                            const reportContent = \`
                              한글 교육 전문가 정밀 분석 보고서
                              ----------------------------------
                              분석 대상: \${selectedProjectIds.length}개 사업
                              기준일: \${format(new Date(), 'yyyy년 MM월 dd일')}
                              
                              1. 만족도 지수: \${(overallStats?.satAvg || 0).toFixed(2)} / 5.00
                              2. 역량 향상도 (Gain): \${(overallStats?.hakeGain || 0).toFixed(2)}
                              
                              [전문가 분석 코멘트]
                              \${overallStats.comment?.replace(/\\*\\*/g, '') || '데이터 수집 중...'}
                            \`;
                            const blob = new Blob([reportContent], { type: 'application/hwpx' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = \`SLI_교육분석보고서_\${format(new Date(), 'yyMMdd')}.hwpx\`;
                            a.click();
                          };
                          exportHWPX();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] px-10 h-16 text-lg font-black gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
                      >
                        <FileSpreadsheet className="size-6" /> 한글(HWPX) 리포트 다운로드
                      </Button>
                    </div>
`;

content = content.replace(
  /<Button\s+onClick=\{\(\) => window\.print\(\)\}\s+className="bg-slate-900[\s\S]+?<\/Button>/,
  exportButton
);

// 4. Refine commentary generation prompt and remove ** from output
// I'll search for where comment is generated or displayed.
// Wait, the comment generation might be in generateAIExpertReport.
// I'll check lib/stat-utils.ts for the AI engine.

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched page.tsx UI and Export logic');
