import type { ReactNode } from "react"

export function ResearchPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="research-canvas" data-research-page-shell="">
      <div className="research-biofield" aria-hidden="true">
        <svg viewBox="0 0 1200 620" preserveAspectRatio="none">
          <title>蜂群观测背景场</title>
          <path
            className="research-biofield-grid"
            d="M-40 144H1240M-40 314H1240M-40 486H1240M188 0V620M594 0V620M1016 0V620"
          />
          <path
            className="research-biofield-track"
            d="M-40 470 C 160 286, 286 554, 496 336 S 860 186, 1240 290"
          />
          <path
            className="research-biofield-track is-amber"
            d="M-40 210 C 194 388, 336 120, 610 274 S 948 372, 1240 142"
          />
          <path
            className="research-biofield-track"
            d="M140 620 C 284 432, 382 454, 516 228 S 874 80, 1126 -30"
          />
          <polygon
            className="research-biofield-hex"
            points="104,72 142,50 180,72 180,116 142,138 104,116"
          />
          <polygon
            className="research-biofield-hex"
            points="1040,444 1080,421 1120,444 1120,490 1080,513 1040,490"
          />
          <polygon
            className="research-biofield-hex"
            points="914,88 944,71 974,88 974,122 944,139 914,122"
          />
          <circle
            className="research-biofield-pollen"
            cx="220"
            cy="176"
            r="2"
          />
          <circle
            className="research-biofield-pollen"
            cx="356"
            cy="392"
            r="1.8"
          />
          <circle
            className="research-biofield-pollen"
            cx="808"
            cy="188"
            r="2.2"
          />
          <circle
            className="research-biofield-pollen"
            cx="1086"
            cy="244"
            r="1.7"
          />
        </svg>
      </div>
      <div className="research-canvas-content" data-research-route-host="">
        {children}
      </div>
    </div>
  )
}
