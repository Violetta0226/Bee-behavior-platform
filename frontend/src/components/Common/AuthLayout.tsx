import { Monitor, Moon, Sun } from "lucide-react"

import { type Theme, useTheme } from "@/components/theme-provider"
import "@/styles/auth-theme.css"

interface AuthLayoutProps {
  children: React.ReactNode
}

const themeOptions: Array<{
  label: string
  value: Theme
  icon: typeof Sun
}> = [
  { label: "浅色模式", value: "light", icon: Sun },
  { label: "深色模式", value: "dark", icon: Moon },
  { label: "跟随系统", value: "system", icon: Monitor },
]

function BeeMark() {
  return (
    <svg
      className="auth-bee-mark"
      viewBox="0 0 96 104"
      role="img"
      aria-label="巢影蜂析几何蜂形标志"
    >
      <path className="auth-bee-mark__antenna" d="M43 19 34 8M53 19l9-11" />
      <path className="auth-bee-mark__wing" d="m37 35-17-16-9 7 6 25 20-8Z" />
      <path className="auth-bee-mark__wing" d="m59 35 17-16 9 7-6 25-20-8Z" />
      <path className="auth-bee-mark__head" d="m48 17 10 6v12l-10 6-10-6V23Z" />
      <path
        className="auth-bee-mark__body"
        d="m48 40 14 8v18L48 75l-14-9V48Z"
      />
      <path className="auth-bee-mark__abdomen" d="m48 75 12 7-12 17-12-17Z" />
      <path className="auth-bee-mark__line" d="M35 53h26M35 62h26M40 85h16" />
    </svg>
  )
}

function AuthThemeControl() {
  const { setTheme, theme } = useTheme()

  return (
    <fieldset className="auth-theme-control">
      <legend className="auth-theme-caption">主题</legend>
      <div className="auth-theme-options">
        {themeOptions.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            className="auth-theme-option"
            aria-label={label}
            aria-pressed={theme === value}
            title={label}
            onClick={() => setTheme(value)}
          >
            <Icon aria-hidden="true" />
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-biofield" aria-hidden="true">
        <svg viewBox="0 0 960 900" preserveAspectRatio="xMidYMid slice">
          <title>蜂群观测轨迹背景</title>
          <path
            className="auth-biofield__track"
            d="M-60 662C148 492 234 764 440 552S708 274 1020 408"
          />
          <path
            className="auth-biofield__track auth-biofield__track--amber"
            d="M-80 286C182 458 306 128 526 326S788 544 1030 240"
          />
          <path
            className="auth-biofield__track"
            d="M154 940C238 688 426 724 514 470S742 86 918-54"
          />
          <path
            className="auth-biofield__hex"
            d="m95 118 70-40 70 40v80l-70 40-70-40v-50"
          />
          <path
            className="auth-biofield__hex"
            d="m688 94 45-26 45 26v52l-45 26-45-26v-29"
          />
          <path
            className="auth-biofield__hex"
            d="m715 646 86-50 86 50v99l-86 50-86-50v-58"
          />
          <circle className="auth-biofield__pollen" cx="174" cy="346" r="3" />
          <circle className="auth-biofield__pollen" cx="322" cy="236" r="2" />
          <circle className="auth-biofield__pollen" cx="526" cy="614" r="2.5" />
          <circle className="auth-biofield__pollen" cx="806" cy="332" r="3" />
        </svg>
      </div>

      <section className="auth-brand" aria-label="巢影蜂析观测入口">
        <div className="auth-brand-lockup">
          <div className="auth-mark-frame" data-auth-mark>
            <BeeMark />
          </div>
          <div className="auth-wordmark" data-auth-wordmark>
            <span>观测入口</span>
            <p>巢影蜂析</p>
            <small>智慧蜂群行为分析平台</small>
          </div>
        </div>

        <div className="auth-brand-index" aria-hidden="true">
          <span>蜂群观测</span>
          <i />
          <span>行为分析</span>
          <i />
          <span>证据回溯</span>
        </div>
      </section>

      <main className="auth-entry">
        <AuthThemeControl />
        <div className="auth-form-surface" data-auth-form>
          {children}
        </div>
      </main>
    </div>
  )
}
