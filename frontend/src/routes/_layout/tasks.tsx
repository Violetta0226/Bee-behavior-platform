import { createFileRoute } from "@tanstack/react-router"
import {
  Activity,
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
  useMemo,
  useState,
} from "react"

export const Route = createFileRoute("/_layout/tasks")({
  component: TasksPage,
  head: () => ({
    meta: [
      {
        title: "分析任务 - 巢影蜂析",
      },
    ],
  }),
})

type TaskStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"

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

type AnalysisTasksResponse = {
  data: AnalysisTaskItem[]
  count: number
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

type VideosResponse = {
  data: VideoItem[]
  count: number
}

type LoadMode =
  | "initial"
  | "manual"
  | "silent"

const API_BASE = "/api/v1"

function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("access_token")

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

function TasksPage() {
  const [tasks, setTasks] =
    useState<AnalysisTaskItem[]>([])

  const [videos, setVideos] =
    useState<VideoItem[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [isRefreshing, setIsRefreshing] =
    useState(false)
const [reanalyzingId, setReanalyzingId] =
  useState<string | null>(null)
  const [deletingId, setDeletingId] =
  useState<string | null>(null)
  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null)

  /**
   * 同时读取：
   * 1. 分析任务
   * 2. 视频信息
   *
   * 视频信息用于根据 video_id
   * 显示真实视频名称。
   */
  const loadData = useCallback(
    async (
      mode: LoadMode = "silent",
    ) => {
      if (mode === "initial") {
        setIsLoading(true)
      }

      if (mode === "manual") {
        setIsRefreshing(true)
      }

      try {
        const headers =
          getAuthHeaders()

        const [
          tasksResponse,
          videosResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE}/tasks/?skip=0&limit=100`,
            {
              headers,
            },
          ),

          fetch(
            `${API_BASE}/videos/?skip=0&limit=100`,
            {
              headers,
            },
          ),
        ])

        if (!tasksResponse.ok) {
          throw new Error(
            `读取分析任务失败：${tasksResponse.status}`,
          )
        }

        if (!videosResponse.ok) {
          throw new Error(
            `读取视频信息失败：${videosResponse.status}`,
          )
        }

        const taskResult =
          (await tasksResponse.json()) as AnalysisTasksResponse

        const videoResult =
          (await videosResponse.json()) as VideosResponse

        setTasks(taskResult.data)
        setVideos(videoResult.data)

        setErrorMessage(null)
      } catch (error) {
        console.error(error)

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "读取分析任务失败",
        )
      } finally {
        if (mode === "initial") {
          setIsLoading(false)
        }

        if (mode === "manual") {
          setIsRefreshing(false)
        }
      }
    },
    [],
  )

  /**
   * 页面进入时立即读取一次。
   * 此后每 2 秒静默刷新。
   */
 const handleReanalyze = async (
  task: AnalysisTaskItem,
) => {
  const confirmed = window.confirm(
    "确定重新分析该视频吗？系统将创建一个新的分析任务。",
  )

  if (!confirmed) {
    return
  }

  setReanalyzingId(task.id)
  setErrorMessage(null)

  try {
    const response = await fetch(
      `${API_BASE}/tasks/`,
      {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
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
      const errorBody = await response
        .json()
        .catch(() => null)

      throw new Error(
        errorBody?.detail ??
          `重新分析失败：${response.status}`,
      )
    }

    await response.json()

    await loadData("manual")
  } catch (error) {
    console.error(error)

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "重新分析失败",
    )
  } finally {
    setReanalyzingId(null)
  }
}

const handleDeleteTask = async (
  task: AnalysisTaskItem,
) => {
  if (
    task.status === "PENDING" ||
    task.status === "PROCESSING"
  ) {
    setErrorMessage(
      "正在执行的分析任务不能删除",
    )
    return
  }

  const confirmed = window.confirm(
    "确定删除该分析任务吗？关联的分析结果也会一并删除，此操作不可恢复。",
  )

  if (!confirmed) {
    return
  }

  setDeletingId(task.id)
  setErrorMessage(null)

  try {
    const response = await fetch(
      `${API_BASE}/tasks/${task.id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    )

    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => null)

      throw new Error(
        errorBody?.detail ??
          `删除任务失败：${response.status}`,
      )
    }

    await loadData("manual")
  } catch (error) {
    console.error(error)

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "删除分析任务失败",
    )
  } finally {
    setDeletingId(null)
  }
}
  useEffect(() => {
    void loadData("initial")

    const timer =
      window.setInterval(() => {
        void loadData("silent")
      }, 2000)

    return () => {
      window.clearInterval(timer)
    }
  }, [loadData])

  /**
   * 建立：
   *
   * video_id -> 视频名称
   *
   * 的映射。
   */
  const videoNameMap = useMemo(
    () =>
      new Map(
        videos.map((video) => [
          video.id,
          video.original_filename,
        ]),
      ),
    [videos],
  )

  /**
   * 汇总任务状态。
   */
  const summary = useMemo(() => {
    return {
      total: tasks.length,

      pending: tasks.filter(
        (task) =>
          task.status === "PENDING",
      ).length,

      processing: tasks.filter(
        (task) =>
          task.status === "PROCESSING",
      ).length,

      completed: tasks.filter(
        (task) =>
          task.status === "COMPLETED",
      ).length,

      failed: tasks.filter(
        (task) =>
          task.status === "FAILED",
      ).length,
    }
  }, [tasks])

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            巢影蜂析 · AI 分析任务中心
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            分析任务
          </h1>

          <p className="mt-2 text-muted-foreground">
            统一管理蜜蜂视频分析任务，
            实时查看模型执行状态、分析进度及异常信息。
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData("manual")
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

          刷新任务
        </button>
      </div>

      {/* 提示信息 */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 size-5 shrink-0 text-amber-500" />

          <div>
            <p className="text-sm font-medium">
              当前处于分析流程联调阶段
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              当前 baseline-v1
              使用模拟分析流程验证任务调度、状态更新和进度反馈。
              后续将替换为真实蜜蜂检测、跟踪与行为分析模型。
            </p>
          </div>
        </div>
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

      {/* 任务统计 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="任务总数"
          value={summary.total}
          description="全部分析任务"
        />

        <SummaryCard
          title="等待分析"
          value={summary.pending}
          description="PENDING"
        />

        <SummaryCard
          title="分析中"
          value={summary.processing}
          description="PROCESSING"
        />

        <SummaryCard
          title="已完成"
          value={summary.completed}
          description="COMPLETED"
        />

        <SummaryCard
          title="分析失败"
          value={summary.failed}
          description="FAILED"
        />
      </div>

      {/* 任务列表 */}
      <div className="rounded-xl border">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                任务队列
              </h2>

              <p className="text-sm text-muted-foreground">
                系统每 2 秒自动刷新一次任务状态
              </p>
            </div>

            {summary.processing > 0 && (
              <div className="flex items-center gap-2 text-sm text-purple-500">
                <LoaderCircle className="size-4 animate-spin" />

                {summary.processing} 个任务正在分析
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <LoaderCircle className="mx-auto mb-3 size-8 animate-spin" />

              <p>正在读取分析任务...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Activity className="mx-auto mb-3 size-8" />

              <p className="font-medium">
                暂无分析任务
              </p>

              <p className="mt-1 text-sm">
                请前往视频管理页面选择视频并开始分析
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
             <thead>
  <tr className="border-b bg-muted/30 text-left">
    <th className="px-6 py-4 font-medium">
      视频
    </th>

    <th className="px-6 py-4 font-medium">
      模型
    </th>

    <th className="px-6 py-4 font-medium">
      状态
    </th>

    <th className="min-w-52 px-6 py-4 font-medium">
      分析进度
    </th>

    <th className="px-6 py-4 font-medium">
      创建时间
    </th>

   <th className="px-6 py-4 font-medium">
  完成时间
</th>

<th className="px-6 py-4 font-medium">
  分析耗时
</th>

<th className="px-6 py-4 text-right font-medium">
  操作
</th>
  </tr>
</thead>

             <tbody>
  {tasks.map((task) => (
    <tr
      key={task.id}
      className="border-b last:border-0"
    >
      {/* 视频 */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileVideo className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="max-w-64 truncate font-medium">
              {videoNameMap.get(task.video_id) ??
                "未知视频"}
            </p>

            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {shortId(task.video_id)}
            </p>
          </div>
        </div>
      </td>

      {/* 模型 */}
      <td className="px-6 py-4">
        <span className="font-mono text-xs">
          {task.model_name ?? "-"}
        </span>
      </td>

      {/* 状态 */}
      <td className="px-6 py-4">
        <TaskStatusBadge
          status={task.status}
        />
      </td>

      {/* 分析进度 */}
      <td className="px-6 py-4">
        <ProgressBar
          progress={task.progress}
          status={task.status}
        />
      </td>

      {/* 创建时间 */}
      <td className="px-6 py-4 text-muted-foreground">
        {formatDate(task.created_at)}
      </td>

      {/* 完成时间 */}
      <td className="px-6 py-4 text-muted-foreground">
        {formatDate(task.completed_at)}

        {task.error_message && (
          <p className="mt-1 max-w-52 truncate text-xs text-red-500">
            {task.error_message}
          </p>
        )}
      </td>
      {/* 分析耗时 */}
<td className="px-6 py-4 text-muted-foreground">
  {formatDuration(
    task.started_at,
    task.completed_at,
    task.status,
  )}
</td>

     {/* 操作 */}
<td className="px-6 py-4">
  <a
  href={`/tasks/${task.id}`}
  className="inline-flex whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-muted"
>
  任务详情
</a>
  <div className="flex items-center justify-end gap-2">
    {task.status === "COMPLETED" && (
      <a
        href={`/results?task_id=${task.id}`}
        className="inline-flex whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-muted"
      >
        查看结果
      </a>
    )}

    {(task.status === "COMPLETED" ||
      task.status === "FAILED") && (
      <button
        type="button"
        onClick={() =>
          void handleReanalyze(task)
        }
        disabled={
          reanalyzingId === task.id
        }
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {reanalyzingId === task.id ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin" />
            创建中
          </>
        ) : (
          <>
            <RotateCcw className="size-3.5" />
            重新分析
          </>
        )}
      </button>
    )}
{(task.status === "COMPLETED" ||
  task.status === "FAILED") && (
  <button
    type="button"
    onClick={() =>
      void handleDeleteTask(task)
    }
    disabled={
      deletingId === task.id
    }
    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-500/20 px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {deletingId === task.id ? (
      <>
        <LoaderCircle className="size-3.5 animate-spin" />
        删除中
      </>
    ) : (
      <>
        <Trash2 className="size-3.5" />
        删除
      </>
    )}
  </button>
)}
    {task.status !== "COMPLETED" &&
      task.status !== "FAILED" && (
        <span className="text-xs text-muted-foreground">
          任务执行中
        </span>
      )}
  </div>
</td>
    </tr>
  ))}
</tbody>
</table>
</div>
)}
</div>
</div>
)
}
function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: string
}) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs text-muted-foreground">
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

  const labels: Record<
    string,
    string
  > = {
    PENDING: "等待分析",
    PROCESSING: "分析中",
    COMPLETED: "分析完成",
    FAILED: "分析失败",
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ??
        "bg-muted text-muted-foreground"
      }`}
    >
      {labels[status] ?? status}
    </span>
  )
}

function ProgressBar({
  progress,
  status,
}: {
  progress: number
  status: string
}) {
  const safeProgress = Math.max(
    0,
    Math.min(100, progress),
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {status === "COMPLETED"
            ? "已完成"
            : status === "FAILED"
              ? "分析失败"
              : "正在处理"}
        </span>

        <span className="font-medium">
          {safeProgress}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === "FAILED"
              ? "bg-red-500"
              : status ===
                  "COMPLETED"
                ? "bg-green-500"
                : status ===
                    "PROCESSING"
                  ? "bg-purple-500"
                  : "bg-amber-500"
          }`}
          style={{
            width: `${safeProgress}%`,
          }}
        />
      </div>
    </div>
  )
}

function shortId(value: string) {
  if (value.length <= 12) {
    return value
  }

  return `${value.slice(
    0,
    8,
  )}...${value.slice(-4)}`
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-"
  }

  const date =
    new Date(value)

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
  status: string,
) {
  if (!startedAt) {
    return "-"
  }

  const start =
    new Date(startedAt).getTime()

  let end: number

  if (completedAt) {
    end =
      new Date(
        completedAt,
      ).getTime()
  } else if (
    status === "PROCESSING"
  ) {
    end = Date.now()
  } else {
    return "-"
  }

  if (
    Number.isNaN(start) ||
    Number.isNaN(end)
  ) {
    return "-"
  }

  const totalSeconds =
    Math.max(
      0,
      Math.round(
        (end - start) / 1000,
      ),
    )

  if (totalSeconds < 60) {
    return `${totalSeconds} 秒`
  }

  const minutes =
    Math.floor(
      totalSeconds / 60,
    )

  const seconds =
    totalSeconds % 60

  if (minutes < 60) {
    return `${minutes} 分 ${seconds} 秒`
  }

  const hours =
    Math.floor(
      minutes / 60,
    )

  const remainingMinutes =
    minutes % 60

  return `${hours} 小时 ${remainingMinutes} 分`
}