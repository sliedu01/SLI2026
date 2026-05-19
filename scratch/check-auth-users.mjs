import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching auth users:', error);
    return;
  }
  
  const unassigned = users.users.filter(u => u.email === 'tjwls31028@naver.com' || u.email === 'hey_schatzi@hanmail.net');
  console.log('Auth users for unassigned:');
  console.log(JSON.stringify(unassigned, null, 2));
}

check();
