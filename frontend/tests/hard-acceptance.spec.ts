import fs from "node:fs"
import path from "node:path"
import { expect, type Locator, type Page, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config"
import { mockResearchData } from "./research-data"

const viewport = { width: 1914, height: 960 }
const outputRoot = path.resolve(process.cwd(), "hard-acceptance-evidence")

test.beforeEach(async ({ page, request }, testInfo) => {
  test.setTimeout(180_000)
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

async function expandSidebar(page: Page) {
  const toggle = page.locator(".research-sidebar-toggle")
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
  }
}

async function assertInViewport(locator: Locator, label: string) {
  const box = await locator.boundingBox()
  expect(box, `${label} must have a rendered bounding box`).not.toBeNull()
  const bottom = (box?.y ?? viewport.height) + (box?.height ?? 0)
  expect(
    box?.y ?? -1,
    `${label} must start inside the viewport`,
  ).toBeGreaterThanOrEqual(0)
  expect(bottom, `${label} bottom must be below viewport height`).toBeLessThan(
    viewport.height,
  )
  return { ...box!, bottom }
}

async function screenshot(page: Page, name: string) {
  await page.waitForTimeout(400)
  await page.screenshot({
    path: path.join(outputRoot, `1914x960-light-${name}.png`),
    fullPage: false,
  })
}

test("1914x960 hard acceptance: four fixes and task detail", async ({
  page,
}) => {
  fs.mkdirSync(outputRoot, { recursive: true })
  await page.setViewportSize(viewport)

  await page.goto("/videos")
  await waitForResearchPage(page)
  await expandSidebar(page)

  const sidebar = page.locator('[data-slot="sidebar-container"]')
  await expect(sidebar.getByText("外观", { exact: true })).toBeVisible()
  await expect(sidebar.getByText("Appearance", { exact: true })).toHaveCount(0)
  await expect(sidebar.getByText("管理员", { exact: true })).toBeVisible({
    timeout: 20_000,
  })
  const email = sidebar.locator(`[title="${firstSuperuser}"]`).first()
  await expect(email).toBeVisible()
  await expect(email).toHaveText(firstSuperuser)
  await expect(email).toHaveAttribute("title", firstSuperuser)

  const commandSummary = page.locator(".archive-command-summary")
  const commandStrip = page.locator(".archive-summary-strip")
  await expect(commandSummary).toBeVisible()
  await expect(commandStrip).toBeVisible()
  await expect(commandStrip.locator(".archive-summary-item")).toHaveCount(5)
  const commandLayout = await commandSummary.evaluate((element) => {
    const summaryStyle = getComputedStyle(element)
    const values = Array.from(element.querySelectorAll("dd"))
    return {
      display: summaryStyle.display,
      height: element.getBoundingClientRect().height,
      largeKpiCount: values.filter((value) => {
        const style = getComputedStyle(value)
        const rect = value.getBoundingClientRect()
        return Number.parseFloat(style.fontSize) >= 30 || rect.height >= 30
      }).length,
      values: values.map((value) => ({
        text: value.textContent?.trim(),
        fontSize: getComputedStyle(value).fontSize,
      })),
    }
  })
  expect(commandLayout.display).toBe("flex")
  expect(commandLayout.height).toBeLessThan(60)
  expect(commandLayout.largeKpiCount).toBe(0)
  await expect(page.locator(".archive-filter-bar")).toBeVisible()
  const videoHref = await page
    .locator('.archive-filename[href^="/videos/"]')
    .first()
    .getAttribute("href")
  expect(videoHref).toBeTruthy()
  await screenshot(page, "videos")

  await page.goto("/tasks")
  await waitForResearchPage(page)
  const completedRecord = page.locator(
    '.process-record[data-status="complete"]',
  )
  const taskRecord = (await completedRecord.count())
    ? completedRecord.first()
    : page.locator(".process-record").first()
  await expect(taskRecord).toBeVisible()
  const nodes = taskRecord.locator(".process-track-node")
  await expect(nodes).toHaveCount(3)
  await expect(nodes.nth(0)).toHaveAttribute("data-role", "create-origin")
  await expect(nodes.nth(1)).toHaveAttribute("data-role", "analysis-node")
  await expect(nodes.nth(2)).toHaveAttribute("data-role", "result-endpoint")
  const trace = await nodes.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      const marker = getComputedStyle(element, "::after")
      return {
        className: element.className,
        role: element.getAttribute("data-role"),
        x: rect.x,
        width: rect.width,
        height: rect.height,
        borderRadius: style.borderRadius,
        transform: style.transform,
        innerMarker: `${marker.width}x${marker.height}`,
      }
    }),
  )
  expect(new Set(trace.map((node) => node.className)).size).toBe(3)
  expect(trace[0].width).not.toBe(trace[1].width)
  expect(trace[1].innerMarker).toBe("4pxx4px")
  expect(trace[2].borderRadius).toBe("2px")
  expect(trace[2].transform).not.toBe("none")
  const firstSegment = trace[1].x - trace[0].x
  const secondSegment = trace[2].x - trace[1].x
  expect(Math.abs(firstSegment - secondSegment)).toBeGreaterThan(5)

  const taskHref = await taskRecord
    .locator(".process-primary-action")
    .getAttribute("href")
  expect(taskHref).toBeTruthy()
  await screenshot(page, "tasks")

  await page.goto(taskHref as string)
  await waitForResearchPage(page)
  await expect(page.locator(".task-process-instrument")).toBeVisible()
  await expect(page.locator(".task-reading-grid")).toBeVisible()
  await expect(page.locator(".task-result-rail")).toBeVisible()
  await expect(page.locator(".task-observation-rail")).toBeVisible()
  const legacyCrudHeadings = await page
    .locator("h2, h3")
    .evaluateAll(
      (headings) =>
        headings.filter((heading) =>
          ["任务信息", "关联结果", "关联视频"].includes(
            heading.textContent?.trim() ?? "",
          ),
        ).length,
    )
  expect(legacyCrudHeadings).toBe(0)
  await screenshot(page, "task-detail")

  await page.goto("/results")
  await waitForResearchPage(page)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.locator(".result-header h1")).toContainText(/R[^\d]*\d+/)
  await expect(page.locator(".result-chain-step")).toHaveCount(3)
  await expect(page.locator(".result-core > div")).toHaveCount(4)

  const entryValue = page.locator(".mini-hive-reading.is-entry strong")
  const gate = page.locator(".mini-hive-gate-label")
  const exitValue = page.locator(".mini-hive-reading.is-exit strong")
  await expect(entryValue).toHaveText("32")
  await expect(gate).toHaveText("巢门")
  await expect(exitValue).toHaveText("29")
  const entryBox = await assertInViewport(entryValue, "entry 32")
  const gateBox = await assertInViewport(gate, "hive gate")
  const exitBox = await assertInViewport(exitValue, "exit 29")
  const flowBoxes = []
  for (const [index, flow] of (
    await page.locator(".mini-flow-arc:not(.is-secondary)").all()
  ).entries()) {
    flowBoxes.push(await assertInViewport(flow, `main flow ${index + 1}`))
  }
  expect(flowBoxes).toHaveLength(2)

  const evidenceBox = await page.locator(".result-provenance").boundingBox()
  const coreBox = await page.locator(".result-core").boundingBox()
  expect(evidenceBox).not.toBeNull()
  expect(coreBox).not.toBeNull()
  expect(evidenceBox?.height ?? 0).toBeGreaterThanOrEqual(56)
  expect(evidenceBox?.height ?? 999).toBeLessThanOrEqual(74)
  expect(coreBox?.height ?? 0).toBeGreaterThanOrEqual(90)
  expect(coreBox?.height ?? 999).toBeLessThanOrEqual(120)
  await screenshot(page, "results")

  const measurements = {
    viewport,
    scrollY: await page.evaluate(() => window.scrollY),
    results: {
      entry: entryBox,
      gate: gateBox,
      exit: exitBox,
      mainFlows: flowBoxes,
      evidenceHeight: evidenceBox?.height,
      coreHeight: coreBox?.height,
    },
    videos: commandLayout,
    tasks: {
      nodes: trace,
      firstSegment,
      secondSegment,
    },
    sidebar: {
      visibleName: "管理员",
      emailText: await email.textContent(),
      emailTitle: await email.getAttribute("title"),
    },
    taskDetail: {
      href: taskHref,
      legacyCrudHeadings,
      hasProcessInspector: true,
    },
  }
  fs.writeFileSync(
    path.join(outputRoot, "measurements.json"),
    `${JSON.stringify(measurements, null, 2)}\n`,
  )
  console.info("HARD_ACCEPTANCE_MEASUREMENTS", JSON.stringify(measurements))
})

