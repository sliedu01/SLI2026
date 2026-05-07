const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function recoverDocs() {
  // Get all partners
  const { data: partners, error } = await supabase.from('partners').select('*');
  
  // List all files in storage
  const { data: files } = await supabase.storage.from('partner-documents').list('partners', { limit: 100 });
  
  console.log("Partners:", partners.map(p => p.name));
  console.log("Files:", files?.length);
  
  // Print files with their names to see if they contain partner names?
  // No, the storage list just returns the filename (1777278624445_4fmie.jpg), no metadata!
  // Wait, does Supabase storage list return metadata? No, custom metadata isn't returned by default in the list API unless we fetch it.
}
recoverDocs();
