import fs from "node:fs"
import path from "node:path"
import { expect, type Page, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config"

const outputRoot = path.resolve(process.cwd(), "final-polish-evidence")
const baseline = {
  results: {
    evidenceHeight: 148.046875,
    coreHeight: 157.625,
    signatureY: 548.734375,
  },
  videos: {
    headerBottomToObservation: 236.640625,
    firstObservationY: 437.609375,
  },
  tasks: { recordHeight: 124 },
}

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
    window.localStorage.setItem("vite-ui-theme", "light")
  }, body.access_token)
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

async function expandSidebar(page: Page) {
  const toggle = page.locator(".research-sidebar-toggle")
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
  }
}

async function waitForSidebarAccount(page: Page) {
  const userMenu = page.getByTestId("user-menu")
  await expect(userMenu).toBeVisible({ timeout: 20_000 })
  await expect(userMenu.locator(`[title="${firstSuperuser}"]`)).toHaveAttribute(
    "title",
    firstSuperuser,
  )
}

async function selectTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => {
    window.localStorage.setItem("vite-ui-theme", value)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(value)
    document.documentElement.style.colorScheme = value
  }, theme)
  await expect(page.locator("html")).toHaveClass(
    theme === "dark" ? /dark/ : /light/,
  )
}

test("1910×944 final-polish structure and screenshots", async ({ page }) => {
  fs.mkdirSync(outputRoot, { recursive: true })
  await page.setViewportSize({ width: 1910, height: 944 })

  await page.goto("/results")
  await waitForResearchPage(page)
  await expandSidebar(page)
  const results = {
    header: await page.locator(".result-header").boundingBox(),
    evidence: await page.locator(".result-provenance").boundingBox(),
    core: await page.locator(".result-core").boundingBox(),
    signature: await page.locator(".hive-signature").boundingBox(),
    signatureGeometry: await page
      .locator(".mini-hive-signature svg")
      .boundingBox(),
  }

  await page.goto("/videos")
  await waitForResearchPage(page)
  const videoHref = await page
    .locator('.archive-filename[href^="/videos/"]')
    .first()
    .getAttribute("href")
  expect(videoHref).toBeTruthy()
  const videos = {
    header: await page.locator(".archive-header").boundingBox(),
    commandRail: await page.locator(".archive-command-rail").boundingBox(),
    commandSummary: await page
      .locator(".archive-command-summary")
      .boundingBox(),
    firstObservation: await page
      .locator(".archive-plate")
      .first()
      .boundingBox(),
  }

  await page.goto("/tasks")
  await waitForResearchPage(page)
  const taskLinks = page.locator(".process-primary-action")
  await expect(taskLinks.first()).toBeVisible()
  const taskHref = await taskLinks.first().getAttribute("href")
  expect(taskHref).toBeTruthy()
  const tasks = {
    records: await page.locator(".process-record").evaluateAll((records) =>
      records.slice(0, 3).map((record) => {
        const rect = record.getBoundingClientRect()
        return { y: rect.y, width: rect.width, height: rect.height }
      }),
    ),
  }

  await page.goto(taskHref as string)
  await waitForResearchPage(page)
  const taskDetail = {
    process: await page.locator(".task-process-instrument").boundingBox(),
    readings: await page.locator(".task-reading-grid").boundingBox(),
    resultRail: await page.locator(".task-result-rail").boundingBox(),
    observationRail: await page.locator(".task-observation-rail").boundingBox(),
  }

  expect(results.evidence?.height ?? Number.POSITIVE_INFINITY).toBeLessThan(80)
  expect(results.core?.height ?? Number.POSITIVE_INFINITY).toBeLessThan(105)
  expect(results.signature?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
    baseline.results.signatureY - 120,
  )
  expect(
    (results.signatureGeometry?.y ?? 944) +
      (results.signatureGeometry?.height ?? 0),
  ).toBeLessThanOrEqual(944)

  const headerBottomToObservation =
    (videos.firstObservation?.y ?? 0) -
    ((videos.header?.y ?? 0) + (videos.header?.height ?? 0))
  expect(headerBottomToObservation).toBeLessThan(
    baseline.videos.headerBottomToObservation * 0.85,
  )
  expect(videos.firstObservation?.y ?? 944).toBeLessThan(400)
  for (const record of tasks.records) {
    expect(record.height).toBeCloseTo(baseline.tasks.recordHeight, 0)
  }

  expect(taskDetail.process).not.toBeNull()
  expect(taskDetail.readings).not.toBeNull()
  expect(taskDetail.resultRail).not.toBeNull()
  expect(taskDetail.observationRail).not.toBeNull()

  await expandSidebar(page)
  const sidebar = page.locator('[data-slot="sidebar-container"]')
  await expect(sidebar.getByText("外观", { exact: true })).toBeVisible()
  await waitForSidebarAccount(page)
  await page.getByTestId("theme-button").click()
  await page.getByTestId("dark-mode").click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await selectTheme(page, "light")

  const measurements = {
    baseline,
    final: { results, videos, tasks, taskDetail },
    delta: {
      evidenceHeight:
        (results.evidence?.height ?? 0) - baseline.results.evidenceHeight,
      coreHeight: (results.core?.height ?? 0) - baseline.results.coreHeight,
      signatureY: (results.signature?.y ?? 0) - baseline.results.signatureY,
      headerBottomToObservation:
        headerBottomToObservation - baseline.videos.headerBottomToObservation,
      firstObservationY:
        (videos.firstObservation?.y ?? 0) - baseline.videos.firstObservationY,
    },
  }
  fs.writeFileSync(
    path.join(outputRoot, "comparison.json"),
    `${JSON.stringify(measurements, null, 2)}\n`,
  )
  console.info("FINAL_POLISH_MEASUREMENTS", JSON.stringify(measurements))

  for (const [theme, routes] of [
    [
      "light",
      [
        ["/", "dashboard"],
        ["/videos", "videos"],
        ["/tasks", "tasks"],
        [taskHref as string, "task-detail"],
        ["/results", "results"],
        [videoHref as string, "video-detail"],
      ],
    ],
    [
      "dark",
      [
        ["/tasks", "tasks"],
        [taskHref as string, "task-detail"],
        ["/results", "results"],
      ],
    ],
  ] as const) {
    await page.evaluate((value) => {
      window.localStorage.setItem("vite-ui-theme", value)
    }, theme)
    for (const [route, name] of routes) {
      await page.goto(route)
      await waitForResearchPage(page)
      await expandSidebar(page)
      await waitForSidebarAccount(page)
      await selectTheme(page, theme)
      await page.waitForTimeout(350)
      await page.screenshot({
        path: path.join(outputRoot, `1910x944-${theme}-${name}.png`),
        fullPage: false,
      })
    }
  }
})

