const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPartnersTimes() {
  const { data: partners } = await supabase.from('partners').select('id, name, created_at, abbreviation, documents');
  
  for (const p of partners) {
    console.log(p.name, p.created_at, p.documents?.length || 0);
  }
}
checkPartnersTimes();
