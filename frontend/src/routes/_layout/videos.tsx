import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router"
import {
  FileVideo,
  LoaderCircle,
  Play,
  RefreshCw,
  Trash2,
  Upload,
  Video,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"

export const Route = createFileRoute("/_layout/videos")({
  component: VideosPage,
  head: () => ({
    meta: [
      {
        title: "视频管理 - 巢影蜂析",
      },
    ],
  }),
})

type SceneType = "OUTDOOR" | "INDOOR"

type VideoItem = {
  id: string
  original_filename: string
  scene_type: SceneType
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

const API_BASE = "/api/v1"

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token")

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

function VideosPage() {
  const navigate = useNavigate()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sceneType, setSceneType] =
    useState<SceneType>("OUTDOOR")

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null)

  const [isDragging, setIsDragging] =
    useState(false)

  const [videos, setVideos] =
    useState<VideoItem[]>([])

  const [isLoading, setIsLoading] =
    useState(true)

  const [isUploading, setIsUploading] =
    useState(false)

  const [deletingId, setDeletingId] =
    useState<string | null>(null)

  const [creatingTaskId, setCreatingTaskId] =
    useState<string | null>(null)

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null)

  // 读取真实视频列表
  const loadVideos = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch(
        `${API_BASE}/videos/?skip=0&limit=100`,
        {
          headers: getAuthHeaders(),
        },
      )

      if (!response.ok) {
        throw new Error(
          `读取视频列表失败：${response.status}`,
        )
      }

      const result =
        (await response.json()) as VideosResponse

      setVideos(result.data)
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "读取视频列表失败",
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadVideos()
  }, [loadVideos])

  const handleFile = (file?: File) => {
    if (!file) return

    const extension =
      file.name.split(".").pop()?.toLowerCase()

    const allowedExtensions = [
      "mp4",
      "mov",
      "avi",
      "mkv",
      "webm",
    ]

    if (
      !extension ||
      !allowedExtensions.includes(extension)
    ) {
      alert(
        "请选择 MP4、MOV、AVI、MKV 或 WEBM 视频文件",
      )
      return
    }

    setSelectedFile(file)
  }

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    handleFile(event.target.files?.[0])
  }

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()
    setIsDragging(false)

    handleFile(event.dataTransfer.files?.[0])
  }

  // 上传真实视频
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("请先选择视频")
      return
    }

    setIsUploading(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()

      formData.append(
        "scene_type",
        sceneType,
      )

      formData.append(
        "file",
        selectedFile,
      )

      const response = await fetch(
        `${API_BASE}/videos/upload`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        },
      )

      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => null)

        throw new Error(
          errorBody?.detail ??
            `上传失败：${response.status}`,
        )
      }

      const uploadedVideo =
        (await response.json()) as VideoItem

      setVideos((currentVideos) => [
        uploadedVideo,
        ...currentVideos,
      ])

      setSelectedFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "视频上传失败",
      )
    } finally {
      setIsUploading(false)
    }
  }

  // 删除真实视频
  const handleDelete = async (
    video: VideoItem,
  ) => {
    const confirmed = window.confirm(
      `确定删除视频“${video.original_filename}”吗？`,
    )

    if (!confirmed) return

    setDeletingId(video.id)
    setErrorMessage(null)

    try {
      const response = await fetch(
        `${API_BASE}/videos/${video.id}`,
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
            `删除失败：${response.status}`,
        )
      }

      setVideos((currentVideos) =>
        currentVideos.filter(
          (item) => item.id !== video.id,
        ),
      )
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "删除视频失败",
      )
    } finally {
      setDeletingId(null)
    }
  }

  // 创建真实分析任务
  const handleAnalyze = async (
    video: VideoItem,
  ) => {
    setCreatingTaskId(video.id)
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

      await response.json()

      await navigate({
        to: "/tasks",
      })
    } catch (error) {
      console.error(error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "创建分析任务失败",
      )
    } finally {
      setCreatingTaskId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            巢影蜂析 · 多模态视频数据中心
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            视频管理
          </h1>

          <p className="mt-2 text-muted-foreground">
            管理巢外可见光视频与巢内红外视频，
            为蜜蜂个体识别、连续跟踪及行为量化分析提供数据输入。
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadVideos()}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${
              isLoading ? "animate-spin" : ""
            }`}
          />
          刷新数据
        </button>
      </div>

      {/* 错误提示 */}
      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 text-sm text-red-500">
          {errorMessage}
        </div>
      )}

      {/* 上传区域 */}
      <div className="rounded-xl border">
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Upload className="size-5 text-amber-600" />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                上传监测视频
              </h2>

              <p className="text-sm text-muted-foreground">
                上传前请选择对应监测场景
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* 场景选择 */}
          <div>
            <p className="mb-3 text-sm font-medium">
              监测场景
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setSceneType("OUTDOOR")
                }
                className={`rounded-xl border p-4 text-left transition ${
                  sceneType === "OUTDOOR"
                    ? "border-amber-500 bg-amber-500/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <Video className="size-5" />
                  </div>

                  <div>
                    <p className="font-medium">
                      巢外可见光
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      个体检测 · 多目标跟踪 · 进出巢统计
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSceneType("INDOOR")
                }
                className={`rounded-xl border p-4 text-left transition ${
                  sceneType === "INDOOR"
                    ? "border-amber-500 bg-amber-500/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <FileVideo className="size-5" />
                  </div>

                  <div>
                    <p className="font-medium">
                      巢内红外
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      个体识别 · 姿态方向 · 群体活动分析
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 文件拖拽区域 */}
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() =>
              setIsDragging(false)
            }
            onDrop={handleDrop}
            className={`flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
              isDragging
                ? "border-amber-500 bg-amber-500/5"
                : "border-muted-foreground/20"
            }`}
          >
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
              <Upload className="size-6" />
            </div>

            {selectedFile ? (
              <>
                <p className="font-medium">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {formatFileSize(
                    selectedFile.size,
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">
                  将视频拖拽至此处
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  或点击下方按钮选择本地视频
                </p>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                选择视频
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleUpload()
                }
                disabled={
                  !selectedFile ||
                  isUploading
                }
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isUploading && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}

                {isUploading
                  ? "正在上传..."
                  : "确认上传"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 视频列表 */}
      <div className="rounded-xl border">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">
            视频数据
          </h2>

          <p className="text-sm text-muted-foreground">
            共 {videos.length} 个监测视频
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-52 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <LoaderCircle className="mx-auto mb-3 size-8 animate-spin" />
              <p>正在读取视频数据...</p>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex h-52 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileVideo className="mx-auto mb-3 size-8" />
              <p>暂无视频数据</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-6 py-4 font-medium">
                    视频名称
                  </th>

                  <th className="px-6 py-4 font-medium">
                    场景
                  </th>

                  <th className="px-6 py-4 font-medium">
                    文件大小
                  </th>

                  <th className="px-6 py-4 font-medium">
                    状态
                  </th>

                  <th className="px-6 py-4 font-medium">
                    上传时间
                  </th>

                  <th className="px-6 py-4 text-right font-medium">
                    操作
                  </th>
                </tr>
              </thead>

              <tbody>
                {videos.map((video) => (
                  <tr
                    key={video.id}
                    className="border-b last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                          <FileVideo className="size-4" />
                        </div>

                        <span className="max-w-72 truncate font-medium">
                          {video.original_filename}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <SceneBadge
                        sceneType={
                          video.scene_type
                        }
                      />
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {formatFileSize(
                        video.file_size,
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge
                        status={video.status}
                      />
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(
                        video.created_at,
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {/* 开始分析 */}
                        <button
                          type="button"
                          onClick={() =>
                            void handleAnalyze(
                              video,
                            )
                          }
                          disabled={
                            creatingTaskId ===
                            video.id
                          }
                          className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {creatingTaskId ===
                          video.id ? (
                            <>
                              <LoaderCircle className="size-3.5 animate-spin" />
                              创建任务中
                            </>
                          ) : (
                            <>
                              <Play className="size-3.5" />
                              开始分析
                            </>
                          )}
                        </button>

                        {/* 删除 */}
                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              video,
                            )
                          }
                          disabled={
                            deletingId ===
                            video.id
                          }
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
                        >
                          {deletingId ===
                          video.id ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
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

function SceneBadge({
  sceneType,
}: {
  sceneType: SceneType
}) {
  if (sceneType === "OUTDOOR") {
    return (
      <span className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600">
        巢外可见光
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-600">
      巢内红外
    </span>
  )
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const styles: Record<string, string> = {
    UPLOADED:
      "bg-blue-500/10 text-blue-600",
    PENDING:
      "bg-amber-500/10 text-amber-600",
    PROCESSING:
      "bg-purple-500/10 text-purple-600",
    COMPLETED:
      "bg-green-500/10 text-green-600",
    FAILED:
      "bg-red-500/10 text-red-600",
  }

  const labels: Record<string, string> = {
    UPLOADED: "已上传",
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

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B"

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
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
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString("zh-CN")
}