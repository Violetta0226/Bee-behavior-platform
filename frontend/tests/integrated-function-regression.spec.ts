import { expect, type Page, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config"
import { mockResearchData } from "./research-data"

async function waitForResearchPage(page: Page) {
  await expect(page.locator("[data-research-page-shell]")).toBeVisible()
  await expect(
    page.locator("[data-research-content-frame]").first(),
  ).toBeVisible()
  await expect(page.locator("h1").first()).toBeVisible()
  await expect(page.locator(".research-loading-plane")).toHaveCount(0, {
    timeout: 30_000,
  })
}

test.beforeEach(async ({ page, request }, testInfo) => {
  test.setTimeout(180_000)
  const baseURL = String(testInfo.project.use.baseURL ?? "")
  expect(baseURL).toBe("http://localhost:8000")
  const login = await request.post(`${baseURL}/api/v1/login/access-token`, {
    form: {
      username: firstSuperuser,
      password: firstSuperuserPassword,
    },
  })
  expect(login.ok()).toBe(true)
  const body = (await login.json()) as { access_token: string }
  await page.addInitScript((token) => {
    window.localStorage.setItem("access_token", token)
    window.localStorage.setItem("vite-ui-theme", "light")
  }, body.access_token)
  await mockResearchData(page)
})

test("core page commands remain wired on the integrated app", async ({
  page,
}) => {
  await page.goto("/videos")
  await waitForResearchPage(page)

  const filters = page.locator(".archive-segmented button")
  await expect(filters).toHaveCount(3)
  await filters.nth(1).click()
  await expect(filters.nth(1)).toHaveAttribute("aria-pressed", "true")
  await filters.first().click()
  await expect(filters.first()).toHaveAttribute("aria-pressed", "true")

  const firstFilename = page.locator(".archive-filename").first()
  const filename = (await firstFilename.textContent())?.trim() ?? ""
  expect(filename.length).toBeGreaterThan(0)
  const search = page.locator('.archive-search-field input[type="search"]')
  await search.fill(filename)
  await expect(firstFilename).toBeVisible()
  await search.fill("definitely-no-observation-match")
  await expect(page.locator(".archive-no-match")).toBeVisible()
  await search.fill("")

  await page.locator(".archive-upload-button").first().click()
  const uploadDialog = page.locator('[role="dialog"]')
  await expect(uploadDialog).toBeVisible()
  await expect(uploadDialog.locator('input[type="file"]')).toHaveAttribute(
    "accept",
    /video/,
  )
  await expect(uploadDialog.locator("button:disabled").last()).toBeVisible()
  await page.keyboard.press("Escape")

  const observationHref = await firstFilename.getAttribute("href")
  expect(observationHref).toMatch(/^\/videos\/[0-9a-f-]+$/)
  await page.goto(observationHref as string)
  await waitForResearchPage(page)

  await page.goto("/tasks")
  await waitForResearchPage(page)
  const completed = page
    .locator('.process-record[data-status="complete"]')
    .first()
  await expect(completed).toBeVisible()
  const taskLink = completed.locator(".process-primary-action")
  const taskHref = await taskLink.getAttribute("href")
  expect(taskHref).toMatch(/^\/tasks\/[0-9a-f-]+$/)
  const resultHref = await completed
    .locator('a[href^="/results?task_id="]')
    .first()
    .getAttribute("href")
  expect(resultHref).toMatch(/^\/results\?task_id=[0-9a-f-]+$/)

  await completed.locator(".process-menu > button").click()
  const reanalyze = completed.locator(".process-menu div button").first()
  await expect(reanalyze).toBeVisible()
  let reanalyzePosts = 0
  await page.route("**/api/v1/tasks/", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    reanalyzePosts += 1
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "functional-regression-intercept" }),
    })
  })
  page.once("dialog", (dialog) => dialog.accept())
  await reanalyze.click()
  await expect.poll(() => reanalyzePosts).toBe(1)

  await page.goto(resultHref as string)
  await waitForResearchPage(page)
  expect(page.url()).toContain("task_id=")
  let refreshReads = 0
  await page.route("**/api/v1/results/?skip=0&limit=100", async (route) => {
    refreshReads += 1
    return route.fallback()
  })
  await page.locator(".result-header .research-icon-action").click()
  await expect.poll(() => refreshReads).toBeGreaterThanOrEqual(1)

  await page.goto(taskHref as string)
  await waitForResearchPage(page)
  await expect(
    page.locator('.research-icon-action[href="/tasks"]'),
  ).toBeVisible()
  await expect(
    page.locator('.task-process-instrument a[href^="/videos/"]').first(),
  ).toHaveAttribute("href", /^\/videos\/[0-9a-f-]+$/)
  await expect(
    page
      .locator('.task-process-instrument a[href^="/results?task_id="]')
      .first(),
  ).toHaveAttribute("href", /^\/results\?task_id=[0-9a-f-]+$/)
})

test("required responsive widths do not overflow", async ({ page }) => {
  const sizes = [
    { width: 1914, height: 960 },
    { width: 1600, height: 900 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 375, height: 900 },
  ]

  await page.setViewportSize(sizes[0])
  await page.goto("/tasks")
  await waitForResearchPage(page)
  const taskHref = await page
    .locator(".process-primary-action")
    .first()
    .getAttribute("href")
  expect(taskHref).toBeTruthy()

  for (const size of sizes) {
    await page.setViewportSize(size)
    for (const route of ["/videos", "/tasks", "/results", taskHref as string]) {
      await page.goto(route)
      await waitForResearchPage(page)
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(
        dimensions.scrollWidth,
        `${route} overflows at ${size.width}x${size.height}`,
      ).toBeLessThanOrEqual(dimensions.clientWidth)
    }
  }
})
