-- 설문 템플릿 테이블 생성
CREATE TABLE IF NOT EXISTS survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('COMPETENCY', 'SATISFACTION')),
  questions JSONB NOT NULL DEFAULT '[]', -- [{id, division, theme, content, type, order}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 surveys 테이블을 기존 UI 규격에 맞춰 확장/수정
-- (주의: 기존 데이터가 있다면 컬럼명이 달라질 수 있으므로 초기화 후 다시 생성하는 것을 권장)
DROP TABLE IF EXISTS surveys CASCADE;

CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES survey_templates(id) ON DELETE CASCADE,
  respondent_id TEXT NOT NULL, -- userId 대신 respondent_id 사용 (기존 UI 규격)
  answers JSONB NOT NULL DEFAULT '[]', -- [{questionId, preScore, score}]
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE survey_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE surveys;

-- RLS 비활성화
ALTER TABLE survey_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
