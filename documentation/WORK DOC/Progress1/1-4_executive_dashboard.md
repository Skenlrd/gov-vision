# FRONTEND DOCUMENTATION - Day 4

## Overview
Day 4 implements the Analytics Dashboard for GovVision in the frontend app. The current frontend includes a fixed dark sidebar, a minimal top action bar, animated KPI cards, a real-time anomaly feed, two chart panels, department/date filtering, and a Day 9 placeholder for the risk heatmap.

This document describes the current implemented UI and the elements currently present in the dashboard screen.

## Current Files In Scope
### Frontend files used by the current dashboard
- `client/src/components/Sidebar.tsx`
- `client/src/components/TopBar.tsx`
- `client/src/components/KPICard.tsx`
- `client/src/components/AnomalyFeed.tsx`
- `client/src/pages/Dashboard.tsx`

### Supporting files used by the dashboard
- `client/src/types/index.ts`
- `client/src/services/api.ts`
- `client/src/main.tsx`
- `client/src/App.tsx`

## Packages Used
- `axios` for HTTP calls and auth header injection
- `recharts` for the decision volume area chart and cycle time bar chart
- `react-router-dom` for layout routing and sidebar navigation
- `tailwindcss`, `postcss`, `autoprefixer` are installed in the client, though the dashboard components themselves use inline styles
- `echarts` and `echarts-for-react` are installed for future extensions but are not used directly in the current Day 4 dashboard screen

## Current UI Structure
- The dashboard uses a fixed sidebar layout with a top action bar and a main analytics canvas.
- The current UI is built from `Sidebar.tsx`, `TopBar.tsx`, `KPICard.tsx`, `AnomalyFeed.tsx`, `Dashboard.tsx`, and `App.tsx`.
- The page is focused on current-state analytics, anomaly visibility, and high-level executive reporting.

## Typography
- Primary UI font: `Outfit`
- The font is imported directly inside `Dashboard.tsx` using a Google Fonts `@import`
- `KPICard`, `Sidebar`, `TopBar`, `AnomalyFeed`, and dashboard panels all use `fontFamily: 'Outfit', sans-serif`
- Typographic style direction:
  - uppercase micro-labels for section metadata and KPI titles
  - bold weights for card values and key headings
  - subdued greys for secondary explanatory text

## Color System
### Page and layout colors
- Dashboard page background: `#F5F6FA`
- Sidebar background: `#1A1F2E`
- Main content cards/panels: white
- General soft borders: `#E2E6ED` or `#E2E8F4` depending on component

### Brand and action colors
- Primary blue: `#3B82F6`
- Darker action blue: `#1D4ED8`
- Sidebar report button gradient: `linear-gradient(135deg, #2563EB, #1D4ED8)`
- Export/Data actions remain blue-accented, but the previous live badge styling is no longer shown in the top bar

### Supporting semantic colors used in KPI/anomaly states
- Green: success/compliance/live-good states in cards and anomaly empty states
- Orange/amber: warning and medium-risk indicators
- Red: high severity, violations, critical anomalies
- Purple: AI or model-related highlight accents such as AI risk card styling

### Anomaly severity colors
- `Critical`: red accent set
- `High`: orange accent set
- `Medium`: amber accent set
- `Low`: blue accent set
- `Normal`: green accent set

These colors are defined directly in `client/src/components/AnomalyFeed.tsx` via a severity config object.

## Component Documentation
### Sidebar
File: `client/src/components/Sidebar.tsx`

Current lineup from top to bottom:
1. `Dashboard`
2. `Deep Insights` as a non-clickable section heading
3. `Anomaly Detection`
4. `Forecast`
5. `Risk Assessment`
6. `Reports`
7. `+ New Report` action button
8. Bottom utility links: `Settings`, `Support`

