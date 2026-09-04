import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import type { CSSProperties } from "react"

import { ResearchPageShell } from "@/components/Layout/ResearchPageShell"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { isLoggedIn } from "@/hooks/useAuth"
import "@/styles/research-theme.css"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "13.25rem" } as CSSProperties}
    >
      <AppSidebar />
      <SidebarInset className="research-app-shell">
        <ResearchSidebarControl />
        <main className="research-shell-main flex-1">
          <ResearchPageShell>
            <Outlet />
          </ResearchPageShell>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function ResearchSidebarControl() {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar()
  const isOpen = isMobile ? openMobile : open

  return (
    <button
      type="button"
      className={`research-sidebar-toggle ${isOpen ? "is-expanded" : "is-collapsed"}`}
      onClick={toggleSidebar}
      aria-label={isOpen ? "收起导航" : "展开导航"}
      aria-expanded={isOpen}
      title={isOpen ? "收起导航" : "展开导航"}
    >
      {isMobile ? (
        <PanelLeftOpen aria-hidden="true" />
      ) : isOpen ? (
        <PanelLeftClose aria-hidden="true" />
      ) : (
        <ChevronRight aria-hidden="true" />
      )}
    </button>
  )
}
