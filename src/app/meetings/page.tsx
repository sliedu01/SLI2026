'use client';

import * as React from 'react';
import { 
  Video, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Trash2, 
  Edit3, 
  ChevronLeft,
  CalendarDays,
  FileText
} from "lucide-react";
import { useMeetingStore, Meeting } from "@/store/use-meeting-store";
import { MeetingMinutesDoc } from "@/components/meetings/meeting-minutes-doc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function MeetingsPage() {
  const { meetings, fetchMeetings, addMeeting, updateMeeting, deleteMeeting, getSortedMeetings } = useMeetingStore();
  
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<string | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingMeeting, setEditingMeeting] = React.useState<Partial<Meeting>>({});
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  React.useEffect(() => {
    fetchMeetings();
  }, []);

  // 사업 선택 시 첫 번째 회의 자동 선택
  const filteredMeetings = React.useMemo(() => {
    const sorted = getSortedMeetings();
    return sortOrder === 'asc' ? sorted : [...sorted].reverse();
  }, [meetings, sortOrder]);

  React.useEffect(() => {
    if (filteredMeetings.length > 0 && !selectedMeetingId) {
      setSelectedMeetingId(filteredMeetings[0].id);
    }
  }, [filteredMeetings]);

  const selectedMeeting = React.useMemo(() => 
    filteredMeetings.find(m => m.id === selectedMeetingId), 
  [filteredMeetings, selectedMeetingId]);

  const handleCreateMeeting = async () => {
    try {
      await addMeeting({
        ...editingMeeting as Meeting,
        title: editingMeeting.title || "새 회의록",
        date: editingMeeting.date || new Date().toISOString().split('T')[0],
        startTime: editingMeeting.startTime || "10:00",
        endTime: editingMeeting.endTime || "11:00",
        attendees: editingMeeting.attendees || [],
        content: editingMeeting.content || []
      });
      setIsNewDialogOpen(false);
      setEditingMeeting({});
    } catch (error) {
      alert("회의 등록 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateMeeting = async () => {
    if (!selectedMeetingId) return;
    try {
      await updateMeeting(selectedMeetingId, editingMeeting);
      setIsEditDialogOpen(false);
    } catch (error) {
      alert("회의 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("정말 이 회의록을 삭제하시겠습니까?")) return;
    try {
      await deleteMeeting(id);
      if (selectedMeetingId === id) setSelectedMeetingId(null);
    } catch (error) {
      alert("회의 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      {/* 액션 바 */}
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-100 shadow-xl print:hidden">
        <div className="flex items-center gap-4 flex-1">
          <div className="size-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Video className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">통합 회의 관리</h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Global Meeting Report Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              setEditingMeeting({ title: '', attendees: [], content: [] });
              setIsNewDialogOpen(true);
            }} 
            className="rounded-xl h-12 bg-slate-900 hover:bg-slate-800 font-black gap-2 px-6 shadow-lg"
          >
            <Plus className="size-4" /> 신규 회의 등록
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden min-h-0">
          
          {/* 좌측 리스트 (4/12) */}
          <div className="lg:col-span-4 flex flex-col min-h-0 print:hidden">
            <Card className="flex-1 border-none bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarDays className="size-4 text-indigo-500" /> 회의록 리스트
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-lg font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-100"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="size-3 mr-1" /> {sortOrder === 'asc' ? '날짜오름차순' : '날짜내림차순'}
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {filteredMeetings.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => setSelectedMeetingId(m.id)}
                    className={cn(
                      "group p-4 rounded-2xl cursor-pointer transition-all border-2 relative",
                      selectedMeetingId === m.id 
                        ? "bg-indigo-50/50 border-indigo-500 shadow-md" 
                        : "bg-white border-transparent hover:border-slate-100 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className={cn(
                         "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                         selectedMeetingId === m.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                       )}>
                         제 {m.sessionNumber}회차
                       </span>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="size-7 rounded-lg hover:bg-white hover:text-indigo-600"
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
                           className="size-7 rounded-lg hover:bg-white hover:text-red-600"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDeleteMeeting(m.id);
                           }}
                         >
                           <Trash2 className="size-3" />
                         </Button>
                       </div>
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-slate-900">{m.date} <span className="text-slate-400 font-medium ml-1">{m.startTime}</span></p>
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <MapPinIcon className="size-3" /> {m.location}
                      </p>
                      <p className="text-[11px] font-medium text-indigo-600 mt-2 truncate">
                         {m.attendees.map(a => a.org).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredMeetings.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 px-6 text-center">
                    <p className="text-sm font-black uppercase tracking-widest">등록된 회의록이 없습니다.</p>
                    <p className="text-[10px] font-medium mt-2">신규 회의를 등록하여 관리를 시작하세요.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex flex-col min-h-0">
             <div className="flex-1 overflow-auto rounded-[2rem] shadow-2xl bg-white border border-slate-100 print:overflow-visible print:border-none print:shadow-none">
                {selectedMeeting ? (
                  <MeetingMinutesDoc 
                    meeting={selectedMeeting} 
                    onPrint={() => window.print()}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 py-32 print:hidden">
                    <FileText className="size-24 opacity-10" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">선택된 회의록이 없습니다.</p>
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
        <DialogContent className="max-w-[1400px] w-[95vw] max-h-[95vh] overflow-auto rounded-[2rem] p-0 border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <Video className="size-6 text-indigo-400" />
                {isNewDialogOpen ? "신규 회의록 등록" : "회의록 수정"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="bg-white">
            <MeetingMinutesDoc 
              meeting={editingMeeting}
              isEditing={true}
              onUpdate={setEditingMeeting}
            />
          </div>
          <DialogFooter className="p-8 bg-slate-50 flex gap-3 border-t border-slate-100">
             <Button variant="outline" onClick={() => { setIsNewDialogOpen(false); setIsEditDialogOpen(false); }} className="rounded-xl font-bold border-slate-200">
               취소
             </Button>
             <Button onClick={isNewDialogOpen ? handleCreateMeeting : handleUpdateMeeting} className="rounded-xl font-black bg-slate-900 px-8">
               {isNewDialogOpen ? "등록하기" : "수정 완료"}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MapPinIcon(props: any) {
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
