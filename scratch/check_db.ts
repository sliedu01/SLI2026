
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('Checking tables in Supabase...');
  
  const { data: templates, error: tError } = await supabase
    .from('survey_templates')
    .select('count', { count: 'exact', head: true });
    
  if (tError) {
    console.error('Error fetching survey_templates:', tError.message);
  } else {
    console.log('survey_templates table exists.');
  }

  const { data: surveys, error: sError } = await supabase
    .from('surveys')
    .select('count', { count: 'exact', head: true });

  if (sError) {
    console.error('Error fetching surveys:', sError.message);
  } else {
    console.log('surveys table exists.');
  }
}

checkTables();
