'use client';

import * as React from 'react';
import { CalendarDays, Bell, ListChecks, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CalendarPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-100 shadow-xl">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CalendarDays className="size-8 text-emerald-600" /> 캘린더(일정)
          </h1>
          <p className="text-slate-500 font-medium mt-1">교육 사업 및 주요 이벤트를 통합 관리합니다.</p>
        </div>
        <Button className="rounded-xl h-12 bg-slate-900 font-black gap-2 px-6">
          <Plus className="size-4" /> 일정 등록
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
           <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden min-h-[600px]">
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 py-32">
                <CalendarDays className="size-24 opacity-10" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">통합 캘린더 기능을 준비 중입니다.</p>
                <p className="text-[11px] text-slate-400">전체 사업 일정을 한눈에 볼 수 있는 인터클릭 뷰를 개발 중입니다.</p>
              </div>
           </Card>
        </div>

        <div className="space-y-6">
           <Card className="rounded-[2rem] border-none shadow-xl bg-white p-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
                 <Bell className="size-4 text-amber-500" /> 다가오는 일정
              </h3>
              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">D-Day</p>
                    <p className="text-xs font-bold text-slate-700">중간 성과 보고회</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-slate-50/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">D-3</p>
                    <p className="text-xs font-bold text-slate-700">파트너사 문구 확정</p>
                 </div>
              </div>
           </Card>

           <Card className="rounded-[2rem] border-none shadow-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-8">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                 <ListChecks className="size-4 text-indigo-400" /> 시스템 알림
              </h3>
              <p className="text-xs font-medium text-indigo-100 leading-relaxed">
                현재 모든 사업이 일정대로 진행 중입니다. 지연된 일정이 없습니다.
              </p>
           </Card>
        </div>
      </div>
    </div>
  );
}
