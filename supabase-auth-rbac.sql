-- ============================================================
-- SLI 2026 RBAC 사용자 인증 시스템 마이그레이션
-- Supabase Auth와 연동되는 사용자 프로필, 권한, 감사 로그 테이블
-- ============================================================

-- 1) 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    login_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '미지정',
    phone TEXT DEFAULT '',
    organization TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) 세부 권한 테이블
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    allowed_project_ids TEXT[] DEFAULT '{}',
    can_access_projects BOOLEAN DEFAULT false,
    can_access_partners BOOLEAN DEFAULT false,
    can_access_surveys BOOLEAN DEFAULT false,
    can_access_meetings BOOLEAN DEFAULT false,
    can_access_calendar BOOLEAN DEFAULT false,
    can_access_budget BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    budget_access_level TEXT DEFAULT 'business_only'
        CHECK (budget_access_level IN ('full', 'business_only')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- 3) 감사 로그 테이블
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id),
    action TEXT NOT NULL,
    target_table TEXT,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 트리거: 회원가입 시 자동 프로필 생성
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, login_id, name, phone, organization, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'login_id', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'name', '미지정'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'organization', ''),
        NEW.email,
        'viewer'
    );
    -- 기본 권한 레코드도 함께 생성
    INSERT INTO public.user_permissions (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있다면 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS 정책
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- user_profiles 정책
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- user_permissions 정책
CREATE POLICY "Users can view own permissions"
    ON public.user_permissions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all permissions"
    ON public.user_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- audit_logs 정책 (관리자만 조회, 삽입은 모든 인증 사용자)
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 실시간 동기화
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
