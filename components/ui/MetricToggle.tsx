'use client';

import { useFlare } from '@/lib/context';
import type { MetricMode } from '@/lib/types';

const OPTIONS: { mode: MetricMode; label: string }[] = [
  { mode: 'raw', label: 'Raw' },
  { mode: 'perCapita', label: 'Per 10K Pop' },
  { mode: 'perHousehold', label: 'Per 10K HH' },
];

export default function MetricToggle() {
  const { metricMode, setMetricMode } = useFlare();

  return (
    <div className="flex items-center bg-white rounded border border-arc-gray-100" role="radiogroup" aria-label="Metric mode">
      {OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          role="radio"
          aria-checked={metricMode === mode}
          onClick={() => setMetricMode(mode)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            metricMode === mode
              ? 'bg-arc-black text-white'
              : 'text-arc-gray-500 hover:text-arc-black'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
