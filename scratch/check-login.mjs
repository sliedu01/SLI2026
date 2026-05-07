// 사용자 로그인 상태 및 가입 여부 확인 스크립트
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAccount() {
  console.log('=== 계정 가입 여부 확인 ===');
  
  // 로그인 시도 1: 이메일로 시도
  console.log('\n[테스트 1] 이메일로 로그인 시도 (hrd_jjg@sliedu.com)');
  const { data: data1, error: error1 } = await supabase.auth.signInWithPassword({
    email: 'hrd_jjg@sliedu.com',
    password: 'Sli2026!@', // 기본적으로 시도해볼 수 있는 비밀번호
  });

  if (error1) {
    console.error('  -> 로그인 에러:', error1.message);
  } else {
    console.log('  -> 로그인 성공! User ID:', data1.user.id);
  }

  console.log('\n=== 계정 프로필 존재 여부 확인 ===');
  // 가입 절차 시 트리거 실패 등으로 auth.users에는 있는데 public.user_profiles에는 없을 수도 있습니다.
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', 'hrd_jjg@sliedu.com')
    .single();
    
  // RLS 때문에 안 보일 수도 있습니다
  if (profileError) {
    console.log('프로필 조회 결과 (RLS로 안 보일 수 있음):', profileError.message);
  } else {
    console.log('가입된 프로필 발견:', profile);
  }
}

checkAccount().catch(console.error);
