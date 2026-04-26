'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Trophy, Target, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: {
    satAvg: number;
    preAvg: number;
    postAvg: number;
    hakeGain: number;
    cohensD: number;
  } | null;
}

export function SurveyStatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null;

  const cards = [
    {
      title: "운영 만족도",
      value: stats.satAvg.toFixed(2),
      unit: "/ 5.0",
      icon: Trophy,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      description: "학습자 전반적 만족도 지수"
    },
    {
      title: "역량 향상 지수",
      value: (stats.hakeGain * 100).toFixed(1),
      unit: "%",
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      description: "사전 대비 사후 성취도 (Hake's Gain)"
    },
    {
      title: "효과 크기 (Cohen's d)",
      value: stats.cohensD.toFixed(2),
      unit: "",
      icon: Zap,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      description: "통계적 교육 효과 강도"
    },
    {
      title: "목표 달성률",
      value: Math.min(100, (stats.satAvg / 4.5) * 100).toFixed(0),
      unit: "%",
      icon: Target,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      description: "KPI 기준 대비 달성 현황"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <Card key={i} className="p-5 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group overflow-hidden relative">
          <div className={cn("absolute -right-4 -top-4 size-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity", card.bg)} />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{card.title}</p>
              <div className="flex items-baseline gap-1">
                <h3 className={cn("text-3xl font-black tracking-tight", card.color)}>{card.value}</h3>
                <span className="text-sm font-bold text-slate-400">{card.unit}</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">{card.description}</p>
            </div>
            <div className={cn("p-2.5 rounded-xl", card.bg)}>
              <card.icon className={cn("size-5", card.color)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
