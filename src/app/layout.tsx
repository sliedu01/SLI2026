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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <TooltipProvider>
          <RealtimeProvider>
            <AutoMigration />
            <SidebarProvider>
              <ClientSideSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                  <SidebarTrigger className="-ml-1" />
                  <div className="flex items-center gap-2 divide-x divide-slate-200">
                    <span className="text-sm font-semibold text-slate-900 ml-2">위탁교육 통합 대시보드</span>
                  </div>
                </header>
                <main className="flex-1 overflow-auto bg-slate-50/30 p-6">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          </RealtimeProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
