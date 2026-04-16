'use client';

import * as React from 'react';
import { usePartnerStore } from '@/store/use-partner-store';
import { useProjectStore } from '@/store/use-project-store';
import { useSurveyStore } from '@/store/use-survey-store';
import { useBudgetStore } from '@/store/use-budget-store';
import { useSettingsStore } from '@/store/use-settings-store';
import { supabase } from '@/lib/supabase';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { fetchPartners } = usePartnerStore();
  const { fetchProjects } = useProjectStore();
  const { fetchSurveys } = useSurveyStore();
  const { fetchBudgets } = useBudgetStore();
  const { fetchSettings } = useSettingsStore();

  React.useEffect(() => {
    // 초기 데이터 로드
    fetchPartners();
    fetchProjects();
    fetchSurveys();
    fetchBudgets();
    fetchSettings();

    // 실시간 구독 설정 (PostgreSQL Changes)
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, () => fetchPartners())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_templates' }, () => fetchSurveys())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => fetchSurveys())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_categories' }, () => fetchBudgets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_managements' }, () => fetchBudgets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_executions' }, () => fetchBudgets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenditures' }, () => fetchBudgets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchSettings())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPartners, fetchProjects, fetchSurveys, fetchBudgets, fetchSettings]);

  return <>{children}</>;
}
