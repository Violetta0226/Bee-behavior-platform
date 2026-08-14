import { createFileRoute } from "@tanstack/react-router"
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bug,
  FileVideo,
  Gauge,
  LoaderCircle,
  RefreshCw,
  RouteIcon,
  TriangleAlert,
  Users,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const Route = createFileRoute("/_layout/results")({
  component: ResultsPage,
  head: () => ({
    meta: [
      {
        title: "分析结果 - 巢影蜂析",
      },
    ],
  }),
})

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

function ResultsPage() {
    const requestedTaskId =
  new URLSearchParams(
    window.location.search,
  ).get("task_id")
    const requestedTaskId =
  new URLSearchParams(window.location.search).get(
    "task_id",
  )
  const [results, setResults] =
    useState<AnalysisResultItem[]>([])

  const [videos, setVideos] =
    useState<VideoItem[]>([])

  const [tasks, setTasks] =
    useState<AnalysisTaskItem[]>([])

  const [selectedResultId, setSelectedResultId] =
    useState<string | null>(null)

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
          resultsResponse,
          videosResponse,
          tasksResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE}/results/?skip=0&limit=100`,
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

          fetch(
            `${API_BASE}/tasks/?skip=0&limit=100`,
            {
              headers,
            },
          ),
        ])

        if (!resultsResponse.ok) {
          throw new Error(
            `读取分析结果失败：${resultsResponse.status}`,
          )
        }

        if (!videosResponse.ok) {
          throw new Error(
            `读取视频信息失败：${videosResponse.status}`,
          )
        }

        if (!tasksResponse.ok) {
          throw new Error(
            `读取任务信息失败：${tasksResponse.status}`,
          )
        }

        const resultsData =
          (await resultsResponse.json()) as AnalysisResultsResponse

        const videosData =
          (await videosResponse.json()) as VideosResponse

        const tasksData =
          (await tasksResponse.json()) as AnalysisTasksResponse

        setResults(resultsData.data)
        setVideos(videosData.data)
        setTasks(tasksData.data)

        setSelectedResultId((currentId) => {
  if (requestedTaskId) {
    const requestedResult =
      resultsData.data.find(
        (result) =>
          result.task_id ===
          requestedTaskId,
      )

    if (requestedResult) {
      return requestedResult.id
    }
  }

  return (
    currentId ??
    resultsData.data[0]?.id ??
    null
  )
})
      } catch (error) {
        console.error(error)

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "读取分析结果失败",
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [[requestedTaskId]],
  )

  useEffect(() => {
    void loadData()
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

  const taskMap = useMemo(
    () =>
      new Map(
        tasks.map((task) => [
          task.id,
          task,
        ]),
      ),
    [tasks],
  )

  const selectedResult = useMemo(() => {
    if (!results.length) {
      return null
    }

    return (
      results.find(
        (result) =>
          result.id === selectedResultId,
      ) ?? results[0]
    )
  }, [results, selectedResultId])

  const selectedVideo =
    selectedResult
      ? videoMap.get(
          selectedResult.video_id,
        )
      : undefined

  const selectedTask =
    selectedResult
      ? taskMap.get(
          selectedResult.task_id,
        )
      : undefined

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-muted-foreground">
          <LoaderCircle className="mx-auto mb-3 size-8 animate-spin" />

          <p>正在读取分析结果...</p>
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
            巢影蜂析 · 蜂群智能量化中心
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            分析结果
          </h1>

          <p className="mt-2 max-w-3xl text-muted-foreground">
            汇总蜜蜂个体检测、连续跟踪、
            进出巢行为、运动速度及蜂群活动状态，
            为蜂群行为研究与异常监测提供量化依据。
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

          刷新结果
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

      {/* 无结果 */}
      {!selectedResult ? (
        <div className="flex min-h-80 items-center justify-center rounded-xl border">
          <div className="text-center text-muted-foreground">
            <Activity className="mx-auto mb-4 size-10" />

            <p className="font-medium">
              暂无分析结果
            </p>

            <p className="mt-2 text-sm">
              请先在视频管理页面创建分析任务
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 当前结果信息 */}
          <div className="rounded-xl border p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10">
                  <FileVideo className="size-6 text-amber-600" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    当前分析视频
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {selectedVideo?.original_filename ??
                      "未知视频"}
                  </h2>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      模型：
                      {selectedTask?.model_name ??
                        "baseline-v1"}
                    </span>

                    <span>
                      场景：
                      {formatSceneType(
                        selectedVideo?.scene_type,
                      )}
                    </span>

                    <span>
                      分析时间：
                      {formatDate(
                        selectedResult.created_at,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600">
                分析完成
              </span>
            </div>
          </div>

          {/* 核心指标 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="检测个体"
              value={
                selectedResult.detected_individuals
              }
              unit="只"
              description="视频中识别到的蜜蜂个体"
              icon={<Users className="size-5" />}
            />

            <MetricCard
              title="有效轨迹"
              value={
                selectedResult.valid_tracks
              }
              unit="条"
              description="满足连续跟踪条件的轨迹"
              icon={
                <RouteIcon className="size-5" />
              }
            />

            <MetricCard
              title="进巢数量"
              value={
                selectedResult.entry_count
              }
              unit="次"
              description="识别到的进巢行为"
              icon={
                <ArrowDownToLine className="size-5" />
              }
            />

            <MetricCard
              title="出巢数量"
              value={
                selectedResult.exit_count
              }
              unit="次"
              description="识别到的出巢行为"
              icon={
                <ArrowUpFromLine className="size-5" />
              }
            />

            <MetricCard
              title="平均速度"
              value={
                selectedResult.average_speed ??
                "-"
              }
              unit="px/s"
              description="当前阶段采用像素尺度"
              icon={
                <Gauge className="size-5" />
              }
            />

            <MetricCard
              title="活动指数"
              value={
                selectedResult.activity_index ??
                "-"
              }
              description="蜂群综合活动强度"
              icon={
                <Activity className="size-5" />
              }
            />

            <MetricCard
              title="异常事件"
              value={
                selectedResult.abnormal_event_count
              }
              unit="次"
              description="检测到的潜在异常行为"
              icon={
                <TriangleAlert className="size-5" />
              }
            />

            <MetricCard
              title="轨迹有效率"
              value={calculateTrackRate(
                selectedResult,
              )}
              unit="%"
              description="有效轨迹 / 检测个体"
              icon={<Bug className="size-5" />}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            {/* 行为统计 */}
            <div className="rounded-xl border">
              <div className="border-b p-6">
                <h2 className="text-lg font-semibold">
                  进出巢行为统计
                </h2>

                <p className="text-sm text-muted-foreground">
                  对当前视频中蜜蜂进巢与出巢行为进行对比
                </p>
              </div>

              <div className="space-y-7 p-6">
                <BehaviorBar
                  label="进巢"
                  value={
                    selectedResult.entry_count
                  }
                  total={
                    selectedResult.entry_count +
                    selectedResult.exit_count
                  }
                />

                <BehaviorBar
                  label="出巢"
                  value={
                    selectedResult.exit_count
                  }
                  total={
                    selectedResult.entry_count +
                    selectedResult.exit_count
                  }
                />

                <div className="grid grid-cols-3 gap-4 border-t pt-6">
                  <SmallStatistic
                    label="总行为数"
                    value={
                      selectedResult.entry_count +
                      selectedResult.exit_count
                    }
                  />

                  <SmallStatistic
                    label="净进巢"
                    value={
                      selectedResult.entry_count -
                      selectedResult.exit_count
                    }
                  />

                  <SmallStatistic
                    label="进出比"
                    value={calculateEntryExitRatio(
                      selectedResult,
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 活动状态 */}
            <div className="rounded-xl border">
              <div className="border-b p-6">
                <h2 className="text-lg font-semibold">
                  蜂群活动状态
                </h2>

                <p className="text-sm text-muted-foreground">
                  根据当前分析指标形成综合状态概览
                </p>
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      活动指数
                    </span>

                    <span className="text-lg font-semibold">
                      {selectedResult.activity_index ??
                        "-"}
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            (selectedResult.activity_index ??
                              0) * 100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-sm font-medium">
                    当前状态
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {getActivityLabel(
                      selectedResult.activity_index,
                    )}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    当前为平台联调阶段，
                    活动状态依据模拟分析指标展示。
                    后续将由真实模型和实验阈值确定。
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-sm text-muted-foreground">
                    异常事件
                  </p>

                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-3xl font-semibold">
                      {
                        selectedResult.abnormal_event_count
                      }
                    </span>

                    <span className="pb-1 text-sm text-muted-foreground">
                      次
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 历史分析结果 */}
          <div className="rounded-xl border">
            <div className="border-b p-6">
              <h2 className="text-lg font-semibold">
                历史分析记录
              </h2>

              <p className="text-sm text-muted-foreground">
                共 {results.length} 条分析结果
              </p>
            </div>

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
                      检测个体
                    </th>

                    <th className="px-6 py-4 font-medium">
                      有效轨迹
                    </th>

                    <th className="px-6 py-4 font-medium">
                      进 / 出巢
                    </th>

                    <th className="px-6 py-4 font-medium">
                      活动指数
                    </th>

                    <th className="px-6 py-4 font-medium">
                      分析时间
                    </th>

                    <th className="px-6 py-4 text-right font-medium">
                      操作
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((result) => {
                    const video =
                      videoMap.get(
                        result.video_id,
                      )

                    const task =
                      taskMap.get(
                        result.task_id,
                      )

                    const isSelected =
                      result.id ===
                      selectedResult.id

                    return (
                      <tr
                        key={result.id}
                        className={`border-b last:border-0 ${
                          isSelected
                            ? "bg-amber-500/5"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileVideo className="size-4 shrink-0 text-muted-foreground" />

                            <span className="max-w-52 truncate font-medium">
                              {video?.original_filename ??
                                "未知视频"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono text-xs">
                          {task?.model_name ??
                            "baseline-v1"}
                        </td>

                        <td className="px-6 py-4">
                          {
                            result.detected_individuals
                          }
                        </td>

                        <td className="px-6 py-4">
                          {result.valid_tracks}
                        </td>

                        <td className="px-6 py-4">
                          {result.entry_count}
                          {" / "}
                          {result.exit_count}
                        </td>

                        <td className="px-6 py-4">
                          {result.activity_index ??
                            "-"}
                        </td>

                        <td className="px-6 py-4 text-muted-foreground">
                          {formatDate(
                            result.created_at,
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResultId(
                                result.id,
                              )

                              window.scrollTo({
                                top: 0,
                                behavior: "smooth",
                              })
                            }}
                            className="rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-muted"
                          >
                            {isSelected
                              ? "当前结果"
                              : "查看结果"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({
  title,
  value,
  unit,
  description,
  icon,
}: {
  title: string
  value: number | string
  unit?: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-xl border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <div className="mt-2 flex items-end gap-1.5">
            <span className="text-3xl font-semibold">
              {value}
            </span>

            {unit && (
              <span className="pb-1 text-xs text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
        </div>

        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function BehaviorBar({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage =
    total > 0
      ? (value / total) * 100
      : 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">
          {label}
        </span>

        <span className="text-sm">
          {value} 次
          <span className="ml-2 text-xs text-muted-foreground">
            {percentage.toFixed(1)}%
          </span>
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  )
}

function SmallStatistic({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {value}
      </p>
    </div>
  )
}

function calculateTrackRate(
  result: AnalysisResultItem,
) {
  if (
    result.detected_individuals <= 0
  ) {
    return "0.0"
  }

  return (
    (result.valid_tracks /
      result.detected_individuals) *
    100
  ).toFixed(1)
}

function calculateEntryExitRatio(
  result: AnalysisResultItem,
) {
  if (result.exit_count <= 0) {
    return "-"
  }

  return (
    result.entry_count /
    result.exit_count
  ).toFixed(2)
}

function getActivityLabel(
  activityIndex: number | null,
) {
  if (activityIndex === null) {
    return "暂无数据"
  }

  if (activityIndex >= 0.75) {
    return "高活跃"
  }

  if (activityIndex >= 0.45) {
    return "正常活跃"
  }

  return "低活跃"
}

function formatSceneType(
  sceneType?: string,
) {
  if (sceneType === "OUTDOOR") {
    return "巢外可见光"
  }

  if (sceneType === "INDOOR") {
    return "巢内红外"
  }

  return "未知场景"
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