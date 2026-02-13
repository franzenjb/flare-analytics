'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { AlertTriangle, Target, Clock, Eye } from 'lucide-react';
import { loadGapAnalysis, loadSummary, loadChapters } from '@/lib/data-loader';
import { formatNumber, formatPercent, formatSvi, formatCompact } from '@/lib/format';
import type { GapAnalysisData, SummaryData, OrgUnitData } from '@/lib/types';

function PriorityMatrix({ data }: { data: GapAnalysisData[] }) {
  const medianSvi = data.length > 0
    ? [...data].sort((a, b) => a.avgSvi - b.avgSvi)[Math.floor(data.length / 2)].avgSvi
    : 0.5;
  const medianGap = data.length > 0
    ? [...data].sort((a, b) => a.gapCount - b.gapCount)[Math.floor(data.length / 2)].gapCount
    : 500;

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
        Priority Matrix
      </h3>
      <p className="text-xs text-arc-gray-500 mb-4">States by risk level vs. notification gap</p>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <ReferenceArea
            x1={medianSvi}
            x2={1}
            y1={medianGap}
            y2={data.reduce((max, d) => Math.max(max, d.gapCount), 0) * 1.1}
            fill="#ED1B2E"
            fillOpacity={0.05}
          />
          <XAxis
            type="number"
            dataKey="avgSvi"
            name="Avg SVI Risk"
            domain={[0.2, 0.9]}
            tick={{ fontSize: 11 }}
            label={{ value: 'Avg SVI Risk Score', position: 'bottom', offset: 5, style: { fontSize: 11 } }}
          />
          <YAxis
            type="number"
            dataKey="gapCount"
            name="Gap Count"
            tick={{ fontSize: 11 }}
            label={{ value: 'Fires Without Notification', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 11 } }}
          />
          <ReferenceLine x={medianSvi} stroke="#a3a3a3" strokeDasharray="3 3" />
          <ReferenceLine y={medianGap} stroke="#a3a3a3" strokeDasharray="3 3" />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload as GapAnalysisData;
              return (
                <div className="bg-white border border-arc-gray-100 rounded p-3 shadow-sm">
                  <p className="font-bold text-sm">{d.state}</p>
                  <p className="text-xs text-arc-gray-500">Gap: {formatNumber(d.gapCount)} fires</p>
                  <p className="text-xs text-arc-gray-500">Avg SVI: {formatSvi(d.avgSvi)}</p>
                  <p className="text-xs text-arc-red font-medium">Score: {d.opportunityScore.toFixed(0)}</p>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            isAnimationActive={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: GapAnalysisData };
              if (cx == null || cy == null) return <circle />;
              const isCritical = payload.avgSvi >= medianSvi && payload.gapCount >= medianGap;
              const r = Math.max(6, Math.min(20, payload.totalFires / 400));
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={isCritical ? '#ED1B2E' : '#737373'}
                    fillOpacity={0.7}
                    stroke={isCritical ? '#c41e3a' : '#4a4a4a'}
                    strokeWidth={1}
                  />
                  {(isCritical || payload.totalFires >= 3000) && (
                    <text
                      x={cx}
                      y={cy - r - 4}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill="#1a1a1a"
                    >
                      {payload.state}
                    </text>
                  )}
                </g>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[10px] text-arc-gray-500 justify-center">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-arc-red" /> Critical (high risk + high gap)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-arc-gray-300" /> Other states</span>
        <span>Bubble size = total fires</span>
      </div>
    </div>
  );
}

