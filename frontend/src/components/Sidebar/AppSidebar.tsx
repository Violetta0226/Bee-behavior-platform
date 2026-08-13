import {
  Activity,
  BrainCircuit,
  LayoutDashboard,
  ListTodo,
  ScanSearch,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"

import { type Item, Main } from "./Main"
import { User } from "./User"

/**
 * 巢影蜂析——智慧蜂群行为分析平台
 * 主功能菜单
 */
const baseItems: Item[] = [
  {
    icon: LayoutDashboard,
    title: "综合态势",
    path: "/",
  },
  {
    icon: Video,
    title: "视频管理",
    path: "/videos",
  },
  {
    icon: ListTodo,
    title: "分析任务",
    path: "/tasks",
  },
  {
    icon: ScanSearch,
    title: "个体追踪",
    path: "/tracking",
  },
  {
    icon: Activity,
    title: "群体行为",
    path: "/behavior",
  },
  {
    icon: TriangleAlert,
    title: "异常监测",
    path: "/alerts",
  },
  {
    icon: BrainCircuit,
    title: "模型管理",
    path: "/models",
  },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  /**
   * 管理员可以额外看到系统管理页面
   */
  const items = currentUser?.is_superuser
    ? [
        ...baseItems,
        {
          icon: Users,
          title: "系统管理",
          path: "/admin",
        },
      ]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      {/* 系统品牌 */}
      <SidebarHeader className="border-b px-4 py-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <div className="flex items-center gap-3">
          {/* 蜂巢风格 Logo */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-lg font-bold text-black">
            蜂
          </div>

          {/* 展开侧栏时显示完整名称 */}
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-base font-bold">
              巢影蜂析
            </p>

            <p className="truncate text-xs text-muted-foreground">
              智慧蜂群行为分析平台
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* 主菜单 */}
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>

      {/* 底部设置与用户 */}
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar