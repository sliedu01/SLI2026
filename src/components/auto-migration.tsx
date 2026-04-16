'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 자동 데이터 마이그레이션 컴포넌트 (고도화 버전)
 * 로컬 스토리지에 남아있는 모든 계층형 데이터를 감지하여 Supabase 클라우드로 자동 업로드합니다.
 */
export function AutoMigration() {
  React.useEffect(() => {
    const migrateData = async () => {
      console.log('Auto-migration engine started...');

      // 1. 파트너 데이터 이관
      const partnerRaw = localStorage.getItem('partner-storage-v3');
      if (partnerRaw) {
        try {
          const { state } = JSON.parse(partnerRaw);
          if (state?.partners?.length > 0) {
            await supabase.from('partners').upsert(state.partners.map((p: any) => ({
              id: p.id, name: p.name, manager: p.manager, phone1: p.phone1, phone2: p.phone2, 
              email: p.email, address: p.address, documents: p.documents
            })));
            localStorage.removeItem('partner-storage-v3');
          }
        } catch (e) {}
      }

      // 2. 사업 데이터 이관
      const projectRaw = localStorage.getItem('project-storage-v2') || localStorage.getItem('project-storage');
      if (projectRaw) {
        try {
          const { state } = JSON.parse(projectRaw);
          if (state?.projects?.length > 0) {
            await supabase.from('projects').upsert(state.projects.map((p: any) => ({
              id: p.id, name: p.name, start_date: p.startDate, end_date: p.endDate,
              start_time: p.startTime, end_time: p.endTime, description: p.description,
              parent_id: p.parentId, level: p.level, partner_id: p.partnerId,
              quota: p.quota, participant_count: p.participantCount
            })));
            localStorage.removeItem('project-storage-v2');
            localStorage.removeItem('project-storage');
          }
        } catch (e) {}
      }

      // 3. 설문 데이터 이관 (템플릿 + 응답)
      const surveyRaw = localStorage.getItem('survey-storage');
      if (surveyRaw) {
        try {
          const { state } = JSON.parse(surveyRaw);
          // 템플릿 이관
          if (state?.templates?.length > 0) {
            await supabase.from('survey_templates').upsert(state.templates.map((t: any) => ({
              id: t.id, name: t.name, type: t.type, questions: t.questions
            })));
          }
          // 응답 이관
          if (state?.responses?.length > 0) {
            await supabase.from('surveys').upsert(state.responses.map((r: any) => ({
              id: r.id, project_id: r.projectId, template_id: r.templateId, 
              respondent_id: r.respondentId, answers: r.answers, metadata: r.metadata
            })));
          }
          localStorage.removeItem('survey-storage');
        } catch (e) {}
      }

      // 4. 예산 데이터 이관 (4단계 계층)
      const budgetRaw = localStorage.getItem('budget-storage');
      if (budgetRaw) {
        try {
          const { state } = JSON.parse(budgetRaw);
          if (state?.categories?.length > 0) {
            await supabase.from('budget_categories').upsert(state.categories.map((c: any) => ({
              id: c.id, name: c.name, project_id: c.projectId
            })));
          }
          if (state?.managements?.length > 0) {
            await supabase.from('budget_managements').upsert(state.managements.map((m: any) => ({
              id: m.id, category_id: m.categoryId, name: m.name
            })));
          }
          if (state?.executions?.length > 0) {
            await supabase.from('budget_executions').upsert(state.executions.map((e: any) => ({
              id: e.id, management_id: e.managementId, name: e.name, 
              budget_amount: e.budgetAmount, project_id: e.projectId
            })));
          }
          if (state?.expenditures?.length > 0) {
            await supabase.from('expenditures').upsert(state.expenditures.map((ex: any) => ({
              id: ex.id, execution_id: ex.executionId, date: ex.date, amount: ex.amount,
              partner_id: ex.partnerId, vendor_name: ex.vendor, description: ex.description,
              attachment: { fileName: ex.attachmentName, originalName: ex.attachmentOriginalName, fileUrl: ex.attachmentUrl }
            })));
          }
          localStorage.removeItem('budget-storage');
        } catch (e) {}
      }

      // 5. 설정 데이터 이관
      const settingsRaw = localStorage.getItem('settings-storage');
      if (settingsRaw) {
        try {
          const { state } = JSON.parse(settingsRaw);
          if (state?.systemName) await supabase.from('settings').upsert({ key: 'systemName', value: state.systemName });
          localStorage.removeItem('settings-storage');
        } catch (e) {}
      }

      console.log('Auto-migration cycle complete.');
    };

    migrateData();
  }, []);

  return null;
}
