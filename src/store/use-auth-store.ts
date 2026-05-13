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
  ROLE_PRESETS,
} from '@/lib/rbac';

// ============================================================
// 회원가입 페이로드 정의
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
// DB row -> 프론트엔드 모델 매핑 헬퍼
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

function mapPermission(row: Record<string, unknown> | null, role?: UserRole): UserPermission {
  const activeRole = (role?.toLowerCase() as UserRole) || 'viewer';
  const preset = ROLE_PRESETS[activeRole] || ROLE_PRESETS.viewer;

  if (!row) {
    return {
      id: '',
      userId: '',
      allowedProjectIds: preset.allowedProjectIds,
      canAccessProjects: preset.canAccessProjects,
      canAccessPartners: preset.canAccessPartners,
      canAccessSurveys: preset.canAccessSurveys,
      canAccessMeetings: preset.canAccessMeetings,
      canAccessCalendar: preset.canAccessCalendar,
      canAccessBudget: preset.canAccessBudget,
      canCreate: preset.canCreate,
      canUpdate: preset.canUpdate,
      canDelete: preset.canDelete,
      canApprove: preset.canApprove,
      budgetAccessLevel: preset.budgetAccessLevel,
    };
  }

  return {
    id: row.id as string,
    userId: row.user_id as string,
    allowedProjectIds: (row.allowed_project_ids as string[]) || [],
    canAccessProjects: !!row.can_access_projects,
    canAccessPartners: !!row.can_access_partners,
    canAccessSurveys: !!row.can_access_surveys,
    canAccessMeetings: !!row.can_access_meetings,
    canAccessCalendar: !!row.can_access_calendar,
    canAccessBudget: !!row.can_access_budget,
    canCreate: !!row.can_create,
    canUpdate: !!row.can_update,
    canDelete: !!row.can_delete,
    canApprove: !!row.can_approve,
    budgetAccessLevel: (row.budget_access_level as BudgetAccessLevel) || preset.budgetAccessLevel,
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

      signIn: async (email, password) => {
        set({ isLoading: true });
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          await get().initialize();
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (payload) => {
        set({ isLoading: true });
        try {
          const { data, error: authError } = await supabase.auth.signUp({
            email: payload.email,
            password: payload.password,
          });

          if (authError) throw authError;
          if (!data.user) throw new Error('User creation failed');

          const { error: profileError } = await supabase.from('user_profiles').insert({
            id: data.user.id,
            login_id: payload.loginId,
            name: payload.name,
            phone: payload.phone,
            organization: payload.organization,
            email: payload.email,
            role: 'viewer', // 기본값
          });

          if (profileError) throw profileError;
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, permissions: null, isAuthenticated: false });
      },

      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      },

      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
          .from('user_profiles')
          .update({
            name: data.name,
            phone: data.phone,
            organization: data.organization,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
        await get().fetchProfile();
      },

      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({
          password: password,
        });
        if (error) throw error;
      },

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
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to fetch permissions:', error);
        }

        const { user } = get();
        set({ permissions: mapPermission(data, user?.role) });
      },

      hasModuleAccess: (module) => {
        const { user, permissions } = get();
        if (!user) return false;
        // admin인 경우 항상 true 반환 (최종 방어)
        if (user.role === 'admin') return true;
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
        if (user.role === 'admin') return true;
        return canPerformAction(user.role, permissions, action);
      },

      getBudgetAccessLevel: () => {
        const { user, permissions } = get();
        if (!user) return 'business_only';
        if (user.role === 'admin') return 'full';
        return computeBudgetAccess(user.role, permissions);
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

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
              permission: permMap.get(profile.id),
            });
          }
        });
        return result;
      },

      updateUserRole: async (userId, role) => {
        const { error } = await supabase
          .from('user_profiles')
          .update({ role, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;
      },

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
        if (perms.budgetAccessLevel !== undefined) updateData.budget_access_level = perms.budgetAccessLevel;
        
        const { data: existing } = await supabase
          .from('user_permissions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('user_permissions')
            .update(updateData)
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_permissions')
            .insert({ user_id: userId, ...updateData });
          if (error) throw error;
        }
      },

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
