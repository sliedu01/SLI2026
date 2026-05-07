'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/use-auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, isAuthenticated } = useAuthStore();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [error, setError] = React.useState('');

  // 이미 로그인된 상태면 대시보드로
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      if (message.includes('Invalid login')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (message.includes('비활성화')) {
        setError(message);
      } else {
        setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
      }
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 로고 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 mb-4 shadow-2xl">
          <Lock className="size-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">SLI 2026</h1>
        <p className="text-xs font-bold text-indigo-300/60 uppercase tracking-[0.3em] mt-1">
          위탁교육 관리 시스템
        </p>
      </div>

      {/* 로그인 카드 */}
      <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-bold text-center animate-in fade-in duration-300">
              {error}
            </div>
          )}

          {/* 이메일 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="h-12 pl-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400 focus-visible:border-indigo-400"
                autoComplete="email"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 pl-10 pr-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400 focus-visible:border-indigo-400"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* 자동 로그인 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="text-xs font-bold text-white/40">자동 로그인</span>
            </label>
            <button
              type="button"
              onClick={() => router.push('/auth/reset-password')}
              className="text-xs font-bold text-indigo-300/60 hover:text-indigo-300 transition-colors"
            >
              비밀번호 찾기
            </button>
          </div>

          {/* 로그인 버튼 */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm tracking-tight gap-2 shadow-xl shadow-indigo-500/25 transition-all"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                로그인 <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        {/* 회원가입 링크 */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/30 font-bold">
            계정이 없으신가요?{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="text-indigo-300 hover:text-indigo-200 font-black transition-colors"
            >
              회원가입
            </button>
          </p>
        </div>
      </div>

      {/* 저작권 */}
      <p className="text-center text-[9px] font-bold text-white/15 uppercase tracking-[0.3em] mt-8">
        © 2026 SLI Education System
      </p>
    </div>
  );
}
