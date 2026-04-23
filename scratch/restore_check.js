const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.from('meetings').select('*').order('date', { ascending: false });
  if (error) console.error(error);
  else {
    console.log('Current Meetings count:', data.length);
    console.table(data.map(m => ({ id: m.id, title: m.title, date: m.date })));
  }
}

check();
