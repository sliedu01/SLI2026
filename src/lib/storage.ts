import { supabase } from './supabase';

/**
 * Supabase Storage 파일 업로드 유틸리티
 */
export async function uploadFileToStorage(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true // 동일한 경로의 파일이 있으면 덮어쓰기 (최신 상태 유지)
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`파일 업로드 실패: ${error.message}`);
  }

  // 업로드 성공 후 공용 URL 가져오기
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * 파일 경로 생성을 위한 헬퍼 (특수문자 제거 및 타임스탬프 추가)
 */
export function generateStoragePath(folder: string, filename: string): string {
  const timestamp = Date.now();
  const cleanName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  return `${folder}/${timestamp}_${cleanName}`;
}
