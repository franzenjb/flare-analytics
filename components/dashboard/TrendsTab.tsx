'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useFlare } from '@/lib/context';
import { loadDaily } from '@/lib/data-loader';
import { formatNumber, formatMonth, formatPercent } from '@/lib/format';
import type { DailyData, AggregatedRow } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';
import SectionHeader from '@/components/ui/SectionHeader';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_SIZE = 14;
const CELL_GAP = 2;

function CalendarHeatmap({ data, mode }: { data: DailyData[]; mode: 'total' | 'gap' }) {
  const { cells, weeks, maxVal } = useMemo(() => {
    const map = new Map(data.map(d => [d.date, d]));
    const endDate = new Date(2024, 11, 31);
    const firstDay = new Date(2024, 0, 1);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    const cells: { date: string; dow: number; week: number; value: number; data?: DailyData }[] = [];
    let maxVal = 0;
    let current = new Date(firstDay);
    let week = 0;

    while (current <= endDate || current.getDay() !== 0) {
      const dateStr = current.toISOString().split('T')[0];
      const dayData = map.get(dateStr);
      const value = dayData ? (mode === 'gap' ? dayData.gap : dayData.total) : 0;
      const isInYear = current.getFullYear() === 2024;
      if (isInYear && value > maxVal) maxVal = value;

      cells.push({ date: dateStr, dow: current.getDay(), week, value: isInYear ? value : -1, data: dayData });
      current.setDate(current.getDate() + 1);
      if (current.getDay() === 0) week++;
      if (current > endDate && current.getDay() === 0) break;
    }
    return { cells, weeks: week, maxVal };
  }, [data, mode]);

  const [hovered, setHovered] = useState<typeof cells[0] | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  function getColor(value: number, max: number) {
    if (value < 0) return '#f7f5f2';
    if (value === 0) return '#e5e5e5';
    const intensity = value / max;
    if (mode === 'gap') {
      if (intensity > 0.75) return '#c41e3a';
      if (intensity > 0.5) return '#ED1B2E';
      if (intensity > 0.25) return '#f58b98';
      return '#fdd5d9';
    }
    if (intensity > 0.75) return '#2d2d2d';
    if (intensity > 0.5) return '#4a4a4a';
    if (intensity > 0.25) return '#737373';
    return '#a3a3a3';
  }

  const svgWidth = (weeks + 2) * (CELL_SIZE + CELL_GAP) + 30;

  return (
    <div className="relative">
      <div
        className="overflow-x-auto"
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => { setHovered(null); setMousePos(null); }}
      >
        <svg width={svgWidth} height={7 * (CELL_SIZE + CELL_GAP) + 30}>
          {DAYS_OF_WEEK.map((day, i) => (
            i % 2 === 1 && (
              <text key={day} x={0} y={i * (CELL_SIZE + CELL_GAP) + 22} fontSize={9} fill="#737373">{day}</text>
            )
          ))}
          {Array.from({ length: 12 }, (_, m) => {
            const firstOfMonth = new Date(2024, m, 1);
            const startOfYear = new Date(2024, 0, 1);
            const dayOfYear = Math.floor((firstOfMonth.getTime() - startOfYear.getTime()) / 86400000);
            const weekNum = Math.floor((dayOfYear + startOfYear.getDay()) / 7);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return (
              <text key={m} x={30 + weekNum * (CELL_SIZE + CELL_GAP)} y={7 * (CELL_SIZE + CELL_GAP) + 26} fontSize={9} fill="#737373">
                {months[m]}
              </text>
            );
          })}
          {cells.map((cell, i) => (
            <rect
              key={i}
              x={30 + cell.week * (CELL_SIZE + CELL_GAP)}
              y={cell.dow * (CELL_SIZE + CELL_GAP) + 10}
              width={CELL_SIZE} height={CELL_SIZE} rx={2}
              fill={getColor(cell.value, maxVal)}
              onMouseEnter={() => setHovered(cell)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: cell.value >= 0 ? 'pointer' : 'default' }}
            />
          ))}
        </svg>
      </div>
      {hovered && hovered.value >= 0 && hovered.data && mousePos && (
        <div className="absolute bg-white border border-arc-gray-100 rounded p-3 shadow-sm text-xs pointer-events-none z-10" style={{ left: mousePos.x + 12, top: mousePos.y - 70 }}>
          <p className="font-semibold">{hovered.date}</p>
          <p>Total: {formatNumber(hovered.data.total)}</p>
          <p>Care: {formatNumber(hovered.data.care)}</p>
          <p className="text-arc-red">Gap: {formatNumber(hovered.data.gap)}</p>
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 text-[10px] text-arc-gray-500">
        <span>Less</span>
        {(mode === 'gap' ? ['#fdd5d9', '#f58b98', '#ED1B2E', '#c41e3a'] : ['#a3a3a3', '#737373', '#4a4a4a', '#2d2d2d']).map((color, i) => (
          <span key={i} className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// Compute trend slope from monthly gap rate series
interface TrendRow {
  name: string;
  total: number;
  q1GapRate: number;
  q4GapRate: number;
  change: number;
  direction: 'worsening' | 'improving' | 'stable';
}

function computeTrendRankings(entities: AggregatedRow[]): TrendRow[] {
  return entities
    .filter(e => e.monthly.length >= 6 && e.total >= 50)
    .map(e => {
      const monthly = e.monthly;
      const q1 = monthly.slice(0, 3);
      const q4 = monthly.slice(-3);
      const q1Total = q1.reduce((s, m) => s + m.total, 0);
      const q1Gap = q1.reduce((s, m) => s + m.gap, 0);
      const q4Total = q4.reduce((s, m) => s + m.total, 0);
      const q4Gap = q4.reduce((s, m) => s + m.gap, 0);
      const q1GapRate = q1Total > 0 ? (q1Gap / q1Total) * 100 : 0;
      const q4GapRate = q4Total > 0 ? (q4Gap / q4Total) * 100 : 0;
      const change = q4GapRate - q1GapRate;

      return {
        name: e.name,
        total: e.total,
        q1GapRate: +q1GapRate.toFixed(1),
        q4GapRate: +q4GapRate.toFixed(1),
        change: +change.toFixed(1),
        direction: change > 3 ? 'worsening' as const : change < -3 ? 'improving' as const : 'stable' as const,
      };
    })
    .sort((a, b) => b.change - a.change);
}

export default function TrendsTab() {
  const { filteredCounties, filteredNational, filters, aggregateBy } = useFlare();
  const [daily, setDaily] = useState<DailyData[] | null>(null);
  const [calendarMode, setCalendarMode] = useState<'total' | 'gap'>('total');

  useEffect(() => {
    loadDaily().then(setDaily);
  }, []);

  // Monthly data from filtered national
  const monthlyChart = useMemo(() =>
    filteredNational.monthly.map(d => ({
      month: formatMonth(d.month),
      'RC Care': d.care,
      'RC Notification': d.notification,
      'No Notification': d.gap,
    })),
  [filteredNational]);

  // Day of week from daily data (filter-aware if we had filtered daily, but by-day.json is national)
  const dowData = useMemo(() => {
    if (!daily) return [];
    const dows = Array.from({ length: 7 }, () => ({ care: 0, notification: 0, gap: 0, count: 0 }));
    daily.forEach(d => {
      const dow = new Date(d.date + 'T00:00:00').getDay();
      dows[dow].care += d.care;
      dows[dow].notification += d.notification;
      dows[dow].gap += d.gap;
      dows[dow].count++;
    });
    return DAYS_OF_WEEK.map((name, i) => ({
      day: name,
      'RC Care': Math.round(dows[i].care / (dows[i].count || 1)),
      'RC Notification': Math.round(dows[i].notification / (dows[i].count || 1)),
      'No Notification': Math.round(dows[i].gap / (dows[i].count || 1)),
    }));
  }, [daily]);

  // Trend Rankings
  const { trendEntities, trendLabel } = useMemo(() => {
    if (filters.region) return { trendEntities: aggregateBy('chapter'), trendLabel: 'Chapters' };
    if (filters.division) return { trendEntities: aggregateBy('region'), trendLabel: 'Regions' };
    return { trendEntities: aggregateBy('division').length > 1 ? aggregateBy('division') : aggregateBy('region'), trendLabel: filters.division ? 'Regions' : 'Divisions/Regions' };
  }, [filters, aggregateBy]);

  const trendRankings = useMemo(() => computeTrendRankings(trendEntities), [trendEntities]);

  const trendCols: ColumnDef<TrendRow>[] = [
    { key: 'name', label: 'Entity', sortable: true, width: '200px' },
    { key: 'total', label: 'Fires', align: 'right', sortable: true, format: v => formatNumber(Number(v)) },
    { key: 'q1GapRate', label: 'Q1 Gap %', align: 'right', sortable: true, format: v => formatPercent(Number(v)) },
    { key: 'q4GapRate', label: 'Q4 Gap %', align: 'right', sortable: true, format: v => formatPercent(Number(v)),
      heatmap: { min: 20, max: 70, lowColor: '#22c55e', highColor: '#fca5a5' } },
    { key: 'change', label: 'Change (pp)', align: 'right', sortable: true,
      format: (v) => {
        const n = Number(v);
        return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
      },
      heatmap: { min: -10, max: 10, lowColor: '#22c55e', highColor: '#fca5a5' },
    },
    { key: 'direction', label: 'Trend', align: 'center', sortable: true,
      format: (v) => String(v),
    },
  ];

  const insight = useMemo(() => {
    if (!dowData.length) return '';
    const totals = dowData.map(d => ({ day: d.day, total: d['RC Care'] + d['RC Notification'] + d['No Notification'] }));
    const peak = totals.reduce((a, b) => a.total > b.total ? a : b);
    const trough = totals.reduce((a, b) => a.total < b.total ? a : b);
    const pct = ((peak.total / trough.total - 1) * 100).toFixed(0);
    return `Fires peak on ${peak.day}s — ${pct}% higher than ${trough.day}s.`;
  }, [dowData]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trends"
        subtitle="When fires happen, which entities are getting worse, and seasonal patterns"
      />

      {insight && <p className="text-xs text-arc-gray-700 bg-arc-cream rounded px-3 py-2">{insight}</p>}

      {/* Calendar Heatmap */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
              2024 Calendar Heatmap
            </h3>
            <p className="text-xs text-arc-gray-500 mt-0.5">Daily fire events — hover for detail</p>
          </div>
          <div className="flex gap-2">
            {(['total', 'gap'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setCalendarMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  calendarMode === mode
                    ? mode === 'gap' ? 'bg-arc-red text-white' : 'bg-arc-black text-white'
                    : 'bg-arc-gray-100 text-arc-gray-700 hover:bg-arc-gray-300'
                }`}
              >
                {mode === 'total' ? 'All Fires' : 'Gap Only'}
              </button>
            ))}
          </div>
        </div>
        {daily ? <CalendarHeatmap data={daily} mode={calendarMode} /> : <div className="h-32 animate-pulse bg-arc-gray-100 rounded" />}
      </div>

      {/* Monthly + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded p-5 border border-arc-gray-100">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
            Monthly Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }} formatter={(value) => formatNumber(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="RC Care" stackId="a" fill={CATEGORY_COLORS.care} isAnimationActive={false} />
              <Bar dataKey="RC Notification" stackId="a" fill={CATEGORY_COLORS.notification} isAnimationActive={false} />
              <Bar dataKey="No Notification" stackId="a" fill={CATEGORY_COLORS.gap} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded p-5 border border-arc-gray-100">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
            Day of Week Patterns
          </h3>
          <p className="text-xs text-arc-gray-500 mb-4">Average daily fires by day of week</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dowData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="RC Care" stackId="a" fill={CATEGORY_COLORS.care} isAnimationActive={false} />
              <Bar dataKey="RC Notification" stackId="a" fill={CATEGORY_COLORS.notification} isAnimationActive={false} />
              <Bar dataKey="No Notification" stackId="a" fill={CATEGORY_COLORS.gap} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Rankings */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
          Trend Rankings — {trendLabel}
        </h3>
        <p className="text-xs text-arc-gray-500 mb-4">
          Which entities are getting worse? Comparing Q1 (Jan-Mar) gap rate to Q4 (Oct-Dec) gap rate.
        </p>

        {/* Summary badges */}
        <div className="flex gap-3 mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-red-50 text-arc-red">
            <TrendingUp size={10} /> {trendRankings.filter(t => t.direction === 'worsening').length} worsening
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-green-50 text-arc-success">
            <TrendingDown size={10} /> {trendRankings.filter(t => t.direction === 'improving').length} improving
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-gray-50 text-arc-gray-500">
            <Minus size={10} /> {trendRankings.filter(t => t.direction === 'stable').length} stable
          </span>
        </div>

        <DataTable
          data={trendRankings}
          columns={trendCols}
          searchable
          searchFields={['name']}
          pageSize={20}
          exportFilename="flare-trend-rankings"
          highlightFn={r => r.direction === 'worsening'}
          rowKey={r => r.name}
        />
      </div>
    </div>
  );
}
