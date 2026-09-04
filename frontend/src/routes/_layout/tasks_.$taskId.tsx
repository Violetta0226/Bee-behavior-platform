import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowRight,
  FileVideo,
  Gauge,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react"

import { ResearchContentFrame } from "@/components/Layout/ResearchContentFrame"
import { useResearchReveal } from "@/hooks/useResearchReveal"
import { formatEvidenceId } from "@/lib/observationIds"

export const Route = createFileRoute("/_layout/tasks_/$taskId")({
  component: TaskDetailPage,
  head: () => ({ meta: [{ title: "分析过程检视 - 巢影蜂析" }] }),
})

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

const API_BASE = "/api/v1"

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function TaskDetailPage() {
  const { taskId } = Route.useParams()
  const navigate = Route.useNavigate()
  const [task, setTask] = useState<AnalysisTaskItem | null>(null)
  const [video, setVideo] = useState<VideoItem | null>(null)
  const [result, setResult] = useState<AnalysisResultItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadData = useCallback(
    async (manual = false) => {
      manual ? setIsRefreshing(true) : setIsLoading(true)
      setErrorMessage(null)
      try {
        const headers = getAuthHeaders()
        const taskResponse = await fetch(`${API_BASE}/tasks/${taskId}`, {
          headers,
        })
        if (!taskResponse.ok) {
          throw new Error(`读取任务详情失败：${taskResponse.status}`)
        }
        const taskData = (await taskResponse.json()) as AnalysisTaskItem
        setTask(taskData)
        const [videoResponse, resultResponse] = await Promise.all([
          fetch(`${API_BASE}/videos/${taskData.video_id}`, { headers }),
          fetch(`${API_BASE}/results/task/${taskId}`, { headers }),
        ])
        if (!videoResponse.ok) {
          throw new Error(`读取视频信息失败：${videoResponse.status}`)
        }
        setVideo((await videoResponse.json()) as VideoItem)
        if (resultResponse.ok) {
          setResult((await resultResponse.json()) as AnalysisResultItem)
        } else if (resultResponse.status === 404) {
          setResult(null)
        } else {
          throw new Error(`读取分析结果失败：${resultResponse.status}`)
        }
      } catch (error) {
        console.error(error)
        setErrorMessage(
          error instanceof Error ? error.message : "读取任务详情失败",
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [taskId],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (task?.status !== "PENDING" && task?.status !== "PROCESSING") return
    const timer = window.setInterval(() => void loadData(true), 2000)
    return () => window.clearInterval(timer)
  }, [loadData, task?.status])

  useResearchReveal(
    ".task-inspector",
    `${isLoading}:${task?.id ?? "none"}`,
    true,
  )

  const handleReanalyze = async () => {
    if (!task) return
    if (!window.confirm("确定重新分析该视频吗？系统将创建一个新的分析任务。"))
      return
    setIsReanalyzing(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`${API_BASE}/tasks/`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: task.video_id,
          model_name: task.model_name ?? "baseline-v1",
        }),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail ?? `重新分析失败：${response.status}`)
      }
      await navigate({ to: "/tasks" })
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : "重新分析失败")
    } finally {
      setIsReanalyzing(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (task.status === "PENDING" || task.status === "PROCESSING") {
      setErrorMessage("正在执行的任务不能删除")
      return
    }
    if (
      !window.confirm(
        "确定删除该分析任务吗？关联分析结果也会被删除，此操作不可恢复。",
      )
    )
      return
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail ?? `删除任务失败：${response.status}`)
      }
      await navigate({ to: "/tasks" })
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : "删除任务失败")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) return <TaskInspectorLoading />

  if (!task) {
    return (
      <ResearchContentFrame
        as="main"
        size="workspace"
        density="process"
        className="research-page task-inspector task-inspector-state"
      >
        <TriangleAlert aria-hidden="true" />
        <h1>未找到分析任务</h1>
        <Link to="/tasks">返回分析任务</Link>
        {errorMessage && <p>{errorMessage}</p>}
      </ResearchContentFrame>
    )
  }

  const status = getTaskStatus(task.status)
  const progress = Math.max(0, Math.min(100, task.progress))
  const analysisId = formatEvidenceId("A", task.id)
  const videoId = formatEvidenceId("V", task.video_id)
  const resultId = result ? formatEvidenceId("R", result.id) : null

  return (
    <ResearchContentFrame
      as="main"
      size="workspace"
      density="process"
      className="research-page research-page--task-detail task-inspector"
    >
      <header className="task-inspector-header">
        <div>
          <p className="research-eyebrow">ANALYSIS RECORD</p>
          <h1>
            任务详情 <span data-presentation-id={analysisId}>{analysisId}</span>
          </h1>
          <p className="task-inspector-subtitle">
            <span data-presentation-id={videoId}>{videoId}</span>
            <i aria-hidden="true">·</i>
            <span>{task.model_name ?? "baseline-v1"}</span>
            <i aria-hidden="true">·</i>
            <strong data-tone={status.tone}>{status.label}</strong>
          </p>
        </div>
        <div className="task-inspector-actions">
          <button
            type="button"
            className="research-icon-action"
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={isRefreshing ? "animate-spin" : ""}
              aria-hidden="true"
            />
            刷新
          </button>
          {(task.status === "COMPLETED" || task.status === "FAILED") && (
            <button
              type="button"
              className="research-icon-action"
              onClick={() => void handleReanalyze()}
              disabled={isReanalyzing}
            >
              {isReanalyzing ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              重新分析
            </button>
          )}
          <Link to="/tasks" className="research-icon-action">
            <ArrowLeft aria-hidden="true" />
            返回
          </Link>
        </div>
      </header>

      {errorMessage && (
        <div className="research-alert" role="alert">
          <TriangleAlert aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      <section
        className="task-process-instrument"
        aria-labelledby="task-process-title"
        data-status={status.tone}
        data-research-reveal
      >
        <header>
          <div>
            <p className="research-eyebrow">PROCESS INSTRUMENT</p>
            <h2 id="task-process-title">分析证据与过程</h2>
          </div>
          <div className="task-process-state">
            <span>{status.label}</span>
            <strong>{progress}%</strong>
          </div>
        </header>
        <div className="task-process-rail">
          <ProcessNode
            phase="Create"
            label="原始观测"
            evidenceId={videoId}
            detail={formatDate(task.created_at)}
            tone="video"
            action={
              <Link to="/videos/$videoId" params={{ videoId: task.video_id }}>
                查看观测 <ArrowRight aria-hidden="true" />
              </Link>
            }
          />
          <span className="task-process-connector" aria-hidden="true" />
          <ProcessNode
            phase="Analyze"
            label="视频分析"
            evidenceId={analysisId}
            detail={`${task.model_name ?? "baseline-v1"} · ${status.label}`}
            tone="analysis"
          />
          <span className="task-process-connector" aria-hidden="true" />
          <ProcessNode
            phase="Result"
            label="行为结果"
            evidenceId={resultId ?? "暂无结果"}
            detail={
              result
                ? formatDate(result.created_at)
                : task.status === "COMPLETED"
                  ? "结果记录尚未返回"
                  : "等待分析完成"
            }
            tone={result ? "result" : "pending"}
            action={
              result ? (
                <Link to="/results" search={{ task_id: task.id }}>
                  查看结果 <ArrowRight aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
        </div>
        <div
          className="task-process-progress"
          style={{ "--task-progress": `${progress}%` } as CSSProperties}
          role="img"
          aria-label={`分析进度 ${progress}%`}
        >
          <span />
        </div>
      </section>

      <section
        className="task-reading-section"
        aria-labelledby="task-readings-title"
        data-research-reveal
      >
        <div className="task-inspector-section-heading">
          <div>
            <p className="research-eyebrow">TASK READINGS</p>
            <h2 id="task-readings-title">任务读数</h2>
          </div>
          <p>时间、模型与状态来自当前任务记录</p>
        </div>
        <dl className="task-reading-grid">
          <Reading label="创建时间" value={formatDate(task.created_at)} />
          <Reading label="开始时间" value={formatDate(task.started_at)} />
          <Reading label="完成时间" value={formatDate(task.completed_at)} />
          <Reading
            label="运行耗时"
            value={formatDuration(task.started_at, task.completed_at)}
          />
          <Reading label="分析模型" value={task.model_name ?? "baseline-v1"} />
          <Reading label="当前状态" value={status.label} tone={status.tone} />
        </dl>
      </section>

      <section
        className="task-association-plane"
        aria-labelledby="task-association-title"
        data-research-reveal
      >
        <div className="task-inspector-section-heading">
          <div>
            <p className="research-eyebrow">ASSOCIATED EVIDENCE</p>
            <h2 id="task-association-title">关联证据</h2>
          </div>
        </div>
        <article className="task-result-rail">
          <Gauge aria-hidden="true" />
          <div>
            <span>关联结果</span>
            <strong data-presentation-id={resultId ?? undefined}>
              {resultId ?? "暂无分析结果"}
            </strong>
          </div>
          {result ? (
            <>
              <dl>
                <div>
                  <dt>检测记录</dt>
                  <dd>{result.detected_individuals}</dd>
                </div>
                <div>
                  <dt>序列内轨迹</dt>
                  <dd>{result.valid_tracks}</dd>
                </div>
                <div>
                  <dt>活动指数</dt>
                  <dd>{result.activity_index ?? "—"}</dd>
                </div>
                <div>
                  <dt>异常</dt>
                  <dd>{result.abnormal_event_count}</dd>
                </div>
              </dl>
              <Link to="/results" search={{ task_id: task.id }}>
                查看结果 <ArrowRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p>
              {task.status === "COMPLETED"
                ? "当前任务尚无可读取的结果记录"
                : "任务完成后建立结果证据节点"}
            </p>
          )}
        </article>
        <article className="task-observation-rail">
          <FileVideo aria-hidden="true" />
          <div className="task-observation-identity">
            <span>关联观测</span>
            <strong data-presentation-id={videoId}>{videoId}</strong>
          </div>
          <div>
            <span>观察场景</span>
            <strong>{formatSceneType(video?.scene_type)}</strong>
          </div>
          <div>
            <span>记录时间</span>
            <strong>{formatDate(video?.created_at ?? null)}</strong>
          </div>
          <p title={video?.original_filename}>
            {video?.original_filename ?? "关联视频不可用"}
          </p>
          <Link to="/videos/$videoId" params={{ videoId: task.video_id }}>
            查看观测 <ArrowRight aria-hidden="true" />
          </Link>
        </article>
      </section>

      <details className="task-technical-details">
        <summary>技术详情</summary>
        <dl>
          <Reading label="任务类型" value={task.task_type} technical />
          <Reading label="状态枚举" value={task.status} technical />
          <Reading label="任务 UUID" value={task.id} technical />
          <Reading label="视频 UUID" value={task.video_id} technical />
        </dl>
        {(task.status === "COMPLETED" || task.status === "FAILED") && (
          <button
            type="button"
            className="task-delete-action"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            删除任务
          </button>
        )}
      </details>

      {task.error_message && (
        <section className="task-error-record" role="alert">
          <TriangleAlert aria-hidden="true" />
          <div>
            <strong>任务错误记录</strong>
            <p>{task.error_message}</p>
          </div>
        </section>
      )}
    </ResearchContentFrame>
  )
}

function TaskInspectorLoading() {
  return (
    <ResearchContentFrame
      as="main"
      size="workspace"
      density="process"
      className="research-page task-inspector task-inspector-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-route-loading-skeleton=""
    >
      <header className="task-inspector-header">
        <div className="task-inspector-loading-heading">
          <span className="research-skeleton is-short" />
          <span className="research-skeleton is-medium" />
          <span className="research-skeleton is-wide" />
        </div>
      </header>
      <section className="research-loading-plane">
        <div className="research-loading-copy">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          正在读取分析过程，工作站与导航保持可见…
        </div>
        <div className="research-loading-row" aria-hidden="true">
          <span className="research-skeleton is-medium" />
          <span className="research-skeleton is-wide" />
          <span className="research-skeleton is-short" />
        </div>
      </section>
    </ResearchContentFrame>
  )
}

function ProcessNode({
  phase,
  label,
  evidenceId,
  detail,
  tone,
  action,
}: {
  phase: string
  label: string
  evidenceId: string
  detail: string
  tone: "video" | "analysis" | "result" | "pending"
  action?: ReactNode
}) {
  return (
    <article className="task-process-node" data-tone={tone}>
      <span className="task-process-phase">{phase}</span>
      <strong>{evidenceId}</strong>
      <p>{label}</p>
      <small>{detail}</small>
      {action}
    </article>
  )
}

function Reading({
  label,
  value,
  tone,
  technical = false,
}: {
  label: string
  value: string
  tone?: string
  technical?: boolean
}) {
  return (
    <div data-tone={tone} data-technical={technical ? "" : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function getTaskStatus(status: string) {
  if (status === "COMPLETED") return { label: "分析完成", tone: "complete" }
  if (status === "PROCESSING") return { label: "分析中", tone: "processing" }
  if (status === "FAILED") return { label: "分析失败", tone: "failed" }
  return { label: "等待分析", tone: "pending" }
}

function formatSceneType(value?: string) {
  if (value === "OUTDOOR") return "户外可见光"
  if (value === "INDOOR") return "巢内红外"
  return value ?? "未知场景"
}

function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)
}

function formatDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return "—"
  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return "—"
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds} 秒`
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
}
