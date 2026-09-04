import type { Page } from "@playwright/test"

export const mockVideoId = "00000000-0000-4000-8000-000000000024"
export const mockOwnerId = "00000000-0000-4000-8000-000000000001"
export const mockTaskId = "00000000-0000-4000-8000-000000000006"
export const mockResultId = "00000000-0000-4000-8000-000000000012"

export const mockVideo = {
  id: mockVideoId,
  original_filename: "hive-gate-observation-2026-08-16.mp4",
  scene_type: "OUTDOOR",
  file_size: 128_450_560,
  content_type: "video/mp4",
  status: "COMPLETED",
  owner_id: mockOwnerId,
  created_at: "2026-08-16T14:21:00Z",
}

export const mockSecondVideo = {
  ...mockVideo,
  id: "00000000-0000-4000-8000-000000000025",
  original_filename: "hive-gate-observation-2026-08-17.mp4",
}

export const mockTask = {
  id: mockTaskId,
  video_id: mockVideoId,
  owner_id: mockOwnerId,
  task_type: "behavior_analysis",
  status: "COMPLETED",
  progress: 100,
  model_name: "baseline-v1",
  error_message: null,
  created_at: "2026-08-16T14:21:00Z",
  started_at: "2026-08-16T14:22:00Z",
  completed_at: "2026-08-16T14:26:00Z",
}

export const mockResult = {
  id: mockResultId,
  task_id: mockTaskId,
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

export async function mockResearchData(page: Page) {
  await page.route("**/api/v1/videos/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: [mockVideo], count: 1 } }),
  )
  await page.route("**/api/v1/tasks/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: [mockTask], count: 1 } }),
  )
  await page.route("**/api/v1/results/?skip=0&limit=100", (route) =>
    route.fulfill({ json: { data: [mockResult], count: 1 } }),
  )
  await page.route(`**/api/v1/tasks/${mockTaskId}`, (route) =>
    route.fulfill({ json: mockTask }),
  )
  await page.route(`**/api/v1/results/task/${mockTaskId}`, (route) =>
    route.fulfill({ json: mockResult }),
  )
  await page.route(`**/api/v1/videos/${mockVideoId}`, (route) =>
    route.fulfill({ json: mockVideo }),
  )
  await page.route(`**/api/v1/videos/${mockVideoId}/file`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "video/mp4",
      body: "browser-only media fixture",
    }),
  )
}
