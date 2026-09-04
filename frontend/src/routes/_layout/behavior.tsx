import { createFileRoute } from "@tanstack/react-router"
import { BehaviorWorkspace } from "@/features/behavior/BehaviorWorkspace"

export const Route = createFileRoute("/_layout/behavior")({
  component: () => <BehaviorWorkspace mode="behavior" />,
  head: () => ({ meta: [{ title: "群体行为 - 巢影蜂析" }] }),
})
