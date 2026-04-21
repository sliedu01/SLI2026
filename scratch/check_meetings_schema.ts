import 'dotenv/config';
import { supabase } from '../src/lib/supabase';

async function checkSchema() {
  const { data, error } = await supabase.from('meetings').select('*').limit(1);
  if (error) {
    console.error('Error fetching meetings:', error);
  } else {
    console.log('Columns in meetings table:', Object.keys(data[0] || {}));
  }
}

checkSchema();
