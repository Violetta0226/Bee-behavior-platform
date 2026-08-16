import {
  createFileRoute,
  Link,
} from "@tanstack/react-router"
import {
  Activity,
  ArrowLeft,
  Clock3,
  LoaderCircle,
  PlayCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

export const Route = createFileRoute(
  "/_layout/videos/$videoId",
)({
  component: VideoDetailPage,
  head: () => ({
    meta: [
      {
        title: "视频详情 - 巢影蜂析",
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

function VideoDetailPage() {
  const { videoId } = Route.useParams()

  const [video, setVideo] =
    useState<VideoItem | null>(null)

  const [tasks, setTasks] =
    useState<AnalysisTaskItem[]>([])

  const [videoUrl, setVideoUrl] =
    useState<string | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

const [isCreatingTask, setIsCreatingTask] =
  useState(false)

  const [isVideoLoading, setIsVideoLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null)

  const [videoError, setVideoError] =
    useState<string | null>(null)

  const loadData = useCallback(
    async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const headers =
          getAuthHeaders()

        const [
          videoResponse,
          tasksResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE}/videos/${videoId}`,
            { headers },
          ),
          fetch(
            `${API_BASE}/tasks/?skip=0&limit=100`,
            { headers },
          ),
        ])

        if (!videoResponse.ok) {
          throw new Error(
            `读取视频详情失败：${videoResponse.status}`,
          )
        }

        if (!tasksResponse.ok) {
          throw new Error(
            `读取分析任务失败：${tasksResponse.status}`,
          )
        }

        const videoData =
          (await videoResponse.json()) as VideoItem

        const tasksData =
          (await tasksResponse.json()) as AnalysisTasksResponse

        setVideo(videoData)
        setTasks(tasksData.data)
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "读取视频详情失败",
        )
      } finally {
        setIsLoading(false)
      }
    },
    [videoId],
  )

  const loadVideo = useCallback(
    async () => {
      setIsVideoLoading(true)
      setVideoError(null)

      try {
        const response = await fetch(
          `${API_BASE}/videos/${videoId}/file`,
          {
            headers:
              getAuthHeaders(),
          },
        )

        if (!response.ok) {
          throw new Error(
            `读取视频文件失败：${response.status}`,
          )
        }

        const blob =
          await response.blob()

        const objectUrl =
          URL.createObjectURL(blob)

        setVideoUrl((oldUrl) => {
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl)
          }

          return objectUrl
        })
      } catch (error) {
        setVideoError(
          error instanceof Error
            ? error.message
            : "视频加载失败",
        )
      } finally {
        setIsVideoLoading(false)
      }
    },
    [videoId],
  )
const handleAnalyze = async () => {
  if (!video) {
    return
  }

  setIsCreatingTask(true)
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
          video_id: video.id,
          model_name: "baseline-v1",
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => null)

      throw new Error(
        errorBody?.detail ??
          `创建分析任务失败：${response.status}`,
      )
    }

    window.location.href = "/tasks"
  } catch (error) {
    console.error(error)

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "创建分析任务失败",
    )
  } finally {
    setIsCreatingTask(false)
  }
}
  useEffect(() => {
    void loadData()
    void loadVideo()
  }, [loadData, loadVideo])

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [videoUrl])

  const videoTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.video_id === videoId,
      ),
    [tasks, videoId],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <LoaderCircle className="mx-auto mb-3 size-8 animate-spin" />
          正在读取视频详情...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link
        to="/videos"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        返回视频管理
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            巢影蜂析 · 视频数据详情
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {video?.original_filename ??
              "视频详情"}
          </h1>

          <p className="mt-2 text-muted-foreground">
            查看原始监测视频、视频属性及历史分析任务。
          </p>
        </div>
<div className="flex gap-3"></div>
       <div className="flex flex-wrap gap-3">
  <button
    type="button"
    onClick={() =>
      void handleAnalyze()
    }
    disabled={
      isCreatingTask || !video
    }
    className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isCreatingTask ? (
      <>
        <LoaderCircle className="size-4 animate-spin" />
        创建任务中
      </>
    ) : (
      <>
        <PlayCircle className="size-4" />
        开始分析
      </>
    )}
  </button>

  <button
    type="button"
    onClick={() => {
      void loadData()
      void loadVideo()
    }}
    className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
  >
    <RefreshCw className="size-4" />
    重新加载
  </button>
</div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
          {errorMessage}
        </div>
      )}

      {/* 播放器 */}
      <section className="overflow-hidden rounded-xl border">
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <PlayCircle className="size-5" />

            <div>
              <h2 className="text-lg font-semibold">
                原始监测视频
              </h2>

              <p className="text-sm text-muted-foreground">
                在线查看当前上传的视频
              </p>
            </div>
          </div>
        </div>

        <div className="bg-black">
          {isVideoLoading ? (
            <div className="flex aspect-video items-center justify-center text-white/70">
              <LoaderCircle className="mr-2 size-6 animate-spin" />
              正在加载视频...
            </div>
          ) : videoError ? (
            <div className="flex aspect-video items-center justify-center p-8 text-center text-white/70">
              <div>
                <TriangleAlert className="mx-auto mb-3 size-8" />
                {videoError}
              </div>
            </div>
          ) : videoUrl ? (
            <video
              controls
              preload="metadata"
              src={videoUrl}
              className="aspect-video w-full bg-black object-contain"
            >
              当前浏览器不支持视频播放。
            </video>
          ) : (
            <div className="flex aspect-video items-center justify-center text-white/70">
              暂无可播放视频
            </div>
          )}
        </div>
      </section>

      {/* 基本信息 */}
      {video && (
        <section className="rounded-xl border">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">
              视频信息
            </h2>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem
              label="文件名称"
              value={video.original_filename}
            />

            <InfoItem
              label="监测场景"
              value={formatSceneType(
                video.scene_type,
              )}
            />

            <InfoItem
              label="文件大小"
              value={formatFileSize(
                video.file_size,
              )}
            />

            <InfoItem
              label="文件类型"
              value={
                video.content_type ?? "-"
              }
            />

            <InfoItem
              label="当前状态"
              value={formatStatus(
                video.status,
              )}
            />

            <InfoItem
              label="上传时间"
              value={formatDate(
                video.created_at,
              )}
            />
          </div>
        </section>
      )}

      {/* 历史分析 */}
      <section className="rounded-xl border">
        <div className="border-b p-6">
          <div className="flex items-center gap-2">
            <Clock3 className="size-5" />

            <h2 className="text-lg font-semibold">
              历史分析任务
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            当前视频共有 {videoTasks.length} 次分析记录
          </p>
        </div>

        {videoTasks.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Activity className="mx-auto mb-3 size-8" />
              暂无分析任务
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-6 py-4">
                    模型
                  </th>

                  <th className="px-6 py-4">
                    状态
                  </th>

                  <th className="px-6 py-4">
                    进度
                  </th>

                  <th className="px-6 py-4">
                    创建时间
                  </th>

                  <th className="px-6 py-4 text-right">
                    操作
                  </th>
                </tr>
              </thead>

              <tbody>
                {videoTasks.map(
                  (task) => (
                    <tr
                      key={task.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4 font-mono text-xs">
                        {task.model_name ??
                          "-"}
                      </td>

                      <td className="px-6 py-4">
                        {formatTaskStatus(
                          task.status,
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {task.progress}%
                      </td>

                      <td className="px-6 py-4 text-muted-foreground">
                        {formatDate(
                          task.created_at,
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {task.status ===
                        "COMPLETED" ? (
                          <a
                            href={`/results?task_id=${task.id}`}
                            className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                          >
                            查看结果
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

function formatSceneType(
  value: string,
) {
  if (value === "OUTDOOR") {
    return "巢外可见光"
  }

  if (value === "INDOOR") {
    return "巢内红外"
  }

  return value
}

function formatStatus(
  value: string,
) {
  const labels: Record<string, string> = {
    UPLOADED: "已上传",
    PROCESSING: "分析中",
    COMPLETED: "分析完成",
    FAILED: "分析失败",
  }

  return labels[value] ?? value
}

function formatTaskStatus(
  value: string,
) {
  const labels: Record<string, string> = {
    PENDING: "等待分析",
    PROCESSING: "分析中",
    COMPLETED: "分析完成",
    FAILED: "分析失败",
  }

  return labels[value] ?? value
}

function formatFileSize(
  bytes: number,
) {
  if (!bytes) {
    return "0 B"
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ]

  const index = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024),
    ),
    units.length - 1,
  )

  return `${(
    bytes /
    1024 ** index
  ).toFixed(1)} ${units[index]}`
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (
    Number.isNaN(date.getTime())
  ) {
    return value
  }

  return date.toLocaleString("zh-CN")
}