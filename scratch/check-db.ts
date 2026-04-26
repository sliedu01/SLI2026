import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: templates } = await supabase.from('survey_templates').select('id, name, type');
  console.log('Templates:', templates);
  const { data: surveys } = await supabase.from('surveys').select('id, respondent_id, project_id, template_id');
  console.log('Surveys Count:', surveys?.length);
  if (surveys && surveys.length > 0) {
    console.log('Sample Survey:', surveys[0]);
  }
}

checkData();
