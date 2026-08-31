import { BeePulseChart } from "@/components/Dashboard/BeePulseChart"
import { BrandBeeMark } from "@/components/Dashboard/BrandBeeMark"
import { HiveGateFlow } from "@/components/Dashboard/HiveGateFlow"
import { ObservationVideoPreview } from "@/components/Dashboard/ObservationVideoPreview"
import "@/components/Dashboard/observation-theme.css"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  FileVideo,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ResearchContentFrame } from "@/components/Layout/ResearchContentFrame"
import { formatEvidenceId } from "@/lib/observationIds"

export const Route = createFileRoute("/_layout/")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "综合态势 - 巢影蜂析" }] }),
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

type ObservationRecord = {
  video: VideoItem
  task: AnalysisTaskItem | null
  result: AnalysisResultItem | null
}

const API_BASE = "/api/v1"

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function useObservationReveal(isLoading: boolean) {
  useEffect(() => {
    if (isLoading) return

    const page = document.querySelector<HTMLElement>(".observation-page")
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-observation-reveal]"),
    )

    if (!page) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (reduceMotion) {
      for (const target of targets) target.classList.add("is-revealed")
      page.classList.add("observation-mounted")
      return
    }

    page.classList.add("observation-motion-ready")
    const mountFrame = window.requestAnimationFrame(() => {
      page.classList.add("observation-mounted")
    })

    if (targets.length === 0 || !("IntersectionObserver" in window)) {
      for (const target of targets) target.classList.add("is-revealed")
      return () => window.cancelAnimationFrame(mountFrame)
    }

    const revealTarget = (target: HTMLElement) => {
      if (target.classList.contains("is-revealed")) return
      target.classList.add("is-revealed")
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting !== true) continue
          revealTarget(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    )

    const revealFrame = window.requestAnimationFrame(() => {
      for (const target of targets) {
        if (target.classList.contains("is-revealed")) continue
        const rect = target.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.82) {
          revealTarget(target)
        } else {
          observer.observe(target)
        }
      }
    })

    return () => {
      window.cancelAnimationFrame(mountFrame)
      window.cancelAnimationFrame(revealFrame)
      observer.disconnect()
    }
  }, [isLoading])
}

function DashboardPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [tasks, setTasks] = useState<AnalysisTaskItem[]>([])
  const [results, setResults] = useState<AnalysisResultItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useObservationReveal(isLoading)

  const loadData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true)
    else setIsLoading(true)
    setErrorMessage(null)

    try {
      const headers = getAuthHeaders()
      const [videosResponse, tasksResponse, resultsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/videos/?skip=0&limit=100`, { headers }),
          fetch(`${API_BASE}/tasks/?skip=0&limit=100`, { headers }),
          fetch(`${API_BASE}/results/?skip=0&limit=100`, { headers }),
        ])

      if (!videosResponse.ok) {
        throw new Error(`读取视频数据失败：${videosResponse.status}`)
      }
      if (!tasksResponse.ok) {
        throw new Error(`读取任务数据失败：${tasksResponse.status}`)
      }
      if (!resultsResponse.ok) {
        throw new Error(`读取分析结果失败：${resultsResponse.status}`)
      }

      const videosData = (await videosResponse.json()) as VideosResponse
      const tasksData = (await tasksResponse.json()) as AnalysisTasksResponse
      const resultsData =
        (await resultsResponse.json()) as AnalysisResultsResponse

      setVideos(videosData.data)
      setTasks(tasksData.data)
      setResults(resultsData.data)
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : "读取综合态势数据失败",
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
    const timer = window.setInterval(() => void loadData(), 10000)
    return () => window.clearInterval(timer)
  }, [loadData])

  const taskSummary = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "PENDING").length
    const processing = tasks.filter(
      (task) => task.status === "PROCESSING",
    ).length
    const failed = tasks.filter((task) => task.status === "FAILED").length
    return { pending, processing, failed }
  }, [tasks])

  const observationRecords = useMemo<ObservationRecord[]>(() => {
    const taskByVideo = new Map<string, AnalysisTaskItem>()
    const resultByVideo = new Map<string, AnalysisResultItem>()

    for (const task of [...tasks].sort(sortNewestFirst)) {
      if (!taskByVideo.has(task.video_id)) taskByVideo.set(task.video_id, task)
    }
    for (const result of [...results].sort(sortNewestFirst)) {
      if (!resultByVideo.has(result.video_id)) {
        resultByVideo.set(result.video_id, result)
      }
    }

    return [...videos]
      .sort(sortNewestFirst)
      .slice(0, 6)
      .map((video) => ({
        video,
        task: taskByVideo.get(video.id) ?? null,
        result: resultByVideo.get(video.id) ?? null,
      }))
  }, [videos, tasks, results])

  const latestResult = useMemo(
    () => [...results].sort(sortNewestFirst)[0] ?? null,
    [results],
  )

  const latestVideo = useMemo(
    () => [...videos].sort(sortNewestFirst)[0] ?? null,
    [videos],
  )
  const analysisMatchesLatestVideo = Boolean(
    latestResult && latestVideo && latestResult.video_id === latestVideo.id,
  )

  const latestObservationAt = useMemo(() => {
    const timestamps = [
      ...videos.map((video) => video.created_at),
      ...tasks.map((task) => task.created_at),
      ...results.map((result) => result.created_at),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite)

    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null
  }, [videos, tasks, results])

  if (isLoading) return <DashboardLoading />

  const colonyState = getColonyState(
    latestResult,
    videos.length,
    taskSummary.processing,
    taskSummary.pending,
    taskSummary.failed,
  )

  return (
    <main className="observation-page">
      <section className="observation-hero" aria-labelledby="today-title">
        <ResearchContentFrame
          size="workspace"
          density="balanced"
          className="observation-shell"
        >
          <div className="observation-topline" data-observation-mount="brand">
            <div className="observation-topline-meta">
              <CalendarDays className="size-4" aria-hidden="true" />
              <time className="observation-data tabular-nums">
                {formatLongDate(new Date())}
              </time>
            </div>
            <div className="observation-topline-brand">
              <BrandBeeMark />
              <div>
                <p className="observation-wordmark">巢影蜂析</p>
                <p className="observation-wordmark-subtitle">
                  智慧蜂群行为分析平台
                </p>
              </div>
            </div>
            <div className="observation-topline-actions">
              <div className="observation-system-status">
                <span
                  className="observation-system-status-dot"
                  aria-hidden="true"
                />
                <span>
                  <small>系统状态</small>
                  <strong>正常运行</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => void loadData(true)}
                disabled={isRefreshing}
                aria-label="刷新观测数据"
                title="刷新观测数据"
                className="observation-icon-button"
              >
                <RefreshCw
                  className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
              <CircleUserRound
                className="observation-user-mark"
                aria-hidden="true"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="observation-alert" role="alert">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">本次同步未完成</p>
                <p className="mt-1 text-sm">
                  {errorMessage}。当前页面保留上一次成功读数。
                </p>
              </div>
            </div>
          )}

          <div
            className="observation-hero-surface"
            data-observation-mount="hero"
          >
            <div className="observation-hero-grid">
              <div
                className="observation-state-block"
                data-state={colonyState.tone}
              >
                <div className="observation-state-heading">
                  <p className="observation-kicker">今日蜂群状态</p>
                  <span
                    className="observation-state-status"
                    data-state={colonyState.tone}
                  >
                    <span aria-hidden="true" />
                    {colonyState.tone === "attention" ? "需关注" : "稳定观察"}
                  </span>
                </div>
                <h1 id="today-title" className="observation-state-title">
                  {colonyState.label}
                </h1>
                <p className="observation-state-note">{colonyState.note}</p>
                <p className="observation-sync">
                  <span className="observation-live-dot" aria-hidden="true" />
                  最近更新
                  <time className="observation-data tabular-nums">
                    {formatObservationTime(latestObservationAt)}
                  </time>
                </p>
                <ObservationVideoPreview
                  video={latestVideo}
                  displayId={
                    latestVideo
                      ? formatEvidenceId("V", latestVideo.id)
                      : "V•---"
                  }
                  sceneLabel={
                    latestVideo
                      ? getSceneMeta(latestVideo.scene_type).label
                      : "观测样本"
                  }
                  secondaryLabel={
                    latestVideo
                      ? formatEvidenceTime(latestVideo.created_at)
                      : undefined
                  }
                />
              </div>

              <div className="observation-summary-field">
                <div className="observation-summary-heading">
                  <p className="observation-summary-question">
                    今天这群蜂
                    <br />
                    发生了什么？
                  </p>
                  <div className="observation-summary-code-group">
                    <span className="observation-summary-code observation-data">
                      {latestResult
                        ? formatEvidenceId("A", latestResult.id)
                        : "A•---"}
                    </span>
                    {latestVideo ? (
                      <Link
                        to="/videos/$videoId"
                        params={{ videoId: latestVideo.id }}
                        className="observation-summary-source observation-data"
                      >
                        当前观测 · {formatEvidenceId("V", latestVideo.id)}
                      </Link>
                    ) : (
                      <span className="observation-summary-source">
                        当前活动观测
                      </span>
                    )}
                  </div>
                </div>
                <div className="observation-summary-answer">
                  {latestResult
                    ? getSummarySentence(latestResult)
                    : "观察样本正在汇集，活动读数形成后将在这里给出今日摘要。"}
                </div>
                <p className="observation-summary-relation">
                  {analysisMatchesLatestVideo
                    ? "RAW OBSERVATION → ANALYSIS READING"
                    : "当前活动观测，等待对应分析记录"}
                </p>
                <ObservationReading
                  result={latestResult}
                  resultCount={results.length}
                />
              </div>
            </div>

            <section
              className="observation-metric-band"
              aria-label="今日观测摘要"
              data-observation-mount="metrics"
            >
              <ObservationMetric
                label="活动指数"
                value={formatMetric(latestResult?.activity_index)}
                note="群体活动强度"
                tone="honey"
              />
              <ObservationMetric
                label="进巢"
                value={latestResult ? `${latestResult.entry_count}` : "-"}
                unit="次"
                note="最近样本"
                tone="honey"
              />
              <ObservationMetric
                label="出巢"
                value={latestResult ? `${latestResult.exit_count}` : "-"}
                unit="次"
                note="最近样本"
                tone="blue"
              />
              <ObservationMetric
                label="异常记录"
                value={
                  latestResult ? `${latestResult.abnormal_event_count}` : "-"
                }
                unit="次"
                note="需要复核"
                tone={latestResult?.abnormal_event_count ? "alert" : "sage"}
              />
              <Link to="/results" className="observation-metric-link">
                查看完整分析
                <ArrowRight className="size-4" />
              </Link>
            </section>
          </div>

          <a
            href="#analysis-deck"
            className="observation-hero-rail"
            data-observation-reveal
            data-observation-delay="4"
            aria-label="向下探索蜂群观测工作台"
          >
            <span className="observation-rail-index observation-data">
              01 / 04
            </span>
            <span className="observation-rail-rule" />
            <span className="observation-rail-label">
              Colony Pulse · 蜂群活动节律
            </span>
            <ChevronDown className="size-4" />
            <span className="observation-rail-hint">向下探索观测模块</span>
          </a>
        </ResearchContentFrame>
      </section>

      <section
        className="analysis-deck-section observation-flow-section"
        id="analysis-deck"
        aria-labelledby="analysis-deck-title"
      >
        <ResearchContentFrame
          size="workspace"
          density="balanced"
          className="observation-shell analysis-instrument-deck"
          data-observation-reveal="analysis-deck"
        >
          <header className="analysis-deck-header">
            <div>
              <p className="observation-kicker">Bee observation deck</p>
              <h2 id="analysis-deck-title" className="analysis-deck-title">
                蜂群观测工作台
              </h2>
            </div>
            <div
              className="analysis-deck-index observation-data"
              aria-hidden="true"
            >
              <span>02</span>
              <span>活动节律</span>
              <span>03</span>
              <span>巢门流动</span>
              <span>04</span>
              <span>证据链</span>
            </div>
          </header>

          <div className="analysis-deck-grid">
            <div
              className="analysis-zone analysis-zone--colony"
              data-zone="colony"
              data-observation-reveal="colony"
              data-observation-delay="1"
            >
              <BeePulseChart results={results} compact />
            </div>
            <div
              className="analysis-zone analysis-zone--hive"
              data-zone="hive"
              data-observation-reveal="hive"
              data-observation-delay="2"
            >
              <HiveGateFlow
                entryCount={latestResult?.entry_count ?? 0}
                exitCount={latestResult?.exit_count ?? 0}
                observedAt={latestResult?.created_at ?? null}
                hasData={latestResult !== null}
              />
            </div>
            <div
              className="analysis-zone analysis-zone--evidence"
              data-zone="evidence"
              data-observation-reveal="evidence"
              data-observation-delay="3"
            >
              <div className="analysis-zone-heading">
                <p className="observation-kicker">Evidence chain</p>
                <h3 className="analysis-zone-title">观测状态</h3>
                <p className="analysis-zone-note">
                  从观察样本到分析结果，确认读数完整可追溯。
                </p>
              </div>
              <EvidenceChain videos={videos} tasks={tasks} results={results} />
            </div>
          </div>
        </ResearchContentFrame>
      </section>

      <section
        className="observation-log-section"
        aria-labelledby="recent-observations-title"
      >
        <ResearchContentFrame
          size="workspace"
          density="balanced"
          className="observation-shell"
        >
          <div className="observation-log-header" data-observation-reveal>
            <div>
              <p className="observation-kicker text-[var(--obs-blue)]">
                近期田野与巢内样本
              </p>
              <h2
                id="recent-observations-title"
                className="observation-section-title"
              >
                最近观测记录
              </h2>
            </div>
            <nav aria-label="观测记录入口" className="observation-page-links">
              <PageLink to="/videos">全部档案</PageLink>
              <PageLink to="/tasks">任务记录</PageLink>
              <PageLink to="/results">分析结果</PageLink>
            </nav>
          </div>

          {observationRecords.length === 0 ? (
            <div className="observation-empty" data-observation-reveal>
              <FileVideo className="size-6" />
              <div>
                <p className="font-medium">尚无观测记录</p>
                <p className="mt-1 text-sm observation-muted">
                  建立巢内或巢外观测记录后，样本会按时间出现在这里。
                </p>
              </div>
              <PageLink to="/videos">建立观测记录</PageLink>
            </div>
          ) : (
            <div className="observation-records" data-observation-reveal>
              {observationRecords.map((record) => (
                <ObservationRow key={record.video.id} record={record} />
              ))}
            </div>
          )}
        </ResearchContentFrame>
      </section>
    </main>
  )
}

function DashboardLoading() {
  return (
    <main className="observation-page" data-route-loading-skeleton="">
      <ResearchContentFrame
        size="workspace"
        density="balanced"
        className="observation-shell py-8 md:py-12"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="observation-topline" aria-hidden="true">
          <span className="research-skeleton is-short" />
          <span className="research-skeleton is-medium" />
          <span className="research-skeleton is-short" />
        </div>
        <div className="observation-hero-surface mt-8" aria-hidden="true">
          <div className="observation-hero-grid">
            <div className="grid content-start gap-5 p-6 md:p-10">
              <span className="research-skeleton is-short" />
              <span className="research-skeleton h-12 is-medium" />
              <span className="research-skeleton is-wide" />
              <span className="research-skeleton mt-8 h-48 is-wide" />
            </div>
            <div className="grid content-start gap-6 p-6 md:p-10">
              <span className="research-skeleton is-medium" />
              <span className="research-skeleton h-16 is-wide" />
              <span className="research-skeleton is-wide" />
              <span className="research-skeleton h-28 is-wide" />
            </div>
          </div>
        </div>
        <div className="research-loading-copy mt-6">
          <LoaderCircle className="size-4 animate-spin" />
          正在读取蜂群观测记录...
        </div>
      </ResearchContentFrame>
    </main>
  )
}

function ObservationMetric({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string
  value: string
  unit?: string
  note: string
  tone: "honey" | "leaf" | "blue" | "sage" | "alert"
}) {
  return (
    <div className="observation-metric" data-tone={tone}>
      <p className="observation-metric-label">{label}</p>
      <p className="observation-metric-value">
        {value}
        {unit && <span>{unit}</span>}
      </p>
      <p className="observation-metric-note">{note}</p>
    </div>
  )
}

function ObservationReading({
  result,
  resultCount,
}: {
  result: AnalysisResultItem | null
  resultCount: number
}) {
  const value = result?.activity_index ?? null
  const markerPosition =
    value === null ? undefined : `${Math.max(0, Math.min(1, value)) * 100}%`

  return (
    <fieldset className="observation-reading" aria-label="当前活动观测">
      <legend className="sr-only">当前活动观测</legend>
      <div className="observation-reading-value">
        <span>当前活动观测</span>
        <strong className="observation-data tabular-nums">
          {formatMetric(value)}
        </strong>
        <small>0–1 群体活动强度</small>
      </div>
      <div className="observation-reading-scale">
        <div className="observation-reading-range">
          <span>正常活动区间 0.35–0.75</span>
        </div>
        {markerPosition && (
          <span
            className="observation-reading-marker"
            style={{ left: markerPosition }}
            aria-hidden="true"
          />
        )}
        <div className="observation-reading-axis observation-data tabular-nums">
          <span>0.00</span>
          <span>1.00</span>
        </div>
      </div>
      <dl className="observation-reading-meta">
        <div>
          <dt>分析记录</dt>
          <dd className="observation-data">
            {result ? formatEvidenceId("A", result.id) : "待记录"}
          </dd>
        </div>
        <div>
          <dt>观测时间</dt>
          <dd className="observation-data tabular-nums">
            {result ? formatEvidenceTime(result.created_at) : "待记录"}
          </dd>
        </div>
        <div>
          <dt>有效结果</dt>
          <dd className="observation-data tabular-nums">{resultCount} 条</dd>
        </div>
      </dl>
    </fieldset>
  )
}

function PageLink({
  to,
  children,
}: {
  to: "/videos" | "/tasks" | "/results"
  children: string
}) {
  return (
    <Link to={to} className="observation-page-link">
      {children}
      <ArrowUpRight className="size-3.5" />
    </Link>
  )
}

function EvidenceChain({
  videos,
  tasks,
  results,
}: {
  videos: VideoItem[]
  tasks: AnalysisTaskItem[]
  results: AnalysisResultItem[]
}) {
  const latestResult = [...results].sort(sortNewestFirst)[0] ?? null
  const latestTask = [...tasks].sort(sortNewestFirst)[0] ?? null
  const latestVideo = [...videos].sort(sortNewestFirst)[0] ?? null
  const task = latestResult
    ? (tasks.find(
        (candidate) =>
          candidate.id === latestResult.task_id ||
          candidate.video_id === latestResult.video_id,
      ) ?? latestTask)
    : latestTask
  const video = latestResult
    ? (videos.find((candidate) => candidate.id === latestResult.video_id) ??
      (task
        ? videos.find((candidate) => candidate.id === task.video_id)
        : null) ??
      latestVideo)
    : task
      ? (videos.find((candidate) => candidate.id === task.video_id) ??
        latestVideo)
      : latestVideo
  const result = latestResult

  return (
    <div className="observation-evidence-track">
      <EvidenceStep
        to="/videos"
        code={video ? formatEvidenceId("V", video.id) : "V•---"}
        label="观测样本"
        status={video ? getVideoEvidenceStatus(video.status) : "尚未建立"}
        time={video ? formatEvidenceTime(video.created_at) : "待记录"}
        review={video ? "可复核" : "不可复核"}
        state={video ? "ready" : "waiting"}
      />
      <EvidenceStep
        to="/tasks"
        code={task ? formatEvidenceId("A", task.id) : "A•---"}
        label="分析记录"
        status={task ? getTaskEvidenceStatus(task.status) : "尚未建立"}
        time={task ? formatEvidenceTime(task.created_at) : "待记录"}
        review={task ? "可追溯" : "不可复核"}
        state={
          task?.status === "FAILED" ? "attention" : task ? "ready" : "waiting"
        }
      />
      <EvidenceStep
        to="/results"
        code={result ? formatEvidenceId("R", result.id) : "R•---"}
        label="行为结果"
        status={result ? "结果已形成" : "等待分析结果"}
        time={result ? formatEvidenceTime(result.created_at) : "待记录"}
        review={result ? "可复核" : "不可复核"}
        state={result ? "ready" : "waiting"}
      />
    </div>
  )
}

function EvidenceStep({
  to,
  code,
  label,
  status,
  time,
  review,
  state,
}: {
  to: "/videos" | "/tasks" | "/results"
  code: string
  label: string
  status: string
  time: string
  review: string
  state: "ready" | "waiting" | "attention"
}) {
  return (
    <Link to={to} className="observation-evidence-step" data-state={state}>
      <span className="observation-evidence-node" aria-hidden="true">
        {code.slice(0, 1)}
      </span>
      <span className="observation-evidence-copy">
        <span className="observation-evidence-label">{label}</span>
        <strong className="observation-data">{code}</strong>
        <span className="observation-evidence-status">{status}</span>
        <span className="observation-evidence-meta">
          <time className="observation-data tabular-nums">{time}</time>
          <span aria-hidden="true">·</span>
          <span>{review}</span>
        </span>
      </span>
      <ArrowUpRight className="observation-evidence-arrow size-4" />
    </Link>
  )
}

function getVideoEvidenceStatus(status: string) {
  const labels: Record<string, string> = {
    UPLOADED: "已归档",
    PENDING: "等待分析",
    PROCESSING: "处理中",
    COMPLETED: "分析完成",
    FAILED: "归档异常",
  }
  return labels[status] ?? status
}

function getTaskEvidenceStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "等待分析",
    PROCESSING: "轨迹提取中",
    COMPLETED: "分析完成",
    FAILED: "分析失败",
  }
  return labels[status] ?? status
}

function formatEvidenceTime(value: string | null) {
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

function ObservationRow({ record }: { record: ObservationRecord }) {
  const { video, task, result } = record
  const scene = getSceneMeta(video.scene_type)

  return (
    <article className="observation-record">
      <div className="min-w-0">
        <div className="observation-record-meta">
          <span className="observation-scene-mark" data-scene={scene.tone} />
          <span>{scene.label}</span>
          <span aria-hidden="true">·</span>
          <time className="observation-data tabular-nums">
            {formatDate(video.created_at)}
          </time>
        </div>
        <p className="observation-record-title">
          {formatEvidenceId("V", video.id)} · {scene.label}
        </p>
        <p
          className="observation-record-filename"
          title={video.original_filename}
        >
          原始文件 · {video.original_filename}
        </p>
      </div>
      <div>
        <p className="observation-record-label">处理状态</p>
        <TaskState status={task?.status ?? null} />
        {task?.status === "PROCESSING" && (
          <span className="observation-data ml-2 observation-muted">
            {Math.round(task.progress)}%
          </span>
        )}
      </div>
      <div>
        <p className="observation-record-label">观测摘要</p>
        <p className="mt-1 text-sm tabular-nums">
          {result
            ? `${result.detected_individuals} 只次 · 进 ${result.entry_count} / 出 ${result.exit_count}`
            : "等待形成分析读数"}
        </p>
      </div>
      <Link
        to="/videos/$videoId"
        params={{ videoId: video.id }}
        aria-label={`查看观测样本：${video.original_filename}`}
        title="查看观测样本"
        className="observation-record-link"
      >
        <ArrowUpRight className="size-4" />
      </Link>
    </article>
  )
}

function TaskState({ status }: { status: string | null }) {
  const states: Record<string, { label: string; tone: string }> = {
    PENDING: { label: "等待分析", tone: "waiting" },
    PROCESSING: { label: "轨迹提取中", tone: "processing" },
    COMPLETED: { label: "分析完成", tone: "ready" },
    FAILED: { label: "分析失败", tone: "attention" },
  }
  const state = status ? states[status] : undefined

  return (
    <span className="observation-task-state" data-state={state?.tone ?? "idle"}>
      <span aria-hidden="true" />
      {state?.label ?? "尚未提交分析"}
    </span>
  )
}

function getColonyState(
  result: AnalysisResultItem | null,
  videoCount: number,
  processingCount: number,
  pendingCount: number,
  failedCount: number,
) {
  if (!result) {
    return {
      label: videoCount > 0 ? "等待形成读数" : "等待观测样本",
      tone: "observe",
      note:
        processingCount > 0
          ? `${processingCount} 项任务正在提取行为轨迹。`
          : pendingCount > 0
            ? `${pendingCount} 项观察样本正在等待分析。`
            : "建立巢内或巢外观测记录后，即可开始记录蜂群活动节律。",
    }
  }
  if (result.abnormal_event_count > 0 || failedCount > 0) {
    return {
      label: "存在关注记录",
      tone: "attention",
      note: `最近样本关联 ${result.abnormal_event_count} 次异常记录，请结合原始视频与分析结果复核。`,
    }
  }
  if ((result.activity_index ?? 0) >= 0.65) {
    return {
      label: "稳定活跃",
      tone: "stable",
      note: "最近一次观测位于较活跃区间，巢门流动与活动节律已同步记录。",
    }
  }
  if ((result.activity_index ?? 0) >= 0.35) {
    return {
      label: "活动平稳",
      tone: "stable",
      note: "最近一次观测处于正常活动区间，可继续结合时序变化观察蜂群节律。",
    }
  }
  return {
    label: "低活动",
    tone: "observe",
    note: "最近一次活动指数低于正常区间，建议结合观测时间与原始视频继续判断。",
  }
}

function getSummarySentence(result: AnalysisResultItem) {
  const net = result.entry_count - result.exit_count
  const flow =
    net > 0
      ? `进巢比出巢多 ${net} 次`
      : net < 0
        ? `出巢比进巢多 ${Math.abs(net)} 次`
        : "进出巢保持平衡"
  const activity =
    (result.activity_index ?? 0) >= 0.65
      ? "活动处于较活跃区间"
      : (result.activity_index ?? 0) >= 0.35
        ? "活动节律平稳"
        : "活动强度偏低"
  const abnormal =
    result.abnormal_event_count > 0
      ? `，有 ${result.abnormal_event_count} 条记录需要复核`
      : "，未见异常记录"
  return `${activity}，${flow}${abnormal}。`
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

function getSceneMeta(sceneType: string) {
  if (sceneType === "OUTDOOR") return { label: "巢外可见光", tone: "outdoor" }
  if (sceneType === "INDOOR") return { label: "巢内红外", tone: "indoor" }
  return { label: sceneType, tone: "unknown" }
}

function formatMetric(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : value.toFixed(2)
}

function formatDate(value: string | null) {
  if (!value) return "时间未记录"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatObservationTime(value: Date | null) {
  if (!value) return "尚无记录"
  return value.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatLongDate(value: Date) {
  return value.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}
