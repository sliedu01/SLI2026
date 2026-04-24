import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface MeetingAttendee {
  org: string;
  name: string;
}

export interface MeetingContent {
  title: string;
  detail: string;
}

export interface Meeting {
  id: string;
  title: string; // 회의 제목/사업명 직접 입력
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  attendees: MeetingAttendee[];
  purpose: string;
  agenda: string;
  preparations: string;
  content: MeetingContent[];
  others: string;
  nextSchedule: string;
  projectId?: string;
  createdAt: number;
}

interface MeetingState {
  meetings: Meeting[];
  isLoading: boolean;
  
  // Actions
  fetchMeetings: () => Promise<void>;
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => Promise<void>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  
  // Helpers
  getSortedMeetings: () => (Meeting & { sessionNumber: number })[];
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  isLoading: false,

  fetchMeetings: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching meetings:', error);
    } else {
      const mapped: Meeting[] = (data || []).map(m => ({
        id: m.id,
        title: m.title || '',
        date: m.date,
        startTime: m.start_time || '',
        endTime: m.end_time || '',
        location: m.location || '',
        attendees: m.attendees || [],
        purpose: m.purpose || '',
        agenda: m.agenda || '',
        preparations: m.preparations || '',
        content: m.content || [],
        others: m.others || '',
        nextSchedule: m.next_schedule || '',
        projectId: m.project_id || undefined,
        createdAt: new Date(m.created_at).getTime(),
      }));
      set({ meetings: mapped });
    }
    set({ isLoading: false });
  },

  addMeeting: async (meetingData) => {
    const { error } = await supabase
      .from('meetings')
      .insert([{
        title: meetingData.title,
        date: meetingData.date,
        start_time: meetingData.startTime,
        end_time: meetingData.endTime,
        location: meetingData.location,
        attendees: meetingData.attendees,
        purpose: meetingData.purpose,
        agenda: meetingData.agenda,
        preparations: meetingData.preparations,
        content: meetingData.content,
        others: meetingData.others,
        next_schedule: meetingData.nextSchedule,
        project_id: meetingData.projectId,
      }]);

    if (error) {
      console.error('Add meeting error details:', error);
      throw error;
    }
    await get().fetchMeetings();
  },

  updateMeeting: async (id, updates) => {
    const updateData: Record<string, unknown> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.attendees !== undefined) updateData.attendees = updates.attendees;
    if (updates.purpose !== undefined) updateData.purpose = updates.purpose;
    if (updates.agenda !== undefined) updateData.agenda = updates.agenda;
    if (updates.preparations !== undefined) updateData.preparations = updates.preparations;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.others !== undefined) updateData.others = updates.others;
    if (updates.nextSchedule !== undefined) updateData.next_schedule = updates.nextSchedule;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;

    const { error } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    await get().fetchMeetings();
  },

  deleteMeeting: async (id) => {
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await get().fetchMeetings();
  },

  getSortedMeetings: () => {
    const { meetings } = get();
    
    return [...meetings]
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })
      .map((m, idx) => ({
        ...m,
        sessionNumber: idx + 1 // 동적 회차 부여
      }));
  },
}));
