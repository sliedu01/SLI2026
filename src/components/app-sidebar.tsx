import * as React from "react"
import {
  BarChart3,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutGrid,
  Video,
  CalendarDays,
  Settings,
  Users,
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
  SidebarRail,
} from "@/components/ui/sidebar"

// 메뉴 데이터 구성
const data = {
  navMain: [
    {
      title: "대시보드",
      url: "/",
      icon: BarChart3,
    },
    {
      title: "사업 관리",
      url: "/projects",
      icon: LayoutGrid,
    },
    {
      title: "협력업체 관리",
      url: "/partners",
      icon: Users,
    },
    {
      title: "설문 및 성과 관리",
      url: "/surveys",
      icon: ClipboardCheck,
    },
    {
      title: "회의 관리",
      url: "/meetings",
      icon: Video,
    },
    {
      title: "캘린더(일정)",
      url: "/calendar",
      icon: CalendarDays,
    },
    {
      title: "예산 및 정산",
      url: "/budget",
      icon: FileSpreadsheet,
    },
  ],
  admin: [
    {
      title: "환경설정",
      url: "/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

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
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<a href={item.url} />} tooltip={item.title} className="h-9 px-3">
                    <item.icon className="size-4" />
                    <span className="text-[11px] font-medium">{item.title}</span>
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
              {data.admin.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<a href={item.url} />} tooltip={item.title} className="h-9 px-3">
                    <item.icon className="size-4" />
                    <span className="text-[11px] font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
