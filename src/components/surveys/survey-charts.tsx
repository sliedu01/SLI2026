'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

interface SurveyChartsProps {
  radarData: Record<string, unknown>[];
  improvementData: Record<string, unknown>[];
}

export function SurveyCharts({ radarData, improvementData }: SurveyChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          항목별 만족도 분포 (5점 척도)
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Radar
                name="만족도"
                dataKey="A"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-500" />
          역량 변화 분석 (Pre vs Post)
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={improvementData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Bar dataKey="사전" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="사후" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
