import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRight,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { ResearchContentFrame } from "@/components/Layout/ResearchContentFrame"
import { useResearchReveal } from "@/hooks/useResearchReveal"
import { formatEvidenceId } from "@/lib/observationIds"

export const Route = createFileRoute("/_layout/results")({
  component: ResultsPage,
  validateSearch: (search: Record<string, unknown>): { task_id?: string } =>
    typeof search.task_id === "string" ? { task_id: search.task_id } : {},
  head: () => ({ meta: [{ title: "蜂群行为指纹 - 巢影蜂析" }] }),
})
type AnalysisResultItem = {
  id: string
  task_id: string
  video_id: string
  owner_id: string
  detected_individuals: number
  valid_tracks: number
  entry_count: number
  exit_count: number
  average_speed: number | null
  activity_index: number | null
  abnormal_event_count: number
  metrics_json: string | null
  result_video_path: string | null
  result_json_path: string | null
  created_at: string | null
}
type AnalysisResultsResponse = { data: AnalysisResultItem[]; count: number }
type ResultMetrics = {
  source?: string
  metric_status?: string
  flux_status?: string | null
}
type VideoItem = {
  id: string
  original_filename: string
  scene_type: string
  file_size: number
  content_type: string | null
  status: string
  owner_id: string
  created_at: string | null
}
type VideosResponse = { data: VideoItem[]; count: number }
type AnalysisTaskItem = {
  id: string
  video_id: string
  owner_id: string
  task_type: string
  status: string
  progress: number
  model_name: string | null
  error_message: string | null
  created_at: string | null
  started_at: string | null
  completed_at: string | null
}
type AnalysisTasksResponse = { data: AnalysisTaskItem[]; count: number }
const API_BASE = "/api/v1"
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function ResultsPage() {
  const { task_id: requestedTaskId } = Route.useSearch()
  const [results, setResults] = useState<AnalysisResultItem[]>([]),
    [videos, setVideos] = useState<VideoItem[]>([]),
    [tasks, setTasks] = useState<AnalysisTaskItem[]>([])
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null),
    [isLoading, setIsLoading] = useState(true),
    [isRefreshing, setIsRefreshing] = useState(false),
    [errorMessage, setErrorMessage] = useState<string | null>(null)
  const loadData = useCallback(
    async (manual = false) => {
      manual ? setIsRefreshing(true) : setIsLoading(true)
      setErrorMessage(null)
      try {
        const headers = getAuthHeaders()
        const [rr, vr, tr] = await Promise.all([
          fetch(`${API_BASE}/results/?skip=0&limit=100`, { headers }),
          fetch(`${API_BASE}/videos/?skip=0&limit=100`, { headers }),
          fetch(`${API_BASE}/tasks/?skip=0&limit=100`, { headers }),
        ])
        if (!rr.ok) throw new Error(`读取分析结果失败：${rr.status}`)
        if (!vr.ok) throw new Error(`读取视频信息失败：${vr.status}`)
        if (!tr.ok) throw new Error(`读取任务信息失败：${tr.status}`)
        const rd = (await rr.json()) as AnalysisResultsResponse,
          vd = (await vr.json()) as VideosResponse,
          td = (await tr.json()) as AnalysisTasksResponse
        setResults(rd.data)
        setVideos(vd.data)
        setTasks(td.data)
        setSelectedResultId((current) => {
          const requested = rd.data.find((r) => r.task_id === requestedTaskId)
          return requested?.id ?? current ?? rd.data[0]?.id ?? null
        })
      } catch (error) {
        console.error(error)
        setErrorMessage(
          error instanceof Error ? error.message : "读取分析结果失败",
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [requestedTaskId],
  )
  useEffect(() => {
    void loadData()
  }, [loadData])
  const videoMap = useMemo(
      () => new Map(videos.map((v) => [v.id, v])),
      [videos],
    ),
    taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const selectedResult = useMemo(
    () => results.find((r) => r.id === selectedResultId) ?? results[0] ?? null,
    [results, selectedResultId],
  )
  const selectedVideo = selectedResult
      ? videoMap.get(selectedResult.video_id)
      : undefined,
    selectedTask = selectedResult
      ? taskMap.get(selectedResult.task_id)
      : undefined
  useResearchReveal(
    ".result-page",
    `${isLoading}:${selectedResult?.id ?? "none"}`,
    true,
  )
  return (
    <ResearchContentFrame
      as="main"
      size="workspace"
      density="result"
      className="research-page research-page--results result-page"
    >
      <header className="result-header">
        <div>
          <p className="research-eyebrow">BEHAVIOR RESULT</p>
          <h1>
            {selectedResult
              ? `行为结果 ${formatEvidenceId("R", selectedResult.id)}`
              : "蜂群行为指纹"}
          </h1>
          <p>
            将个体检测、轨迹质量、巢门流动与活动状态组织为可追溯的蜂群行为读数。
          </p>
        </div>
        <button
          type="button"
          className="research-icon-action"
          onClick={() => void loadData(true)}
          disabled={isRefreshing || isLoading}
          aria-label={
            isLoading || isRefreshing ? "正在读取分析结果" : "刷新分析结果"
          }
        >
          <RefreshCw
            className={isRefreshing ? "animate-spin" : ""}
            aria-hidden="true"
          />
          <span>刷新结果</span>
        </button>
      </header>
      {errorMessage && (
        <div className="research-alert" role="alert">
          <TriangleAlert />
          {errorMessage}
        </div>
      )}
      {isLoading ? (
        <ResultLoadingPlane />
      ) : !selectedResult ? (
        <div className="research-empty">
          <p>暂无分析结果。请先在观测档案创建分析任务。</p>
        </div>
      ) : (
        <ResultInstrument
          result={selectedResult}
          video={selectedVideo}
          task={selectedTask}
        />
      )}
      {results.length > 1 && (
        <section className="result-index" aria-labelledby="result-index-title">
          <div className="result-section-heading">
            <div>
              <p className="research-eyebrow">RESULT ARCHIVE</p>
              <h2 id="result-index-title">结果档案</h2>
            </div>
            <p>{results.length} 份行为结果</p>
          </div>
          <div>
            {results.map((result) => {
              const active = result.id === selectedResult?.id
              return (
                <button
                  key={result.id}
                  type="button"
                  className={active ? "is-active" : ""}
                  onClick={() => {
                    setSelectedResultId(result.id)
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                >
                  <strong>{formatEvidenceId("R", result.id)}</strong>
                  <span>
                    {formatEvidenceId("V", result.video_id)} →{" "}
                    {formatEvidenceId("A", result.task_id)}
                  </span>
                  <time>
                    {formatDate(result.created_at)} ·{" "}
                    {taskMap.get(result.task_id)?.model_name ?? "baseline-v1"}
                  </time>
                  <ArrowRight />
                </button>
              )
            })}
          </div>
        </section>
      )}
    </ResearchContentFrame>
  )
}

function ResultLoadingPlane() {
  return (
    <section
      className="research-loading-plane"
      aria-label="分析结果正在载入"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="research-loading-copy">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        正在读取分析结果，页面骨架保持可见…
      </div>
      <div className="research-loading-row" aria-hidden="true">
        <span className="research-skeleton is-medium" />
        <span className="research-skeleton is-wide" />
        <span className="research-skeleton is-short" />
      </div>
      <div className="research-loading-row" aria-hidden="true">
        <span className="research-skeleton is-short" />
        <span className="research-skeleton is-wide" />
        <span className="research-skeleton is-medium" />
      </div>
    </section>
  )
}

function ResultInstrument({
  result,
  video,
  task,
}: {
  result: AnalysisResultItem
  video?: VideoItem
  task?: AnalysisTaskItem
}) {
  const v = formatEvidenceId("V", result.video_id),
    a = formatEvidenceId("A", result.task_id),
    r = formatEvidenceId("R", result.id),
    trackRate = calculateTrackRate(result),
    metrics = parseResultMetrics(result.metrics_json),
    fluxAvailable = metrics?.flux_status !== "unavailable_without_gate_or_roi",
    activity = Math.max(0, Math.min(1, result.activity_index ?? 0)),
    net = result.entry_count - result.exit_count,
    totalFlow = result.entry_count + result.exit_count,
    entryShare = totalFlow ? (result.entry_count / totalFlow) * 100 : 50
  return (
    <>
      <section
        className="result-provenance"
        aria-labelledby="result-provenance-title"
        data-research-reveal
        data-research-sequence="evidence"
      >
        <h2 id="result-provenance-title" className="sr-only">
          研究证据身份
        </h2>
        <nav className="result-chain" aria-label="研究证据链">
          <Link
            to="/videos/$videoId"
            params={{ videoId: result.video_id }}
            className="result-chain-step"
            data-presentation-id={v}
          >
            <small>原始观测</small>
            <strong>{v}</strong>
          </Link>
          <i aria-hidden="true">→</i>
          <Link
            to="/tasks/$taskId"
            params={{ taskId: result.task_id }}
            className="result-chain-step"
            data-presentation-id={a}
          >
            <small>分析任务</small>
            <strong>{a}</strong>
          </Link>
          <i aria-hidden="true">→</i>
          <span className="result-chain-step" data-presentation-id={r}>
            <small>行为结果</small>
            <strong>{r}</strong>
          </span>
        </nav>
        <dl>
          <div>
            <dt>观察场景</dt>
            <dd>{formatSceneType(video?.scene_type)}</dd>
          </div>
          <div>
            <dt>分析模型</dt>
            <dd>{task?.model_name ?? "baseline-v1"}</dd>
          </div>
          <div>
            <dt>结果写入</dt>
            <dd>{formatDate(result.created_at)}</dd>
          </div>
          <div className="result-filename">
            <dt>原始文件</dt>
            <dd title={video?.original_filename}>
              {video?.original_filename ?? "未知视频"}
            </dd>
          </div>
        </dl>
      </section>
      <section
        className="fingerprint-instrument"
        aria-labelledby="fingerprint-title"
      >
        <div className="fingerprint-title">
          <p className="research-eyebrow">HIVE BEHAVIOR SIGNATURE</p>
          <h2 id="fingerprint-title">蜂群行为指纹</h2>
          <p>
            核心读数与三组辅助判断围绕巢门签名组织，所有数值来自当前结果记录。
          </p>
        </div>
        <section
          className="result-core"
          aria-label="核心结果读数"
          data-research-reveal
          data-research-sequence="core"
        >
          {[
            ["检测记录", result.detected_individuals, "框", "neutral"],
            ["序列内轨迹", result.valid_tracks, "条", "steel"],
            [
              "活动指数",
              formatActivityIndex(result.activity_index),
              "指数",
              "orange",
            ],
            ["异常事件", result.abnormal_event_count, "次", "alert"],
          ].map(([label, value, unit, tone]) => (
            <div key={label} data-tone={tone}>
              <span>{label}</span>
              <strong>{value}</strong>
              <em>{unit}</em>
            </div>
          ))}
        </section>
        <section
          className="fingerprint-panel hive-signature"
          data-research-reveal
          data-research-sequence="hive"
        >
          <header>
            <span>01</span>
            <h3>巢门行为</h3>
            <p>{fluxAvailable ? "进出巢方向与净流量" : "未配置巢门线或 ROI"}</p>
          </header>
          <div
            className="mini-hive-signature"
            role="img"
            aria-label={
              fluxAvailable
                ? `进巢 ${result.entry_count} 次，出巢 ${result.exit_count} 次，净流量 ${net >= 0 ? `正 ${net}` : net}`
                : "未配置巢门线或 ROI，进出巢计数不可用"
            }
          >
            <div className="mini-hive-reading is-entry">
              <span>进巢</span>
              <strong>{fluxAvailable ? result.entry_count : "—"}</strong>
            </div>
            <svg
              viewBox="0 0 760 236"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="mini-flow-arc is-entry"
                d="M18 58 C 170 56, 262 78, 366 108"
              />
              <path
                className="mini-flow-arc is-entry is-secondary"
                d="M64 22 C 196 24, 286 58, 366 96"
              />
              <path
                className="mini-flow-arrow is-entry"
                d="M351 96 L366 108 L347 112"
              />
              <path className="mini-hive-gate" d="M372 64 V174 M388 64 V174" />
              <path
                className="mini-flow-arc is-exit"
                d="M396 136 C 506 156, 594 184, 742 184"
              />
              <path
                className="mini-flow-arc is-exit is-secondary"
                d="M396 148 C 492 184, 586 214, 694 214"
              />
              <path
                className="mini-flow-arrow is-exit"
                d="M727 173 L742 184 L723 190"
              />
              <text className="mini-hive-gate-label" x="380" y="38">
                巢门
              </text>
            </svg>
            <div className="mini-hive-reading is-exit">
              <span>出巢</span>
              <strong>{fluxAvailable ? result.exit_count : "—"}</strong>
            </div>
          </div>
          <div className="hive-balance">
            <span style={{ width: `${entryShare}%` }} />
            <i aria-hidden="true" />
          </div>
          <p className="panel-reading">
            {fluxAvailable ? (
              <>
                净流量 <strong>{net >= 0 ? `+${net}` : net}</strong> ·{" "}
                {net === 0 ? "进出平衡" : net > 0 ? "进巢占优" : "出巢占优"}
              </>
            ) : (
              "进出巢计数不可用，不将缺失值解读为 0。"
            )}
          </p>
        </section>
        <section
          className="fingerprint-panel activity-state"
          data-research-reveal
          data-research-sequence="activity"
        >
          <header>
            <span>02</span>
            <h3>活动状态</h3>
            <p>基于当前技术参考区间</p>
          </header>
          <div className="activity-reading">
            <strong>{result.activity_index ?? "—"}</strong>
            <span>{getActivityLabel(result.activity_index)}</span>
          </div>
          <div
            className={`scientific-gauge${result.activity_index === null ? " is-unavailable" : ""}`}
            role="img"
            aria-label={`活动指数 ${formatActivityIndex(result.activity_index)}，技术参考区间 0.35 至 0.75`}
            style={
              { "--activity-position": `${activity * 100}%` } as CSSProperties
            }
          >
            <span />
            <i />
            <i />
          </div>
          <div className="gauge-axis">
            <span>0.00</span>
            <span>技术参考区间 0.35–0.75</span>
            <span>1.00</span>
          </div>
        </section>
        <section
          className="fingerprint-panel tracking-quality"
          data-research-reveal
          data-research-sequence="tracking"
        >
          <header>
            <span>03</span>
            <h3>轨迹汇总</h3>
            <p>序列内轨迹 / 检测框记录</p>
          </header>
          <div className="tracking-reading">
            <strong>
              {result.valid_tracks} / {result.detected_individuals}
            </strong>
            <span>{trackRate}%</span>
          </div>
          <div
            className="efficiency-rail"
            role="img"
            aria-label={`轨迹与检测记录的描述性归并比 ${result.valid_tracks} / ${result.detected_individuals}，${trackRate}%`}
            style={{ "--track-rate": `${trackRate}%` } as CSSProperties}
          >
            <span />
          </div>
          <p className="panel-reading">
            平均速度 <strong>{result.average_speed ?? "—"}</strong> 体长/s ·
            归并比仅作描述，不代表轨迹准确率
          </p>
        </section>
        <section
          className="fingerprint-panel abnormal-reading"
          data-research-reveal
          data-research-sequence="abnormal"
        >
          <header>
            <span>04</span>
            <h3>异常信号</h3>
            <p>当前样本异常事件真实计数</p>
          </header>
          <div>
            <TriangleAlert />
            <strong>{result.abnormal_event_count}</strong>
            <span>次</span>
          </div>
          <p>未提供异常明细时仅呈现真实计数，不推断事件类型。</p>
        </section>
      </section>
    </>
  )
}

function calculateTrackRate(result: AnalysisResultItem) {
  return result.detected_individuals > 0
    ? Number(
        ((result.valid_tracks / result.detected_individuals) * 100).toFixed(1),
      )
    : 0
}
function parseResultMetrics(value: string | null): ResultMetrics | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === "object"
      ? (parsed as ResultMetrics)
      : null
  } catch {
    return null
  }
}
function getActivityLabel(value: number | null) {
  if (value === null) return "暂无数据"
  if (value > 0.75) return "高活跃"
  if (value >= 0.35) return "正常活跃"
  return "低活跃"
}
function formatActivityIndex(value: number | null) {
  return value === null ? "—" : value.toFixed(2)
}
function formatSceneType(value?: string) {
  if (value === "OUTDOOR") return "户外可见光"
  if (value === "INDOOR") return "巢内红外"
  return "未知场景"
}
function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
}
