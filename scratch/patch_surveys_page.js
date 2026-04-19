const fs = require('fs');
const path = 'src/app/surveys/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add new states
content = content.replace(
  'const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);',
  'const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);\n' +
  '  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean, title: string, description: string, onConfirm: () => void }>({ \n' +
  '    open: false, title: "", description: "", onConfirm: () => {} \n' +
  '  });'
);

// 2. Wrap Deletions in deleteConfirm
content = content.replace(
  'deleteTemplate(t.id);',
  'setDeleteConfirm({ open: true, title: "템플릿 삭제", description: "이 템플릿과 연결된 모든 데이터가 영향을 받을 수 있습니다. 계속하시겠습니까?", onConfirm: async () => { await deleteTemplate(t.id); setDeleteConfirm(p => ({...p, open: false})); } });'
);

content = content.replace(
  "if(confirm('삭제?')){await Promise.all(selectedProjectIds.map(id=>clearProjectResponses(id))); await fetchSurveys();}",
  'setDeleteConfirm({ open: true, title: "데이터 초기화", description: `선택된 ${selectedProjectIds.length}개 사업의 모든 응답 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`, onConfirm: async () => { await Promise.all(selectedProjectIds.map(id=>clearProjectResponses(id))); await fetchSurveys(); setDeleteConfirm(p => ({...p, open: false})); alert("삭제 완료"); } })'
);

// 3. Add Subject Selection Widget at the top of Analytics
const selectionWidget = `
              {/* 상단 분석 대상 선택 퀵 위젯 */}
              <div className="flex flex-wrap gap-3 px-2">
                <div className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-xl mr-2">
                  <TargetIcon className="size-4" />
                  <span className="text-xs font-black">분석 리포트 대상 구성</span>
                </div>
                {projects.filter(p => selectedProjectIds.includes(p.id) && p.level === 4).map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl group hover:bg-white hover:shadow-md transition-all">
                    <Checkbox 
                      checked={true}
                      onChange={() => setSelectedProjectIds(prev => prev.filter(id => id !== p.id))}
                      className="size-3.5"
                    />
                    <span className="text-[11px] font-black text-slate-700">{p.name}</span>
                    <button onClick={() => setSelectedProjectIds(prev => prev.filter(id => id !== p.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
                {selectedProjectIds.length === 0 && (
                  <div className="text-xs font-bold text-slate-400 py-2">상단 사업 탐색기에서 분석할 사업을 선택해 주세요.</div>
                )}
              </div>
`;

content = content.replace(
  '<div className="space-y-8 animate-in slide-in-from-bottom-5">',
  '<div className="space-y-8 animate-in slide-in-from-bottom-5">\n' + selectionWidget
);

// 4. Fix Radar Charts Mapping to use themeStats
// we use a more robust regex for replacements or literal unique parts
content = content.replace(
  'satQuestions.forEach((q, i) => {',
  'Object.entries(overallStats.themeStats || {}).forEach(([theme, s]) => {'
);
// This part is very tricky with simple replace. I will use more targeted content.

// 5. Add Confirm Dialog Component at the end
const confirmDialogComponent = `
      <Dialog open={deleteConfirm.open} onOpenChange={(o) => setDeleteConfirm(p => ({...p, open: o}))}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-12 bg-white shadow-3xl">
          <DialogHeader className="space-y-4">
            <div className="size-16 rounded-3xl bg-red-50 flex items-center justify-center mb-2 mx-auto">
              <AlertCircle className="size-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-slate-900">{deleteConfirm.title}</DialogTitle>
            <DialogDescription className="text-sm font-bold text-center text-slate-500 leading-relaxed font-mono">
              {deleteConfirm.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-4 pt-8">
            <Button variant="ghost" onClick={() => setDeleteConfirm(p => ({...p, open: false}))} className="flex-1 h-14 rounded-2xl font-black text-slate-400">취소</Button>
            <Button onClick={deleteConfirm.onConfirm} className="flex-1 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-100">삭제 진행</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

content = content.replace(
  '</main>',
  '</main>\n' + confirmDialogComponent
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched page.tsx partially');
