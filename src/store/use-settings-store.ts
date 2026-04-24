'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface SettingsState {
  systemName: string;
  appVersion: string;
  lastBackupDate: string | null;
  isLoading: boolean;
  
  // Actions
  fetchSettings: () => Promise<void>;
  setSystemName: (name: string) => Promise<void>;
  updateLastBackupDate: () => Promise<void>;
  resetAllStores: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  systemName: 'SLI 2026 Lv up!',
  appVersion: 'v1.4.0 (Supabase)',
  lastBackupDate: null,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      const settingsMap: Record<string, unknown> = {};
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      set({
        systemName: (settingsMap['systemName'] as string) || get().systemName,
        lastBackupDate: (settingsMap['lastBackupDate'] as string) || get().lastBackupDate,
      });
    }
    set({ isLoading: false });
  },

  setSystemName: async (name) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'systemName', value: name });

    if (error) throw error;
    set({ systemName: name });
  },
  
  updateLastBackupDate: async () => {
    const date = new Date().toISOString();
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'lastBackupDate', value: date });

    if (error) throw error;
    set({ lastBackupDate: date });
  },

  resetAllStores: () => {
    if (confirm('모든 클라우드 데이터를 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
      // 실제 프로젝트에서는 매우 위험하므로 주의해서 구현하거나 막아두는 것이 좋음
      alert('클라우드 전체 초기화는 보안상 제한됩니다. 수파베이스 대시보드를 이용해 주세요.');
    }
  }
}));