function OpportunityTable({ data }: { data: GapAnalysisData[] }) {
  const [sortBy, setSortBy] = useState<'opportunityScore' | 'gapCount' | 'avgSvi' | 'gapRate'>('opportunityScore');
  const sorted = useMemo(() => [...data].sort((a, b) => b[sortBy] - a[sortBy]), [data, sortBy]);

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
        Opportunity Score Rankings
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b-2 border-arc-black">
              <th className="text-left py-2 px-2 font-medium text-arc-gray-500">#</th>
              <th className="text-left py-2 px-2 font-medium text-arc-gray-500">State</th>
              {([
                ['opportunityScore', 'Opp. Score'],
                ['gapCount', 'Gap Fires'],
                ['avgSvi', 'Avg SVI'],
                ['gapRate', 'Gap Rate'],
              ] as const).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`text-right py-2 px-2 font-medium cursor-pointer hover:text-arc-black ${
                    sortBy === key ? 'text-arc-red' : 'text-arc-gray-500'
                  }`}
                >
                  {label} {sortBy === key ? '▼' : ''}
                </th>
              ))}
              <th className="text-right py-2 px-2 font-medium text-arc-gray-500">Care Rate</th>
              <th className="text-right py-2 px-2 font-medium text-arc-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const urgency = row.opportunityScore >= 1000 ? 'critical' : row.opportunityScore >= 500 ? 'high' : 'normal';
              const gapHeat = row.gapRate >= 45 ? 'bg-red-50' : row.gapRate < 30 ? 'bg-green-50' : '';
              const careHeat = row.careRate >= 55 ? 'bg-green-50' : row.careRate < 35 ? 'bg-red-50' : '';
              const sviHeat = row.avgSvi >= 0.65 ? 'bg-red-50' : row.avgSvi < 0.5 ? 'bg-green-50' : '';
              const rowStripe = i % 2 === 1 ? 'bg-arc-cream/30' : '';
              return (
                <tr
                  key={row.state}
                  className={`border-b border-arc-gray-100 ${
                    urgency === 'critical' ? 'border-l-3 border-l-arc-red' :
                    urgency === 'high' ? 'border-l-3 border-l-arc-caution' : ''
                  } ${rowStripe}`}
                >
                  <td className="py-2 px-2 text-arc-gray-500">{i + 1}</td>
                  <td className="py-2 px-2 font-semibold">{row.state}</td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] font-medium">
                    <span className={urgency === 'critical' ? 'text-arc-red' : ''}>
                      {row.opportunityScore.toFixed(0)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatNumber(row.gapCount)}</td>
                  <td className={`py-2 px-2 text-right font-[family-name:var(--font-data)] ${sviHeat}`}>{formatSvi(row.avgSvi)}</td>
                  <td className={`py-2 px-2 text-right font-[family-name:var(--font-data)] ${gapHeat}`}>{formatPercent(row.gapRate)}</td>
                  <td className={`py-2 px-2 text-right font-[family-name:var(--font-data)] ${careHeat}`}>{formatPercent(row.careRate)}</td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatNumber(row.totalFires)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-arc-gray-500 mt-3">
        Opportunity Score = Gap Count × Avg SVI Risk. Higher scores indicate communities where
        the most vulnerable populations are being missed.
      </p>
    </div>
  );
}

