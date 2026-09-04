# UI/UX Pro Max Style Search v2

> Candidate knowledge only. `chaoying-design-system` and `DESIGN.md` take precedence.

## Project filter

- **Retain:** Editorial Grid / Magazine only as a structural reference for archive hierarchy, asymmetric research layouts, captions, section dividers, and whitespace.
- **Reject:** HUD / Sci-Fi FUI, Data-Dense Dashboard, Voice-First Multimodal, Bauhaus, Exaggerated Minimalism, Brutalism, and Anti-Polish / Raw Aesthetic.
- **Dataset gap:** No direct scientific-instrument, laboratory-console, observatory, museum-archive, or industrial-precision style entry was found. Do not treat the nearest lexical match as a verified project direction.

## Primary query

## UI Pro Max Search Results
**Domain:** style | **Query:** scientific instrumentation laboratory interface precision editorial industrial research observatory data visualization museum exhibition technical refined
**Source:** styles.csv | **Found:** 5 results

### Result 1
- **Style ID:** hud-sci-fi-fui
- **Style Category:** HUD / Sci-Fi FUI
- **Aliases:** HUD|FUI|Sci-Fi HUD|HUD/Sci-Fi FUI|Holographic / HUD|Holographic/HUD
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Futuristic, technical, wireframe, neon, data, transparency, iron man, sci-fi, interface
- **Primary Colors:** Neon Cyan #00FFFF, Holographic Blue #0080FF, Alert Red #FF0000
- **Effects & Animation:** Glow effects, scanning animations, ticker text, blinking markers, fine line drawing
- **Best For:** Sci-fi games, space tech, cybersecurity, movie props, immersive dashboards
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:moderate|drivers:animation,blur
- **Accessibility:** risk:high|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** react|canvas
- **Complexity:** High
- **AI Prompt Keywords:** Design a futuristic HUD (Heads Up Display) or FUI. Use: thin lines (1px), neon cyan/blue on black, technical markers, decorative brackets, data visualization, monospaced tech fonts, glowing elements, transparency.
- **CSS/Technical Keywords:** border: 1px solid rgba(0,255,255,0.5), color: #00FFFF, background: transparent or rgba(0,0,0,0.8), font-family: monospace, text-shadow: 0 0 5px cyan
- **Implementation Checklist:** ☐ Fine lines 1px, ☐ Neon glow text/borders, ☐ Monospaced font, ☐ Dark/Transparent BG, ☐ Decorative tech markers, ☐ Holographic feel
- **Design System Variables:** --hud-color: #00FFFF, --bg-color: rgba(0,10,20,0.9), --line-width: 1px, --glow: 0 0 5px, --font: monospace

