import { createFileRoute } from "@tanstack/react-router"
import { BehaviorWorkspace } from "@/features/behavior/BehaviorWorkspace"

export const Route = createFileRoute("/_layout/tracking")({
  component: () => <BehaviorWorkspace mode="tracking" />,
  head: () => ({ meta: [{ title: "个体追踪 - 巢影蜂析" }] }),
})
