'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import {
  type UserProfile,
  type UserPermission,
  type UserRole,
  type ModuleKey,
  type ActionType,
  type BudgetAccessLevel,
  hasModuleAccess as checkModuleAccess,
  hasProjectAccess as checkProjectAccess,
  canPerformAction,
  getBudgetAccessLevel as computeBudgetAccess,
} from '@/lib/rbac';

// ============================================================
// 회원가입 페이로드 타입
// ============================================================

export interface SignUpPayload {
  loginId: string;
  password: string;
  name: string;
  phone?: string;
  organization?: string;
  email: string;
}

// ============================================================
// 스토어 인터페이스
// ============================================================

interface AuthState {
  // State
  user: UserProfile | null;
  permissions: UserPermission | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Auth Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'phone' | 'organization'>>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;

  // Profile / Permission Fetch
  fetchProfile: () => Promise<void>;
  fetchPermissions: () => Promise<void>;

  // Permission Checks (convenience)
  hasModuleAccess: (module: ModuleKey) => boolean;
  hasProjectAccess: (projectId: string) => boolean;
  canPerform: (action: ActionType) => boolean;
  getBudgetAccessLevel: () => BudgetAccessLevel;
  isAdmin: () => boolean;

  // Admin Actions
  fetchAllUsers: () => Promise<(UserProfile & { permission?: UserPermission })[]>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUserPermissions: (userId: string, perms: Partial<UserPermission>) => Promise<void>;
  toggleUserActive: (userId: string, isActive: boolean) => Promise<void>;
}

// ============================================================
// DB row → 프론트엔드 모델 매핑 헬퍼
// ============================================================

