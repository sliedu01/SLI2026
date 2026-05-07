'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { PUBLIC_ROUTES, ADMIN_ROUTES, ROUTE_MODULE_MAP } from '@/lib/rbac';

/**
 * AuthGuard: 인증 및 권한 기반 라우트 보호 컴포넌트
 * - 미인증 → /auth/login 리디렉트
 * - 관리자 전용 경로 → admin 아닌 경우 차단
 * - 모듈별 접근 권한 체크
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized, isLoading, user, initialize, hasModuleAccess } = useAuthStore();

  const [accessDenied, setAccessDenied] = React.useState(false);

  // 앱 시작 시 세션 복원
  React.useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // 인증 상태 변화에 따른 리디렉트
  React.useEffect(() => {
    if (!isInitialized || isLoading) return;

    // 공개 경로는 체크 불필요
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) return;

    // 미인증 → 로그인 페이지
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    // 관리자 전용 경로 체크
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (user?.role !== 'admin') {
        setAccessDenied(true);
        return;
      }
    }

    // 모듈별 접근 권한 체크
    const matchedModule = Object.entries(ROUTE_MODULE_MAP).find(
      ([route]) => pathname.startsWith(route)
    );
    if (matchedModule) {
      const [, moduleKey] = matchedModule;
      if (!hasModuleAccess(moduleKey)) {
        setAccessDenied(true);
        return;
      }
    }

    setAccessDenied(false);
  }, [isInitialized, isLoading, isAuthenticated, pathname, user, router, hasModuleAccess]);

  // 초기화 중 로딩
  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="size-10 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">인증 확인 중...</p>
      </div>
    );
  }

  // 공개 경로는 그대로 렌더링
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  // 접근 거부 화면
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in duration-500">
        <div className="p-4 bg-red-50 rounded-2xl">
          <ShieldAlert className="size-12 text-red-400" />
        </div>
        <h2 className="text-xl font-black text-slate-900">접근 권한 없음</h2>
        <p className="text-sm text-slate-500 font-medium text-center max-w-sm">
          이 페이지에 접근할 수 있는 권한이 없습니다.<br />
          관리자에게 문의하거나 대시보드로 돌아가세요.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
        >
          대시보드로 이동
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
