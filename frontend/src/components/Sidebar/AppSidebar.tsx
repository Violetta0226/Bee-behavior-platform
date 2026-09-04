import {
  BarChart3,
  FileText,
  LayoutDashboard,
  ListTodo,
  ScanSearch,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react"
import { SidebarAppearance } from "@/components/Common/Appearance"
import { BrandBeeMark } from "@/components/Dashboard/BrandBeeMark"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: LayoutDashboard, title: "综合态势", path: "/" },
  { icon: Video, title: "观测档案", path: "/videos" },
  { icon: ListTodo, title: "分析任务", path: "/tasks" },
  { icon: BarChart3, title: "分析结果", path: "/results" },
  { icon: ScanSearch, title: "个体追踪", path: "/tracking" },
  { icon: Users, title: "群体行为", path: "/behavior" },
  { icon: TriangleAlert, title: "异常监测", path: "/alerts" },
  { icon: FileText, title: "数据与报告", path: "/reports" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()
  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "系统管理", path: "/admin" }]
    : baseItems
  return (
    <Sidebar collapsible="offcanvas" className="observation-sidebar-container">
      <SidebarHeader className="observation-sidebar-header px-3 py-5">
        <div className="flex items-center gap-3">
          <div className="observation-sidebar-logo flex size-9 shrink-0 items-center justify-center">
            <BrandBeeMark />
          </div>
          <div className="observation-sidebar-brand-copy min-w-0">
            <p className="truncate text-base font-bold">巢影蜂析</p>
            <p className="truncate text-xs text-muted-foreground">
              智慧蜂群行为分析平台
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
