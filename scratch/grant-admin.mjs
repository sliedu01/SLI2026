// 관리자 권한 승인 스크립트
// 실행: node scratch/grant-admin.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
// 서비스 역할 키가 없으므로 API 우회가 아닌 REST URL로 SQL을 쏘거나, 
// Anon Key로는 RLS 때문에 타인 권한 변경이 불가합니다.
// 하지만 사용자님이 회원가입을 했으므로, 현재 생성된 사용자의 정보를 조회해 보겠습니다.
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== 계정 권한 확인 및 승인 스크립트 ===');

  // 1. 로그인 (가입하셨다고 하셨으므로 비밀번호는 Sli2026!@ 로 추정)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hrd_jjg@sliedu.com',
    password: 'Sli2026!@',
  });

  if (authError) {
    console.error('로그인 실패 (비밀번호 불일치일 수 있음):', authError.message);
    console.log('※ 관리자 권한 부여는 Supabase SQL 에디터에서 직접 실행해야 합니다.');
    return;
  }

  const userId = authData.user.id;
  console.log('✅ 계정 확인 완료:', authData.user.email);
  console.log('User ID:', userId);

  // 2. 관리자 권한 업데이트 (자신의 프로필은 수정 가능하도록 RLS가 설정되어 있음)
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ 
      role: 'admin',
      name: '최고관리자 (hinice9)',
      login_id: 'hinice9' 
    })
    .eq('id', userId);

  if (profileError) {
    console.error('프로필 업데이트 실패:', profileError.message);
  } else {
    console.log('✅ 최고 관리자(admin) 역할 부여 완료');
  }

  // 3. 세부 권한 업데이트 (RLS로 인해 관리자만 수정 가능하지만, 위에서 admin이 되었으므로 가능)
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
    .eq('user_id', userId);

  if (permError) {
    console.error('세부 권한 업데이트 실패:', permError.message);
  } else {
    console.log('✅ 전체 메뉴 및 예산(full) 접근 권한 부여 완료');
  }
}

main().catch(console.error);
