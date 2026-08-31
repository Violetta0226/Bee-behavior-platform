<!-- UI/UX Pro Max raw retrieval output. Candidate knowledge only; DESIGN.md and chaoying-design-system take precedence. -->

## Design System: 巢影蜂析

### Pattern
- **Name:** Trust & Authority + Conversion
- **Conversion Focus:** Security badges. Case studies. Transparent pricing. Low-friction form. Provide pause/stop and stop the logo carousel on focus, hover, and reduced motion. Previous/next controls provide the keyboard equivalent; pause offscreen/hidden and render a static logo set under reduced motion.
- **CTA Placement:** Contact Sales / Get Quote (primary) + Nav
- **Color Strategy:** Navy/Grey corporate. Trust blue. Accent for CTA only.
- **Sections:** Hero (mission/credibility) > Proof (logos, certs, stats) > Solution overview > Clear CTA path

### Style
- **Name:** Organic Biophilic
- **Mode Support:** Light supported | Dark supported
- **Keywords:** Nature, organic shapes, green, sustainable, rounded, flowing, wellness, earthy, natural textures
- **Best For:** Wellness apps, sustainability brands, eco products, health apps, meditation, organic food brands
- **Performance:** cost:low|drivers:none | **Accessibility:** risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion

### Colors
| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#059669` | `--color-primary` |
| On Primary | `#000000` | `--color-on-primary` |
| Secondary | `#10B981` | `--color-secondary` |
| On Secondary | `#0F172A` | `--color-on-secondary` |
| Accent/CTA | `#059669` | `--color-accent` |
| On Accent/CTA | `#000000` | `--color-on-accent` |
| Background | `#ECFDF5` | `--color-background` |
| Foreground | `#064E3B` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#064E3B` | `--color-card-foreground` |
| Muted | `#E8F1F3` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#A7F3D0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#059669` | `--color-ring` |

*Notes: Nature green + solar gold [Accent adjusted from #FBBF24]*

### Typography
- **Heading:** Fira Code
- **Body:** Fira Sans
- **Mood:** dashboard, data, analytics, code, technical, precise
- **Best For:** Dashboards, analytics, data visualization, admin panels
- **Google Fonts:** https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap
- **CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### Key Effects
Rounded corners (16-24px), organic curves (border-radius variations), natural shadows, flowing SVG shapes

### Avoid (Anti-patterns)
- Greenwashing
- No real data

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] cursor-pointer on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard nav
- [ ] prefers-reduced-motion respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
