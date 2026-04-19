const fs = require('fs');
const path = 'src/store/use-survey-store.ts';
let content = fs.readFileSync(path, 'utf8');

// Find the calculateRecursive inner function logic to add themeStats
// Mapping logic: we need to collect theme info during aggregation.

const themeStatsInject = `
      const themeStats: Record<string, { preSum: number, postSum: number, satSum: number, count: number }> = {};
      
      combined.responses.forEach(res => {
        const tmpl = templateMap.get(res.templateId);
        if(!tmpl) return;
        res.answers.forEach((ans, idx) => {
          const q = tmpl.questions[idx];
          if(!q || !q.theme) return;
          if(!themeStats[q.theme]) themeStats[q.theme] = { preSum: 0, postSum: 0, satSum: 0, count: 0 };
          const ts = themeStats[q.theme];
          if(tmpl.type === 'SATISFACTION' && q.type === 'SCALE') {
            ts.satSum += Number(ans.score || 0);
            ts.count++;
          } else if(tmpl.type === 'COMPETENCY') {
            ts.preSum += Number(ans.preScore || 0);
            ts.postSum += Number(ans.score || 0);
            ts.count++;
          }
        });
      });

      const finalThemeStats: Record<string, any> = {};
      Object.entries(themeStats).forEach(([theme, s]) => {
        finalThemeStats[theme] = {
          preAvg: s.count > 0 ? s.preSum / s.count : 0,
          postAvg: s.count > 0 ? s.postSum / s.count : 0,
          average: s.count > 0 ? (s.satSum > 0 ? s.satSum / s.count : s.postSum / s.count) : 0,
          count: s.count
        };
      });
`;

// Inject into the result object of calculateRecursive
content = content.replace(
  'const result = {',
  themeStatsInject + '\n      const result = {'
);

content = content.replace(
  'impRate: preAvg > 0 ? ((postAvg - preAvg) / preAvg) * 100 : 0,',
  'impRate: preAvg > 0 ? ((postAvg - preAvg) / preAvg) * 100 : 0,\n        themeStats: finalThemeStats,'
);

// Also need to handle _overall
content = content.replace(
  "aggregated['_overall'] = {",
  themeStatsInject.replace('combined.responses', 'uniqueResponses') + "\n        aggregated['_overall'] = {"
);

content = content.replace(
  'impRate: pre > 0 ? ((post - pre) / pre) * 100 : 0,',
  'impRate: pre > 0 ? ((post - pre) / pre) * 100 : 0,\n          themeStats: finalThemeStats,'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully injected themeStats logic');
