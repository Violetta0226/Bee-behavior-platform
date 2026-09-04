import { Link } from "@tanstack/react-router"

import { BrandBeeMark } from "@/components/Dashboard/BrandBeeMark"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        <span
          className={cn(
            "inline-flex items-center gap-2 group-data-[collapsible=icon]:hidden",
            className,
          )}
        >
          <BrandBeeMark />
          <span>巢影蜂析</span>
        </span>
        <span
          role="img"
          aria-label="巢影蜂析"
          className={cn(
            "hidden size-6 group-data-[collapsible=icon]:block",
            className,
          )}
        >
          <BrandBeeMark />
        </span>
      </>
    ) : (
      <span
        role="img"
        aria-label="巢影蜂析"
        className={cn(
          variant === "full"
            ? "inline-flex items-center gap-2"
            : "inline-flex size-6",
          className,
        )}
      >
        <BrandBeeMark />
        {variant === "full" && <span>巢影蜂析</span>}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
