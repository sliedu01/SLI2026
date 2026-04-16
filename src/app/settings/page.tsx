'use client';

import * as React from 'react';
import { 
  Settings, 
  Save, 
  Download, 
  Upload, 
  RefreshCcw, 
  Database, 
  ShieldAlert,
  HardDrive,
  Info,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/store/use-settings-store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [mounted, setMounted] = React.useState(false);
  const { systemName, setSystemName, appVersion, lastBackupDate, updateLastBackupDate, resetAllStores } = useSettingsStore();
  const [tempName, setTempName] = React.useState(systemName);

  React.useEffect(() => {
    setMounted(true);
    setTempName(systemName);
  }, [systemName]);

  if (!mounted) return null;

  // 전체 데이터 백업 (JSON)
  const handleBackup = () => {
    const data = {
      projects: localStorage.getItem('project-storage'),
      budgets: localStorage.getItem('budget-storage'),
      partners: localStorage.getItem('partner-storage'),
      surveys: localStorage.getItem('survey-storage'),
      settings: localStorage.getItem('settings-storage'),
      timestamp: new Date().toISOString(),
      version: appVersion
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SEOUL2026_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    updateLastBackupDate();
    alert('시스템 데이터 백업이 성공적으로 생성되었습니다.');
  };

  // 데이터 복구 (JSON)
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('데이터를 복원하면 현재 브라우저의 모든 데이터가 덮어씌워집니다. 진행하시겠습니까?')) {
          if (data.projects) localStorage.setItem('project-storage', data.projects);
          if (data.budgets) localStorage.setItem('budget-storage', data.budgets);
          if (data.partners) localStorage.setItem('partner-storage', data.partners);
          if (data.surveys) localStorage.setItem('survey-storage', data.surveys);
          if (data.settings) localStorage.setItem('settings-storage', data.settings);
          
          alert('데이터 복원이 완료되었습니다. 시스템을 재시작합니다.');
          window.location.reload();
        }
      } catch (err) {
        alert('올바르지 않은 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 헤더 섹션 */}
      <div className="flex justify-between items-end bg-white/50 backdrop-blur-xl p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/20">
         <div className="space-y-2">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-slate-900 rounded-2xl text-white">
                  <Settings className="size-8" />
               </div>
               <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">시스템 환경설정</h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Control Panel & Data Lifecycle</p>
               </div>
            </div>
         </div>
         <Badge className="bg-slate-100 text-slate-400 border-none font-black px-4 py-2 rounded-xl">
           {appVersion}
         </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* 1. 일반 설정 */}
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
            <CardHeader className="p-0 mb-8">
               <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Info className="size-5 text-indigo-500" /> 일반 서비스 설정
               </CardTitle>
               <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">General Application Identity</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">시스템 표시 이름</label>
                  <div className="flex gap-2">
                     <Input 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold focus-visible:ring-indigo-500"
                     />
                     <Button className="h-12 w-12 rounded-xl bg-slate-900 shrink-0" onClick={() => setSystemName(tempName)}>
                        <Save className="size-4" />
                     </Button>
                  </div>
               </div>
               <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-500">대시보드 상단에 고정 표시됩니다.</p>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px]">ACTIVE</Badge>
               </div>
            </CardContent>
         </Card>

         {/* 2. 데이터 상태 요약 */}
         <Card className="rounded-[2.5rem] border-none shadow-xl bg-indigo-900 text-white p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 size-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <CardHeader className="p-0 mb-8 relative z-10">
               <CardTitle className="text-lg font-black flex items-center gap-2">
                  <HardDrive className="size-5 text-indigo-300" /> 데이터 저장소 상태
               </CardTitle>
               <CardDescription className="text-xs font-bold text-indigo-300/50 uppercase tracking-widest mt-1">Local Persistence Status</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4 relative z-10">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">마지막 백업</p>
                  <p className="text-lg font-black">{lastBackupDate ? new Date(lastBackupDate).toLocaleString() : '기록 없음'}</p>
               </div>
               <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-200/80 italic">
                  <ShieldAlert className="size-3.5 text-amber-400" />
                  본 시스템은 브라우저 공간(Local)을 사용하며 서버에 저장되지 않습니다.
               </div>
            </CardContent>
         </Card>
      </div>

      {/* 3. 데이터 생명주기 관리 (Backup/Restore) */}
      <Card className="rounded-[3rem] border-none shadow-2xl bg-white overflow-hidden">
         <CardHeader className="p-10 pb-4">
            <CardTitle className="text-2xl font-black flex items-center gap-3">
               <Database className="size-8 text-slate-900" /> 데이터 생명주기 관리
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Data Backup, Restore and Lifecycle Policy</CardDescription>
         </CardHeader>
         <CardContent className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {/* 백업 */}
               <div className="space-y-4">
                  <div className="size-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                     <Download className="size-8 text-slate-900" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">시스템 데이터 백업</h4>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed text-justify">
                    현재 브라우저에 저장된 모든 사업 현황, 예산 데이터, 파트너 목록 및 설문 결과 데이터를 하나의 JSON 파일로 추출합니다. 
                    다른 장비로 이전하거나 정기적인 백업을 권장드립니다.
                  </p>
                  <Button onClick={handleBackup} className="h-14 w-full rounded-2xl bg-slate-900 font-extrabold gap-2 shadow-xl shadow-slate-200">
                     <Download className="size-4" /> 지금 백업 파일 생성
                  </Button>
               </div>

               {/* 복구 */}
               <div className="space-y-4">
                  <div className="size-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                     <Upload className="size-8 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">데이터 복원 및 이전</h4>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed text-justify">
                    이전에 백업된 JSON 파일을 업로드하여 시스템의 상태를 복원합니다. 
                    복원 시 기존 브라우저에 저장된 모든 데이터는 삭제되고 업로드한 파일로 대체됩니다.
                  </p>
                  <div className="relative group">
                     <input 
                        type="file" 
                        accept=".json"
                        onChange={handleRestore}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     <Button className="h-14 w-full rounded-2xl bg-white text-blue-600 border-2 border-blue-100 hover:bg-blue-50 font-extrabold gap-2 transition-all">
                        <Upload className="size-4" /> 백업 파일 업로드
                     </Button>
                  </div>
               </div>
            </div>

            {/* 초기화 위험 구역 */}
            <div className="pt-10 border-t-2 border-dashed border-slate-100">
               <div className="p-8 bg-red-50 rounded-[2rem] border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                     <div className="p-4 bg-white rounded-2xl shadow-sm">
                        <Trash2 className="size-6 text-red-500" />
                     </div>
                     <div className="space-y-1">
                        <h5 className="text-lg font-black text-red-900">시스템 전체 초기화 (Factory Reset)</h5>
                        <p className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                           <ShieldAlert className="size-3" /> Warning: Critical Action
                        </p>
                     </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={() => { if(confirm('⚠️ 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?')) resetAllStores(); }}
                    className="h-14 px-10 rounded-2xl bg-red-600 hover:bg-red-700 font-black gap-2 shadow-xl shadow-red-200"
                  >
                     <RefreshCcw className="size-4" /> 모든 데이터 삭제 및 초기화
                  </Button>
               </div>
            </div>
         </CardContent>
      </Card>

      <footer className="text-center pb-10">
         <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
           Seoul 2026 Management System Official Console
         </p>
      </footer>
    </div>
  );
}
