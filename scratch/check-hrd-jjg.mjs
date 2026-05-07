import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser() {
  const { data, error } = await supabase.from('user_profiles').select('*').eq('email', 'hrd_jjg@sliedu.com');
  console.log('Error:', error);
  console.log('Data:', data);
}

checkUser().catch(console.error);
