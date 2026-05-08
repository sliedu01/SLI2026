'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  Lock, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/use-auth-store';
import { ROLE_LABELS, ROLE_COLORS, getPasswordStrength } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateProfile, updatePassword, isLoading: authLoading } = useAuthStore();

  const [isLoading, setIsLoading] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 프로필 폼 상태
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    organization: '',
  });

  // 비밀번호 변경 상태
  const [passwords, setPasswords] = React.useState({
    new: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        organization: user.organization || '',
      });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updateProfile(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || '프로필 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (passwords.new.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await updatePassword(passwords.new);
      setPasswords({ new: '', confirm: '' });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const colors = ROLE_COLORS[user.role];
  const pwStrength = getPasswordStrength(passwords.new);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* 헤더 섹션 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between bg-white/50 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/20 gap-6">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="h-8 -ml-2 text-slate-400 hover:text-slate-600 font-bold gap-1"
          >
            <ArrowLeft className="size-3.5" /> 뒤로가기
          </Button>
          <div className="flex items-center gap-5">
            <div className={cn(
              "size-20 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl",
              user.role === 'admin' ? 'bg-red-500 shadow-red-200' :
              user.role === 'manager' ? 'bg-amber-500 shadow-amber-200' :
              user.role === 'user' ? 'bg-blue-500 shadow-blue-200' : 'bg-slate-400 shadow-slate-200'
            )}>
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
                <Badge className={cn("px-2 py-0.5 font-bold text-[10px] rounded-lg border", colors.bg, colors.text, colors.border)}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
              <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                <Mail className="size-3.5" /> {user.email}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Account ID</p>
          <code className="px-3 py-1 bg-slate-100 rounded-lg text-[11px] font-black text-slate-600 tracking-tighter">{user.loginId}</code>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 animate-in zoom-in duration-300">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="text-sm font-bold">변경사항이 성공적으로 저장되었습니다.</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-700 animate-in zoom-in duration-300">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* 프로필 정보 수정 */}
        <Card className="md:col-span-3 rounded-[2.5rem] border-none shadow-xl bg-white p-8">
          <CardHeader className="p-0 mb-8">
            <CardTitle className="text-xl font-black flex items-center gap-2.5">
              <User className="size-5 text-indigo-600" /> 기본 정보 수정
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Profile Details</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">성명</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="h-12 pl-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold focus-visible:ring-indigo-500"
                    placeholder="성명을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">연락처</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="h-12 pl-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold focus-visible:ring-indigo-500"
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">소속</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                  <Input 
                    value={formData.organization}
                    onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                    className="h-12 pl-11 rounded-xl border-slate-100 bg-slate-50/50 font-bold focus-visible:ring-indigo-500"
                    placeholder="소속 조직명을 입력하세요"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || authLoading}
                className="h-12 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black gap-2 mt-4 shadow-lg shadow-slate-200"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                프로필 저장하기
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 보안 설정 (비밀번호 변경) */}
        <Card className="md:col-span-2 rounded-[2.5rem] border-none shadow-xl bg-slate-50 p-8">
          <CardHeader className="p-0 mb-8">
            <CardTitle className="text-xl font-black flex items-center gap-2.5">
              <Lock className="size-5 text-indigo-600" /> 보안 설정
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Security & Password</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">새 비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={passwords.new}
                    onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                    className="h-12 px-11 rounded-xl border-white bg-white font-bold focus-visible:ring-indigo-500"
                    placeholder="8자 이상 입력"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {passwords.new && (
                  <div className="px-1 space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                      <span className="text-slate-400">보안 강도</span>
                      <span className={cn(pwStrength.color.replace('bg-', 'text-'))}>{pwStrength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", pwStrength.color)}
                        style={{ width: `${(pwStrength.score + 1) * 20}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호 확인</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                    className="h-12 px-11 rounded-xl border-white bg-white font-bold focus-visible:ring-indigo-500"
                    placeholder="비밀번호 재입력"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || authLoading || !passwords.new || passwords.new !== passwords.confirm}
                className="h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black gap-2 mt-4 shadow-lg shadow-indigo-100"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
                비밀번호 변경
              </Button>
            </form>

            <div className="mt-10 p-5 bg-white/50 rounded-2xl border border-white/50 space-y-3">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Shield className="size-3" /> 보안 권장사항
              </h5>
              <ul className="text-[11px] font-medium text-slate-500 space-y-1.5 leading-relaxed">
                <li className="flex gap-2">• 최소 8자 이상, 대소문자 및 숫자를 조합하세요.</li>
                <li className="flex gap-2">• 다른 사이트에서 사용하는 것과 다른 비밀번호를 권장합니다.</li>
                <li className="flex gap-2">• 정기적으로 비밀번호를 변경하여 보안을 유지하세요.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
