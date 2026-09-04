import { expect, test } from "@playwright/test"

import { mockResearchData } from "./research-data"

async function mockCurrentUser(page: Parameters<typeof mockResearchData>[0]) {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "ui-performance-test-token")
  })
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "researcher@example.com",
        full_name: "蜂群研究员",
        is_active: true,
        is_superuser: true,
      },
    }),
  )
  await page.route("**/api/v1/behavior-reports/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: [], count: 0 } }),
  )
}

test("dashboard preview loads only after user intent", async ({ page }) => {
  let videoFileRequests = 0
  page.on("request", (request) => {
    if (/\/api\/v1\/videos\/[^/]+\/file$/.test(request.url())) {
      videoFileRequests += 1
    }
  })
  await mockCurrentUser(page)
  await mockResearchData(page)

  await page.goto("/")
  await page.waitForLoadState("networkidle")
  await expect(page.locator(".observation-video-preview")).toBeVisible()
  await page.waitForTimeout(300)
  expect(videoFileRequests).toBe(0)

  await page.locator(".observation-video-preview").hover()
  await expect.poll(() => videoFileRequests).toBe(1)
})

test("completed task ledger stays idle and skips off-screen paint", async ({
  page,
}) => {
  let taskListRequests = 0
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/tasks/?skip=0&limit=100")) {
      taskListRequests += 1
    }
  })
  await mockCurrentUser(page)
  await mockResearchData(page)

  await page.goto("/tasks")
  await page.waitForLoadState("networkidle")
  await expect(page.locator(".process-record")).toBeVisible()
  const settledRequestCount = taskListRequests
  await page.waitForTimeout(5_500)

  expect(taskListRequests).toBe(settledRequestCount)
  await expect(page.locator(".process-section-heading > p")).toContainText(
    "当前无活动任务",
  )
  expect(
    await page
      .locator(".process-record")
      .evaluate((element) => getComputedStyle(element).contentVisibility),
  ).toBe("auto")
})

test("document metadata and skip navigation follow the research shell", async ({
  page,
}) => {
  await mockCurrentUser(page)
  await mockResearchData(page)
  await page.addInitScript(() => {
    window.localStorage.setItem("vite-ui-theme", "light")
  })
  await page.goto("/tasks")
  await page.waitForLoadState("networkidle")

  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN")
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#f8fafc",
  )
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "跳至主要内容" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("#research-main")).toBeFocused()
})
