'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Project } from '@/store/use-project-store';
import { MessageSquare, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonitoringCommentCardProps {
  project: Project | null;
  onSave: (satComment: string, compComment: string) => Promise<void>;
}

export function MonitoringCommentCard({ project, onSave }: MonitoringCommentCardProps) {
  const [satComment, setSatComment] = React.useState('');
  const [compComment, setCompComment] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // 선택된 프로젝트가 바뀔 때 기존 등록된 코멘트를 불러옴
  React.useEffect(() => {
    if (project) {
      setSatComment(project.monitoringSatComment || '');
      setCompComment(project.monitoringCompComment || '');
      setSaveSuccess(false);
    } else {
      setSatComment('');
      setCompComment('');
    }
  }, [project]);

  if (!project) {
    return (
      <Card className="p-6 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl flex flex-col items-center justify-center text-center min-h-[140px] transition-all duration-300">
        <AlertCircle className="size-6 text-slate-400 mb-2.5 animate-pulse" />
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">개별 과정(프로젝트) 미선택</h4>
        <p className="text-[10px] text-slate-400 mt-1 max-w-sm leading-relaxed">
          왼쪽 사업 필터 트리에서 개별 교육 과정을 **하나만 선택**하시면,<br />
          만족도 및 사전사후 성숙도 분석 결과에 대한 모니터링 코멘트를 기록할 수 있습니다.
        </p>
      </Card>
    );
  }

  const isChanged = 
    satComment !== (project.monitoringSatComment || '') || 
    compComment !== (project.monitoringCompComment || '');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave(satComment.trim(), compComment.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save monitoring comments:', error);
      alert('코멘트 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextChange = (
    value: string, 
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    // 300자 초과 방지
    if (value.length <= 300) {
      setter(value);
    } else {
      setter(value.substring(0, 300));
    }
  };

  return (
    <Card className="p-6 border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 shadow-xl rounded-[2rem] overflow-hidden transition-all duration-300 relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 dark:border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <MessageSquare className="size-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              모니터링 요원 의견서 작성
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100/50">
                {project.name}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              해당 과정의 만족도 설문 분석과 사전사후 역량 진단 결과에 전문 모니터링 의견을 덧붙입니다 (각 300자 이내).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {saveSuccess && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-200/30 transition-all duration-300">
              <Check className="size-3.5" /> DB 저장 완료
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isChanged}
            className={cn(
              "rounded-xl font-bold text-xs h-9 px-4 transition-all duration-300",
              isChanged 
                ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="size-3.5 mr-1.5" />
            ) : (
              <Sparkles className="size-3.5 mr-1.5 text-indigo-500 animate-pulse" />
            )}
            의견 저장하기
          </Button>
        </div>
      </div>

      {/* Input Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Satisfaction Monitoring Comment */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/50 transition-all duration-300">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              1. 만족도 지표 모니터링 코멘트
            </span>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
              satComment.length >= 280 
                ? "text-red-500 bg-red-50 dark:bg-red-950/20" 
                : "text-slate-400 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900"
            )}>
              {satComment.length} / 300자
            </span>
          </div>
          <Textarea
            value={satComment}
            onChange={(e) => handleTextChange(e.target.value, setSatComment)}
            placeholder="교육 인프라, 교재의 적절성, 강사의 전달성 및 추천 의향 등 종합적인 만족도 수치에 대한 해석과 코멘트를 적어주세요. (미기입 시 보고서에는 기본 총평만 제공됩니다.)"
            rows={3}
            className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 resize-none leading-relaxed p-3.5 placeholder:text-slate-400/80"
          />
        </div>

        {/* Competency Monitoring Comment */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/50 transition-all duration-300">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-blue-500" />
              2. 성숙도(사전사후) 모니터링 코멘트
            </span>
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
              compComment.length >= 280 
                ? "text-red-500 bg-red-50 dark:bg-red-950/20" 
                : "text-slate-400 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900"
            )}>
              {compComment.length} / 300자
            </span>
          </div>
          <Textarea
            value={compComment}
            onChange={(e) => handleTextChange(e.target.value, setCompComment)}
            placeholder="사전진단 대비 사후 진단의 변화율, Hake's Gain 학습효과지수 및 Cohen's d 효과크기에 대한 평가 및 보강 의견을 기술해주세요. (미기입 시 보고서에는 기본 총평만 제공됩니다.)"
            rows={3}
            className="w-full text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 resize-none leading-relaxed p-3.5 placeholder:text-slate-400/80"
          />
        </div>

      </div>
    </Card>
  );
}
