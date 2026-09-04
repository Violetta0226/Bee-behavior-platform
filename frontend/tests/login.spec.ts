import { expect, type Page, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { randomPassword } from "./utils/random.ts"

test.use({ storageState: { cookies: [], origins: [] } })

const fillForm = async (page: Page, email: string, password: string) => {
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(password)
}

const logOutFromSidebar = async (page: Page) => {
  await page.getByRole("button", { name: "展开导航" }).click()
  await page.getByTestId("user-menu").click()
  await page.getByRole("menuitem", { name: "退出登录" }).click()
  await page.waitForURL("/login")
}

const verifyInput = async (page: Page, testId: string) => {
  const input = page.getByTestId(testId)
  await expect(input).toBeVisible()
  await expect(input).toHaveText("")
  await expect(input).toBeEditable()
}

test("Inputs are visible, empty and editable", async ({ page }) => {
  await page.goto("/login")

  await verifyInput(page, "email-input")
  await verifyInput(page, "password-input")
})

test("登录按钮可见", async ({ page }) => {
  await page.goto("/login")

  await expect(page.getByRole("button", { name: "登录" })).toBeVisible()
})

test("密码可以显示和隐藏", async ({ page }) => {
  await page.goto("/login")

  const passwordInput = page.getByTestId("password-input")
  await expect(passwordInput).toHaveAttribute("type", "password")
  await page.getByRole("button", { name: "显示密码" }).click()
  await expect(passwordInput).toHaveAttribute("type", "text")
  await page.getByRole("button", { name: "隐藏密码" }).click()
  await expect(passwordInput).toHaveAttribute("type", "password")
})

test("公开注册和密码找回入口已关闭", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("link", { name: "忘记密码？" })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "注册" })).toHaveCount(0)
  await expect(page.getByText("账号由管理员统一开通")).toBeVisible()
})

test("主题切换在浅色与深色模式下生效", async ({ page }) => {
  await page.goto("/login")

  await page.getByRole("button", { name: "浅色模式" }).click()
  await expect(page.locator("html")).toHaveClass(/light/)
  await expect(page.getByRole("button", { name: "浅色模式" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await page.getByRole("button", { name: "深色模式" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(page.getByRole("button", { name: "深色模式" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
})

test("键盘焦点清晰可见", async ({ page }) => {
  await page.goto("/login")
  await page.getByTestId("email-input").focus()

  await expect(page.getByTestId("email-input")).toBeFocused()
  const focusStyle = await page.getByTestId("email-input").evaluate((input) => {
    const style = getComputedStyle(input)
    return {
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
    }
  })
  expect(focusStyle.borderColor).toBe("rgb(242, 140, 40)")
  expect(focusStyle.boxShadow).not.toBe("none")
})

test("减少动态效果时静态显示所有入口内容", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/login")

  for (const selector of [
    "[data-auth-mark]",
    "[data-auth-wordmark]",
    "[data-auth-form]",
  ]) {
    const motionStyle = await page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        animationName: style.animationName,
        opacity: style.opacity,
        transform: style.transform,
      }
    })
    expect(motionStyle).toEqual({
      animationName: "none",
      opacity: "1",
      transform: "none",
    })
  }
})

const visualMatrix = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
]

for (const theme of ["light", "dark"] as const) {
  for (const viewport of visualMatrix) {
    test(`${theme} ${viewport.width}px 布局无横向溢出`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport)
      await page.addInitScript((selectedTheme) => {
        window.localStorage.setItem("vite-ui-theme", selectedTheme)
      }, theme)
      await page.goto("/login")

      await expect(
        page.getByRole("heading", { name: "登录巢影蜂析" }),
      ).toBeVisible()
      await expect(page.getByRole("button", { name: "登录" })).toBeVisible()
      await expect(page.locator("html")).toHaveClass(new RegExp(theme))
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true)

      if (viewport.width === 375) {
        await expect(page.locator(".auth-biofield")).toBeHidden()
        await expect(
          page.getByText("巢影蜂析", { exact: true }).first(),
        ).toBeVisible()
      } else {
        await expect(page.getByText("智慧蜂群行为分析平台")).toBeVisible()
      }

      await expect(page.locator("[data-auth-form]")).toHaveCSS("opacity", "1")
      await page.screenshot({
        path: testInfo.outputPath(`${theme}-${viewport.width}.png`),
        fullPage: true,
      })
    })
  }
}

test("Log in with valid email and password ", async ({ page }) => {
  await page.goto("/login")

  await fillForm(page, firstSuperuser, firstSuperuserPassword)
  await page.getByRole("button", { name: "登录" }).click()

  await page.waitForURL("/")
  expect(
    await page.evaluate(() => localStorage.getItem("access_token")),
  ).toBeTruthy()
})

test("Log in with invalid email", async ({ page }) => {
  await page.goto("/login")

  await fillForm(page, "invalidemail", firstSuperuserPassword)
  await page.getByRole("button", { name: "登录" }).click()

  await expect(page.getByText("请输入有效的邮箱地址")).toBeVisible()
})

test("Log in with invalid password", async ({ page }) => {
  const password = randomPassword()

  await page.goto("/login")
  await fillForm(page, firstSuperuser, password)
  await page.getByRole("button", { name: "登录" }).click()

  await expect(page.getByText("Incorrect email or password")).toBeVisible()
})

test("Successful log out", async ({ page }) => {
  await page.goto("/login")

  await fillForm(page, firstSuperuser, firstSuperuserPassword)
  await page.getByRole("button", { name: "登录" }).click()

  await page.waitForURL("/")
  expect(
    await page.evaluate(() => localStorage.getItem("access_token")),
  ).toBeTruthy()

  await logOutFromSidebar(page)
})

test("Logged-out user cannot access protected routes", async ({ page }) => {
  await page.goto("/login")

  await fillForm(page, firstSuperuser, firstSuperuserPassword)
  await page.getByRole("button", { name: "登录" }).click()

  await page.waitForURL("/")
  expect(
    await page.evaluate(() => localStorage.getItem("access_token")),
  ).toBeTruthy()

  await logOutFromSidebar(page)

  await page.goto("/settings")
  await page.waitForURL("/login")
})

test("Redirects to /login when token is wrong", async ({ page }) => {
  await page.goto("/settings")
  await page.evaluate(() => {
    localStorage.setItem("access_token", "invalid_token")
  })
  await page.goto("/settings")
  await page.waitForURL("/login")
  await expect(page).toHaveURL("/login")
})
