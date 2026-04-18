import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplates() {
  const { data, error } = await supabase
    .from('survey_templates')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  console.log(`Found ${data.length} templates:`);
  data.forEach((t, i) => {
    console.log(`${i+1}. [${t.id}] ${t.name} (${t.created_at})`);
  });
}

checkTemplates();
