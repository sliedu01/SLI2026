const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFiles() {
  const { data, error } = await supabase.storage.from('partner-documents').list('partners', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(data);
  }
}

listFiles();
