'use client';

import * as React from 'react';
import { format, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Plus, Trash2, CalendarIcon, Users } from 'lucide-react';

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

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && project) {
        setName(project.name || '');
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
        setDescription(parentProject.description || '');
        const s = parentProject.startDate ? new Date(parentProject.startDate) : undefined;
        const e = parentProject.endDate ? new Date(parentProject.endDate) : undefined;
        setStartDate(s && isValid(s) ? s : undefined);
        setEndDate(e && isValid(e) ? e : undefined);
        setStartTime(parentProject.startTime || '09:00');
        setEndTime(parentProject.endTime || '18:00');
        setQuota(0);
        setParticipantCount(0);
        setPartnerId(parentProject.partnerId || 'none');
        setLocation(parentProject.location || '');
        setSessions([]);
      } else {
        setName('');
        setDescription('');
        setStartDate(undefined);
        setEndDate(undefined);
        setStartTime('09:00');
        setEndTime('18:00');
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
    const sTime = lastSession ? lastSession.startTime : '10:00';
    const eTime = lastSession ? lastSession.endTime : '12:00';

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
  const updateSession = (id: string, updates: Partial<ProjectSession>) => 
    setSessions(sessions.map(s => s.id === id ? { ...s, ...updates } : s));

  const [isSaving, setIsSaving] = React.useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim()) { alert('사업명을 입력해주세요.'); return; }
    if (!startDate || !endDate) { alert('기간을 선택해주세요.'); return; }

    const projectData: Omit<Project, 'id' | 'createdAt'> = {
      name: name.trim(),
      description: description.trim(),
      startDate: startDate && isValid(startDate) ? format(startDate, 'yyyy-MM-dd') : '',
      endDate: endDate && isValid(endDate) ? format(endDate, 'yyyy-MM-dd') : '',
      startTime,
      endTime,
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
              {mode === 'add' ? '신규 사업 등록' : '사업 정보 수정'}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500">
              Lv {level}. {level === 1 ? '사업' : level === 2 ? '세부 사업' : level === 3 ? '단위 과업' : '강좌/활동'} 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-black text-slate-400 uppercase tracking-wider">사업명</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="사업 명칭을 입력하세요"
                  className="font-bold h-12 rounded-xl"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="location" className="text-xs font-black text-slate-400 uppercase tracking-wider">교육 장소</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="교육이 진행된 장소를 입력하세요"
                  className="font-bold h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">협력업체</Label>
                  <Select value={partnerId} onValueChange={(val) => setPartnerId(val || 'none')}>
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                      <SelectValue placeholder="협력업체 선택" />
                    </SelectTrigger>
                    <SelectContent className="min-w-[400px] rounded-2xl border-slate-100 shadow-2xl">
                      <SelectItem value="none">미지정</SelectItem>
                      {partners.length === 0 ? (
                        <div className="p-2 text-xs font-bold text-slate-400 text-center">파트너 목록을 불러오는 중...</div>
                      ) : (
                        partners.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">정원 (수용인원)</Label>
                  <Input
                    type="number"
                    value={quota}
                    onChange={(e) => setQuota(Number(e.target.value))}
                    className="font-bold h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {level < 3 && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">시작일</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            type="button"
                            className={cn("w-full justify-start text-left font-bold h-12 rounded-xl", !startDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                          </Button>
                        }
                      />
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={handleStartDateSelect} locale={ko} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">종료일</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            type="button"
                            className={cn("w-full justify-start text-left font-bold h-12 rounded-xl", !endDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">시작 시간</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="font-bold h-12 rounded-xl" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">종료 시간</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="font-bold h-12 rounded-xl" />
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
                                <Input type="time" value={session.startTime} onChange={(e) => updateSession(session.id, { startTime: e.target.value })} className="h-10 w-24 text-xs font-bold rounded-xl" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-slate-400">종료 일시</Label>
                              <div className="flex gap-2">
                                <Input type="date" value={session.endDate} onChange={(e) => updateSession(session.id, { endDate: e.target.value })} className="h-10 text-xs font-bold rounded-xl" />
                                <Input type="time" value={session.endTime} onChange={(e) => updateSession(session.id, { endTime: e.target.value })} className="h-10 w-24 text-xs font-bold rounded-xl" />
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
          <DialogFooter className="gap-3 sm:gap-0 mt-4 pt-6 border-t border-slate-100 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold h-12 rounded-xl flex-1 text-slate-500">취소</Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="font-bold px-10 h-12 rounded-xl flex-[2] bg-slate-900 text-white hover:bg-black transition-all shadow-xl shadow-slate-200"
            >
              {isSaving ? '저장 중...' : '사업 정보 저장하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
