'use client';

import * as React from 'react';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, Settings2 } from 'lucide-react';
import { SurveyTemplate, Question } from '@/store/use-survey-store';
import { cn } from '@/lib/utils';

interface TemplateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: SurveyTemplate | null;
  onSave: (id: string, data: Partial<SurveyTemplate>) => Promise<void>;
}

export function TemplateEditDialog({ open, onOpenChange, template, onSave }: TemplateEditDialogProps) {
  const [name, setName] = React.useState('');
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setQuestions([...template.questions].sort((a, b) => a.order - b.order));
    }
  }, [template]);

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      division: '새 구분',
      theme: '새 테마',
      content: '새 문항 내용',
      type: 'SCALE',
      order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleSave = async () => {
    if (!template) return;
    setIsSaving(true);
    try {
      await onSave(template.id, { 
        name, 
        questions: questions.map((q, i) => ({ ...q, order: i + 1 })) 
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('템플릿 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-[2.5rem] border-none shadow-2xl bg-white">
        <DialogHeader className="px-8 pt-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Settings2 className="size-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black">템플릿 상세 설정</DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500">
                설문 구성 항목과 질문 내용을 편집합니다.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 custom-scrollbar">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">템플릿 명칭</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold text-sm focus-visible:ring-indigo-500/20"
              placeholder="템플릿 이름을 입력하세요"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">문항 구성 ({questions.length}개)</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAddQuestion}
                className="h-7 rounded-lg text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                <Plus className="size-3 mr-1" /> 문항 추가
              </Button>
            </div>

            <div className="space-y-3">
              {questions.map((q, index) => (
                <div key={q.id} className="group relative bg-slate-50/50 rounded-2xl border border-slate-100 p-4 transition-all hover:bg-white hover:shadow-md hover:border-indigo-100">
                  <div className="flex items-start gap-4">
                    <div className="pt-2 text-slate-300 group-hover:text-slate-400 transition-colors">
                      <GripVertical className="size-4" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-slate-400 ml-0.5">구분</Label>
                          <Input 
                            value={q.division} 
                            onChange={(e) => handleUpdateQuestion(q.id, 'division', e.target.value)}
                            className="h-8 rounded-lg bg-white/50 border-slate-100 text-[11px] font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-slate-400 ml-0.5">테마 (태그)</Label>
                          <Input 
                            value={q.theme} 
                            onChange={(e) => handleUpdateQuestion(q.id, 'theme', e.target.value)}
                            className="h-8 rounded-lg bg-white/50 border-slate-100 text-[11px] font-bold"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-400 ml-0.5">질문 내용</Label>
                        <Input 
                          value={q.content} 
                          onChange={(e) => handleUpdateQuestion(q.id, 'content', e.target.value)}
                          className="h-9 rounded-lg bg-white/50 border-slate-100 text-[12px] font-medium"
                        />
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="size-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 size-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-8 py-6 bg-slate-50 border-t border-slate-100 gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold h-11 border-slate-200"
          >
            취소
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl font-black h-11 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-200"
          >
            {isSaving ? '저장 중...' : '변경 사항 저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
