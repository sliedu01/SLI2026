'use client';

import * as React from 'react';
import { useMeetingStore, Meeting } from "@/store/use-meeting-store";
import { useProjectStore } from "@/store/use-project-store";
import { 
  Video, Plus, ArrowUpDown, Trash2, Edit, 
  Search, Calendar as CalendarIcon, Filter,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MeetingMinutesDoc } from "@/components/meetings/meeting-minutes-doc";
import { MeetingDialog } from "@/components/meetings/meeting-dialogs";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function MeetingsPage() {
  const [mounted, setMounted] = React.useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = React.useState<Partial<Meeting>>({});
  const [newMeeting, setNewMeeting] = React.useState<Partial<Meeting>>({
    title: "", date: new Date().toISOString().split('T')[0],
    startTime: "14:00", endTime: "15:00", location: "회의실",
    attendees: [], purpose: "", agenda: "", content: [], others: ""
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = React.useState('');

  const { meetings, fetchMeetings, addMeeting, updateMeeting, deleteMeeting, getSortedMeetings } = useMeetingStore();
  const { projects, fetchProjects, selectedLv1Ids, setSelectedLv1Ids } = useProjectStore();
  
  const currentLv1Id = selectedLv1Ids[0] || 'all';
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(currentLv1Id);

  React.useEffect(() => {
    setSelectedProjectId(currentLv1Id);
  }, [currentLv1Id]);

  const handleLv1Change = (id: string | null) => {
    if (!id) return;
    setSelectedProjectId(id);
    if (id === 'all') {
      setSelectedLv1Ids([]);
    } else {
      setSelectedLv1Ids([id]);
    }
  };

  React.useEffect(() => {
    setMounted(true);
    fetchMeetings();
    fetchProjects();
  }, []);

  const filteredMeetings = React.useMemo(() => {
    const sorted = getSortedMeetings();
    let filtered = sorted;
    if (selectedProjectId && selectedProjectId !== 'all') {
      filtered = filtered.filter(m => m.projectId === selectedProjectId);
    }
    if (searchTerm) {
      filtered = filtered.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return sortOrder === 'asc' ? filtered : [...filtered].reverse();
  }, [sortOrder, selectedProjectId, getSortedMeetings, searchTerm]);

  React.useEffect(() => {
    if (filteredMeetings.length > 0) {
      if (!selectedMeetingId || !filteredMeetings.some(m => m.id === selectedMeetingId)) {
        setSelectedMeetingId(filteredMeetings[0].id);
      }
    } else {
      setSelectedMeetingId(null);
    }
  }, [filteredMeetings, selectedMeetingId]);

  if (!mounted) return null;

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  return (
    <div className="flex gap-4 h-[calc(100vh-4rem)]">
      {/* Sidebar - Meeting List */}
      <Card className="w-80 flex flex-col border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black flex items-center gap-2">
              <Video className="size-4 text-indigo-600" />
              회의 목록
            </h2>
            <Button size="icon" variant="ghost" onClick={() => setIsCreateDialogOpen(true)} className="size-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-600">
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input 
              placeholder="회의 검색..." 
              className="h-9 pl-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredMeetings.map(meeting => (
            <div 
              key={meeting.id}
              onClick={() => setSelectedMeetingId(meeting.id)}
              className={cn(
                "p-3 rounded-xl cursor-pointer transition-all duration-200 group",
                selectedMeetingId === meeting.id 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200 dark:shadow-none" 
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              <p className="text-xs font-bold truncate mb-1">{meeting.title}</p>
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-medium opacity-60", selectedMeetingId === meeting.id ? "text-slate-300" : "text-slate-500")}>
                  {meeting.date}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setEditingMeeting(meeting); setIsEditDialogOpen(true); }}>
                    <Edit className="size-3 text-blue-400" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setMeetingToDelete(meeting); setIsDeleteDialogOpen(true); }}>
                    <Trash2 className="size-3 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Content - Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Filter Bar */}
        <div className="mb-4 flex items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 w-full">
          <div className="flex items-center gap-2 px-3">
            <h1 className="text-lg font-black tracking-tight">회의 관리 프로세스</h1>
          </div>
          
          <div className="flex items-center gap-2 pr-2">
            <div className="size-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutGrid className="size-3.5 text-white" />
            </div>
            <Select value={selectedProjectId} onValueChange={handleLv1Change}>
              <SelectTrigger className="h-8 w-64 rounded-xl font-bold text-[10px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <span className="truncate">
                  {selectedProjectId === 'all' ? '전체 사업 회의 보기' : projects.find(p => p.id === selectedProjectId)?.name}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-2xl border-slate-100 dark:border-slate-800">
                <SelectItem value="all" className="text-[10px] font-bold">전체 사업 회의 보기</SelectItem>
                {projects.filter(p => p.level === 1).map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedMeeting ? (
          <div className="flex-1 overflow-y-auto pr-2 pb-8">
            <MeetingMinutesDoc meeting={selectedMeeting} />
          </div>
        ) : (
          <Card className="flex-1 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-[2.5rem]">
            <Video className="size-16 text-slate-200 dark:text-slate-800 mb-4" />
            <p className="text-slate-400 font-bold">회의를 선택하거나 새로 생성하세요.</p>
          </Card>
        )}
      </div>

      <MeetingDialog 
        open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}
        title="새 회의 등록" description="새로운 회의 일정을 등록하고 회의록 작성을 시작하세요."
        data={newMeeting} onChange={(f, v) => setNewMeeting(p => ({ ...p, [f]: v }))}
        onSave={async () => { 
          setIsSaving(true); 
          await addMeeting(newMeeting as Omit<Meeting, 'id' | 'createdAt'>); 
          setIsCreateDialogOpen(false); 
          setIsSaving(false); 
        }}
        isSaving={isSaving} projects={projects}
      />
      <MeetingDialog 
        open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}
        title="회의 정보 수정" description="회의의 기본 정보 및 상세 내용을 수정합니다."
        data={editingMeeting} onChange={(f, v) => setEditingMeeting(p => ({ ...p, [f]: v }))}
        onSave={async () => { 
          setIsSaving(true); 
          await updateMeeting(editingMeeting.id!, editingMeeting as Partial<Meeting>); 
          setIsEditDialogOpen(false); 
          setIsSaving(false); 
        }}
        isSaving={isSaving} projects={projects}
      />
      <DeleteConfirmDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} onConfirm={async () => { if (meetingToDelete) await deleteMeeting(meetingToDelete.id); setIsDeleteDialogOpen(false); }} />
    </div>
  );
}

function DeleteConfirmDialog({ open, onOpenChange, onConfirm }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">회의 기록 삭제</DialogTitle>
          <DialogDescription className="text-slate-500">정말로 이 회의 기록을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">취소</Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">삭제 실행</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
