'use client';

import * as React from 'react';
import { 
  Settings2, Plus, Trash2, Edit, FileText, 
  LayoutGrid, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SurveyTemplate } from '@/store/use-survey-store';
import { cn } from '@/lib/utils';

interface TemplateSettingsProps {
  templates: SurveyTemplate[];
  onAdd: (type: 'SATISFACTION' | 'COMPETENCY') => void;
  onEdit: (template: SurveyTemplate) => void;
  onDelete: (id: string) => void;
}

export function SurveyTemplateSettings({ templates, onAdd, onEdit, onDelete }: TemplateSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black flex items-center gap-2">
            <Settings2 className="size-5 text-indigo-600" />
            설문 템플릿 구성 관리
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">교육 성과 분석을 위한 설문 문항 및 카테고리를 설정합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onAdd('SATISFACTION')}
            className="rounded-xl border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold"
          >
            <Plus className="size-4 mr-1" /> 만족도 템플릿
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onAdd('COMPETENCY')}
            className="rounded-xl border-blue-200 hover:bg-blue-50 text-blue-700 font-bold"
          >
            <Plus className="size-4 mr-1" /> 역량진단 템플릿
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(tmpl => (
          <Card key={tmpl.id} className="p-6 border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 hover:shadow-md transition-all group overflow-hidden relative">
            <div className={cn(
              "absolute -right-4 -top-4 size-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity",
              tmpl.type === 'SATISFACTION' ? "bg-emerald-500" : "bg-blue-500"
            )} />
            
            <div className="flex items-start justify-between relative z-10 mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center shadow-sm",
                  tmpl.type === 'SATISFACTION' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                )}>
                  <FileText className="size-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white">{tmpl.name}</h4>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-bold mt-1 border-none px-0",
                    tmpl.type === 'SATISFACTION' ? "text-emerald-600" : "text-blue-600"
                  )}>
                    {tmpl.type === 'SATISFACTION' ? '운영 만족도 (SAT)' : '핵심 역량 진단 (COMP)'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(tmpl)} className="size-8 rounded-lg hover:bg-slate-100">
                  <Edit className="size-4 text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(tmpl.id)} className="size-8 rounded-lg hover:bg-red-50 text-red-500">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>구성 문항 ({tmpl.questions.length}개)</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3" /> 활성화됨</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {tmpl.questions.map((q, idx) => (
                  <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
                    <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate flex-1">{q.content}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-200 dark:border-slate-800 font-bold opacity-60">{q.theme}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="col-span-2 p-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">
            <LayoutGrid className="size-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">생성된 설문 템플릿이 없습니다.<br/>위 버튼을 눌러 교육 과정에 맞는 템플릿을 생성하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
