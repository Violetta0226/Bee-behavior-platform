import { useEffect } from "react"

export function useResearchReveal(
  scopeSelector: string,
  refreshKey: unknown,
  revealAllOnMount = false,
) {
  useEffect(() => {
    void refreshKey
    const scope = document.querySelector<HTMLElement>(scopeSelector)
    if (!scope) return

    const targets = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-research-reveal]"),
    )
    if (targets.length === 0) return

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    if (reducedMotion) {
      scope.classList.add("research-motion-reduced")
      for (const target of targets) target.classList.add("is-revealed")
      return
    }

    scope.classList.add("research-motion-ready")
    const reveal = (target: HTMLElement) => {
      if (target.classList.contains("is-revealed")) return
      target.classList.add("is-revealed")
    }

    if (!("IntersectionObserver" in window)) {
      for (const target of targets) reveal(target)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          reveal(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.12 },
    )

    const frame = window.requestAnimationFrame(() => {
      for (const target of targets) {
        if (target.classList.contains("is-revealed")) continue
        if (revealAllOnMount) reveal(target)
        else observer.observe(target)
      }
    })

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [scopeSelector, refreshKey, revealAllOnMount])
}
