'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { type ActionType, type ModuleKey } from '@/lib/rbac';

interface PermissionGateProps {
  /** 필요한 행위 권한 (지정 시 해당 행위를 수행할 수 있을 때만 렌더링) */
  action?: ActionType;
  /** 필요한 모듈 접근 권한 */
  module?: ModuleKey;
  /** 관리자(admin) 전용 여부 */
  adminOnly?: boolean;
  /** 관리자+운영자(admin/manager) 전용 여부 */
  managerOnly?: boolean;
  /** 권한이 없을 때 대체 렌더링 (기본: 아무것도 안 보임) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate: 권한 기반 조건부 렌더링 컴포넌트
 * 
 * 사용법:
 *   <PermissionGate action="delete">
 *     <Button>삭제</Button>
 *   </PermissionGate>
 * 
 *   <PermissionGate adminOnly>
 *     <AdminPanel />
 *   </PermissionGate>
 */
export function PermissionGate({
  action,
  module,
  adminOnly = false,
  managerOnly = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { user, canPerform, hasModuleAccess } = useAuthStore();

  if (!user) return <>{fallback}</>;

  // Admin 전용
  if (adminOnly && user.role !== 'admin') return <>{fallback}</>;

  // Manager 이상 전용
  if (managerOnly && user.role !== 'admin' && user.role !== 'manager') return <>{fallback}</>;

  // 모듈 접근 체크
  if (module && !hasModuleAccess(module)) return <>{fallback}</>;

  // 행위 권한 체크
  if (action && !canPerform(action)) return <>{fallback}</>;

  return <>{children}</>;
}
