'use client';

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutGrid,
  Video,
  CalendarDays,
  Settings,
  Users,
  Shield,
  LogOut,
  LucideIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"

import Link from "next/link"
import { useAuthStore } from "@/store/use-auth-store"
import { type ModuleKey, ROLE_LABELS } from "@/lib/rbac"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  module?: ModuleKey;
}

// 메뉴 데이터 구성
const navMain: NavItem[] = [
  {
    title: "대시보드",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "사업 관리",
    url: "/projects",
    icon: LayoutGrid,
    module: "projects",
  },
  {
    title: "협력업체 관리",
    url: "/partners",
    icon: Users,
    module: "partners",
  },
  {
    title: "설문 및 성과 관리",
    url: "/surveys",
    icon: ClipboardCheck,
    module: "surveys",
  },
  {
    title: "회의 관리",
    url: "/meetings",
    icon: Video,
    module: "meetings",
  },
  {
    title: "캘린더(일정)",
    url: "/calendar",
    icon: CalendarDays,
    module: "calendar",
  },
  {
    title: "예산 및 정산",
    url: "/budget",
    icon: FileSpreadsheet,
    module: "budget",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { user, isAuthenticated, hasModuleAccess, signOut, isAdmin } = useAuthStore();

  // 권한에 따른 메뉴 필터링
  const filteredNav = navMain.filter(item => {
    if (!item.module) return true; // 대시보드는 항상 표시
    if (!isAuthenticated || !user) return false;
    return hasModuleAccess(item.module);
  });

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-12 flex items-center px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayoutGrid className="size-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-[14px] font-bold tracking-tighter leading-none">SLI 2026</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 mt-0.5">Lv up!</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider px-3">메인 메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-9 px-3">
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span className="text-[11px] font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider px-3">시스템 관리</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 관리자만 사용자 관리 메뉴 표시 */}
              {isAdmin() && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="사용자 관리" className="h-9 px-3">
                    <Link href="/admin/users">
                      <Shield className="size-4" />
                      <span className="text-[11px] font-medium">사용자 관리</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="환경설정" className="h-9 px-3">
                  <Link href="/settings">
                    <Settings className="size-4" />
                    <span className="text-[11px] font-medium">환경설정</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 사용자 정보 + 로그아웃 */}
      {isAuthenticated && user && (
        <SidebarFooter className="border-t border-slate-100 p-2">
          <div className="flex items-center gap-1">
            <Link 
              href="/profile" 
              className="flex flex-1 items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-all group/user overflow-hidden"
              title="개인정보 수정"
            >
              <div className={cn(
                "size-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm transition-transform group-hover/user:scale-110",
                user.role === 'admin' ? 'bg-red-500' :
                user.role === 'manager' ? 'bg-amber-500' :
                user.role === 'user' ? 'bg-blue-500' : 'bg-slate-400'
              )}>
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-[11px] font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[9px] font-bold text-slate-400 truncate">
                  {ROLE_LABELS[user.role]} · {user.organization || user.email}
                </p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all group-data-[collapsible=icon]:hidden shrink-0"
              title="로그아웃"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
