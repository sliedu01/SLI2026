const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findOrphanFiles() {
  const { data: files } = await supabase.storage.from('partner-documents').list('partners', { limit: 100 });
  const { data: partners } = await supabase.from('partners').select('*');
  
  const partnerDocs = partners.flatMap(p => p.documents || []);
  const usedPaths = new Set(partnerDocs.map(d => d.fileName.replace('partners/', '')));
  
  const orphans = files.filter(f => !usedPaths.has(f.name) && f.name !== '.emptyFolderPlaceholder');
  
  console.log("Orphan files count:", orphans.length);
  for (const f of orphans) {
    console.log(f.name, f.created_at);
  }
}

findOrphanFiles();
