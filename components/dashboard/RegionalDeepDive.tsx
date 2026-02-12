'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { loadStates } from '@/lib/data-loader';
import { formatNumber, formatPercent, formatSvi } from '@/lib/format';
import type { StateData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

// Simplified US state positions for SVG choropleth
const STATE_POSITIONS: Record<string, [number, number]> = {
  AK: [1, 0], HI: [1, 6], WA: [1, 1], OR: [1, 2], CA: [1, 3],
  NV: [2, 2], ID: [2, 1], MT: [3, 1], WY: [3, 2], UT: [2, 3],
  CO: [3, 3], AZ: [2, 4], NM: [3, 4], ND: [4, 1], SD: [4, 2],
  NE: [4, 3], KS: [4, 4], OK: [4, 5], TX: [3, 5], MN: [5, 1],
  IA: [5, 2], MO: [5, 3], AR: [5, 4], LA: [4, 6], WI: [6, 1],
  IL: [6, 2], MS: [5, 5], AL: [6, 5], MI: [7, 1], IN: [7, 2],
  OH: [7, 3], TN: [6, 4], GA: [7, 5], KY: [7, 4], FL: [7, 6],
  WV: [8, 3], VA: [8, 4], NC: [8, 5], SC: [8, 6], PA: [8, 2],
  NY: [9, 1], NJ: [9, 2], DE: [9, 3], MD: [9, 4], DC: [9, 5],
  CT: [10, 1], RI: [10, 2], MA: [10, 3], VT: [11, 1], NH: [11, 2],
  ME: [11, 3], PR: [2, 7], GU: [1, 7], VI: [3, 7],
};

type Metric = 'total' | 'careRate' | 'gapRate' | 'avgSvi';

function StateChoropleth({ data, metric }: { data: StateData[]; metric: Metric }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const stateMap = useMemo(() => new Map(data.map(d => [d.state, d])), [data]);

  const maxVal = useMemo(() => {
    return Math.max(...data.map(d => d[metric] as number));
  }, [data, metric]);

  function getColor(state: string): string {
    const d = stateMap.get(state);
    if (!d) return '#e5e5e5';
    const val = d[metric] as number;
    const intensity = val / maxVal;

    if (metric === 'gapRate') {
      // Red scale for gaps
      if (intensity > 0.8) return '#c41e3a';
      if (intensity > 0.6) return '#ED1B2E';
      if (intensity > 0.4) return '#f58b98';
      if (intensity > 0.2) return '#fdd5d9';
      return '#fef0f1';
    }
    if (metric === 'careRate') {
      // Green scale for care
      if (intensity > 0.8) return '#1a4a14';
      if (intensity > 0.6) return '#2d5a27';
      if (intensity > 0.4) return '#5a8a54';
      if (intensity > 0.2) return '#a3c89e';
      return '#dceeda';
    }
    // Gray scale for total / svi
    if (intensity > 0.8) return '#2d2d2d';
    if (intensity > 0.6) return '#4a4a4a';
    if (intensity > 0.4) return '#737373';
    if (intensity > 0.2) return '#a3a3a3';
    return '#d4d4d4';
  }

  const CELL = 42;
  const GAP = 3;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${12 * (CELL + GAP)} ${9 * (CELL + GAP)}`} className="w-full max-w-[700px]">
        {Object.entries(STATE_POSITIONS).map(([state, [col, row]]) => {
          const x = col * (CELL + GAP);
          const y = row * (CELL + GAP);
          const d = stateMap.get(state);
          return (
            <g
              key={state}
              onMouseEnter={() => setHovered(state)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect x={x} y={y} width={CELL} height={CELL} rx={3} fill={getColor(state)}
                stroke={hovered === state ? '#1a1a1a' : '#ffffff'} strokeWidth={hovered === state ? 2 : 1}
              />
              <text x={x + CELL / 2} y={y + CELL / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fontWeight={600}
                fill={getColor(state) === '#e5e5e5' || getColor(state).startsWith('#f') || getColor(state).startsWith('#d') || getColor(state).startsWith('#a') ? '#4a4a4a' : '#ffffff'}
              >
                {state}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && stateMap.has(hovered) && (
        <div className="absolute top-2 right-2 bg-white border border-arc-gray-100 rounded p-3 shadow-sm text-xs min-w-[160px]">
          <p className="font-bold text-sm">{hovered}</p>
          <div className="space-y-1 mt-1">
            <p>Total: {formatNumber(stateMap.get(hovered)!.total)}</p>
            <p>Care Rate: {formatPercent(stateMap.get(hovered)!.careRate)}</p>
            <p className="text-arc-red">Gap Rate: {formatPercent(stateMap.get(hovered)!.gapRate)}</p>
            <p>Avg SVI: {formatSvi(stateMap.get(hovered)!.avgSvi)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegionalDeepDive() {
  const [states, setStates] = useState<StateData[] | null>(null);
  const [metric, setMetric] = useState<Metric>('total');
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
      </div>

      {/* Choropleth */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
            State Overview
          </h3>
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
        <StateChoropleth data={states} metric={metric} />
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
              className="px-3 py-2 text-sm border border-arc-gray-100 rounded bg-arc-cream focus:outline-none focus:border-arc-gray-300"
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
          <p className="text-xs text-arc-gray-500 text-center py-8">Select two states above to compare</p>
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
              <div className="flex-1">
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
                {/* Mini bar */}
                <div className="h-1.5 bg-arc-gray-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${sortBy === 'careRate' ? state.careRate : sortBy === 'gapRate' ? state.gapRate : (state.total / leaderboard[0].total) * 100}%`,
                      backgroundColor: sortBy === 'gapRate' ? '#ED1B2E' : sortBy === 'careRate' ? '#2d5a27' : '#4a4a4a',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
