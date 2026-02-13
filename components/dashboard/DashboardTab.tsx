'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Flame, ShieldCheck, AlertTriangle, Activity, Users, TrendingUp } from 'lucide-react';
import { useFlare } from '@/lib/context';
import { applyMetricMode, metricModeLabel } from '@/lib/aggregator';
import { bucketBySvi, computeEquityGap } from '@/lib/svi';
import { formatNumber, formatCompact, formatPercent, formatSvi, formatMonth, formatRate, formatCurrency, formatRatio } from '@/lib/format';
import { CATEGORY_COLORS } from '@/lib/types';
import SectionHeader from '@/components/ui/SectionHeader';
import KpiCard from '@/components/ui/KpiCard';
import SviQuintileChart from '@/components/ui/SviQuintileChart';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import type { AggregatedRow } from '@/lib/types';
import ReportButton from '@/components/report/ReportButton';

function CriticalAlerts({ entities, national }: { entities: AggregatedRow[]; national: AggregatedRow }) {
  const alerts = useMemo(() => {
    const result: { title: string; detail: string; severity: 'critical' | 'warning' }[] = [];

    // High gap + high SVI entities
    const highGapSvi = entities.filter(e => e.gapRate > 50 && e.avgSvi > 0.6 && e.total > 50);
    if (highGapSvi.length > 0) {
      const totalGap = highGapSvi.reduce((s, e) => s + e.gap, 0);
      result.push({
        title: `${highGapSvi.length} entities with >50% gap rate AND high SVI`,
        detail: `${formatNumber(totalGap)} gap fires in vulnerable communities: ${highGapSvi.slice(0, 4).map(e => e.name).join(', ')}`,
        severity: 'critical',
      });
    }

    // Worsening trend entities
    const worsening = entities.filter(e => {
      if (e.monthly.length < 6) return false;
      const first3 = e.monthly.slice(0, 3).reduce((s, m) => s + m.gap, 0);
      const last3 = e.monthly.slice(-3).reduce((s, m) => s + m.gap, 0);
      return first3 > 0 && last3 > first3 * 1.25;
    });
    if (worsening.length > 0) {
      result.push({
        title: `${worsening.length} entities with worsening gap trends`,
        detail: worsening.slice(0, 4).map(e => e.name).join(', '),
        severity: 'warning',
      });
    }

    // Below-national care rate with high volume
    const underperformers = entities.filter(e => e.total > 200 && e.careRate < national.careRate - 10);
    if (underperformers.length > 0) {
      result.push({
        title: `${underperformers.length} high-volume entities well below national care rate`,
        detail: underperformers.slice(0, 4).map(e => `${e.name} (${formatRate(e.careRate)})`).join(', '),
        severity: 'warning',
      });
    }

    return result.slice(0, 4);
  }, [entities, national]);

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`rounded p-4 border flex items-start gap-3 ${
            alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <AlertTriangle size={20} className={`shrink-0 mt-0.5 ${alert.severity === 'critical' ? 'text-arc-red' : 'text-amber-600'}`} />
          <div>
            <p className="text-sm font-medium text-arc-black">{alert.title}</p>
            <p className="text-xs text-arc-gray-500 mt-0.5">{alert.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyTrend({ data }: { data: { month: string; care: number; notification: number; gap: number }[] }) {
  const chartData = data.map(d => ({
    month: formatMonth(d.month),
    'RC Care': d.care,
    'RC Notification': d.notification,
    'No Notification': d.gap,
  }));

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
        Monthly Trend
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
            formatter={(value) => formatNumber(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="RC Care" stackId="1" fill={CATEGORY_COLORS.care} stroke={CATEGORY_COLORS.care} fillOpacity={0.7} />
          <Area type="monotone" dataKey="RC Notification" stackId="1" fill={CATEGORY_COLORS.notification} stroke={CATEGORY_COLORS.notification} fillOpacity={0.7} />
          <Area type="monotone" dataKey="No Notification" stackId="1" fill={CATEGORY_COLORS.gap} stroke={CATEGORY_COLORS.gap} fillOpacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EngagementBreakdown({ total, care, notification, gap }: { total: number; care: number; notification: number; gap: number }) {
  const stages = [
    { label: 'RC Care', value: care, color: CATEGORY_COLORS.care },
    { label: 'RC Notification Only', value: notification, color: CATEGORY_COLORS.notification },
    { label: 'No Notification (Gap)', value: gap, color: CATEGORY_COLORS.gap },
  ];
  const maxVal = total || 1;

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
        Response Breakdown
      </h3>
      <p className="text-sm text-arc-gray-500 mb-5">{formatNumber(total)} total fires</p>
      <div className="space-y-4">
        {stages.map((stage) => {
          const pct = (stage.value / maxVal) * 100;
          return (
            <div key={stage.label}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-arc-black">{stage.label}</span>
                <span className="text-sm font-[family-name:var(--font-data)] font-semibold text-arc-black">
                  {formatNumber(stage.value)} <span className="text-arc-gray-400 font-normal">({pct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="h-5 bg-arc-gray-100 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{ width: `${pct}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardTab() {
  const { filteredCounties, filteredNational, national, metricMode, filters, aggregateBy } = useFlare();

  const fn = filteredNational;
  const ml = metricModeLabel(metricMode);

  // Determine next drill level for the mini-table
  const { drillEntities, drillLabel } = useMemo(() => {
    if (filters.chapter) {
      // Show counties under this chapter
      return {
        drillEntities: filteredCounties.map(c => {
          const poverty = c.poverty || 0;
          return {
            name: c.county, level: 'county' as const,
            total: c.total, care: c.care, notification: c.notification, gap: c.gap,
            careRate: c.careRate, gapRate: c.gapRate, avgSvi: c.avgSvi,
            population: c.population, households: c.households, poverty,
            medianIncome: c.medianIncome, medianAge: c.medianAge, diversityIndex: c.diversityIndex,
            homeValue: c.homeValue, firesPer10k: c.firesPer10k,
            povertyRate: c.population > 0 ? +((poverty / c.population) * 100).toFixed(1) : 0,
            affordabilityRatio: c.medianIncome > 0 ? +((c.homeValue || 0) / c.medianIncome).toFixed(1) : 0,
            stationCount: c.stationCount || 0,
            countyCount: 1, monthly: c.monthly,
          } as AggregatedRow;
        }),
        drillLabel: 'Top Counties',
      };
    }
    if (filters.region) return { drillEntities: aggregateBy('chapter'), drillLabel: 'Top Chapters' };
    if (filters.division) return { drillEntities: aggregateBy('region'), drillLabel: 'Top Regions' };
    return { drillEntities: aggregateBy('division'), drillLabel: 'Top Divisions' };
  }, [filters, filteredCounties, aggregateBy]);

  // SVI analysis
  const quintiles = useMemo(() => bucketBySvi(filteredCounties), [filteredCounties]);
  const equity = useMemo(() => computeEquityGap(quintiles), [quintiles]);

  // KPI deltas — only meaningful when a filter is active
  const hasFilters = !!(filters.division || filters.region || filters.chapter || filters.state);
  const careDelta = hasFilters ? fn.careRate - national.careRate : null;
  const gapDelta = hasFilters ? fn.gapRate - national.gapRate : null;

  // Mini-table columns
  const miniCols: ColumnDef<AggregatedRow>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'total', label: `Fires${ml}`, align: 'right', sortable: true, format: (v) => {
      const n = Number(v);
      return metricMode === 'raw' ? formatNumber(n) : formatNumber(n);
    }},
    { key: 'careRate', label: 'Care Rate', align: 'right', sortable: true, format: v => formatPercent(Number(v)),
      heatmap: { min: 20, max: 70, lowColor: '#fca5a5', highColor: '#22c55e' } },
    { key: 'gapRate', label: 'Gap Rate', align: 'right', sortable: true, format: v => formatPercent(Number(v)),
      heatmap: { min: 20, max: 70, lowColor: '#22c55e', highColor: '#fca5a5' } },
    { key: 'avgSvi', label: 'Avg SVI', align: 'right', sortable: true, format: v => formatSvi(Number(v)) },
    { key: 'medianIncome', label: 'Income', align: 'right', sortable: true, format: v => formatCurrency(Number(v)) },
  ];

  // Apply metric mode to the entities for the mini table
  const displayEntities = useMemo(() => {
    if (metricMode === 'raw') return drillEntities;
    return drillEntities.map(e => ({
      ...e,
      total: applyMetricMode(e.total, e.population, e.households, metricMode),
    }));
  }, [drillEntities, metricMode]);

  const topEntities = useMemo(() =>
    [...displayEntities].sort((a, b) => b.total - a.total).slice(0, 15),
  [displayEntities]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <SectionHeader
          title="Dashboard"
          subtitle={`${formatNumber(fn.total)} fires across ${fn.countyCount.toLocaleString()} counties — Calendar Year 2024`}
        />
        {filters.chapter && <ReportButton chapterName={filters.chapter} />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label={`Total Fires${ml}`}
          value={formatNumber(metricMode === 'raw' ? fn.total : applyMetricMode(fn.total, fn.population, fn.households, metricMode))}
          icon={Flame}
          sparklineData={fn.monthly.map(m => m.total)}
        />
        <KpiCard
          label="Care Rate"
          value={formatPercent(fn.careRate)}
          subtext={`${formatNumber(fn.care)} families served`}
          icon={ShieldCheck}
          deltas={careDelta !== null ? [{ label: 'vs national', value: careDelta, good: careDelta >= 0 }] : undefined}
        />
        <KpiCard
          label="Gap Rate"
          value={formatPercent(fn.gapRate)}
          subtext={`${formatNumber(fn.gap)} fires missed`}
          icon={AlertTriangle}
          highlight
          deltas={gapDelta !== null ? [{ label: 'vs national', value: gapDelta, good: gapDelta <= 0 }] : undefined}
        />
        <KpiCard
          label="Avg SVI"
          value={formatSvi(fn.avgSvi)}
          subtext="Higher = more vulnerable"
          icon={Activity}
        />
        <KpiCard
          label="Population"
          value={formatCompact(fn.population)}
          subtext={`${fn.countyCount} counties`}
          icon={Users}
        />
        <KpiCard
          label="Fires Per 10K"
          value={fn.firesPer10k.toFixed(1)}
          icon={TrendingUp}
          sparklineData={fn.monthly.map(m => m.total)}
        />
      </div>

      {/* Community Profile */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
          Community Profile
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {([
            { label: 'Median Income', value: formatCurrency(fn.medianIncome), delta: fn.medianIncome - national.medianIncome, fmt: (d: number) => `${d >= 0 ? '+' : '-'}$${formatNumber(Math.abs(Math.round(d)))}`, higherBetter: true as boolean | undefined },
            { label: 'Home Value', value: formatCurrency(fn.homeValue), delta: fn.homeValue - national.homeValue, fmt: (d: number) => `${d >= 0 ? '+' : '-'}$${formatNumber(Math.abs(Math.round(d)))}`, higherBetter: undefined as boolean | undefined },
            { label: 'Median Age', value: fn.medianAge.toFixed(1), delta: fn.medianAge - national.medianAge, fmt: (d: number) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}`, higherBetter: undefined as boolean | undefined },
            { label: 'Households', value: formatCompact(fn.households), delta: 0 as number, fmt: (_d: number) => '', higherBetter: undefined as boolean | undefined },
            { label: 'Fires Per 10K', value: fn.firesPer10k.toFixed(1), delta: fn.firesPer10k - national.firesPer10k, fmt: (d: number) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}`, higherBetter: undefined as boolean | undefined },
            { label: 'Fire Stations', value: formatNumber(fn.stationCount), delta: 0 as number, fmt: (_d: number) => '', higherBetter: undefined as boolean | undefined },
          ]).map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-[10px] text-arc-gray-500 uppercase tracking-wide">{stat.label}</p>
              <p className="text-lg font-[family-name:var(--font-data)] font-bold text-arc-black mt-0.5">{stat.value}</p>
              {hasFilters && stat.delta !== 0 && (
                <p className={`text-[10px] font-[family-name:var(--font-data)] mt-0.5 ${
                  stat.higherBetter === undefined ? 'text-arc-gray-500'
                  : (stat.higherBetter ? stat.delta >= 0 : stat.delta <= 0) ? 'text-green-600' : 'text-arc-red'
                }`}>
                  {stat.fmt(stat.delta)} vs natl
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Critical Alerts */}
      <CriticalAlerts entities={drillEntities} national={national} />

      {/* SVI Equity Analysis */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
          SVI Equity Analysis
        </h3>
        <p className="text-xs text-arc-gray-700 mb-4 bg-arc-cream rounded px-3 py-2">
          {equity.narrative}
        </p>
        <SviQuintileChart quintiles={quintiles} />
      </div>

      {/* Funnel + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementBreakdown total={fn.total} care={fn.care} notification={fn.notification} gap={fn.gap} />
        <MonthlyTrend data={fn.monthly} />
      </div>

      {/* Top Entities Mini-Table */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
          {drillLabel}
        </h3>
        <DataTable
          data={topEntities}
          columns={miniCols}
          pageSize={15}
          exportFilename={`flare-${drillLabel.toLowerCase().replace(/\s/g, '-')}`}
          rowKey={r => r.name}
        />
      </div>
    </div>
  );
}
