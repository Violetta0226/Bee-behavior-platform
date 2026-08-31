# UI/UX Pro Max Typography Search v2

> Validation only. Font-family recommendations below must not replace Source Han Serif SC / Songti / Times New Roman / FangSong.

## Project filter

- The results support an editorial, academic, archival, authoritative serif hierarchy.
- Retain the existing families. Use the results only to validate restrained weight contrast, readable line height, stable sizing tiers, and an editorial rhythm.
- Reject all family substitutions, especially Crimson Pro, Atkinson Hyperlegible, EB Garamond, Lato, Playfair Display, Source Serif 4, JetBrains Mono, Cormorant Garamond, and Libre Baskerville.
- The dataset returns font pairings rather than precise weight, line-height, and size metrics; it does not independently validate those numeric decisions.

## Primary query

## UI Pro Max Search Results
**Domain:** typography | **Query:** scientific journal editorial research report museum catalog authoritative serif hierarchy
**Source:** typography.csv | **Found:** 5 results

### Result 1
- **Font Pairing Name:** Academic/Research
- **Category:** Serif + Sans
- **Heading Font:** Crimson Pro
- **Body Font:** Atkinson Hyperlegible
- **Mood/Style Keywords:** academic, research, scholarly, accessible, readable, educational
- **Best For:** Universities, research papers, academic journals, educational
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Crimson+Pro:wght@400;500;600;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Crimson+Pro:wght@400;500;600;700&display=swap');
- **Tailwind Config:** fontFamily: { serif: ['Crimson Pro', 'serif'], sans: ['Atkinson Hyperlegible', 'sans-serif'] }
- **Notes:** Crimson for scholarly headlines. Atkinson for accessibility.

### Result 2
- **Font Pairing Name:** Academic/Archival
- **Category:** Serif + Serif
- **Heading Font:** EB Garamond
- **Body Font:** Crimson Text
- **Mood/Style Keywords:** academic, old-school, university, research, serious, traditional
- **Best For:** University sites, archives, research papers, history
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=EB+Garamond:wght@400;500;600;700;800&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&family=EB+Garamond:wght@400;500;600;700;800&display=swap');
- **Tailwind Config:** fontFamily: { classic: ['EB Garamond', 'serif'], text: ['Crimson Text', 'serif'] }
- **Notes:** Classic academic aesthetic. Very legible.

### Result 3
- **Font Pairing Name:** Legal Professional
- **Category:** Serif + Sans
- **Heading Font:** EB Garamond
- **Body Font:** Lato
- **Mood/Style Keywords:** legal, professional, traditional, trustworthy, formal, authoritative
- **Best For:** Law firms, legal services, contracts, formal documents, government
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap');
- **Tailwind Config:** fontFamily: { serif: ['EB Garamond', 'serif'], sans: ['Lato', 'sans-serif'] }
- **Notes:** EB Garamond for authority. Lato for clean body text.

### Result 4
- **Font Pairing Name:** Minimalist Monochrome Editorial
- **Category:** Serif + Serif + Mono (Triple Stack)
- **Heading Font:** Playfair Display
- **Body Font:** Source Serif 4
- **Mood/Style Keywords:** monochrome, editorial, austere, typographic, pocket manifesto, luxury, high contrast, brutalist mobile
- **Best For:** Luxury fashion mobile apps, editorial publications, digital exhibitions, portfolio apps, high-contrast e-reader aesthetics
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300&display=swap');
- **Tailwind Config:** fontFamily: { display: ['Playfair Display', 'serif'], body: ['Source Serif 4', 'serif'], mono: ['JetBrains Mono', 'monospace'] }
- **Notes:** Triple stack: Playfair Display 900 tracking-tighter leading-[0.9] for heroes (text-5xl–text-6xl breaks words graphically). Source Serif 4 300–600 for body legibility. JetBrains Mono 400–500 uppercase tracking-widest for tags/dates/labels. NO UI sans-serif — 100% serif/mono.

### Result 5
- **Font Pairing Name:** Editorial Classic
- **Category:** Serif + Serif
- **Heading Font:** Cormorant Garamond
- **Body Font:** Libre Baskerville
- **Mood/Style Keywords:** editorial, classic, literary, traditional, refined, bookish
- **Best For:** Publishing, blogs, news sites, literary magazines, book covers
- **Google Fonts URL:** https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap
- **CSS Import:** @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap');
- **Tailwind Config:** fontFamily: { heading: ['Cormorant Garamond', 'serif'], body: ['Libre Baskerville', 'serif'] }
- **Notes:** All-serif pairing for traditional editorial feel.
