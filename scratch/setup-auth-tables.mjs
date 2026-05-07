// Supabase RBAC 테이블 생성 스크립트
// 실행: node scratch/setup-auth-tables.mjs

const SUPABASE_URL = 'https://fwyuyzfysoepeqgnzuhd.supabase.co';
// Supabase 서비스 역할 키가 필요합니다. .env.local의 anon key로는 DDL 실행이 제한됩니다.
// 대신 Supabase REST API의 SQL 실행 엔드포인트를 사용합니다.

async function runSQL(sql, description) {
  console.log(`\n▶ ${description}...`);
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_UFhyZp1DFPErNvD7bfRk1g_v1VZyziJ'}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log(`  ⚠ REST API 실패 (${response.status}): ${text}`);
    return false;
  }
  
  console.log(`  ✓ 성공`);
  return true;
}

async function main() {
  console.log('=== Supabase RBAC 테이블 생성 시작 ===\n');
  
  // Method: Supabase Management API를 통한 SQL 실행
  // 이 방법은 service_role 키가 필요하므로, 불가능하면 대시보드에서 실행해야 합니다.
  
  const sqls = [
    {
      desc: 'user_permissions 테이블 생성',
      sql: `CREATE TABLE IF NOT EXISTS public.user_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
        allowed_project_ids TEXT[] DEFAULT '{}',
        can_access_projects BOOLEAN DEFAULT false,
        can_access_partners BOOLEAN DEFAULT false,
        can_access_surveys BOOLEAN DEFAULT false,
        can_access_meetings BOOLEAN DEFAULT false,
        can_access_calendar BOOLEAN DEFAULT false,
        can_access_budget BOOLEAN DEFAULT false,
        can_create BOOLEAN DEFAULT false,
        can_update BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        can_approve BOOLEAN DEFAULT false,
        budget_access_level TEXT DEFAULT 'business_only' CHECK (budget_access_level IN ('full', 'business_only')),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id)
      )`
    },
    {
      desc: 'audit_logs 테이블 생성',
      sql: `CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.user_profiles(id),
        action TEXT NOT NULL,
        target_table TEXT,
        target_id TEXT,
        details JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )`
    },
    {
      desc: 'handle_new_user 트리거 함수 생성',
      sql: `CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO public.user_profiles (id, login_id, name, phone, organization, email, role)
          VALUES (
              NEW.id,
              COALESCE(NEW.raw_user_meta_data->>'login_id', split_part(NEW.email, '@', 1)),
              COALESCE(NEW.raw_user_meta_data->>'name', 'unassigned'),
              COALESCE(NEW.raw_user_meta_data->>'phone', ''),
              COALESCE(NEW.raw_user_meta_data->>'organization', ''),
              NEW.email,
              'viewer'
          );
          INSERT INTO public.user_permissions (user_id)
          VALUES (NEW.id);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER`
    },
    {
      desc: 'on_auth_user_created 트리거 생성',
      sql: `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`
    },
  ];
  
  for (const { desc, sql } of sqls) {
    await runSQL(sql, desc);
  }
  
  console.log('\n=== 완료 ===');
}

main().catch(console.error);
