import { ResearchContentFrame } from "@/components/Layout/ResearchContentFrame"
import "@/components/Dashboard/observation-theme.css"
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  FileCheck2,
  Footprints,
  Network,
  RefreshCw,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  type BehaviorReportDetail,
  type BehaviorReportSummary,
  type DensityCell,
  type Interaction,
  metricStatusLabel,
  parseDensity,
  parseFluxEvents,
  parseIndividuals,
  parseInteractions,
  parseTemporal,
  type TemporalPoint,
} from "./behavior-data"
import "./behavior-workspace.css"

type WorkspaceMode = "behavior" | "tracking" | "alerts" | "reports"
type ReportList = { data: BehaviorReportSummary[]; count: number }

const API_BASE = "/api/v1"

const MODE_COPY: Record<
  WorkspaceMode,
  { kicker: string; title: string; intro: string }
> = {
  behavior: {
    kicker: "Colony behavior record",
    title: "群体行为",
    intro: "从真实分析产物读取空间密度、活动节律、巢门通量与个体交互。",
  },
  tracking: {
    kicker: "Individual track ledger",
    title: "个体追踪",
    intro: "按 Track ID 检查观测跨度、移动距离、速度与区域停留时间。",
  },
  alerts: {
    kicker: "Evidence alert timeline",
    title: "异常监测",
    intro: "仅展示稳健分数达到阈值的时间窗，以及带方向和 Track ID 的巢门事件。",
  },
  reports: {
    kicker: "Provenance archive",
    title: "数据与报告",
    intro: "集中核对报告口径、模型版本、来源哈希与可下载的原始 JSON。",
  },
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function BehaviorWorkspace({ mode }: { mode: WorkspaceMode }) {
  const [reports, setReports] = useState<BehaviorReportSummary[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [detail, setDetail] = useState<BehaviorReportDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReports = useCallback(async (manual = false) => {
    manual ? setIsRefreshing(true) : setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${API_BASE}/behavior-reports/?skip=0&limit=100`,
        {
          headers: authHeaders(),
        },
      )
      if (!response.ok) throw new Error(`报告索引读取失败：${response.status}`)
      const payload = (await response.json()) as ReportList
      setReports(payload.data)
      setSelectedId((current) => current || payload.data[0]?.id || "")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "报告索引读取失败")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let active = true
    void fetch(`${API_BASE}/behavior-reports/${selectedId}`, {
      headers: authHeaders(),
    })
      .then((response) => {
        if (!response.ok)
          throw new Error(`报告详情读取失败：${response.status}`)
        return response.json() as Promise<BehaviorReportDetail>
      })
      .then((payload) => {
        if (active) setDetail(payload)
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : "报告详情读取失败")
      })
    return () => {
      active = false
    }
  }, [selectedId])

  const copy = MODE_COPY[mode]

  return (
    <main className="observation-page behavior-workspace">
      <ResearchContentFrame
        size="workspace"
        density="result"
        className="observation-shell"
      >
        <header className="behavior-header">
          <div>
            <p className="observation-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p>{copy.intro}</p>
          </div>
          <div className="behavior-header-actions">
            <label>
              <span>观测序列</span>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.sequence_id} · {report.modality}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="behavior-icon-button"
              onClick={() => void loadReports(true)}
              disabled={isRefreshing}
              aria-label="刷新行为报告"
            >
              <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error && (
          <div className="behavior-notice behavior-notice--error">{error}</div>
        )}
        {isLoading && (
          <div className="behavior-empty">正在读取真实分析产物…</div>
        )}
        {!isLoading && reports.length === 0 && (
          <div className="behavior-empty">暂无可追溯的行为分析报告。</div>
        )}
        {detail && (
          <>
            <EvidenceStrip report={detail} />
            {mode === "behavior" && <BehaviorView report={detail} />}
            {mode === "tracking" && <TrackingView report={detail} />}
            {mode === "alerts" && <AlertsView report={detail} />}
            {mode === "reports" && (
              <ReportsView reports={reports} selected={detail} />
            )}
          </>
        )}
      </ResearchContentFrame>
    </main>
  )
}

function EvidenceStrip({ report }: { report: BehaviorReportDetail }) {
  return (
    <section className="behavior-evidence-strip">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>{metricStatusLabel(report.metric_status)}</strong>
        <p>
          {report.sequence_id} · 模型 {report.model_version ?? "未记录"} · GT{" "}
          {report.ground_truth_version ?? "未绑定"}
        </p>
      </div>
      <code title={report.source_sha256}>
        SHA {report.source_sha256.slice(0, 12)}…
      </code>
    </section>
  )
}

function BehaviorView({ report }: { report: BehaviorReportDetail }) {
  const density = useMemo(() => parseDensity(report.payload), [report])
  const temporal = useMemo(() => parseTemporal(report.payload), [report])
  const interactions = useMemo(
    () => parseInteractions(report.payload),
    [report],
  )
  return (
    <div className="behavior-stack">
      <MetricBand report={report} />
      <div className="behavior-grid behavior-grid--primary">
        <DensityHeatmap cells={density} />
        <TemporalChart points={temporal} />
      </div>
      <div className="behavior-grid behavior-grid--secondary">
        <FluxPanel report={report} />
        <InteractionPanel interactions={interactions} />
      </div>
    </div>
  )
}

function MetricBand({ report }: { report: BehaviorReportSummary }) {
  return (
    <section className="behavior-metrics" aria-label="行为指标摘要">
      <Metric
        label="检测记录"
        value={report.detection_count}
        note="检测框总数"
      />
      <Metric label="连续轨迹" value={report.track_count} note="Track ID 数" />
      <Metric
        label="入巢 / 出巢"
        value={`${report.entry_count ?? "—"} / ${report.exit_count ?? "—"}`}
        note="未设计数门时为 —"
      />
      <Metric
        label="异常时间窗"
        value={report.anomaly_window_count}
        note="|robust z| ≥ 3.5"
        tone="alert"
      />
    </section>
  )
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: number | string
  note: string
  tone?: string
}) {
  return (
    <div className="behavior-metric" data-tone={tone}>
      <span>{label}</span>
      <strong>
        {typeof value === "number" ? value.toLocaleString("zh-CN") : value}
      </strong>
      <small>{note}</small>
    </div>
  )
}

function Panel({
  kicker,
  title,
  children,
}: {
  kicker: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="behavior-panel observation-glass">
      <header>
        <p className="observation-kicker">{kicker}</p>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  )
}

function DensityHeatmap({ cells }: { cells: DensityCell[] }) {
  if (!cells.length)
    return (
      <Panel kicker="Spatial density" title="空间密度">
        <div className="behavior-panel-empty">报告未包含密度网格。</div>
      </Panel>
    )
  const rows = Math.max(...cells.map((cell) => cell.row)) + 1
  const columns = Math.max(...cells.map((cell) => cell.col)) + 1
  const maximum = Math.max(...cells.map((cell) => cell.meanBees), 1)
  const byPosition = new Map(
    cells.map((cell) => [`${cell.row}:${cell.col}`, cell]),
  )
  return (
    <Panel kicker="Spatial density" title="空间密度">
      <div
        className="density-map"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows * columns }, (_, index) => {
          const row = Math.floor(index / columns)
          const col = index % columns
          const cell = byPosition.get(`${row}:${col}`)
          const intensity = cell
            ? Math.max(0.08, cell.meanBees / maximum)
            : 0.03
          return (
            <i
              key={`${row}:${col}`}
              style={{ opacity: intensity }}
              title={`网格 ${row + 1},${col + 1}: ${(cell?.meanBees ?? 0).toFixed(2)}`}
            />
          )
        })}
      </div>
      <div className="behavior-legend">
        <span>低密度</span>
        <span>每帧平均蜜蜂数</span>
        <span>高密度</span>
      </div>
    </Panel>
  )
}

function TemporalChart({ points }: { points: TemporalPoint[] }) {
  if (!points.length)
    return (
      <Panel kicker="Colony pulse" title="活动节律">
        <div className="behavior-panel-empty">报告未包含时间窗。</div>
      </Panel>
    )
  const width = 720,
    height = 260,
    pad = 32
  const max = Math.max(...points.map((point) => point.activity), 1)
  const x = (index: number) =>
    pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1)
  const y = (value: number) => height - pad - (value / max) * (height - pad * 2)
  const line = points
    .map((point, index) => `${x(index)},${y(point.activity)}`)
    .join(" ")
  return (
    <Panel kicker="Colony pulse" title="活动节律">
      <svg
        className="temporal-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="蜂群每个时间窗的平均活跃轨迹数"
      >
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
        <polyline points={line} />
        {points.map((point, index) => (
          <circle
            key={point.index}
            cx={x(index)}
            cy={y(point.activity)}
            r={point.anomaly ? 7 : 4}
            data-anomaly={point.anomaly}
          >
            <title>{`${point.start.toFixed(1)}–${point.end.toFixed(1)} 秒：${point.activity.toFixed(2)} 条活跃轨迹/帧${point.anomaly ? `，异常 z=${point.maxRobustZ?.toFixed(2)}` : ""}`}</title>
          </circle>
        ))}
      </svg>
      <div className="behavior-legend">
        <span>{points[0].start.toFixed(1)} 秒</span>
        <span>活跃轨迹 / 帧</span>
        <span>{points[points.length - 1].end.toFixed(1)} 秒</span>
      </div>
    </Panel>
  )
}

function FluxPanel({ report }: { report: BehaviorReportDetail }) {
  const hasData = report.entry_count !== null && report.exit_count !== null
  return (
    <Panel kicker="Hive gate flow" title="巢门通量">
      <div className="flux-readings">
        <div>
          <ArrowDownToLine />
          <span>进巢</span>
          <strong>{report.entry_count ?? "—"}</strong>
        </div>
        <div>
          <ArrowUpFromLine />
          <span>出巢</span>
          <strong>{report.exit_count ?? "—"}</strong>
        </div>
      </div>
      <p className="behavior-caption">
        {hasData
          ? "基于有向计数门与连续 Track ID。"
          : "本次分析未配置有向计数门，因此不推断进出巢数量。"}
      </p>
    </Panel>
  )
}

function InteractionPanel({ interactions }: { interactions: Interaction[] }) {
  return (
    <Panel kicker="Interaction network" title="近邻交互">
      {interactions.length ? (
        <ol className="interaction-list">
          {interactions.slice(0, 8).map((edge) => (
            <li key={`${edge.source}-${edge.target}`}>
              <Network />
              <span>
                Track {edge.source} ↔ {edge.target}
              </span>
              <strong>{edge.frames} 帧</strong>
            </li>
          ))}
        </ol>
      ) : (
        <div className="behavior-panel-empty">未记录可用的交互边。</div>
      )}
    </Panel>
  )
}

function TrackingView({ report }: { report: BehaviorReportDetail }) {
  const individuals = useMemo(() => parseIndividuals(report.payload), [report])
  return (
    <div className="behavior-stack">
      <section className="tracking-summary">
        <Footprints />
        <div>
          <strong>{individuals.length.toLocaleString("zh-CN")}</strong>
          <span>条个体轨迹记录</span>
        </div>
        <p>轨迹编号只在当前序列内有效，不代表跨视频生物身份。</p>
      </section>
      <div className="behavior-table-wrap observation-glass">
        <table>
          <thead>
            <tr>
              <th>Track ID</th>
              <th>观测数</th>
              <th>跨度</th>
              <th>均速</th>
              <th>路径长度</th>
              <th>ROI 停留</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {individuals.map((item) => (
              <tr key={item.trackId}>
                <td className="behavior-code">
                  T•{String(item.trackId).padStart(4, "0")}
                </td>
                <td>{item.observations}</td>
                <td>{item.spanSeconds.toFixed(1)} s</td>
                <td>{item.meanSpeed?.toFixed(2) ?? "—"} BL/s</td>
                <td>{item.pathLength?.toFixed(2) ?? "—"} BL</td>
                <td>{item.dwellSeconds?.toFixed(1) ?? "—"} s</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AlertsView({ report }: { report: BehaviorReportDetail }) {
  const temporal = useMemo(
    () => parseTemporal(report.payload).filter((item) => item.anomaly),
    [report],
  )
  const flux = useMemo(() => parseFluxEvents(report.payload), [report])
  return (
    <div className="behavior-stack">
      <section className="alert-summary">
        <Activity />
        <div>
          <strong>{temporal.length}</strong>
          <span>异常时间窗</span>
        </div>
        <p>阈值为非预热时间窗中任一稳健分数 |z| ≥ 3.5。</p>
      </section>
      <div className="behavior-grid behavior-grid--secondary">
        <Panel kicker="Robust anomaly" title="异常时间窗">
          {temporal.length ? (
            <ol className="event-list">
              {temporal.map((item) => (
                <li key={item.index}>
                  <span>
                    {item.start.toFixed(1)}–{item.end.toFixed(1)} 秒
                  </span>
                  <strong>max |z| {item.maxRobustZ?.toFixed(2)}</strong>
                  <small>活跃轨迹 {item.activity.toFixed(2)} / 帧</small>
                </li>
              ))}
            </ol>
          ) : (
            <div className="behavior-panel-empty">
              当前报告没有达到阈值的时间窗。
            </div>
          )}
        </Panel>
        <Panel kicker="Gate events" title="巢门事件">
          {flux.length ? (
            <ol className="event-list">
              {flux.map((item) => (
                <li key={`${item.frame}-${item.trackId}`}>
                  <span>
                    {item.time.toFixed(1)} 秒 · Track {item.trackId}
                  </span>
                  <strong>
                    {item.direction === "entry" ? "进巢" : "出巢"}
                  </strong>
                  <small>Frame {item.frame}</small>
                </li>
              ))}
            </ol>
          ) : (
            <div className="behavior-panel-empty">本次报告未记录巢门事件。</div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function ReportsView({
  reports,
  selected,
}: {
  reports: BehaviorReportSummary[]
  selected: BehaviorReportDetail
}) {
  const download = () => {
    const blob = new Blob([JSON.stringify(selected.payload, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${selected.sequence_id}-behavior-summary.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="behavior-stack">
      <section className="report-focus observation-glass">
        <FileCheck2 />
        <div>
          <p className="observation-kicker">Selected artifact</p>
          <h2>{selected.sequence_id}</h2>
          <p>{selected.source ?? "来源路径未记录"}</p>
          <code>{selected.source_sha256}</code>
        </div>
        <button type="button" onClick={download}>
          <Download />
          下载原始 JSON
        </button>
      </section>
      <div className="report-ledger">
        {reports.map((report) => (
          <article key={report.id} data-selected={report.id === selected.id}>
            <div>
              <span>{report.modality}</span>
              <strong>{report.sequence_id}</strong>
            </div>
            <dl>
              <div>
                <dt>模型</dt>
                <dd>{report.model_version ?? "未记录"}</dd>
              </div>
              <div>
                <dt>轨迹</dt>
                <dd>{report.track_count}</dd>
              </div>
              <div>
                <dt>时长</dt>
                <dd>{report.duration_seconds.toFixed(1)} s</dd>
              </div>
              <div>
                <dt>导入时间</dt>
                <dd>{new Date(report.created_at).toLocaleString("zh-CN")}</dd>
              </div>
            </dl>
            <code>{report.source_sha256.slice(0, 16)}…</code>
          </article>
        ))}
      </div>
    </div>
  )
}
