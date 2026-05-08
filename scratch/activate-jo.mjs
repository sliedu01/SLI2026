import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function activateUser() {
  // 1. 관리자로 로그인
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hrd_jjg@sliedu.com',
    password: 'Sli2026!@',
  });

  if (authError) {
    console.error('Admin login failed:', authError.message);
    return;
  }

  // 2. 조재호 계정 활성화 (is_active: true)
  const userId = '8b885ab8-7a4c-4410-843c-5e45d3bb3299';
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateError) {
    console.error('Update failed:', updateError.message);
    return;
  }

  console.log('✅ 조재호 계정 활성화 완료');
}

activateUser();
