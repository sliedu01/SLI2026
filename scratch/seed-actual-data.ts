import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const projectId = '91987233-f908-4979-8af6-0647f7f2e5bb';
const satTemplateId = '5983fa45-87db-41c7-9690-1197abd61b46';
const compTemplateId = '4fe72e46-0ecb-4b47-815a-f94596a2b2ae';

const satisfactionData = [
  [3, 4, 4, 4, 3], [5, 4, 2, 4, 3], [3, 4, 4, 5, 3], [4, 5, 5, 5, 5], [5, 5, 5, 5, 5],
  [2, 4, 4, 4, 4], [5, 5, 5, 5, 5], [5, 5, 5, 5, 5], [5, 5, 4, 4, 4], [5, 5, 5, 5, 5],
  [5, 5, 5, 5, 5], [5, 5, 5, 5, 5], [4, 5, 5, 5, 5], [3, 5, 4, 5, 5], [4, 5, 4, 5, 5],
  [5, 5, 4, 5, 5], [5, 5, 5, 5, 5], [5, 4, 5, 4, 4], [5, 5, 5, 5, 5]
];

const competencyData = [
  [[3, 3], [3, 4], [4, 4], [5, 5], [2, 3], [2, 3]],
  [[5, 5], [3, 3], [1, 1], [2, 3], [2, 3], [4, 4]],
  [[2, 4], [3, 4], [2, 4], [2, 4], [1, 5], [3, 3]],
  [[3, 4], [4, 5], [4, 5], [4, 5], [4, 5], [4, 4]],
  [[3, 5], [3, 5], [2, 5], [3, 5], [4, 5], [3, 5]],
  [[2, 4], [3, 4], [3, 4], [2, 4], [3, 3], [3, 3]],
  [[4, 5], [4, 5], [3, 4], [2, 4], [4, 4], [4, 4]],
  [[5, 5], [5, 5], [5, 5], [5, 5], [5, 5], [5, 5]],
  [[3, 4], [3, 4], [4, 5], [4, 5], [4, 5], [4, 4]],
  [[5, 5], [5, 5], [5, 5], [5, 5], [5, 5], [5, 5]],
  [[5, 5], [5, 5], [5, 5], [5, 5], [5, 5], [5, 5]],
  [[5, 5], [5, 5], [5, 5], [4, 5], [5, 5], [4, 4]],
  [[5, 5], [4, 5], [3, 4], [4, 5], [4, 5], [3, 4]],
  [[4, 4], [3, 3], [4, 4], [5, 5], [3, 4], [2, 3]],
  [[3, 4], [3, 5], [3, 5], [3, 5], [3, 4], [2, 4]],
  [[4, 4], [4, 4], [4, 4], [4, 4], [4, 4], [4, 5]],
  [[4, 5], [4, 5], [3, 4], [4, 5], [4, 5], [4, 5]],
  [[3, 4], [3, 4], [4, 5], [3, 4], [4, 5], [4, 5]],
  [[4, 5], [3, 5], [3, 4], [4, 4], [3, 4], [3, 5]]
];

async function run() {
  // 1. Get Template Questions to map order to ID
  const { data: templates } = await supabase.from('survey_templates').select('*');
  const satQuestions = templates?.find(t => t.id === satTemplateId)?.questions || [];
  const compQuestions = templates?.find(t => t.id === compTemplateId)?.questions || [];

  const satIdMap = satQuestions.reduce((acc: any, q: any) => ({ ...acc, [q.order]: q.id }), {});
  const compIdMap = compQuestions.reduce((acc: any, q: any) => ({ ...acc, [q.order]: q.id }), {});

  // 2. Delete old data
  await supabase.from('surveys').delete().eq('project_id', projectId);

  // 3. Insert Satisfaction
  const satInserts = satisfactionData.map((scores, idx) => ({
    project_id: projectId,
    template_id: satTemplateId,
    respondent_id: `학생${idx + 1}`,
    answers: scores.map((s, i) => ({
      questionId: satIdMap[i + 1],
      score: s
    }))
  }));

  // 4. Insert Competency
  const compInserts = competencyData.map((pairs, idx) => ({
    project_id: projectId,
    template_id: compTemplateId,
    respondent_id: `학생${idx + 1}`,
    answers: pairs.map((p, i) => ({
      questionId: compIdMap[i + 1],
      preScore: p[0],
      score: p[1]
    }))
  }));

  const { error: err1 } = await supabase.from('surveys').insert(satInserts);
  const { error: err2 } = await supabase.from('surveys').insert(compInserts);

  if (err1 || err2) {
    console.error('Error inserting data:', err1, err2);
  } else {
    console.log('Successfully inserted 19 respondents data.');
  }
}

run();
