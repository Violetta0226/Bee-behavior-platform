import { expect, type Page, test } from "@playwright/test"

import { formatEvidenceId } from "../src/lib/observationIds"
import { firstSuperuser, firstSuperuserPassword } from "./config"

const primaryRoutes = ["/", "/videos", "/tasks", "/results"] as const
const frameSizeByRoute = {
  "/": "workspace",
  "/tasks": "workspace",
  "/results": "workspace",
} as const

test.beforeEach(async ({ page, request }, testInfo) => {
  test.setTimeout(120_000)
  const baseURL = String(testInfo.project.use.baseURL ?? "")
  const response = await request.post(`${baseURL}/api/v1/login/access-token`, {
    form: {
      username: firstSuperuser,
      password: firstSuperuserPassword,
    },
  })
  expect(response.ok()).toBe(true)
  const body = (await response.json()) as { access_token: string }
  await page.addInitScript((token) => {
    window.localStorage.setItem("access_token", token)
  }, body.access_token)
})

async function waitForResearchFrame(page: Page) {
  await expect(page.locator("h1").first()).toBeVisible()
  const frame = page.locator("[data-research-content-frame]").first()
  await expect(frame).toBeVisible()
  return frame
}

async function findVideoDetailRoute(page: Page) {
  await page.goto("/videos")
  await expect(
    page.getByRole("heading", { name: "蜂群观测档案" }),
  ).toBeVisible()

  const href = await page
    .locator('.archive-record-list a[href^="/videos/"]')
    .first()
    .getAttribute("href")
  return href ?? undefined
}

test("科研页面共享同一 Content Frame 与 Sidebar 坐标", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const detailRoute = await findVideoDetailRoute(page)
  const routes = detailRoute ? [...primaryRoutes, detailRoute] : primaryRoutes
  const frames: Array<{ route: string; left: number; right: number }> = []
  const collapsedToggles: Array<{ route: string; left: number; top: number }> =
    []
  const expandedToggles: Array<{ route: string; left: number; top: number }> =
    []

  for (const route of routes) {
    await page.goto(route)
    const frame = await waitForResearchFrame(page)
    if (route === "/videos") {
      await expect(page.locator(".research-loading-plane")).toHaveCount(0)
      const singleSample = await page
        .locator(".archive-page")
        .getAttribute("data-single-sample")
      await expect(frame).toHaveAttribute(
        "data-research-frame-size",
        singleSample === "" ? "workspace" : "standard",
      )
    } else if (route in frameSizeByRoute) {
      await expect(frame).toHaveAttribute(
        "data-research-frame-size",
        frameSizeByRoute[route as keyof typeof frameSizeByRoute],
      )
    } else {
      await expect(frame).toHaveAttribute(
        "data-research-frame-size",
        "workspace",
      )
    }
    const frameBox = await frame.boundingBox()
    expect(frameBox).not.toBeNull()
    frames.push({
      route,
      left: frameBox?.x ?? 0,
      right: (frameBox?.x ?? 0) + (frameBox?.width ?? 0),
    })

    const toggle = page.locator(".research-sidebar-toggle")
    if ((await toggle.getAttribute("aria-expanded")) === "true") {
      await toggle.click()
      await page.waitForTimeout(350)
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    const collapsedBox = await toggle.boundingBox()
    expect(collapsedBox).not.toBeNull()
    collapsedToggles.push({
      route,
      left: collapsedBox?.x ?? 0,
      top: collapsedBox?.y ?? 0,
    })

    const sidebarGap = page.locator('[data-slot="sidebar-gap"]')
    await expect
      .poll(async () => (await sidebarGap.boundingBox())?.width ?? -1)
      .toBe(0)
    for (const selector of [
      ".observation-sidebar-brand-copy",
      '[data-slot="sidebar-content"]',
      '[data-slot="sidebar-footer"]',
    ]) {
      expect(
        await page.locator(selector).evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return rect.right > 0 && rect.left < window.innerWidth
        }),
      ).toBe(false)
    }

    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await page.waitForTimeout(350)
    await expect(page.locator(".observation-sidebar-brand-copy")).toBeVisible()
    const expandedBox = await toggle.boundingBox()
    expect(expandedBox).not.toBeNull()
    expandedToggles.push({
      route,
      left: expandedBox?.x ?? 0,
      top: expandedBox?.y ?? 0,
    })
    await toggle.click()
    await page.waitForTimeout(350)
  }

  for (const reading of frames.slice(1)) {
    // A vertical scrollbar can shift the percentage-based workspace edge by a
    // few device pixels while preserving the same centered frame strategy.
    expect(Math.abs(reading.left - frames[0].left)).toBeLessThanOrEqual(4)
    expect(Math.abs(reading.right - frames[0].right)).toBeLessThanOrEqual(4)
  }
  for (const readings of [collapsedToggles, expandedToggles]) {
    for (const reading of readings.slice(1)) {
      expect(Math.abs(reading.left - readings[0].left)).toBeLessThanOrEqual(1)
      expect(Math.abs(reading.top - readings[0].top)).toBeLessThanOrEqual(1)
    }
  }
  console.info("RESEARCH_FRAME_COORDINATES", JSON.stringify(frames))
  console.info(
    "SIDEBAR_COLLAPSED_COORDINATES",
    JSON.stringify(collapsedToggles),
  )
  console.info("SIDEBAR_EXPANDED_COORDINATES", JSON.stringify(expandedToggles))
})

