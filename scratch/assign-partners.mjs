import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const mapping = [
  { partnerId: 'af91be01-25eb-4490-84d5-85fed5ea138b', projectId: 'd2d1fb45-3fe7-4269-a793-5dc697c517e8', partnerName: '서울시립미술관', projectName: '01. 진로캠퍼스' },
  { partnerId: '955b55e2-c32c-4f86-b964-765dc81615e7', projectId: '9f13937d-578a-42e8-99cd-ce2b1cb8773b', partnerName: '타임리', projectName: '02. STEM프리스쿨' },
  { partnerId: '65072af3-0a02-441b-b775-fc9e0ed49859', projectId: '20fc2520-c82c-4a8c-899c-dc0da6856bb7', partnerName: '(주)퓨쳐플랜', projectName: '03. 조금느린아이' },
  { partnerId: '5c32eb76-a027-4ef4-b96e-1abe9223bcd4', projectId: '231da7d6-c0dd-41af-a90d-ba24b9b2b2ee', partnerName: '서울마인드브릿지심리상담센터', projectName: '04. 생성형 AI 서비스 도입·제공' },
  { partnerId: '91495a81-a76d-47a5-afbb-85c222a92f23', projectId: 'f79cc333-d520-4ff2-883b-a4f72056d12c', partnerName: '고려대학교산학협력단', projectName: '05. 진로·진학 AI코칭' },
  { partnerId: '67cecbd3-3c71-4e66-8a65-e5ddde7fcd33', projectId: '7466f42a-ece9-41d1-874b-a57ecb992a27', partnerName: '시립화곡청소년센터', projectName: '06. AI핵심 인재 양성' },
];

async function updateData() {
  for (const item of mapping) {
    console.log(`Assigning ${item.partnerName} to ${item.projectName}...`);
    const { error } = await supabase
      .from('projects')
      .update({ partner_id: item.partnerId })
      .eq('id', item.projectId);
    
    if (error) {
      console.error(`Error updating ${item.projectName}:`, error);
    } else {
      console.log(`Successfully updated ${item.projectName}`);
    }
  }
}

updateData();
