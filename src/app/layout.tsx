import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { ClientSideSidebar } from "@/components/providers/client-side-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { RealtimeProvider } from "@/components/realtime-provider"
import { AutoMigration } from "@/components/auto-migration"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SLI 2026 | 위탁교육 관리 시스템",
  description: "사내 위탁교육 관리용 고성능 대시보드",
};

import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans transition-colors duration-300`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <RealtimeProvider>
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
            </RealtimeProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
