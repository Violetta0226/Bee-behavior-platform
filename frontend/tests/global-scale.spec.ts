import fs from "node:fs"
import path from "node:path"
import { expect, type Locator, type Page, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config"

const phase = process.env.SCALE_AUDIT_PHASE ?? "after"
const backendURL = process.env.SCALE_AUDIT_BACKEND_URL ?? "http://backend:8000"
const outputRoot = path.resolve(
  process.cwd(),
  process.env.SCALE_AUDIT_OUTPUT ?? "test-results/global-scale-audit",
  phase,
)
const mockVideoId = "00000000-0000-4000-8000-000000000024"
const mockOwnerId = "00000000-0000-4000-8000-000000000001"
const mockTaskIds = [
  "00000000-0000-4000-8000-000000000006",
  "00000000-0000-4000-8000-000000000007",
  "00000000-0000-4000-8000-000000000008",
  "00000000-0000-4000-8000-000000000009",
]
const mockResultId = "00000000-0000-4000-8000-000000000012"

const mockVideo = {
  id: mockVideoId,
  original_filename: "hive-gate-observation-2026-08-16.mp4",
  scene_type: "OUTDOOR",
  file_size: 128_450_560,
  content_type: "video/mp4",
  status: "COMPLETED",
  owner_id: mockOwnerId,
  created_at: "2026-08-16T14:21:00Z",
}

const mockTasks = mockTaskIds.map((id, index) => ({
  id,
  video_id: mockVideoId,
  owner_id: mockOwnerId,
  task_type: "behavior_analysis",
  status: ["COMPLETED", "PROCESSING", "PENDING", "FAILED"][index],
  progress: [100, 68, 0, 42][index],
  model_name: "baseline-v1",
  error_message: index === 3 ? "轨迹连续性不足，等待复核" : null,
  created_at: `2026-08-${String(16 - index).padStart(2, "0")}T14:21:00Z`,
  started_at: index === 2 ? null : "2026-08-16T14:22:00Z",
  completed_at: index === 0 || index === 3 ? "2026-08-16T14:26:00Z" : null,
}))

const mockResult = {
  id: mockResultId,
  task_id: mockTaskIds[0],
  video_id: mockVideoId,
  owner_id: mockOwnerId,
  detected_individuals: 126,
  valid_tracks: 84,
  entry_count: 32,
  exit_count: 29,
  average_speed: 0.73,
  activity_index: 0.73,
  abnormal_event_count: 2,
  metrics_json: null,
  result_video_path: null,
  result_json_path: null,
  created_at: "2026-08-16T14:27:00Z",
}

type Box = { x: number; y: number; width: number; height: number }

type RouteReading = {
  route: string
  viewportWidth: number
  viewportHeight: number
  sidebarWidth: number | null
  mainWidth: number | null
  contentWidth: number | null
  contentMainRatio: number | null
  pageTitle: number | null
  sectionTitle: number | null
  recordTitle: number | null
  body: number | null
  metadata: number | null
  eyebrow: number | null
  evidenceId: number | null
  metric: number | null
  action: number | null
  sidebarNavigation: number | null
  sidebarBrand: number | null
  buttonHeight: number | null
  inputHeight: number | null
  fullyVisibleTaskRecords: number | null
  taskRecord: Box | null
  hiveSignature: Box | null
  hiveSignatureCore: Box | null
  videoPreview: Box | null
  loginForm: Box | null
}

const routeSelectors: Record<
  string,
  {
    body?: string
    metadata?: string
    evidenceId?: string
    metric?: string
    action?: string
    input?: string
  }
> = {
  "/": {
    body: ".observation-state-note",
    metadata: ".observation-topline-meta",
    evidenceId: ".observation-evidence-copy > strong",
    metric: ".observation-reading-value > strong",
    action: ".observation-page-link",
  },
  "/videos": {
    body: ".archive-description",
    metadata: ".archive-records-note",
    evidenceId: ".archive-evidence-id",
    metric: ".archive-summary-item strong",
    action: ".archive-upload-button",
    input: ".archive-search-field",
  },
  "/tasks": {
    body: ".process-header > div > p:last-child",
    metadata: ".process-section-heading > p",
    evidenceId: ".process-identity strong",
    metric: ".process-summary strong",
    action: ".process-primary-action",
  },
  "/results": {
    body: ".result-header > div > p:last-child",
    metadata: ".fingerprint-panel header p",
    evidenceId: ".result-chain strong",
    metric: ".result-core strong",
    action: ".result-header .research-icon-action",
  },
  "/login": {
    body: ".auth-form-heading p",
    metadata: ".auth-form-surface [data-slot='form-label']",
    action: ".auth-submit",
    input: ".auth-field",
  },
}

test.beforeEach(async ({ page, request }) => {
  test.setTimeout(180_000)
  const response = await request.post(
    `${backendURL}/api/v1/login/access-token`,
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
    if (window.location.pathname === "/login") {
      window.localStorage.removeItem("access_token")
      return
    }
    window.localStorage.setItem("access_token", token)
  }, body.access_token)

  await page.route("**/api/v1/videos/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: [mockVideo], count: 1 } }),
  )
  await page.route("**/api/v1/tasks/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: mockTasks, count: mockTasks.length } }),
  )
  await page.route("**/api/v1/results/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: [mockResult], count: 1 } }),
  )
  await page.route(`**/api/v1/videos/${mockVideoId}`, (route) =>
    route.fulfill({ json: mockVideo }),
  )
  await page.route(`**/api/v1/videos/${mockVideoId}/file`, (route) =>
    route.fulfill({ status: 404, body: "audit placeholder" }),
  )
})

