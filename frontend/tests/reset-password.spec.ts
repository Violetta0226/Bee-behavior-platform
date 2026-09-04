import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("密码找回页面不提供提交表单", async ({ page }) => {
  await page.goto("/recover-password")

  await expect(
    page.getByRole("heading", { name: "密码找回暂未开放" }),
  ).toBeVisible()
  await expect(page.getByTestId("email-input")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "返回登录" })).toBeVisible()
})

test("密码重置页面不提供重置表单", async ({ page }) => {
  await page.goto("/reset-password?token=ignored")

  await expect(
    page.getByRole("heading", { name: "密码重置暂未开放" }),
  ).toBeVisible()
  await expect(page.getByTestId("new-password-input")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "返回登录" })).toBeVisible()
})
