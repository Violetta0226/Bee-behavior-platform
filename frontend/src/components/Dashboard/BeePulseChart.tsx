import { Activity } from "lucide-react"
import { useState } from "react"

type PulseResult = {
  id: string
  activity_index: number | null
  entry_count: number
  exit_count: number
  abnormal_event_count: number
  created_at: string | null
}

type BeePulseChartProps = {
  results: PulseResult[]
  compact?: boolean
}

type PulsePoint = {
  id: string
  x: number
  y: number
  value: number
  time: string
  observedAt: string | null
  entryCount: number
  exitCount: number
  abnormalCount: number
}

const CHART = {
  width: 1040,
  height: 390,
  left: 36,
  right: 24,
  top: 34,
  bottom: 64,
}

const NORMAL_RANGE = { low: 0.35, high: 0.75 }

export function BeePulseChart({
  results,
  compact = false,
}: BeePulseChartProps) {
  const [activePointId, setActivePointId] = useState<string | null>(null)
  const innerWidth = CHART.width - CHART.left - CHART.right
  const innerHeight = CHART.height - CHART.top - CHART.bottom
  const sourceResults = [...results]
    .filter((result) => result.activity_index !== null)
    .sort((a, b) => getTimestamp(a.created_at) - getTimestamp(b.created_at))
    .slice(-12)

  const points: PulsePoint[] = sourceResults.map((result, index) => {
    const count = sourceResults.length
    const x =
      count === 1
        ? CHART.left + innerWidth / 2
        : CHART.left + (index / (count - 1)) * innerWidth
    const value = Math.max(0, Math.min(1, result.activity_index ?? 0))
    return {
      id: result.id,
      x,
      y: getY(value, innerHeight),
      value,
      time: formatTime(result.created_at),
      observedAt: result.created_at,
      entryCount: result.entry_count,
      exitCount: result.exit_count,
      abnormalCount: result.abnormal_event_count,
    }
  })

  const latestPoint = points.length ? points[points.length - 1] : null
  const isTimeSeries = points.length >= 4
  const activePoint =
    points.find((point) => point.id === activePointId) ?? latestPoint
  const averageActivity = points.length
    ? points.reduce((sum, point) => sum + point.value, 0) / points.length
    : null
  const trend =
    points.length > 1 && latestPoint
      ? latestPoint.value - points[0].value
      : null
  const normalTop = getY(NORMAL_RANGE.high, innerHeight)
  const normalBottom = getY(NORMAL_RANGE.low, innerHeight)
  const linePath = buildLinePath(points)
  const areaPath = buildAreaPath(points)
  const labelIndexes = new Set([
    0,
    Math.floor((points.length - 1) / 2),
    points.length - 1,
  ])

  return (
    <div className={`pulse-layout${compact ? " pulse-layout--compact" : ""}`}>
      <header className="pulse-heading">
        <div>
          <p className="observation-kicker">Colony pulse</p>
          <h2 className="observation-section-title">蜂群活动节律</h2>
          <p className="pulse-intro">
            观察最近十二份有效分析结果，辨认蜂群活动的峰谷、稳定区间与异常时刻。
          </p>
        </div>
        <section className="pulse-readings" aria-label="活动节律摘要">
          <HeaderReading
            label="最近活动"
            value={latestPoint ? latestPoint.value.toFixed(2) : "-"}
            tone="active"
          />
          <HeaderReading
            label="近期均值"
            value={averageActivity === null ? "-" : averageActivity.toFixed(2)}
          />
          <HeaderReading
            label="节律变化"
            value={formatTrend(trend)}
            tone={
              trend === null ? "default" : trend >= 0 ? "active" : "observe"
            }
          />
        </section>
      </header>

      {points.length === 0 ? (
        <div className="pulse-empty">
          <Activity className="size-6" />
          <div>
            <p className="font-medium">尚未形成活动节律</p>
            <p className="mt-1 text-sm observation-muted">
              分析结果包含活动指数后，将按观测时间记录蜂群脉搏。
            </p>
          </div>
        </div>
      ) : !isTimeSeries ? (
        <SingleObservation point={latestPoint!} sampleCount={points.length} />
      ) : (
        <>
          <div className="pulse-chart-wrap">
            <div className="pulse-range-label">
              <span>较活跃</span>
              <time className="observation-data tabular-nums">
                {formatTimeRange(
                  points[0].observedAt,
                  latestPoint?.observedAt ?? null,
                )}
              </time>
            </div>
            <svg
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              className="pulse-chart"
              role="img"
              aria-label="蜂群活动节律记录，稳定色区域表示正常活动区间，陶土色节点表示异常关联"
              onMouseLeave={() => setActivePointId(null)}
            >
              <title>蜂群活动节律：最近十二次有效活动指数观测</title>
              <rect
                x={CHART.left}
                y={normalTop}
                width={innerWidth}
                height={normalBottom - normalTop}
                fill="var(--obs-sage)"
                opacity="0.18"
              />
              <text
                x={CHART.left + 12}
                y={normalTop + 20}
                fontSize="13"
                fill="var(--obs-leaf)"
              >
                日常活动区间
              </text>
              <line
                x1={CHART.left}
                x2={CHART.width - CHART.right}
                y1={CHART.height - CHART.bottom}
                y2={CHART.height - CHART.bottom}
                stroke="var(--obs-line-strong)"
                strokeWidth="1"
              />
              {areaPath && (
                <path d={areaPath} fill="var(--obs-honey)" opacity="0.075" />
              )}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--obs-honey)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {points.map((point, index) => {
                const isActive = activePoint?.id === point.id
                const isAbnormal = point.abnormalCount > 0
                return (
                  <g key={point.id}>
                    <line
                      x1={point.x}
                      x2={point.x}
                      y1={point.y + 8}
                      y2={CHART.height - CHART.bottom}
                      stroke={
                        isAbnormal ? "var(--obs-clay)" : "var(--obs-line)"
                      }
                      strokeWidth="1"
                      opacity={isActive || isAbnormal ? "0.7" : "0.45"}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? "6" : "4"}
                      fill={isAbnormal ? "var(--obs-clay)" : "var(--obs-honey)"}
                      stroke={
                        isActive
                          ? "var(--obs-clay)"
                          : "var(--obs-pulse-surface)"
                      }
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                    />
                    {isAbnormal && (
                      <path
                        d={`M ${point.x - 4} ${point.y - 14} L ${point.x + 4} ${point.y - 14}`}
                        stroke="var(--obs-clay)"
                        strokeWidth="2"
                      />
                    )}
                    {labelIndexes.has(index) && (
                      <text
                        x={point.x}
                        y={CHART.height - 27}
                        textAnchor={
                          index === 0
                            ? "start"
                            : index === points.length - 1
                              ? "end"
                              : "middle"
                        }
                        fontSize="13"
                        fill="currentColor"
                        opacity="0.7"
                      >
                        {point.time}
                      </text>
                    )}
                    <foreignObject
                      x={point.x - 22}
                      y={point.y - 22}
                      width="44"
                      height="44"
                    >
                      <button
                        type="button"
                        aria-pressed={isActive}
                        aria-label={`${formatDateTime(point.observedAt)}，活动指数 ${point.value.toFixed(2)}，进巢 ${point.entryCount} 次，出巢 ${point.exitCount} 次，异常 ${point.abnormalCount} 次`}
                        onMouseEnter={() => setActivePointId(point.id)}
                        onFocus={() => setActivePointId(point.id)}
                        onBlur={() => setActivePointId(null)}
                        onClick={() => setActivePointId(point.id)}
                        className="size-full cursor-pointer bg-transparent p-0 focus:outline-none"
                      >
                        <span className="sr-only">选择此观测点</span>
                      </button>
                    </foreignObject>
                  </g>
                )
              })}
            </svg>
            <div className="pulse-legend">
              <span>较安静</span>
              <span>
                <i data-tone="normal" />
                日常活动区间
              </span>
              <span>
                <i data-tone="attention" />
                异常关联
              </span>
            </div>
          </div>

          {activePoint && (
            <div className="pulse-focus" aria-live="polite">
              <div className="pulse-focus-time">
                <span>聚焦观测</span>
                <strong className="observation-data tabular-nums">
                  {formatDateTime(activePoint.observedAt)}
                </strong>
              </div>
              <ReadingCell
                label="活动指数"
                value={activePoint.value.toFixed(2)}
              />
              <ReadingCell
                label="进巢"
                value={`${activePoint.entryCount} 次`}
                tone="entry"
              />
              <ReadingCell
                label="出巢"
                value={`${activePoint.exitCount} 次`}
                tone="exit"
              />
              <ReadingCell
                label="异常记录"
                value={`${activePoint.abnormalCount} 次`}
                tone={activePoint.abnormalCount > 0 ? "attention" : "default"}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SingleObservation({
  point,
  sampleCount,
}: {
  point: PulsePoint
  sampleCount: number
}) {
  const inNormalRange =
    point.value >= NORMAL_RANGE.low && point.value <= NORMAL_RANGE.high
  const rangeWidth = (NORMAL_RANGE.high - NORMAL_RANGE.low) * 100

  return (
    <section className="pulse-single" aria-label="单点观测模式">
      <div className="pulse-single-heading">
        <div>
          <p className="observation-kicker">Single observation</p>
          <h3 className="observation-single-title">当前活动观测</h3>
          <p className="pulse-single-note">
            当前有效分析结果不足以形成时序曲线，先保留可复核的单点读数。
          </p>
        </div>
        <span
          className="pulse-single-badge"
          data-state={inNormalRange ? "normal" : "attention"}
        >
          {inNormalRange ? "位于正常区间" : "偏离正常区间"}
        </span>
      </div>

      <div className="pulse-single-grid">
        <div className="pulse-single-index">
          <span>当前活动指数</span>
          <strong className="observation-data tabular-nums">
            {point.value.toFixed(2)}
          </strong>
          <small>0–1 群体活动强度</small>
        </div>
        <div className="pulse-single-measurement">
          <div className="pulse-single-scale">
            <span>0.00</span>
            <span>正常活动区间 0.35–0.75</span>
            <span>1.00</span>
          </div>
          <div className="pulse-single-track" aria-hidden="true">
            <span
              className="pulse-single-normal-range"
              style={{
                left: `${NORMAL_RANGE.low * 100}%`,
                width: `${rangeWidth}%`,
              }}
            />
            <span
              className="pulse-single-marker"
              style={{ left: `${point.value * 100}%` }}
            />
          </div>
          <div className="pulse-single-point-label">
            <span>当前观测点</span>
            <strong className="observation-data tabular-nums">
              {point.value.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      <dl className="pulse-single-meta">
        <div>
          <dt>观测时间</dt>
          <dd className="observation-data tabular-nums">
            {formatDateTime(point.observedAt)}
          </dd>
        </div>
        <div>
          <dt>数据来源</dt>
          <dd className="observation-data">
            分析结果 · {formatSourceCode(point.id)}
          </dd>
        </div>
        <div>
          <dt>当前样本</dt>
          <dd className="observation-data tabular-nums">
            {sampleCount} 条有效读数
          </dd>
        </div>
      </dl>
    </section>
  )
}

function HeaderReading({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "active" | "observe"
}) {
  return (
    <div className="pulse-header-reading" data-tone={tone}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function ReadingCell({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "entry" | "exit" | "attention"
}) {
  return (
    <div className="pulse-reading" data-tone={tone}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function getY(value: number, innerHeight: number) {
  return CHART.top + (1 - value) * innerHeight
}

function buildLinePath(points: PulsePoint[]) {
  if (!points.length) return ""
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index++) {
    const current = points[index]
    const next = points[index + 1]
    const middleX = (current.x + next.x) / 2
    path += ` C ${middleX} ${current.y}, ${middleX} ${next.y}, ${next.x} ${next.y}`
  }
  return path
}

function buildAreaPath(points: PulsePoint[]) {
  const line = buildLinePath(points)
  if (!line) return ""
  const baseline = CHART.height - CHART.bottom
  return `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
}

function formatTrend(value: number | null) {
  if (value === null) return "-"
  if (value === 0) return "0.00"
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`
}

function formatTime(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDateTime(value: string | null) {
  if (!value) return "时间未记录"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "时间未记录"
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start || !end) return "观测时间未记录"
  return `${formatDateTime(start)} - ${formatDateTime(end)}`
}

function getTimestamp(value: string | null) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function formatSourceCode(value: string) {
  let hash = 0
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1000
  }
  return `A\u2022${String(hash).padStart(3, "0")}`
}
