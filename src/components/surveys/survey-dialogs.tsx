'use client';

import * as React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Clipboard } from 'lucide-react';
import { SurveyResponse, Question } from '@/store/use-survey-store';
import { cn } from '@/lib/utils';

interface PasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  onContentChange: (val: string) => void;
  isProcessing: boolean;
  onProcess: (shouldClear: boolean) => void;
}

export function PasteDialog({ open, onOpenChange, content, onContentChange, isProcessing, onProcess }: PasteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-8 border-none shadow-2xl overflow-hidden">
        <DialogHeader className="mb-6">
          <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
            <Clipboard className="size-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <DialogTitle className="text-2xl font-black">데이터 일괄 등록</DialogTitle>
          <DialogDescription className="text-base text-slate-500 pt-1">
            Excel 또는 Google 시트의 데이터를 복사하여 붙여넣으세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 leading-relaxed">
            <p className="font-bold text-slate-900 dark:text-slate-200 mb-1">복사 형식 안내:</p>
            <p>1열: 응답자ID | 2열: 만족도(1-5) | 3열: 역량사전 | 4열: 역량사후</p>
          </div>
          <Textarea 
            placeholder="응답자 데이터를 여기에 붙여넣으세요..." 
            className="min-h-[250px] rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 resize-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm leading-relaxed"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
          />
        </div>

        <DialogFooter className="mt-8 gap-3">
          <Button variant="ghost" onClick={() => onProcess(false)} disabled={isProcessing} className="rounded-xl h-12 font-bold px-6">
            기존 데이터 유지하고 추가
          </Button>
          <Button onClick={() => onProcess(true)} disabled={isProcessing} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl h-12 font-bold px-8 shadow-lg shadow-slate-200 dark:shadow-none hover:translate-y-[-2px] transition-all">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '기존 데이터 삭제 후 등록'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  response: SurveyResponse | null;
  questions: Question[];
  onSave: (id: string, data: Partial<SurveyResponse>) => void;
  onUpdateAnswer: (qId: string, score: number) => void;
}

export function EditDialog({ open, onOpenChange, response, questions, onSave, onUpdateAnswer }: EditDialogProps) {
  if (!response) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black">개별 응답 상세 수정</DialogTitle>
          <DialogDescription className="text-slate-500">
            응답자 ID: {response.respondentId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {questions.map((q) => {
            const answer = response.answers.find(a => a.questionId === q.id);
            return (
              <div key={q.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 group hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                      {q.division} • {q.theme}
                    </span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{q.content}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <Button
                      key={score}
                      variant={answer?.score === score ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "flex-1 h-10 rounded-xl font-bold transition-all",
                        answer?.score === score 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none scale-105" 
                          : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      )}
                      onClick={() => onUpdateAnswer(q.id, score)}
                    >
                      {score}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6">취소</Button>
          <Button onClick={() => onSave(response.id, response)} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl h-11 px-8 font-bold">저장하기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