test("required route chain keeps the shell resident without blank flash", async ({
  page,
}) => {
  await page.setViewportSize(viewport)
  await page.goto("/videos")
  await waitForResearchPage(page)
  await expandSidebar(page)

  await page.evaluate(() => {
    const audit = window as Window & {
      __hardAcceptanceShell?: {
        shell: Element | null
        host: Element | null
        sidebar: Element | null
      }
    }
    audit.__hardAcceptanceShell = {
      shell: document.querySelector("[data-research-page-shell]"),
      host: document.querySelector("[data-research-route-host]"),
      sidebar: document.querySelector('[data-slot="sidebar"]'),
    }
  })

  const readings: Array<{
    route: string
    missingMainSamples: number
    stableShell: boolean
  }> = []

  async function follow(action: () => Promise<void>) {
    await page.evaluate(() => {
      const audit = window as Window & {
        __hardAcceptanceSamples?: boolean[]
      }
      audit.__hardAcceptanceSamples = []
      const started = performance.now()
      const sample = () => {
        const main = document.querySelector<HTMLElement>(
          ".research-canvas-content > main",
        )
        audit.__hardAcceptanceSamples?.push(
          Boolean(main && main.childElementCount > 0),
        )
        if (performance.now() - started < 700) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    await action()
    await waitForResearchPage(page)
    await page.waitForTimeout(750)
    readings.push(
      await page.evaluate(() => {
        const audit = window as Window & {
          __hardAcceptanceShell?: {
            shell: Element | null
            host: Element | null
            sidebar: Element | null
          }
          __hardAcceptanceSamples?: boolean[]
        }
        const stable = audit.__hardAcceptanceShell
        const samples = audit.__hardAcceptanceSamples ?? []
        return {
          route: window.location.pathname,
          missingMainSamples: samples.filter((sample) => !sample).length,
          stableShell:
            stable?.shell ===
              document.querySelector("[data-research-page-shell]") &&
            stable?.host ===
              document.querySelector("[data-research-route-host]") &&
            stable?.sidebar === document.querySelector('[data-slot="sidebar"]'),
        }
      }),
    )
  }

  await follow(() =>
    page.getByRole("link", { name: "分析任务", exact: true }).click(),
  )
  const completedTask = page
    .locator('.process-record[data-status="complete"] .process-primary-action')
    .first()
  await expect(completedTask).toBeVisible()
  await follow(() => completedTask.click())
  const resultLink = page.getByRole("link", { name: "查看结果" }).first()
  await expect(resultLink).toBeVisible()
  await follow(() => resultLink.click())
  const observationLink = page
    .locator('.result-chain-step[href^="/videos/"]')
    .first()
  await expect(observationLink).toBeVisible()
  await follow(() => observationLink.click())

  expect(readings.map((reading) => reading.route)).toEqual([
    "/tasks",
    expect.stringMatching(/^\/tasks\/[0-9a-f-]+$/),
    "/results",
    expect.stringMatching(/^\/videos\/[0-9a-f-]+$/),
  ])
  for (const reading of readings) {
    expect(reading.stableShell, `${reading.route} remounted the shell`).toBe(
      true,
    )
    expect(reading.missingMainSamples, `${reading.route} flashed blank`).toBe(0)
  }
  console.info("HARD_ACCEPTANCE_ROUTE_READINGS", JSON.stringify(readings))
})
