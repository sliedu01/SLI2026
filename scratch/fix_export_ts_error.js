const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the HWPX export logic to avoid the missing 'comment' property
const correctedExport = `
                      <Button 
                        onClick={() => {
                          const exportHWPX = () => {
                            const expertComment = (overallStats?.satAvg || 0) >= 4.5 
                              ? "최우수(Excellent) 등급의 교육 만족도와 안정적인 역량 향상이 관찰됩니다. 교육 과정의 기획과 운영이 교육생의 니즈와 완벽하게 일치하며, 실무 전이 가능성이 매우 높은 상태입니다."
                              : (overallStats?.satAvg || 0) >= 4.0
                              ? "우수한 교육 품질이 유지되고 있으며, 학습자의 반응과 성취도가 고르게 나타나고 있습니다. 전반적인 운영 프로세스가 견고한 것으로 판단됩니다."
                              : "보통 수준의 성과를 보이고 있으며, 특정 영역에서의 보완이 필요해 보입니다.";

                            const reportContent = \`
                              한글 교육 전문가 정밀 분석 보고서
                              ----------------------------------
                              분석 대상: \${selectedProjectIds.length}개 사업
                              기준일: \${format(new Date(), 'yyyy년 MM월 dd일')}
                              
                              1. 만족도 지수: \${(overallStats?.satAvg || 0).toFixed(2)} / 5.00
                              2. 역량 향상도 (Gain): \${(overallStats?.hakeGain || 0).toFixed(2)}
                              
                              [교육 전문가 성과 분석]
                              \${expertComment}
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
`;

content = content.replace(
  /                      <Button\s+onClick=\{\(\) => \{\s+const exportHWPX = \(\) => \{[\s\S]+?\}\s+exportHWPX\(\);\s+\}\}/,
  correctedExport
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully fixed TypeScript error in export logic');
