import {
  createFileRoute,
  Link,
} from "@tanstack/react-router"
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileVideo,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const Route = createFileRoute("/_layout/")({
  component: DashboardPage,
  head: () => ({
    meta: [
      {
        title: "综合态势 - 巢影蜂析",
      },
    ],
  }),
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

type VideosResponse = {
  data: VideoItem[]
  count: number
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

type AnalysisTasksResponse = {
  data: AnalysisTaskItem[]
  count: number
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

type AnalysisResultsResponse = {
  data: AnalysisResultItem[]
  count: number
}

const API_BASE = "/api/v1"

function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem("access_token")

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

function DashboardPage() {
  const [videos, setVideos] =
    useState<VideoItem[]>([])

  const [tasks, setTasks] =
    useState<AnalysisTaskItem[]>([])

  const [results, setResults] =
    useState<AnalysisResultItem[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null)

  const loadData = useCallback(
    async (manual = false) => {
      if (manual) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setErrorMessage(null)

      try {
        const headers =
          getAuthHeaders()

        const [
          videosResponse,
          tasksResponse,
          resultsResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE}/videos/?skip=0&limit=100`,
            {
              headers,
            },
          ),

          fetch(
            `${API_BASE}/tasks/?skip=0&limit=100`,
            {
              headers,
            },
          ),

          fetch(
            `${API_BASE}/results/?skip=0&limit=100`,
            {
              headers,
            },
          ),
        ])

        if (!videosResponse.ok) {
          throw new Error(
            `读取视频数据失败：${videosResponse.status}`,
          )
        }

        if (!tasksResponse.ok) {
          throw new Error(
            `读取任务数据失败：${tasksResponse.status}`,
          )
        }

        if (!resultsResponse.ok) {
          throw new Error(
            `读取分析结果失败：${resultsResponse.status}`,
          )
        }

        const videosData =
          (await videosResponse.json()) as VideosResponse

        const tasksData =
          (await tasksResponse.json()) as AnalysisTasksResponse

        const resultsData =
          (await resultsResponse.json()) as AnalysisResultsResponse

        setVideos(videosData.data)
        setTasks(tasksData.data)
        setResults(resultsData.data)
      } catch (error) {
        console.error(error)

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "读取综合态势数据失败",
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadData()

    const timer =
      window.setInterval(() => {
        void loadData()
      }, 10000)

    return () => {
      window.clearInterval(timer)
    }
  }, [loadData])

  const videoMap = useMemo(
    () =>
      new Map(
        videos.map((video) => [
          video.id,
          video,
        ]),
      ),
    [videos],
  )

  const summary = useMemo(() => {
    const detectedIndividuals =
      results.reduce(
        (sum, result) =>
          sum +
          result.detected_individuals,
        0,
      )

    const abnormalEvents =
      results.reduce(
        (sum, result) =>
          sum +
          result.abnormal_event_count,
        0,
      )

    const outdoorVideos =
      videos.filter(
        (video) =>
          video.scene_type === "OUTDOOR",
      ).length

    const indoorVideos =
      videos.filter(
        (video) =>
          video.scene_type === "INDOOR",
      ).length

    const pendingTasks =
      tasks.filter(
        (task) =>
          task.status === "PENDING",
      ).length

    const processingTasks =
      tasks.filter(
        (task) =>
          task.status === "PROCESSING",
      ).length

    const completedTasks =
      tasks.filter(
        (task) =>
          task.status === "COMPLETED",
      ).length

    const failedTasks =
      tasks.filter(
        (task) =>
          task.status === "FAILED",
      ).length

    return {
      detectedIndividuals,
      abnormalEvents,

      outdoorVideos,
      indoorVideos,

      pendingTasks,
      processingTasks,
      completedTasks,
      failedTasks,
    }
  }, [videos, tasks, results])

  const recentTasks = useMemo(
    () => tasks.slice(0, 5),
    [tasks],
  )

  const latestResult =
    results[0] ?? null

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <LoaderCircle className="mx-auto mb-3 size-8 animate-spin" />

          <p>正在读取蜂群监测数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            巢影蜂析 · 智慧蜂群行为分析平台
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            综合态势
          </h1>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            面向巢内外蜜蜂个体识别、连续跟踪、
            行为分析与蜂群状态量化，
            汇总当前视频、分析任务及行为结果。
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData(true)
          }
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${
              isRefreshing
                ? "animate-spin"
                : ""
            }`}
          />

          刷新数据
        </button>
      </div>

      {/* 错误提示 */}
      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 text-sm text-red-500">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4" />
            {errorMessage}
          </div>
        </div>
      )}

      {/* 顶部核心指标 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="视频总数"
          value={videos.length}
          unit="个"
          description="已接入巢内外监测视频"
          icon={<Video className="size-5" />}
          href="/videos"
        />

        <DashboardMetricCard
          title="分析任务"
          value={tasks.length}
          unit="个"
          description={`${summary.processingTasks} 个正在分析`}
          icon={
            <Activity className="size-5" />
          }
          href="/tasks"
        />

        <DashboardMetricCard
          title="识别个体"
          value={
            summary.detectedIndividuals
          }
          unit="只"
          description="历史分析累计检测个体"
          icon={<Users className="size-5" />}
          href="/results"
        />

        <DashboardMetricCard
          title="异常事件"
          value={summary.abnormalEvents}
          unit="次"
          description="分析结果累计异常事件"
          icon={
            <TriangleAlert className="size-5" />
          }
          href="/results"
        />
      </div>

      {/* 场景 + 任务 */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 视频场景 */}
        <section className="rounded-xl border">
          <div className="flex items-center justify-between border-b p-6">
            <div>
              <h2 className="text-lg font-semibold">
                监测场景
              </h2>

              <p className="text-sm text-muted-foreground">
                巢外可见光与巢内红外视频接入情况
              </p>
            </div>

            <Link
              to="/videos"
              className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
            >
              视频管理
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <SceneCard
              title="巢外行为监测"
              description="可见光视频"
              count={
                summary.outdoorVideos
              }
              total={videos.length}
            />

            <SceneCard
              title="巢内行为监测"
              description="红外视频"
              count={
                summary.indoorVideos
              }
              total={videos.length}
            />
          </div>
        </section>

        {/* 任务状态 */}
        <section className="rounded-xl border">
          <div className="flex items-center justify-between border-b p-6">
            <div>
              <h2 className="text-lg font-semibold">
                任务运行状态
              </h2>

              <p className="text-sm text-muted-foreground">
                当前分析任务执行情况
              </p>
            </div>

            <Link
              to="/tasks"
              className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
            >
              任务中心
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
            <TaskStatistic
              label="等待"
              value={
                summary.pendingTasks
              }
            />

            <TaskStatistic
              label="分析中"
              value={
                summary.processingTasks
              }
            />

            <TaskStatistic
              label="已完成"
              value={
                summary.completedTasks
              }
            />

            <TaskStatistic
              label="失败"
              value={
                summary.failedTasks
              }
            />
          </div>
        </section>
      </div>

      {/* 最新结果 */}
      <section className="rounded-xl border">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">
              最新蜂群分析
            </h2>

            <p className="text-sm text-muted-foreground">
              最近一次完成的行为分析结果
            </p>
          </div>

          <Link
            to="/results"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            全部结果
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {!latestResult ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileVideo className="mx-auto mb-3 size-8" />

              <p>暂无分析结果</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <ResultStatistic
              label="检测个体"
              value={
                latestResult.detected_individuals
              }
            />

            <ResultStatistic
              label="有效轨迹"
              value={
                latestResult.valid_tracks
              }
            />

            <ResultStatistic
              label="进巢"
              value={
                latestResult.entry_count
              }
            />

            <ResultStatistic
              label="出巢"
              value={
                latestResult.exit_count
              }
            />

            <ResultStatistic
              label="平均速度"
              value={
                latestResult.average_speed ??
                "-"
              }
            />

            <ResultStatistic
              label="活动指数"
              value={
                latestResult.activity_index ??
                "-"
              }
            />

            <ResultStatistic
              label="异常事件"
              value={
                latestResult.abnormal_event_count
              }
            />
          </div>
        )}
      </section>

      {/* 最近任务 */}
      <section className="rounded-xl border">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">
              最近分析任务
            </h2>

            <p className="text-sm text-muted-foreground">
              显示最近提交的分析任务
            </p>
          </div>

          <Link
            to="/tasks"
            className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
          >
            查看全部
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {recentTasks.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Clock3 className="mx-auto mb-3 size-8" />

              <p>暂无分析任务</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {recentTasks.map(
              (task) => {
                const video =
                  videoMap.get(
                    task.video_id,
                  )

                return (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FileVideo className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-80 truncate font-medium">
                          {video?.original_filename ??
                            "未知视频"}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.model_name ??
                            "baseline-v1"}
                          {" · "}
                          {formatDate(
                            task.created_at,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <TaskStatusBadge
                        status={
                          task.status
                        }
                      />

                      <span className="w-12 text-right text-sm font-medium">
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        )}
      </section>

      {/* 平台能力 */}
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">
          系统能力
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          当前平台已完成视频、任务与结果数据闭环
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <CapabilityCard
            title="视频数据管理"
            description="支持巢外可见光与巢内红外监测视频统一管理。"
            icon={
              <Video className="size-5" />
            }
          />

          <CapabilityCard
            title="分析任务调度"
            description="支持任务创建、进度反馈、状态管理与历史追溯。"
            icon={
              <Activity className="size-5" />
            }
          />

          <CapabilityCard
            title="行为结果量化"
            description="形成检测、轨迹、进出巢、活动指数及异常事件等指标。"
            icon={
              <CheckCircle2 className="size-5" />
            }
          />
        </div>
      </section>
    </div>
  )
}

function DashboardMetricCard({
  title,
  value,
  unit,
  description,
  icon,
  href,
}: {
  title: string
  value: number
  unit: string
  description: string
  icon: ReactNode
  href:
    | "/videos"
    | "/tasks"
    | "/results"
}) {
  return (
    <Link
      to={href}
      className="group rounded-xl border p-5 transition hover:bg-muted/30"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-3xl font-semibold">
              {value}
            </span>

            <span className="pb-1 text-xs text-muted-foreground">
              {unit}
            </span>
          </div>
        </div>

        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {description}
        </p>

        <ArrowUpRight className="size-4 opacity-0 transition group-hover:opacity-100" />
      </div>
    </Link>
  )
}

function SceneCard({
  title,
  description,
  count,
  total,
}: {
  title: string
  description: string
  count: number
  total: number
}) {
  const percentage =
    total > 0
      ? (count / total) * 100
      : 0

  return (
    <div className="rounded-xl bg-muted/30 p-5">
      <p className="font-medium">
        {title}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>

      <div className="mt-5 flex items-end gap-2">
        <span className="text-3xl font-semibold">
          {count}
        </span>

        <span className="pb-1 text-sm text-muted-foreground">
          个视频
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        占全部视频{" "}
        {percentage.toFixed(1)}%
      </p>
    </div>
  )
}

function TaskStatistic({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-4 text-center">
      <p className="text-2xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

function ResultStatistic({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function CapabilityCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-xl bg-muted/30 p-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-background">
        {icon}
      </div>

      <p className="mt-4 font-medium">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function TaskStatusBadge({
  status,
}: {
  status: string
}) {
  const labels: Record<
    string,
    string
  > = {
    PENDING: "等待分析",
    PROCESSING: "分析中",
    COMPLETED: "已完成",
    FAILED: "失败",
  }

  const styles: Record<
    string,
    string
  > = {
    PENDING:
      "bg-amber-500/10 text-amber-600",

    PROCESSING:
      "bg-purple-500/10 text-purple-600",

    COMPLETED:
      "bg-green-500/10 text-green-600",

    FAILED:
      "bg-red-500/10 text-red-600",
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ??
        "bg-muted text-muted-foreground"
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString("zh-CN")
}