'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SviQuintileBucket } from '@/lib/types';
import { formatNumber } from '@/lib/format';

interface SviQuintileChartProps {
  quintiles: SviQuintileBucket[];
}

const SVI_COLORS = ['#22c55e', '#86efac', '#fbbf24', '#f87171', '#991b1b'];

export default function SviQuintileChart({ quintiles }: SviQuintileChartProps) {
  const chartData = quintiles.map((q, i) => ({
    label: q.label,
    'Care Rate': q.careRate,
    'Gap Rate': q.gapRate,
    total: q.total,
    counties: q.countyCount,
    fill: SVI_COLORS[i],
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
            formatter={(value) => [`${Number(value).toFixed(1)}%`]}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return item ? `${label} SVI (${formatNumber(item.total)} fires, ${item.counties} counties)` : label;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Care Rate" fill="#2d5a27" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Gap Rate" fill="#ED1B2E" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
