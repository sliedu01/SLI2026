// Supabase 첫 번째 관리자 사용자 생성 스크립트
// 실행: node scratch/create-admin-user.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== 관리자 계정 생성 시작 ===\n');

  // 1. 회원가입 (Supabase Auth)
  const { data, error } = await supabase.auth.signUp({
    email: 'hrd_jjg@sliedu.com',
    password: 'Sli2026!@',
    options: {
      data: {
        login_id: 'admin',
        name: '관리자',
        phone: '',
        organization: 'SLI',
      },
    },
  });

  if (error) {
    console.error('회원가입 실패:', error.message);
    return;
  }

  console.log('✓ 회원가입 성공');
  console.log('  User ID:', data.user?.id);
  console.log('  Email:', data.user?.email);

  // 2. 프로필이 트리거에 의해 자동 생성되었는지 확인
  if (data.user) {
    // 잠시 대기 (트리거 실행 대기)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. 역할을 admin으로 업데이트
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin', name: '관리자' })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('  ⚠ 역할 업데이트 실패:', updateError.message);
      console.log('  → Supabase 대시보드에서 수동으로 role을 admin으로 변경해 주세요.');
    } else {
      console.log('✓ 관리자 역할 부여 완료');
    }

    // 4. 권한 업데이트 (admin 전체 권한)
    const { error: permError } = await supabase
      .from('user_permissions')
      .update({
        allowed_project_ids: ['*'],
        can_access_projects: true,
        can_access_partners: true,
        can_access_surveys: true,
        can_access_meetings: true,
        can_access_calendar: true,
        can_access_budget: true,
        can_create: true,
        can_update: true,
        can_delete: true,
        can_approve: true,
        budget_access_level: 'full',
      })
      .eq('user_id', data.user.id);

    if (permError) {
      console.error('  ⚠ 권한 업데이트 실패:', permError.message);
    } else {
      console.log('✓ 전체 권한 부여 완료');
    }
  }

  console.log('\n=== 완료 ===');
  console.log('\n로그인 정보:');
  console.log('  이메일: hrd_jjg@sliedu.com');
  console.log('  비밀번호: Sli2026!@');
}

main().catch(console.error);
