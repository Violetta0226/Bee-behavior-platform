import { ArrowLeftRight } from "lucide-react"
import { useId } from "react"

type HiveGateFlowProps = {
  entryCount: number
  exitCount: number
  observedAt: string | null
  hasData: boolean
}

const ENTRY_PATHS = [
  "M 58 84 C 174 45, 268 112, 390 154 C 470 182, 555 118, 696 132",
  "M 46 112 C 168 72, 286 128, 392 162 C 485 192, 575 142, 708 154",
  "M 66 140 C 184 104, 286 146, 394 170 C 482 190, 586 166, 692 178",
  "M 42 168 C 166 136, 278 160, 396 178 C 492 194, 588 190, 712 202",
  "M 72 194 C 190 166, 290 176, 398 186 C 502 196, 598 216, 688 226",
  "M 54 220 C 178 194, 286 194, 400 194 C 504 194, 606 238, 704 250",
  "M 82 246 C 194 222, 302 210, 402 202 C 510 194, 608 260, 680 270",
]

const EXIT_PATHS = [
  "M 700 286 C 592 316, 500 268, 406 220 C 302 166, 190 296, 58 270",
  "M 716 310 C 594 340, 500 288, 404 230 C 298 166, 178 320, 44 294",
  "M 686 330 C 578 354, 484 306, 402 240 C 288 150, 170 342, 72 318",
  "M 708 350 C 580 368, 478 324, 400 250 C 280 140, 158 362, 52 340",
  "M 680 372 C 566 380, 466 340, 398 260 C 272 126, 146 378, 82 360",
  "M 714 392 C 582 392, 458 358, 396 270 C 264 120, 132 394, 48 380",
]

