'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { usePartnerStore } from '@/store/use-partner-store';
import { useProjectStore } from '@/store/use-project-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { useSettingsStore } from '@/store/use-settings-store';

/**
 * 실시간 데이터베이스(Supabase) 동기화 공급자
 * 모든 스토어의 데이터를 초기화하고 변경 사항을 구독합니다.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const fetchPartners = usePartnerStore(s => s.fetchPartners);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const fetchResponses = useSurveyStore(s => s.fetchResponses);
  const fetchBudgets = useBudgetStore(s => s.fetchBudgets);
  const fetchSettings = useSettingsStore(s => s.fetchSettings);

  React.useEffect(() => {
    // 1. 초기 데이터 로드
    const init = async () => {
       await Promise.all([
         fetchPartners(),
         fetchProjects(),
         fetchResponses(),
         fetchBudgets(),
         fetchSettings()
       ]);
    };
    init();

    // 2. 실시간 구독 설정
    const partnersChannel = supabase
      .channel('partners-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, () => {
        fetchPartners();
      })
      .subscribe();

    const projectsChannel = supabase
      .channel('projects-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects();
      })
      .subscribe();

    const surveysChannel = supabase
      .channel('surveys-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
        fetchResponses();
      })
      .subscribe();

    const budgetsChannel = supabase
      .channel('budgets-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, () => {
        fetchBudgets();
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('settings-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(partnersChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(surveysChannel);
      supabase.removeChannel(budgetsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [fetchPartners, fetchProjects, fetchResponses, fetchBudgets, fetchSettings]);

  return <>{children}</>;
}
