'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { loadStates, loadStatesTopo, loadCountiesTopo, loadCounties } from '@/lib/data-loader';
import { formatNumber, formatPercent, formatSvi } from '@/lib/format';
import type { StateData, CountyData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';
import { parseStatesTopo, parseCountiesTopo, getMetricColor, getLabelColor, LABEL_STATES } from '@/lib/geo-utils';
import type { GeoFeature } from '@/lib/geo-utils';

type Metric = 'total' | 'careRate' | 'gapRate' | 'avgSvi';
type GeoLevel = 'state' | 'county';

interface ChoroplethProps {
  stateData: StateData[];
  metric: Metric;
  onStateClick?: (abbr: string) => void;
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
}

function StateChoropleth({ stateData, metric, onStateClick }: ChoroplethProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [features, setFeatures] = useState<GeoFeature[]>([]);

  useEffect(() => {
    loadStatesTopo().then(topo => {
      setFeatures(parseStatesTopo(topo));
    });
  }, []);

  const stateMap = useMemo(() => new Map(stateData.map(d => [d.state, d])), [stateData]);

  const maxVal = useMemo(() => {
    return Math.max(...stateData.map(d => d[metric] as number));
  }, [stateData, metric]);

  const hoveredData = hovered ? stateMap.get(hovered) : null;

  if (features.length === 0) {
    return <div className="animate-pulse h-[400px] bg-arc-gray-100 rounded" />;
  }

  return (
    <div
      className="relative"
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      <svg viewBox="-10 0 985 620" className="w-full" style={{ maxHeight: 500 }}>
        {features.map(f => {
          const d = stateMap.get(f.abbr);
          const val = d ? (d[metric] as number) : 0;
          const fill = d ? getMetricColor(val, maxVal, metric) : '#f1f5f9';
          const isHovered = hovered === f.abbr;
          return (
            <g key={f.id}>
              <path
                d={f.path}
                fill={fill}
                stroke={isHovered ? '#1a1a1a' : '#ffffff'}
                strokeWidth={isHovered ? 2 : 0.5}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.1s' }}
                onMouseEnter={() => setHovered(f.abbr)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onStateClick?.(f.abbr)}
              />
              {LABEL_STATES.has(f.abbr) && (
                <text
                  x={f.centroid[0]}
                  y={f.centroid[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight={600}
                  fill={getLabelColor(fill)}
                  pointerEvents="none"
                >
                  {f.abbr}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend bar */}
      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-arc-gray-500">
        <span>Low</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
          <div
            key={v}
            className="w-8 h-3 rounded-sm"
            style={{ backgroundColor: getMetricColor(v * maxVal, maxVal, metric) }}
          />
        ))}
        <span>High</span>
      </div>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="absolute bg-white border border-arc-gray-100 rounded p-3 shadow-lg text-xs min-w-[160px] pointer-events-none z-20"
          style={{
            left: Math.min(mousePos.x + 12, 600),
            top: mousePos.y - 10,
          }}
        >
          <p className="font-bold text-sm">{hoveredData.state}</p>
          <div className="space-y-1 mt-1">
            <p>Total: {formatNumber(hoveredData.total)}</p>
            <p>Care Rate: {formatPercent(hoveredData.careRate)}</p>
            <p className="text-arc-red">Gap Rate: {formatPercent(hoveredData.gapRate)}</p>
            <p>Avg SVI: {formatSvi(hoveredData.avgSvi)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CountyChoropleth({ stateData, metric }: ChoroplethProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [countyData, setCountyData] = useState<CountyData[]>([]);

  useEffect(() => {
    Promise.all([loadCountiesTopo(), loadCounties()]).then(([topo, counties]) => {
      setFeatures(parseCountiesTopo(topo));
      setCountyData(counties);
    });
  }, []);

  const countyMap = useMemo(() => new Map(countyData.map(d => [d.fips, d])), [countyData]);

  const maxVal = useMemo(() => {
    if (countyData.length === 0) return 1;
    return Math.max(...countyData.map(d => d[metric] as number));
  }, [countyData, metric]);

  const hoveredCounty = hovered ? countyMap.get(hovered) : null;

  // Pre-compute all paths in a memo to avoid re-rendering 3K paths
  const renderedPaths = useMemo(() => {
    return features.map(f => {
      const d = countyMap.get(f.id);
      const val = d ? (d[metric] as number) : 0;
      const fill = d ? getMetricColor(val, maxVal, metric) : '#f8fafc';
      const hasData = !!d && d.total > 0;
      return { ...f, fill, hasData };
    });
  }, [features, countyMap, maxVal, metric]);

  if (features.length === 0) {
    return (
      <div className="animate-pulse h-[400px] bg-arc-gray-100 rounded flex items-center justify-center">
        <p className="text-xs text-arc-gray-500">Loading 2,997 county boundaries...</p>
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      <svg viewBox="-10 0 985 620" className="w-full" style={{ maxHeight: 500, willChange: 'opacity' }}>
        {renderedPaths.map(f => (
          <path
            key={f.id}
            d={f.path}
            fill={f.fill}
            stroke="#e2e8f0"
            strokeWidth={0.3}
            style={{ cursor: f.hasData ? 'pointer' : 'default' }}
            onMouseEnter={f.hasData ? () => setHovered(f.id) : undefined}
            onMouseLeave={f.hasData ? () => setHovered(null) : undefined}
          />
        ))}
      </svg>

      {/* Legend bar */}
      <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-arc-gray-500">
        <span>Low</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
          <div
            key={v}
            className="w-8 h-3 rounded-sm"
            style={{ backgroundColor: getMetricColor(v * maxVal, maxVal, metric) }}
          />
        ))}
        <span>High</span>
      </div>

      {/* Tooltip follows mouse */}
      {hoveredCounty && (
        <div
          className="absolute bg-white border border-arc-gray-100 rounded p-3 shadow-lg text-xs min-w-[180px] pointer-events-none z-20"
          style={{
            left: Math.min(mousePos.x + 12, 600),
            top: mousePos.y - 10,
          }}
        >
          <p className="font-bold text-sm">{hoveredCounty.county || hoveredCounty.name}</p>
          <p className="text-[10px] text-arc-gray-500">{hoveredCounty.chapter}</p>
          <div className="space-y-1 mt-1">
            <p>Total: {formatNumber(hoveredCounty.total)}</p>
            <p>Care Rate: {formatPercent(hoveredCounty.careRate)}</p>
            <p className="text-arc-red">Gap Rate: {formatPercent(hoveredCounty.gapRate)}</p>
            <p>Avg SVI: {formatSvi(hoveredCounty.avgSvi)}</p>
            {hoveredCounty.population > 0 && (
              <p>Population: {formatNumber(hoveredCounty.population)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegionalDeepDive({ onNavigate }: { onNavigate?: (tab: string, params?: Record<string, string>) => void }) {
  const [states, setStates] = useState<StateData[] | null>(null);
  const [metric, setMetric] = useState<Metric>('total');
  const [geoLevel, setGeoLevel] = useState<GeoLevel>('state');
  const [sortBy, setSortBy] = useState<'careRate' | 'gapRate' | 'total'>('careRate');
  const [compare, setCompare] = useState<[string | null, string | null]>([null, null]);

  useEffect(() => {
    loadStates().then(setStates);
  }, []);

  const leaderboard = useMemo(() => {
    if (!states) return [];
    return [...states].sort((a, b) => {
      if (sortBy === 'careRate') return b.careRate - a.careRate;
      if (sortBy === 'gapRate') return b.gapRate - a.gapRate;
      return b.total - a.total;
    });
  }, [states, sortBy]);

  const stateA = useMemo(() => states?.find(s => s.state === compare[0]), [states, compare]);
  const stateB = useMemo(() => states?.find(s => s.state === compare[1]), [states, compare]);

  const handleStateClick = useCallback((abbr: string) => {
    // Set as first comparison state if empty, otherwise second
    setCompare(prev => {
      if (!prev[0]) return [abbr, prev[1]];
      if (!prev[1]) return [prev[0], abbr];
      return [abbr, prev[1]];
    });
  }, []);

  // Auto-generated insight
  const insight = useMemo(() => {
    if (!states || states.length < 3) return '';
    const sorted = [...states].sort((a, b) => b.total - a.total);
    const totalAll = sorted.reduce((s, d) => s + d.total, 0);
    const top3 = sorted.slice(0, 3);
    const top3Pct = ((top3.reduce((s, d) => s + d.total, 0) / totalAll) * 100).toFixed(0);
    const worstGap = [...states].sort((a, b) => b.gapRate - a.gapRate)[0];
    return `Top 3 states (${top3.map(s => s.state).join(', ')}) account for ${top3Pct}% of all fires. ${worstGap.state} has the highest gap rate at ${formatPercent(worstGap.gapRate)}.`;
  }, [states]);

  if (!states) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-arc-gray-100 rounded" />
        <div className="h-96 bg-arc-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          Regional Deep Dive
        </h2>
        <p className="text-sm text-arc-gray-500 mt-1">
          Geographic analysis across {states.length} states and territories
        </p>
        {insight && <p className="text-xs text-arc-gray-700 mt-2 bg-arc-cream rounded px-3 py-2">{insight}</p>}
      </div>

      {/* Choropleth */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
              {geoLevel === 'state' ? 'State' : 'County'} Overview
            </h3>
            <div className="flex bg-arc-gray-100 rounded overflow-hidden">
              {(['state', 'county'] as GeoLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setGeoLevel(level)}
                  className={`px-3 py-1 text-xs font-medium ${
                    geoLevel === level
                      ? 'bg-arc-black text-white'
                      : 'text-arc-gray-700 hover:bg-arc-gray-300'
                  }`}
                >
                  {level === 'state' ? 'State' : 'County'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {([
              ['total', 'Total Fires'],
              ['careRate', 'Care Rate'],
              ['gapRate', 'Gap Rate'],
              ['avgSvi', 'Avg SVI'],
            ] as [Metric, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMetric(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  metric === key
                    ? 'bg-arc-black text-white'
                    : 'bg-arc-gray-100 text-arc-gray-700 hover:bg-arc-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {geoLevel === 'state' ? (
          <StateChoropleth stateData={states} metric={metric} onStateClick={handleStateClick} onNavigate={onNavigate} />
        ) : (
          <CountyChoropleth stateData={states} metric={metric} />
        )}
      </div>

      {/* Side-by-side comparison */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
          State Comparison
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[0, 1].map(idx => (
            <select
              key={idx}
              value={compare[idx] || ''}
              onChange={e => {
                const val = e.target.value || null;
                setCompare(prev => {
                  const next = [...prev] as [string | null, string | null];
                  next[idx] = val;
                  return next;
                });
              }}
              className="px-3 py-2 text-sm border border-arc-gray-100 rounded bg-arc-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arc-red focus-visible:ring-offset-1"
            >
              <option value="">Select state...</option>
              {states.map(s => (
                <option key={s.state} value={s.state}>{s.state} ({formatNumber(s.total)} fires)</option>
              ))}
            </select>
          ))}
        </div>
        {stateA && stateB && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-arc-black">
                  <th className="text-left py-2 px-2 text-arc-gray-500">Metric</th>
                  <th className="text-right py-2 px-2 font-bold">{stateA.state}</th>
                  <th className="text-right py-2 px-2 font-bold">{stateB.state}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Total Fires', formatNumber(stateA.total), formatNumber(stateB.total)],
                  ['RC Care', formatNumber(stateA.care), formatNumber(stateB.care)],
                  ['No Notification', formatNumber(stateA.gap), formatNumber(stateB.gap)],
                  ['Care Rate', formatPercent(stateA.careRate), formatPercent(stateB.careRate)],
                  ['Gap Rate', formatPercent(stateA.gapRate), formatPercent(stateB.gapRate)],
                  ['Avg SVI', formatSvi(stateA.avgSvi), formatSvi(stateB.avgSvi)],
                ].map(([label, a, b]) => (
                  <tr key={label} className="border-b border-arc-gray-100">
                    <td className="py-2 px-2 text-arc-gray-500">{label}</td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] font-medium">{a}</td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] font-medium">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(!stateA || !stateB) && (
          <p className="text-xs text-arc-gray-500 text-center py-8">Select two states above to compare — or click states on the map</p>
        )}
      </div>

      {/* State Leaderboard */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
            State Leaderboard
          </h3>
          <div className="flex gap-2">
            {(['careRate', 'gapRate', 'total'] as const).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  sortBy === key ? 'bg-arc-black text-white' : 'bg-arc-gray-100 text-arc-gray-700'
                }`}
              >
                {key === 'careRate' ? 'Best Care Rate' : key === 'gapRate' ? 'Worst Gap Rate' : 'Most Fires'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {leaderboard.slice(0, 15).map((state, i) => (
            <div
              key={state.state}
              className="flex items-center gap-3 p-3 rounded border border-arc-gray-100 hover:bg-arc-cream/50"
            >
              <span className="font-[family-name:var(--font-data)] text-xs text-arc-gray-500 w-6 text-right">
                {i + 1}
              </span>
              <span className="font-semibold text-sm w-8">{state.state}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs">
                  <span className="text-arc-gray-500">{formatNumber(state.total)} fires</span>
                  <span className={`font-[family-name:var(--font-data)] font-medium ${
                    sortBy === 'gapRate' ? 'text-arc-red' : sortBy === 'careRate' ? 'text-arc-success' : ''
                  }`}>
                    {sortBy === 'careRate' ? formatPercent(state.careRate) :
                     sortBy === 'gapRate' ? formatPercent(state.gapRate) :
                     formatNumber(state.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {/* Mini bar */}
                  <div className="flex-1 h-1.5 bg-arc-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${sortBy === 'careRate' ? state.careRate : sortBy === 'gapRate' ? state.gapRate : (state.total / leaderboard[0].total) * 100}%`,
                        backgroundColor: sortBy === 'gapRate' ? '#ED1B2E' : sortBy === 'careRate' ? '#2d5a27' : '#4a4a4a',
                      }}
                    />
                  </div>
                  {/* Sparkline */}
                  {state.monthly && state.monthly.length > 0 && (
                    <div className="w-16 h-4 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={state.monthly}>
                          <Line
                            type="monotone"
                            dataKey={sortBy === 'gapRate' ? 'gap' : 'total'}
                            stroke={sortBy === 'gapRate' ? '#ED1B2E' : sortBy === 'careRate' ? '#2d5a27' : '#4a4a4a'}
                            strokeWidth={1}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
