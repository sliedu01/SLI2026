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

  return publicUrl || '';
}

/**
 * 저장소 경로를 기반으로 공용 URL을 가져오거나 재생성합니다.
 */
export function getPublicUrlFromPath(bucket: string, path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return publicUrl || '';
}

export function generateStoragePath(folder: string, filename: string): string {
  // 1. 확장자 분리 및 정제
  const lastDotIndex = filename.lastIndexOf('.');
  const ext = lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : '';
  
  // 2. 고유 ID 생성 (타임스탬프 + 난수)
  // 한글 파일명은 Supabase Storage에서 'Invalid key' 에러를 유발할 수 있으므로
  // 실제 저장소 경로는 영문/숫자 조합의 고유 ID를 사용합니다.
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  const uniqueId = `${timestamp}_${randomStr}`;
  
  return `${folder}/${uniqueId}${ext ? '.' + ext : ''}`;
}

/**
 * 스토리지에서 파일 삭제
 */
export async function deleteFileFromStorage(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error('Storage delete error:', error);
    throw error;
  }
}

/**
 * 스토리지 내 파일 이동 (Rename)
 */
export async function moveFileInStorage(bucket: string, fromPath: string, toPath: string): Promise<string> {
  const { error } = await supabase.storage.from(bucket).copy(fromPath, toPath);
  if (error) {
    console.error('Storage copy error:', error);
    throw error;
  }
  
  // 성공적으로 복사된 경우 원본 삭제
  await deleteFileFromStorage(bucket, fromPath);
  
  // 이동된 파일의 공용 URL 반환
  return getPublicUrlFromPath(bucket, toPath);
}
