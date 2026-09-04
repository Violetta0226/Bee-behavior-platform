import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Activity,
  ArrowLeft,
  CircleDot,
  Clock3,
  ExternalLink,
  FileVideo,
  Gauge,
  GitBranch,
  LoaderCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"
import type { CSSProperties } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import "@/components/Dashboard/observation-theme.css"
import { ResearchContentFrame } from "@/components/Layout/ResearchContentFrame"
import {
  formatEvidenceId,
  selectObservationEvidence,
} from "@/lib/observationIds"
import "./videos-detail.css"

export const Route = createFileRoute("/_layout/videos/$videoId")({
  component: VideoDetailPage,
  head: () => ({ meta: [{ title: "观测样本详情 - 巢影蜂析" }] }),
})

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

type ListResponse<T> = { data: T[]; count: number }
type LoadState = "idle" | "loading" | "ready" | "error"
type EvidenceTone = "video" | "analysis" | "result"
type MediaOrientation = "unknown" | "portrait" | "landscape" | "square"
type MediaProfile = {
  orientation: MediaOrientation
  ratio: number
  width: number
  height: number
}

const API_BASE = "/api/v1"

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function VideoDetailPage() {
  const { videoId } = Route.useParams()
  const [video, setVideo] = useState<VideoItem | null>(null)
  const [tasks, setTasks] = useState<AnalysisTaskItem[]>([])
  const [results, setResults] = useState<AnalysisResultItem[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [videoState, setVideoState] = useState<LoadState>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [mediaProfile, setMediaProfile] = useState<MediaProfile>({
    orientation: "unknown",
    ratio: 16 / 9,
    width: 0,
    height: 0,
  })
  const hasLoadedData = useRef(false)

  const loadData = useCallback(async () => {
    if (!hasLoadedData.current) setLoadState("loading")
    setErrorMessage(null)

    try {
      const headers = getAuthHeaders()
      const [videoResponse, tasksResponse, resultsResponse] = await Promise.all(
        [
          fetch(`${API_BASE}/videos/${videoId}`, { headers }),
          fetch(`${API_BASE}/tasks/?skip=0&limit=100`, { headers }),
          fetch(`${API_BASE}/results/?skip=0&limit=100`, { headers }),
        ],
      )

      if (!videoResponse.ok) {
        throw new Error(`读取视频详情失败：${videoResponse.status}`)
      }
      if (!tasksResponse.ok) {
        throw new Error(`读取分析任务失败：${tasksResponse.status}`)
      }
      if (!resultsResponse.ok) {
        throw new Error(`读取分析结果失败：${resultsResponse.status}`)
      }

      const videoData = (await videoResponse.json()) as VideoItem
      const tasksData =
        (await tasksResponse.json()) as ListResponse<AnalysisTaskItem>
      const resultsData =
        (await resultsResponse.json()) as ListResponse<AnalysisResultItem>

      setVideo(videoData)
      setTasks(tasksData.data)
      setResults(resultsData.data)
      hasLoadedData.current = true
      setLoadState("ready")
    } catch (error) {
      setLoadState("error")
      setErrorMessage(
        error instanceof Error ? error.message : "读取观测档案失败",
      )
    }
  }, [videoId])

  const loadVideo = useCallback(
    async (signal?: AbortSignal) => {
      setVideoState("loading")
      setVideoError(null)

      try {
        const response = await fetch(`${API_BASE}/videos/${videoId}/file`, {
          headers: getAuthHeaders(),
          signal,
        })

        if (!response.ok) {
          throw new Error(`读取视频文件失败：${response.status}`)
        }

        const blob = await response.blob()
        if (signal?.aborted) return

        const objectUrl = URL.createObjectURL(blob)
        setVideoUrl((oldUrl) => {
          if (oldUrl) URL.revokeObjectURL(oldUrl)
          return objectUrl
        })
        setVideoState("ready")
      } catch (error) {
        if (signal?.aborted) return
        setVideoState("error")
        setVideoError(error instanceof Error ? error.message : "视频加载失败")
      }
    },
    [videoId],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const controller = new AbortController()
    setMediaProfile({
      orientation: "unknown",
      ratio: 16 / 9,
      width: 0,
      height: 0,
    })
    void loadVideo(controller.signal)
    return () => controller.abort()
  }, [loadVideo])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const videoTasks = useMemo(
    () =>
      tasks.filter((task) => task.video_id === videoId).sort(sortNewestFirst),
    [tasks, videoId],
  )

  const videoResults = useMemo(
    () =>
      results
        .filter((result) => result.video_id === videoId)
        .sort(sortNewestFirst),
    [results, videoId],
  )

  const {
    task: latestTask,
    result: latestResult,
    resultTask: latestResultTask,
  } = useMemo(
    () => selectObservationEvidence(videoId, tasks, results),
    [results, tasks, videoId],
  )
  const state = getObservationState(video, latestTask, latestResult)
  const canAnalyze =
    Boolean(video) &&
    !isCreatingTask &&
    latestTask?.status !== "PENDING" &&
    latestTask?.status !== "PROCESSING"

  useEffect(() => {
    if (
      latestTask?.status !== "PENDING" &&
      latestTask?.status !== "PROCESSING"
    ) {
      return
    }

    const timer = window.setInterval(() => {
      void loadData()
    }, 2500)

    return () => window.clearInterval(timer)
  }, [latestTask?.status, loadData])

  const handleAnalyze = async () => {
    if (!video || !canAnalyze) return

    if (latestTask?.status === "COMPLETED" || latestTask?.status === "FAILED") {
      const confirmed = window.confirm(
        "确定重新分析这份观测样本吗？系统将创建一条新的分析任务。",
      )
      if (!confirmed) return
    }

    setIsCreatingTask(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`${API_BASE}/tasks/`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_id: video.id,
          model_name: latestTask?.model_name ?? "baseline-v1",
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(
          errorBody?.detail ?? `创建分析任务失败：${response.status}`,
        )
      }

      const task = (await response.json()) as AnalysisTaskItem
      setTasks((currentTasks) => [task, ...currentTasks])
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "创建分析任务失败",
      )
    } finally {
      setIsCreatingTask(false)
    }
  }

  const refreshAll = () => {
    void loadData()
    void loadVideo()
  }

  if (loadState === "loading") {
    return (
      <main
        className="observation-page video-detail-page"
        data-route-loading-skeleton=""
      >
        <ResearchContentFrame
          size="workspace"
          density="media"
          className="video-detail-shell"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <header className="video-detail-header">
            <div className="video-detail-heading grid gap-4">
              <span className="research-skeleton is-short" />
              <span className="research-skeleton h-10 is-medium" />
              <span className="research-skeleton is-wide" />
            </div>
            <span className="research-skeleton is-short" />
          </header>
          <div className="research-loading-plane">
            <div className="research-loading-copy">
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              正在读取观测样本，工作站骨架保持可见…
            </div>
            <div className="research-loading-row" aria-hidden="true">
              <span className="research-skeleton h-40 is-wide" />
              <span className="research-skeleton h-40 is-wide" />
              <span className="research-skeleton h-40 is-wide" />
            </div>
          </div>
        </ResearchContentFrame>
      </main>
    )
  }

  if (!video) {
    return (
      <main className="observation-page video-detail-page">
        <ResearchContentFrame
          size="workspace"
          density="media"
          className="video-detail-shell video-detail-state-screen"
        >
          <TriangleAlert className="size-6" aria-hidden="true" />
          <strong>未找到这份观测样本</strong>
          <Link to="/videos" className="video-detail-text-link">
            返回观测档案
          </Link>
          {errorMessage && <span>{errorMessage}</span>}
        </ResearchContentFrame>
      </main>
    )
  }

  return (
    <main className="observation-page video-detail-page">
      <ResearchContentFrame
        size="workspace"
        density="media"
        className="video-detail-shell"
      >
        <header className="video-detail-header">
          <div className="video-detail-heading">
            <Link to="/videos" className="video-detail-back-link">
              <ArrowLeft className="size-4" aria-hidden="true" />
              返回观测档案
            </Link>
            <p className="video-detail-kicker">OBSERVATION SAMPLE</p>
            <h1>
              观测样本{" "}
              <span className="video-detail-record-id observation-data">
                {formatEvidenceId("V", video.id)}
              </span>
            </h1>
            <p className="video-detail-sample-subtitle">
              {formatSceneType(video.scene_type)} ·{" "}
              {formatDate(video.created_at)}
            </p>
            <p className="video-detail-description">
              原始观测画面、分析过程与结果证据在同一条记录中保持关联。
            </p>
          </div>

          <div className="video-detail-actions">
            <div className="video-detail-status" data-tone={state.tone}>
              <i aria-hidden="true" />
              <span>{state.label}</span>
              <small>{state.shortDescription}</small>
            </div>
            <div className="video-detail-action-row">
              {latestResult && (
                <Link
                  to="/results"
                  search={{ task_id: latestResult.task_id }}
                  className="video-detail-button video-detail-button--primary"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  查看结果
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                className={`video-detail-button ${latestResult ? "video-detail-button--secondary" : "video-detail-button--primary"}`}
                disabled={!canAnalyze}
              >
                {isCreatingTask ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : latestTask?.status === "COMPLETED" ||
                  latestTask?.status === "FAILED" ? (
                  <RotateCcw className="size-4" aria-hidden="true" />
                ) : (
                  <PlayCircle className="size-4" aria-hidden="true" />
                )}
                {isCreatingTask
                  ? "正在建立任务"
                  : latestTask?.status === "COMPLETED" ||
                      latestTask?.status === "FAILED"
                    ? "重新分析"
                    : latestTask?.status === "PENDING" ||
                        latestTask?.status === "PROCESSING"
                      ? "分析进行中"
                      : "开始分析"}
              </button>
              <button
                type="button"
                onClick={refreshAll}
                className="video-detail-button video-detail-button--secondary video-detail-button--icon"
                disabled={videoState === "loading"}
                aria-label="刷新记录"
                title="刷新记录"
              >
                <RefreshCw
                  className={`size-4 ${videoState === "loading" ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="video-detail-alert" role="alert">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            <div>
              <strong>记录读取或操作未完成</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        <section
          className="video-detail-workstation"
          data-media-orientation={mediaProfile.orientation}
          aria-label="观测工作台"
        >
          <div className="video-detail-video-column">
            <div className="video-detail-section-heading">
              <div>
                <p className="video-detail-eyebrow">Observation glass view</p>
                <h2>原始观测画面</h2>
              </div>
              <span className="video-detail-section-note">
                真实文件 · 原始帧
              </span>
            </div>
            <ObservationViewport
              video={video}
              videoUrl={videoUrl}
              videoState={videoState}
              videoError={videoError}
              displayId={formatEvidenceId("V", video.id)}
              mediaProfile={mediaProfile}
              onMediaProfileChange={setMediaProfile}
            />
          </div>

          <aside
            className="video-detail-reading-column"
            aria-label="样本阅读与证据链"
          >
            <SampleReading
              video={video}
              displayId={formatEvidenceId("V", video.id)}
            />
            <EvidenceChain
              video={video}
              task={latestTask}
              result={latestResult}
              resultTask={latestResultTask}
            />
          </aside>
        </section>

        <div className="video-detail-lower-grid">
          <AnalysisTimeline
            video={video}
            task={latestTask}
            result={latestResult}
            stateKey={state.key}
          />
          <ResultStrip
            result={latestResult}
            task={latestResultTask ?? latestTask}
          />
        </div>

        <HistoryLog tasks={videoTasks} results={videoResults} />
      </ResearchContentFrame>
    </main>
  )
}

function ObservationViewport({
  video,
  videoUrl,
  videoState,
  videoError,
  displayId,
  mediaProfile,
  onMediaProfileChange,
}: {
  video: VideoItem
  videoUrl: string | null
  videoState: LoadState
  videoError: string | null
  displayId: string
  mediaProfile: MediaProfile
  onMediaProfileChange: (profile: MediaProfile) => void
}) {
  return (
    <div className="video-detail-viewport">
      <div className="video-detail-viewport-bar">
        <span className="video-detail-viewport-label">
          <CircleDot className="size-3.5" aria-hidden="true" />
          原始观测
        </span>
        <span className="video-detail-viewport-id observation-data">
          {displayId}
        </span>
        <span className="video-detail-viewport-scene">
          {formatSceneType(video.scene_type)}
        </span>
      </div>
      <div
        className="video-detail-video-stage"
        style={
          {
            "--media-aspect-ratio": String(mediaProfile.ratio),
          } as CSSProperties
        }
      >
        {videoState === "loading" ? (
          <div className="video-detail-media-state" role="status">
            <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            <span>正在读取真实观测画面...</span>
          </div>
        ) : videoError ? (
          <div
            className="video-detail-media-state video-detail-media-state--error"
            role="alert"
          >
            <TriangleAlert className="size-6" aria-hidden="true" />
            <span>{videoError}</span>
          </div>
        ) : videoUrl ? (
          <video
            controls
            preload="metadata"
            src={videoUrl}
            className="video-detail-video"
            aria-label={`原始观测视频 ${displayId}：${video.original_filename}`}
            onLoadedMetadata={(event) => {
              const { videoWidth: width, videoHeight: height } =
                event.currentTarget
              if (!width || !height) return
              const ratio = width / height
              const orientation: MediaOrientation =
                ratio < 0.85 ? "portrait" : ratio > 1.2 ? "landscape" : "square"
              onMediaProfileChange({ orientation, ratio, width, height })
            }}
          >
            <track
              kind="captions"
              src="data:text/vtt,WEBVTT%0A"
              srcLang="zh-CN"
              label="观测字幕"
            />
            当前浏览器不支持视频播放。
          </video>
        ) : (
          <div className="video-detail-media-state">
            <FileVideo className="size-6" aria-hidden="true" />
            <span>暂无可播放视频</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SampleReading({
  video,
  displayId,
}: {
  video: VideoItem
  displayId: string
}) {
  const readings: Array<{
    label: string
    value: string
    title?: string
  }> = [
    { label: "观测时间", value: formatDate(video.created_at) },
    { label: "场景", value: formatSceneType(video.scene_type) },
    { label: "文件大小", value: formatFileSize(video.file_size) },
    { label: "类型", value: video.content_type ?? "未记录" },
    {
      label: "原始文件",
      value: video.original_filename,
      title: video.original_filename,
    },
  ]

  return (
    <section className="video-detail-reading">
      <div className="video-detail-section-heading">
        <div>
          <p className="video-detail-eyebrow">Sample reading</p>
          <h2>样本阅读</h2>
        </div>
        <span className="video-detail-reading-mark observation-data">
          {displayId}
        </span>
      </div>
      <p className="video-detail-reading-intro">
        先确认观测对象、场景和记录时间，再沿证据链进入分析过程。
      </p>
      <dl className="video-detail-reading-list">
        {readings.map((reading) => (
          <div key={reading.label}>
            <dt>{reading.label}</dt>
            <dd
              className={
                reading.title ? "video-detail-reading-file" : undefined
              }
              title={reading.title}
            >
              {reading.value}
            </dd>
          </div>
        ))}
      </dl>
      <details className="video-detail-technical-details">
        <summary>技术信息</summary>
        <dl className="video-detail-technical-list">
          <div>
            <dt>Video UUID</dt>
            <dd>
              <code>{video.id}</code>
            </dd>
          </div>
          <div>
            <dt>完整原始文件名</dt>
            <dd title={video.original_filename}>{video.original_filename}</dd>
          </div>
          <div>
            <dt>Content-Type</dt>
            <dd>{video.content_type ?? "未记录"}</dd>
          </div>
        </dl>
      </details>
    </section>
  )
}

function EvidenceChain({
  video,
  task,
  result,
  resultTask,
}: {
  video: VideoItem
  task: AnalysisTaskItem | null
  result: AnalysisResultItem | null
  resultTask: AnalysisTaskItem | null
}) {
  const nodes: Array<{
    tone: EvidenceTone
    id: string | null
    title: string
    detail: string
    meta: string
  }> = [
    {
      tone: "video",
      id: formatEvidenceId("V", video.id),
      title: "观测视频",
      detail: `${formatSceneType(video.scene_type)} · ${video.original_filename}`,
      meta: formatDate(video.created_at),
    },
    {
      tone: "analysis",
      id: task ? formatEvidenceId("A", task.id) : null,
      title: "分析任务",
      detail: task
        ? `${formatTaskStatus(task.status)} · ${task.model_name ?? "baseline-v1"}`
        : "等待建立真实分析任务",
      meta: task ? formatDate(task.created_at) : "未记录",
    },
    {
      tone: "result",
      id: result ? formatEvidenceId("R", result.id) : null,
      title: "分析结果",
      detail: result
        ? `结果已关联 · ${formatDate(result.created_at)}`
        : resultTask?.status === "COMPLETED"
          ? "任务完成，结果记录尚未返回"
          : "等待分析任务完成",
      meta: result ? "可追溯结果" : "暂无结果",
    },
  ]

  return (
    <section className="video-detail-evidence">
      <div className="video-detail-section-heading">
        <div>
          <p className="video-detail-eyebrow">Evidence chain</p>
          <h2>证据链</h2>
        </div>
        <GitBranch className="size-5" aria-hidden="true" />
      </div>
      <p className="video-detail-evidence-intro">
        V / A / R 标识保持来自真实 UUID 的跨页面关联。
      </p>
      <ol className="video-detail-evidence-list">
        {nodes.map((node, index) => (
          <li
            key={node.tone}
            className={`video-detail-evidence-node tone-${node.tone}`}
          >
            {index < nodes.length - 1 && (
              <span
                className="video-detail-evidence-connector"
                aria-hidden="true"
              />
            )}
            <span className="video-detail-evidence-marker" aria-hidden="true" />
            <div className="video-detail-evidence-copy">
              <div className="video-detail-evidence-topline">
                {node.id ? (
                  node.tone === "analysis" && task ? (
                    <Link
                      to="/tasks/$taskId"
                      params={{ taskId: task.id }}
                      className="video-detail-evidence-id observation-data"
                    >
                      {node.id}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : node.tone === "result" && resultTask ? (
                    <Link
                      to="/results"
                      search={{ task_id: resultTask.id }}
                      className="video-detail-evidence-id observation-data"
                    >
                      {node.id}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="video-detail-evidence-id observation-data">
                      {node.id}
                    </span>
                  )
                ) : (
                  <span className="video-detail-evidence-id is-pending">
                    未建立
                  </span>
                )}
                <span className="video-detail-evidence-title">
                  {node.title}
                </span>
              </div>
              <p>{node.detail}</p>
              <small>{node.meta}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function AnalysisTimeline({
  video,
  task,
  result,
  stateKey,
}: {
  video: VideoItem
  task: AnalysisTaskItem | null
  result: AnalysisResultItem | null
  stateKey: ObservationStateKey
}) {
  const steps = [
    {
      label: "观测样本收录",
      detail: "原始视频进入观测档案",
      timestamp: formatDate(video.created_at),
      status: "complete" as const,
    },
    {
      label: "分析任务建立",
      detail: task
        ? `${task.model_name ?? "baseline-v1"} · ${formatTaskStatus(task.status)}`
        : "尚未建立分析任务",
      timestamp: task ? formatDate(task.created_at) : "等待实际记录",
      status: task ? ("complete" as const) : ("pending" as const),
    },
    {
      label: "处理过程",
      detail: getTimelineProcessingDetail(task, stateKey),
      timestamp: task?.started_at
        ? formatDate(task.started_at)
        : "等待实际记录",
      status:
        task?.status === "PROCESSING"
          ? ("active" as const)
          : task?.status === "FAILED"
            ? ("failed" as const)
            : task?.status === "COMPLETED"
              ? ("complete" as const)
              : ("pending" as const),
    },
    {
      label: "结果写入",
      detail: result ? "结果已写入并关联当前样本" : "分析完成后显示真实结果",
      timestamp: result?.created_at
        ? formatDate(result.created_at)
        : "等待实际记录",
      status: result ? ("complete" as const) : ("pending" as const),
    },
  ]

  return (
    <section className="video-detail-timeline">
      <div className="video-detail-section-heading">
        <div>
          <p className="video-detail-eyebrow">Analysis log</p>
          <h2>分析时间线</h2>
        </div>
        <Clock3 className="size-5" aria-hidden="true" />
      </div>
      <ol className="video-detail-timeline-list">
        {steps.map((step) => (
          <li key={step.label} className={`timeline-${step.status}`}>
            <span className="video-detail-timeline-marker" aria-hidden="true" />
            <div>
              <div className="video-detail-timeline-topline">
                <strong>{step.label}</strong>
                <time className="observation-data">{step.timestamp}</time>
              </div>
              <p>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ResultStrip({
  result,
  task,
}: {
  result: AnalysisResultItem | null
  task: AnalysisTaskItem | null
}) {
  const metrics = result
    ? [
        { label: "检测个体", value: result.detected_individuals, unit: "只" },
        { label: "有效轨迹", value: result.valid_tracks, unit: "条" },
        {
          label: "进 / 出巢",
          value: `${result.entry_count} / ${result.exit_count}`,
          unit: "次",
        },
        {
          label: "活动指数",
          value: result.activity_index ?? "-",
          unit: "指数",
        },
        { label: "异常事件", value: result.abnormal_event_count, unit: "次" },
      ]
    : []

  return (
    <section className="video-detail-result-strip">
      <div className="video-detail-section-heading">
        <div>
          <p className="video-detail-eyebrow">Instrument result</p>
          <h2>结果读数</h2>
        </div>
        {result && task ? (
          <Link
            to="/results"
            search={{ task_id: task.id }}
            className="video-detail-inline-link"
          >
            查看完整结果{" "}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <Gauge className="size-5" aria-hidden="true" />
        )}
      </div>
      {result ? (
        <div className="video-detail-result-grid">
          {metrics.map((metric) => (
            <div key={metric.label} className="video-detail-result-reading">
              <span>{metric.label}</span>
              <strong className="observation-data">{metric.value}</strong>
              <small>{metric.unit}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="video-detail-result-empty">
          <Activity className="size-5" aria-hidden="true" />
          <div>
            <strong>
              {task?.status === "FAILED"
                ? "分析未生成结果"
                : "等待真实分析结果"}
            </strong>
            <p>
              {task?.status === "FAILED"
                ? "请查看分析任务中的错误信息，修正后可重新分析。"
                : "结果写入后，检测个体、轨迹、进出巢与活动读数将在此显示。"}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function HistoryLog({
  tasks,
  results,
}: {
  tasks: AnalysisTaskItem[]
  results: AnalysisResultItem[]
}) {
  const resultByTaskId = new Map(
    results.map((result) => [result.task_id, result]),
  )

  return (
    <section className="video-detail-history">
      <div className="video-detail-section-heading">
        <div>
          <p className="video-detail-eyebrow">Analysis history</p>
          <h2>历史分析记录</h2>
        </div>
        <span className="video-detail-section-note">
          {tasks.length} 条任务记录
        </span>
      </div>
      {tasks.length === 0 ? (
        <div className="video-detail-history-empty">
          <Activity className="size-5" aria-hidden="true" />
          <span>暂无分析任务，当前样本仍处于待分析状态。</span>
        </div>
      ) : (
        <div className="video-detail-history-list">
          {tasks.map((task) => {
            const result = resultByTaskId.get(task.id)
            return (
              <div className="video-detail-history-row" key={task.id}>
                <div className="video-detail-history-id">
                  <span className="observation-data">
                    {formatEvidenceId("A", task.id)}
                  </span>
                  <strong>{task.model_name ?? "baseline-v1"}</strong>
                </div>
                <StatusBadge status={task.status} />
                <div className="video-detail-history-progress">
                  <span>进度</span>
                  <strong className="observation-data">
                    {Math.max(0, Math.min(100, task.progress))}%
                  </strong>
                </div>
                <time className="observation-data">
                  {formatDate(task.created_at)}
                </time>
                <div className="video-detail-history-actions">
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: task.id }}
                    className="video-detail-small-link"
                  >
                    查看任务{" "}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </Link>
                  {result && (
                    <Link
                      to="/results"
                      search={{ task_id: task.id }}
                      className="video-detail-small-link"
                    >
                      查看结果{" "}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="video-detail-status-badge" data-status={status}>
      <i aria-hidden="true" />
      {formatTaskStatus(status)}
    </span>
  )
}

type ObservationStateKey = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

function getObservationState(
  video: VideoItem | null,
  task: AnalysisTaskItem | null,
  result: AnalysisResultItem | null,
) {
  const rawStatus =
    task?.status ?? (video?.status === "UPLOADED" ? "PENDING" : video?.status)
  const key: ObservationStateKey =
    rawStatus === "PROCESSING" ||
    rawStatus === "COMPLETED" ||
    rawStatus === "FAILED"
      ? rawStatus
      : "PENDING"

  const state = {
    PENDING: {
      label: "待分析",
      shortDescription: "尚未开始处理",
      tone: "idle",
    },
    PROCESSING: {
      label: "分析中",
      shortDescription: `${task?.progress ?? 0}% 已记录`,
      tone: "active",
    },
    COMPLETED: {
      label: result ? "分析完成" : "任务完成",
      shortDescription: result ? "结果已关联" : "结果待写入",
      tone: "ready",
    },
    FAILED: {
      label: "分析失败",
      shortDescription: "需要检查任务",
      tone: "alert",
    },
  } as const

  return { key, ...state[key] }
}

function getTimelineProcessingDetail(
  task: AnalysisTaskItem | null,
  stateKey: ObservationStateKey,
) {
  if (!task) return "尚未开始处理"
  if (stateKey === "FAILED") return task.error_message ?? "任务返回失败状态"
  if (stateKey === "PROCESSING") return `任务处理中 · ${task.progress}%`
  if (stateKey === "COMPLETED") return "任务处理完成"
  return "任务等待处理"
}

function formatSceneType(value: string) {
  if (value === "OUTDOOR") return "巢外可见光"
  if (value === "INDOOR") return "巢内红外"
  return value || "场景未记录"
}

function formatTaskStatus(value: string) {
  const labels: Record<string, string> = {
    PENDING: "等待分析",
    PROCESSING: "分析中",
    COMPLETED: "分析完成",
    FAILED: "分析失败",
  }
  return labels[value] ?? value
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`
}

function formatDate(value: string | null) {
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

function sortNewestFirst(
  a: { created_at: string | null },
  b: { created_at: string | null },
) {
  return getTimestamp(b.created_at) - getTimestamp(a.created_at)
}

function getTimestamp(value: string | null) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}