test("task-detail commands remain wired", async ({ page }) => {
  await page.goto("/tasks")
  await waitForResearchPage(page)
  const taskHref = await page
    .locator(".process-primary-action")
    .first()
    .getAttribute("href")
  expect(taskHref).toBeTruthy()

  await page.goto(taskHref as string)
  await waitForResearchPage(page)
  await expect(page.getByRole("link", { name: "返回" })).toHaveAttribute(
    "href",
    "/tasks",
  )
  await expect(
    page.getByRole("link", { name: "查看观测" }).first(),
  ).toHaveAttribute("href", /^\/videos\/[0-9a-f-]+$/)
  const resultLink = page.getByRole("link", { name: "查看结果" })
  if (await resultLink.count()) {
    await expect(resultLink.first()).toHaveAttribute(
      "href",
      /\/results\?task_id=/,
    )
  }

  let analyzeCalls = 0
  await page.route("**/api/v1/tasks/", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    analyzeCalls += 1
    return route.fulfill({ json: { id: "mock-task-detail-analysis" } })
  })
  page.on("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "重新分析" }).click()
  await expect.poll(() => analyzeCalls).toBe(1)
})

test("responsive local-polish regression", async ({ page }) => {
  await page.setViewportSize({ width: 1910, height: 944 })
  await page.goto("/tasks")
  await waitForResearchPage(page)
  const taskHref = await page
    .locator(".process-primary-action")
    .first()
    .getAttribute("href")
  expect(taskHref).toBeTruthy()

  for (const width of [2560, 1910, 1600, 1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: width <= 768 ? 900 : 944 })
    for (const route of ["/results", "/videos", "/tasks", taskHref as string]) {
      await page.goto(route)
      await waitForResearchPage(page)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        `${route} overflows horizontally at ${width}px`,
      ).toBe(true)
    }
  }
})