async function firstVisible(page: Page, selector?: string) {
  if (!selector) return null
  const candidates = page.locator(selector)
  for (let index = 0; index < (await candidates.count()); index += 1) {
    const candidate = candidates.nth(index)
    if (await candidate.isVisible()) return candidate
  }
  return null
}

async function fontSize(locator: Locator | null) {
  if (!locator) return null
  return locator.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).fontSize),
  )
}

async function box(locator: Locator | null): Promise<Box | null> {
  if (!locator) return null
  return locator.boundingBox()
}

async function openSidebar(page: Page) {
  const toggle = page.locator(".research-sidebar-toggle")
  if (!(await toggle.isVisible())) return
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await page.waitForTimeout(360)
  }
}

async function readRoute(page: Page, route: string): Promise<RouteReading> {
  await page.goto(route)
  await expect(page.locator("h1").first()).toBeVisible()
  const isLogin = route === "/login"
  if (!isLogin) {
    await expect(
      page.locator("[data-research-content-frame]").first(),
    ).toBeVisible()
    await openSidebar(page)
  }

  const selectors = routeSelectors[route] ?? {
    body: ".video-detail-description",
    metadata: ".video-detail-scene",
    evidenceId: ".video-detail-record-id",
    action: ".video-detail-button--primary",
  }
  const sidebar = isLogin
    ? null
    : page.locator('[data-slot="sidebar-gap"]').first()
  const main = isLogin ? null : page.locator(".research-shell-main").first()
  const content = isLogin
    ? null
    : page.locator("[data-research-content-frame]").first()
  const mainBox = await box(main)
  const contentBox = await box(content)
  const action = await firstVisible(page, selectors.action)
  const input = await firstVisible(page, selectors.input)

  return {
    route,
    viewportWidth: await page.evaluate(() => window.innerWidth),
    viewportHeight: await page.evaluate(() => window.innerHeight),
    sidebarWidth: (await box(sidebar))?.width ?? null,
    mainWidth: mainBox?.width ?? null,
    contentWidth: contentBox?.width ?? null,
    contentMainRatio:
      mainBox && contentBox ? contentBox.width / mainBox.width : null,
    pageTitle: await fontSize(await firstVisible(page, "h1")),
    sectionTitle: await fontSize(await firstVisible(page, "h2")),
    recordTitle: await fontSize(
      await firstVisible(
        page,
        ".process-identity strong, .fingerprint-panel h3, .archive-record-id, .video-detail-record-id",
      ),
    ),
    body: await fontSize(await firstVisible(page, selectors.body)),
    metadata: await fontSize(await firstVisible(page, selectors.metadata)),
    eyebrow: await fontSize(
      await firstVisible(
        page,
        ".research-eyebrow, .archive-kicker, .video-detail-kicker",
      ),
    ),
    evidenceId: await fontSize(await firstVisible(page, selectors.evidenceId)),
    metric: await fontSize(await firstVisible(page, selectors.metric)),
    action: await fontSize(action),
    sidebarNavigation: await fontSize(
      await firstVisible(
        page,
        '.observation-sidebar-container [data-sidebar="menu-button"]',
      ),
    ),
    sidebarBrand: await fontSize(
      await firstVisible(
        page,
        ".observation-sidebar-brand-copy > p:first-child",
      ),
    ),
    buttonHeight: (await box(action))?.height ?? null,
    inputHeight: (await box(input))?.height ?? null,
    fullyVisibleTaskRecords:
      route === "/tasks"
        ? await page.locator(".process-record").evaluateAll(
            (elements) =>
              elements.filter((element) => {
                const rect = element.getBoundingClientRect()
                return rect.top >= 0 && rect.bottom <= window.innerHeight
              }).length,
          )
        : null,
    taskRecord: await box(await firstVisible(page, ".process-record")),
    hiveSignature: await box(await firstVisible(page, ".hive-signature")),
    hiveSignatureCore: await box(
      await firstVisible(page, ".mini-hive-signature"),
    ),
    videoPreview: await box(
      await firstVisible(page, ".video-detail-video-stage"),
    ),
    loginForm: await box(await firstVisible(page, ".auth-form-surface")),
  }
}

