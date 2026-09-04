import { createFileRoute } from "@tanstack/react-router"
import { BehaviorWorkspace } from "@/features/behavior/BehaviorWorkspace"

export const Route = createFileRoute("/_layout/alerts")({
  component: () => <BehaviorWorkspace mode="alerts" />,
  head: () => ({ meta: [{ title: "异常监测 - 巢影蜂析" }] }),
})
