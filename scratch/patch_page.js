const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Summary Row Sticky
content = content.replace(
    /z-10 bg-slate-900"><div className="flex items-center gap-2" style={{ paddingLeft: `\${depth \* 1}rem` }}><Sigma className="size-3 text-emerald-400" \/> {p.name} 종합<\/div><\/td>/,
    'z-30 bg-slate-900 border-r min-w-[300px]"><div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1}rem` }}><Sigma className="size-3 text-emerald-400" /> {p.name} 종합</div></td>'
);

// 2. Summary Question Tooltip
content = content.replace(
    /<TooltipContent className="bg-slate-800 text-white border-none text-\[9px\]">문항별 평균 성장률<\/TooltipContent>/,
    `<TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl">
                                                    <div className="text-[11px] space-y-1.5 text-slate-600">
                                                      <p className="font-black text-blue-600 mb-1">문항별 평균 성장률</p>
                                                      <p className="font-bold border-t pt-1.5 border-slate-50 italic">
                                                        "종합적으로 이 문항에서 {stats.questionStats[i].impRate.toFixed(1)}%의 {stats.questionStats[i].impRate >= 0 ? '역량 향상' : '수치 하락'}이 관찰되었습니다."
                                                      </p>
                                                    </div>
                                                  </TooltipContent>`
);

// 3. Summary Overall Tooltip
content = content.replace(
    /<TooltipContent className="bg-slate-800 text-white border-none text-\[9px\]">종합 역량 향상률 \(Pre vs Post\)<\/TooltipContent>/,
    `<TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl">
                                                  <div className="text-[11px] space-y-1.5 text-slate-600">
                                                    <p className="font-black text-blue-600 mb-1">종합 역량 향상률</p>
                                                    <p className="font-bold border-t pt-1.5 border-slate-50 italic">
                                                      "해당 사업 전체 평균 역량이 사전 대비 {stats.impRate.toFixed(1)}% {stats.impRate >= 0 ? '성장' : '감소'}했습니다."
                                                    </p>
                                                  </div>
                                                </TooltipContent>`
);

// 4. Summary Gain Tooltip
content = content.replace(
    /<TooltipContent className="bg-slate-800 text-white border-none text-\[9px\]">Hake's Gain 비율 \(학습 도달 효율\)<\/TooltipContent>/,
    `<TooltipContent className="p-4 bg-white border-slate-100 shadow-2xl rounded-2xl">
                                                  <div className="text-[11px] space-y-1.5 text-slate-600">
                                                    <p className="font-black text-emerald-600 mb-1">Hake's Gain 비율 (학습 도달 효율)</p>
                                                    <p className="font-bold border-t pt-1.5 border-slate-50 italic">
                                                      "종합 도달 효율이 {(stats.hakeGain * 100).toFixed(1)}%로, {stats.hakeGain >= 0.7 ? '매우 성공적인' : stats.hakeGain >= 0.3 ? '안정적인' : '다소 아쉬운'} 목표 도달도를 달성했습니다."
                                                    </p>
                                                  </div>
                                                </TooltipContent>`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated page.tsx');
