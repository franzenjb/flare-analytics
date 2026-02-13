'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Flame, ShieldCheck, AlertTriangle, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { loadSummary, loadFunnel, loadMonthly, loadRiskDistribution, loadStates } from '@/lib/data-loader';
import { formatNumber, formatPercent, formatMonth, formatSvi } from '@/lib/format';
import type { SummaryData, FunnelData, MonthlyData, RiskDistributionData, StateData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

function KpiCard({ label, value, subtext, icon: Icon, highlight, delta }: {
  label: string; value: string; subtext?: string; icon: React.ElementType; highlight?: boolean;
  delta?: { value: string; direction: 'up' | 'down'; good: boolean };
}) {
  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-arc-gray-500 uppercase tracking-wide">{label}</span>
        <Icon size={18} className={highlight ? 'text-arc-red' : 'text-arc-gray-300'} />
      </div>
      <div className={`font-[family-name:var(--font-data)] text-3xl font-semibold ${highlight ? 'text-arc-red' : 'text-arc-black'}`}>
        {value}
      </div>
      {delta && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-[family-name:var(--font-data)] ${
          delta.good ? 'text-arc-success' : 'text-arc-red'
        }`}>
          {delta.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta.value} vs median
        </div>
      )}
      {subtext && <p className="text-xs text-arc-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

function CriticalAlerts({ states, monthly }: { states: StateData[]; monthly: MonthlyData[] }) {
  const alerts = useMemo(() => {
    const result: { title: string; detail: string; severity: 'critical' | 'warning' }[] = [];

    // States with gapRate > 50% AND total > 1000
    const highGapStates = states.filter(s => s.gapRate > 50 && s.total > 1000);
    if (highGapStates.length > 0) {
      result.push({
        title: `${highGapStates.length} states with >50% gap rate`,
        detail: highGapStates.slice(0, 5).map(s => `${s.state} (${formatPercent(s.gapRate)})`).join(', '),
        severity: 'critical',
      });
    }

    // Worsening monthly trend
    if (monthly.length >= 6) {
      const first3 = monthly.slice(0, 3).reduce((s, m) => s + m.gap, 0);
      const last3 = monthly.slice(-3).reduce((s, m) => s + m.gap, 0);
      if (last3 > first3 * 1.15) {
        const pctIncrease = ((last3 / first3 - 1) * 100).toFixed(0);
        result.push({
          title: `Gap fires trending up ${pctIncrease}%`,
          detail: `Last 3 months vs first 3 months of 2024`,
          severity: 'warning',
        });
      }
    }

    // High vulnerability gaps
    const highVulnGap = states.filter(s => s.avgSvi > 0.65 && s.gapRate > 40);
    if (highVulnGap.length > 0) {
      const totalGap = highVulnGap.reduce((s, d) => s + d.gap, 0);
      result.push({
        title: `${formatNumber(totalGap)} gap fires in high-vulnerability states`,
        detail: highVulnGap.slice(0, 5).map(s => `${s.state} (SVI ${formatSvi(s.avgSvi)})`).join(', '),
        severity: 'critical',
      });
    }

    // States with very high volume but below-average care rate
    const medianCare = [...states].sort((a, b) => a.careRate - b.careRate)[Math.floor(states.length / 2)]?.careRate || 47;
    const underperformers = states.filter(s => s.total > 2000 && s.careRate < medianCare - 5);
    if (underperformers.length > 0) {
      result.push({
        title: `${underperformers.length} high-volume states below median care rate`,
        detail: underperformers.slice(0, 4).map(s => `${s.state} (${formatPercent(s.careRate)})`).join(', '),
        severity: 'warning',
      });
    }

    return result.slice(0, 4);
  }, [states, monthly]);

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`rounded p-4 border flex items-start gap-3 ${
            alert.severity === 'critical'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <AlertTriangle size={16} className={alert.severity === 'critical' ? 'text-arc-red shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'} />
          <div>
            <p className="text-xs font-medium text-arc-black">{alert.title}</p>
            <p className="text-[10px] text-arc-gray-500 mt-0.5">{alert.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EngagementFunnel({ data }: { data: FunnelData }) {
  const maxVal = data.stages[0].value;
  const stageCount = data.stages.length;
  const svgWidth = 500;
  const svgHeight = stageCount * 70 + 10;
  const maxTrapWidth = svgWidth - 160;
  const labelX = 0;
  const trapX = 140;

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
        Engagement Pipeline
      </h3>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ maxHeight: 320 }}>
        {data.stages.map((stage, i) => {
          const pct = stage.value / maxVal;
          const nextPct = i < stageCount - 1 ? data.stages[i + 1].value / maxVal : pct * 0.8;
          const topWidth = pct * maxTrapWidth;
          const bottomWidth = nextPct * maxTrapWidth;
          const y = i * 70 + 5;
          const h = 50;
          const centerX = trapX + maxTrapWidth / 2;
          const lossPct = i > 0
            ? (((data.stages[i - 1].value - stage.value) / data.stages[i - 1].value) * 100).toFixed(0)
            : null;

          return (
            <g key={stage.label}>
              <path
                d={`M ${centerX - topWidth / 2} ${y}
                    L ${centerX + topWidth / 2} ${y}
                    L ${centerX + bottomWidth / 2} ${y + h}
                    L ${centerX - bottomWidth / 2} ${y + h} Z`}
                fill={stage.color}
                opacity={0.85}
              />
              <text x={labelX} y={y + h / 2 + 1} fontSize={11} fill="#4a4a4a" dominantBaseline="middle">
                {stage.label}
              </text>
              <text x={centerX} y={y + h / 2 - 4} textAnchor="middle" fontSize={12} fontWeight={600} fill="#ffffff" dominantBaseline="middle"
                fontFamily="var(--font-data)">
                {formatNumber(stage.value)}
              </text>
              <text x={centerX} y={y + h / 2 + 10} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.8)" dominantBaseline="middle"
                fontFamily="var(--font-data)">
                {(pct * 100).toFixed(0)}%
              </text>
              {lossPct && (
                <text x={centerX + topWidth / 2 + 8} y={y + 6} fontSize={9} fill="#ED1B2E"
                  fontFamily="var(--font-data)">
                  -{lossPct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MonthlyTrend({ data }: { data: MonthlyData[] }) {
  const chartData = data.map(d => ({
    month: formatMonth(d.month),
    'RC Care': d.care,
    'RC Notification': d.notification,
    'No Notification': d.gap,
  }));

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
        Monthly Trend
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
            formatter={(value) => formatNumber(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="RC Care" stackId="1" fill={CATEGORY_COLORS.care} stroke={CATEGORY_COLORS.care} fillOpacity={0.7} />
          <Area type="monotone" dataKey="RC Notification" stackId="1" fill={CATEGORY_COLORS.notification} stroke={CATEGORY_COLORS.notification} fillOpacity={0.7} />
          <Area type="monotone" dataKey="No Notification" stackId="1" fill={CATEGORY_COLORS.gap} stroke={CATEGORY_COLORS.gap} fillOpacity={0.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RiskHistogram({ data }: { data: RiskDistributionData }) {
  const chartData = data.bins.map((bin, i) => ({
    bin,
    Total: data.total[i],
    'Gap (No Notification)': data.gap[i],
  }));

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
        Risk Distribution
      </h3>
      <p className="text-xs text-arc-gray-500 mb-4">SVI Risk Score — higher = more vulnerable</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
            formatter={(value) => formatNumber(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Total" fill="#d4d4d4" stroke="#a3a3a3" strokeWidth={1} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Gap (No Notification)" fill="#ED1B2E" fillOpacity={0.8} radius={[2, 2, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopStates({ data, onNavigate }: { data: StateData[]; onNavigate?: (tab: string, params?: Record<string, string>) => void }) {
  const top10 = data.slice(0, 10);

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
        Top 10 States by Volume
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={top10}
          layout="vertical"
          margin={{ top: 0, right: 5, left: 20, bottom: 0 }}
          onClick={(data) => {
            if (data?.activeLabel && onNavigate) {
              onNavigate('regional', { state: String(data.activeLabel) });
            }
          }}
          style={{ cursor: onNavigate ? 'pointer' : 'default' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="state" tick={{ fontSize: 12, fontWeight: 600 }} width={35} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
            formatter={(value) => formatNumber(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="care" name="RC Care" stackId="a" fill={CATEGORY_COLORS.care} />
          <Bar dataKey="notification" name="RC Notification" stackId="a" fill={CATEGORY_COLORS.notification} />
          <Bar dataKey="gap" name="No Notification" stackId="a" fill={CATEGORY_COLORS.gap} />
        </BarChart>
      </ResponsiveContainer>
      {onNavigate && (
        <p className="text-[10px] text-arc-gray-500 text-center mt-2">Click a state to view in Regional Deep Dive</p>
      )}
    </div>
  );
}

export default function ExecutiveDashboard({ onNavigate }: { onNavigate?: (tab: string, params?: Record<string, string>) => void }) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[] | null>(null);
  const [risk, setRisk] = useState<RiskDistributionData | null>(null);
  const [states, setStates] = useState<StateData[] | null>(null);

  useEffect(() => {
    Promise.all([loadSummary(), loadFunnel(), loadMonthly(), loadRiskDistribution(), loadStates()])
      .then(([s, f, m, r, st]) => { setSummary(s); setFunnel(f); setMonthly(m); setRisk(r); setStates(st); });
  }, []);

  // Compute deltas
  const deltas = useMemo(() => {
    if (!states || states.length === 0) return null;
    const sortedCare = [...states].sort((a, b) => a.careRate - b.careRate);
    const sortedGap = [...states].sort((a, b) => a.gapRate - b.gapRate);
    const medianCare = sortedCare[Math.floor(sortedCare.length / 2)].careRate;
    const medianGap = sortedGap[Math.floor(sortedGap.length / 2)].gapRate;
    return { medianCare, medianGap };
  }, [states]);

  // Auto-generated insight
  const insight = useMemo(() => {
    if (!monthly || !states) return '';
    const sorted = [...monthly].sort((a, b) => b.total - a.total);
    const peak = sorted[0];
    const trough = sorted[sorted.length - 1];
    const peakLabel = formatMonth(peak.month);
    const troughLabel = formatMonth(trough.month);
    const ratio = ((peak.total / trough.total - 1) * 100).toFixed(0);
    const top3 = states.slice(0, 3).map(s => s.state).join(', ');
    const top3Pct = ((states.slice(0, 3).reduce((s, d) => s + d.total, 0) / states.reduce((s, d) => s + d.total, 0)) * 100).toFixed(0);
    return `${peakLabel} sees ${ratio}% more fires than ${troughLabel}. Top 3 states (${top3}) account for ${top3Pct}% of all fires.`;
  }, [monthly, states]);

  if (!summary || !funnel || !monthly || !risk || !states) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-arc-gray-100 rounded" />)}
        </div>
        <div className="h-64 bg-arc-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          Executive Summary
        </h2>
        <p className="text-sm text-arc-gray-500 mt-1">
          {formatNumber(summary.totalFires)} residential fire events across {summary.statesCovered} states — Calendar Year 2024
        </p>
        {insight && <p className="text-xs text-arc-gray-700 mt-2 bg-arc-cream rounded px-3 py-2">{insight}</p>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Fires"
          value={formatNumber(summary.totalFires)}
          subtext={`${summary.uniqueDepartments.toLocaleString()} departments`}
          icon={Flame}
        />
        <KpiCard
          label="RC Care Rate"
          value={formatPercent(summary.careRate)}
          subtext={`${formatNumber(summary.rcCare)} families served`}
          icon={ShieldCheck}
          delta={deltas ? {
            value: `${(summary.careRate - deltas.medianCare).toFixed(1)}pp`,
            direction: summary.careRate > deltas.medianCare ? 'up' : 'down',
            good: summary.careRate > deltas.medianCare,
          } : undefined}
        />
        <KpiCard
          label="Notification Gap"
          value={formatPercent(summary.gapRate)}
          subtext={`${formatNumber(summary.noNotification)} fires missed`}
          icon={AlertTriangle}
          highlight
          delta={deltas ? {
            value: `${(summary.gapRate - deltas.medianGap).toFixed(1)}pp`,
            direction: summary.gapRate > deltas.medianGap ? 'up' : 'down',
            good: summary.gapRate < deltas.medianGap,
          } : undefined}
        />
        <KpiCard
          label="Avg SVI Risk"
          value={formatSvi(summary.avgSviRisk)}
          subtext="Higher = more vulnerable"
          icon={Activity}
          delta={{
            value: `${(summary.avgSviRisk - 0.5).toFixed(2)}`,
            direction: summary.avgSviRisk > 0.5 ? 'up' : 'down',
            good: summary.avgSviRisk < 0.5,
          }}
        />
      </div>

      {/* Critical Alerts */}
      <CriticalAlerts states={states} monthly={monthly} />

      {/* Funnel + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementFunnel data={funnel} />
        <MonthlyTrend data={monthly} />
      </div>

      {/* Risk Histogram + Top States */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskHistogram data={risk} />
        <TopStates data={states} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
