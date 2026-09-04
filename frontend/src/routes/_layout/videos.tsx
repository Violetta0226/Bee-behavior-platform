import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import {
  ArrowUpRight,
  Check,
  FileVideo,
  Filter,
  Hexagon,
  LoaderCircle,
  Moon,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ObservationVideoPreview } from "@/components/Dashboard/ObservationVideoPreview"
import { ResearchContentFrame } from "@/components/Layout/ResearchContentFrame"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  formatEvidenceId,
  selectObservationEvidence,
} from "@/lib/observationIds"

import "@/components/Dashboard/observation-theme.css"
import "./videos.css"

export const Route = createFileRoute("/_layout/videos")({
  component: VideosRoute,
  head: () => ({ meta: [{ title: "蜂群观测档案 - 巢影蜂析" }] }),
})

type SceneType = "OUTDOOR" | "INDOOR"
type SceneFilter = "ALL" | SceneType
type ArchiveStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
type StatusFilter = "ALL" | ArchiveStatus
type ArchiveLoadMode = "initial" | "manual"

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

type ArchiveRecord = {
  video: VideoItem
  task: AnalysisTaskItem | null
  result: AnalysisResultItem | null
  displayId: string
}

const API_BASE = "/api/v1"

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "全部状态" },
  { value: "PENDING", label: "待分析" },
  { value: "PROCESSING", label: "分析中" },
  { value: "COMPLETED", label: "已完成" },
  { value: "FAILED", label: "失败" },
]

