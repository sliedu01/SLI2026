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
  abbreviation?: string; 
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
      .select('*')
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
          // 파일 경로(fileName)가 있다면 항상 최신 공용 URL을 재생성하여 유실 방지
          if (d.fileName) {
            const bucket = 'partner-documents';
            const path = d.fileName.includes('/') ? d.fileName : `partners/${d.fileName}`;
            return { ...d, fileUrl: getPublicUrlFromPath(bucket, path) };
          }
          return d;
        }),
        createdAt: new Date(p.created_at).getTime(),
      }));

      // 로컬 스토리지에서 협력업체 약어 데이터 로드
      const localAbbrs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('partner_abbreviations') || '{}') : {};
      
      const finalizedPartners = mappedPartners.map(p => ({
        ...p,
        abbreviation: localAbbrs[p.id] || p.abbreviation || '',
      }));

      set({ partners: finalizedPartners });
    }
    set({ isLoading: false });
  },

  addPartner: async (partnerData) => {
    let finalId = '';
    try {
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
          abbreviation: partnerData.abbreviation,
        }])
        .select()
        .single();

      if (error) {
        if (error.message?.includes('abbreviation')) {
          console.warn('Database insert failed for partner abbreviation, retrying without it:', error);
          const { data: retryData, error: retryError } = await supabase
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
          
          if (retryError) throw retryError;
          finalId = retryData.id;
        } else {
          throw error;
        }
      } else {
        finalId = data.id;
      }
    } catch (err) {
      throw err;
    }
    
    // 로컬 스토리지에 약어 저장
    if (typeof window !== 'undefined') {
      const localAbbrs = JSON.parse(localStorage.getItem('partner_abbreviations') || '{}');
      if (partnerData.abbreviation) localAbbrs[finalId] = partnerData.abbreviation;
      localStorage.setItem('partner_abbreviations', JSON.stringify(localAbbrs));
    }

    const newPartner: Partner = {
      ...partnerData,
      id: finalId,
      createdAt: Date.now(),
    };
    set((state) => ({ partners: [newPartner, ...state.partners] }));
    
    return finalId;
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
        abbreviation: updates.abbreviation,
      })
      .eq('id', id);

    if (error) {
      console.warn('Database update failed for partner abbreviation, using local storage fallback:', error);
      // 로컬 상태 강제 업데이트
      set((state) => ({
        partners: state.partners.map((p) => 
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    } else {
      set((state) => ({
        partners: state.partners.map((p) => 
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    }

    // 로컬 스토리지에 즉시 저장
    if (typeof window !== 'undefined') {
      if (updates.abbreviation !== undefined) {
        const localAbbrs = JSON.parse(localStorage.getItem('partner_abbreviations') || '{}');
        localAbbrs[id] = updates.abbreviation;
        localStorage.setItem('partner_abbreviations', JSON.stringify(localAbbrs));
      }
    }
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
