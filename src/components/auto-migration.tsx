'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 자동 데이터 마이그레이션 컴포넌트
 * 로컬 스토리지에 남아있는 구형 데이터를 감지하여 Supabase 클라우드로 자동 업로드합니다.
 */
export function AutoMigration() {
  React.useEffect(() => {
    const migrateData = async () => {
      // 1. 파트너 데이터 확인 및 이관 (partner-storage-v3)
      const partnerRaw = localStorage.getItem('partner-storage-v3');
      if (partnerRaw) {
        try {
          const { state } = JSON.parse(partnerRaw);
          if (state?.partners && state.partners.length > 0) {
            console.log('Migrating partners to cloud...');
            const { error } = await supabase.from('partners').upsert(
              state.partners.map((p: any) => ({
                id: p.id,
                name: p.name,
                manager: p.manager,
                phone1: p.phone1,
                phone2: p.phone2,
                email: p.email,
                address: p.address,
                documents: p.documents,
              }))
            );
            if (!error) {
              localStorage.removeItem('partner-storage-v3');
              console.log('Partners migration successful.');
            }
          } else {
            localStorage.removeItem('partner-storage-v3');
          }
        } catch (e) {
          console.error('Partner migration failed', e);
        }
      }

      // 2. 사업 데이터 확인 및 이관 (project-storage-v2 또는 project-storage)
      const projectRaw = localStorage.getItem('project-storage-v2') || localStorage.getItem('project-storage');
      if (projectRaw) {
        try {
          const { state } = JSON.parse(projectRaw);
          if (state?.projects && state.projects.length > 0) {
            console.log('Migrating projects to cloud...');
            const { error } = await supabase.from('projects').upsert(
              state.projects.map((p: any) => ({
                id: p.id,
                name: p.name,
                start_date: p.startDate,
                end_date: p.endDate,
                start_time: p.startTime,
                end_time: p.endTime,
                description: p.description,
                parent_id: p.parentId,
                level: p.level,
                partner_id: p.partnerId,
                quota: p.quota,
                participant_count: p.participantCount,
              }))
            );
            if (!error) {
              localStorage.removeItem('project-storage-v2');
              localStorage.removeItem('project-storage');
              console.log('Projects migration successful.');
            }
          } else {
            localStorage.removeItem('project-storage-v2');
            localStorage.removeItem('project-storage');
          }
        } catch (e) {
          console.error('Project migration failed', e);
        }
      }

      // 3. 설문 데이터 확인 및 이관 (survey-storage)
      const surveyRaw = localStorage.getItem('survey-storage');
      if (surveyRaw) {
        try {
          const { state } = JSON.parse(surveyRaw);
          if (state?.responses && state.responses.length > 0) {
            const { error } = await supabase.from('surveys').upsert(
              state.responses.map((s: any) => ({
                id: s.id,
                project_id: s.projectId,
                user_id: s.userId,
                answers: s.answers,
                metadata: s.metadata,
                completed_at: s.completedAt,
              }))
            );
            if (!error) localStorage.removeItem('survey-storage');
          } else {
            localStorage.removeItem('survey-storage');
          }
        } catch (e) {}
      }

      // 4. 예산 데이터 확인 및 이관 (budget-storage)
      const budgetRaw = localStorage.getItem('budget-storage');
      if (budgetRaw) {
        try {
          const { state } = JSON.parse(budgetRaw);
          if (state?.items && state.items.length > 0) {
            const { error } = await supabase.from('budgets').upsert(
              state.items.map((b: any) => ({
                id: b.id,
                project_id: b.projectId,
                category: b.category,
                amount: b.amount,
                description: b.description,
              }))
            );
            if (!error) localStorage.removeItem('budget-storage');
          } else {
            localStorage.removeItem('budget-storage');
          }
        } catch (e) {}
      }

      // 5. 설정 데이터 확인 및 이관 (settings-storage)
      const settingsRaw = localStorage.getItem('settings-storage');
      if (settingsRaw) {
        try {
          const { state } = JSON.parse(settingsRaw);
          if (state) {
            if (state.systemName) await supabase.from('settings').upsert({ key: 'systemName', value: state.systemName });
            if (state.lastBackupDate) await supabase.from('settings').upsert({ key: 'lastBackupDate', value: state.lastBackupDate });
            localStorage.removeItem('settings-storage');
          }
        } catch (e) {}
      }
    };

    migrateData();
  }, []);

  return null; // UI 없이 백그라운드에서만 동작
}
