'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { SviQuintileBucket } from '@/lib/types';
import { formatNumber } from '@/lib/format';

interface SviQuintileChartProps {
  quintiles: SviQuintileBucket[];
}

// Green → Red gradient: low vulnerability = green, high = red
const BAR_COLORS = ['#22c55e', '#86efac', '#fbbf24', '#f87171', '#dc2626'];

export default function SviQuintileChart({ quintiles }: SviQuintileChartProps) {
  const chartData = quintiles.map((q) => ({
    label: q.label,
    gapRate: q.gapRate,
    total: q.total,
    counties: q.countyCount,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="25%" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Gap Rate']}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return item ? `${label} SVI — ${formatNumber(item.total)} fires, ${item.counties} counties` : label;
            }}
          />
          <Bar dataKey="gapRate" radius={[3, 3, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-center text-[10px] text-arc-gray-400 mt-1">Gap Rate by Social Vulnerability Index quintile</p>
    </div>
  );
}
