'use client';

import * as React from 'react';
import { useMeetingStore, Meeting } from "@/store/use-meeting-store";
import { useProjectStore } from "@/store/use-project-store";
import { 
  Video, 
  Plus, 
  ArrowUpDown, 
  Trash2, 
  Edit3, 
  CalendarDays,
  FileText,
  Maximize2,
  Minimize2,
  X,
  LayoutGrid
} from "lucide-react";
import { MeetingMinutesDoc } from "@/components/meetings/meeting-minutes-doc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

import { useSearchParams } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export default function MeetingsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">로딩 중...</div>}>
      <MeetingsPageContent />
    </React.Suspense>
  );
}

function MeetingsPageContent() {
  const { meetings, fetchMeetings, addMeeting, updateMeeting, deleteMeeting, getSortedMeetings } = useMeetingStore();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id');
  
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<string | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<Partial<Meeting>>({});
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { projects, fetchProjects, selectedLv1Ids, setSelectedLv1Ids } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");

  React.useEffect(() => {
    fetchMeetings();
    fetchProjects();
  }, [fetchMeetings, fetchProjects]);

  // id 파라미터 처리
  React.useEffect(() => {
    if (idParam && meetings.length > 0) {
      const meeting = meetings.find(m => m.id === idParam);
      if (meeting) {
        setSelectedMeetingId(idParam);
        // 만약 사업 필터가 걸려있다면 해당 사업으로 자동 변경
        if (meeting.projectId) {
          setSelectedProjectId(meeting.projectId);
        } else {
          setSelectedProjectId("all");
        }
      }
    }
  }, [idParam, meetings]);

  const lv1Projects = React.useMemo(() => 
    projects.filter(p => p.level === 1), 
  [projects]);

  // 대시보드 선택된 사업과 동기화
  React.useEffect(() => {
    if (selectedLv1Ids.length > 0) {
      setSelectedProjectId(selectedLv1Ids[0]);
    } else {
      setSelectedProjectId("all");
    }
  }, [selectedLv1Ids]);

  // 사업 선택 시 해당 회의록만 필터링
  const filteredMeetings = React.useMemo(() => {
    const sorted = getSortedMeetings();
    
    // 1. 글로벌 LV1 필터링 적용 (사업 선택 드롭다운과 연동)
    let filtered = sorted;
    if (selectedProjectId && selectedProjectId !== 'all') {
      filtered = filtered.filter(m => {
        if (!m.projectId) return false;
        let current = projects.find(p => p.id === m.projectId);
        while (current && current.parentId && current.level > 1) {
          const parent = projects.find(p => p.id === current!.parentId);
          if (!parent) break;
          current = parent;
        }
        return current && current.id === selectedProjectId;
      });
    }

    return sortOrder === 'asc' ? filtered : [...filtered].reverse();
  }, [sortOrder, selectedProjectId, projects, getSortedMeetings]);

  React.useEffect(() => {
    if (filteredMeetings.length > 0) {
      const isStillInList = filteredMeetings.some(m => m.id === selectedMeetingId);
      if (!isStillInList) {
        setSelectedMeetingId(filteredMeetings[0].id);
      }
    } else {
      setSelectedMeetingId(null);
    }
  }, [filteredMeetings, selectedMeetingId]);

  const selectedMeeting = React.useMemo(() => 
    filteredMeetings.find(m => m.id === selectedMeetingId), 
  [filteredMeetings, selectedMeetingId]);

  const handleCreateMeeting = async () => {
    setIsSaving(true);
    try {
      await addMeeting({
        ...editingMeeting as Meeting,
        title: editingMeeting.title || "새 회의록",
        date: editingMeeting.date || new Date().toISOString().split('T')[0],
        startTime: editingMeeting.startTime || "10:00",
        endTime: editingMeeting.endTime || "12:00",
        attendees: editingMeeting.attendees || [],
        content: editingMeeting.content || []
      });
      setIsNewDialogOpen(false);
      setEditingMeeting({});
    } catch (error: unknown) {
      console.error("Meeting creation failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`회의 등록 중 오류가 발생했습니다: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMeeting = async () => {
    if (!selectedMeetingId) return;
    setIsSaving(true);
    try {
      await updateMeeting(selectedMeetingId, editingMeeting);
      setIsEditDialogOpen(false);
    } catch (error: unknown) {
      console.error("Meeting update failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`회의 수정 중 오류가 발생했습니다: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (meeting: Meeting) => {
    setMeetingToDelete(meeting);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!meetingToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMeeting(meetingToDelete.id);
      if (selectedMeetingId === meetingToDelete.id) setSelectedMeetingId(null);
      setIsDeleteDialogOpen(false);
      setMeetingToDelete(null);
    } catch (error: unknown) {
      console.error("Meeting deletion failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      alert(`회의 삭제 중 오류가 발생했습니다: ${message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
      {/* 액션 바 */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 shadow-xl print:hidden">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Video className="size-5 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-slate-900 tracking-tight whitespace-nowrap">회의 관리</h1>
          </div>

          <div className="flex items-center gap-2 w-full">
            <Select 
              key={`meetings-select-${selectedProjectId}-${projects.length}`}
              value={selectedProjectId || 'all'} 
              onValueChange={(val) => {
                const value = val as string;
                setSelectedProjectId(value);
                if (value === 'all') {
                  setSelectedLv1Ids([]);
                } else {
                  setSelectedLv1Ids([value]);
                }
              }}
            >
              <SelectTrigger className="h-9 rounded-lg font-bold text-[11px] bg-white border-slate-200 focus:ring-indigo-500/20">
                <div className="flex items-center gap-2 truncate flex-1">
                  <LayoutGrid className="size-3 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {selectedProjectId === 'all' 
                      ? '전체 회의록' 
                      : (projects.find(p => p.id === selectedProjectId)?.name || '사업 선택')
                    }
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                <SelectItem value="all" className="text-[11px] font-bold">전체 회의록</SelectItem>
                {lv1Projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-[11px] font-bold">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => {
              const selectedProject = projects.find(p => p.id === selectedProjectId);
              setEditingMeeting({ 
                title: selectedProject ? selectedProject.name : '', 
                projectId: selectedProjectId !== 'all' ? (selectedProjectId || undefined) : undefined,
                date: new Date().toISOString().split('T')[0],
                startTime: '10:00',
                endTime: '12:00',
                attendees: [], 
                content: [] 
              });
              setIsNewDialogOpen(true);
            }} 
            className="rounded-lg h-9 bg-slate-900 hover:bg-slate-800 font-bold gap-1.5 px-4 text-[11px] shadow-md"
          >
            <Plus className="size-3.5" /> 신규 회의 등록
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
          {/* 중앙 회의 리스트 (4/12) */}
          <div className="lg:col-span-4 flex flex-col min-h-0 print:hidden">
            <Card className="flex-1 border-none bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900 tracking-tight flex items-center gap-2 text-[12px]">
                  <CalendarDays className="size-3.5 text-indigo-500" /> 회의록 리스트
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-lg font-bold text-[9px] uppercase tracking-widest text-slate-400 hover:bg-slate-100 h-6 px-1.5"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="size-2.5 mr-1" /> {sortOrder === 'asc' ? '날짜▲' : '날짜▼'}
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-2">
                {filteredMeetings.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedMeetingId(m.id)}
                    className={cn(
                      "group p-3 rounded-xl cursor-pointer transition-all border relative",
                      selectedMeetingId === m.id 
                        ? "bg-indigo-50/50 border-indigo-500 shadow-sm" 
                        : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                       <span className={cn(
                         "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                         selectedMeetingId === m.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                       )}>
                         제 {m.sessionNumber}회차
                       </span>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="size-6 rounded-md hover:bg-white hover:text-indigo-600"
                           onClick={(e) => {
                             e.stopPropagation();
                             setEditingMeeting(m);
                             setIsEditDialogOpen(true);
                           }}
                         >
                           <Edit3 className="size-3" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="size-6 rounded-md hover:bg-white hover:text-red-600"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeleteClick(m);
                           }}
                         >
                           <Trash2 className="size-3" />
                         </Button>
                       </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 text-[11px]">{m.date} <span className="text-slate-400 font-medium ml-1">{m.startTime}</span></p>
                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <MapPinIcon className="size-2.5" /> {m.location}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredMeetings.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12 px-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest">등록된 회의록이 없습니다.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col min-h-0">
             <div className="flex-1 overflow-auto rounded-2xl shadow-xl bg-white border border-slate-100 print:overflow-visible print:border-none print:shadow-none">
                {selectedMeeting ? (
                  <MeetingMinutesDoc 
                    meeting={selectedMeeting} 
                    onPrint={() => window.print()}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 py-32 print:hidden">
                    <FileText className="size-16 opacity-10" />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">선택된 회의록이 없습니다.</p>
                  </div>
                )}
             </div>
          </div>
      </div>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={isNewDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsNewDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingMeeting({});
        }
      }}>
        <DialogContent 
          showCloseButton={false}
          style={{ 
            maxWidth: isMaximized ? '1700px' : '1200px', 
            width: isMaximized ? '98vw' : '90vw',
          }}
          className={cn(
            "p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl transition-all duration-300 !translate-x-[-50%] !translate-y-[-50%]",
            isMaximized ? "h-[95vh] sm:!max-w-none" : "h-[85vh] sm:!max-w-none"
          )}
        >
          <div className="bg-slate-900 p-8 text-white relative shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <Video className="size-6 text-indigo-400" />
                {isNewDialogOpen ? "신규 회의록 등록" : "회의록 수정"}
              </DialogTitle>
            </DialogHeader>
            <div className="absolute top-8 right-8 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMaximized(!isMaximized);
                }}
                className="text-slate-400 hover:text-white relative z-[60]"
              >
                {isMaximized ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
              </Button>
              <button 
                onClick={() => {
                   setIsNewDialogOpen(false);
                   setIsEditDialogOpen(false);
                   setEditingMeeting({});
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>
          </div>
          <div className={cn(
            "bg-white overflow-y-auto custom-scrollbar flex-1",
            isMaximized ? "h-[calc(95vh-80px)]" : "h-[calc(85vh-80px)]"
          )}>
            <MeetingMinutesDoc 
              meeting={editingMeeting}
              isEditing={true}
              onUpdate={setEditingMeeting}
              onSubmit={isNewDialogOpen ? handleCreateMeeting : handleUpdateMeeting}
              onCancel={() => {
                setIsNewDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingMeeting({});
              }}
              isSaving={isSaving}
              projects={projects}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
          <div className="bg-red-50 p-8 flex flex-col items-center text-center space-y-4">
             <div className="size-16 rounded-full bg-red-100 flex items-center justify-center animate-bounce">
                <Trash2 className="size-8 text-red-600" />
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">회의록 삭제</h3>
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  정말 <span className="text-red-600">[{meetingToDelete?.title}]</span> 회의록을 삭제하시겠습니까?<br/>
                  이 작업은 되돌릴 수 없습니다.
                </p>
             </div>
          </div>
          <div className="p-6 bg-white flex gap-3">
             <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 h-12 rounded-xl font-black border-slate-200"
                disabled={isDeleting}
             >
                취소
             </Button>
             <Button 
                onClick={handleConfirmDelete}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-100"
                disabled={isDeleting}
             >
                {isDeleting ? "삭제 중..." : "확인 및 삭제"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
