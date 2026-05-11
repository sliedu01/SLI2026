import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignUp() {
  const email = `test_user_${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const loginId = `user_${Date.now()}`;
  const name = 'Test User';

  console.log(`Signing up ${email}...`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        login_id: loginId,
        name,
        phone: '010-1234-5678',
        organization: 'Test Org',
      },
    },
  });

  if (error) {
    console.error('Sign up error:', error.message);
    return;
  }

  console.log('Sign up successful:', data.user?.id);

  // Wait for trigger
  console.log('Waiting for profile creation...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user?.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error (Trigger might be missing):', profileError.message);
  } else {
    console.log('Profile created successfully:', profile);
  }

  const { data: perms, error: permsError } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', data.user?.id)
    .single();

  if (permsError) {
    console.error('Permissions fetch error (Trigger might be missing):', permsError.message);
  } else {
    console.log('Permissions created successfully:', perms);
  }
}

testSignUp();
