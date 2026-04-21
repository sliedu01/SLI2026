import { create } from 'zustand';
import { supabase, Json } from '@/lib/supabase';
import { getPublicUrlFromPath } from '@/lib/storage';

export interface PartnerDocument {
  id: string;
  type: string; 
  originalName: string;
  fileName: string; 
  fileUrl?: string; 
}

export interface Partner {
  id: string;
  name: string;
  manager: string;
  phone1: string;
  phone2: string;
  email: string;
  address: string;
  documents: PartnerDocument[];
  createdAt: number;
}

interface PartnerState {
  partners: Partner[];
  isLoading: boolean;
  
  // Actions
  fetchPartners: () => Promise<void>;
  addPartner: (partner: Omit<Partner, 'id' | 'createdAt'>) => Promise<string>;
  updatePartner: (id: string, updates: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  
  // Selectors
  getPartner: (id: string) => Partner | undefined;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  partners: [],
  isLoading: false,

  fetchPartners: async () => {
    set({ isLoading: true });
    // 모든 필드를 가져오도록 수정 (가시성 문제 해결)
    const { data, error } = await supabase
      .from('partners')
      .select('id, name, manager, phone1, phone2, email, address, documents, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching partners:', error);
    } else {
      const mappedPartners: Partner[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        manager: p.manager || '',
        phone1: p.phone1 || '',
        phone2: p.phone2 || '',
        email: p.email || '',
        address: p.address || '',
        documents: ((p.documents as unknown as PartnerDocument[]) || []).map(d => {
          // 파일 URL이 없거나 만료된 구형 데이터인 경우 복구 시도
          if (!d.fileUrl && d.fileName) {
            const bucket = d.type.includes('계약서') ? 'partner-documents' : 'partner-documents';
            const path = d.fileName.includes('/') ? d.fileName : `partners/${d.fileName}`;
            return { ...d, fileUrl: getPublicUrlFromPath(bucket, path) };
          }
          return d;
        }),
        createdAt: new Date(p.created_at).getTime(),
      }));
      set({ partners: mappedPartners });
    }
    set({ isLoading: false });
  },

  addPartner: async (partnerData) => {
    const { data, error } = await supabase
      .from('partners')
      .insert([{
        name: partnerData.name,
        manager: partnerData.manager,
        phone1: partnerData.phone1,
        phone2: partnerData.phone2,
        email: partnerData.email,
        address: partnerData.address,
        documents: partnerData.documents as unknown as Json,
      }])
      .select()
      .single();

    if (error) throw error;
    
    // 로컬 상태 즉시 업데이트 (선택사항, 구독이 처리할 수도 있음)
    const newPartner: Partner = {
      ...partnerData,
      id: data.id,
      createdAt: new Date(data.created_at).getTime(),
    };
    set((state) => ({ partners: [newPartner, ...state.partners] }));
    
    return data.id;
  },

  updatePartner: async (id, updates) => {
    const { error } = await supabase
      .from('partners')
      .update({
        name: updates.name,
        manager: updates.manager,
        phone1: updates.phone1,
        phone2: updates.phone2,
        email: updates.email,
        address: updates.address,
        documents: updates.documents as unknown as Json,
      })
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      partners: state.partners.map((p) => 
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  deletePartner: async (id) => {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      partners: state.partners.filter((p) => p.id !== id),
    }));
  },

  getPartner: (id) => {
    return get().partners.find((p) => p.id === id);
  },
}));
