'use client';

import * as React from 'react';
import { format, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Trash2, CalendarIcon, Users, Maximize2, Minimize2, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Project, ProjectSession, useProjectStore } from '@/store/use-project-store';
import { usePartnerStore } from '@/store/use-partner-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  project?: Project; // edit 모드일 때 사용
  parentProject?: Project; // add 모드일 때 자동완성용
  parentId?: string | null; // add 모드일 때 사용
  level?: number;
}

export function ProjectDialog({
  open,
  onOpenChange,
  mode,
  project,
  parentProject,
  parentId = null,
  level = 1,
}: ProjectDialogProps) {
  const { addProject, updateProject } = useProjectStore();
  const { partners } = usePartnerStore();
  
  const [name, setName] = React.useState('');
  const [abbreviation, setAbbreviation] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('18:00');
  const [quota, setQuota] = React.useState(0);
  const [participantCount, setParticipantCount] = React.useState(0);
  const [partnerId, setPartnerId] = React.useState<string>('none');
  const [location, setLocation] = React.useState('');
  const [sessions, setSessions] = React.useState<ProjectSession[]>([]);
  const [isMaximized, setIsMaximized] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && project) {
        setName(project.name || '');
        setAbbreviation(project.abbreviation || '');
        setDescription(project.description || '');
        const s = project.startDate ? new Date(project.startDate) : undefined;
        const e = project.endDate ? new Date(project.endDate) : undefined;
        setStartDate(s && isValid(s) ? s : undefined);
        setEndDate(e && isValid(e) ? e : undefined);
        setStartTime(project.startTime || '09:00');
        setEndTime(project.endTime || '18:00');
        setQuota(project.quota || 0);
        setParticipantCount(project.participantCount || 0);
        setPartnerId(project.partnerId || 'none');
        setLocation(project.location || '');
        setSessions(project.sessions || []);
      } else if (mode === 'add' && parentProject) {
        setName('');
        setAbbreviation('');
        setDescription(parentProject.description || '');
        const s = parentProject.startDate ? new Date(parentProject.startDate) : undefined;
        const e = parentProject.endDate ? new Date(parentProject.endDate) : undefined;
        setStartDate(s && isValid(s) ? s : undefined);
        setEndDate(e && isValid(e) ? e : undefined);
        setStartTime('10:00');
        setEndTime('12:00');
        setQuota(0);
        setParticipantCount(0);
        setPartnerId(parentProject.partnerId || 'none');
        setLocation(parentProject.location || '');
        setSessions([]);
      } else {
        setName('');
        setAbbreviation('');
        setDescription('');
        const today = new Date();
        setStartDate(today);
        setEndDate(today);
        setStartTime('10:00');
        setEndTime('12:00');
        setQuota(0);
        setParticipantCount(0);
        setPartnerId('none');
        setLocation('');
        setSessions([]);
      }
    }
  }, [open, mode, project, parentProject]);

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    if (date && !endDate) setEndDate(date);
  };

  const addSession = () => {
    const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
    
    const sDate = lastSession ? lastSession.startDate : (startDate ? format(startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    const eDate = lastSession ? lastSession.endDate : (endDate ? format(endDate, 'yyyy-MM-dd') : sDate);
    const sTime = lastSession ? lastSession.startTime : (startTime || '10:00');
    const eTime = lastSession ? lastSession.endTime : (endTime || '12:00');

    const newSession: ProjectSession = {
      id: crypto.randomUUID(),
      startDate: sDate,
      endDate: eDate,
      startTime: sTime,
      endTime: eTime,
      content: '',
      participantCount: 0
    };
    setSessions(prev => [...prev, newSession]);
  };

  const removeSession = (id: string) => setSessions(sessions.filter(s => s.id !== id));
  
  const roundTo10Minutes = (value: string) => {
    if (!value) return value;
    const [hours, minutes] = value.split(':');
    const roundedMinutes = Math.round(parseInt(minutes) / 10) * 10;
    const finalMinutes = roundedMinutes === 60 ? '50' : roundedMinutes.toString().padStart(2, '0');
    return `${hours}:${finalMinutes}`;
  };

  const updateSession = (id: string, updates: Partial<ProjectSession>) => {
    const finalUpdates = { ...updates };
    if (updates.startTime) finalUpdates.startTime = roundTo10Minutes(updates.startTime);
    if (updates.endTime) finalUpdates.endTime = roundTo10Minutes(updates.endTime);
    setSessions(sessions.map(s => s.id === id ? { ...s, ...finalUpdates } : s));
  };

  const [isSaving, setIsSaving] = React.useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) { alert('사업명을 입력해주세요.'); return; }
    if (!startDate || !endDate) { alert('기간을 선택해주세요.'); return; }

    // 세션이 있는 경우 대표 날짜/시간 추출 (가장 빠른 날짜/시간 ~ 가장 늦은 날짜/시간)
    let finalStartDate = startDate && isValid(startDate) ? format(startDate, 'yyyy-MM-dd') : '';
    let finalEndDate = endDate && isValid(endDate) ? format(endDate, 'yyyy-MM-dd') : '';
    let finalStartTime = startTime;
    let finalEndTime = endTime;

    if (level >= 3 && sessions.length > 0) {
      const sortedByStart = [...sessions].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.startTime.localeCompare(b.startTime));
      const sortedByEnd = [...sessions].sort((a, b) => b.endDate.localeCompare(a.endDate) || b.endTime.localeCompare(a.endTime));
      finalStartDate = sortedByStart[0].startDate;
      finalEndDate = sortedByEnd[sortedByEnd.length - 1].endDate;
      finalStartTime = sortedByStart[0].startTime;
      finalEndTime = sortedByEnd[sortedByEnd.length - 1].endTime;
    }

    const projectData: Omit<Project, 'id' | 'createdAt'> = {
      name: name.trim(),
      abbreviation: abbreviation.trim(),
      description: description.trim(),
      startDate: finalStartDate,
      endDate: finalEndDate,
      startTime: finalStartTime,
      endTime: finalEndTime,
      quota,
      participantCount: level >= 3 ? sessions.reduce((sum, s) => sum + s.participantCount, 0) : participantCount,
      partnerId: partnerId === 'none' ? undefined : partnerId,
      location,
      sessions: level >= 3 ? sessions : [],
      parentId: mode === 'edit' ? project?.parentId || null : parentId,
      level: mode === 'edit' ? project?.level || 1 : level,
    };

    try {
      setIsSaving(true);
      if (mode === 'add') await addProject(projectData);
      else if (mode === 'edit' && project) await updateProject(project.id, projectData);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl transition-all duration-300",
        isMaximized ? "max-w-[1700px] w-[98vw] h-[95vh]" : "max-w-[95vw] md:max-w-4xl lg:max-w-5xl"
      )}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className="bg-slate-900 p-4 text-white relative">
            <DialogTitle className="text-[14px] font-bold">
              {mode === 'add' ? '신규 사업 등록' : '사업 정보 수정'}
            </DialogTitle>
            <DialogDescription className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
              Lv {level}. {level === 1 ? '사업' : level === 2 ? '세부 사업' : level === 3 ? '단위 과업' : '강좌/활동'} 정보 관리
            </DialogDescription>
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="text-slate-400 hover:text-white"
              >
                {isMaximized ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
              </Button>
              <button 
                type="button"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>
          </DialogHeader>
          
          <div className={cn(
            "p-6 space-y-6 overflow-y-auto custom-scrollbar bg-slate-50/50",
            isMaximized ? "h-[calc(95vh-120px)]" : "max-h-[70vh]"
          )}>
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor="name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">사업명</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="사업 명칭을 입력하세요"
                    className="font-bold h-9 rounded-lg text-[11px]"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="abbreviation" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">별칭 (약어)</Label>
                  <Input
                    id="abbreviation"
                    value={abbreviation}
                    onChange={(e) => setAbbreviation(e.target.value)}
                    placeholder="약어 입력"
                    className="font-bold h-9 rounded-lg text-[11px]"
                  />
                </div>
              </div>
              
              <div className="grid gap-1.5">
                <Label htmlFor="location" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">교육 장소</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="교육이 진행된 장소를 입력하세요"
                  className="font-bold h-9 rounded-lg text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">협력업체</Label>
                  <Select value={partnerId} onValueChange={(val) => setPartnerId(val || 'none')}>
                    <SelectTrigger className="h-9 rounded-lg font-bold text-[11px]">
                      <SelectValue placeholder="협력업체 선택" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[300px] rounded-xl border-slate-100 shadow-2xl">
                      <SelectItem value="none" className="text-[11px]">미지정</SelectItem>
                      {partners.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-[11px]">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">정원 (수용인원)</Label>
                  <Input
                    type="number"
                    value={quota}
                    onChange={(e) => setQuota(Number(e.target.value))}
                    className="font-bold h-9 rounded-lg text-[11px]"
                  />
                </div>
              </div>
            </div>

            {level < 3 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">시작일</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            type="button"
                            className={cn("w-full justify-start text-left font-bold h-9 rounded-lg text-[11px]", !startDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {startDate ? format(startDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                          </Button>
                        }
                      />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={handleStartDateSelect} locale={ko} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">종료일</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            type="button"
                            className={cn("w-full justify-start text-left font-bold h-9 rounded-lg text-[11px]", !endDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {endDate ? format(endDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                          </Button>
                        }
                      />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ko} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">시작 시간</Label>
                    <Input 
                      type="time" 
                      value={startTime} 
                      onChange={(e) => setStartTime(roundTo10Minutes(e.target.value))} 
                      className="font-bold h-9 rounded-lg text-[11px]" 
                      step="600"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">종료 시간</Label>
                    <Input 
                      type="time" 
                      value={endTime} 
                      onChange={(e) => setEndTime(roundTo10Minutes(e.target.value))} 
                      className="font-bold h-9 rounded-lg text-[11px]" 
                      step="600"
                    />
                  </div>
                </div>
              </div>
            )}

            {level >= 3 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-2 bg-blue-500 rounded-full" />
                    <h3 className="text-sm font-black text-slate-800 uppercase">교육일정 관리</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addSession} className="h-9 gap-1.5 text-[11px] font-black border-blue-100 text-blue-600 rounded-xl">
                    <Plus className="size-3.5" /> 교육일정 추가
                  </Button>
                </div>
                <div className="space-y-4">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                      <CalendarIcon className="size-10 text-slate-300 mb-2" />
                      <p className="text-[11px] font-bold text-slate-400">등록된 교육 일정이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {sessions.map((session, index) => (
                        <div key={session.id} className="p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm space-y-4 relative group hover:border-blue-100">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] font-black">제 {index + 1}차시</Badge>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeSession(session.id)} className="size-8 text-slate-300 hover:text-red-500"><Trash2 className="size-4" /></Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-slate-400">시작 일시</Label>
                              <div className="flex gap-2">
                                <Input type="date" value={session.startDate} onChange={(e) => updateSession(session.id, { startDate: e.target.value })} className="h-10 text-xs font-bold rounded-xl" />
                                <Input type="time" value={session.startTime} onChange={(e) => updateSession(session.id, { startTime: e.target.value })} className="h-10 w-24 text-xs font-bold rounded-xl" step="600" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-slate-400">종료 일시</Label>
                              <div className="flex gap-2">
                                <Input type="date" value={session.endDate} onChange={(e) => updateSession(session.id, { endDate: e.target.value })} className="h-10 text-xs font-bold rounded-xl" />
                                <Input type="time" value={session.endTime} onChange={(e) => updateSession(session.id, { endTime: e.target.value })} className="h-10 w-24 text-xs font-bold rounded-xl" step="600" />
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                              <Label className="text-[10px] font-black text-slate-400">수업명</Label>
                              <Input value={session.content} onChange={(e) => updateSession(session.id, { content: e.target.value })} placeholder="내용 입력" className="h-10 text-xs font-bold rounded-xl" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-slate-400">인원</Label>
                              <Input type="number" value={session.participantCount} onChange={(e) => updateSession(session.id, { participantCount: parseInt(e.target.value) || 0 })} className="h-10 text-xs font-black text-blue-600 rounded-xl" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {sessions.length > 0 && (
                  <div className="p-4 bg-slate-900 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2"><Users className="size-4 text-blue-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">참가인원 총계</span></div>
                    <span className="text-sm font-black text-white">{sessions.reduce((sum, s) => sum + s.participantCount, 0).toLocaleString()}명</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-xs font-black text-slate-400 uppercase tracking-wider">설명 (선택)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="상세 내용" className="min-h-[80px] font-medium rounded-xl" />
            </div>
          </div>
          <DialogFooter className="p-4 bg-white border-t border-slate-50 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-10 rounded-lg font-bold text-[11px] text-slate-400 hover:text-slate-600">취소</Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] h-10 rounded-lg bg-slate-900 text-white font-bold text-[11px] shadow-md hover:bg-slate-800 transition-all"
            >
              {isSaving ? '저장 중...' : '사업 정보 저장하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