Notes:
- `Deep Insights` is intentionally non-clickable and acts as a section label.
- The 3 AI feature links are shown directly under `Deep Insights`.
- `Reports` comes after the AI feature links.
- The old sidebar grouping used earlier in the day was replaced with this lineup.
- The temporary badge that briefly appeared on `Forecast` was removed.
- The `+ New Report` button now visually represents full formatted report generation and includes tooltip text: `Generate formatted PDF or Excel report`.

### TopBar
File: `client/src/components/TopBar.tsx`

Current layout:
- Left side intentionally empty
- Right side contains:
  - notification bell
  - divider
  - avatar

Notes:
- Avatar initials are `AC`.
- Avatar tooltip/title is `Aswin Chettri`.

### KPICard
File: `client/src/components/KPICard.tsx`

Purpose:
- reusable metric card component for all dashboard KPIs

Features:
- animated numeric count-up transitions
- optional units such as `%`, `h`, and `/day`
- optional badge mode for categorical values such as `AI Risk Score`
- optional live indicator
- optional inverted trend logic for metrics where increases are undesirable

Visual details:
- white card surface
- top gradient accent bar
- faint circular background decoration
- bold number display
- compact trend chip when previous-period comparison exists

### AnomalyFeed
File: `client/src/components/AnomalyFeed.tsx`

Purpose:
- displays real-time anomalies in a scrollable right-hand feed panel

Features:
- sorts anomalies by latest detection time
- color-codes each item by severity
- shows anomaly score, department, relative time, and description
- supports optimistic acknowledge action
- shows empty state when there are no active anomalies

### Dashboard Page
File: `client/src/pages/Dashboard.tsx`

Main sections:
1. Breadcrumb/header area
2. `Time Frame` dropdown (`Last 7 Days`, `Last 30 Days`, `Last 90 Days`)
3. Department dropdown
4. `Export Data` button for quick CSV-style data export intent
5. KPI row 1
6. KPI row 2
7. Decision Throughput & Volume area chart
8. Avg Approval Time Distribution bar chart
9. Anomaly feed panel
10. Departmental Risk Heatmap placeholder card

## Full UI Inventory
This section lists the current visible UI components and elements rendered on the Day 4 dashboard screen.

### Layout shell
- fixed left sidebar
- top navigation bar
- main dashboard content area

### Sidebar elements
- GovVision logo block
- `Dashboard` navigation link
- `Deep Insights` section label
- `Anomaly Detection` navigation link
- `Forecast` navigation link
- `Risk Assessment` navigation link
- `Reports` navigation link
- `+ New Report` action button
- `Settings` link
- `Support` link

### Top bar elements
- empty left spacer area
- notification bell button
- unread alert dot on the bell when alert count is greater than zero
- vertical divider
- avatar button with initials `AC`

### Header and filter elements
- breadcrumb trail: `Home > Dashboards > Analytics`
- main page title: `Analytics Dashboard`
- `Time Frame` dropdown
- department dropdown
- `Export Data` button
- `CSV snapshot` helper text inside the export button

### KPI card row 1
- `Total Decisions`
- `Approval Rate`
- `Rejection Rate`
- `Avg Approval Time`
- `Bottleneck Rate`

### KPI card row 2
- `Compliance Rate`
- `Violation Count`
- `Decision Throughput`
- `Anomaly Count`
- `AI Risk Score`

### Decision Throughput & Volume card
- card title: `Decision Throughput & Volume`
- subtitle: `Trend analysis`
- granularity toggle buttons: `Daily`, `Weekly`, `Monthly`
- responsive area chart
- tooltip on hover

### Avg Approval Time Distribution card
- card title: `Avg Approval Time Distribution`
- subtitle: `Decisions bucketed by resolution time`
- responsive bar chart
- tooltip on hover
- legend items:
  - `0–24h`
  - `24–48h`
  - `48–72h`
  - `>72h`

### Real-Time Anomalies card
- card title: `Real-Time Anomalies`
- live red indicator dot in the card header
- active anomaly count badge when anomalies exist
- anomaly list items when data exists
- empty state when no anomalies exist
- acknowledge button per anomaly item
- optional footer action: `View All Alerts History →` when anomalies exist

