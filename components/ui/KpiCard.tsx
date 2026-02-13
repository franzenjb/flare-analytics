'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import SparkLine from './SparkLine';

interface KpiDelta {
  label: string;
  value: number; // pp difference
  good: boolean;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
  subtext?: string;
  deltas?: KpiDelta[];
  sparklineData?: number[];
}

export default function KpiCard({ label, value, icon: Icon, highlight, subtext, deltas, sparklineData }: KpiCardProps) {
  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-arc-gray-500 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2">
          {sparklineData && sparklineData.length >= 2 && (
            <SparkLine data={sparklineData} color={highlight ? '#ED1B2E' : '#64748b'} />
          )}
          <Icon size={20} className={highlight ? 'text-arc-red' : 'text-arc-gray-300'} />
        </div>
      </div>
      <div className={`font-[family-name:var(--font-data)] text-4xl font-semibold ${highlight ? 'text-arc-red' : 'text-arc-black'}`}>
        {value}
      </div>
      {subtext && <p className="text-sm text-arc-gray-500 mt-1">{subtext}</p>}
      {deltas && deltas.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-2">
          {deltas.map((d, i) => (
            <div key={i} className={`flex items-center gap-1 text-xs font-[family-name:var(--font-data)] ${d.good ? 'text-arc-success' : 'text-arc-red'}`}>
              {d.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {d.value >= 0 ? '+' : ''}{d.value.toFixed(1)}pp {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
