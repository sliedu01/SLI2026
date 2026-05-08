import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPerms() {
  const userId = '8b885ab8-7a4c-4410-843c-5e45d3bb3299';
  
  // 관리자로 로그인
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hrd_jjg@sliedu.com',
    password: 'Sli2026!@',
  });

  const { data: perms, error: permError } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (permError) {
    console.error('Error fetching perms:', permError.message);
    return;
  }

  console.log('Permissions for 조재호:', JSON.stringify(perms, null, 2));
}

checkPerms();
