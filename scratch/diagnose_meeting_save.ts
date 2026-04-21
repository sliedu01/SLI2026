import 'dotenv/config';
import { supabase } from '../src/lib/supabase';

async function testSave() {
  console.log('🧪 Testing Meeting Save...');
  const { error } = await supabase.from('meetings').insert([{
    title: 'TEST_MEETING_TITLE',
    date: '2026-04-21',
    start_time: '13:00',
    end_time: '14:00',
    location: 'TEST_LOCATION'
  }]);

  if (error) {
    console.error('❌ Insert Failed:', error.message);
    if (error.message.includes('column "title" of relation "meetings" does not exist')) {
      console.log('💡 Diagnosis: Missing "title" column.');
    } else if (error.message.includes('null value in column "project_id" violates not-null constraint')) {
      console.log('💡 Diagnosis: "project_id" is still NOT NULL.');
    }
  } else {
    console.log('✅ Insert Succeeded (Wait, why did it fail for the user?)');
    // Cleanup
    await supabase.from('meetings').delete().eq('title', 'TEST_MEETING_TITLE');
  }
}

testSave();
