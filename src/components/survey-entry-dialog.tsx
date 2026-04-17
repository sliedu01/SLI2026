'use client';

import * as React from 'react';
import { 
  ClipboardCheck, 
  Table as TableIcon,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Layout,
  MessageSquare,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useSurveyStore, SurveyTemplate, SurveyResponse, Answer, SurveyType } from '@/store/use-survey-store';
import { cn } from '@/lib/utils';

interface SurveyEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  type: SurveyType;
}

export function SurveyEntryDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  type
}: SurveyEntryDialogProps) {
  const { templates, addResponse, clearProjectResponses, responses } = useSurveyStore();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [pasteContent, setPasteContent] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // 현재 유형에 맞는 템플릿 필터링
  const filteredTemplates = templates.filter(t => t.type === type);
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  
  // 현재 프로젝트의 기존 응답 수
  const existingResponsesCount = responses.filter(r => r.projectId === projectId && r.templateId === selectedTemplateId).length;

  const handlePasteProcess = async () => {
    if (!pasteContent.trim() || !selectedTemplate) return;
    
    setIsProcessing(true);
    try {
      const rows = pasteContent.trim().split('\n');
      const newResponses: Omit<SurveyResponse, 'id' | 'createdAt'>[] = [];
      
      rows.forEach((row) => {
        const cols = row.split('\t').map(c => c.trim());
        if (cols.length < 2) return;

        const respondentId = cols[0]; 
        const answers: Answer[] = [];
        let colIdx = 1;

        selectedTemplate.questions.forEach(q => {
          if (selectedTemplate.type === 'COMPETENCY') {
            // 역량진단: 사전(pre), 사후(post) 2개 컬럼씩 필요
            answers.push({
              questionId: q.id,
              preScore: Number(cols[colIdx]) || 0,
              score: Number(cols[colIdx + 1]) || 0
            });
            colIdx += 2;
          } else {
            // 만족도: 점수(score), 텍스트(text) 2개 컬럼씩 필요 (또는 점수만)
            answers.push({
              questionId: q.id,
              score: Number(cols[colIdx]) || 0,
              text: cols[colIdx + 1] || ''
            });
            colIdx += 2;
          }
        });

        newResponses.push({
          projectId,
          templateId: selectedTemplate.id,
          respondentId,
          answers
        });
      });

      // 순차적으로 저장 (백엔드 부하 조절)
      for (const res of newResponses) {
        await addResponse(res);
      }

      setPasteContent('');
      alert(`${newResponses.length}명의 데이터를 성공적으로 연동했습니다.`);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert('데이터 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    if (confirm('이 사업의 현재 설문 데이터를 모두 삭제하시겠습니까?')) {
      await clearProjectResponses(projectId);
      alert('데이터가 초기화되었습니다.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className={cn(
          "p-8 text-white",
          type === 'SATISFACTION' ? "bg-emerald-600" : "bg-blue-600"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="size-6 text-white/80" />
            <Badge className="bg-white/20 text-white border-none font-black uppercase text-[10px]">
              {type === 'SATISFACTION' ? '교육 만족도 조사' : '사전/사후 역량 진단'}
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-black">{projectName}</DialogTitle>
          <DialogDescription className="text-white/80 font-medium">
            {type === 'SATISFACTION' 
              ? '교육 인프라, 강사, 콘텐츠에 대한 만족도 데이터를 입력합니다.' 
              : '교육 전/후의 역량 변화를 측정하기 위한 데이터를 입력합니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6">
          {/* 1. 템플릿 선택 영역 */}
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">설문 템플릿 로드</label>
             <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black text-slate-700">
                   <SelectValue placeholder="입력에 사용할 템플릿을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl">
                   {filteredTemplates.map(t => (
                     <SelectItem key={t.id} value={t.id} className="font-bold py-3">
                        <div className="flex flex-col">
                           <span>{t.name}</span>
                           <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{t.questions.length} 문항 구성</span>
                        </div>
                     </SelectItem>
                   ))}
                   {filteredTemplates.length === 0 && (
                     <p className="p-4 text-xs font-bold text-slate-400 text-center">정의된 템플릿이 없습니다.<br/>[설문 관리] 탭에서 먼저 생성해 주세요.</p>
                   )}
                </SelectContent>
             </Select>
          </div>

          {selectedTemplate && (
            <>
              {/* 2. 안내 및 도구 영역 */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 rounded-[1.5rem] bg-blue-50/50 border border-blue-100 flex items-start gap-4">
                    <FileSpreadsheet className="size-6 text-blue-600 mt-1 shrink-0" />
                    <div>
                       <p className="text-xs font-black text-blue-900 mb-1 leading-tight">엑셀 데이터 권장 구조</p>
                       <p className="text-[10px] font-bold text-blue-600 leading-relaxed">
                          • 첫 번째 컬럼: 학습자 식별값(이름 등)<br/>
                          • 이후: {selectedTemplate.type === 'COMPETENCY' ? '사전 점수, 사후 점수 나열' : '점수, 소감(선택) 나열'}<br/>
                          • 총 {selectedTemplate.type === 'COMPETENCY' ? selectedTemplate.questions.length * 2 : selectedTemplate.questions.length * 2}개 컬럼 필요
                       </p>
                    </div>
                 </div>
                 <div className="p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">현재 입력된 데이터</p>
                       <p className="text-xl font-black text-slate-900">{existingResponsesCount} <span className="text-sm">건</span></p>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={handleClear}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold text-xs"
                    >
                       전체 초기화
                    </Button>
                 </div>
              </div>

              {/* 3. 텍스트 입력 영역 */}
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">붙여넣기 영역 (Paste Here)</label>
                 <Textarea 
                   placeholder="엑셀에서 데이터를 복사하여 여기에 붙여넣어 주세요..."
                   className="h-48 rounded-2xl border-slate-100 bg-slate-50/50 p-6 font-mono text-[11px] focus-visible:ring-blue-100"
                   value={pasteContent}
                   onChange={(e) => setPasteContent(e.target.value)}
                 />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-8 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 grid grid-cols-2 gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 rounded-2xl font-black text-slate-400">취소</Button>
          <Button 
            disabled={!selectedTemplate || !pasteContent || isProcessing}
            onClick={handlePasteProcess}
            className={cn(
              "h-14 rounded-2xl font-black shadow-xl transition-all active:scale-95",
              type === 'SATISFACTION' ? "bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700" : "bg-blue-600 shadow-blue-100 hover:bg-blue-700"
            )}
          >
            {isProcessing ? <Activity className="size-5 animate-spin mr-2" /> : <CheckCircle2 className="size-5 mr-2" />}
            결과 데이터 연동 실행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