test("1910x944 全局尺度、真实环境与截图", async ({ page }) => {
  fs.mkdirSync(outputRoot, { recursive: true })
  await page.setViewportSize({ width: 1910, height: 944 })
  const detailRoute = `/videos/${mockVideoId}`
  const routes = ["/", "/videos", "/tasks", "/results"]
  routes.push(detailRoute)
  routes.push("/login")

  const readings: RouteReading[] = []
  const screenshots: string[] = []
  for (const theme of ["light", "dark"] as const) {
    await page.addInitScript((value) => {
      window.localStorage.setItem("vite-ui-theme", value)
    }, theme)
    const themeRoutes = theme === "light" ? routes : ["/", "/tasks", "/results"]
    for (const route of themeRoutes) {
      const reading = await readRoute(page, route)
      if (theme === "light") readings.push(reading)
      const routeName =
        route === "/"
          ? "home"
          : route.startsWith("/videos/")
            ? "video-detail"
            : route.slice(1)
      const screenshotPath = path.join(
        outputRoot,
        `1910x944-${theme}-${routeName}.png`,
      )
      await page.screenshot({ path: screenshotPath, fullPage: false })
      screenshots.push(screenshotPath)
    }
  }

  await page.addInitScript(() => {
    window.localStorage.setItem("vite-ui-theme", "light")
  })
  await page.goto("/tasks")
  await expect(page.locator("h1").first()).toBeVisible()
  await expect(page.locator(".process-record").first()).toBeVisible()
  await page.waitForTimeout(900)
  const environment = await page.evaluate(() => {
    const selectors = [
      "html",
      "body",
      "#root",
      '[data-slot="sidebar-wrapper"]',
      '[data-slot="sidebar-inset"]',
      ".research-shell-main",
      "[data-research-page-shell]",
      "[data-research-route-host]",
      "[data-research-content-frame]",
    ]
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      nodes: selectors.map((selector) => {
        const element = document.querySelector(selector)
        if (!(element instanceof HTMLElement))
          return { selector, missing: true }
        const style = getComputedStyle(element)
        return {
          selector,
          fontSize: style.fontSize,
          zoom: style.zoom,
          transform: style.transform,
          scale: style.scale,
          width: element.getBoundingClientRect().width,
        }
      }),
    }
  })

  const payload = { phase, environment, readings, screenshots }
  fs.writeFileSync(
    path.join(outputRoot, "measurements-1910x944.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  )
  console.info("GLOBAL_SCALE_1910", JSON.stringify(payload))
})

test("断点 1799→1800 与桌面宽度档", async ({ page }) => {
  fs.mkdirSync(outputRoot, { recursive: true })
  const viewports = [
    { width: 1600, height: 900 },
    { width: 1680, height: 1050 },
    { width: 1799, height: 944 },
    { width: 1800, height: 944 },
    { width: 1910, height: 944 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 2848, height: 1500 },
  ]
  const readings = []
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto("/tasks")
    await expect(page.locator("h1").first()).toBeVisible()
    await expect(page.locator(".process-record").first()).toBeVisible()
    readings.push(
      await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement)
        const read = (selector: string) => {
          const element = document.querySelector(selector)
          return element
            ? Number.parseFloat(getComputedStyle(element).fontSize)
            : null
        }
        return {
          width: window.innerWidth,
          height: window.innerHeight,
          pageTitle: read(".process-header h1"),
          body: read(".process-header > div > p:last-child"),
          metadata: read(".process-section-heading > p"),
          evidenceId: read(".process-identity strong"),
          metric: read(".process-summary strong"),
          pageTitleToken: root.getPropertyValue("--research-page-title").trim(),
          bodyToken: root.getPropertyValue("--research-body").trim(),
          metadataToken: root.getPropertyValue("--research-meta").trim(),
        }
      }),
    )
  }
  fs.writeFileSync(
    path.join(outputRoot, "breakpoints.json"),
    `${JSON.stringify({ phase, readings }, null, 2)}\n`,
  )
  console.info("GLOBAL_SCALE_BREAKPOINTS", JSON.stringify(readings))
})
