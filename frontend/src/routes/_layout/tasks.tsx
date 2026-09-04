import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRight,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ResearchContentFrame } from "@/components/Layout/ResearchContentFrame"
import { useResearchReveal } from "@/hooks/useResearchReveal"
import { formatEvidenceId } from "@/lib/observationIds"

export const Route = createFileRoute("/_layout/tasks")({
  component: TasksPage,
  head: () => ({ meta: [{ title: "分析过程记录 - 巢影蜂析" }] }),
})
type TaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
type AnalysisTaskItem = {
  id: string
  video_id: string
  owner_id: string
  task_type: string
  status: TaskStatus | string
  progress: number
  model_name: string | null
  error_message: string | null
  created_at: string | null
  started_at: string | null
  completed_at: string | null
}
type AnalysisTasksResponse = { data: AnalysisTaskItem[]; count: number }
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
type ResultItem = { id: string; task_id: string }
type ResultsResponse = { data: ResultItem[]; count: number }
type LoadMode = "initial" | "manual" | "silent"
const API_BASE = "/api/v1"
const ACTIVE_TASK_POLL_INTERVAL_MS = 5000

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function TasksPage() {
  const [tasks, setTasks] = useState<AnalysisTaskItem[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [results, setResults] = useState<ResultItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const loadData = useCallback(async (mode: LoadMode = "silent") => {
    if (mode === "initial") setIsLoading(true)
    if (mode === "manual") setIsRefreshing(true)
    try {
      const headers = getAuthHeaders()
      const [tasksResponse, videosResponse, resultsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/tasks/?skip=0&limit=100`, { headers }),
          fetch(`${API_BASE}/videos/?skip=0&limit=100`, { headers }),
          fetch(`${API_BASE}/results/?skip=0&limit=100`, { headers }),
        ])
      if (!tasksResponse.ok)
        throw new Error(`读取分析任务失败：${tasksResponse.status}`)
      if (!videosResponse.ok)
        throw new Error(`读取视频信息失败：${videosResponse.status}`)
      if (!resultsResponse.ok)
        throw new Error(`读取分析结果失败：${resultsResponse.status}`)
      const taskResult = (await tasksResponse.json()) as AnalysisTasksResponse
      const videoResult = (await videosResponse.json()) as VideosResponse
      const resultResult = (await resultsResponse.json()) as ResultsResponse
      setTasks(taskResult.data)
      setVideos(videoResult.data)
      setResults(resultResult.data)
      setErrorMessage(null)
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : "读取分析任务失败",
      )
    } finally {
      if (mode === "initial") setIsLoading(false)
      if (mode === "manual") setIsRefreshing(false)
    }
  }, [])

  const handleReanalyze = async (task: AnalysisTaskItem) => {
    if (!window.confirm("确定重新分析该视频吗？系统将创建一个新的分析任务。"))
      return
    setReanalyzingId(task.id)
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
        const body = await response.json().catch(() => null)
        throw new Error(body?.detail ?? `重新分析失败：${response.status}`)
      }
      await response.json()
      await loadData("manual")
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : "重新分析失败")
    } finally {
      setReanalyzingId(null)
    }
  }
  const handleDeleteTask = async (task: AnalysisTaskItem) => {
    if (task.status === "PENDING" || task.status === "PROCESSING") {
      setErrorMessage("正在执行的分析任务不能删除")
      return
    }
    if (
      !window.confirm(
        "确定删除该分析任务吗？关联的分析结果也会一并删除，此操作不可恢复。",
      )
    )
      return
    setDeletingId(task.id)
    setErrorMessage(null)
    try {
      const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.detail ?? `删除任务失败：${response.status}`)
      }
      await loadData("manual")
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : "删除分析任务失败",
      )
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    void loadData("initial")
  }, [loadData])
  const videoNameMap = useMemo(
    () => new Map(videos.map((v) => [v.id, v.original_filename])),
    [videos],
  )
  const resultIdByTask = useMemo(
    () => new Map(results.map((result) => [result.task_id, result.id])),
    [results],
  )
  const summary = useMemo(() => {
    const next = {
      total: tasks.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }
    for (const task of tasks) {
      if (task.status === "PENDING") next.pending += 1
      else if (task.status === "PROCESSING") next.processing += 1
      else if (task.status === "COMPLETED") next.completed += 1
      else if (task.status === "FAILED") next.failed += 1
    }
    return next
  }, [tasks])
  const hasActiveTasks = summary.pending + summary.processing > 0

  useEffect(() => {
    if (!hasActiveTasks) return

    let stopped = false
    let timer: number | undefined
    const schedule = () => {
      timer = window.setTimeout(() => void poll(), ACTIVE_TASK_POLL_INTERVAL_MS)
    }
    const poll = async () => {
      if (stopped) return
      if (document.visibilityState === "visible") await loadData("silent")
      if (!stopped) schedule()
    }
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return
      if (timer !== undefined) window.clearTimeout(timer)
      void poll()
    }

    schedule()
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      stopped = true
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [hasActiveTasks, loadData])

  useResearchReveal(".process-page", `${isLoading}:${tasks.length}`)

  return (
    <ResearchContentFrame
      as="main"
      size="workspace"
      density="process"
      className="research-page research-page--tasks process-page"
    >
      <header className="process-header">
        <div>
          <p className="research-eyebrow">ANALYSIS PROCESS</p>
          <h1>分析过程记录</h1>
          <p>记录每个观测样本从任务创建、处理中到结果形成的完整分析过程。</p>
        </div>
        <button
          type="button"
          className="research-icon-action"
          onClick={() => void loadData("manual")}
          disabled={isRefreshing}
          aria-label="刷新分析任务"
        >
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
          <span>刷新</span>
        </button>
      </header>
      {errorMessage && (
        <div className="research-alert" role="alert">
          <TriangleAlert aria-hidden="true" />
          {errorMessage}
        </div>
      )}
      <section className="process-summary" aria-label="分析任务汇总">
        {[
          ["全部任务", summary.total],
          ["等待分析", summary.pending],
          ["分析中", summary.processing],
          ["已完成", summary.completed],
          ["失败", summary.failed],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
      <section className="process-records" aria-labelledby="records-title">
        <div className="process-section-heading">
          <div>
            <p className="research-eyebrow">ANALYSIS RECORDS</p>
            <h2 id="records-title">分析记录</h2>
          </div>
          <p>
            {hasActiveTasks
              ? "活动任务每 5 秒同步"
              : "当前无活动任务 · 按需刷新"}
            {" · "}共 {summary.total} 条
          </p>
        </div>
        {isLoading ? (
          <div
            className="research-loading-plane"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="research-loading-copy">
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              正在读取分析过程，记录骨架保持可见…
            </div>
            {[0, 1, 2].map((row) => (
              <div
                className="research-loading-row"
                aria-hidden="true"
                key={row}
              >
                <span className="research-skeleton is-medium" />
                <span className="research-skeleton is-wide" />
                <span className="research-skeleton is-short" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="research-empty">
            <p>暂无分析记录。请先从观测档案创建分析任务。</p>
          </div>
        ) : (
          <div className="process-record-list">
            {tasks.map((task) => (
              <AnalysisRecord
                key={task.id}
                task={task}
                videoName={videoNameMap.get(task.video_id) ?? "未知观测样本"}
                resultId={resultIdByTask.get(task.id)}
                menuOpen={openMenuId === task.id}
                onToggleMenu={() =>
                  setOpenMenuId((v) => (v === task.id ? null : task.id))
                }
                onReanalyze={() => void handleReanalyze(task)}
                onDelete={() => void handleDeleteTask(task)}
                reanalyzing={reanalyzingId === task.id}
                deleting={deletingId === task.id}
              />
            ))}
          </div>
        )}
      </section>
    </ResearchContentFrame>
  )
}

function AnalysisRecord({
  task,
  videoName,
  resultId,
  menuOpen,
  onToggleMenu,
  onReanalyze,
  onDelete,
  reanalyzing,
  deleting,
}: {
  task: AnalysisTaskItem
  videoName: string
  resultId?: string
  menuOpen: boolean
  onToggleMenu: () => void
  onReanalyze: () => void
  onDelete: () => void
  reanalyzing: boolean
  deleting: boolean
}) {
  const status = getTaskStatus(task.status)
  const progress = Math.max(0, Math.min(100, task.progress))
  const videoId = formatEvidenceId("V", task.video_id)
  const analysisId = formatEvidenceId("A", task.id)
  const resultIdText = resultId ? formatEvidenceId("R", resultId) : "…"
  return (
    <article
      className="process-record"
      data-status={status.tone}
      data-research-reveal
    >
      <div className="process-record-grid">
        <div className="process-record-identity-cell">
          <div className="process-identity">
            <strong data-presentation-id={analysisId}>{analysisId}</strong>
            <span>{videoId} 原始观测</span>
            <span>{task.model_name ?? "baseline-v1"}</span>
          </div>
          <p className="process-file" title={videoName}>
            {videoName}
          </p>
          <div className="process-status">
            <span aria-hidden="true" />
            <strong>{status.label}</strong>
            <em>{progress}%</em>
            {task.error_message && <p>{task.error_message}</p>}
          </div>
        </div>
        <fieldset className="process-evidence process-record-relation">
          <legend className="sr-only">研究证据链</legend>
          <span>{videoId}</span>
          <i>→</i>
          <span>{analysisId}</span>
          <i>→</i>
          <span>{resultIdText}</span>
        </fieldset>
        <div
          className="process-track process-record-timeline"
          style={
            { "--process-progress": `${progress}%` } as React.CSSProperties
          }
        >
          <div className="process-track-line" aria-hidden="true">
            <span
              className="process-track-node is-origin"
              data-role="create-origin"
            />
            <span
              className="process-track-node is-analysis"
              data-role="analysis-node"
            />
            <span
              className="process-track-node is-evidence"
              data-role="result-endpoint"
            />
          </div>
          <div className="process-track-labels">
            <div>
              <b>创建</b>
              <time>{formatDate(task.created_at)}</time>
            </div>
            <div>
              <b>
                {task.status === "PENDING"
                  ? "等待"
                  : task.status === "PROCESSING"
                    ? "分析中"
                    : "分析"}
              </b>
              <time>{formatDate(task.started_at)}</time>
            </div>
            <div>
              <b>{task.status === "FAILED" ? "失败" : "结果"}</b>
              <time>{formatDate(task.completed_at)}</time>
            </div>
          </div>
        </div>
        <div className="process-actions process-record-actions">
          <Link
            to="/tasks/$taskId"
            params={{ taskId: task.id }}
            className="process-primary-action"
          >
            查看任务 <ArrowRight aria-hidden="true" />
          </Link>
          {task.status === "COMPLETED" && (
            <Link to="/results" search={{ task_id: task.id }}>
              查看结果
            </Link>
          )}
          {(task.status === "COMPLETED" || task.status === "FAILED") && (
            <div className="process-menu">
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label="更多任务操作"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal />
              </button>
              {menuOpen && (
                <div>
                  <button
                    type="button"
                    onClick={onReanalyze}
                    disabled={reanalyzing}
                  >
                    {reanalyzing ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <RotateCcw />
                    )}
                    重新分析
                  </button>
                  <button type="button" onClick={onDelete} disabled={deleting}>
                    {deleting ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                    删除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function getTaskStatus(status: string) {
  if (status === "COMPLETED") return { label: "分析完成", tone: "complete" }
  if (status === "PROCESSING") return { label: "分析中", tone: "processing" }
  if (status === "FAILED") return { label: "分析失败", tone: "failed" }
  return { label: "等待分析", tone: "pending" }
}
function formatDate(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}
