import { createFileRoute } from "@tanstack/react-router"
import { BehaviorWorkspace } from "@/features/behavior/BehaviorWorkspace"

export const Route = createFileRoute("/_layout/reports")({
  component: () => <BehaviorWorkspace mode="reports" />,
  head: () => ({ meta: [{ title: "数据与报告 - 巢影蜂析" }] }),
})
