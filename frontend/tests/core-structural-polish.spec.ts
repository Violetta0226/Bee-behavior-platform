import fs from "node:fs"
import path from "node:path"
import { expect, type Page, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config"
import { mockResearchData } from "./research-data"

const outputRoot = path.resolve(
  process.cwd(),
  "structural-evidence/core-structural-polish",
)

test.beforeEach(async ({ page, request }, testInfo) => {
  test.setTimeout(120_000)
  const baseURL = String(testInfo.project.use.baseURL ?? "")
  const apiOrigin = process.env.SCALE_AUDIT_BACKEND_URL ?? baseURL
  const response = await request.post(
    `${apiOrigin}/api/v1/login/access-token`,
    {
      form: {
        username: firstSuperuser,
        password: firstSuperuserPassword,
      },
    },
  )
  expect(response.ok()).toBe(true)
  const body = (await response.json()) as { access_token: string }
  await page.addInitScript((token) => {
    window.localStorage.setItem("access_token", token)
  }, body.access_token)
  await mockResearchData(page)
})

async function waitForResearchPage(page: Page) {
  await expect(page.locator("[data-research-page-shell]")).toBeVisible()
  await expect(
    page.locator("[data-research-content-frame]").first(),
  ).toBeVisible()
  await expect(page.locator("h1").first()).toBeVisible()
  await expect(page.locator(".research-loading-plane")).toHaveCount(0, {
    timeout: 20_000,
  })
}

async function firstHref(page: Page, route: string, selector: string) {
  await page.goto(route)
  await waitForResearchPage(page)
  const locator = page.locator(selector).first()
  await expect(locator).toBeVisible()
  const href = await locator.getAttribute("href")
  expect(href).toBeTruthy()
  return href as string
}

test("1910×944 Light / Dark 核心结构与截图验收", async ({ page }) => {
  fs.mkdirSync(outputRoot, { recursive: true })
  await page.setViewportSize({ width: 1910, height: 944 })

  const taskDetail = await firstHref(page, "/tasks", ".process-primary-action")
  const videoDetail = await firstHref(
    page,
    "/videos",
    '.archive-filename[href^="/videos/"]',
  )

  const readings: Record<string, unknown> = {}
  for (const theme of ["light", "dark"] as const) {
    await page.addInitScript((value) => {
      window.localStorage.setItem("vite-ui-theme", value)
    }, theme)
    const routes =
      theme === "light"
        ? [
            ["/", "dashboard"],
            ["/videos", "videos"],
            ["/tasks", "tasks"],
            [taskDetail, "task-detail"],
            ["/results", "results"],
            [videoDetail, "video-detail"],
          ]
        : [
            ["/tasks", "tasks"],
            [taskDetail, "task-detail"],
            ["/results", "results"],
          ]

    for (const [route, name] of routes) {
      await page.goto(route)
      await waitForResearchPage(page)
      const toggle = page.locator(".research-sidebar-toggle")
      if ((await toggle.getAttribute("aria-expanded")) !== "true") {
        await toggle.click()
        await expect(toggle).toHaveAttribute("aria-expanded", "true")
      }
      await page.waitForTimeout(450)
      await page.screenshot({
        path: path.join(outputRoot, `1910x944-${theme}-${name}.png`),
        fullPage: false,
      })
    }
  }

  await page.addInitScript(() => {
    window.localStorage.setItem("vite-ui-theme", "light")
  })
  await page.goto("/results")
  await waitForResearchPage(page)
  const signature = await page.locator(".hive-signature").boundingBox()
  const signatureGeometry = await page
    .locator(".mini-hive-signature svg")
    .boundingBox()
  expect(signature).not.toBeNull()
  expect(signatureGeometry).not.toBeNull()
  const signatureVisibleHeight = Math.max(
    0,
    Math.min(944, (signature?.y ?? 0) + (signature?.height ?? 0)) -
      Math.max(0, signature?.y ?? 0),
  )
  expect(signature?.y ?? 944).toBeLessThan(720)
  expect(signatureVisibleHeight / (signature?.height ?? 1)).toBeGreaterThan(
    0.55,
  )
  readings.results = {
    signature,
    signatureGeometry,
    signatureVisibleHeight,
  }

  await page.goto("/videos")
  await waitForResearchPage(page)
  const archiveHeader = await page.locator(".archive-header").boundingBox()
  const firstObservation = await page
    .locator(".archive-plate")
    .first()
    .boundingBox()
  expect(firstObservation?.y ?? 944).toBeLessThan(640)
  readings.videos = {
    archiveHeader,
    firstObservation,
    headerToObservation:
      (firstObservation?.y ?? 0) -
      ((archiveHeader?.y ?? 0) + (archiveHeader?.height ?? 0)),
  }

  await page.goto(taskDetail)
  await waitForResearchPage(page)
  const process = await page.locator(".task-process-instrument").boundingBox()
  const readingsGrid = await page.locator(".task-reading-grid").boundingBox()
  expect(
    (readingsGrid?.y ?? 944) + (readingsGrid?.height ?? 0),
  ).toBeLessThanOrEqual(944)
  readings.taskDetail = { process, readingsGrid }

  fs.writeFileSync(
    path.join(outputRoot, "measurements-1910x944.json"),
    `${JSON.stringify(readings, null, 2)}\n`,
  )
  console.info("CORE_STRUCTURAL_1910", JSON.stringify(readings))
})

test("1600 / 2560 / 1024 / 768 / 375 响应式无横向溢出", async ({ page }) => {
  const taskDetail = await firstHref(page, "/tasks", ".process-primary-action")
  for (const width of [1600, 2560, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: width <= 768 ? 900 : 944 })
    for (const route of ["/videos", "/tasks", taskDetail, "/results"]) {
      await page.goto(route)
      await waitForResearchPage(page)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        `${route} 在 ${width}px 发生横向溢出`,
      ).toBe(true)
    }
  }
})

