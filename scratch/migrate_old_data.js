const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
const supabaseKey = 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ';
const supabase = createClient(supabaseUrl, supabaseKey);

const partners = [
  "시립노원청소년미래진로센터 앤드", "시립성북청소년센터", "고려대학교산학협력단", 
  "서울시립과학관", "시립청소년미래진로센터 하자센터", "시립청소년음악센터", 
  "시립청소년미디어센터", "서울마인드브릿지센터", "시립화곡청소년센터", 
  "(주)퓨쳐플랜", "주식회사 아토큐브", "(주)플레이파크", 
  "주식회사 럭스로보", "주식회사 에이럭스", "(주)티에이치포티투", 
  "(주)에이아이네이션", "명지전문대", "앤드센터", "타임리", 
  "SLI", "에듀콤", "서경대학교", "기업가재단"
];

const projects = [
  { name: "진로캠퍼스", level: 1, partner: "시립노원청소년미래진로센터 앤드" },
  { name: "조금 느린 아이", level: 1, partner: "서울마인드브릿지센터" },
  { name: "진로·진학 AI코칭", level: 1, partner: "(주)퓨쳐플랜" },
  { name: "STEM 프리스쿨", level: 1 },
  { name: "생성형 AI 서비스", level: 1 },
  { name: "AI핵심 인재 양성", level: 1 },
  { name: "화상영어", level: 1 },
  { name: "영어캠프", level: 1 }
];

async function migrate() {
  console.log('🚀 마이그레이션 시작...');

  // 1. 파트너 주입
  console.log('📦 파트너 데이터 주입 중...');
  for (const name of partners) {
    const { data: existing } = await supabase.from('partners').select('id').eq('name', name).single();
    if (!existing) {
      await supabase.from('partners').insert([{ name, documents: [] }]);
    }
  }

  // 2. 사업(프로젝트) 주입
  console.log('📂 사업 데이터 주입 중...');
  for (const proj of projects) {
    const { data: partner } = proj.partner ? await supabase.from('partners').select('id').eq('name', proj.partner).single() : { data: null };
    
    const { data: existing } = await supabase.from('projects').select('id').eq('name', proj.name).eq('level', proj.level).single();
    if (!existing) {
      await supabase.from('projects').insert([{
        name: proj.name,
        level: proj.level,
        partner_id: partner ? partner.id : null,
        quota: 100,
        participant_count: 0
      }]);
    }
  }

  console.log('✅ 마이그레이션 완료!');
}

migrate().catch(console.error);
