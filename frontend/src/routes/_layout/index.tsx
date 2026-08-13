import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "巢影蜂析——智慧蜂群行为分析平台",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <div className="space-y-8">
      {/* 顶部欢迎区域 */}
      <div>
        <p className="text-sm text-muted-foreground">
          欢迎回来，{currentUser?.full_name || currentUser?.email}
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          巢影蜂析——智慧蜂群行为分析平台
        </h1>

        <p className="mt-2 text-muted-foreground">
          面向巢内外蜜蜂个体识别、连续跟踪、姿态分析与群体行为智能量化
        </p>
      </div>

      {/* 核心指标 */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* 视频总数 */}
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">视频总数</p>

          <p className="mt-2 text-3xl font-semibold">0</p>

          <p className="mt-2 text-xs text-muted-foreground">
            巢内 / 巢外监测视频
          </p>
        </div>

        {/* 分析任务 */}
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">分析任务</p>

          <p className="mt-2 text-3xl font-semibold">0</p>

          <p className="mt-2 text-xs text-muted-foreground">
            当前暂无分析任务
          </p>
        </div>

        {/* 识别个体 */}
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">识别个体</p>

          <p className="mt-2 text-3xl font-semibold">0</p>

          <p className="mt-2 text-xs text-muted-foreground">
            蜜蜂检测与轨迹统计
          </p>
        </div>

        {/* 异常事件 */}
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">异常事件</p>

          <p className="mt-2 text-3xl font-semibold">0</p>

          <p className="mt-2 text-xs text-muted-foreground">
            当前蜂群状态正常
          </p>
        </div>
      </div>

      {/* 巢内外监测区域 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 巢外行为监测 */}
        <div className="rounded-xl border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">巢外行为监测</h2>

            <p className="text-sm text-muted-foreground">
              可见光视频 · 个体检测 · 多目标跟踪 · 进出巢统计
            </p>
          </div>

          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">暂无巢外视频</p>

              <p className="mt-1 text-sm">
                后续将在此展示蜜蜂检测与运动轨迹
              </p>
            </div>
          </div>
        </div>

        {/* 巢内行为监测 */}
        <div className="rounded-xl border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">巢内行为监测</h2>

            <p className="text-sm text-muted-foreground">
              红外视频 · 个体跟踪 · 头腹识别 · 姿态方向分析
            </p>
          </div>

          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">暂无巢内视频</p>

              <p className="mt-1 text-sm">
                后续将在此展示姿态与方向识别结果
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 蜂群活动趋势 */}
      <div className="rounded-xl border p-6">
        <div>
          <h2 className="text-lg font-semibold">蜂群活动趋势</h2>

          <p className="text-sm text-muted-foreground">
            展示活动强度、进出巢频次及群体行为变化趋势
          </p>
        </div>

        <div className="mt-6 flex h-56 items-center justify-center rounded-lg bg-muted/30">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">行为量化图表区域</p>

            <p className="mt-1 text-sm">
              后续接入模型后展示蜂群活动趋势
            </p>
          </div>
        </div>
      </div>

      {/* 系统说明 */}
      <div className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">系统能力</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="font-medium">个体识别</p>
            <p className="mt-1 text-sm text-muted-foreground">
              基于视觉模型实现蜜蜂目标检测与个体识别
            </p>
          </div>

          <div>
            <p className="font-medium">连续跟踪</p>
            <p className="mt-1 text-sm text-muted-foreground">
              面向高密度蜂群场景实现蜜蜂轨迹持续跟踪
            </p>
          </div>

          <div>
            <p className="font-medium">姿态分析</p>
            <p className="mt-1 text-sm text-muted-foreground">
              提取蜜蜂头腹结构、朝向及运动方向信息
            </p>
          </div>

          <div>
            <p className="font-medium">行为量化</p>
            <p className="mt-1 text-sm text-muted-foreground">
              构建个体及群体行为指标并开展异常分析
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}