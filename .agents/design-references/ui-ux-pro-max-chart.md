<!-- UI/UX Pro Max raw retrieval output. Candidate knowledge only; chart choices must answer a bee-behavior question. -->

## UI Pro Max Search Results
**Domain:** chart | **Query:** biological activity rhythm trajectory flow timeline behavior observation
**Source:** charts.csv | **Found:** 3 results

### Result 1
- **Data Type:** Flow / Process Data
- **Keywords:** flow, process, sankey, distribution, source, target, transfer, accessible chart, keyboard accessible chart
- **Best Chart Type:** Sankey Diagram
- **Secondary Options:** Alluvial, Chord Diagram
- **When to Use:** Showing how quantities flow between nodes; multi-source multi-target distribution
- **When NOT to Use:** Flow directions form loops (use network graph); fewer than 3 source-target pairs; mobile-primary context
- **Data Volume Threshold:** <50 flows: SVG; ≥50: Canvas; >200 flows: aggregate minor flows into 'Other' node
- **Color Guidance:** Gradient from source to target color. Flow opacity: 0.4–0.6. Node labels always visible
- **Accessibility Grade:** deprecated: use Accessibility Risk
- **Accessibility Risk:** risk:conditional
- **Accessibility Notes:** Label source, target, and value; use line style or node symbols in addition to gradient color. Do not rely on color alone.
- **A11y Fallback:** Source-to-target flow table plus flow summary. Keyboard: focus reveals hover values; Enter/Space drills into a node; Back returns.
- **Library Recommendation:** D3.js (d3-sankey), Plotly
- **Interactive Level:** Hover + Drilldown

### Result 2
- **Data Type:** Funnel / Flow
- **Keywords:** funnel, flow, conversion, drop-off, pipeline, stages, accessible chart, keyboard accessible chart
- **Best Chart Type:** Funnel Chart or Sankey
- **Secondary Options:** Waterfall (for flows)
- **When to Use:** Sequential multi-stage process; showing conversion or drop-off rates between defined stages
- **When NOT to Use:** Stages aren't sequential; values don't decrease monotonically (use bar); fewer than 3 stages
- **Data Volume Threshold:** 3–8 stages optimal; beyond 8 stages group minor steps into 'Other'
- **Color Guidance:** Stages: single color gradient (start → end). Show conversion % between each stage. Highlight biggest drop
- **Accessibility Grade:** deprecated: use Accessibility Risk
- **Accessibility Risk:** risk:conditional
- **Accessibility Notes:** Keep stage names and values visible and distinguish stages with text and boundaries, not only a gradient. Do not rely on color alone.
- **A11y Fallback:** Linear stage table/list plus conversion summary. Keyboard: focus reveals stage values; Enter/Space drills in; Back returns.
- **Library Recommendation:** D3.js, Recharts, Custom SVG
- **Interactive Level:** Hover + Drill

### Result 3
- **Data Type:** Heatmap / Intensity
- **Keywords:** heatmap, heat-map, intensity, density, matrix, calendar, accessible chart, keyboard accessible chart
- **Best Chart Type:** Heat Map or Choropleth
- **Secondary Options:** Grid Heat Map, Bubble Heat
- **When to Use:** Showing intensity/density across a 2D grid; time-based patterns (e.g., activity by hour × day)
- **When NOT to Use:** Fewer than 20 cells (use bar); user needs to read exact values; colorblind users without pattern fallback
- **Data Volume Threshold:** Up to 10,000 cells efficiently; beyond that aggregate; calendar heatmap: 365 cells max per SVG
- **Color Guidance:** Gradient: Cool (blue) to Hot (red). Divergent scale for ±data. Always include numeric color legend
- **Accessibility Grade:** deprecated: use Accessibility Risk
- **Accessibility Risk:** risk:conditional
- **Accessibility Notes:** Print values or symbols in cells and use texture/labels in addition to the color scale. Do not rely on color alone.
- **A11y Fallback:** Grid data table plus intensity summary. Keyboard: focus reveals cell values; +/- buttons zoom; Reset restores the grid.
- **Library Recommendation:** D3.js, Plotly, ApexCharts
- **Interactive Level:** Hover + Zoom
