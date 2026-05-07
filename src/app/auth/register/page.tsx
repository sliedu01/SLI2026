'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, Eye, EyeOff, User, Phone, Building2, Loader2, ArrowRight, Check, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/use-auth-store';
import { getPasswordStrength } from '@/lib/rbac';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();

  const [form, setForm] = React.useState({
    loginId: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    organization: '',
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const passwordStrength = getPasswordStrength(form.password);
  const passwordsMatch = form.password === form.confirmPassword && form.confirmPassword.length > 0;
  const passwordMismatch = form.confirmPassword.length > 0 && !passwordsMatch;

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!form.loginId.trim()) return setError('아이디를 입력해 주세요.');
    if (form.loginId.trim().length < 4) return setError('아이디는 4자 이상이어야 합니다.');
    if (!form.email.trim()) return setError('이메일을 입력해 주세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('올바른 이메일 형식이 아닙니다.');
    if (!form.name.trim()) return setError('이름을 입력해 주세요.');
    if (form.password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.');
    if (!passwordsMatch) return setError('비밀번호가 일치하지 않습니다.');

    try {
      await signUp({
        loginId: form.loginId.trim(),
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        organization: form.organization.trim(),
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다.';
      if (message.includes('already registered')) {
        setError('이미 등록된 이메일입니다.');
      } else {
        setError(message);
      }
    }
  };

  // 가입 완료 화면
  if (success) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-10 shadow-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-6">
            <Check className="size-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">가입 신청 완료</h2>
          <p className="text-sm text-white/50 font-medium leading-relaxed mb-6">
            가입이 완료되었습니다.<br />
            관리자 승인 후 시스템에 접속할 수 있습니다.
          </p>
          <Button
            onClick={() => router.push('/auth/login')}
            className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black gap-2 shadow-xl shadow-indigo-500/25"
          >
            로그인 페이지로 이동 <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 mb-3 shadow-2xl">
          <UserPlus className="size-6 text-white" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">회원가입</h1>
        <p className="text-[10px] font-bold text-indigo-300/50 uppercase tracking-[0.2em] mt-1">
          Create Your Account
        </p>
      </div>

      {/* 회원가입 폼 */}
      <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-bold text-center animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {/* 아이디 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">아이디 *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                value={form.loginId}
                onChange={handleChange('loginId')}
                placeholder="4자 이상 영문/숫자"
                className="h-11 pl-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400"
              />
            </div>
          </div>

          {/* 이메일 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">이메일 *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="example@email.com"
                className="h-11 pl-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">비밀번호 *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="8자 이상"
                className="h-11 pl-10 pr-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {/* 비밀번호 강도 표시 */}
            {form.password.length > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i < passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-white/40">{passwordStrength.label}</span>
              </div>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">비밀번호 확인 *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                placeholder="비밀번호 재입력"
                className={`h-11 pl-10 pr-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400 ${
                  passwordMismatch ? 'border-red-500/50 ring-1 ring-red-500/30' : ''
                } ${passwordsMatch ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : ''}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {passwordsMatch && <Check className="size-4 text-emerald-400" />}
                {passwordMismatch && <X className="size-4 text-red-400" />}
              </div>
            </div>
            {passwordMismatch && (
              <p className="text-[10px] font-bold text-red-400 ml-1">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          {/* 이름 */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">이름 *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                value={form.name}
                onChange={handleChange('name')}
                placeholder="홍길동"
                className="h-11 pl-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400"
              />
            </div>
          </div>

          {/* 전화번호 & 소속기관 (가로 2열) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                <Input
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="010-0000-0000"
                  className="h-11 pl-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">소속 기관</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                <Input
                  value={form.organization}
                  onChange={handleChange('organization')}
                  placeholder="기관명"
                  className="h-11 pl-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400"
                />
              </div>
            </div>
          </div>

          {/* 가입 버튼 */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm gap-2 shadow-xl shadow-emerald-500/25 transition-all mt-2"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                가입 신청 <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          {/* 안내 */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mt-2">
            <p className="text-[10px] font-bold text-indigo-300/60 leading-relaxed text-center">
              ⓘ 가입 후 관리자 승인이 완료되면 시스템을 사용할 수 있습니다.
            </p>
          </div>
        </form>

        {/* 로그인으로 돌아가기 */}
        <div className="mt-5 pt-5 border-t border-white/10 text-center">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-xs text-white/30 font-bold hover:text-white/50 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3" /> 로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
