import { createFileRoute } from "@tanstack/react-router"
import {
  FileVideo,
  Play,
  Trash2,
  Upload,
  Video,
} from "lucide-react"
import {
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
  id: number
  name: string
  sceneType: SceneType
  size: string
  status: "已上传" | "待分析" | "分析完成"
  createdAt: string
}

function VideosPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sceneType, setSceneType] = useState<SceneType>("OUTDOOR")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  /*
   * 第一版先使用演示数据。
   * 后续接入 FastAPI 后，这里会改成从数据库读取。
   */
  const [videos, setVideos] = useState<VideoItem[]>([
    {
      id: 1,
      name: "outdoor_demo_01.mp4",
      sceneType: "OUTDOOR",
      size: "128.4 MB",
      status: "分析完成",
      createdAt: "2026-08-13 21:35",
    },
    {
      id: 2,
      name: "indoor_ir_demo_01.mp4",
      sceneType: "INDOOR",
      size: "86.7 MB",
      status: "待分析",
      createdAt: "2026-08-13 21:42",
    },
  ])

  const handleFile = (file?: File) => {
    if (!file) return

    const isVideo = file.type.startsWith("video/")

    if (!isVideo) {
      alert("请选择视频文件")
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

  const handleUpload = () => {
    if (!selectedFile) {
      alert("请先选择视频")
      return
    }

    const newVideo: VideoItem = {
      id: Date.now(),
      name: selectedFile.name,
      sceneType,
      size: formatFileSize(selectedFile.size),
      status: "待分析",
      createdAt: new Date().toLocaleString(),
    }

    setVideos((currentVideos) => [newVideo, ...currentVideos])
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDelete = (id: number) => {
    setVideos((currentVideos) =>
      currentVideos.filter((video) => video.id !== id),
    )
  }

  const handleAnalyze = (video: VideoItem) => {
    alert(`即将分析：${video.name}`)
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <p className="text-sm text-muted-foreground">
          巢影蜂析 · 多模态视频数据中心
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          视频管理
        </h1>

        <p className="mt-2 text-muted-foreground">
          管理巢外可见光视频与巢内红外视频，为蜜蜂个体识别、
          连续跟踪及行为量化分析提供数据输入。
        </p>
      </div>

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
                onClick={() => setSceneType("OUTDOOR")}
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
                onClick={() => setSceneType("INDOOR")}
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

          {/* 拖拽上传 */}
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
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
                  {formatFileSize(selectedFile.size)}
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
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                选择视频
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                确认上传
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 视频列表 */}
      <div className="rounded-xl border">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-semibold">
              视频数据
            </h2>

            <p className="text-sm text-muted-foreground">
              共 {videos.length} 个监测视频
            </p>
          </div>
        </div>

        {videos.length === 0 ? (
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

                        <span className="font-medium">
                          {video.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <SceneBadge
                        sceneType={video.sceneType}
                      />
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {video.size}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge
                        status={video.status}
                      />
                    </td>

                    <td className="px-6 py-4 text-muted-foreground">
                      {video.createdAt}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleAnalyze(video)}
                          className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-muted"
                        >
                          <Play className="size-3.5" />
                          开始分析
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(video.id)}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
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
  status: VideoItem["status"]
}) {
  const style =
    status === "分析完成"
      ? "bg-green-500/10 text-green-600"
      : status === "待分析"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-blue-500/10 text-blue-600"

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  )
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  const index = Math.floor(
    Math.log(bytes) / Math.log(1024),
  )

  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`
}