export function HiveGateFlow({
  entryCount,
  exitCount,
  observedAt,
  hasData,
}: HiveGateFlowProps) {
  const markerPrefix = useId().replace(/:/g, "")
  const maxValue = Math.max(entryCount, exitCount, 1)
  const total = entryCount + exitCount
  const netFlow = entryCount - exitCount
  const entryLineCount = entryCount
    ? Math.max(2, Math.ceil((entryCount / maxValue) * ENTRY_PATHS.length))
    : 0
  const exitLineCount = exitCount
    ? Math.max(2, Math.ceil((exitCount / maxValue) * EXIT_PATHS.length))
    : 0

  return (
    <div className="hive-flow-layout">
      <header className="hive-flow-heading">
        <div>
          <p className="observation-kicker">Hive flow</p>
          <h2 className="observation-section-title">巢门流动</h2>
          <p className="hive-flow-intro">
            细线记录蜜蜂穿越巢门的方向，线束密度对应最近样本中的相对通行量。
          </p>
        </div>
        <time className="observation-data tabular-nums observation-muted">
          {formatObservedTime(observedAt)}
        </time>
      </header>

      {!hasData ? (
        <div className="hive-flow-empty">
          <ArrowLeftRight className="size-6" />
          <div>
            <p className="font-medium">尚无巢门流动记录</p>
            <p className="mt-1 text-sm observation-muted">
              完成分析后，将呈现最近样本的进巢与出巢轨迹。
            </p>
          </div>
        </div>
      ) : (
        <div className="hive-flow-content">
          <div className="hive-flow-readings">
            <FlowReading
              label="进巢"
              value={entryCount}
              unit="次"
              tone="entry"
            />
            <FlowReading label="出巢" value={exitCount} unit="次" tone="exit" />
            <div className="hive-flow-note">
              <span>净流量</span>
              <strong>{netFlow > 0 ? `+${netFlow}` : netFlow}</strong>
              <p>
                {netFlow > 0
                  ? "进巢占优"
                  : netFlow < 0
                    ? "出巢占优"
                    : "进出平衡"}
              </p>
            </div>
          </div>

          <div className="hive-flow-figure observation-glass">
            <div className="hive-spatial-labels" aria-hidden="true">
              <span>巢外 · 植被与采集区</span>
              <span>巢内 · 蜂巢与暗室</span>
            </div>
            <div className="hive-flow-plot">
              <svg
                viewBox="0 0 760 430"
                className="block w-full"
                role="img"
                aria-label={`最近一次巢门观测：进巢 ${entryCount} 次，出巢 ${exitCount} 次`}
              >
                <title>
                  巢门流动，多条细线表示蜜蜂穿越巢门的方向与相对流量
                </title>
                <defs>
                  <marker
                    id={`${markerPrefix}-entry`}
                    markerWidth="5"
                    markerHeight="5"
                    refX="4.5"
                    refY="2.5"
                    orient="auto"
                  >
                    <path d="M 0 0 L 5 2.5 L 0 5 z" fill="var(--obs-honey)" />
                  </marker>
                  <marker
                    id={`${markerPrefix}-exit`}
                    markerWidth="5"
                    markerHeight="5"
                    refX="4.5"
                    refY="2.5"
                    orient="auto"
                  >
                    <path d="M 0 0 L 5 2.5 L 0 5 z" fill="var(--obs-blue)" />
                  </marker>
                </defs>

                <rect
                  x="0"
                  y="42"
                  width="371"
                  height="350"
                  fill="var(--obs-outdoor-soft)"
                />
                <rect
                  x="389"
                  y="42"
                  width="371"
                  height="350"
                  fill="var(--obs-indoor-soft)"
                />
                <rect
                  x="371"
                  y="165"
                  width="18"
                  height="102"
                  fill="var(--obs-honey)"
                  stroke="var(--obs-titanium)"
                  strokeWidth="2"
                  opacity="0.92"
                />
                <path
                  d="M 371 42 L 371 165 L 389 165 L 389 42 M 371 392 L 371 267 L 389 267 L 389 392"
                  fill="none"
                  stroke="var(--obs-clay)"
                  strokeWidth="10"
                  strokeLinecap="square"
                  opacity="0.8"
                />
                <line
                  x1="380"
                  x2="380"
                  y1="165"
                  y2="267"
                  stroke="var(--obs-clay)"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />
                <text
                  x="380"
                  y="27"
                  textAnchor="middle"
                  fontSize="13"
                  fill="currentColor"
                  opacity="0.7"
                >
                  巢门边界
                </text>
                <text
                  x="380"
                  y="224"
                  textAnchor="middle"
                  fontSize="12"
                  fill="var(--obs-ink)"
                  transform="rotate(-90 380 224)"
                >
                  中央巢门
                </text>

                {ENTRY_PATHS.slice(0, entryLineCount).map((path, index) => (
                  <path
                    key={path}
                    className="hive-flow-path"
                    d={path}
                    fill="none"
                    stroke={
                      index % 4 === 3 ? "var(--obs-pollen)" : "var(--obs-honey)"
                    }
                    strokeWidth={index === 0 ? "2.2" : "1.25"}
                    strokeLinecap="round"
                    opacity={0.92 - index * 0.075}
                    markerEnd={`url(#${markerPrefix}-entry)`}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {EXIT_PATHS.slice(0, exitLineCount).map((path, index) => (
                  <path
                    key={path}
                    className="hive-flow-path"
                    d={path}
                    fill="none"
                    stroke="var(--obs-blue)"
                    strokeWidth={index === 0 ? "2.2" : "1.25"}
                    strokeLinecap="round"
                    opacity={0.9 - index * 0.075}
                    markerEnd={`url(#${markerPrefix}-exit)`}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                <text x="56" y="70" fontSize="13" fill="var(--obs-honey)">
                  进巢流
                </text>
                <text
                  x="704"
                  y="378"
                  textAnchor="end"
                  fontSize="13"
                  fill="var(--obs-blue)"
                >
                  出巢流
                </text>
              </svg>
            </div>
            <div className="hive-flow-legend">
              <span>
                <i data-tone="entry" />
                进巢 · 能源橙
              </span>
              <span>
                <i data-tone="exit" />
                出巢 · 灰蓝
              </span>
              <span>共记录 {total} 次巢门通行</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FlowReading({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: number
  unit: string
  tone: "entry" | "exit"
}) {
  return (
    <div className="hive-flow-reading" data-tone={tone}>
      <p>{label}</p>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  )
}

function formatObservedTime(value: string | null) {
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
