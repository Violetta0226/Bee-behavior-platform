import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router"
import { lazy, Suspense } from "react"
import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"

const DevelopmentTools = import.meta.env.DEV
  ? lazy(() => import("@/components/Common/DevelopmentTools"))
  : null

export const Route = createRootRoute({
  component: () => (
    <>
      <HeadContent />
      <Outlet />
      {DevelopmentTools ? (
        <Suspense fallback={null}>
          <DevelopmentTools />
        </Suspense>
      ) : null}
    </>
  ),
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
