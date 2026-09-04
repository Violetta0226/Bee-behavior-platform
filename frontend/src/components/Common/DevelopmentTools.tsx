import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

export default function DevelopmentTools() {
  return (
    <>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
