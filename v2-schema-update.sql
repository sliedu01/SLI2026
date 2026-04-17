-- 프로젝트 다차시(Sessions) 정보를 저장할 컬럼 추가
ALTER TABLE projects ADD COLUMN sessions JSONB DEFAULT '[]'::jsonb;

-- 기존 데이터가 있을 경우 빈 배열로 초기화 (기본값이 설정되지만 명시적으로 수행)
UPDATE projects SET sessions = '[]'::jsonb WHERE sessions IS NULL;
