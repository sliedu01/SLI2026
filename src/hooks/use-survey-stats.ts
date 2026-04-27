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

    // Theme-based stats calculation
    const themeData: Record<string, { preSum: number, preCount: number, postSum: number, postCount: number, satSum: number, satCount: number }> = {};
    
    selectedResponses.forEach(res => {
      const tmpl = templates.find(t => t.id === res.templateId);
      if (!tmpl) return;
      
      res.answers.forEach(ans => {
        const q = tmpl.questions.find(fq => fq.id === ans.questionId);
        if (!q || !q.theme) return;
        
        if (!themeData[q.theme]) {
          themeData[q.theme] = { preSum: 0, preCount: 0, postSum: 0, postCount: 0, satSum: 0, satCount: 0 };
        }
        
        const t = themeData[q.theme];
        if (tmpl.type === 'SATISFACTION' && ans.score !== undefined) {
          t.satSum += Number(ans.score);
          t.satCount++;
        } else if (tmpl.type === 'COMPETENCY') {
          if (ans.preScore !== undefined) {
            t.preSum += Number(ans.preScore);
            t.preCount++;
          }
          if (ans.score !== undefined) {
            t.postSum += Number(ans.score);
            t.postCount++;
          }
        }
      });
    });

    const themeStats: ReportStats['themeStats'] = {};
    Object.entries(themeData).forEach(([theme, d]) => {
      themeStats[theme] = {
        preAvg: d.preCount > 0 ? d.preSum / d.preCount : 0,
        postAvg: d.postCount > 0 ? d.postSum / d.postCount : 0,
        satAvg: d.satCount > 0 ? d.satSum / d.satCount : 0,
        average: 0,
        count: d.preCount || d.satCount || 0
      };
    });

    return {
      satAvg,
      preAvg,
      postAvg,
      hakeGain,
      cohensD,
      pValue: 0.05,
      sampleSize,
      feedbacks,
      themeStats,
      rawScores: {
        pre: preScores,
        post: postScores,
        sat: satScores
      }
    };
  }, [responses, templates, selectedProjectIds]);
}
