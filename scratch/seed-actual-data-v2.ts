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
  [3, 4, 4, 4, 3, "캐릭터그리는게 재밌었다", ""],
  [5, 4, 2, 4, 3, "4컷 웹툰 그리기가 조금만 더 있을 시간이 조금만 더 있으면 좋겠다.", ""],
  [3, 4, 4, 5, 3, "거의 처음 만화를 그려서 재미있었다. 캐릭터를 다 못 그렸다.", ""],
  [4, 5, 5, 5, 5, "가장 재미있었던 점은 나만의 캐릭터를 만든 것입니다", "네컷 만화 그리기"],
  [5, 5, 5, 5, 5, "그림(캐릭터) 그리기", ""],
  [2, 4, 4, 4, 4, "다 재미 있었음. 오늘 가장 아쉬웠던 것 없음.", ""],
  [5, 5, 5, 5, 5, "선생님이 유쾌하시고 재미있으셔서 재미있었어요.", "구도 배우기, 손가락 잘 그리는법"],
  [5, 5, 5, 5, 5, "그림 그릴 때 너무 좋았어요!", "클튜 툴 사용법!!"],
  [5, 5, 4, 4, 4, "", "애니메이터"],
  [5, 5, 5, 5, 5, "그림자 표현을 배웠다면 좋겠다.", "다양한 컷만화그리기"],
  [5, 5, 5, 5, 5, "아쉬웠던 점은 없고 강사님이 정말 좋음.", "웹툰작가 체험"],
  [5, 5, 5, 5, 5, "", "그림 그리기"],
  [4, 5, 5, 5, 5, "4컷 그리는게 재밌었어요.", ""],
  [3, 5, 4, 5, 5, "", ""],
  [4, 5, 4, 5, 5, "그림그리는게 재미있었고 아쉬운건 없다.", ""],
  [5, 5, 4, 5, 5, "재미있다.", "그림 / 음악"],
  [5, 5, 5, 5, 5, "강의도 재미있게 해주셨고 그림들도 귀여웠다 아쉬운 점은 딱히 없다.", "그림 깔끔하게 그리는 법을 알고 싶다!!"],
  [5, 4, 5, 4, 4, "4컷 만화 그리기", ""],
  [5, 5, 5, 5, 5, "다 재밌음", ""]
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
  const { data: templates } = await supabase.from('survey_templates').select('*');
  const satQuestions = templates?.find(t => t.id === satTemplateId)?.questions || [];
  const compQuestions = templates?.find(t => t.id === compTemplateId)?.questions || [];

  const satIdMap = satQuestions.reduce((acc: any, q: any) => ({ ...acc, [q.order]: q.id }), {});
  const compIdMap = compQuestions.reduce((acc: any, q: any) => ({ ...acc, [q.order]: q.id }), {});

  await supabase.from('surveys').delete().eq('project_id', projectId);

  const satInserts = satisfactionData.map((row, idx) => {
    const scores = row.slice(0, 5);
    const q6 = row[5];
    const q7 = row[6];
    
    const answers = scores.map((s, i) => ({
      questionId: satIdMap[i + 1],
      score: s
    }));
    
    if (q6) answers.push({ questionId: satIdMap[6], text: q6 } as any);
    if (q7) answers.push({ questionId: satIdMap[7], text: q7 } as any);

    return {
      project_id: projectId,
      template_id: satTemplateId,
      respondent_id: `학생${idx + 1}`,
      answers
    };
  });

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

  if (err1 || err2) console.error('Error:', err1, err2);
  else console.log('Re-seeded 19 respondents with subjective answers.');
}

run();
