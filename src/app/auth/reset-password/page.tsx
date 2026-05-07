'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, Loader2, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/use-auth-store';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword } = useAuthStore();

  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('가입 시 사용한 이메일을 입력해 주세요.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '비밀번호 초기화 요청에 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 발송 완료 화면
  if (sent) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-10 shadow-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-6">
            <Check className="size-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">이메일 발송 완료</h2>
          <p className="text-sm text-white/50 font-medium leading-relaxed mb-2">
            <span className="text-indigo-300 font-bold">{email}</span> 으로
          </p>
          <p className="text-sm text-white/50 font-medium leading-relaxed mb-6">
            비밀번호 재설정 링크를 발송했습니다.<br />
            이메일을 확인해 주세요.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/auth/login')}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black gap-2 shadow-xl shadow-indigo-500/25"
            >
              로그인 페이지로 이동 <ArrowRight className="size-4" />
            </Button>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-xs text-white/30 font-bold hover:text-white/50 transition-colors"
            >
              다른 이메일로 다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 mb-3 shadow-2xl">
          <KeyRound className="size-6 text-white" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">비밀번호 찾기</h1>
        <p className="text-xs font-bold text-indigo-300/50 mt-1">
          가입 시 등록한 이메일로 재설정 링크를 보내드립니다
        </p>
      </div>

      {/* 폼 */}
      <div className="bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-bold text-center animate-in fade-in duration-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">등록된 이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="h-12 pl-10 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-indigo-400"
                autoComplete="email"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm gap-2 shadow-xl shadow-indigo-500/25 transition-all"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                재설정 링크 발송 <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-xs text-white/30 font-bold hover:text-white/50 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="size-3" /> 로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