test("record the persistent-shell route transition sequence", async ({
  browser,
  page,
}, testInfo) => {
  fs.mkdirSync(outputRoot, { recursive: true })
  const baseURL = String(testInfo.project.use.baseURL ?? "")

  await page.goto("/tasks")
  const accessToken = await page.evaluate(() =>
    window.localStorage.getItem("access_token"),
  )
  expect(accessToken).toBeTruthy()

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1910, height: 944 },
    recordVideo: {
      dir: outputRoot,
      size: { width: 1910, height: 944 },
    },
  })
  await context.addInitScript((token) => {
    window.localStorage.setItem("access_token", token)
    window.localStorage.setItem("vite-ui-theme", "light")
  }, accessToken)

  const recordedPage = await context.newPage()
  await mockResearchData(recordedPage)
  await recordedPage.goto("/tasks")
  await waitForResearchPage(recordedPage)
  const sidebarToggle = recordedPage.locator(".research-sidebar-toggle")
  if ((await sidebarToggle.getAttribute("aria-expanded")) !== "true") {
    await sidebarToggle.click()
    await expect(sidebarToggle).toHaveAttribute("aria-expanded", "true")
  }
  await recordedPage.waitForTimeout(700)

  await recordedPage.locator(".process-primary-action").first().click()
  await waitForResearchPage(recordedPage)
  await recordedPage.waitForTimeout(700)
  await recordedPage.getByRole("link", { name: "返回", exact: true }).click()
  await waitForResearchPage(recordedPage)
  await recordedPage.waitForTimeout(700)
  await recordedPage
    .getByRole("link", { name: "分析结果", exact: true })
    .click()
  await waitForResearchPage(recordedPage)
  await recordedPage.waitForTimeout(700)
  await recordedPage
    .getByRole("link", { name: "观测档案", exact: true })
    .click()
  await waitForResearchPage(recordedPage)
  await recordedPage.waitForTimeout(700)
  await recordedPage
    .locator('.archive-filename[href^="/videos/"]')
    .first()
    .click()
  await waitForResearchPage(recordedPage)
  await recordedPage.waitForTimeout(900)

  const video = recordedPage.video()
  await context.close()
  expect(video).not.toBeNull()
  await video?.saveAs(path.join(outputRoot, "route-navigation-1910x944.webm"))
})
