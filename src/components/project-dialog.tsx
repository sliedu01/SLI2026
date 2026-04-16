'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Project, useProjectStore } from '@/store/use-project-store';
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
  parentId?: string | null; // add 모드일 때 사용
  level?: number;
}

export function ProjectDialog({
  open,
  onOpenChange,
  mode,
  project,
  parentId = null,
  level = 1,
}: ProjectDialogProps) {
  const { addProject, updateProject, projects } = useProjectStore();
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

  // 현재 사업의 자식 존재 여부 확인
  const hasChildren = project ? projects.some(p => p.parentId === project.id) : false;
  // 부모 레벨(1-3)이면서 자식이 있는 경우 읽기 전용
  const isReadOnly = (level < 4 && hasChildren);

  // 초기화 및 수정 모드 데이터 세팅
  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && project) {
        setName(project.name || '');
        setDescription(project.description || '');
        setStartDate(project.startDate ? new Date(project.startDate) : undefined);
        setEndDate(project.endDate ? new Date(project.endDate) : undefined);
        setStartTime(project.startTime || '09:00');
        setEndTime(project.endTime || '18:00');
        setQuota(project.quota || 0);
        setParticipantCount(project.participantCount || 0);
        setPartnerId(project.partnerId || 'none');
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
      }
    }
  }, [open, mode, project]);

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    if (date && !endDate) {
      setEndDate(date);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!name.trim()) { alert('사업명을 입력해주세요.'); return; }
    if (!startDate || !endDate) { alert('기간을 선택해주세요.'); return; }

    const projectData = {
      name: name.trim(),
      description: description.trim(),
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      quota,
      participantCount,
      partnerId: partnerId === 'none' ? undefined : partnerId,
      parentId: mode === 'edit' ? project?.parentId || null : parentId,
      level: mode === 'edit' ? project?.level || 1 : level,
    };

    try {
      if (mode === 'add') {
        addProject(projectData);
      } else if (mode === 'edit' && project) {
        updateProject(project.id, projectData);
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {mode === 'add' ? '신규 사업 등록' : '사업 정보 수정'}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500">
              Lv {level}. {level === 1 ? '사업' : level === 2 ? '세부 사업' : level === 3 ? '단위 과업' : '강좌/활동'} 정보를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
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
              <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">협력업체</Label>
              <Select value={partnerId} onValueChange={(val: string | null) => setPartnerId(val || 'none')}>
                <SelectTrigger className="h-12 rounded-xl font-bold">
                  <SelectValue placeholder="협력업체 선택" />
                </SelectTrigger>
                <SelectContent className="min-w-[400px] rounded-2xl border-slate-100 shadow-2xl">
                  <SelectItem value="none">미지정</SelectItem>
                  {partners.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">시작일</Label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant={"outline"}
                      type="button"
                      className={cn(
                        "w-full justify-start text-left font-bold h-12 rounded-xl",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateSelect}
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">종료일</Label>
                <Popover>
                  <PopoverTrigger>
                    <Button
                      variant={"outline"}
                      type="button"
                      className={cn(
                        "w-full justify-start text-left font-bold h-12 rounded-xl",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">시작 시간</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="font-bold h-12 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">종료 시간</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="font-bold h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">정원 (Quota)</Label>
                <Input
                  type="number"
                  value={quota}
                  onChange={(e) => setQuota(Number(e.target.value))}
                  disabled={isReadOnly}
                  className={cn("font-bold h-12 rounded-xl", isReadOnly && "bg-slate-50 text-slate-400")}
                />
                {isReadOnly && <p className="text-[10px] font-bold text-blue-500 ml-1">* 하위 항목 합계 자동 반영</p>}
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-wider">참가인원 (Participants)</Label>
                <Input
                  type="number"
                  value={participantCount}
                  onChange={(e) => setParticipantCount(Number(e.target.value))}
                  disabled={isReadOnly}
                  className={cn("font-bold h-12 rounded-xl", isReadOnly && "bg-slate-50 text-slate-400")}
                />
                {isReadOnly && <p className="text-[10px] font-bold text-blue-500 ml-1">* 하위 항목 합계 자동 반영</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-xs font-black text-slate-400 uppercase tracking-wider">설명 (선택)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상세 내용을 입력하세요"
                className="min-h-[80px] font-medium rounded-xl"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-bold h-12 rounded-xl flex-1">취소</Button>
            <Button type="submit" className="font-bold px-8 h-12 rounded-xl flex-[2] bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">저장하기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
