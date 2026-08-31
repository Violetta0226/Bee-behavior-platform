import fs from "node:fs"
import path from "node:path"
import { expect, type Locator, type Page, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config"

const viewport = { width: 1914, height: 960 }
const phase = process.env.INTEGRATED_TRUTH_PHASE ?? "before"
const outputRoot = path.resolve(
  process.cwd(),
  "integrated-truth-evidence",
  phase,
)

type Rect = {
  x: number
  y: number
  width: number
  height: number
  bottom: number
  visibleInViewport: boolean
}

async function rect(locator: Locator): Promise<Rect | null> {
  if ((await locator.count()) === 0) return null
  const box = await locator.first().boundingBox()
  if (!box) return null
  const bottom = box.y + box.height
  return {
    ...box,
    bottom,
    visibleInViewport: box.y >= 0 && bottom < viewport.height,
  }
}

async function saveScreenshot(page: Page, name: string) {
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(outputRoot, `1914x960-light-${name}.png`),
    fullPage: false,
  })
}

async function waitForPage(page: Page) {
  await page.waitForLoadState("domcontentloaded")
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 30_000 })
  await page
    .locator(".research-loading-plane")
    .waitFor({
      state: "detached",
      timeout: 30_000,
    })
    .catch(() => undefined)
  await page.waitForTimeout(700)
}

async function expandSidebar(page: Page) {
  const toggle = page.locator(".research-sidebar-toggle")
  if ((await toggle.count()) > 0) {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await toggle.click()
      await page.waitForTimeout(250)
    }
  }
}

test("integrated Docker UI truth audit", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(180_000)
  fs.mkdirSync(outputRoot, { recursive: true })

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
  await page.setViewportSize(viewport)

  const measurements: Record<string, unknown> = {
    phase,
    baseURL,
    viewport,
    deviceScaleFactor: 1,
    browserZoom: 1,
  }

  await page.goto("/videos")
  await waitForPage(page)
  await expandSidebar(page)
  const sidebar = page.locator('[data-slot="sidebar-container"]')
  const summaryCandidates = page.locator(
    ".archive-summary-item dd, .archive-summary-item strong, .archive-stat strong",
  )
  const summaryValues = await summaryCandidates.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node)
      const bounds = node.getBoundingClientRect()
      return {
        text: node.textContent?.trim() ?? "",
        fontSize: Number.parseFloat(style.fontSize),
        height: bounds.height,
      }
    }),
  )
  const sidebarText = (await sidebar.count())
    ? (await sidebar.innerText()).trim()
    : ""
  const titledTexts = (await sidebar.count())
    ? await sidebar.locator("[title]").evaluateAll((nodes) =>
        nodes.map((node) => ({
          text: node.textContent?.trim() ?? "",
          title: node.getAttribute("title"),
        })),
      )
    : []
  measurements.videos = {
    url: page.url(),
    summaryValues,
    largeKpiCount: summaryValues.filter(
      (value) => value.fontSize >= 30 || value.height >= 30,
    ).length,
    visibleSummaryCount: summaryValues.length,
  }
  measurements.sidebar = {
    text: sidebarText,
    hasAppearanceEnglish: /Appearance/.test(sidebarText),
    hasAppearanceChinese: sidebarText.includes("外观"),
    titledTexts,
    accountEmailMatches: titledTexts.filter(
      (item) => item.text === firstSuperuser && item.title === firstSuperuser,
    ).length,
  }
  await saveScreenshot(page, "videos")

  await page.goto("/tasks")
  await waitForPage(page)
  const taskRecord = page.locator(".process-record").first()
  const typedNodes = taskRecord.locator(".process-track-node")
  const genericMarkers = taskRecord.locator(
    ".process-track-node, .process-track-line span, .process-step-marker",
  )
  const nodeStyles = await genericMarkers.evaluateAll((nodes) =>
    nodes.slice(0, 12).map((node) => {
      const style = getComputedStyle(node)
      const bounds = node.getBoundingClientRect()
      return {
        className: node.className,
        role: node.getAttribute("data-role"),
        width: bounds.width,
        height: bounds.height,
        borderRadius: style.borderRadius,
        transform: style.transform,
        backgroundColor: style.backgroundColor,
      }
    }),
  )
  const taskHref = await taskRecord
    .locator('a[href^="/tasks/"]')
    .first()
    .getAttribute("href")
  measurements.tasks = {
    url: page.url(),
    typedNodeCount: await typedNodes.count(),
    nodeStyles,
    distinctNodeRoles: [...new Set(nodeStyles.map((node) => node.role))],
    taskHref,
  }
  await saveScreenshot(page, "tasks")

  if (taskHref) {
    await page.goto(taskHref)
    await waitForPage(page)
    const headings = await page.locator("h1, h2, h3").allTextContents()
    measurements.taskDetail = {
      url: page.url(),
      headings: headings.map((heading) => heading.trim()),
      hasProcessInspector:
        (await page.locator(".task-process-instrument").count()) > 0,
      hasReadingGrid: (await page.locator(".task-reading-grid").count()) > 0,
      links: await page.locator("a[href]").evaluateAll((nodes) =>
        nodes.map((node) => ({
          text: node.textContent?.trim() ?? "",
          href: node.getAttribute("href"),
        })),
      ),
    }
    await saveScreenshot(page, "task-detail")
  } else {
    measurements.taskDetail = { available: false }
  }

  await page.goto("/results")
  await waitForPage(page)
  const entry = page.locator(".mini-hive-reading.is-entry strong")
  const gate = page.locator(".mini-hive-gate-label")
  const exit = page.locator(".mini-hive-reading.is-exit strong")
  const flowRects = []
  for (const flow of await page
    .locator(".mini-flow-arc:not(.is-secondary)")
    .all()) {
    flowRects.push(await rect(flow))
  }
  measurements.results = {
    url: page.url(),
    scrollY: await page.evaluate(() => window.scrollY),
    entryText: await entry
      .first()
      .textContent()
      .catch(() => null),
    gateText: await gate
      .first()
      .textContent()
      .catch(() => null),
    exitText: await exit
      .first()
      .textContent()
      .catch(() => null),
    entry: await rect(entry),
    gate: await rect(gate),
    exit: await rect(exit),
    mainFlows: flowRects,
    provenance: await rect(page.locator(".result-provenance")),
    core: await rect(page.locator(".result-core")),
  }
  await saveScreenshot(page, "results")

  fs.writeFileSync(
    path.join(outputRoot, "measurements.json"),
    `${JSON.stringify(measurements, null, 2)}\n`,
  )
  console.info("INTEGRATED_UI_TRUTH", JSON.stringify(measurements))
})
