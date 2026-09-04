import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"

import { AuthLayout } from "@/components/Common/AuthLayout"
import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/signup")({
  component: RegistrationClosed,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "注册已关闭｜巢影蜂析" }],
  }),
})

function RegistrationClosed() {
  return (
    <AuthLayout>
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">公开注册已关闭</h1>
          <p className="text-muted-foreground text-sm">
            测试账号由管理员统一创建。如需访问，请联系项目管理员。
          </p>
        </div>
        <Button asChild className="w-full">
          <RouterLink to="/login">返回登录</RouterLink>
        </Button>
      </div>
    </AuthLayout>
  )
}
