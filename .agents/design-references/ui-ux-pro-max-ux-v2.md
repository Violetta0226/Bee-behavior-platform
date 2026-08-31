# UI/UX Pro Max UX Search v2

> Candidate knowledge only. Existing evidence-traceability and scientific-workflow rules remain authoritative.

## Project filter

- **Worth retaining:** sequential heading hierarchy; bulk actions only for genuine multi-select workflows; breadcrumbs at three or more hierarchy levels; click-to-play video with captions and reduced-motion behavior; consistent type scale.
- **Dataset gap:** Neither the primary query nor the focused provenance query returned direct rules for evidence traceability, data provenance, audit trail, inspect/review workflow, state clarity, or accessible scientific visualization.
- Do not claim those missing topics were validated by UI/UX Pro Max. Continue using the explicit provenance and evidence-chain rules in `DESIGN.md` and `chaoying-design-system`.

## Primary query

## UI Pro Max Search Results
**Domain:** ux | **Query:** scientific software evidence traceability observational workflow dense data hierarchy accessibility laboratory analysis review
**Source:** ux-guidelines.csv | **Found:** 5 results

### Result 1
- **Category:** Accessibility
- **Issue:** Heading Hierarchy
- **Platform:** Web
- **Description:** Screen readers use headings for navigation
- **Do:** Use sequential heading levels h1-h6
- **Don't:** Skip heading levels or misuse for styling
- **Code Example Good:** h1 then h2 then h3
- **Code Example Bad:** h1 then h4
- **Severity:** Medium
### Result 2
- **Category:** Data Entry
- **Issue:** Bulk Actions
- **Platform:** Web
- **Description:** Editing one by one is tedious
- **Do:** Allow multi-select and bulk edit
- **Don't:** Single row actions only
- **Code Example Good:** Checkbox column + Action bar
- **Code Example Bad:** Repeated actions per row
- **Severity:** Low

### Result 3
- **Category:** Navigation
- **Issue:** Breadcrumbs
- **Platform:** Web
- **Description:** Show user location in site hierarchy
- **Do:** Use for sites with 3+ levels of depth
- **Don't:** Use for flat single-level sites
- **Code Example Good:** Home > Category > Product
- **Code Example Bad:** Only on deep nested pages
- **Severity:** Low

### Result 4
- **Category:** Sustainability
- **Issue:** Auto-Play Video
- **Platform:** Web
- **Description:** Autoplaying media consumes data and creates motion barriers
- **Do:** Prefer click-to-play; provide pause and captions; stop off-screen and honor reduced motion
- **Don't:** Auto-play high-resolution loops without pause or captions
- **Code Example Good:** <video controls preload="none"><track kind="captions" /></video>
- **Code Example Bad:** autoplay loop
- **Severity:** Medium

### Result 5
- **Category:** Typography
- **Issue:** Font Size Scale
- **Platform:** All
- **Description:** Consistent type hierarchy aids scanning
- **Do:** Use consistent modular scale
- **Don't:** Random font sizes
- **Code Example Good:** Type scale (12 14 16 18 24 32)
- **Code Example Bad:** Arbitrary sizes
- **Severity:** Medium

## Focused verification

## UI Pro Max Search Results
**Domain:** ux | **Query:** data provenance audit trail
**Source:** ux-guidelines.csv | **Found:** 2 results

### Result 1
- **Category:** Data Entry
- **Issue:** Bulk Actions
- **Platform:** Web
- **Description:** Editing one by one is tedious
- **Do:** Allow multi-select and bulk edit
- **Don't:** Single row actions only
- **Code Example Good:** Checkbox column + Action bar
- **Code Example Bad:** Repeated actions per row
- **Severity:** Low

### Result 2
- **Category:** Sustainability
- **Issue:** Auto-Play Video
- **Platform:** Web
- **Description:** Autoplaying media consumes data and creates motion barriers
- **Do:** Prefer click-to-play; provide pause and captions; stop off-screen and honor reduced motion
- **Don't:** Auto-play high-resolution loops without pause or captions
- **Code Example Good:** <video controls preload="none"><track kind="captions" /></video>
- **Code Example Bad:** autoplay loop
- **Severity:** Medium
