import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"

import { AuthLayout } from "@/components/Common/AuthLayout"
import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/recover-password")({
  component: PasswordRecoveryClosed,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "密码找回暂未开放｜巢影蜂析" }],
  }),
})

function PasswordRecoveryClosed() {
  return (
    <AuthLayout>
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">密码找回暂未开放</h1>
          <p className="text-muted-foreground text-sm">
            如需重置密码，请联系项目管理员处理。
          </p>
        </div>
        <Button asChild className="w-full">
          <RouterLink to="/login">返回登录</RouterLink>
        </Button>
      </div>
    </AuthLayout>
  )
}
