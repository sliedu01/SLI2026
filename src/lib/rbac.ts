/**
 * RBAC(Role-Based Access Control) 유틸리티
 * 등급별 권한 체크, 예산 마스킹, 기본 권한 프리셋
 */

// ============================================================
// 타입 정의
// ============================================================

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

export type ModuleKey = 'projects' | 'partners' | 'surveys' | 'meetings' | 'calendar' | 'budget';

export type ActionType = 'read' | 'create' | 'update' | 'delete' | 'approve';

export type BudgetAccessLevel = 'full' | 'business_only';

export interface UserProfile {
  id: string;
  loginId: string;
  name: string;
  phone: string;
  organization: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  id: string;
  userId: string;
  allowedProjectIds: string[];
  canAccessProjects: boolean;
  canAccessPartners: boolean;
  canAccessSurveys: boolean;
  canAccessMeetings: boolean;
  canAccessCalendar: boolean;
  canAccessBudget: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  budgetAccessLevel: BudgetAccessLevel;
}

// ============================================================
// 라우트 → 모듈 매핑
// ============================================================

export const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  '/projects': 'projects',
  '/partners': 'partners',
  '/surveys': 'surveys',
  '/meetings': 'meetings',
  '/calendar': 'calendar',
  '/budget': 'budget',
};

// 관리자 전용 경로
export const ADMIN_ROUTES = ['/admin', '/admin/users'];

// 인증 불필요 경로
export const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/reset-password'];

// ============================================================
// 등급별 기본 권한 프리셋
// ============================================================

export const ROLE_PRESETS: Record<UserRole, Omit<UserPermission, 'id' | 'userId'>> = {
  admin: {
    allowedProjectIds: ['*'],
    canAccessProjects: true,
    canAccessPartners: true,
    canAccessSurveys: true,
    canAccessMeetings: true,
    canAccessCalendar: true,
    canAccessBudget: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canApprove: true,
    budgetAccessLevel: 'full',
  },
  manager: {
    allowedProjectIds: [],
    canAccessProjects: true,
    canAccessPartners: true,
    canAccessSurveys: true,
    canAccessMeetings: true,
    canAccessCalendar: true,
    canAccessBudget: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canApprove: true,
    budgetAccessLevel: 'full',
  },
  user: {
    allowedProjectIds: [],
    canAccessProjects: true,
    canAccessPartners: true,
    canAccessSurveys: true,
    canAccessMeetings: true,
    canAccessCalendar: true,
    canAccessBudget: false,
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canApprove: false,
    budgetAccessLevel: 'business_only',
  },
  viewer: {
    allowedProjectIds: [],
    canAccessProjects: true,
    canAccessPartners: true,
    canAccessSurveys: false,
    canAccessMeetings: false,
    canAccessCalendar: true,
    canAccessBudget: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canApprove: false,
    budgetAccessLevel: 'business_only',
  },
};

// ============================================================
// 권한 체크 함수
// ============================================================

/**
 * 특정 모듈에 대한 접근 권한 체크
 */
export function hasModuleAccess(
  role: UserRole,
  permissions: UserPermission | null,
  module: ModuleKey
): boolean {
  if (role === 'admin') return true;
  if (!permissions) return false;

  // 1. 프리셋에서 기본적으로 허용되지 않는 모듈인지 확인 (안전장치)
  // 프리셋에 명시적으로 false로 되어 있는 경우, permissions가 true여도 차단 (관찰자 등 특수 등급 보호)
  const preset = ROLE_PRESETS[role];
  const moduleAccessMap: Record<ModuleKey, keyof UserPermission> = {
    projects: 'canAccessProjects',
    partners: 'canAccessPartners',
    surveys: 'canAccessSurveys',
    meetings: 'canAccessMeetings',
    calendar: 'canAccessCalendar',
    budget: 'canAccessBudget',
  };

  const permissionKey = moduleAccessMap[module];
  
  // 프리셋이 있고, 프리셋에서 해당 모듈이 false인 경우 (관찰자의 설문/회의/예산 등)
  // 단, 관찰자에게 명시적으로 권한을 준 경우를 허용하려면 이 로직을 조정해야 함.
  // 여기서는 사용자의 요청에 따라 '관찰자'는 프리셋을 강제함.
  if (role === 'viewer' && !(preset[permissionKey] as boolean)) {
    return false;
  }

  return permissions[permissionKey] as boolean;
}

