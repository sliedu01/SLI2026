import * as React from "react"
import {
  BarChart3,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutGrid,
  Settings,
  Users,
} from "lucide-react"
import { useSettingsStore } from "@/store/use-settings-store"

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
      title: "예산 및 정산",
      url: "/budget",
      icon: FileSpreadsheet,
    },
    {
      title: "설문 및 성과 관리",
      url: "/surveys",
      icon: ClipboardCheck,
    },
    {
      title: "협력업체 관리",
      url: "/partners",
      icon: Users,
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
  const { systemName } = useSettingsStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutGrid className="size-5" />
          </div>
          <span className="text-lg font-black tracking-tight group-data-[collapsible=icon]:hidden">
            {mounted ? systemName : "SLI 2026"}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메인 메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<a href={item.url} />} tooltip={item.title}>
                    <item.icon />
                    <span className="font-medium">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>시스템 관리</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.admin.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<a href={item.url} />} tooltip={item.title}>
                    <item.icon />
                    <span className="font-medium">{item.title}</span>
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
