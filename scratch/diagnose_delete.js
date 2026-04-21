const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseDelete() {
  console.log('🧪 Diagnosing Delete Functionality...');
  
  // 1. Create a dummy meeting
  const { data: meeting, error: createError } = await supabase.from('meetings').insert([{
    title: 'DELETE_TEST_MEETING',
    date: '2026-04-21',
    start_time: '15:00',
    end_time: '16:00'
  }]).select().single();

  if (createError) {
    console.error('❌ Failed to create test meeting:', createError.message);
    return;
  }

  console.log('✅ Created test meeting with ID:', meeting.id);

  // 2. Try to delete it
  const { error: deleteError } = await supabase.from('meetings').delete().eq('id', meeting.id);

  if (deleteError) {
    console.error('❌ Delete Failed:', deleteError.message);
    console.error('❌ Error Code:', deleteError.code);
  } else {
    // 3. Confirm deletion
    const { data: check } = await supabase.from('meetings').select('id').eq('id', meeting.id).single();
    if (!check) {
      console.log('✅ Delete Succeeded (Confirmed by re-fetching)');
    } else {
      console.log('⚠️ Delete returned success but record still exists (RLS issues?)');
    }
  }
}

diagnoseDelete();
