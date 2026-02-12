# FLARE Analytics Platform — Build Tasks

## Phase 1: Data Pipeline + Project Scaffold
- [x] Python script: `Match Map.xlsx` → 9 JSON files
- [x] Next.js project setup with Tailwind, brand tokens, Google Fonts
- [x] Tab navigation shell (6 tabs, lazy-loaded)
- [x] TypeScript interfaces, data loader, formatters

## Phase 2: Executive Dashboard
- [x] 4 KPI cards (Total Fires, Care Rate, Gap Rate, Avg SVI)
- [x] Custom engagement funnel (Total → NFIRS → RC Notified → RC Care)
- [x] Monthly trend stacked area chart
- [x] Risk histogram + Top 10 states horizontal bars

## Phase 3: Map Explorer
- [x] deck.gl + MapLibre rendering 103K points via MapboxOverlay
- [x] Scatter/Heatmap view mode toggle
- [x] Sidebar with live filter stats (category, SVI, month range)
- [x] Legend overlay

## Phase 4: Gap Analysis
- [x] Executive callout (41,421 fires had no notification)
- [x] 4 gap metric KPI cards
- [x] Priority matrix scatter with quadrants (custom shapes, sized by volume)
- [x] Opportunity score ranked table (51 states, sortable)

## Phase 5: Supporting Tabs
- [x] Calendar heatmap (custom SVG, 365 days, toggle total/gap)
- [x] Monthly comparison grouped bars + Day of week stacked bars
- [x] Department Top 20 chart + searchable table with pagination + CSV export
- [x] Engagement scatter (high-volume/low-engagement outliers)
- [x] State choropleth (SVG grid map, toggle metric)
- [x] State comparison (side-by-side)
- [x] State leaderboard (sortable, mini progress bars)

## Phase 6: Polish + Deploy
- [x] Loading skeletons per tab
- [x] Playwright screenshot verification (all tabs, zero console errors)
- [ ] Create GitHub repo + push
- [ ] Deploy to Vercel
- [ ] Verify production build

## Review

### Changes Made
1. **Data Pipeline** — Python script (`scripts/prepare_data.py`) processes 103,400 rows from Excel into 9 optimized JSON files (2.8MB points file, state/dept/monthly/daily aggregations, gap analysis, risk distribution)
2. **Project Scaffold** — Next.js 16 + Tailwind + Red Cross brand tokens (cream background, Libre Baskerville/Source Sans/IBM Plex Mono fonts, `#ED1B2E` accent)
3. **6 Tab Components** — All lazy-loaded with Suspense skeletons
4. **Executive Dashboard** — KPI cards, engagement funnel, monthly trend, risk histogram, top 10 states
5. **Map Explorer** — deck.gl ScatterplotLayer + HeatmapLayer on MapLibre Positron basemap, filter controls (category/SVI/month), live stats sidebar
6. **Gap Analysis** — The killer feature — priority matrix with 51 states as sized/colored scatter dots, opportunity score table sorted by `gap_count * avg_svi`
7. **Temporal Patterns** — Calendar heatmap (custom SVG), monthly grouped bars, day-of-week stacked bars
8. **Department Intelligence** — Top 20 horizontal bars, engagement scatter, searchable/sortable/paginated table with CSV export
9. **Regional Deep Dive** — SVG state grid choropleth (toggleable metrics), state-vs-state comparison, state leaderboard

### Key Decisions
- Used flat arrays instead of GeoJSON for points data (2.8MB vs ~15MB for GeoJSON)
- Used zip code prefix → state mapping for address parsing (addresses lack consistent state format)
- Used `MapboxOverlay` pattern for deck.gl + MapLibre (proper integration, not hacky ref-based)
- Added `isAnimationActive={false}` to all Recharts bars (Playwright captures before animation completes)

### Things to Test
- Map tab: verify 103K points render smoothly in a real browser (Playwright headless can't do WebGL)
- Filter interactions: SVI slider, month range, category toggles on Map tab
- Department search and CSV export
- State comparison dropdowns
- Mobile responsive at 375px width
