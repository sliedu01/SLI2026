import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPartners() {
  const { data: partners, error: pError } = await supabase.from('partners').select('id, name');
  if (pError) {
    console.error('Error fetching partners:', pError);
    return;
  }

  const { data: projects, error: projError } = await supabase.from('projects').select('id, name, partner_id, level, parent_id');
  if (projError) {
    console.error('Error fetching projects:', projError);
    return;
  }

  console.log('--- Partners and their assigned projects ---');
  partners.forEach(p => {
    const assignedProjects = projects.filter(proj => proj.partner_id === p.id);
    console.log(`Partner: ${p.name} (${p.id})`);
    if (assignedProjects.length > 0) {
      assignedProjects.forEach(proj => {
        console.log(`  - Project: ${proj.name} (ID: ${proj.id}, Level: ${proj.level})`);
      });
    } else {
      console.log('  - No projects assigned');
    }
  });

  console.log('\n--- LV1 Projects ---');
  projects.filter(p => p.level === 1).forEach(p => {
    console.log(`LV1 Project: ${p.name} (ID: ${p.id})`);
  });
}

checkPartners();
