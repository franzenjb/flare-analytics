'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { loadDaily, loadMonthly } from '@/lib/data-loader';
import { formatNumber, formatMonth } from '@/lib/format';
import type { DailyData, MonthlyData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

// Calendar heatmap constants
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_SIZE = 14;
const CELL_GAP = 2;

function CalendarHeatmap({ data, mode }: { data: DailyData[]; mode: 'total' | 'gap' }) {
  const { cells, weeks, maxVal } = useMemo(() => {
    const map = new Map(data.map(d => [d.date, d]));
    const startDate = new Date(2024, 0, 1);
    const endDate = new Date(2024, 11, 31);
    const cells: { date: string; dow: number; week: number; value: number; data?: DailyData }[] = [];

    // Find first Sunday before or on Jan 1
    const firstDay = new Date(startDate);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    let maxVal = 0;
    let current = new Date(firstDay);
    let week = 0;

    while (current <= endDate || current.getDay() !== 0) {
      const dateStr = current.toISOString().split('T')[0];
      const dayData = map.get(dateStr);
      const value = dayData ? (mode === 'gap' ? dayData.gap : dayData.total) : 0;
      const isInYear = current.getFullYear() === 2024;

      if (isInYear && value > maxVal) maxVal = value;

      cells.push({
        date: dateStr,
        dow: current.getDay(),
        week,
        value: isInYear ? value : -1, // -1 = outside 2024
        data: dayData,
      });

      current.setDate(current.getDate() + 1);
      if (current.getDay() === 0) week++;
      if (current > endDate && current.getDay() === 0) break;
    }

    return { cells, weeks: week, maxVal };
  }, [data, mode]);

  const [hovered, setHovered] = useState<typeof cells[0] | null>(null);

  function getColor(value: number, max: number) {
    if (value < 0) return '#f7f5f2'; // outside year
    if (value === 0) return '#e5e5e5';
    const intensity = value / max;
    if (mode === 'gap') {
      // Red scale
      if (intensity > 0.75) return '#c41e3a';
      if (intensity > 0.5) return '#ED1B2E';
      if (intensity > 0.25) return '#f58b98';
      return '#fdd5d9';
    }
    // Gray scale
    if (intensity > 0.75) return '#2d2d2d';
    if (intensity > 0.5) return '#4a4a4a';
    if (intensity > 0.25) return '#737373';
    return '#a3a3a3';
  }

  const svgWidth = (weeks + 2) * (CELL_SIZE + CELL_GAP) + 30;

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <svg width={svgWidth} height={7 * (CELL_SIZE + CELL_GAP) + 30}>
          {/* Day labels */}
          {DAYS_OF_WEEK.map((day, i) => (
            i % 2 === 1 && (
              <text key={day} x={0} y={i * (CELL_SIZE + CELL_GAP) + 22} fontSize={9} fill="#737373">
                {day}
              </text>
            )
          ))}
          {/* Month labels */}
          {Array.from({ length: 12 }, (_, m) => {
            const firstOfMonth = new Date(2024, m, 1);
            const startOfYear = new Date(2024, 0, 1);
            const dayOfYear = Math.floor((firstOfMonth.getTime() - startOfYear.getTime()) / 86400000);
            const weekNum = Math.floor((dayOfYear + startOfYear.getDay()) / 7);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return (
              <text
                key={m}
                x={30 + weekNum * (CELL_SIZE + CELL_GAP)}
                y={7 * (CELL_SIZE + CELL_GAP) + 26}
                fontSize={9}
                fill="#737373"
              >
                {months[m]}
              </text>
            );
          })}
          {/* Cells */}
          {cells.map((cell, i) => (
            <rect
              key={i}
              x={30 + cell.week * (CELL_SIZE + CELL_GAP)}
              y={cell.dow * (CELL_SIZE + CELL_GAP) + 10}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={getColor(cell.value, maxVal)}
              onMouseEnter={() => setHovered(cell)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: cell.value >= 0 ? 'pointer' : 'default' }}
            />
          ))}
        </svg>
      </div>
      {hovered && hovered.value >= 0 && hovered.data && (
        <div className="absolute top-0 right-0 bg-white border border-arc-gray-100 rounded p-3 shadow-sm text-xs">
          <p className="font-semibold">{hovered.date}</p>
          <p>Total: {formatNumber(hovered.data.total)}</p>
          <p>Care: {formatNumber(hovered.data.care)}</p>
          <p>Notification: {formatNumber(hovered.data.notification)}</p>
          <p className="text-arc-red">Gap: {formatNumber(hovered.data.gap)}</p>
        </div>
      )}
    </div>
  );
}

export default function TemporalPatterns() {
  const [daily, setDaily] = useState<DailyData[] | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[] | null>(null);
  const [calendarMode, setCalendarMode] = useState<'total' | 'gap'>('total');

  useEffect(() => {
    loadDaily().then(setDaily);
    loadMonthly().then(setMonthly);
  }, []);

  const dowData = useMemo(() => {
    if (!daily) return [];
    const dows: { care: number; notification: number; gap: number; count: number }[] = Array.from(
      { length: 7 },
      () => ({ care: 0, notification: 0, gap: 0, count: 0 })
    );
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

  if (!daily || !monthly) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 bg-arc-gray-100 rounded" />
        <div className="h-64 bg-arc-gray-100 rounded" />
      </div>
    );
  }

  const monthlyChart = monthly.map(d => ({
    month: formatMonth(d.month),
    'RC Care': d.care,
    'RC Notification': d.notification,
    'No Notification': d.gap,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          Temporal Patterns
        </h2>
        <p className="text-sm text-arc-gray-500 mt-1">When fires happen and when RC misses them</p>
      </div>

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
        <CalendarHeatmap data={daily} mode={calendarMode} />
      </div>

      {/* Monthly + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly comparison */}
        <div className="bg-white rounded p-5 border border-arc-gray-100">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
            Monthly Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChart} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
                formatter={(value) => formatNumber(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="RC Care" fill={CATEGORY_COLORS.care} isAnimationActive={false} />
              <Bar dataKey="RC Notification" fill={CATEGORY_COLORS.notification} isAnimationActive={false} />
              <Bar dataKey="No Notification" fill={CATEGORY_COLORS.gap} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day of week */}
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
              <Tooltip
                contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="RC Care" stackId="a" fill={CATEGORY_COLORS.care} isAnimationActive={false} />
              <Bar dataKey="RC Notification" stackId="a" fill={CATEGORY_COLORS.notification} isAnimationActive={false} />
              <Bar dataKey="No Notification" stackId="a" fill={CATEGORY_COLORS.gap} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
