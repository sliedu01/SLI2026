-- 기존 단순화된 테이블 삭제 (계층형으로 재구축)
DROP TABLE IF EXISTS budgets CASCADE;

-- 1. 예산 비목 테이블 (LV1: Categories)
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- LV2 프로젝트와 연결 가능
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 예산 관리세목 테이블 (LV2: Managements)
CREATE TABLE IF NOT EXISTS budget_managements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 예산 세세목 테이블 (LV3: Executions)
CREATE TABLE IF NOT EXISTS budget_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_id UUID REFERENCES budget_managements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_amount BIGINT DEFAULT 0,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- 개별 프로젝트 연동
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 실제 지출 내역 테이블 (LV4: Expenditures)
CREATE TABLE IF NOT EXISTS expenditures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES budget_executions(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount BIGINT DEFAULT 0,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  vendor_name TEXT,
  description TEXT,
  attachment JSONB DEFAULT NULL, -- {originalName, fileName, fileUrl}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE budget_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE budget_managements;
ALTER PUBLICATION supabase_realtime ADD TABLE budget_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE expenditures;

-- RLS 비활성화 (공개 모드)
ALTER TABLE budget_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_managements DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenditures DISABLE ROW LEVEL SECURITY;
