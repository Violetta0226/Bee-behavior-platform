import {
  createFileRoute,
  Link,
} from "@tanstack/react-router"
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  FileVideo,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useState,
} from "react"

export const Route = createFileRoute(
  "/_layout/tasks_/$taskId",
)({
  component: TaskDetailPage,
  head: () => ({
    meta: [
      {
        title: "任务详情 - 巢影蜂析",
      },
    ],
  }),
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
  const token =
    localStorage.getItem("access_token")

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

function TaskDetailPage() {
  const { taskId } =
    Route.useParams()

  const [task, setTask] =
    useState<AnalysisTaskItem | null>(
      null,
    )

  const [video, setVideo] =
    useState<VideoItem | null>(null)

  const [result, setResult] =
    useState<AnalysisResultItem | null>(
      null,
    )

  const [isLoading, setIsLoading] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)

  const [isReanalyzing, setIsReanalyzing] =
    useState(false)

  const [isDeleting, setIsDeleting] =
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

        // 先读取任务
        const taskResponse =
          await fetch(
            `${API_BASE}/tasks/${taskId}`,
            {
              headers,
            },
          )

        if (!taskResponse.ok) {
          throw new Error(
            `读取任务详情失败：${taskResponse.status}`,
          )
        }

        const taskData =
          (await taskResponse.json()) as AnalysisTaskItem

        setTask(taskData)

        // 再读取关联视频和结果
        const [
          videoResponse,
          resultResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE}/videos/${taskData.video_id}`,
            {
              headers,
            },
          ),

          fetch(
            `${API_BASE}/results/task/${taskId}`,
            {
              headers,
            },
          ),
        ])

        if (!videoResponse.ok) {
          throw new Error(
            `读取视频信息失败：${videoResponse.status}`,
          )
        }

        const videoData =
          (await videoResponse.json()) as VideoItem

        setVideo(videoData)

        // 没有分析结果时，404 是正常情况
        if (resultResponse.ok) {
          const resultData =
            (await resultResponse.json()) as AnalysisResultItem

          setResult(resultData)
        } else if (
          resultResponse.status === 404
        ) {
          setResult(null)
        } else {
          throw new Error(
            `读取分析结果失败：${resultResponse.status}`,
          )
        }
      } catch (error) {
        console.error(error)

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "读取任务详情失败",
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

    const timer =
      window.setInterval(() => {
        if (
          task?.status === "PENDING" ||
          task?.status === "PROCESSING"
        ) {
          void loadData()
        }
      }, 2000)

    return () => {
      window.clearInterval(timer)
    }
  }, [
    loadData,
    task?.status,
  ])

  const handleReanalyze = async () => {
    if (!task) {
      return
    }

    const confirmed =
      window.confirm(
        "确定重新分析该视频吗？系统将创建一个新的分析任务。",
      )

    if (!confirmed) {
      return
    }

    setIsReanalyzing(true)
    setErrorMessage(null)

    try {
      const response = await fetch(
        `${API_BASE}/tasks/`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            video_id: task.video_id,
            model_name:
              task.model_name ??
              "baseline-v1",
          }),
        },
      )

      if (!response.ok) {
        const errorBody =
          await response
            .json()
            .catch(() => null)

        throw new Error(
          errorBody?.detail ??
            `重新分析失败：${response.status}`,
        )
      }

      window.location.href =
        "/tasks"
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "重新分析失败",
      )
    } finally {
      setIsReanalyzing(false)
    }
  }

  const handleDelete = async () => {
    if (!task) {
      return
    }

    if (
      task.status === "PENDING" ||
      task.status === "PROCESSING"
    ) {
      setErrorMessage(
        "正在执行的任务不能删除",
      )
      return
    }

    const confirmed =
      window.confirm(
        "确定删除该分析任务吗？关联分析结果也会被删除，此操作不可恢复。",
      )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const response = await fetch(
        `${API_BASE}/tasks/${task.id}`,
        {
          method: "DELETE",
          headers:
            getAuthHeaders(),
        },
      )

      if (!response.ok) {
        const errorBody =
          await response
            .json()
            .catch(() => null)

        throw new Error(
          errorBody?.detail ??
            `删除任务失败：${response.status}`,
        )
      }

      window.location.href =
        "/tasks"
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "删除任务失败",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <LoaderCircle className="mx-auto mb-3 size-8 animate-spin" />
          正在读取任务详情...
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="rounded-xl border p-8 text-center">
        未找到分析任务
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 返回 */}
      <Link
        to="/tasks"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回分析任务
      </Link>

      {/* 页面标题 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            巢影蜂析 · 分析任务详情
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            任务详情
          </h1>

          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {task.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void loadData(true)
            }
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
            刷新
          </button>

          {(task.status ===
            "COMPLETED" ||
            task.status ===
              "FAILED") && (
            <button
              type="button"
              onClick={() =>
                void handleReanalyze()
              }
              disabled={
                isReanalyzing
              }
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
            >
              {isReanalyzing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}

              重新分析
            </button>
          )}

          {(task.status ===
            "COMPLETED" ||
            task.status ===
              "FAILED") && (
            <button
              type="button"
              onClick={() =>
                void handleDelete()
              }
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              {isDeleting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}

              删除任务
            </button>
          )}
        </div>
      </div>

      {/* 错误 */}
      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4" />
            {errorMessage}
          </div>
        </div>
      )}

      {/* 状态 + 进度 */}
      <section className="rounded-xl border p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              当前任务状态
            </p>

            <div className="mt-2">
              <TaskStatusBadge
                status={task.status}
              />
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              分析进度
            </p>

            <p className="mt-1 text-3xl font-semibold">
              {task.progress}%
            </p>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{
              width: `${Math.max(
                0,
                Math.min(
                  100,
                  task.progress,
                ),
              )}%`,
            }}
          />
        </div>
      </section>

      {/* 基础信息 */}
      <section className="rounded-xl border">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">
            任务信息
          </h2>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="关联视频"
            value={
              video?.original_filename ??
              "未知视频"
            }
          />

          <InfoItem
            label="模型版本"
            value={
              task.model_name ??
              "baseline-v1"
            }
          />

          <InfoItem
            label="任务类型"
            value={task.task_type}
          />

          <InfoItem
            label="创建时间"
            value={formatDate(
              task.created_at,
            )}
          />

          <InfoItem
            label="开始时间"
            value={formatDate(
              task.started_at,
            )}
          />

          <InfoItem
            label="完成时间"
            value={formatDate(
              task.completed_at,
            )}
          />

          <InfoItem
            label="分析耗时"
            value={formatDuration(
              task.started_at,
              task.completed_at,
            )}
          />

          <InfoItem
            label="监测场景"
            value={formatSceneType(
              video?.scene_type,
            )}
          />

          <InfoItem
            label="视频状态"
            value={
              video?.status ?? "-"
            }
          />
        </div>
      </section>

      {/* 关联分析结果 */}
      <section className="rounded-xl border">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5" />

              <h2 className="text-lg font-semibold">
                关联分析结果
              </h2>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              当前任务生成的行为量化数据
            </p>
          </div>

          {result && (
            <a
              href={`/results?task_id=${task.id}`}
              className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-muted"
            >
              查看完整结果
            </a>
          )}
        </div>

        {!result ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Activity className="mx-auto mb-3 size-8" />

              {task.status ===
              "COMPLETED"
                ? "暂无分析结果"
                : "任务完成后将在此显示分析结果"}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <ResultItem
              label="检测个体"
              value={
                result.detected_individuals
              }
            />

            <ResultItem
              label="有效轨迹"
              value={
                result.valid_tracks
              }
            />

            <ResultItem
              label="进巢数量"
              value={
                result.entry_count
              }
            />

            <ResultItem
              label="出巢数量"
              value={
                result.exit_count
              }
            />

            <ResultItem
              label="平均速度"
              value={
                result.average_speed ??
                "-"
              }
            />

            <ResultItem
              label="活动指数"
              value={
                result.activity_index ??
                "-"
              }
            />

            <ResultItem
              label="异常事件"
              value={
                result.abnormal_event_count
              }
            />
          </div>
        )}
      </section>

      {/* 视频入口 */}
      {video && (
        <section className="rounded-xl border p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileVideo className="size-5" />

              <div>
                <p className="font-medium">
                  {video.original_filename}
                </p>

                <p className="text-sm text-muted-foreground">
                  查看原始视频及历史分析
                </p>
              </div>
            </div>

            <a
              href={`/videos/${video.id}`}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              查看视频详情
            </a>
          </div>
        </section>
      )}

      {task.error_message && (
        <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 size-5 text-red-500" />

            <div>
              <p className="font-medium text-red-500">
                任务错误信息
              </p>

              <p className="mt-2 text-sm text-red-500">
                {task.error_message}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 break-all font-medium">
        {value}
      </p>
    </div>
  )
}

function ResultItem({
  label,
  value,
}: {
  label: string
  value: string | number
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
    COMPLETED: "分析完成",
    FAILED: "分析失败",
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
      className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${
        styles[status] ??
        "bg-muted text-muted-foreground"
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

function formatSceneType(
  value?: string,
) {
  if (value === "OUTDOOR") {
    return "巢外可见光"
  }

  if (value === "INDOOR") {
    return "巢内红外"
  }

  return value ?? "-"
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

  return date.toLocaleString(
    "zh-CN",
  )
}

function formatDuration(
  startedAt: string | null,
  completedAt: string | null,
) {
  if (
    !startedAt ||
    !completedAt
  ) {
    return "-"
  }

  const start =
    new Date(startedAt).getTime()

  const end =
    new Date(
      completedAt,
    ).getTime()

  if (
    Number.isNaN(start) ||
    Number.isNaN(end)
  ) {
    return "-"
  }

  const seconds = Math.max(
    0,
    Math.round(
      (end - start) / 1000,
    ),
  )

  if (seconds < 60) {
    return `${seconds} 秒`
  }

  const minutes =
    Math.floor(seconds / 60)

  const remainder =
    seconds % 60

  return `${minutes} 分 ${remainder} 秒`
}