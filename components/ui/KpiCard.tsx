'use client';

interface KpiDelta {
  label: string;
  value: number;
  good: boolean;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon?: React.ElementType;
  highlight?: boolean;
  subtext?: string;
  deltas?: KpiDelta[];
  sparklineData?: number[];
}

export default function KpiCard({ label, value, highlight, subtext, deltas }: KpiCardProps) {
  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <p className="text-sm font-medium text-arc-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`font-[family-name:var(--font-data)] text-4xl font-semibold ${highlight ? 'text-arc-red' : 'text-arc-black'}`}>
        {value}
      </p>
      {subtext && <p className="text-sm text-arc-gray-500 mt-2">{subtext}</p>}
      {deltas && deltas.length > 0 && (
        <p className={`text-xs font-[family-name:var(--font-data)] mt-2 ${deltas[0].good ? 'text-arc-success' : 'text-arc-red'}`}>
          {deltas[0].value >= 0 ? '+' : ''}{deltas[0].value.toFixed(1)}pp {deltas[0].label}
        </p>
      )}
    </div>
  );
}
