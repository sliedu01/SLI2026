-- 1. partner-documents 버킷 생성 (이미 존재하면 무시)
-- 주의: Supabase 대시보드(Storage)에서 직접 생성하는 것이 가장 확실합니다.
-- 'public' 옵션을 true로 설정하여 공용 접근을 허용합니다.

INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-documents', 'partner-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. 스토리지 정책(Policy) 설정
-- 모든 사용자가 파일을 읽을 수 있도록 허용 (SELECT)
CREATE POLICY "Anyone can view partner documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'partner-documents' );

-- 인증된 사용자(또는 익명 포함 전체)가 파일을 업로드할 수 있도록 허용 (INSERT)
-- 실제 운영 환경에서는 'authenticated' 사용자로 제한하는 것이 좋으나, 
-- 현재 프로젝트 설정에 맞춰 전체 허용으로 설정합니다.
CREATE POLICY "Anyone can upload partner documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'partner-documents' );

-- 파일 업데이트 및 삭제 권한 (필요시)
CREATE POLICY "Anyone can update partner documents"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'partner-documents' );

CREATE POLICY "Anyone can delete partner documents"
ON storage.objects FOR DELETE
USING ( bucket_id = 'partner-documents' );
