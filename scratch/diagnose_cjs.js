const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSave() {
  console.log('🧪 Testing Meeting Save...');
  const { error } = await supabase.from('meetings').insert([{
    title: 'FIX_TEST_MEETING',
    date: '2026-04-21',
    start_time: '13:00',
    end_time: '14:00',
    location: 'SCRATCH_TEST'
  }]);

  if (error) {
    console.error('❌ Error Message:', error.message);
    console.error('❌ Error Code:', error.code);
  } else {
    console.log('✅ Success! (Wait, it worked?)');
    await supabase.from('meetings').delete().eq('title', 'FIX_TEST_MEETING');
  }
}

testSave();
