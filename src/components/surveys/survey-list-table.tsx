'use client';

import * as React from 'react';
import { Edit, Trash2, User, Search, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from "@/components/ui/tooltip";
import { SurveyResponse, SurveyTemplate, Answer } from '@/store/use-survey-store';

interface SurveyListTableProps {
  responses: SurveyResponse[];
  templates: SurveyTemplate[];
  selectedProjectIds: string[];
  onEdit: (response: SurveyResponse) => void;
  onDelete: (rid: string, pid: string) => void;
  onDeleteAll?: () => void;
}

interface RowData {
  rid: string;
  pid: string;
  sAvg: number;
  cPre: number;
  cPost: number;
  rGain: number;
  sat?: SurveyResponse;
  comp?: SurveyResponse;
  satTemplate?: SurveyTemplate;
  compTemplate?: SurveyTemplate;
}

export function SurveyListTable({ responses, templates, selectedProjectIds, onEdit, onDelete, onDeleteAll }: SurveyListTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const allRowData = React.useMemo(() => {
    const templateMap = new Map((templates || []).map(t => [t.id, t]));
    
    return selectedProjectIds.flatMap(pid => {
      const pResponses = responses.filter(r => r.projectId === pid);
      const respondentIds = Array.from(new Set(pResponses.map(r => r.respondentId)));

      return respondentIds.map(rid => {
        const rResps = pResponses.filter(r => r.respondentId === rid);
        const sat = rResps.find(r => templateMap.get(r.templateId)?.type === 'SATISFACTION');
        const comp = rResps.find(r => templateMap.get(r.templateId)?.type === 'COMPETENCY');

        const sAnswers = sat?.answers || [];
        const sAvg = sAnswers.length > 0 ? sAnswers.reduce((a, b: Answer) => a + (Number(b.score) || 0), 0) / sAnswers.length : 0;

        const rCompAnswers = comp?.answers || [];
        const cPre = rCompAnswers.length > 0 ? rCompAnswers.reduce((a, b: Answer) => a + (Number(b.preScore) || 0), 0) / rCompAnswers.length : 0;
        const cPost = rCompAnswers.length > 0 ? rCompAnswers.reduce((a, b: Answer) => a + (Number(b.score) || 0), 0) / rCompAnswers.length : 0;
        const rGain = (cPre > 0 || cPost > 0) && (5 - cPre) > 0 ? (cPost - cPre) / (5 - cPre) : 0;

        const satTemplate = sat ? templateMap.get(sat.templateId) : undefined;
        const compTemplate = comp ? templateMap.get(comp.templateId) : undefined;

        return { rid, pid, sAvg, cPre, cPost, rGain, sat, comp, satTemplate, compTemplate };
      });
    }).filter(row => row.rid.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a: RowData, b: RowData) => a.rid.localeCompare(b.rid, undefined, { numeric: true, sensitivity: 'base' }));
  }, [responses, templates, selectedProjectIds, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="size-2 rounded-full bg-slate-900 dark:bg-slate-100" />
          개별 응답 데이터 상세
          <span className="text-sm font-normal text-slate-500 ml-2">총 {allRowData.length}명</span>
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input 
              placeholder="응답자 ID 검색..." 
              className="pl-9 h-9 rounded-xl border-slate-200 dark:border-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {selectedProjectIds.length === 1 && onDeleteAll && (
            <Button 
              variant="outline" 
              className="rounded-xl border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={onDeleteAll}
            >
              <Trash2 className="size-4 mr-2" />
              선택 과정 전체 삭제
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="p-3 border-r dark:border-slate-800 text-center w-14">NO</th>
                <th className="p-3 border-r dark:border-slate-800 text-left">응답자 ID</th>
                <th className="p-3 border-r dark:border-slate-800 text-center w-24">만족도</th>
                <th className="p-3 border-r dark:border-slate-800 text-center w-20">사전</th>
                <th className="p-3 border-r dark:border-slate-800 text-center w-20">사후</th>
                <th className="p-3 border-r dark:border-slate-800 text-center w-20">향상도</th>
                <th className="p-3 text-center w-32">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allRowData.map((row, rIdx) => {
                const rowId = `${row.pid}-${row.rid}-${rIdx}`;
                const isExpanded = expandedRowId === rowId;
                
                return (
                  <React.Fragment key={rowId}>
                    <tr 
                      className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedRowId(isExpanded ? null : rowId)}
                    >
                      <td className="p-3 border-r dark:border-slate-800 text-center text-slate-400 font-bold">
                        <div className="flex items-center justify-center gap-1">
                          {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          {rIdx + 1}
                        </div>
                      </td>
                      <td className="p-3 border-r dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200">{row.rid}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-center font-bold text-emerald-600 dark:text-emerald-400">{row.sAvg.toFixed(2)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-center text-slate-400">{row.cPre.toFixed(2)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-center font-black text-blue-600 dark:text-blue-400">{row.cPost.toFixed(2)}</td>
                      <td className="p-3 border-r dark:border-slate-800 text-center text-blue-700 dark:text-blue-300 font-bold">
                        {row.cPre >= 5 ? 'N/A' : `${Math.round(row.rGain * 100)}%`}
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipProvider>
                            {row.sat && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => onEdit(row.sat!)}
                                    className="size-8 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600"
                                  >
                                    <Edit className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>만족도 수정</TooltipContent>
                              </Tooltip>
                            )}
                            {row.comp && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => onEdit(row.comp!)}
                                    className="size-8 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600"
                                  >
                                    <TrendingUp className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>역량 수정</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => onDelete(row.rid, row.pid)}
                                  className="size-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>응답 삭제</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                        <td colSpan={7} className="p-4 border-b dark:border-slate-800">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                만족도 문항별 응답
                              </h4>
                              {row.sat && row.satTemplate ? (
                                <ul className="space-y-2 text-xs">
                                  {row.satTemplate.questions.map((q, i) => (
                                    <li key={q.id} className="flex justify-between items-start gap-4 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <span className="text-slate-600 dark:text-slate-400 flex-1 leading-relaxed break-words line-clamp-2" title={q.content}>
                                        {i + 1}. {q.content}
                                      </span>
                                      <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                        {q.type === 'SCALE' ? (row.sat!.answers.find(a => a.questionId === q.id)?.score || '-') : (row.sat!.answers.find(a => a.questionId === q.id)?.text || '-')}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : <span className="text-xs text-slate-400 px-2">데이터 없음</span>}
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                              <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2 text-sm">
                                <span className="size-1.5 rounded-full bg-blue-500" />
                                역량 문항별 사전/사후 응답
                              </h4>
                              {row.comp && row.compTemplate ? (
                                <ul className="space-y-2 text-xs">
                                  {row.compTemplate.questions.map((q, i) => {
                                    const ans = row.comp!.answers.find(a => a.questionId === q.id);
                                    return (
                                      <li key={q.id} className="flex justify-between items-start gap-4 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <span className="text-slate-600 dark:text-slate-400 flex-1 leading-relaxed break-words line-clamp-2" title={q.content}>
                                          {i + 1}. {q.content}
                                        </span>
                                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                          <span className="text-slate-500">{ans?.preScore || '-'}</span>
                                          <span className="text-slate-300">/</span>
                                          <span className="text-blue-600 dark:text-blue-400">{ans?.score || '-'}</span>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : <span className="text-xs text-slate-400 px-2">데이터 없음</span>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {allRowData.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-slate-400 bg-slate-50/50 dark:bg-transparent">
                    <User className="size-12 mx-auto mb-4 opacity-10" />
                    <p>표시할 응답 데이터가 없습니다.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
