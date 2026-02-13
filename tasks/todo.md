# FLARE Analytics v2 — Complete Rewrite

## Phase 1: Foundation
- [x] 1. Update `lib/types.ts` — MetricMode, FilterState, AggregatedRow, SviQuintileBucket, new TabId
- [x] 2. Create `lib/aggregator.ts` — filterCounties, aggregateCounties, computeNational, injectBenchmarks, applyMetricMode
- [x] 3. Create `lib/svi.ts` — SVI quintile bucketing + equity analysis
- [x] 4. Create `lib/export.ts` — CSV + clipboard utilities
- [x] 5. Update `lib/format.ts` — formatPerCapita, formatRate
- [x] 6. Simplify `lib/data-loader.ts` — keep county + points + daily + topo only
- [x] 7. Create `lib/context.tsx` — FlareProvider + useFlare() hook

## Phase 2: Shared UI Components
- [x] 8. Create `components/ui/SparkLine.tsx`
- [x] 9. Create `components/ui/ExportButton.tsx`
- [x] 10. Create `components/ui/SectionHeader.tsx`
- [x] 11. Create `components/ui/MetricToggle.tsx`
- [x] 12. Create `components/ui/KpiCard.tsx`
- [x] 13. Create `components/ui/FilterBar.tsx`
- [x] 14. Create `components/ui/PeerBenchmark.tsx`
- [x] 15. Create `components/ui/SviQuintileChart.tsx`
- [x] 16. Create `components/ui/DataTable.tsx`

## Phase 3: Dashboard + Data Explorer
- [x] 17. Create `components/dashboard/DashboardTab.tsx`
- [x] 18. Create `components/dashboard/DataExplorerTab.tsx`

## Phase 4: Geography + Trends
- [x] 19. Create `components/dashboard/GeographyTab.tsx`
- [x] 20. Create `components/dashboard/TrendsTab.tsx`

## Phase 5: App Shell + Integration
- [x] 21. Update `app/layout.tsx` — wrap in FlareProvider
- [x] 22. Rewrite `app/page.tsx` — 4-tab shell + FilterBar + MetricToggle + URL state

## Phase 6: Polish + Verification
- [x] 23. Build check (`npm run build`) — zero errors
- [x] 24. Visual verification + Playwright — all 4 tabs pass
- [x] 25. Delete old v1 components — 7 files removed

## Review
### v2 Architecture
- **1 data source** (`by-county.json`, 2,997 records) loaded once by `FlareProvider`
- **Global filter context** (`useFlare()`) — Division → Region → Chapter cascading + State cross-filter
- **MetricToggle** — Raw / Per 10K Pop / Per 10K HH on all tabs
- **4 deep tabs** replace 7 shallow silos

### New Files (14)
- `lib/aggregator.ts` — core computation engine
- `lib/context.tsx` — FlareProvider + useFlare() hook
- `lib/svi.ts` — SVI quintile bucketing + equity analysis
- `lib/export.ts` — CSV + clipboard
- `components/ui/` — DataTable, KpiCard, FilterBar, MetricToggle, PeerBenchmark, SviQuintileChart, SparkLine, ExportButton, SectionHeader
- `components/dashboard/` — DashboardTab, DataExplorerTab, GeographyTab, TrendsTab

### Deleted Files (7)
- ExecutiveDashboard, MapExplorer, GapAnalysis, TemporalPatterns, DepartmentIntel, RegionalDeepDive, OrganizationView

### Key Features
- 6 KPI cards with sparklines + peer deltas
- SVI equity analysis with 5-quintile chart + auto-narrative
- Full paginated DataTable with sort, search, heatmap cells, CSV/clipboard export
- Scatter plot with user-selectable X/Y axes
- Choropleth map (state + county toggle, 5 metrics) + Deck.gl point map
- Calendar heatmap, monthly/DOW charts
- Trend rankings (Q1→Q4 gap rate change)
- Comparison panel (select 2-3 entities, overlaid monthly trends)
