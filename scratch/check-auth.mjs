import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser() {
  console.log('Checking auth...');
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching user_profiles:', error);
  } else {
    console.log('User profiles:', data);
  }
}

checkUser().catch(console.error);