function mapProfile(row: Record<string, unknown> | null): UserProfile | null {
  if (!row) return null;
  return {
    id: row.id as string,
    loginId: row.login_id as string,
    name: row.name as string,
    phone: (row.phone as string) || '',
    organization: (row.organization as string) || '',
    email: row.email as string,
    role: row.role as UserRole,
    isActive: row.is_active as boolean,
    lastLoginAt: row.last_login_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPermission(row: Record<string, unknown> | null): UserPermission {
  if (!row) {
    return {
      id: '',
      userId: '',
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
    };
  }
  return {
    id: row.id as string,
    userId: row.user_id as string,
    allowedProjectIds: (row.allowed_project_ids as string[]) || [],
    canAccessProjects: row.can_access_projects as boolean,
    canAccessPartners: row.can_access_partners as boolean,
    canAccessSurveys: row.can_access_surveys as boolean,
    canAccessMeetings: row.can_access_meetings as boolean,
    canAccessCalendar: row.can_access_calendar as boolean,
    canAccessBudget: row.can_access_budget as boolean,
    canCreate: row.can_create as boolean,
    canUpdate: row.can_update as boolean,
    canDelete: row.can_delete as boolean,
    canApprove: row.can_approve as boolean,
    budgetAccessLevel: (row.budget_access_level as BudgetAccessLevel) || 'business_only',
  };
}

// ============================================================
// 스토어 구현
// ============================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,

      // ─────────────────────────────────────────────
      // 초기화: 세션 복원 및 프로필 로드
      // ─────────────────────────────────────────────
      initialize: async () => {
        try {
          set({ isLoading: true });
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            await get().fetchProfile();
            await get().fetchPermissions();
            set({ isAuthenticated: true });
          } else {
            set({ user: null, permissions: null, isAuthenticated: false });
          }
        } catch (err) {
          console.error('Auth initialization failed:', err);
          set({ user: null, permissions: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      // ─────────────────────────────────────────────
      // 로그인
      // ─────────────────────────────────────────────
      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw new Error(error.message);

          await get().fetchProfile();
          await get().fetchPermissions();

          // 활성화 체크
          const user = get().user;
          if (user && !user.isActive) {
            await supabase.auth.signOut();
            set({ user: null, permissions: null, isAuthenticated: false });
            throw new Error('계정이 비활성화 상태입니다. 관리자에게 문의하세요.');
          }

          // 최근 로그인 시각 업데이트
          if (user) {
            await supabase
              .from('user_profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', user.id);
          }

          set({ isAuthenticated: true });
        } catch (err) {
          set({ user: null, permissions: null, isAuthenticated: false });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // ─────────────────────────────────────────────
      // 회원가입
      // ─────────────────────────────────────────────
      signUp: async (data) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                login_id: data.loginId,
                name: data.name,
                phone: data.phone || '',
                organization: data.organization || '',
              },
            },
          });

          if (error) throw new Error(error.message);
          // 가입 후 자동 프로필 생성은 DB 트리거에서 처리
        } catch (err) {
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // ─────────────────────────────────────────────
      // 로그아웃
      // ─────────────────────────────────────────────
      signOut: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          permissions: null,
          isAuthenticated: false,
        });
      },

      // ─────────────────────────────────────────────
      // 비밀번호 초기화 (이메일 발송)
      // ─────────────────────────────────────────────
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw new Error(error.message);
      },

      // ─────────────────────────────────────────────
      // 본인 프로필 수정
      // ─────────────────────────────────────────────
      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
          .from('user_profiles')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
        await get().fetchProfile();
      },

      // ─────────────────────────────────────────────
      // 비밀번호 변경
      // ─────────────────────────────────────────────
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({
          password: password
        });
        if (error) throw error;
      },

      // ─────────────────────────────────────────────
      // 프로필 / 권한 데이터 로드
      // ─────────────────────────────────────────────
      fetchProfile: async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error('Failed to fetch profile:', error);
          return;
        }

        set({ user: mapProfile(data) });
      },

      fetchPermissions: async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data, error } = await supabase
          .from('user_permissions')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (error) {
          console.error('Failed to fetch permissions:', error);
          return;
        }

        set({ permissions: mapPermission(data) });
      },

      // ─────────────────────────────────────────────
      // 편의 권한 체크 메서드
      // ─────────────────────────────────────────────
      hasModuleAccess: (module) => {
        const { user, permissions } = get();
        if (!user) return false;
        return checkModuleAccess(user.role, permissions, module);
      },

      hasProjectAccess: (projectId) => {
        const { user, permissions } = get();
        if (!user) return false;
        return checkProjectAccess(user.role, permissions, projectId);
      },

      canPerform: (action) => {
        const { user, permissions } = get();
        if (!user) return false;
        return canPerformAction(user.role, permissions, action);
      },

      getBudgetAccessLevel: () => {
        const { user, permissions } = get();
        if (!user) return 'business_only';
        return computeBudgetAccess(user.role, permissions);
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      // ─────────────────────────────────────────────
      // 관리자 전용: 전체 사용자 조회
      // ─────────────────────────────────────────────
      fetchAllUsers: async () => {
        const { data: profiles, error: pErr } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: true });

        if (pErr) throw pErr;

        const { data: perms, error: permErr } = await supabase
          .from('user_permissions')
          .select('*');

        if (permErr) throw permErr;

        const permMap = new Map<string, UserPermission>();
        (perms || []).forEach((p: Record<string, unknown>) => {
          const mapped = mapPermission(p);
          permMap.set(mapped.userId, mapped);
        });

        const result: (UserProfile & { permission?: UserPermission })[] = [];
        (profiles || []).forEach((p: Record<string, unknown>) => {
          const profile = mapProfile(p);
          if (profile) {
            result.push({
              ...profile,
              permission: permMap.get(p.id as string),
            });
          }
        });
        return result;
      },

      // ─────────────────────────────────────────────
      // 관리자 전용: 등급 변경
      // ─────────────────────────────────────────────
      updateUserRole: async (userId, role) => {
        const { error } = await supabase
          .from('user_profiles')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;
      },

      // ─────────────────────────────────────────────
      // 관리자 전용: 권한 업데이트
      // ─────────────────────────────────────────────
      updateUserPermissions: async (userId, perms) => {
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (perms.allowedProjectIds !== undefined)
          updateData.allowed_project_ids = perms.allowedProjectIds;
        if (perms.canAccessProjects !== undefined)
          updateData.can_access_projects = perms.canAccessProjects;
        if (perms.canAccessPartners !== undefined)
          updateData.can_access_partners = perms.canAccessPartners;
        if (perms.canAccessSurveys !== undefined)
          updateData.can_access_surveys = perms.canAccessSurveys;
        if (perms.canAccessMeetings !== undefined)
          updateData.can_access_meetings = perms.canAccessMeetings;
        if (perms.canAccessCalendar !== undefined)
          updateData.can_access_calendar = perms.canAccessCalendar;
        if (perms.canAccessBudget !== undefined)
          updateData.can_access_budget = perms.canAccessBudget;
        if (perms.canCreate !== undefined) updateData.can_create = perms.canCreate;
        if (perms.canUpdate !== undefined) updateData.can_update = perms.canUpdate;
        if (perms.canDelete !== undefined) updateData.can_delete = perms.canDelete;
        if (perms.canApprove !== undefined) updateData.can_approve = perms.canApprove;
        if (perms.budgetAccessLevel !== undefined)
          updateData.budget_access_level = perms.budgetAccessLevel;

        const { error } = await supabase
          .from('user_permissions')
          .update(updateData)
          .eq('user_id', userId);

        if (error) throw error;
      },

      // ─────────────────────────────────────────────
      // 관리자 전용: 계정 활성/비활성 토글
      // ─────────────────────────────────────────────
      toggleUserActive: async (userId, isActive) => {
        const { error } = await supabase
          .from('user_profiles')
          .update({ is_active: isActive, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
