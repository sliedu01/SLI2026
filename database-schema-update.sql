-- ==========================================
-- Seoul 2026 Database Schema Complete Update
-- ==========================================

-- 1. 시스템 설정 테이블 (Settings)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 협력업체 테이블 (Partners) - 기존 테이블 유지 및 필드 확인
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manager TEXT,
  phone1 TEXT,
  phone2 TEXT,
  email TEXT,
  address TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 사업 관리 테이블 (Projects)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  start_time TEXT,
  end_time TEXT,
  description TEXT,
  parent_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  quota INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 설문 템플릿 테이블 (Survey Templates)
CREATE TABLE IF NOT EXISTS survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT, -- 'COMPETENCY', 'SATISFACTION'
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 설문 응답 테이블 (Surveys / Responses)
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES survey_templates(id) ON DELETE SET NULL,
  respondent_id TEXT,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 예산 카테고리 (Budget Categories)
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 예산 관리 항목 (Budget Managements)
CREATE TABLE IF NOT EXISTS budget_managements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 예산 집행 항목 (Budget Executions)
CREATE TABLE IF NOT EXISTS budget_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID REFERENCES budget_managements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_amount NUMERIC DEFAULT 0,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 지출 내역 (Expenditures)
CREATE TABLE IF NOT EXISTS expenditures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES budget_executions(id) ON DELETE CASCADE,
  date TEXT,
  amount NUMERIC DEFAULT 0,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  vendor_name TEXT,
  description TEXT,
  attachment JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 실시간 동기화(Realtime) 설정
-- ==========================================
BEGIN;
  -- 기존 출판물이 있으면 삭제 후 재생성 (필요 시)
  -- DROP PUBLICATION IF EXISTS supabase_realtime;
  -- CREATE PUBLICATION supabase_realtime;
  
  ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE partners;
  ALTER PUBLICATION supabase_realtime ADD TABLE projects;
  ALTER PUBLICATION supabase_realtime ADD TABLE survey_templates;
  ALTER PUBLICATION supabase_realtime ADD TABLE surveys;
  ALTER PUBLICATION supabase_realtime ADD TABLE budget_categories;
  ALTER PUBLICATION supabase_realtime ADD TABLE budget_managements;
  ALTER PUBLICATION supabase_realtime ADD TABLE budget_executions;
  ALTER PUBLICATION supabase_realtime ADD TABLE expenditures;
COMMIT;

-- ==========================================
-- RLS 비활성화 (보안 정책 일괄 해제 - 필요시 나중에 설정)
-- ==========================================
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_managements DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenditures DISABLE ROW LEVEL SECURITY;
