import type { HTMLAttributes } from "react"

type ResearchContentFrameProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "main"
  size?: "compact" | "standard" | "workspace"
  density?: "balanced" | "archive" | "process" | "result" | "media"
}

export function ResearchContentFrame({
  as: Component = "div",
  children,
  className,
  density,
  size = "standard",
  ...props
}: ResearchContentFrameProps) {
  return (
    <Component
      className={[
        "research-content-frame",
        `research-frame--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-research-content-frame=""
      data-research-density={density}
      data-research-frame-size={size}
      {...props}
    >
      {children}
    </Component>
  )
}
