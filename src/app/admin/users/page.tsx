'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Shield, ShieldCheck, ShieldAlert, Eye,
  Check, X, Loader2, Save, RotateCcw, Search,
  UserCog, ChevronDown, ChevronUp, Building2,
  LogOut
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/use-auth-store';
import { useProjectStore } from '@/store/use-project-store';
import {
  type UserProfile,
  type UserPermission,
  type UserRole,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_PRESETS,
} from '@/lib/rbac';

type UserWithPermission = UserProfile & { permission?: UserPermission };

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin, fetchAllUsers, updateUserRole, updateUserPermissions, toggleUserActive, signOut } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();

  const [users, setUsers] = React.useState<UserWithPermission[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // 편집 중인 권한 상태
  const [editRole, setEditRole] = React.useState<UserRole>('viewer');
  const [editPerms, setEditPerms] = React.useState<Partial<UserPermission>>({});

  const lv1Projects = projects.filter(p => p.level === 1);

  // 초기 데이터 로드
  React.useEffect(() => {
    if (!isAdmin()) {
      router.replace('/');
      return;
    }
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true);
    try {
      await fetchProjects();
      const allUsers = await fetchAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setIsLoading(false);
  };

  // 사용자 선택 시 권한 편집 상태 초기화
  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSaveSuccess(false);
    const u = users.find(u => u.id === userId);
    if (u) {
      setEditRole(u.role);
      setEditPerms({
        allowedProjectIds: u.permission?.allowedProjectIds || [],
        canAccessProjects: u.permission?.canAccessProjects ?? false,
        canAccessPartners: u.permission?.canAccessPartners ?? false,
        canAccessSurveys: u.permission?.canAccessSurveys ?? false,
        canAccessMeetings: u.permission?.canAccessMeetings ?? false,
        canAccessCalendar: u.permission?.canAccessCalendar ?? false,
        canAccessBudget: u.permission?.canAccessBudget ?? false,
        canCreate: u.permission?.canCreate ?? false,
        canUpdate: u.permission?.canUpdate ?? false,
        canDelete: u.permission?.canDelete ?? false,
        canApprove: u.permission?.canApprove ?? false,
        budgetAccessLevel: u.permission?.budgetAccessLevel ?? 'business_only',
      });
    }
  };

  // 등급 변경 시 프리셋 자동 적용
  const handleRoleChange = (role: UserRole) => {
    setEditRole(role);
    const preset = ROLE_PRESETS[role];
    setEditPerms(prev => ({
      ...prev,
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
      // allowedProjectIds는 유지 (등급 변경 시 사업 범위는 보존)
    }));
  };

  // 사업 체크박스 토글
  const toggleProject = (projectId: string) => {
    setEditPerms(prev => {
      const current = prev.allowedProjectIds || [];
      const isChecked = current.includes(projectId);
      
      let next = [...current];

      if (isChecked) {
        // 해제: 본인만 제거 (하위 자동 제거 로직 삭제 - 명시적 관리 유도)
        next = next.filter(id => id !== projectId);
      } else {
        // 선택: 본인만 추가
        next.push(projectId);
      }
      return { ...prev, allowedProjectIds: next };
    });
  };

  // 전체 사업 토글 (LV1 + LV2 모두 포함)
  const toggleAllProjects = () => {
    setEditPerms(prev => {
      const current = prev.allowedProjectIds || [];
      const allProjectIds = projects.filter(p => p.level <= 2).map(p => p.id);
      
      if (current.length === allProjectIds.length) {
        return { ...prev, allowedProjectIds: [] };
      }
      return { ...prev, allowedProjectIds: allProjectIds };
    });
  };

  // 권한 저장
  const handleSave = async () => {
    if (!selectedUserId) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateUserRole(selectedUserId, editRole);
      await updateUserPermissions(selectedUserId, editPerms);

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(u =>
        u.id === selectedUserId
          ? { ...u, role: editRole, permission: { ...u.permission, ...editPerms } as UserPermission }
          : u
      ));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save permissions:', err);
      alert('권한 저장에 실패했습니다. (원인: ' + (err?.message || JSON.stringify(err)) + ')');
    }
    setIsSaving(false);
  };

  // 활성/비활성 토글
  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await toggleUserActive(userId, !currentActive);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, isActive: !currentActive } : u
      ));
    } catch (err) {
      console.error('Failed to toggle user:', err);
    }
  };

  // 권한 프리셋 초기화
  const handleReset = () => {
    if (selectedUserId) {
      selectUser(selectedUserId);
    }
  };

  // 검색 필터링
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q)
      || u.loginId.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.organization || '').toLowerCase().includes(q);
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  // 등급 아이콘
  const RoleIcon = ({ role }: { role: UserRole }) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="size-3.5" />;
      case 'manager': return <ShieldCheck className="size-3.5" />;
      case 'user': return <UserCog className="size-3.5" />;
      case 'viewer': return <Eye className="size-3.5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 text-indigo-400 animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">사용자 데이터 로드 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="size-6 text-indigo-600" />
            사용자 권한 관리
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            등록된 사용자 {users.length}명 · 활성 {users.filter(u => u.isActive).length}명
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-3">
            <p className="text-[10px] font-bold text-slate-400">로그인: {currentUser?.name}</p>
            <p className="text-[10px] font-bold text-indigo-500">{ROLE_LABELS[currentUser?.role || 'viewer']}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await signOut(); router.replace('/auth/login'); }}
            className="h-8 text-xs font-bold gap-1.5 text-slate-500"
          >
            <LogOut className="size-3.5" /> 로그아웃
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 좌측: 사용자 목록 */}
        <div className="lg:col-span-5 space-y-4">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-300" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 아이디, 이메일, 소속 검색..."
              className="h-10 pl-10 rounded-xl bg-white border-slate-200 text-sm font-bold focus-visible:ring-indigo-400"
            />
          </div>

          {/* 사용자 카드 목록 */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredUsers.map(u => {
              const colors = ROLE_COLORS[u.role];
              const isSelected = u.id === selectedUserId;
              return (
                <Card
                  key={u.id}
                  onClick={() => selectUser(u.id)}
                  className={cn(
                    "p-4 rounded-xl cursor-pointer transition-all border-2",
                    isSelected
                      ? "border-indigo-400 bg-indigo-50/50 shadow-lg shadow-indigo-100"
                      : "border-transparent bg-white hover:border-slate-200 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* 활성 상태 표시 */}
                      <div className={cn(
                        "size-2.5 rounded-full shrink-0",
                        u.isActive ? "bg-emerald-500" : "bg-slate-300"
                      )} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900 truncate">
                            {u.name === '미지정' ? `미지정 (${u.loginId})` : u.name}
                          </p>
                          <Badge className={cn("text-[9px] font-bold px-1.5 py-0 border", colors.bg, colors.text, colors.border)}>
                            <RoleIcon role={u.role} />
                            <span className="ml-0.5">{ROLE_LABELS[u.role]}</span>
                          </Badge>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 truncate">
                          {u.loginId} · {u.email} {u.phone && ` · ${u.phone}`}
                        </p>
                        {u.organization && (
                          <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1 mt-0.5">
                            <Building2 className="size-2.5" /> {u.organization}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(u.id, u.isActive); }}
                          className={cn(
                            "h-7 px-2.5 rounded-lg text-[10px] font-bold transition-colors",
                            u.isActive 
                              ? "text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100" 
                              : "text-slate-500 bg-slate-100 hover:bg-slate-200"
                          )}
                          title={u.isActive ? "클릭 시 비활성화됩니다" : "클릭 시 활성화됩니다"}
                        >
                          {u.isActive ? '활성' : '비활성'}
                        </Button>
                      )}
                      {isSelected ? <ChevronUp className="size-4 text-indigo-400" /> : <ChevronDown className="size-4 text-slate-300" />}
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="size-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">사용자가 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 우측: 권한 편집 패널 */}
        <div className="lg:col-span-7">
          {selectedUser ? (
            <Card className="rounded-2xl border border-slate-200/60 shadow-sm bg-white p-6 space-y-6 animate-in fade-in duration-300">
              {/* 편집 대상 사용자 헤더 */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <UserCog className="size-4 text-indigo-500" />
                    {selectedUser.name === '미지정' ? `미지정 (${selectedUser.loginId})` : selectedUser.name} 권한 설정
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <p className="text-[11px] font-bold text-slate-500">{selectedUser.email}</p>
                    {selectedUser.organization && (
                      <>
                        <span className="text-slate-200">|</span>
                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Building2 className="size-3" />
                          {selectedUser.organization}
                        </p>
                      </>
                    )}
                    {selectedUser.phone && (
                      <>
                        <span className="text-slate-200">|</span>
                        <p className="text-[11px] font-bold text-slate-500">{selectedUser.phone}</p>
                      </>
                    )}
                  </div>
                </div>
                {saveSuccess && (
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold text-[10px] gap-1 animate-in fade-in duration-300">
                    <Check className="size-3" /> 저장 완료
                  </Badge>
                )}
              </div>

              {/* 등급 선택 */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">사용자 등급</label>
                <Select value={editRole} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                  <SelectTrigger className="h-10 rounded-xl font-bold text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin" className="font-bold">🔴 관리자 (Admin) — 전체 권한</SelectItem>
                    <SelectItem value="manager" className="font-bold">🟡 운영자 (Manager) — 관리 범위 내 전체</SelectItem>
                    <SelectItem value="user" className="font-bold">🔵 사용자 (User) — 생성/수정 가능, 삭제 불가</SelectItem>
                    <SelectItem value="viewer" className="font-bold">⚪ 관찰자 (Viewer) — 조회만 가능</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin이 아닌 경우에만 세부 권한 편집 */}
              {editRole !== 'admin' && (
                <>
                  {/* 사업 범위 (LV1) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">사업 범위 (LV1 & LV2)</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllProjects}
                        className="h-6 text-[10px] font-bold text-indigo-500 hover:bg-indigo-50"
                      >
                        {(editPerms.allowedProjectIds || []).length === projects.filter(p => p.level <= 2).length ? '전체 해제' : '전체 선택'}
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {lv1Projects.map(lv1 => {
                        const lv1Checked = (editPerms.allowedProjectIds || []).includes(lv1.id);
                        const lv2s = projects.filter(p => p.parentId === lv1.id && p.level === 2);
                        
                        return (
                          <div key={lv1.id} className="space-y-2">
                            {/* LV1 Item */}
                            <label className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold",
                              lv1Checked ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                            )}>
                              <input
                                type="checkbox"
                                checked={lv1Checked}
                                onChange={() => toggleProject(lv1.id)}
                                className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-400 w-3.5 h-3.5"
                              />
                              <span className="truncate">{lv1.name} (LV1)</span>
                            </label>

                            {/* LV2 Children */}
                            {lv2s.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5 pl-6">
                                {lv2s.map(lv2 => {
                                  const lv2Checked = (editPerms.allowedProjectIds || []).includes(lv2.id);
                                  return (
                                    <label key={lv2.id} className={cn(
                                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-[10px] font-medium",
                                      lv2Checked ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                                    )}>
                                      <input
                                        type="checkbox"
                                        checked={lv2Checked}
                                        onChange={() => toggleProject(lv2.id)}
                                        className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-400 w-3 h-3"
                                      />
                                      <span className="truncate">{lv2.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 기능 모듈 접근 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">기능 모듈 접근</label>
                      {editRole === 'viewer' && (
                        <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                          관찰자는 허용할 탭을 직접 체크해야 합니다.
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['canAccessProjects', '사업 관리'],
                        ['canAccessPartners', '협력업체 관리'],
                        ['canAccessSurveys', '설문 및 성과'],
                        ['canAccessMeetings', '회의 관리'],
                        ['canAccessCalendar', '캘린더(일정)'],
                        ['canAccessBudget', '예산 및 정산'],
                      ] as [keyof UserPermission, string][]).map(([key, label]) => {
                        const checked = editPerms[key] as boolean;
                        return (
                          <label
                            key={key}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold",
                              checked
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setEditPerms(prev => ({ ...prev, [key]: !checked }))}
                              className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5"
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {editRole === 'viewer' && (
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 mt-2">
                        * 관찰자(Viewer) 등급은 <span className="text-indigo-600 font-black">업로드된 증빙 서류의 다운로드가 제한</span>됩니다.
                        (운영자 등급 이상만 가능)
                      </p>
                    )}
                  </div>

                  {/* 행위 권한 */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">행위 권한 (CRUD)</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        ['canCreate', '생성 (Create)', 'bg-blue-50 border-blue-200 text-blue-700'],
                        ['canUpdate', '수정 (Update)', 'bg-amber-50 border-amber-200 text-amber-700'],
                        ['canDelete', '삭제 (Delete)', 'bg-red-50 border-red-200 text-red-700'],
                        ['canApprove', '승인 (Approve)', 'bg-purple-50 border-purple-200 text-purple-700'],
                      ] as [keyof UserPermission, string, string][]).map(([key, label, activeClass]) => {
                        const checked = editPerms[key] as boolean;
                        return (
                          <label
                            key={key}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-bold",
                              checked
                                ? activeClass
                                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setEditPerms(prev => ({ ...prev, [key]: !checked }))}
                              className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-400 w-3.5 h-3.5"
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 예산 접근 수준 */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">예산 접근 수준</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ['full', '전체 (인건비+운영비+사업비)', '모든 예산 항목 접근 가능'],
                        ['business_only', '사업비만', '사업비 외 민감 예산 마스킹 처리'],
                      ] as [string, string, string][]).map(([value, label, desc]) => {
                        const checked = editPerms.budgetAccessLevel === value;
                        return (
                          <label
                            key={value}
                            className={cn(
                              "flex flex-col p-3 rounded-xl border cursor-pointer transition-all",
                              checked
                                ? "bg-indigo-50 border-indigo-200"
                                : "bg-slate-50 border-slate-100 hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="budgetAccess"
                                checked={checked}
                                onChange={() => setEditPerms(prev => ({ ...prev, budgetAccessLevel: value as 'full' | 'business_only' }))}
                                className="text-indigo-500 focus:ring-indigo-400 w-3.5 h-3.5"
                              />
                              <span className={cn("text-xs font-bold", checked ? "text-indigo-700" : "text-slate-500")}>{label}</span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-400 mt-1 ml-5">{desc}</p>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {editRole === 'admin' && (
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                  <p className="text-xs font-bold text-red-600 flex items-center gap-2">
                    <ShieldAlert className="size-4" />
                    관리자 등급은 모든 기능에 대한 전체 권한을 가집니다.
                  </p>
                  <p className="text-[10px] font-medium text-red-400 mt-1">
                    세부 권한 설정은 관리자 이외의 등급에서만 가능합니다.
                  </p>
                </div>
              )}

              {/* 저장 / 초기화 버튼 */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm gap-2 shadow-lg shadow-indigo-200"
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  권한 저장
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="h-11 px-6 rounded-xl font-bold text-sm gap-2 text-slate-500"
                >
                  <RotateCcw className="size-4" /> 초기화
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 flex flex-col items-center justify-center min-h-[400px]">
              <Users className="size-12 text-slate-200 mb-4" />
              <h3 className="text-sm font-black text-slate-400 mb-1">사용자를 선택하세요</h3>
              <p className="text-xs font-medium text-slate-300">좌측 목록에서 사용자를 클릭하면 권한을 설정할 수 있습니다.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
