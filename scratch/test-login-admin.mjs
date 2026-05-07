import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@sliedu.com',
    password: 'Sli2026!@',
  });

  if (error) {
    console.error('로그인 실패:', error.message);
  } else {
    console.log('로그인 성공:', data.user.id);
  }
}

main().catch(console.error);