function ActionTiers({ data }: { data: GapAnalysisData[] }) {
  const tiers = useMemo(() => {
    const tier1 = data.filter(d => d.opportunityScore >= 1000);
    const tier2 = data.filter(d => d.opportunityScore >= 500 && d.opportunityScore < 1000);
    const tier3 = data.filter(d => d.opportunityScore >= 200 && d.opportunityScore < 500);
    return [
      {
        level: 'Tier 1 — Immediate Priority',
        icon: AlertTriangle,
        color: 'border-l-arc-red bg-red-50',
        iconColor: 'text-arc-red',
        action: 'Establish automatic notification agreements with fire departments. Deploy liaisons to build relationships with departments that have zero or minimal RC contact.',
        states: tier1,
      },
      {
        level: 'Tier 2 — High Priority',
        icon: Target,
        color: 'border-l-amber-500 bg-amber-50',
        iconColor: 'text-amber-600',
        action: 'Regional coordinator engagement — schedule quarterly check-ins with fire departments. Review notification workflows for breakdowns.',
        states: tier2,
      },
      {
        level: 'Tier 3 — Monitoring',
        icon: Eye,
        color: 'border-l-blue-500 bg-blue-50',
        iconColor: 'text-blue-600',
        action: 'Quarterly trend review — track gap rate direction. Escalate to Tier 2 if worsening over two consecutive quarters.',
        states: tier3,
      },
    ];
  }, [data]);

  return (
    <div className="space-y-3">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
        Recommended Actions
      </h3>
      {tiers.map(tier => (
        <div key={tier.level} className={`rounded p-4 border-l-4 ${tier.color}`}>
          <div className="flex items-start gap-3">
            <tier.icon size={16} className={`${tier.iconColor} shrink-0 mt-0.5`} />
            <div>
              <p className="text-xs font-bold text-arc-black">{tier.level}</p>
              <p className="text-xs text-arc-gray-700 mt-1">{tier.action}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tier.states.map(s => (
                  <span key={s.state} className="px-2 py-0.5 bg-white rounded text-[10px] font-[family-name:var(--font-data)] font-medium border border-arc-gray-100">
                    {s.state} ({s.opportunityScore.toFixed(0)})
                  </span>
                ))}
                {tier.states.length === 0 && (
                  <span className="text-[10px] text-arc-gray-500">No states in this tier</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChapterGapRatio({ chapters }: { chapters: OrgUnitData[] }) {
  const [sortCol, setSortCol] = useState<'ratio' | 'gap' | 'gapRate'>('ratio');

  const tableData = useMemo(() => {
    return chapters
      .filter(c => c.countyCount > 0 && c.gap > 0)
      .map(c => ({
        name: c.name,
        gap: c.gap,
        countyCount: c.countyCount,
        ratio: c.gap / c.countyCount,
        gapRate: c.gapRate,
        total: c.total,
        population: c.population,
      }))
      .sort((a, b) => {
        if (sortCol === 'gap') return b.gap - a.gap;
        if (sortCol === 'gapRate') return b.gapRate - a.gapRate;
        return b.ratio - a.ratio;
      })
      .slice(0, 20);
  }, [chapters, sortCol]);

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
        Chapter Gap-to-Coverage Ratio
      </h3>
      <p className="text-xs text-arc-gray-500 mb-4">
        Gap fires per county — a proxy for how stretched each chapter is
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-arc-black">
              <th className="text-left py-2 px-2 text-arc-gray-500">#</th>
              <th className="text-left py-2 px-2 text-arc-gray-500">Chapter</th>
              <th
                onClick={() => setSortCol('ratio')}
                className={`text-right py-2 px-2 cursor-pointer ${sortCol === 'ratio' ? 'text-arc-red font-bold' : 'text-arc-gray-500'}`}
              >
                Gap/County {sortCol === 'ratio' ? '▼' : ''}
              </th>
              <th
                onClick={() => setSortCol('gap')}
                className={`text-right py-2 px-2 cursor-pointer ${sortCol === 'gap' ? 'text-arc-red font-bold' : 'text-arc-gray-500'}`}
              >
                Gap Fires {sortCol === 'gap' ? '▼' : ''}
              </th>
              <th className="text-right py-2 px-2 text-arc-gray-500">Counties</th>
              <th
                onClick={() => setSortCol('gapRate')}
                className={`text-right py-2 px-2 cursor-pointer ${sortCol === 'gapRate' ? 'text-arc-red font-bold' : 'text-arc-gray-500'}`}
              >
                Gap Rate {sortCol === 'gapRate' ? '▼' : ''}
              </th>
              <th className="text-right py-2 px-2 text-arc-gray-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={row.name} className={`border-b border-arc-gray-100 ${i % 2 === 1 ? 'bg-arc-cream/30' : ''}`}>
                <td className="py-2 px-2 text-arc-gray-500">{i + 1}</td>
                <td className="py-2 px-2 font-medium max-w-[200px] truncate">{row.name}</td>
                <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] font-medium text-arc-red">{row.ratio.toFixed(1)}</td>
                <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatNumber(row.gap)}</td>
                <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{row.countyCount}</td>
                <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatPercent(row.gapRate)}</td>
                <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatNumber(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function GapAnalysis() {
  const [gapData, setGapData] = useState<GapAnalysisData[] | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [chapters, setChapters] = useState<OrgUnitData[] | null>(null);

  useEffect(() => {
    Promise.all([loadGapAnalysis(), loadSummary(), loadChapters()])
      .then(([g, s, ch]) => { setGapData(g); setSummary(s); setChapters(ch); });
  }, []);

  if (!gapData || !summary) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-arc-gray-100 rounded" />
        <div className="h-96 bg-arc-gray-100 rounded" />
      </div>
    );
  }

  const criticalStates = gapData.filter(d => d.avgSvi >= 0.6);
  const highVulnGap = criticalStates.reduce((sum, d) => sum + d.gapCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          Gap Analysis
        </h2>
        <p className="text-sm text-arc-gray-500 mt-1">
          Where fires happen but Red Cross isn&apos;t responding
        </p>
      </div>

      {/* Executive callout */}
      <div className="bg-white border-l-4 border-l-arc-red rounded p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-arc-red shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-lg font-[family-name:var(--font-headline)] font-bold text-arc-black leading-snug">
              {formatNumber(summary.noNotification)} fires had no Red Cross notification in 2024
            </p>
            <p className="text-sm text-arc-gray-700 mt-2 leading-relaxed">
              That&apos;s <strong className="text-arc-red">{formatPercent(summary.gapRate)}</strong> of all fire events.
              In high-vulnerability communities (SVI &gt; 0.6), an estimated{' '}
              <strong>{formatNumber(highVulnGap)}</strong> fires were missed — representing
              families who may have needed Red Cross assistance but were never notified.
            </p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded p-4 border border-arc-gray-100">
          <p className="text-xs text-arc-gray-500 uppercase tracking-wide">Total Gap Fires</p>
          <p className="font-[family-name:var(--font-data)] text-2xl font-semibold text-arc-red mt-1">
            {formatNumber(summary.noNotification)}
          </p>
        </div>
        <div className="bg-white rounded p-4 border border-arc-gray-100">
          <p className="text-xs text-arc-gray-500 uppercase tracking-wide">States Affected</p>
          <p className="font-[family-name:var(--font-data)] text-2xl font-semibold text-arc-black mt-1">
            {gapData.length}
          </p>
        </div>
        <div className="bg-white rounded p-4 border border-arc-gray-100">
          <p className="text-xs text-arc-gray-500 uppercase tracking-wide">Critical States</p>
          <p className="font-[family-name:var(--font-data)] text-2xl font-semibold text-arc-red mt-1">
            {gapData.filter(d => d.opportunityScore >= 1000).length}
          </p>
          <p className="text-[10px] text-arc-gray-500 mt-0.5">Score ≥ 1,000</p>
        </div>
        <div className="bg-white rounded p-4 border border-arc-gray-100">
          <p className="text-xs text-arc-gray-500 uppercase tracking-wide">High Vuln. Gap</p>
          <p className="font-[family-name:var(--font-data)] text-2xl font-semibold text-arc-black mt-1">
            {formatNumber(highVulnGap)}
          </p>
          <p className="text-[10px] text-arc-gray-500 mt-0.5">SVI &gt; 0.6</p>
        </div>
      </div>

      {/* Priority Matrix */}
      <PriorityMatrix data={gapData} />

      {/* Opportunity Table */}
      <OpportunityTable data={gapData} />

      {/* Action Tiers */}
      <ActionTiers data={gapData} />

      {/* Chapter Gap-to-Coverage Ratio */}
      {chapters && <ChapterGapRatio chapters={chapters} />}
    </div>
  );
}
