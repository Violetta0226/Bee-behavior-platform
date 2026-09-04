export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6">
      <p className="text-center text-muted-foreground text-sm">
        巢影蜂析 · 蜂群行为观测与分析 · {currentYear}
      </p>
    </footer>
  )
}
