import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('=== 관리자 계정 생성 시작 (admin@sliedu.com) ===\n');

  const { data, error } = await supabase.auth.signUp({
    email: 'admin@sliedu.com',
    password: 'Sli2026!@',
    options: {
      data: {
        login_id: 'admin2',
        name: '최고관리자',
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
  
  if (data.user) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('역할 업데이트 실패:', updateError.message);
    } else {
      console.log('✓ 역할 업데이트 성공');
    }
  }
}

main().catch(console.error);
