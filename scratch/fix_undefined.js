const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Satisfaction RAW table reduce
content = content.replace(
    '${(m.sat?.answers.reduce((a,b)=>a+b.score, 0) / (m.sat?.answers.length || 1)).toFixed(2)}',
    '${((m.sat?.answers || []).reduce((a,b)=>a+b.score, 0) / (m.sat?.answers?.length || 1)).toFixed(2)}'
);

// Fix 2: Competency RAW table reduce
content = content.replace(
    '${(m.comp?.answers.reduce((a,b)=>a+b.score, 0) / (m.comp?.answers.length || 1)).toFixed(2)}',
    '${((m.comp?.answers || []).reduce((a,b)=>a+b.score, 0) / (m.comp?.answers?.length || 1)).toFixed(2)}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully fixed TypeScript undefined access issues in raw data table');
