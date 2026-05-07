'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ClientSideSidebar } from "@/components/providers/client-side-sidebar";
import { RealtimeProvider } from "@/components/realtime-provider";
import { AutoMigration } from "@/components/auto-migration";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * LayoutShell: 경로에 따라 사이드바 유무를 결정하는 레이아웃 셸
 * - /auth/* 경로: 사이드바/헤더 없이 children만 렌더링
 * - 그 외 경로: 사이드바 + 헤더 + AuthGuard 포함 레이아웃
 */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/auth');

  // 인증 경로: 사이드바 없이 렌더링
  if (isAuthRoute) {
    return <>{children}</>;
  }

  // 메인 경로: 사이드바 + 인증 가드 + 헤더
  return (
    <RealtimeProvider>
      <AuthGuard>
        <AutoMigration />
        <SidebarProvider>
          <ClientSideSidebar />
          <SidebarInset>
            <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3 bg-background/50 backdrop-blur-md sticky top-0 z-30 border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <div className="flex items-center gap-2 divide-x divide-slate-200 dark:divide-slate-800">
                  <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100 ml-2 tracking-tight">위탁교육 통합 대시보드</span>
                </div>
              </div>
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-950/30 p-3">
              <div className="w-full">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </AuthGuard>
    </RealtimeProvider>
  );
}
