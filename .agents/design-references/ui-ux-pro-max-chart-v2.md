# UI/UX Pro Max Chart Search v2

> Candidate knowledge only. Every chart must answer a bee-behavior or evidence question defined by the project design system.

## Project filter

- **Useful:** Accessible time-series principles for colony rhythm; Sankey/alluvial principles only for genuine multi-source/multi-target flows; process-map accessibility patterns for analysis event logs.
- **Conditional:** A custom two-direction Hive Gate Flow is preferable to Sankey when there are only entry/exit streams. Direct labels, line styles, keyboard access, and table/summary fallbacks are reusable.
- **Reject for core bee data:** Funnel and waterfall charts unless a real sequential drop-off or additive decomposition exists.
- **Dataset gap:** No verified trajectory-field, event-timeline band, circadian/radial rhythm, density-distribution, or behavior-comparison pattern was returned. Keep the project's custom Track Field, Event Timeline, Colony Pulse, and Behavior Fingerprint definitions.

## Primary query

## UI Pro Max Search Results
**Domain:** chart | **Query:** biological temporal rhythm movement trajectory directional flow event timeline observational science experimental data
**Source:** charts.csv | **Found:** 5 results

### Result 1
- **Data Type:** Process Mining
- **Keywords:** process, mining, variants, path, bottleneck, log, event, accessible chart, keyboard accessible chart
- **Best Chart Type:** Process Map / Graph
- **Secondary Options:** Directed Acyclic Graph (DAG), Petri Net
- **When to Use:** Analyzing event logs to visualize actual process flows; identifying bottlenecks and deviations in ops/product funnels
- **When NOT to Use:** No event log data available; audience expects a static flowchart (use diagram tool); node count > 100 without pre-filtering
- **Data Volume Threshold:** <30 nodes: SVG; 30–100: Canvas; >100: apply variant filtering (top 80% of cases) before rendering
- **Color Guidance:** Happy path: #10B981 thick line. Deviations: #F59E0B thin line. Bottleneck nodes: #EF4444 fill
- **Accessibility Grade:** deprecated: use Accessibility Risk
- **Accessibility Risk:** risk:conditional
- **Accessibility Notes:** Label nodes and paths and use shapes/line styles in addition to color; bottlenecks require text annotations. Do not rely on color alone.
- **A11y Fallback:** Path summary table plus bottleneck narrative. Keyboard: Move buttons replace drag; focus reveals node details; Enter activates a node; Back returns.
- **Library Recommendation:** React-Flow, Cytoscape.js, Recharts
- **Interactive Level:** Drag + Node-Click

### Result 2
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

### Result 3
- **Data Type:** Trend Over Time
- **Keywords:** trend, time-series, line, growth, timeline, progress, accessible chart, keyboard accessible chart
- **Best Chart Type:** Line Chart
- **Secondary Options:** Area Chart, Smooth Area
- **When to Use:** Data has a time axis; user needs to observe rise/fall trends or rate of change over a continuous period
- **When NOT to Use:** Fewer than 4 data points (use stat card); more than 6 series (visual noise); no time dimension exists
- **Data Volume Threshold:** <1000 pts: SVG; ≥1000 pts: Canvas + downsampling; >10000: aggregate to intervals
- **Color Guidance:** Primary: #0080FF. Multiple series: distinct colors + distinct line styles. Fill: 20% opacity
- **Accessibility Grade:** deprecated: use Accessibility Risk
- **Accessibility Risk:** risk:low
- **Accessibility Notes:** Use solid, dashed, and dotted line styles plus direct series labels; never distinguish series by hue alone.
- **A11y Fallback:** Visible data table plus concise trend summary. Keyboard: focus reveals hover values; +/- buttons zoom; Reset restores the full range.
- **Library Recommendation:** Chart.js, Recharts, ApexCharts
- **Interactive Level:** Hover + Zoom

### Result 4
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

### Result 5
- **Data Type:** Cumulative Changes
- **Keywords:** waterfall, cumulative, variance, incremental, bridge, delta, accessible chart, keyboard accessible chart
- **Best Chart Type:** Waterfall Chart
- **Secondary Options:** Stacked Bar, Cascade
- **When to Use:** Showing how individual positive/negative components add up to a final total (e.g., P&L, budget variance)
- **When NOT to Use:** Changes are not additive; more than 12 bars (readability breaks); audience expects a simple total
- **Data Volume Threshold:** 4–12 bars optimal; beyond 12 aggregate minor items into a single 'Other' bar
- **Color Guidance:** Increases: #4CAF50. Decreases: #F44336. Start total: #2196F3. End total: #0D47A1. Running total line: dashed
- **Accessibility Grade:** deprecated: use Accessibility Risk
- **Accessibility Risk:** risk:low
- **Accessibility Notes:** Pair increase/decrease bars with signed values and directional icons, not red/green alone. Do not rely on color alone.
- **A11y Fallback:** Running-total table plus variance summary. Keyboard: focus reveals the same value as hover.
- **Library Recommendation:** ApexCharts, Highcharts, Plotly
- **Interactive Level:** Hover
## Focused verification

## UI Pro Max Search Results
**Domain:** chart | **Query:** temporal trajectory directional flow
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
- **Data Type:** Cumulative Changes
- **Keywords:** waterfall, cumulative, variance, incremental, bridge, delta, accessible chart, keyboard accessible chart
- **Best Chart Type:** Waterfall Chart
- **Secondary Options:** Stacked Bar, Cascade
- **When to Use:** Showing how individual positive/negative components add up to a final total (e.g., P&L, budget variance)
- **When NOT to Use:** Changes are not additive; more than 12 bars (readability breaks); audience expects a simple total
- **Data Volume Threshold:** 4–12 bars optimal; beyond 12 aggregate minor items into a single 'Other' bar
- **Color Guidance:** Increases: #4CAF50. Decreases: #F44336. Start total: #2196F3. End total: #0D47A1. Running total line: dashed
- **Accessibility Grade:** deprecated: use Accessibility Risk
- **Accessibility Risk:** risk:low
- **Accessibility Notes:** Pair increase/decrease bars with signed values and directional icons, not red/green alone. Do not rely on color alone.
- **A11y Fallback:** Running-total table plus variance summary. Keyboard: focus reveals the same value as hover.
- **Library Recommendation:** ApexCharts, Highcharts, Plotly
- **Interactive Level:** Hover
