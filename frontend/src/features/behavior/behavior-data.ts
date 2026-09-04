export type JsonRecord = Record<string, unknown>

export type BehaviorReportSummary = {
  id: string
  sequence_id: string
  schema_version: string
  source: string | null
  source_sha256: string
  modality: string
  model_version: string | null
  ground_truth_version: string | null
  metric_status: string
  duration_seconds: number
  detection_count: number
  track_count: number
  entry_count: number | null
  exit_count: number | null
  anomaly_window_count: number
  created_at: string
}

export type BehaviorReportDetail = BehaviorReportSummary & {
  payload: JsonRecord
}

export type DensityCell = { row: number; col: number; meanBees: number }
export type TemporalPoint = {
  index: number
  start: number
  end: number
  activity: number
  speed: number | null
  anomaly: boolean
  maxRobustZ: number | null
}
export type Individual = {
  trackId: number
  observations: number
  spanSeconds: number
  meanSpeed: number | null
  pathLength: number | null
  dwellSeconds: number | null
  status: string
}
export type Interaction = { source: number; target: number; frames: number }
export type FluxEvent = {
  frame: number
  time: number
  trackId: number
  direction: string
}

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function recordValue(parent: JsonRecord, key: string): JsonRecord {
  const value = parent[key]
  return isRecord(value) ? value : {}
}

export function rowsValue(parent: JsonRecord, key: string): JsonRecord[] {
  const value = parent[key]
  return Array.isArray(value) ? value.filter(isRecord) : []
}

export function parseDensity(payload: JsonRecord): DensityCell[] {
  const density = recordValue(recordValue(payload, "group"), "density")
  return rowsValue(density, "cells").flatMap((cell) => {
    const row = numberValue(cell.row)
    const col = numberValue(cell.col)
    const meanBees = numberValue(cell.mean_bees_per_frame)
    return row === null || col === null || meanBees === null
      ? []
      : [{ row, col, meanBees }]
  })
}

export function parseTemporal(payload: JsonRecord): TemporalPoint[] {
  const group = recordValue(payload, "group")
  return rowsValue(group, "temporal_summary").flatMap((row, index) => {
    const start = numberValue(row.start_time_seconds)
    const end = numberValue(row.end_time_seconds)
    const activity = numberValue(row.mean_active_tracks_per_frame)
    const speed = numberValue(row.mean_speed_body_lengths_s)
    if (start === null || end === null || activity === null) return []
    const scores = [
      row.activity_robust_z,
      row.speed_body_lengths_robust_z,
      row.interaction_robust_z,
      row.flux_robust_z,
    ].flatMap((value) => {
      const score = numberValue(value)
      return score === null ? [] : [Math.abs(score)]
    })
    const maxRobustZ = scores.length ? Math.max(...scores) : null
    return [
      {
        index,
        start,
        end,
        activity,
        speed,
        anomaly: row.warmup !== true && (maxRobustZ ?? 0) >= 3.5,
        maxRobustZ,
      },
    ]
  })
}

export function parseIndividuals(payload: JsonRecord): Individual[] {
  return rowsValue(payload, "individuals").flatMap((row) => {
    const trackId = numberValue(row.track_id)
    const observations = numberValue(row.observations)
    const spanSeconds = numberValue(row.span_seconds)
    if (trackId === null || observations === null || spanSeconds === null)
      return []
    return [
      {
        trackId,
        observations,
        spanSeconds,
        meanSpeed: numberValue(row.mean_speed_body_lengths_s),
        pathLength: numberValue(row.path_length_body_lengths),
        dwellSeconds: numberValue(row.roi_dwell_seconds),
        status: typeof row.status === "string" ? row.status : "unknown",
      },
    ]
  })
}

export function parseInteractions(payload: JsonRecord): Interaction[] {
  const network = recordValue(
    recordValue(payload, "group"),
    "interaction_network",
  )
  return rowsValue(network, "edges")
    .flatMap((row) => {
      const source = numberValue(row.track_id_a)
      const target = numberValue(row.track_id_b)
      const frames = numberValue(row.interaction_frames)
      return source === null || target === null || frames === null
        ? []
        : [{ source, target, frames }]
    })
    .sort((left, right) => right.frames - left.frames)
}

export function parseFluxEvents(payload: JsonRecord): FluxEvent[] {
  const flux = recordValue(recordValue(payload, "group"), "flux")
  return rowsValue(flux, "events").flatMap((row) => {
    const frame = numberValue(row.frame)
    const time = numberValue(row.time_seconds)
    const trackId = numberValue(row.track_id)
    return frame === null || time === null || trackId === null
      ? []
      : [
          {
            frame,
            time,
            trackId,
            direction:
              typeof row.direction === "string" ? row.direction : "unknown",
          },
        ]
  })
}

export function metricStatusLabel(status: string) {
  return status === "validated_against_human_mot_ground_truth"
    ? "已使用人工 MOT 真值验证"
    : "描述性结果，尚未使用人工 MOT 真值验证"
}
