const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Satisfaction Radar themeData
content = content.replace(
    'const themeData = {};',
    'const themeData: Record<string, { theme: string, score: number, count: number }> = {};'
);

// Fix 2: Competency Radar themeData (since there are two, the first replace might have taken both if identical, or we need to be careful)
// Actually the competency one is slightly different in the original patch.
content = content.replace(
    'const themeData = {};',
    'const themeData: Record<string, { theme: string, pre: number, post: number, count: number }> = {};'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully fixed TypeScript index signature issues');
