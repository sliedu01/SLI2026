'use client';

import * as React from 'react';
import { SurveyResponse, SurveyTemplate, Answer } from '@/store/use-survey-store';
import { ReportStats } from '@/lib/stat-utils';

export function useSurveyStats(responses: SurveyResponse[], templates: SurveyTemplate[], selectedProjectIds: string[]): ReportStats | null {
  return React.useMemo(() => {
    const selectedResponses = responses.filter(r => selectedProjectIds.includes(r.projectId));
    if (selectedResponses.length === 0) return null;

    const satTemplates = templates.filter(t => t.type === 'SATISFACTION');
    const compTemplates = templates.filter(t => t.type === 'COMPETENCY');

    const satQuestionIds = new Set(satTemplates.flatMap(t => t.questions.map(q => q.id)));
    const compQuestionIds = new Set(compTemplates.flatMap(t => t.questions.map(q => q.id)));

    const satScores = selectedResponses.flatMap(r => 
      r.answers.filter((a: Answer) => satQuestionIds.has(a.questionId)).map((a: Answer) => Number(a.score) || 0)
    ).filter(s => s > 0);

    const preScores = selectedResponses.flatMap(r => 
      r.answers.filter((a: Answer) => compQuestionIds.has(a.questionId)).map((a: Answer) => Number(a.preScore) || 0)
    ).filter(s => s > 0);

    const postScores = selectedResponses.flatMap(r => 
      r.answers.filter((a: Answer) => compQuestionIds.has(a.questionId)).map((a: Answer) => Number(a.score) || 0)
    ).filter(s => s > 0);

    const satAvg = satScores.length > 0 ? satScores.reduce((a, b) => a + b, 0) / satScores.length : 0;
    const preAvg = preScores.length > 0 ? preScores.reduce((a, b) => a + b, 0) / preScores.length : 0;
    const postAvg = postScores.length > 0 ? postScores.reduce((a, b) => a + b, 0) / postScores.length : 0;

    // Hake's Gain
    const hakeGain = (preAvg > 0 || postAvg > 0) && (5 - preAvg) > 0 ? (postAvg - preAvg) / (5 - preAvg) : 0;

    // Cohen's d (Simplified for dashboard)
    const stdPre = Math.sqrt(preScores.length > 0 ? preScores.reduce((a, b) => a + Math.pow(b - preAvg, 2), 0) / preScores.length : 0);
    const stdPost = Math.sqrt(postScores.length > 0 ? postScores.reduce((a, b) => a + Math.pow(b - postAvg, 2), 0) / postScores.length : 0);
    const pooledStd = Math.sqrt((Math.pow(stdPre, 2) + Math.pow(stdPost, 2)) / 2);
    const cohensD = pooledStd > 0 ? (postAvg - preAvg) / pooledStd : 0;

    const respondentIds = new Set(selectedResponses.map(r => r.respondentId));
    const sampleSize = respondentIds.size;

    const feedbacks = selectedResponses.flatMap(r => 
      r.answers.filter((a: Answer) => a.text).map((a: Answer) => a.text!)
    );

    return {
      satAvg,
      preAvg,
      postAvg,
      hakeGain,
      cohensD,
      pValue: 0.05,
      sampleSize,
      feedbacks,
      rawScores: {
        pre: preScores,
        post: postScores,
        sat: satScores
      }
    };
  }, [responses, templates, selectedProjectIds]);
}
