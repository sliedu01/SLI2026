import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://fwyuyzfysoepeqgnzuhd.supabase.co', 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ');

async function checkCycles() {
  const { data: projects, error } = await supabase.from('projects').select('id, parent_id, name');
  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log(`Checking ${projects.length} projects for cycles...`);

  for (const p of projects) {
    let current = p;
    const visited = new Set();
    while (current.parent_id) {
      if (visited.has(current.id)) {
        console.error(`CYCLE DETECTED! Project "${p.name}" (${p.id}) is part of a cycle.`);
        console.error('Visited path:', Array.from(visited));
        return;
      }
      visited.add(current.id);
      const parent = projects.find(proj => proj.id === current.parent_id);
      if (!parent) {
        // console.warn(`Project "${current.name}" has parent_id ${current.parent_id} but it doesn't exist.`);
        break;
      }
      current = parent;
    }
  }
  console.log('No cycles detected.');
}

checkCycles();
