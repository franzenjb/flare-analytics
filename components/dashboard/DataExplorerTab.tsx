'use client';

import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
  LineChart, Line, Legend,
} from 'recharts';
import { useFlare } from '@/lib/context';
import { applyMetricMode, metricModeLabel } from '@/lib/aggregator';
import { formatNumber, formatPercent, formatSvi, formatCurrency, formatMonth, formatRatio } from '@/lib/format';
import SectionHeader from '@/components/ui/SectionHeader';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import PeerBenchmark from '@/components/ui/PeerBenchmark';
import ReportButton from '@/components/report/ReportButton';
import type { AggregatedRow, CountyData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

type ExplorerView = 'counties' | 'chapters' | 'regions' | 'divisions' | 'states';

const SCATTER_METRICS = [
  { key: 'total', label: 'Total Fires' },
  { key: 'careRate', label: 'Care Rate (%)' },
  { key: 'gapRate', label: 'Gap Rate (%)' },
  { key: 'avgSvi', label: 'Avg SVI' },
  { key: 'firesPer10k', label: 'Fires Per 10K' },
  { key: 'medianIncome', label: 'Median Income' },
  { key: 'population', label: 'Population' },
  { key: 'poverty', label: 'Poverty Count' },
  { key: 'medianAge', label: 'Median Age' },
  { key: 'homeValue', label: 'Home Value' },
  { key: 'affordabilityRatio', label: 'Affordability Ratio' },
  { key: 'households', label: 'Households' },
];

function countyToRow(c: CountyData): AggregatedRow {
  const poverty = c.poverty || 0;
  return {
    name: c.county, level: 'county', total: c.total, care: c.care, notification: c.notification,
    gap: c.gap, careRate: c.careRate, gapRate: c.gapRate, avgSvi: c.avgSvi,
    population: c.population, households: c.households, poverty,
    medianIncome: c.medianIncome, medianAge: c.medianAge, diversityIndex: c.diversityIndex,
    homeValue: c.homeValue, firesPer10k: c.firesPer10k,
    povertyRate: c.population > 0 ? +((poverty / c.population) * 100).toFixed(1) : 0,
    affordabilityRatio: c.medianIncome > 0 ? +((c.homeValue || 0) / c.medianIncome).toFixed(1) : 0,
    stationCount: c.stationCount || 0,
    countyCount: 1, monthly: c.monthly,
  };
}

function ComparisonPanel({ selected, national }: { selected: AggregatedRow[]; national: AggregatedRow }) {
  if (selected.length < 2) {
    return <p className="text-xs text-arc-gray-500 py-8 text-center">Select 2-3 entities above to compare</p>;
  }

  const COLORS = ['#2d5a27', '#1e4a6d', '#ED1B2E'];

  return (
    <div className="space-y-6">
      {/* Side-by-side KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {selected.map((entity, i) => (
          <div key={entity.name} className="space-y-3">
            <h4 className="text-xs font-semibold" style={{ color: COLORS[i] }}>{entity.name}</h4>
            <PeerBenchmark label="Care Rate" value={entity.careRate} parentValue={entity.parentCareRate || national.careRate} nationalValue={national.careRate} higherIsBetter />
            <PeerBenchmark label="Gap Rate" value={entity.gapRate} parentValue={entity.parentGapRate || national.gapRate} nationalValue={national.gapRate} higherIsBetter={false} />
          </div>
        ))}
      </div>

      {/* Overlaid monthly trends */}
      <div className="bg-white rounded p-4 border border-arc-gray-100">
        <h4 className="text-xs font-semibold text-arc-gray-500 mb-3">Monthly Trend Comparison</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="month"
              type="category"
              allowDuplicatedCategory={false}
              tick={{ fontSize: 10 }}
              tickFormatter={formatMonth}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {selected.map((entity, i) => (
              <Line
                key={entity.name}
                data={entity.monthly}
                dataKey="total"
                name={entity.name}
                stroke={COLORS[i]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DataExplorerTab() {
  const { filteredCounties, national, metricMode, aggregateBy } = useFlare();
  const [view, setView] = useState<ExplorerView>('chapters');
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [scatterX, setScatterX] = useState('avgSvi');
  const [scatterY, setScatterY] = useState('gapRate');

  const ml = metricModeLabel(metricMode);

  // Build data for the selected view
  const viewData: AggregatedRow[] = useMemo(() => {
    if (view === 'counties') return filteredCounties.map(countyToRow);
    return aggregateBy(view === 'states' ? 'state' : view === 'chapters' ? 'chapter' : view === 'regions' ? 'region' : 'division');
  }, [view, filteredCounties, aggregateBy]);

  // Apply metric mode to count columns
  const displayData = useMemo(() => {
    if (metricMode === 'raw') return viewData;
    return viewData.map(r => ({
      ...r,
      total: applyMetricMode(r.total, r.population, r.households, metricMode),
      care: applyMetricMode(r.care, r.population, r.households, metricMode),
      gap: applyMetricMode(r.gap, r.population, r.households, metricMode),
    }));
  }, [viewData, metricMode]);

  // Columns change based on view
  const columns: ColumnDef<AggregatedRow>[] = useMemo(() => {
    const base: ColumnDef<AggregatedRow>[] = [
      { key: 'name', label: view === 'counties' ? 'County' : view.charAt(0).toUpperCase() + view.slice(1, -1), sortable: true, width: '200px' },
      { key: 'total', label: `Fires${ml}`, align: 'right', sortable: true, format: v => formatNumber(Math.round(Number(v))) },
      { key: 'care', label: `Care${ml}`, align: 'right', sortable: true, format: v => formatNumber(Math.round(Number(v))) },
      { key: 'gap', label: `Gap${ml}`, align: 'right', sortable: true, format: v => formatNumber(Math.round(Number(v))) },
      { key: 'careRate', label: 'Care %', align: 'right', sortable: true, format: v => formatPercent(Number(v)),
        heatmap: { min: 20, max: 70, lowColor: '#fca5a5', highColor: '#22c55e' } },
      { key: 'gapRate', label: 'Gap %', align: 'right', sortable: true, format: v => formatPercent(Number(v)),
        heatmap: { min: 20, max: 70, lowColor: '#22c55e', highColor: '#fca5a5' } },
      { key: 'avgSvi', label: 'SVI', align: 'right', sortable: true, format: v => formatSvi(Number(v)) },
      { key: 'population', label: 'Population', align: 'right', sortable: true, format: v => formatNumber(Number(v)) },
      { key: 'firesPer10k', label: 'Per 10K', align: 'right', sortable: true, format: v => Number(v).toFixed(1) },
    ];

    // Demographic columns for all views
    base.push(
      { key: 'medianIncome', label: 'Income', align: 'right', sortable: true, format: v => formatCurrency(Number(v)) },
      { key: 'homeValue', label: 'Home Value', align: 'right', sortable: true, format: v => formatCurrency(Number(v)) },
      { key: 'medianAge', label: 'Age', align: 'right', sortable: true, format: v => Number(v).toFixed(1) },
    );

    // Fire stations column for all views
    base.push(
      { key: 'stationCount', label: 'Stations', align: 'right', sortable: true, format: v => formatNumber(Number(v)) },
    );

    if (view !== 'counties') {
      base.push(
        { key: 'countyCount', label: 'Counties', align: 'right', sortable: true, format: v => formatNumber(Number(v)) },
      );
      // Add sparkline on the 'total' column for aggregated views
      const totalCol = base.find(c => c.key === 'total');
      if (totalCol) {
        totalCol.sparkline = (row: AggregatedRow) => row.monthly.map(m => m.total);
      }
    }

    return base;
  }, [view, ml]);

  // Selection handling
  const selectedEntities = useMemo(() =>
    viewData.filter(r => selectedNames.has(r.name)),
  [viewData, selectedNames]);

  const handleRowClick = (row: AggregatedRow) => {
    setSelectedNames(prev => {
      const next = new Set(prev);
      if (next.has(row.name)) {
        next.delete(row.name);
      } else if (next.size < 3) {
        next.add(row.name);
      }
      return next;
    });
  };

  // Scatter data
  const scatterData = useMemo(() =>
    viewData.filter(r => r.total > 0).map(r => ({
      name: r.name,
      x: (r as unknown as Record<string, number>)[scatterX] || 0,
      y: (r as unknown as Record<string, number>)[scatterY] || 0,
      z: r.total,
    })),
  [viewData, scatterX, scatterY]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Data Explorer"
        subtitle={`${formatNumber(displayData.length)} ${view} — all data, sortable, searchable, exportable`}
      />

      {/* View selector */}
      <div className="flex items-center gap-2" role="radiogroup" aria-label="Data view">
        {(['counties', 'chapters', 'regions', 'divisions', 'states'] as ExplorerView[]).map(v => (
          <button
            key={v}
            role="radio"
            aria-checked={view === v}
            onClick={() => { setView(v); setSelectedNames(new Set()); }}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              view === v ? 'bg-arc-black text-white' : 'bg-white border border-arc-gray-100 text-arc-gray-500 hover:text-arc-black'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)} ({v === 'counties' ? filteredCounties.length : displayData.length})
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <DataTable
          data={displayData}
          columns={columns}
          searchable
          searchFields={['name']}
          pageSize={25}
          exportFilename={`flare-${view}`}
          onRowClick={handleRowClick}
          highlightFn={r => selectedNames.has(r.name)}
          rowKey={r => r.name}
        />
      </div>

      {/* Comparison Panel */}
      {selectedNames.size > 0 && (
        <div className="bg-white rounded p-5 border border-arc-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
              Comparison ({selectedNames.size} selected)
            </h3>
            {view === 'chapters' && selectedNames.size === 1 && (
              <ReportButton chapterName={Array.from(selectedNames)[0]} />
            )}
          </div>
          <p className="text-[10px] text-arc-gray-500 mb-4">Click rows to select/deselect (max 3)</p>
          <ComparisonPanel selected={selectedEntities} national={national} />
        </div>
      )}

      {/* Scatter Plot */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
            Scatter Analysis
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-arc-gray-500">X:</label>
            <select value={scatterX} onChange={e => setScatterX(e.target.value)} className="text-xs border border-arc-gray-100 rounded px-2 py-1 bg-white">
              {SCATTER_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <label className="text-[10px] text-arc-gray-500 ml-2">Y:</label>
            <select value={scatterY} onChange={e => setScatterY(e.target.value)} className="text-xs border border-arc-gray-100 rounded px-2 py-1 bg-white">
              {SCATTER_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 5, right: 20, left: -5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="x" type="number" tick={{ fontSize: 10 }} name={SCATTER_METRICS.find(m => m.key === scatterX)?.label} />
            <YAxis dataKey="y" type="number" tick={{ fontSize: 10 }} name={SCATTER_METRICS.find(m => m.key === scatterY)?.label} />
            <ZAxis dataKey="z" range={[20, 400]} name="Fires" />
            <Tooltip
              contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 11 }}
              labelFormatter={() => ''}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-arc-gray-100 rounded p-2 shadow-sm text-xs">
                    <p className="font-semibold">{d.name}</p>
                    <p>X: {d.x.toFixed(2)}</p>
                    <p>Y: {d.y.toFixed(2)}</p>
                    <p>Fires: {formatNumber(d.z)}</p>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData} fill="#ED1B2E" fillOpacity={0.5} />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-2 text-[10px] text-arc-gray-500">
          <span>X: {SCATTER_METRICS.find(m => m.key === scatterX)?.label}</span>
          <span>Y: {SCATTER_METRICS.find(m => m.key === scatterY)?.label}</span>
          <span>Bubble size: Total Fires</span>
        </div>
      </div>
    </div>
  );
}
