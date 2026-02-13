'use client';

// Horizontal comparison bar: entity value vs parent avg vs national avg

interface PeerBenchmarkProps {
  label: string;
  value: number;
  parentValue: number;
  nationalValue: number;
  format?: (n: number) => string;
  higherIsBetter?: boolean;
}

export default function PeerBenchmark({
  label, value, parentValue, nationalValue,
  format = (n) => `${n.toFixed(1)}%`,
  higherIsBetter = true,
}: PeerBenchmarkProps) {
  const max = Math.max(value, parentValue, nationalValue, 1);
  const pctValue = (value / max) * 100;
  const pctParent = (parentValue / max) * 100;
  const pctNational = (nationalValue / max) * 100;

  const isGood = higherIsBetter ? value >= parentValue : value <= parentValue;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-arc-gray-500">{label}</span>
        <span className={`font-[family-name:var(--font-data)] text-xs font-semibold ${isGood ? 'text-arc-success' : 'text-arc-red'}`}>
          {format(value)}
        </span>
      </div>
      <div className="relative h-4 bg-arc-gray-100 rounded overflow-hidden">
        {/* Value bar */}
        <div
          className={`absolute top-0 left-0 h-full rounded ${isGood ? 'bg-arc-success/60' : 'bg-arc-red/60'}`}
          style={{ width: `${pctValue}%` }}
        />
        {/* Parent marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-arc-info"
          style={{ left: `${pctParent}%` }}
          title={`Parent: ${format(parentValue)}`}
        />
        {/* National marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-arc-gray-700"
          style={{ left: `${pctNational}%` }}
          title={`National: ${format(nationalValue)}`}
        />
      </div>
      <div className="flex items-center gap-3 text-[9px] text-arc-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-arc-info rounded-full inline-block" />Parent {format(parentValue)}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-arc-gray-700 rounded-full inline-block" />National {format(nationalValue)}</span>
      </div>
    </div>
  );
}
