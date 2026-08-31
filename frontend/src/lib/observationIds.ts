export function formatEvidenceId(prefix: string, value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1000
  }

  return `${prefix}\u2022${String(hash).padStart(3, "0")}`
}

type ObservationTaskLike = {
  id: string
  video_id: string
  created_at: string | null
}

type ObservationResultLike = {
  id: string
  task_id: string
  video_id: string
  created_at: string | null
}

export function selectObservationEvidence<
  TTask extends ObservationTaskLike,
  TResult extends ObservationResultLike,
>(videoId: string, tasks: readonly TTask[], results: readonly TResult[]) {
  const videoTasks = tasks
    .filter((task) => task.video_id === videoId)
    .sort(sortNewestFirst)
  const videoResults = results
    .filter((result) => result.video_id === videoId)
    .sort(sortNewestFirst)
  const result = videoResults[0] ?? null
  const resultTask = result
    ? (videoTasks.find((task) => task.id === result.task_id) ?? null)
    : null

  return {
    task: resultTask ?? videoTasks[0] ?? null,
    result,
    resultTask,
  }
}

function sortNewestFirst(
  a: { id: string; created_at: string | null },
  b: { id: string; created_at: string | null },
) {
  const timestampDifference =
    getTimestamp(b.created_at) - getTimestamp(a.created_at)
  return timestampDifference || b.id.localeCompare(a.id)
}

function getTimestamp(value: string | null) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}