function VideosRoute() {
  const isDetailRoute = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) => match.routeId === "/_layout/videos/$videoId",
      ),
  })

  return isDetailRoute ? <Outlet /> : <VideosPage />
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function VideosPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sceneType, setSceneType] = useState<SceneType>("OUTDOOR")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [tasks, setTasks] = useState<AnalysisTaskItem[]>([])
  const [results, setResults] = useState<AnalysisResultItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [sceneFilter, setSceneFilter] = useState<SceneFilter>("ALL")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const loadData = useCallback(async (mode: ArchiveLoadMode) => {
    if (mode === "initial") setIsLoading(true)
    if (mode === "manual") setIsRefreshing(true)
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
        throw new Error(`读取视频档案失败：${videosResponse.status}`)
      }

      const videosData = (await videosResponse.json()) as VideosResponse
      const tasksData = tasksResponse.ok
        ? ((await tasksResponse.json()) as AnalysisTasksResponse)
        : { data: [], count: 0 }
      const resultsData = resultsResponse.ok
        ? ((await resultsResponse.json()) as AnalysisResultsResponse)
        : { data: [], count: 0 }

      setVideos(videosData.data)
      setTasks(tasksData.data)
      setResults(resultsData.data)
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : "读取视频档案失败",
      )
    } finally {
      if (mode === "initial") setIsLoading(false)
      if (mode === "manual") setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData("initial")
  }, [loadData])

  const sortedVideos = useMemo(
    () => [...videos].sort(sortNewestFirst),
    [videos],
  )

  const records = useMemo<ArchiveRecord[]>(
    () =>
      sortedVideos.map((video) => {
        const { task, result } = selectObservationEvidence(
          video.id,
          tasks,
          results,
        )

        return {
          video,
          task,
          result,
          displayId: formatEvidenceId("V", video.id),
        }
      }),
    [results, sortedVideos, tasks],
  )

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return records.filter((record) => {
      const matchesScene =
        sceneFilter === "ALL" || record.video.scene_type === sceneFilter
      const matchesStatus =
        statusFilter === "ALL" ||
        getArchiveStatus(record.video, record.task).key === statusFilter
      const matchesQuery =
        !normalizedQuery ||
        record.video.original_filename.toLowerCase().includes(normalizedQuery)

      return matchesScene && matchesStatus && matchesQuery
    })
  }, [records, sceneFilter, searchQuery, statusFilter])
  const isSingleSample = filteredRecords.length === 1

  useArchiveReveal(isLoading, filteredRecords.length)

  const summary = useMemo(() => {
    return {
      total: records.length,
      outdoor: records.filter((record) => record.video.scene_type === "OUTDOOR")
        .length,
      indoor: records.filter((record) => record.video.scene_type === "INDOOR")
        .length,
      pending: records.filter(
        (record) =>
          getArchiveStatus(record.video, record.task).key === "PENDING",
      ).length,
      completed: records.filter(
        (record) =>
          getArchiveStatus(record.video, record.task).key === "COMPLETED",
      ).length,
    }
  }, [records])

  const handleFile = (file?: File) => {
    if (!file) return

    const extension = file.name.split(".").pop()?.toLowerCase()
    const allowedExtensions = ["mp4", "mov", "avi", "mkv", "webm"]

    if (!extension || !allowedExtensions.includes(extension)) {
      setUploadError("请选择 MP4、MOV、AVI、MKV 或 WEBM 视频文件")
      return
    }

    setUploadError(null)
    setSelectedFile(file)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0])
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("请先选择视频文件")
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append("scene_type", sceneType)
      formData.append("file", selectedFile)

      const response = await fetch(`${API_BASE}/videos/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail ?? `上传失败：${response.status}`)
      }

      const uploadedVideo = (await response.json()) as VideoItem
      setVideos((currentVideos) => [uploadedVideo, ...currentVideos])
      setSelectedFile(null)
      setIsUploadOpen(false)

      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      console.error(error)
      setUploadError(error instanceof Error ? error.message : "视频上传失败")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (video: VideoItem) => {
    const confirmed = window.confirm(
      `确定删除观测样本“${video.original_filename}”吗？`,
    )
    if (!confirmed) return

    setDeletingId(video.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`${API_BASE}/videos/${video.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail ?? `删除失败：${response.status}`)
      }

      setVideos((currentVideos) =>
        currentVideos.filter((item) => item.id !== video.id),
      )
    } catch (error) {
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : "删除观测样本失败",
      )
    } finally {
      setDeletingId(null)
    }
  }

  const handleAnalyze = async (video: VideoItem) => {
    setCreatingTaskId(video.id)
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
          model_name: "baseline-v1",
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
      console.error(error)
      setErrorMessage(
        error instanceof Error ? error.message : "创建分析任务失败",
      )
    } finally {
      setCreatingTaskId(null)
    }
  }

  const resetFilters = () => {
    setSceneFilter("ALL")
    setStatusFilter("ALL")
    setSearchQuery("")
  }

  return (
    <main
      className="observation-page archive-page"
      data-single-sample={isSingleSample ? "" : undefined}
    >
      <ResearchContentFrame
        size={isSingleSample ? "workspace" : "standard"}
        density="archive"
        className="observation-shell archive-shell"
      >
        <header className="archive-header" data-observation-reveal>
          <div className="archive-heading">
            <p className="archive-kicker">
              Observation archive <span aria-hidden="true">/</span> 原始观测入口
            </p>
            <h1 className="archive-title">蜂群观测档案</h1>
            <p className="archive-description">
              集中管理蜂群原始观测视频、场景信息与分析状态，建立从观测样本到分析结果的可追溯记录。
            </p>
          </div>

          <div className="archive-header-actions">
            <button
              type="button"
              onClick={() => void loadData("manual")}
              disabled={isLoading || isRefreshing}
              className="archive-icon-button"
              aria-label="刷新观测档案"
              title="刷新观测档案"
            >
              <RefreshCw
                className={
                  isLoading || isRefreshing ? "size-4 animate-spin" : "size-4"
                }
              />
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="archive-alert" role="alert" data-observation-reveal>
            <FileVideo className="size-4 shrink-0" aria-hidden="true" />
            <div>
              <strong>观测档案操作未完成</strong>
              <p>{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="archive-alert-close"
              aria-label="关闭提示"
              title="关闭提示"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <section
          className="archive-command-rail"
          aria-label="观测档案命令区"
          data-observation-reveal
        >
          <div className="archive-command-summary">
            <p className="archive-count-line">
              当前样本{" "}
              <strong className="observation-data">{summary.total}</strong> 份
            </p>
            <dl className="archive-summary-strip" aria-label="档案状态摘要">
              <ArchiveState label="全部" value={summary.total} tone="all" />
              <ArchiveState
                label="户外"
                value={summary.outdoor}
                tone="outdoor"
              />
              <ArchiveState label="红外" value={summary.indoor} tone="indoor" />
              <ArchiveState
                label="待分析"
                value={summary.pending}
                tone="pending"
              />
              <ArchiveState
                label="已完成"
                value={summary.completed}
                tone="completed"
              />
            </dl>
          </div>
          <div className="archive-filter-bar">
            <div className="archive-filter-title">
              <Filter className="size-4" aria-hidden="true" />
              <span>档案筛选</span>
              <span className="archive-filter-result observation-data">
                {filteredRecords.length} / {records.length}
              </span>
            </div>
            <div className="archive-filter-controls">
              <fieldset className="archive-segmented">
                <legend className="sr-only">场景筛选</legend>
                <FilterButton
                  active={sceneFilter === "ALL"}
                  onClick={() => setSceneFilter("ALL")}
                >
                  全部
                </FilterButton>
                <FilterButton
                  active={sceneFilter === "OUTDOOR"}
                  onClick={() => setSceneFilter("OUTDOOR")}
                >
                  户外可见光
                </FilterButton>
                <FilterButton
                  active={sceneFilter === "INDOOR"}
                  onClick={() => setSceneFilter("INDOOR")}
                >
                  室内红外
                </FilterButton>
              </fieldset>
              <label className="archive-status-select">
                <span>状态</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="archive-search-field">
                <Search className="size-4" aria-hidden="true" />
                <span className="sr-only">检索文件名</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="检索观测文件…"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setUploadError(null)
                  setIsUploadOpen(true)
                }}
                className="archive-upload-button"
              >
                <Upload className="size-4" aria-hidden="true" />
                上传观测视频
              </button>
            </div>
          </div>
        </section>

        <section
          className="archive-records-section"
          aria-labelledby="archive-records-title"
        >
          <div className="archive-records-heading" data-observation-reveal>
            <div>
              <p className="archive-kicker">Research observation archive</p>
              <h2 id="archive-records-title">观测样本记录</h2>
            </div>
            <span className="archive-records-note">
              预览来自原始视频 · 关系链保持真实 UUID 关联
            </span>
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
                正在翻阅观测档案，样本骨架保持可见…
              </div>
              <div className="research-loading-row" aria-hidden="true">
                <span className="research-skeleton is-medium" />
                <span className="research-skeleton is-wide" />
                <span className="research-skeleton is-short" />
              </div>
            </div>
          ) : records.length === 0 ? (
            <ArchiveEmptyState onUpload={() => setIsUploadOpen(true)} />
          ) : filteredRecords.length === 0 ? (
            <div className="archive-no-match" role="status">
              <Search className="size-5" aria-hidden="true" />
              <div>
                <strong>没有符合当前筛选的样本</strong>
                <p>调整场景、状态或文件名检索条件后再试。</p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="archive-text-button"
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="archive-record-list">
              {filteredRecords.map((record, index) => (
                <ObservationArchiveRow
                  key={record.video.id}
                  record={record}
                  index={index}
                  deleting={deletingId === record.video.id}
                  creatingTask={creatingTaskId === record.video.id}
                  onAnalyze={() => void handleAnalyze(record.video)}
                  onDelete={() => void handleDelete(record.video)}
                  onOpen={() =>
                    void navigate({
                      to: "/videos/$videoId",
                      params: { videoId: record.video.id },
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </ResearchContentFrame>

      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          if (!isUploading) setIsUploadOpen(open)
        }}
      >
        <DialogContent className="archive-intake-dialog">
          <DialogHeader>
            <p className="archive-kicker">Observation intake</p>
            <DialogTitle>上传观测视频</DialogTitle>
            <DialogDescription>
              将原始视频标记为观测样本并收入档案。仅需选择视频文件与观测场景。
            </DialogDescription>
          </DialogHeader>

          <ol className="archive-intake-steps" aria-label="入库步骤">
            <li className="is-active">
              <b>01</b> 视频文件
            </li>
            <li>
              <b>02</b> 观测场景
            </li>
            <li>
              <b>03</b> 确认入库
            </li>
          </ol>

          <div className="archive-intake-grid">
            <section
              className={`archive-dropzone ${isDragging ? "is-dragging" : ""}`}
              aria-label="视频文件拖放区域"
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.avi,.mkv,.webm,video/*"
                className="sr-only"
                aria-label="选择观测视频文件"
                onChange={handleFileChange}
              />
              <div className="archive-dropzone-mark" aria-hidden="true">
                <Upload className="size-5" />
              </div>
              <strong>{selectedFile ? "已选观测视频" : "上传观测视频"}</strong>
              <p>
                {selectedFile
                  ? selectedFile.name
                  : "拖入原始视频，或从设备中选择文件"}
              </p>
              <small>MP4 / MOV / AVI / MKV / WEBM</small>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="archive-secondary-button"
              >
                {selectedFile ? "更换视频" : "选择视频文件"}
              </button>
            </section>

            <fieldset className="archive-scene-fieldset">
              <legend>02 / 观测场景</legend>
              <SceneChoice
                scene="OUTDOOR"
                selected={sceneType === "OUTDOOR"}
                onSelect={() => setSceneType("OUTDOOR")}
              />
              <SceneChoice
                scene="INDOOR"
                selected={sceneType === "INDOOR"}
                onSelect={() => setSceneType("INDOOR")}
              />
            </fieldset>
          </div>

          {uploadError && (
            <p className="archive-intake-error" role="alert">
              {uploadError}
            </p>
          )}

          <DialogFooter className="archive-intake-footer">
            <DialogClose asChild>
              <button
                type="button"
                className="archive-secondary-button"
                disabled={isUploading}
              >
                取消
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={!selectedFile || isUploading}
              className="archive-upload-button"
            >
              {isUploading ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              {isUploading ? "正在建立记录…" : "确认入库"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function ArchiveState({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "all" | "outdoor" | "indoor" | "pending" | "completed"
}) {
  return (
    <div className="archive-summary-item" data-tone={tone}>
      <dt>{label}</dt>
      <dd className="observation-data">{value}</dd>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}

function ObservationArchiveRow({
  record,
  index,
  deleting,
  creatingTask,
  onAnalyze,
  onDelete,
  onOpen,
}: {
  record: ArchiveRecord
  index: number
  deleting: boolean
  creatingTask: boolean
  onAnalyze: () => void
  onDelete: () => void
  onOpen: () => void
}) {
  const { video, task, result, displayId } = record
  const scene = getSceneMeta(video.scene_type)
  const analysis = getArchiveStatus(video, task)
  const resultId = result ? formatEvidenceId("R", result.id) : null
  const taskId = task ? formatEvidenceId("A", task.id) : null
  const canAnalyze = !result && (!task || task.status === "FAILED")

  return (
    <article
      className="archive-plate"
      data-observation-reveal
      data-observation-delay={String(Math.min(index + 1, 4))}
    >
      <ObservationVideoPreview
        video={video}
        displayId={displayId}
        sceneLabel={scene.label}
        className="archive-plate-preview"
      />

      <div className="archive-plate-body">
        <div className="archive-record-heading">
          <div className="archive-record-identification">
            <span className="archive-record-id observation-data">
              {displayId}
            </span>
            <span
              className={`archive-scene-label archive-scene-label--${scene.tone}`}
            >
              <i aria-hidden="true" />
              {scene.label}
            </span>
          </div>
          <span className="archive-observation-label">Observation sample</span>
        </div>

        <div className="archive-file-field">
          <span className="archive-file-label">原始文件</span>
          <Link
            to="/videos/$videoId"
            params={{ videoId: video.id }}
            className="archive-filename"
            title={video.original_filename}
          >
            {video.original_filename}
          </Link>
        </div>

        <dl className="archive-metadata">
          <div>
            <dt>观测时间</dt>
            <dd className="observation-data">{formatDate(video.created_at)}</dd>
          </div>
          <div>
            <dt>文件大小</dt>
            <dd className="observation-data">
              {formatFileSize(video.file_size)}
            </dd>
          </div>
          <div>
            <dt>类型</dt>
            <dd>{video.content_type ?? "未记录"}</dd>
          </div>
        </dl>

        <div className="archive-analysis-band">
          <div className="archive-analysis-status">
            <span
              className={`archive-status-marker archive-status-marker--${analysis.tone}`}
              aria-hidden="true"
            />
            <span className="archive-analysis-label">分析状态</span>
            <strong>{analysis.label}</strong>
            {task?.status === "PROCESSING" && (
              <span className="archive-progress observation-data">
                {task.progress}%
              </span>
            )}
          </div>

          <fieldset
            className={`archive-evidence-chain${!task && !result ? " archive-evidence-chain--source-only" : ""}`}
          >
            <legend className="sr-only">{displayId} 研究证据链</legend>
            <span className="archive-evidence-chain-label">研究证据链</span>
            <div className="archive-evidence-nodes">
              <Link
                to="/videos/$videoId"
                params={{ videoId: video.id }}
                className="archive-evidence-step archive-evidence-step--video"
                aria-label={`${displayId} 原始观测`}
              >
                <span className="archive-evidence-marker" aria-hidden="true">
                  V
                </span>
                <span className="archive-evidence-copy">
                  <strong className="archive-evidence-id">{displayId}</strong>
                  <small>原始观测</small>
                </span>
              </Link>

              {task && (
                <>
                  <span
                    className="archive-evidence-connector"
                    aria-hidden="true"
                  />
                  <Link
                    to="/tasks/$taskId"
                    params={{ taskId: task.id }}
                    className="archive-evidence-step archive-evidence-step--analysis"
                    aria-label={`${taskId} 分析记录`}
                  >
                    <span
                      className="archive-evidence-marker"
                      aria-hidden="true"
                    >
                      A
                    </span>
                    <span className="archive-evidence-copy">
                      <strong className="archive-evidence-id">{taskId}</strong>
                      <small>分析记录</small>
                    </span>
                  </Link>
                </>
              )}

              {result && (
                <>
                  <span
                    className="archive-evidence-connector"
                    aria-hidden="true"
                  />
                  <Link
                    to="/results"
                    search={{ task_id: result.task_id }}
                    className="archive-evidence-step archive-evidence-step--result"
                    aria-label={`${resultId} 行为结果`}
                  >
                    <span
                      className="archive-evidence-marker"
                      aria-hidden="true"
                    >
                      R
                    </span>
                    <span className="archive-evidence-copy">
                      <strong className="archive-evidence-id">
                        {resultId}
                      </strong>
                      <small>行为结果</small>
                    </span>
                  </Link>
                </>
              )}
            </div>
          </fieldset>
        </div>

        <div className="archive-actions">
          <button
            type="button"
            onClick={onOpen}
            className="archive-primary-link"
          >
            查看观测
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </button>
          {result ? (
            <Link
              to="/results"
              search={{ task_id: result.task_id }}
              className="archive-result-link"
            >
              查看结果
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : canAnalyze ? (
            <button
              type="button"
              onClick={onAnalyze}
              disabled={creatingTask}
              className="archive-analyze-button"
            >
              {creatingTask ? (
                <LoaderCircle
                  className="size-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Play className="size-3.5" aria-hidden="true" />
              )}
              {creatingTask ? "建立任务中" : "开始分析"}
            </button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="archive-more-button"
                aria-label={`更多操作：${video.original_filename}`}
                title="更多操作"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="archive-more-menu">
              <DropdownMenuItem
                variant="destructive"
                disabled={deleting}
                onSelect={onDelete}
              >
                {deleting ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                删除观测样本
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  )
}

function SceneChoice({
  scene,
  selected,
  onSelect,
}: {
  scene: SceneType
  selected: boolean
  onSelect: () => void
}) {
  const outdoor = scene === "OUTDOOR"
  const meta = getSceneMeta(scene)
  const Icon = outdoor ? Sun : Moon

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`archive-scene-choice ${selected ? "is-selected" : ""}`}
      data-tone={meta.tone}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>
        <strong>{meta.label}</strong>
        <small>
          {outdoor
            ? "自然光 · 个体检测 · 进出巢统计"
            : "红外环境 · 姿态方向 · 群体活动"}
        </small>
      </span>
      {selected && (
        <Check className="archive-scene-check size-4" aria-hidden="true" />
      )}
    </button>
  )
}

function ArchiveEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="archive-empty-state">
      <div className="archive-empty-mark" aria-hidden="true">
        <Hexagon className="size-9" />
        <span />
      </div>
      <h3>暂无蜂群观测档案</h3>
      <p>上传第一段观测视频，建立蜂群行为分析记录。</p>
      <button
        type="button"
        onClick={onUpload}
        className="archive-upload-button"
      >
        <Upload className="size-4" aria-hidden="true" />
        上传观测视频
      </button>
    </div>
  )
}

function useArchiveReveal(isLoading: boolean, _recordCount: number) {
  useEffect(() => {
    if (isLoading) return

    const page = document.querySelector<HTMLElement>(".archive-page")
    if (!page) return
    page.dataset.archiveRecordCount = String(_recordCount)

    const targets = Array.from(
      page.querySelectorAll<HTMLElement>("[data-observation-reveal]"),
    )
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    page.classList.add("observation-motion-ready")

    if (reduceMotion || !("IntersectionObserver" in window)) {
      for (const target of targets) target.classList.add("is-revealed")
      return
    }

    const reveal = (target: HTMLElement) => target.classList.add("is-revealed")
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          reveal(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    )

    const frame = window.requestAnimationFrame(() => {
      for (const target of targets) {
        if (target.classList.contains("is-revealed")) continue
        observer.observe(target)
      }
    })

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [isLoading, _recordCount])
}

function getArchiveStatus(
  video: VideoItem,
  task: AnalysisTaskItem | null,
): {
  key: ArchiveStatus
  label: string
  tone: "idle" | "active" | "ready" | "alert"
} {
  const key =
    task?.status ?? (video.status === "UPLOADED" ? "PENDING" : video.status)
  const labels: Record<ArchiveStatus, string> = {
    PENDING: "待分析",
    PROCESSING: "分析中",
    COMPLETED: "已完成",
    FAILED: "失败",
  }
  const tones: Record<ArchiveStatus, "idle" | "active" | "ready" | "alert"> = {
    PENDING: "idle",
    PROCESSING: "active",
    COMPLETED: "ready",
    FAILED: "alert",
  }
  const normalizedKey: ArchiveStatus =
    key in labels ? (key as ArchiveStatus) : "PENDING"
  return {
    key: normalizedKey,
    label: labels[normalizedKey],
    tone: tones[normalizedKey],
  }
}

function getSceneMeta(sceneType: SceneType) {
  if (sceneType === "OUTDOOR") {
    return { label: "户外可见光", tone: "outdoor" }
  }
  return { label: "室内红外", tone: "indoor" }
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

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`
}
