'use client';

import * as React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Video, Calendar as CalendarIcon, Clock, MapPin, Target, FileText } from 'lucide-react';

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
  onSave: () => void;
  isSaving: boolean;
  projects: { id: string; name: string }[];
}

export function MeetingDialog({ 
  open, onOpenChange, title, description, data, onChange, onSave, isSaving, projects 
}: MeetingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 border-none shadow-2xl">
        <DialogHeader className="mb-6">
          <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
            <Video className="size-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <DialogTitle className="text-2xl font-black">{title}</DialogTitle>
          <DialogDescription className="text-slate-500">{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">사업 선택</Label>
            <select 
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              value={data.projectId || ''}
              onChange={(e) => onChange('projectId', e.target.value)}
            >
              <option value="">사업을 선택하세요</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">회의명</Label>
            <Input 
              value={data.title || ''} 
              onChange={(e) => onChange('title', e.target.value)}
              className="h-11 rounded-xl border-slate-200 dark:border-slate-800"
              placeholder="회의 제목을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">날짜</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                type="date" 
                value={data.date || ''} 
                onChange={(e) => onChange('date', e.target.value)}
                className="h-11 pl-10 rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">장소</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                value={data.location || ''} 
                onChange={(e) => onChange('location', e.target.value)}
                className="h-11 pl-10 rounded-xl border-slate-200 dark:border-slate-800"
                placeholder="회의 장소"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">시작 시간</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                type="time" 
                value={data.startTime || ''} 
                onChange={(e) => onChange('startTime', e.target.value)}
                className="h-11 pl-10 rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">종료 시간</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input 
                type="time" 
                value={data.endTime || ''} 
                onChange={(e) => onChange('endTime', e.target.value)}
                className="h-11 pl-10 rounded-xl border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">회의 목적</Label>
            <div className="relative">
              <Target className="absolute left-3 top-3 size-4 text-slate-400" />
              <Textarea 
                value={data.purpose || ''} 
                onChange={(e) => onChange('purpose', e.target.value)}
                className="min-h-[80px] pl-10 rounded-xl border-slate-200 dark:border-slate-800 resize-none"
                placeholder="회의 진행 목적을 설명하세요"
              />
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <Label className="text-xs font-bold text-slate-500 ml-1">주요 안건</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 size-4 text-slate-400" />
              <Textarea 
                value={data.agenda || ''} 
                onChange={(e) => onChange('agenda', e.target.value)}
                className="min-h-[80px] pl-10 rounded-xl border-slate-200 dark:border-slate-800 resize-none"
                placeholder="검토할 주요 안건 리스트"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6">취소</Button>
          <Button onClick={onSave} disabled={isSaving} className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-xl h-11 px-8 font-bold">
            {isSaving ? '저장 중...' : '저장하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
