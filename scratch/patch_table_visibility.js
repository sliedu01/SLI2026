const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Individual row: Satisfaction scores (Emerald-700, Bold)
content = content.replace(
  /\{satQuestions\.map\(q => <td key=\{q\.id\} className="p-4 text-center text-\[10px\] text-emerald-600\/30">\{m\.sat\?\.answers\.find\(a=>a\.questionId===q\.id\)\?\.score \|\| '-'\}<\/td>\)\}/,
  "{satQuestions.map(q => <td key={q.id} className=\"p-4 text-center text-\[10px\] font-bold text-emerald-700\">{m.sat?.answers.find(a=>a.questionId===q.id)?.score || '-'}</td>)}"
);

// 2. Individual row: Competency scores (Pre/Post Stack, Blue-700, Bold)
content = content.replace(
  /\{compQuestions\.map\(q => <td key=\{q\.id\} className="p-4 text-center text-\[10px\] text-blue-600\/30">\{m\.comp\?\.answers\.find\(a=>a\.questionId===q\.id\)\?\.score \|\| '-'\}<\/td>\)\}/,
  "{compQuestions.map(q => {\n                                                const ans = m.comp?.answers.find(a=>a.questionId===q.id);\n                                                return (\n                                                  <td key={q.id} className=\"p-4 text-center text-\[10px\]\">\n                                                    <div className=\"flex flex-col gap-0.5 font-bold\">\n                                                      <span className=\"text-slate-400\">{ans?.preScore || '-'}</span>\n                                                      <span className=\"text-blue-700 font-black\">{ans?.score || '-'}</span>\n                                                    </div>\n                                                  </td>\n                                                );\n                                              })}"
);

// 3. Individual row: Aggregate metrics (Blue-700, Black)
content = content.replace(
  /className="p-4 text-center font-black text-\[10px\] text-emerald-600\/40">\{rSatAvg\.toFixed\(2\)\}<\/td>/,
  'className="p-4 text-center font-black text-[10px] text-blue-700">{rSatAvg.toFixed(2)}</td>'
);
content = content.replace(
  /className="p-4 text-center font-black text-\[10px\] text-blue-600\/40">\{rPostAvg\.toFixed\(2\)\}<\/td>/,
  'className="p-4 text-center font-black text-[10px] text-blue-700">{rPostAvg.toFixed(2)}</td>'
);
content = content.replace(
  /className="text-\[10px\] font-black text-slate-800\/40">\{rGain\.toFixed\(2\)\}<\/span>/,
  'className="text-[10px] font-black text-blue-700">{rGain.toFixed(2)}</span>'
);

// 4. Summary rows: Highlighting meaningful metrics in Blue/Bold
// Already somewhat highlighted but I'll make sure they use the specific Blue-700
content = content.replace(
  /className="p-4 text-center font-black text-xs bg-emerald-50\/30">\{stats\?\.satAvg\?\.toFixed\(2\) \|\| '-'\}<\/td>/g,
  'className="p-4 text-center font-black text-xs bg-emerald-50/30 text-blue-700">{stats?.satAvg?.toFixed(2) || "-"}</td>'
);
content = content.replace(
  /className="p-4 text-center font-black text-xs bg-blue-50\/30">/,
  'className="p-4 text-center font-black text-xs bg-blue-50/30 text-blue-700">'
);
// impRate highlighting
content = content.replace(
  /stats\.impRate >= 0 \? "text-blue-600" : "text-red-500"/g,
  'stats.impRate >= 0 ? "text-blue-700" : "text-red-600"'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully applied data visibility and typography enhancements to page.tsx');
