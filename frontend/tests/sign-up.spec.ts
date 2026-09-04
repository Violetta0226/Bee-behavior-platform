import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("公开注册页面不提供注册表单", async ({ page }) => {
  await page.goto("/signup")

  await expect(
    page.getByRole("heading", { name: "公开注册已关闭" }),
  ).toBeVisible()
  await expect(page.getByTestId("email-input")).toHaveCount(0)
  await expect(page.getByTestId("password-input")).toHaveCount(0)
  await expect(page.getByRole("button", { name: /注册|Sign Up/ })).toHaveCount(
    0,
  )
  await expect(page.getByRole("link", { name: "返回登录" })).toBeVisible()
})