### Departmental Risk Heatmap card
- card title: `Departmental Risk Heatmap`
- subtitle: `Risk concentration by category — available Day 9`
- legend strip from `Low` to `High`
- empty state icon
- empty state text: `Data not available`

### Reusable visual elements used across the screen
- white cards with rounded corners
- subtle border/shadow treatment
- gradient KPI icon badges
- animated number transitions in KPI cards
- severity color chips in anomalies
- chart tooltips
- custom scrollbar styling

## Department Dropdown Values
The current department dropdown in `Dashboard.tsx` uses these labels and placeholder values:

```ts
const DEPARTMENTS = [
  { label: "All Departments", value: "" },
  { label: "Finance", value: "REPLACE_WITH_FINANCE_ID" },
  { label: "Human Resources", value: "REPLACE_WITH_HR_ID" },
  { label: "Legal", value: "REPLACE_WITH_LEGAL_ID" },
  { label: "Operations", value: "REPLACE_WITH_OPERATIONS_ID" },
  { label: "Information Technology", value: "REPLACE_WITH_IT_ID" },
  { label: "Procurement", value: "REPLACE_WITH_PROCUREMENT_ID" }
]
```

These values came from the follow-up instruction to align the names with the GovVision shared departments collection, while still leaving the IDs as placeholders until the final seeded ObjectIds are available.
These values reflect the current department labels used by the dashboard UI, while still leaving the IDs as placeholders until final seeded ObjectIds are available.

## Charts And Data Panels
### Decision Throughput & Volume
- implemented with `AreaChart` from `recharts`
- supports `daily`, `weekly`, and `monthly` granularity toggle
- uses a blue gradient fill and blue active dot styling

### Avg Approval Time Distribution
- implemented with `BarChart` from `recharts`
- uses 4 fixed bucket colors
- includes a legend for `0–24h`, `24–48h`, `48–72h`, and `>72h`

### Risk Heatmap Placeholder
- currently does not render real backend heatmap data
- includes `const [heatmapReady] = useState(false)`
- renders an empty state with icon and plain text:
  - `Data not available`
- comment marker used in code:
  - `TODO: Day 9 - uncomment when /api/analytics/risk-heatmap endpoint is live`

## Polling And Live Behavior
- Dashboard fetches data on first render
- Dashboard refetches every 30 seconds
- `lastFetchRef` stores last successful refresh timestamp
- if the refresh age exceeds 35 seconds, the page marks the live state as stale
- anomalies are filtered to only show unacknowledged items

## Optimistic Acknowledge Behavior
- When an anomaly is acknowledged, it is immediately removed from local UI state
- The API request is then sent afterward
- If the request fails, the error is logged to the console

## Export Actions
There are now two clearly distinct export/report actions in the UI:

### Export Data
- located in the top-right dashboard controls
- intended for current dashboard snapshot/raw data export
- white button styling with neutral border
- label text changed from `Export` to `Export Data`

### + New Report
- located in the sidebar
- intended for full formatted report generation such as PDF or Excel
- styled with a stronger blue gradient and tooltip title

## Routing
- `BrowserRouter` wraps the application in `main.tsx`
- `App.tsx` currently routes:
  - `/`
  - `/dashboard`
- placeholder comments remain in `App.tsx` for future pages such as AI Insights, Risk Heatmap, and Reports expansion

## Notes And Outstanding Items
- Replace all placeholder department IDs with actual seeded department ObjectIds when available
- The `Deep Insights`, `Anomaly Detection`, `Forecast`, `Risk Assessment`, and `Reports` sidebar items reflect the current UI structure, but not all downstream pages are implemented yet
- Risk heatmap data is intentionally deferred to Day 9
- The top bar is intentionally minimal, focused on notifications and user identity
- A valid JWT token in local storage is still required for secured API routes during testing
