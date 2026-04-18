import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTemplates() {
  const targetName = '디지털 신기술 역량 진단 (기본)';
  
  const { data, error } = await supabase
    .from('survey_templates')
    .select('id, name, created_at')
    .eq('name', targetName)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return;
  }

  if (data.length <= 1) {
    console.log('No duplicates found for cleaning.');
    return;
  }

  const idsToDelete = data.slice(1).map(t => t.id);
  console.log(`Deleting ${idsToDelete.length} duplicate templates...`);

  const { error: deleteError } = await supabase
    .from('survey_templates')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting duplicates:', deleteError);
  } else {
    console.log('Cleanup successful.');
  }
}

cleanupTemplates();