/**
 * 특정 프로젝트에 대한 접근 권한 체크
 */
/**
 * 특정 프로젝트에 대한 접근 권한이 있는지 확인 (재귀적)
 * 1. Admin은 모든 프로젝트 접근 가능
 * 2. '*' 권한이 있으면 모든 프로젝트 접근 가능
 * 3. 직접 ID가 포함되어 있으면 접근 가능
 * 4. 상위 프로젝트 ID가 권한에 포함되어 있으면 하위 프로젝트도 접근 가능 (상속)
 */
export function hasProjectAccess(
  role: UserRole,
  permissions: UserPermission | null,
  projectId: string,
  allProjects: { id: string, parentId: string | null }[] = []
): boolean {
  if (role === 'admin') return true;
  if (!permissions) return false;
  if (permissions.allowedProjectIds.includes('*')) return true;
  
  // 1. 직접 포함 여부 확인
  if (permissions.allowedProjectIds.includes(projectId)) return true;

  // 2. 상위 프로젝트 중 하나라도 권한이 있는지 확인 (상향식 재귀)
  let current = allProjects.find(p => p.id === projectId);
  const visited = new Set<string>();
  while (current && current.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    if (permissions.allowedProjectIds.includes(current.parentId)) return true;
    current = allProjects.find(p => p.id === current!.parentId);
  }

  return false;
}

/**
 * 사용자가 접근 가능한 모든 프로젝트 ID 목록 반환
 */
export function getVisibleProjectIds(
  role: UserRole,
  permissions: UserPermission | null,
  allProjects: { id: string, parentId: string | null, level: number }[]
): string[] {
  if (role === 'admin' || (permissions && permissions.allowedProjectIds.includes('*'))) {
    return allProjects.map(p => p.id);
  }
  
  if (!permissions) return [];

  // 본인 및 모든 하위 프로젝트 포함
  return allProjects
    .filter(p => hasProjectAccess(role, permissions, p.id, allProjects))
    .map(p => p.id);
}

/**
 * 특정 행위(CRUD) 수행 가능 여부 체크
 */
export function canPerformAction(
  role: UserRole,
  permissions: UserPermission | null,
  action: ActionType
): boolean {
  if (role === 'admin') return true;
  if (!permissions) return false;

  switch (action) {
    case 'read':
      return true; // 모든 인증 사용자 읽기 가능
    case 'create':
      return permissions.canCreate;
    case 'update':
      return permissions.canUpdate;
    case 'delete':
      return permissions.canDelete;
    case 'approve':
      return permissions.canApprove;
    default:
      return false;
  }
}

/**
 * 통합 권한 체크 (모듈 + 행위 + 프로젝트 범위)
 */
export function checkFullAccess(
  role: UserRole,
  permissions: UserPermission | null,
  module: ModuleKey,
  action: ActionType,
  projectId?: string
): boolean {
  if (role === 'admin') return true;
  if (!permissions) return false;

  // 1. 모듈 접근 체크
  if (!hasModuleAccess(role, permissions, module)) return false;

  // 2. 행위 권한 체크
  if (!canPerformAction(role, permissions, action)) return false;

  // 3. 프로젝트 범위 체크 (지정된 경우)
  if (projectId && !hasProjectAccess(role, permissions, projectId)) return false;

  return true;
}

/**
 * 예산 접근 수준 반환
 */
export function getBudgetAccessLevel(
  role: UserRole,
  permissions: UserPermission | null
): BudgetAccessLevel {
  if (role === 'admin' || role === 'manager') return 'full';
  return permissions?.budgetAccessLevel || 'business_only';
}

/**
 * 사용자 등급 한글 라벨
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  manager: '운영자',
  user: '사용자',
  viewer: '관찰자',
};

/**
 * 사용자 등급 색상 매핑
 */
export const ROLE_COLORS: Record<UserRole, { bg: string; text: string; border: string }> = {
  admin: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  manager: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  user: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  viewer: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
};

/**
 * 비밀번호 강도 체크
 */
export function getPasswordStrength(password: string): {
  score: number;   // 0~4
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  score = Math.min(score, 4);

  const labels = ['매우 약함', '약함', '보통', '강함', '매우 강함'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];

  return { score, label: labels[score], color: colors[score] };
}