test("Light 与 Dark 使用唯一 Research Canvas", async ({ page }, testInfo) => {
  const expectedCanvas = {
    light: "rgb(248, 250, 252)",
    dark: "rgb(31, 37, 43)",
  } as const

  for (const theme of ["light", "dark"] as const) {
    await page.addInitScript((value) => {
      window.localStorage.setItem("vite-ui-theme", value)
    }, theme)

    for (const route of primaryRoutes) {
      await page.goto(route)
      await waitForResearchFrame(page)
      await expect(page.locator("html")).toHaveClass(new RegExp(theme))
      await expect(page.locator(".research-canvas")).toHaveCSS(
        "background-color",
        expectedCanvas[theme],
      )
      if (route === "/" || route === "/tasks" || route === "/results") {
        await page.waitForTimeout(900)
        const routeName = route === "/" ? "home" : route.slice(1)
        await page.screenshot({
          path: testInfo.outputPath(`${theme}-${routeName}.png`),
          fullPage: false,
        })
      }
    }
  }
})

test("Results 保持一体化行为指纹与 task_id 选择", async ({ page }) => {
  await page.goto("/results")
  await waitForResearchFrame(page)

  const empty = page.getByText("暂无分析结果。请先在观测档案创建分析任务。")
  if (await empty.isVisible()) return

  await expect(page.locator(".result-core > div")).toHaveCount(4)
  await expect(page.locator(".fingerprint-instrument")).toBeVisible()
  await expect(page.locator(".fingerprint-instrument")).toHaveCSS(
    "border-top-width",
    "0px",
  )
  await expect(page.locator(".fingerprint-instrument")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  )
  await expect(page.locator(".fingerprint-instrument")).toHaveCSS(
    "border-radius",
    "0px",
  )
  await expect(page.locator(".fingerprint-panel").first()).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  )
  await expect(page.getByRole("heading", { name: "巢门行为" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "活动状态" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "轨迹质量" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "异常信号" })).toBeVisible()

  const firstResult = await page.evaluate(async () => {
    const response = await fetch("/api/v1/results/?skip=0&limit=100", {
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem("access_token")}`,
      },
    })
    const body = (await response.json()) as {
      data: Array<{ id: string; task_id: string }>
    }
    return body.data[0]
  })

  if (firstResult) {
    await page.goto(`/results?task_id=${firstResult.task_id}`)
    await expect(
      page.getByRole("heading", {
        name: `行为结果 ${formatEvidenceId("R", firstResult.id)}`,
      }),
    ).toBeVisible()
  }

  const historicalResults = page.locator(".result-index button")
  if ((await historicalResults.count()) > 1) {
    await historicalResults.nth(1).click()
    await expect(historicalResults.nth(1)).toHaveClass(/is-active/)
  }

  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("/api/v1/results/?skip=0&limit=100"),
    ),
    page.getByRole("button", { name: "刷新分析结果" }).click(),
  ])
})

test("Tasks 保持 Analysis Records 且没有旧表格", async ({ page }) => {
  await page.goto("/tasks")
  await waitForResearchFrame(page)
  await expect(page.getByRole("heading", { name: "分析记录" })).toBeVisible()
  await expect(page.locator(".process-summary > div")).toHaveCount(5)
  await expect(page.locator(".process-page table")).toHaveCount(0)
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true)
})

test("1920 Tasks / Results 横向仪器与正文尺度达标", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/tasks")
  const taskFrame = await waitForResearchFrame(page)
  const taskRecord = page.locator(".process-record").first()
  if (await taskRecord.isVisible()) {
    const recordBox = await taskRecord.boundingBox()
    const timelineBox = await taskRecord
      .locator(".process-record-timeline")
      .boundingBox()
    expect((timelineBox?.width ?? 0) / (recordBox?.width ?? 1)).toBeGreaterThan(
      0.38,
    )
    if ((await page.locator(".process-record").count()) >= 3) {
      const thirdRecord = await page
        .locator(".process-record")
        .nth(2)
        .boundingBox()
      expect(
        (thirdRecord?.y ?? 1081) + (thirdRecord?.height ?? 0),
      ).toBeLessThanOrEqual(1080)
    }
  }
  expect(
    await page
      .locator(".process-header > div > p:last-child")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
  ).toBeGreaterThanOrEqual(16)
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0)

  await page.goto("/results")
  const resultFrame = await waitForResearchFrame(page)
  const chain = page.locator(".result-chain")
  if (await chain.isVisible()) {
    const frameBox = await resultFrame.boundingBox()
    const provenanceBox = await page.locator(".result-provenance").boundingBox()
    const chainBox = await chain.boundingBox()
    expect(
      (provenanceBox?.width ?? 0) / (frameBox?.width ?? 1),
    ).toBeGreaterThan(0.9)
    // The frozen compact provenance rail shares its row with four metadata
    // readings; the V → A → R chain remains the larger left-hand anchor.
    expect(
      (chainBox?.width ?? 0) / (provenanceBox?.width ?? 1),
    ).toBeGreaterThan(0.38)
  }
  expect(
    await page
      .locator(".result-header > div > p:last-child")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
  ).toBeGreaterThanOrEqual(16)
  expect(await taskFrame.getAttribute("data-research-frame-size")).toBe(
    "workspace",
  )
})

test("Desktop Research Typography tokens 已进入最终 computed styles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  const readings: Record<string, Record<string, number>> = {}
  const titleY: number[] = []

  const read = async (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element)
        return Number.parseFloat(style.fontSize)
      })

  await page.goto("/videos")
  await waitForResearchFrame(page)
  readings.videos = {
    pageTitle: await read(".archive-title"),
    sectionTitle: await read(".archive-records-heading h2"),
    body: await read(".archive-description"),
    metadata: await read(".archive-records-note"),
    eyebrow: await read(".archive-kicker"),
  }
  titleY.push((await page.locator(".archive-title").boundingBox())?.y ?? 0)
  if (await page.locator(".archive-evidence-id").first().isVisible()) {
    readings.videos.evidence = await read(".archive-evidence-id")
    readings.videos.recordTitle = await read(".archive-record-id")
    readings.videos.metric = await read(".archive-summary-item strong")
  }

  await page.goto("/tasks")
  await waitForResearchFrame(page)
  readings.tasks = {
    pageTitle: await read(".process-header h1"),
    sectionTitle: await read(".process-section-heading h2"),
    body: await read(".process-header > div > p:last-child"),
    metadata: await read(".process-section-heading > p"),
    eyebrow: await read(".process-header .research-eyebrow"),
    metric: await read(".process-summary strong"),
  }
  titleY.push((await page.locator(".process-header h1").boundingBox())?.y ?? 0)
  if (await page.locator(".process-identity strong").first().isVisible()) {
    readings.tasks.evidence = await read(".process-identity strong")
  }

  await page.goto("/results")
  await waitForResearchFrame(page)
  readings.results = {
    pageTitle: await read(".result-header h1"),
    body: await read(".result-header > div > p:last-child"),
    eyebrow: await read(".result-header .research-eyebrow"),
  }
  titleY.push((await page.locator(".result-header h1").boundingBox())?.y ?? 0)
  if (await page.locator(".fingerprint-instrument").isVisible()) {
    readings.results.sectionTitle = await read(".fingerprint-title h2")
    readings.results.recordTitle = await read(".fingerprint-panel h3")
    readings.results.metadata = await read(".fingerprint-panel header p")
    readings.results.evidence = await read(".result-chain strong")
    readings.results.metric = await read(".result-core strong")
  }

  for (const routeReadings of Object.values(readings)) {
    expect(routeReadings.pageTitle).toBeGreaterThanOrEqual(50)
    expect(routeReadings.pageTitle).toBeLessThanOrEqual(52)
    expect(routeReadings.body).toBeGreaterThanOrEqual(18)
    expect(routeReadings.eyebrow).toBeGreaterThanOrEqual(14)
    expect(routeReadings.eyebrow).toBeLessThanOrEqual(14)
    if (routeReadings.sectionTitle)
      expect(routeReadings.sectionTitle).toBeGreaterThanOrEqual(36)
    if (routeReadings.recordTitle)
      expect(routeReadings.recordTitle).toBeGreaterThanOrEqual(22)
    if (routeReadings.metadata)
      expect(routeReadings.metadata).toBeGreaterThanOrEqual(16)
    if (routeReadings.evidence)
      expect(routeReadings.evidence).toBeGreaterThanOrEqual(22)
    if (routeReadings.metric)
      expect(routeReadings.metric).toBeGreaterThanOrEqual(48)
  }
  expect(Math.max(...titleY) - Math.min(...titleY)).toBeLessThanOrEqual(2)
  console.info("RESEARCH_TYPOGRAPHY_READINGS", JSON.stringify(readings))
  console.info("RESEARCH_HEADER_TITLE_Y", titleY)
})

test("工作页根节点不覆盖 Canvas，Quiet Zone 与 Surface 真实生效", async ({
  page,
}) => {
  const densityByRoute = {
    "/": "balanced",
    "/videos": "archive",
    "/tasks": "process",
    "/results": "result",
  } as const

  for (const theme of ["light", "dark"] as const) {
    await page.addInitScript((value) => {
      window.localStorage.setItem("vite-ui-theme", value)
    }, theme)
    for (const [route, density] of Object.entries(densityByRoute)) {
      await page.goto(route)
      const frame = await waitForResearchFrame(page)
      await expect(frame).toHaveAttribute("data-research-density", density)
      await expect(page.locator(".research-biofield")).toHaveCSS(
        "opacity",
        "0.66",
      )
      const root = page.locator(".research-canvas-content > main")
      await expect(root).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
      expect(
        await page
          .locator(".research-biofield")
          .evaluate((element) => getComputedStyle(element).maskImage),
      ).not.toBe("none")
    }
  }
})

test("Results 在宽屏使用 9/3 一主三辅指纹布局", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/results")
  await waitForResearchFrame(page)
  if (!(await page.locator(".fingerprint-instrument").isVisible())) return
  const widths = await page.evaluate(() => ({
    hive: document.querySelector(".hive-signature")?.getBoundingClientRect()
      .width,
    activity: document.querySelector(".activity-state")?.getBoundingClientRect()
      .width,
    tracking: document
      .querySelector(".tracking-quality")
      ?.getBoundingClientRect().width,
    abnormal: document
      .querySelector(".abnormal-reading")
      ?.getBoundingClientRect().width,
  }))
  expect(widths.hive ?? 0).toBeGreaterThan(widths.activity ?? 0)
  expect((widths.hive ?? 0) / (widths.activity ?? 1)).toBeGreaterThan(2.5)
  expect((widths.tracking ?? 0) / (widths.abnormal ?? 1)).toBeGreaterThan(0.8)
  expect((widths.tracking ?? 0) / (widths.abnormal ?? 1)).toBeLessThan(1.2)
  console.info("RESULT_FINGERPRINT_WIDTHS", widths)
})

test("Tasks 四种真实状态使用不同 process line 语义", async ({ page }) => {
  const now = "2026-08-28T10:00:00Z"
  const task = (id: string, status: string, progress: number) => ({
    id,
    video_id: "00000000-0000-4000-8000-000000000099",
    owner_id: "00000000-0000-4000-8000-000000000098",
    task_type: "behavior_analysis",
    status,
    progress,
    model_name: "baseline-v1",
    error_message: status === "FAILED" ? "真实模型输出不可用" : null,
    created_at: now,
    started_at: status === "PENDING" ? null : now,
    completed_at: ["COMPLETED", "FAILED"].includes(status) ? now : null,
  })
  await page.route("**/api/v1/tasks/?skip=0&limit=100", (route) =>
    route.fulfill({
      json: {
        data: [
          task("00000000-0000-4000-8000-000000000001", "COMPLETED", 100),
          task("00000000-0000-4000-8000-000000000002", "PROCESSING", 65),
          task("00000000-0000-4000-8000-000000000003", "FAILED", 50),
          task("00000000-0000-4000-8000-000000000004", "PENDING", 0),
        ],
        count: 4,
      },
    }),
  )
  let reanalysisCalls = 0
  let deleteCalls = 0
  await page.route("**/api/v1/tasks/", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    reanalysisCalls += 1
    return route.fulfill({ json: { id: "mock-reanalysis" } })
  })
  await page.route(
    "**/api/v1/tasks/00000000-0000-4000-8000-000000000001",
    async (route) => {
      if (route.request().method() !== "DELETE") return route.fallback()
      deleteCalls += 1
      return route.fulfill({ status: 204, body: "" })
    },
  )
  page.on("dialog", (dialog) => dialog.accept())
  await page.goto("/tasks")
  await waitForResearchFrame(page)
  for (const status of ["complete", "processing", "failed", "pending"]) {
    await expect(
      page.locator(`.process-record[data-status="${status}"]`),
    ).toBeVisible()
  }
  const recordColumns = await page
    .locator(".process-record-grid")
    .first()
    .evaluate((element) =>
      getComputedStyle(element)
        .gridTemplateColumns.split(" ")
        .map((value) => Number.parseFloat(value)),
    )
  expect(recordColumns).toHaveLength(3)
  expect(recordColumns[1] / recordColumns[0]).toBeGreaterThan(2.2)
  expect(recordColumns[2] / recordColumns[0]).toBeGreaterThan(0.85)
  expect(recordColumns[2] / recordColumns[0]).toBeLessThan(1.15)
  expect(
    await page
      .locator('.process-record[data-status="failed"] .process-track-line span')
      .nth(1)
      .evaluate((element) => getComputedStyle(element, "::after").content),
  ).toContain("×")
  await expect(
    page.locator('.process-record[data-status="failed"] .process-status p'),
  ).toHaveText("真实模型输出不可用")
  expect(
    await page
      .locator('.process-record[data-status="pending"] .process-track-line')
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element, "::after").width),
      ),
  ).toBe(0)

  const completed = page.locator('.process-record[data-status="complete"]')
  await completed.getByRole("button", { name: "更多任务操作" }).click()
  await expect(
    completed.getByRole("button", { name: "重新分析" }),
  ).toBeVisible()
  await expect(completed.getByRole("button", { name: "删除" })).toBeVisible()
  await completed.getByRole("button", { name: "重新分析" }).click()
  await expect.poll(() => reanalysisCalls).toBe(1)

  const moreActions = completed.getByRole("button", {
    name: "更多任务操作",
  })
  if ((await moreActions.getAttribute("aria-expanded")) !== "true") {
    await moreActions.click()
  }
  await completed.getByRole("button", { name: "删除" }).click()
  await expect.poll(() => deleteCalls).toBe(1)
  await expect(
    page.locator(
      '.process-record[data-status="processing"] button[aria-label="更多任务操作"]',
    ),
  ).toHaveCount(0)
  await expect(
    page.locator(
      '.process-record[data-status="pending"] button[aria-label="更多任务操作"]',
    ),
  ).toHaveCount(0)
})

test("Workspace 在 1600 / 1920 / 2848 展开 Sidebar 后占据目标主区", async ({
  page,
}) => {
  for (const viewport of [1600, 1920, 2848]) {
    await page.setViewportSize({ width: viewport, height: 1000 })
    await page.goto("/tasks")
    const frame = await waitForResearchFrame(page)
    const toggle = page.locator(".research-sidebar-toggle")
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await toggle.click()
      await page.waitForTimeout(350)
    }
    const mainBox = await page.locator(".research-shell-main").boundingBox()
    const frameBox = await frame.boundingBox()
    expect(mainBox).not.toBeNull()
    expect(frameBox).not.toBeNull()
    const ratio = (frameBox?.width ?? 0) / (mainBox?.width ?? 1)
    expect(ratio).toBeGreaterThanOrEqual(viewport === 2848 ? 0.82 : 0.88)
    expect(ratio).toBeLessThanOrEqual(0.94)
    console.info("WORKSPACE_WIDTH_RATIO", {
      viewport,
      frameWidth: frameBox?.width,
      availableMainWidth: mainBox?.width,
      ratio,
    })
  }
})

test("Desktop Sidebar 与核心页面使用真实 available main width", async ({
  page,
}) => {
  const readings: Array<Record<string, number | string>> = []
  for (const viewport of [1920, 2848]) {
    await page.setViewportSize({ width: viewport, height: 1080 })
    for (const route of primaryRoutes) {
      await page.goto(route)
      const frame = await waitForResearchFrame(page)
      const toggle = page.locator(".research-sidebar-toggle")
      if ((await toggle.getAttribute("aria-expanded")) !== "true") {
        await toggle.click()
        await page.waitForTimeout(350)
      }
      const sidebar = await page
        .locator('[data-slot="sidebar-container"]')
        .boundingBox()
      const main = await page.locator(".research-shell-main").boundingBox()
      const content = await frame.boundingBox()
      const nav = page.locator('[data-sidebar="menu-button"]').first()
      const icon = nav.locator("svg").first()
      expect(sidebar?.width ?? 0).toBeGreaterThanOrEqual(208)
      expect(sidebar?.width ?? 0).toBeLessThanOrEqual(216)
      await expect(nav).toHaveCSS(
        "font-size",
        viewport === 2848 ? "17px" : "16px",
      )
      expect((await nav.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(
        viewport === 2848 ? 48 : 46,
      )
      expect((await icon.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(18)
      expect(
        Math.abs((main?.width ?? 0) - (viewport - (sidebar?.width ?? 0))),
      ).toBeLessThanOrEqual(1)
      const ratio = (content?.width ?? 0) / (main?.width ?? 1)
      const isStandard =
        (await frame.getAttribute("data-research-frame-size")) === "standard"
      if (viewport === 2848) {
        expect(ratio).toBeGreaterThanOrEqual(0.82)
        expect(ratio).toBeLessThanOrEqual(0.9)
      } else if (isStandard) {
        expect(ratio).toBeGreaterThanOrEqual(0.78)
        expect(ratio).toBeLessThanOrEqual(0.86)
      } else {
        expect(ratio).toBeGreaterThanOrEqual(0.9)
        expect(ratio).toBeLessThanOrEqual(0.94)
      }
      readings.push({
        viewport,
        route,
        sidebar: sidebar?.width ?? 0,
        availableMain: main?.width ?? 0,
        content: content?.width ?? 0,
        ratio,
      })
    }
  }
  console.info("CORE_WORKSPACE_READINGS", JSON.stringify(readings))
})

test("1920 收起 Sidebar 后 workspace 仍保持宽屏利用率", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/tasks")
  const frame = await waitForResearchFrame(page)
  const toggle = page.locator(".research-sidebar-toggle")
  if ((await toggle.getAttribute("aria-expanded")) === "true") {
    await toggle.click()
    await page.waitForTimeout(350)
  }
  const mainBox = await page.locator(".research-shell-main").boundingBox()
  const frameBox = await frame.boundingBox()
  const ratio = (frameBox?.width ?? 0) / (mainBox?.width ?? 1)
  expect(ratio).toBeGreaterThanOrEqual(0.9)
  expect(ratio).toBeLessThanOrEqual(0.94)
  console.info("WORKSPACE_COLLAPSED_WIDTH_RATIO", {
    viewport: 1920,
    frameWidth: frameBox?.width,
    availableMainWidth: mainBox?.width,
    ratio,
  })
})

test("路由连续切换保持 Shell 常驻且主体不进入空白态", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto("/")
  await waitForResearchFrame(page)
  const toggle = page.locator(".research-sidebar-toggle")
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click()
    await page.waitForTimeout(350)
  }

  await page.evaluate(() => {
    const auditWindow = window as Window & {
      __researchRouteAudit?: {
        shell: Element | null
        host: Element | null
        sidebar: Element | null
      }
    }
    auditWindow.__researchRouteAudit = {
      shell: document.querySelector("[data-research-page-shell]"),
      host: document.querySelector("[data-research-route-host]"),
      sidebar: document.querySelector('[data-slot="sidebar"]'),
    }
  })

  const transitionReadings: Array<{
    route: string
    minimumOpacity: number
    missingMainSamples: number
    loadingSamples: number
  }> = []

  async function followRoute(action: () => Promise<void>) {
    await page.evaluate(() => {
      const auditWindow = window as Window & {
        __researchTransitionSamples?: Array<{
          opacity: number
          hasMain: boolean
          loading: boolean
        }>
      }
      auditWindow.__researchTransitionSamples = []
      const startedAt = performance.now()
      const sample = () => {
        const main = document.querySelector<HTMLElement>(
          ".research-canvas-content > main",
        )
        auditWindow.__researchTransitionSamples?.push({
          opacity: main ? Number.parseFloat(getComputedStyle(main).opacity) : 0,
          hasMain: Boolean(main && main.childElementCount > 0),
          loading: Boolean(
            document.querySelector("[data-route-loading-skeleton]"),
          ),
        })
        if (performance.now() - startedAt < 700) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })

    await action()
    await expect(page.locator(".research-canvas-content > main")).toBeVisible()
    await page.waitForTimeout(750)

    const reading = await page.evaluate(() => {
      const auditWindow = window as Window & {
        __researchRouteAudit?: {
          shell: Element | null
          host: Element | null
          sidebar: Element | null
        }
        __researchTransitionSamples?: Array<{
          opacity: number
          hasMain: boolean
          loading: boolean
        }>
      }
      const stable = auditWindow.__researchRouteAudit
      if (
        stable?.shell !==
          document.querySelector("[data-research-page-shell]") ||
        stable?.host !== document.querySelector("[data-research-route-host]") ||
        stable?.sidebar !== document.querySelector('[data-slot="sidebar"]')
      ) {
        throw new Error("Research shell remounted during route transition")
      }
      const samples = auditWindow.__researchTransitionSamples ?? []
      return {
        route: window.location.pathname,
        minimumOpacity: Math.min(...samples.map((sample) => sample.opacity)),
        missingMainSamples: samples.filter((sample) => !sample.hasMain).length,
        loadingSamples: samples.filter((sample) => sample.loading).length,
      }
    })
    transitionReadings.push(reading)
  }

  await followRoute(() =>
    page.getByRole("link", { name: "分析任务", exact: true }).click(),
  )
  const taskDetailLink = page.locator(".process-primary-action").first()
  await expect(taskDetailLink).toBeVisible()
  await followRoute(() => taskDetailLink.click())
  await followRoute(() =>
    page.getByRole("link", { name: "返回", exact: true }).click(),
  )
  await followRoute(() =>
    page.getByRole("link", { name: "分析结果", exact: true }).click(),
  )
  await followRoute(() =>
    page.getByRole("link", { name: "观测档案", exact: true }).click(),
  )
  const detailLink = page.locator('.archive-filename[href^="/videos/"]').first()
  await expect(detailLink).toBeVisible()
  await followRoute(() => detailLink.click())

  for (const reading of transitionReadings) {
    expect(
      reading.minimumOpacity,
      `${reading.route} 主体透明度过低`,
    ).toBeGreaterThanOrEqual(0.8)
    expect(reading.missingMainSamples, `${reading.route} 出现主体空白`).toBe(0)
  }
  console.info("ROUTE_TRANSITION_READINGS", JSON.stringify(transitionReadings))
})

test("2848 / 1920 Light / Dark 核心工作区截图", async ({ page }, testInfo) => {
  for (const viewport of [2848, 1920]) {
    await page.setViewportSize({ width: viewport, height: 1080 })
    for (const theme of ["light", "dark"] as const) {
      await page.addInitScript((value) => {
        window.localStorage.setItem("vite-ui-theme", value)
      }, theme)
      const routes = [
        ["/", "home"],
        ["/videos", "videos"],
        ["/tasks", "tasks"],
        ["/results", "results"],
      ] as const
      for (const [route, name] of routes) {
        await page.goto(route)
        await waitForResearchFrame(page)
        const sidebarToggle = page.getByRole("button", {
          name: /展开导航|收起导航/,
        })
        if ((await sidebarToggle.getAttribute("aria-expanded")) !== "true") {
          await sidebarToggle.click()
          await page.waitForTimeout(350)
        }
        await page.waitForTimeout(900)
        await page.screenshot({
          path: testInfo.outputPath(`${viewport}-${theme}-${name}.png`),
          fullPage: false,
        })
      }
    }
  }

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/")
  await waitForResearchFrame(page)
  const sidebarToggle = page.locator(".research-sidebar-toggle")
  if ((await sidebarToggle.getAttribute("aria-expanded")) === "true") {
    await sidebarToggle.click()
    await page.waitForTimeout(350)
  }
  await page.screenshot({
    path: testInfo.outputPath("1920-dark-home-sidebar-collapsed.png"),
    fullPage: false,
  })
})

test("Premium Instrument Composition 弱化非语义 divider", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })

  await page.goto("/")
  await waitForResearchFrame(page)
  await expect(page.locator(".observation-state-block")).toHaveCSS(
    "border-right-width",
    "0px",
  )
  await expect(page.locator(".analysis-deck-header")).toHaveCSS(
    "border-bottom-width",
    "0px",
  )
  await expect(page.locator(".analysis-zone--hive")).toHaveCSS(
    "border-left-width",
    "0px",
  )

  await page.goto("/tasks")
  await waitForResearchFrame(page)
  await expect(page.locator(".process-header")).toHaveCSS(
    "border-bottom-width",
    "0px",
  )
  await expect(page.locator(".process-summary")).toHaveCSS(
    "border-top-width",
    "0px",
  )
  await expect(page.locator(".process-summary > div").nth(1)).toHaveCSS(
    "border-left-width",
    "0px",
  )

  await page.goto("/results")
  await waitForResearchFrame(page)
  await expect(page.locator(".result-provenance")).toHaveCSS(
    "border-top-width",
    "0px",
  )
  await expect(page.locator(".activity-state")).toHaveCSS(
    "border-left-width",
    "0px",
  )
  await expect(page.locator(".tracking-quality")).toHaveCSS(
    "border-top-width",
    "0px",
  )

  await page.goto("/videos")
  await waitForResearchFrame(page)
  await expect(page.locator(".archive-summary-strip")).toHaveCSS(
    "border-top-width",
    "0px",
  )
  await expect(page.locator(".archive-metadata").first()).toHaveCSS(
    "border-top-width",
    "0px",
  )
})

test("Videos 单样本使用宽屏密度，多样本恢复 archive 密度", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/videos")
  await waitForResearchFrame(page)

  const records = page.locator(".archive-plate")
  if ((await records.count()) === 1) {
    await expect(page.locator(".archive-page")).toHaveAttribute(
      "data-single-sample",
      "",
    )
    await expect(page.locator(".archive-shell")).toHaveAttribute(
      "data-research-frame-size",
      "workspace",
    )
    const preview = await page.locator(".archive-plate-preview").boundingBox()
    expect(preview?.width ?? 0).toBeGreaterThanOrEqual(420)
    expect(preview?.width ?? 0).toBeLessThanOrEqual(480.5)
  }

  await page.route("**/api/v1/videos/?skip=0&limit=100", async (route) => {
    const response = await route.fetch()
    const body = (await response.json()) as {
      data: Array<Record<string, unknown>>
      count: number
    }
    if (body.data.length === 0) return route.fulfill({ response })
    const source = body.data[0]
    const duplicate = {
      ...source,
      id: "00000000-0000-4000-8000-000000000002",
      original_filename: `archive-density-${String(source.original_filename)}`,
    }
    return route.fulfill({
      response,
      json: { data: [source, duplicate], count: 2 },
    })
  })
  await page.reload()
  await waitForResearchFrame(page)
  await expect(page.locator(".archive-plate")).toHaveCount(2)
  await expect(page.locator(".archive-page")).not.toHaveAttribute(
    "data-single-sample",
    "",
  )
  await expect(page.locator(".archive-shell")).toHaveAttribute(
    "data-research-frame-size",
    "standard",
  )
  const compactPreview = await page
    .locator(".archive-plate-preview")
    .first()
    .boundingBox()
  expect(compactPreview?.width ?? 999).toBeLessThanOrEqual(340.5)
})

test("Videos 与 Video Detail 核心入口保持可用", async ({ page }) => {
  await page.goto("/videos")
  await waitForResearchFrame(page)

  const outdoorFilter = page.getByRole("button", {
    name: "户外可见光",
    exact: true,
  })
  await outdoorFilter.click()
  await expect(outdoorFilter).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "全部", exact: true }).click()

  const firstFilename = await page
    .locator(".archive-filename")
    .first()
    .textContent()
  if (!firstFilename) return
  const search = page.getByPlaceholder("检索观测文件")
  await search.fill(firstFilename)
  await expect(page.locator(".archive-plate")).toHaveCount(1)
  await search.fill("")

  await page.getByRole("button", { name: "上传观测视频" }).click()
  await expect(
    page.getByRole("heading", { name: "上传观测视频" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "取消" }).click()

  const resultLink = page.locator(".archive-result-link").first()
  if (await resultLink.isVisible()) {
    await resultLink.click()
    await expect(page).toHaveURL(/\/results\?task_id=/)
    await page.goBack()
    await waitForResearchFrame(page)
  }

  await page.getByRole("button", { name: "查看观测" }).first().click()
  await expect(page).toHaveURL(/\/videos\/[0-9a-f-]+$/)
  await waitForResearchFrame(page)
  await expect(page.locator(".video-detail-video")).toHaveAttribute("controls")
  await expect(page.getByRole("link", { name: "返回观测档案" })).toBeVisible()
  const detailResult = page.getByRole("link", { name: "查看结果" }).first()
  if (await detailResult.isVisible()) {
    await expect(detailResult).toHaveAttribute("href", /\/results\?task_id=/)
  }

  let analyzeCalls = 0
  await page.route("**/api/v1/tasks/", async (route) => {
    if (route.request().method() !== "POST") return route.fallback()
    analyzeCalls += 1
    return route.fulfill({ json: { id: "mock-video-detail-analysis" } })
  })
  page.on("dialog", (dialog) => dialog.accept())
  const analyze = page.getByRole("button", {
    name: /重新分析|开始分析/,
  })
  if ((await analyze.isVisible()) && (await analyze.isEnabled())) {
    await analyze.click()
    await expect.poll(() => analyzeCalls).toBe(1)
  }
  await page.getByRole("link", { name: "返回观测档案" }).click()
  await expect(page).toHaveURL(/\/videos$/)
})

test("Tasks 与 Results 动效按偏好进入最终可读状态", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/tasks")
  await waitForResearchFrame(page)
  const firstRecord = page.locator(".process-record").first()
  if (await firstRecord.isVisible()) {
    await expect(firstRecord).toHaveClass(/is-revealed/)
    await expect(page.locator(".process-page")).toHaveClass(
      /research-motion-ready/,
    )
  }

  await page.goto("/results")
  await waitForResearchFrame(page)
  const fingerprint = page.locator(".fingerprint-instrument")
  if (await fingerprint.isVisible()) {
    const delays = await page
      .locator("[data-research-sequence]")
      .evaluateAll((elements) =>
        elements.map(
          (element) =>
            Number.parseFloat(getComputedStyle(element).transitionDelay) || 0,
        ),
      )
    expect(delays).toEqual([...delays].sort((a, b) => a - b))
  }

  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/results")
  await waitForResearchFrame(page)
  if (await page.locator(".fingerprint-instrument").isVisible()) {
    await expect(page.locator(".result-page")).toHaveClass(
      /research-motion-reduced/,
    )
    await expect(page.locator("[data-research-sequence]").first()).toHaveCSS(
      "opacity",
      "1",
    )
  }
})

test("Portrait Observation Well 保持 560–620px 媒体高度", async ({ page }) => {
  const detailRoute = await findVideoDetailRoute(page)
  if (!detailRoute) return
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(detailRoute)
  await waitForResearchFrame(page)
  const workstation = page.locator(".video-detail-workstation")
  await expect(page.locator(".video-detail-video")).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.locator(".video-detail-video")).toHaveAttribute("controls")
  await expect
    .poll(() => workstation.getAttribute("data-media-orientation"), {
      timeout: 20_000,
    })
    .not.toBeNull()
  if ((await workstation.getAttribute("data-media-orientation")) !== "portrait")
    return
  const videoBox = await page.locator(".video-detail-video").boundingBox()
  expect(videoBox).not.toBeNull()
  expect(videoBox?.height ?? 0).toBeGreaterThanOrEqual(560)
  expect(videoBox?.height ?? 0).toBeLessThanOrEqual(620)
})

for (const theme of ["light", "dark"] as const) {
  for (const viewport of [2848, 1920, 1600, 1440, 1024, 768, 375]) {
    test(`${theme} ${viewport}px 科研页无横向溢出`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width: viewport, height: 900 })
      await page.addInitScript((value) => {
        window.localStorage.setItem("vite-ui-theme", value)
      }, theme)

      const detailRoute = await findVideoDetailRoute(page)
      const routes = detailRoute
        ? [...primaryRoutes, detailRoute]
        : primaryRoutes

      for (const route of routes) {
        await page.goto(route)
        await waitForResearchFrame(page)
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
          `${route} 在 ${viewport}px / ${theme} 下发生横向溢出`,
        ).toBe(true)
      }
    })
  }
}