### Result 2
- **Style ID:** data-dense-dashboard
- **Style Category:** Data-Dense Dashboard
- **Aliases:** Data-Dense
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** BI/Analytics
- **Keywords:** Multiple charts/widgets, data tables, KPI cards, minimal padding, grid layout, space-efficient, maximum data visibility
- **Primary Colors:** Neutral primary (light grey/white #F5F5F5), data colors (blue/green/red), dark text #333333
- **Effects & Animation:** Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter animations, data loading spinners
- **Best For:** Business intelligence dashboards, financial analytics, enterprise reporting, operational dashboards, data warehousing
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** recharts|chartjs|d3
- **Complexity:** Medium
- **AI Prompt Keywords:** Design a data-dense dashboard. Use: multiple chart widgets, KPI cards row, data tables with sorting, minimal padding (8-12px), efficient grid layout, filter sidebar, dense but readable typography, maximum information density.
- **CSS/Technical Keywords:** display: grid, grid-template-columns: repeat(12, 1fr), gap: 8px, padding: 12px, font-size: 12-14px, overflow: auto for tables, compact card design, sticky headers
- **Implementation Checklist:** ☐ Grid layout 12 columns, ☐ KPI cards responsive, ☐ Tables sortable, ☐ Filters functional, ☐ Loading states for data, ☐ Export functionality
- **Design System Variables:** --grid-gap: 8px, --card-padding: 12px, --font-size-small: 12px, --table-row-height: 36px, --sidebar-width: 240px, --header-height: 56px

### Result 3
- **Style ID:** editorial-grid-magazine
- **Style Category:** Editorial Grid / Magazine
- **Aliases:** Editorial Grid
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Magazine layout, asymmetric grid, editorial typography, pull quotes, drop caps, column layout, print-inspired
- **Primary Colors:** High contrast: Black #000000, White #FFFFFF, accent brand color
- **Effects & Animation:** Smooth scroll, reveal on scroll, parallax images, text animations, page-flip transitions
- **Best For:** News sites, blogs, magazines, editorial content, long-form articles, journalism, publishing
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** css-grid|tailwind
- **Complexity:** Low
- **AI Prompt Keywords:** Design an editorial magazine layout. Use: asymmetric grid, pull quotes, drop caps, multi-column text, large imagery, bylines, section dividers, print-inspired typography, article hierarchy, white space balance.
- **CSS/Technical Keywords:** display: grid with named areas, column-count for text, ::first-letter for drop caps, blockquote styling, figure/figcaption, gap variations, font: serif for body, variable widths
- **Implementation Checklist:** ☐ Grid asymmetric, ☐ Typography editorial, ☐ Pull quotes styled, ☐ Drop caps present, ☐ Images large/impactful, ☐ Mobile reflows well
- **Design System Variables:** --grid-cols: asymmetric, --body-font: Georgia/Merriweather, --heading-font: bold sans, --drop-cap-size: 4em, --pull-quote-size: 1.5em, --column-gap: 2rem

### Result 4
- **Style ID:** voice-first-multimodal
- **Style Category:** Voice-First Multimodal
- **Aliases:**
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Voice UI, multimodal, audio feedback, conversational, hands-free, ambient, contextual, speech recognition
- **Primary Colors:** Calm neutrals: Soft White #FAFAFA, Muted Blue #6B8FAF, Gentle Purple #9B8FBB
- **Effects & Animation:** Voice waveform visualization, listening pulse, processing spinner, speak animation, smooth transitions
- **Best For:** Voice assistants, accessibility apps, hands-free tools, smart home, automotive UI, cooking apps
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** web-speech-api|react
- **Complexity:** Medium
- **AI Prompt Keywords:** Design a voice-first multimodal interface. Use: voice waveform visualization, listening state indicator, speaking animation, minimal visible UI, audio feedback cues, hands-free optimized, conversational flow, ambient design.
- **CSS/Technical Keywords:** Web Speech API integration, canvas for waveform, animation: pulse for listening, status indicators (color change), audio visualization (Web Audio API), minimal chrome, large touch targets
- **Implementation Checklist:** ☐ Voice recognition works, ☐ Visual feedback clear, ☐ Listening state obvious, ☐ Speaking animation smooth, ☐ Fallback UI provided, ☐ Accessibility excellent
- **Design System Variables:** --listening-color: #6B8FAF, --speaking-color: #22C55E, --waveform-height: 60px, --pulse-duration: 1.5s, --indicator-size: 24px, --voice-accent: #9B8FBB

### Result 5
- **Style ID:** bauhaus
- **Style Category:** Bauhaus (包豪斯)
- **Aliases:**
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** Mobile
- **Keywords:** bauhaus, geometric, constructivist, primary colors, hard shadow, bold, tactile, functional, poster, mechanical, architectural
- **Primary Colors:** Primary Red #D02020, Primary Blue #1040C0, Primary Yellow #F0C020
- **Effects & Animation:** Hard offset shadows (4px 4px 0px black), mechanical press active:translate, no smooth hover — instant 0ms transitions, dot grid pattern on sections, slide-over transitions
- **Best For:** Mobile-first apps needing high personality, onboarding flows, branding-forward product screens, artisan/design brands, editorial mobile experiences
- **Light Mode ✓:** supported
- **Dark Mode ✓:** conditional
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** react-native|expo|swiftui|flutter|tailwind
- **Complexity:** Medium
- **AI Prompt Keywords:** Design a Bauhaus (包豪斯) mobile interface using bauhaus, geometric, constructivist, primary colors, hard shadow, bold, tactile, functional. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **CSS/Technical Keywords:** border-radius: 0px (cards/inputs) or 9999px (buttons/FAB), box-shadow: 4px 4px 0px 0px #121212, active:translate-x-[2px] active:translate-y-[2px] active:shadow-none, border: 2px solid #121212, font-family: Outfit, font-weight: 900 uppercase tracking-tighter (headlines)
- **Implementation Checklist:** ☐ Geometric shapes only (circle/square), ☐ Primary color blocking applied, ☐ Hard offset shadows 4px, ☐ border-2 border-black on all elements, ☐ Mechanical press active state, ☐ Outfit Black 900 uppercase headlines, ☐ Safe area (pt-safe pb-safe) respected, ☐ Thumb-friendly h-12/h-14 touch targets, ☐ No hover states (mobile-only), ☐ Vertical rhythm single-column stack
- **Design System Variables:** --color-red: #D02020, --color-blue: #1040C0, --color-yellow: #F0C020, --color-bg: #F0F0F0, --color-fg: #121212, --border-width: 2px, --shadow-hard: 4px 4px 0px 0px #121212, --radius-block: 0px, --radius-pill: 9999px, --font-display: Outfit, --font-weight-hero: 900

## Focused verification

## UI Pro Max Search Results
**Domain:** style | **Query:** editorial museum archive precision
**Source:** styles.csv | **Found:** 5 results

### Result 1
- **Style ID:** editorial-grid-magazine
- **Style Category:** Editorial Grid / Magazine
- **Aliases:** Editorial Grid
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Magazine layout, asymmetric grid, editorial typography, pull quotes, drop caps, column layout, print-inspired
- **Primary Colors:** High contrast: Black #000000, White #FFFFFF, accent brand color
- **Effects & Animation:** Smooth scroll, reveal on scroll, parallax images, text animations, page-flip transitions
- **Best For:** News sites, blogs, magazines, editorial content, long-form articles, journalism, publishing
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** css-grid|tailwind
- **Complexity:** Low
- **AI Prompt Keywords:** Design an editorial magazine layout. Use: asymmetric grid, pull quotes, drop caps, multi-column text, large imagery, bylines, section dividers, print-inspired typography, article hierarchy, white space balance.
- **CSS/Technical Keywords:** display: grid with named areas, column-count for text, ::first-letter for drop caps, blockquote styling, figure/figcaption, gap variations, font: serif for body, variable widths
- **Implementation Checklist:** ☐ Grid asymmetric, ☐ Typography editorial, ☐ Pull quotes styled, ☐ Drop caps present, ☐ Images large/impactful, ☐ Mobile reflows well
- **Design System Variables:** --grid-cols: asymmetric, --body-font: Georgia/Merriweather, --heading-font: bold sans, --drop-cap-size: 4em, --pull-quote-size: 1.5em, --column-gap: 2rem

### Result 2
- **Style ID:** exaggerated-minimalism
- **Style Category:** Exaggerated Minimalism
- **Aliases:**
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Bold minimalism, oversized typography, high contrast, negative space, loud minimal, statement design
- **Primary Colors:** #000000 (Black), #FFFFFF (White), single vibrant accent only
- **Effects & Animation:** font-size: clamp(3rem 10vw 12rem), font-weight: 900, letter-spacing: -0.05em, massive whitespace
- **Best For:** Fashion, architecture, portfolios, agency landing pages, luxury brands, editorial
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** tailwind|custom
- **Complexity:** Low
- **AI Prompt Keywords:** Design with exaggerated minimalism. Use: oversized typography (clamp 3rem-12rem), extreme negative space, black/white primary, single accent color only, bold statements, minimal elements, dramatic contrast.
- **CSS/Technical Keywords:** font-size: clamp(3rem, 10vw, 12rem), font-weight: 900, letter-spacing: -0.05em, color: #000 or #FFF, padding: 8rem+, single accent, no decorations
- **Implementation Checklist:** ☐ Typography oversized, ☐ White space extreme, ☐ Black/white dominant, ☐ Single accent only, ☐ Elements minimal, ☐ Statement clear
- **Design System Variables:** --type-giant: clamp(3rem, 10vw, 12rem), --type-weight: 900, --spacing-huge: 8rem, --color-primary: #000000, --color-bg: #FFFFFF, --accent: single color only

### Result 3
- **Style ID:** bauhaus
- **Style Category:** Bauhaus (包豪斯)
- **Aliases:**
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** Mobile
- **Keywords:** bauhaus, geometric, constructivist, primary colors, hard shadow, bold, tactile, functional, poster, mechanical, architectural
- **Primary Colors:** Primary Red #D02020, Primary Blue #1040C0, Primary Yellow #F0C020
- **Effects & Animation:** Hard offset shadows (4px 4px 0px black), mechanical press active:translate, no smooth hover — instant 0ms transitions, dot grid pattern on sections, slide-over transitions
- **Best For:** Mobile-first apps needing high personality, onboarding flows, branding-forward product screens, artisan/design brands, editorial mobile experiences
- **Light Mode ✓:** supported
- **Dark Mode ✓:** conditional
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** react-native|expo|swiftui|flutter|tailwind
- **Complexity:** Medium
- **AI Prompt Keywords:** Design a Bauhaus (包豪斯) mobile interface using bauhaus, geometric, constructivist, primary colors, hard shadow, bold, tactile, functional. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **CSS/Technical Keywords:** border-radius: 0px (cards/inputs) or 9999px (buttons/FAB), box-shadow: 4px 4px 0px 0px #121212, active:translate-x-[2px] active:translate-y-[2px] active:shadow-none, border: 2px solid #121212, font-family: Outfit, font-weight: 900 uppercase tracking-tighter (headlines)
- **Implementation Checklist:** ☐ Geometric shapes only (circle/square), ☐ Primary color blocking applied, ☐ Hard offset shadows 4px, ☐ border-2 border-black on all elements, ☐ Mechanical press active state, ☐ Outfit Black 900 uppercase headlines, ☐ Safe area (pt-safe pb-safe) respected, ☐ Thumb-friendly h-12/h-14 touch targets, ☐ No hover states (mobile-only), ☐ Vertical rhythm single-column stack
- **Design System Variables:** --color-red: #D02020, --color-blue: #1040C0, --color-yellow: #F0C020, --color-bg: #F0F0F0, --color-fg: #121212, --border-width: 2px, --shadow-hard: 4px 4px 0px 0px #121212, --radius-block: 0px, --radius-pill: 9999px, --font-display: Outfit, --font-weight-hero: 900

### Result 4
- **Style ID:** brutalism
- **Style Category:** Brutalism
- **Aliases:**
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Raw, unpolished, stark, high contrast, plain text, default fonts, visible borders, asymmetric, anti-design
- **Primary Colors:** Primary: Red #FF0000, Blue #0000FF, Yellow #FFFF00, Black #000000, White #FFFFFF
- **Effects & Animation:** No smooth transitions (instant), sharp corners (0px), bold typography (700+), visible grid, large blocks
- **Best For:** Design portfolios, artistic projects, counter-culture brands, editorial/media sites, tech blogs
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** tailwind|bootstrap
- **Complexity:** Low
- **AI Prompt Keywords:** Create a brutalist design with raw, unpolished, stark aesthetic. Use pure primary colors (red, blue, yellow), black & white, no smooth transitions (instant), sharp corners, bold large typography, visible grid lines, default system fonts, intentional 'broken' design elements.
- **CSS/Technical Keywords:** border-radius: 0px, transition: none or 0s, font-family: system-ui or monospace, font-weight: 700+, border: visible 2-4px, colors: #FF0000, #0000FF, #FFFF00, #000000, #FFFFFF
- **Implementation Checklist:** ☐ No border-radius (0px), ☐ No transitions (instant), ☐ Bold typography (700+), ☐ Pure primary colors used, ☐ Visible grid/borders, ☐ Asymmetric layout intentional
- **Design System Variables:** --border-radius: 0px, --transition-duration: 0s, --font-weight: 700-900, --colors: primary only, --border-style: visible, --grid-visible: true

### Result 5
- **Style ID:** anti-polish-raw-aesthetic
- **Style Category:** Anti-Polish / Raw Aesthetic
- **Aliases:** Anti-Polish Raw
- **Status:** active
- **Parent Style ID:**
- **Preferred Mode:** auto
- **Type:** General
- **Keywords:** Hand-drawn, collage, scanned textures, unfinished, imperfect, authentic, human, sketch, raw marks, creative process
- **Primary Colors:** Paper White #FAFAF8, Pencil Grey #4A4A4A, Marker Black #1A1A1A, Kraft Brown #C4A77D
- **Effects & Animation:** No smooth transitions, hand-drawn animations, paper texture overlays, jitter effects, sketch reveal
- **Best For:** Creative portfolios, artist sites, indie brands, handmade products, authentic storytelling, editorial
- **Light Mode ✓:** supported
- **Dark Mode ✓:** supported
- **Performance:** cost:low|drivers:none
- **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Framework Compatibility:** css|svg
- **Complexity:** Low
- **AI Prompt Keywords:** Design with anti-polish raw aesthetic. Use: hand-drawn elements, scanned textures, unfinished look, paper/pencil textures, collage style, authentic imperfection, sketch marks, tape/sticker overlays, human touch.
- **CSS/Technical Keywords:** background: url(paper-texture.png), filter: grayscale() contrast(), border: hand-drawn SVG, transform: rotate(small random), no smooth transitions, sketch-style fonts, opacity variations
- **Implementation Checklist:** ☐ Textures loaded, ☐ Hand-drawn elements present, ☐ Imperfections intentional, ☐ Authentic feel achieved, ☐ Performance ok with textures, ☐ Accessibility maintained
- **Design System Variables:** --paper-bg: #FAFAF8, --pencil-color: #4A4A4A, --marker-black: #1A1A1A, --kraft-brown: #C4A77D, --sketch-rotation: random(-3deg, 3deg), --texture-opacity: 0.3
