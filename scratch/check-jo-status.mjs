import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStatus() {
  // 1. 관리자로 로그인 시도
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hrd_jjg@sliedu.com',
    password: 'Sli2026!@',
  });

  if (authError) {
    console.error('Admin login failed:', authError.message);
    return;
  }

  console.log('Logged in as admin:', authData.user.email);

  // 2. 조재호 및 hinice9@naver.com 확인
  const { data: users, error: userError } = await supabase
    .from('user_profiles')
    .select('*')
    .or('name.ilike.%조재호%,email.eq.hinice9@naver.com');

  if (userError) {
    console.error('Error fetching users:', userError.message);
    return;
  }

  console.log('Users found:', JSON.stringify(users, null, 2));
}

checkStatus();
