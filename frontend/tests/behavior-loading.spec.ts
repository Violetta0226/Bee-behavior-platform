import { expect, test } from "@playwright/test"

const reportId = "00000000-0000-4000-8000-000000000101"

const summary = {
  id: reportId,
  sequence_id: "ACCEPTANCE-1",
  modality: "RGB",
  source: "acceptance/behavior-summary.json",
  source_sha256: "a".repeat(64),
  model_version: "acceptance-model",
  ground_truth_version: null,
  metric_status: "descriptive_only_without_human_mot_ground_truth",
  detection_count: 11,
  track_count: 5,
  entry_count: null,
  exit_count: null,
  anomaly_window_count: 0,
  duration_seconds: 2,
  created_at: "2026-09-05T00:00:00Z",
}

test("shows a truthful loading state while report detail is pending", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("access_token", "behavior-loading-test-token")
  })
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "acceptance@example.com",
        full_name: "Acceptance User",
        is_active: true,
        is_superuser: false,
      },
    }),
  )

  await page.route("**/api/v1/behavior-reports/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: [summary], count: 1 } }),
  )

  let releaseDetail: (() => void) | undefined
  const detailReleased = new Promise<void>((resolve) => {
    releaseDetail = resolve
  })
  await page.route(`**/api/v1/behavior-reports/${reportId}`, async (route) => {
    await detailReleased
    await route.fulfill({
      json: {
        ...summary,
        payload: {
          schema_version: "1.0",
          individuals: [],
          group: {},
        },
      },
    })
  })

  await page.goto("/behavior")
  await expect(page.getByRole("status")).toHaveText("正在读取报告详情…")
  await expect(page.locator(".behavior-metrics")).toHaveCount(0)

  releaseDetail?.()
  await expect(page.locator(".behavior-metrics")).toBeVisible()
  await expect(page.getByRole("status")).toHaveCount(0)
})
