const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: partners } = await supabase.from('partners').select('*').limit(1);
  if (!partners || partners.length === 0) return console.log('No partners');
  const partnerId = partners[0].id;
  
  const fakeDocs = [{
    id: "test",
    type: "사업자등록증",
    originalName: "test.pdf",
    fileName: "partners/test.pdf",
    fileUrl: "https://test.com/test.pdf"
  }];
  
  const { data, error } = await supabase
      .from('partners')
      .update({ documents: fakeDocs })
      .eq('id', partnerId);
      
  if (error) {
    console.error('Update failed with error:', error);
  } else {
    console.log('Update succeeded:', data);
  }
}
testUpdate();
