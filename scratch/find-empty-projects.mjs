import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function findEmptyProjects() {
  const { data: projects } = await supabase.from('projects').select('id, name, partner_id, level, parent_id');
  const seoulLv1Id = '3bcb31de-3d60-4197-8813-3a5aff1d33aa';

  const isUnderSeoul = (p) => {
    let current = p;
    while (current && current.parent_id) {
      if (current.parent_id === seoulLv1Id) return true;
      current = projects.find(proj => proj.id === current.parent_id);
    }
    return p.id === seoulLv1Id;
  };

  const emptyProjectsUnderSeoul = projects.filter(p => !p.partner_id && isUnderSeoul(p));
  console.log('Empty projects under Seoul:');
  emptyProjectsUnderSeoul.forEach(p => console.log(`  - ${p.name} (ID: ${p.id}, Level: ${p.level})`));
}

findEmptyProjects();
