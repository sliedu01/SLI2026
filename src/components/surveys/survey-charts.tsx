'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';

interface SurveyChartsProps {
  radarData: Record<string, unknown>[];
  improvementData: Record<string, unknown>[];
}

const CustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  const displayValue = value !== undefined && value !== null ? value : props.payload?.label;
  if (!displayValue) return null;
  return (
    <text 
      x={x + width / 2} 
      y={y - 8} 
      fill="#3b82f6" 
      style={{ fill: '#3b82f6', color: '#3b82f6', fontWeight: 'bold' }}
      fontSize={10} 
      fontWeight="bold" 
      textAnchor="middle"
    >
      {displayValue}
    </text>
  );
};

const CustomBarLabelDashboard = (props: any) => {
  const { x, y, width, value } = props;
  const displayValue = value !== undefined && value !== null ? value : props.payload?.label;
  if (!displayValue) return null;
  return (
    <text 
      x={x + width / 2} 
      y={y - 8} 
      fill="#3b82f6" 
      style={{ fill: '#3b82f6', color: '#3b82f6', fontWeight: 'bold' }}
      fontSize={12} 
      fontWeight="bold" 
      textAnchor="middle"
    >
      {displayValue}
    </text>
  );
};


export function SatisfactionRadarChart({ 
  radarData, 
  showTitle = true,
  isReport = false
}: { 
  radarData: any[], 
  showTitle?: boolean,
  isReport?: boolean
}) {
  if (!radarData || radarData.length === 0) return null;

  if (isReport) {
    return (
      <div className="h-[270px] w-[600px] flex items-center justify-center mx-auto overflow-hidden bg-transparent">
        <RadarChart cx="50%" cy="50%" outerRadius="72%" width={600} height={270} data={radarData}>
          <PolarGrid stroke="#cbd5e1" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#000000', fontSize: 10, fontWeight: 700 }} />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 5]} 
            ticks={[0, 1, 2, 3, 4, 5]} 
            tick={{ fontSize: 14, fill: '#64748b', fontWeight: 700 }} 
          />
          <Radar
            name="만족도"
            dataKey="A"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.2}
          />
        </RadarChart>
      </div>
    );
  }

  return (
    <Card className="p-6 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm print:border-none print:shadow-none print:bg-transparent">
      {showTitle && (
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          항목별 만족도 분포 (5점 척도)
        </h3>
      )}
      <div className="h-[280px] w-full print:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#000000', fontSize: 12, fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fill: '#000000', fontWeight: 600 }} />
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
  );
}

export function CompetencyBarChart({ 
  improvementData, 
  showTitle = true,
  isReport = false
}: { 
  improvementData: any[], 
  showTitle?: boolean,
  isReport?: boolean
}) {
  if (!improvementData || improvementData.length === 0) return null;

  if (isReport) {
    return (
      <div className="h-[200px] w-[600px] flex items-center justify-center mx-auto overflow-hidden bg-transparent">
        <BarChart width={600} height={200} data={improvementData} margin={{ left: 35, right: 15, top: 35, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fill: '#000000', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 5.5]} ticks={[0, 1, 2, 3, 4, 5]} width={35} tick={{ fill: '#000000', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
          />
          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', paddingBottom: '3px', color: '#000000', fontWeight: 'bold' }} />
          <Bar dataKey="사전" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={22} />
          <Bar dataKey="사후" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22}>
            <LabelList dataKey="label" content={<CustomBarLabel />} />
          </Bar>
        </BarChart>
      </div>
    );
  }

  return (
    <Card className="p-6 border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm print:border-none print:shadow-none print:bg-transparent">
      {showTitle && (
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-500" />
          역량 변화 분석
        </h3>
      )}
      <div className="h-[280px] w-full print:h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={improvementData} margin={{ left: 35, right: 10, top: 25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#000000', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 5]} width={35} tick={{ fill: '#000000', fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ color: '#000000', fontWeight: 'bold' }} />
            <Bar dataKey="사전" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar dataKey="사후" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30}>
              <LabelList dataKey="label" content={<CustomBarLabelDashboard />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function SurveyCharts({ radarData, improvementData }: SurveyChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SatisfactionRadarChart radarData={radarData} />
      <CompetencyBarChart improvementData={improvementData} />
    </div>
  );
}
