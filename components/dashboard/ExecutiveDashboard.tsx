'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Flame, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import { loadSummary, loadFunnel, loadMonthly, loadRiskDistribution, loadStates } from '@/lib/data-loader';
import { formatNumber, formatPercent, formatMonth, formatSvi } from '@/lib/format';
import type { SummaryData, FunnelData, MonthlyData, RiskDistributionData, StateData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

function KpiCard({ label, value, subtext, icon: Icon, highlight }: {
  label: string; value: string; subtext?: string; icon: React.ElementType; highlight?: boolean;
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
      {subtext && <p className="text-xs text-arc-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

function EngagementFunnel({ data }: { data: FunnelData }) {
  const maxVal = data.stages[0].value;
  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
        Engagement Pipeline
      </h3>
      <div className="space-y-3">
        {data.stages.map((stage, i) => {
          const pct = (stage.value / maxVal) * 100;
          const lossPct = i > 0
            ? (((data.stages[i - 1].value - stage.value) / data.stages[i - 1].value) * 100).toFixed(0)
            : null;
          return (
            <div key={stage.label}>
              {lossPct && (
                <div className="text-[11px] text-arc-gray-500 mb-1 pl-2 font-[family-name:var(--font-data)]">
                  -{lossPct}% drop
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-32 text-xs text-arc-gray-700 text-right shrink-0">{stage.label}</div>
                <div className="flex-1 bg-arc-gray-100 rounded-sm h-8 relative overflow-hidden">
                  <div
                    className="h-full rounded-sm flex items-center px-2"
                    style={{ width: `${pct}%`, backgroundColor: stage.color }}
                  >
                    <span className="font-[family-name:var(--font-data)] text-xs text-white font-medium">
                      {formatNumber(stage.value)}
                    </span>
                  </div>
                </div>
                <div className="w-12 text-right font-[family-name:var(--font-data)] text-xs text-arc-gray-500">
                  {pct.toFixed(0)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
            formatter={(value) => formatNumber(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Total" fill="#a3a3a3" radius={[2, 2, 0, 0]} />
          <Bar dataKey="Gap (No Notification)" fill="#ED1B2E" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopStates({ data }: { data: StateData[] }) {
  const top10 = data.slice(0, 10);

  return (
    <div className="bg-white rounded p-5 border border-arc-gray-100">
      <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
        Top 10 States by Volume
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 5, left: 20, bottom: 0 }}>
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
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyData[] | null>(null);
  const [risk, setRisk] = useState<RiskDistributionData | null>(null);
  const [states, setStates] = useState<StateData[] | null>(null);

  useEffect(() => {
    loadSummary().then(setSummary);
    loadFunnel().then(setFunnel);
    loadMonthly().then(setMonthly);
    loadRiskDistribution().then(setRisk);
    loadStates().then(setStates);
  }, []);

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
        />
        <KpiCard
          label="Notification Gap"
          value={formatPercent(summary.gapRate)}
          subtext={`${formatNumber(summary.noNotification)} fires missed`}
          icon={AlertTriangle}
          highlight
        />
        <KpiCard
          label="Avg SVI Risk"
          value={formatSvi(summary.avgSviRisk)}
          subtext="Higher = more vulnerable"
          icon={Activity}
        />
      </div>

      {/* Funnel + Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngagementFunnel data={funnel} />
        <MonthlyTrend data={monthly} />
      </div>

      {/* Risk Histogram + Top States */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskHistogram data={risk} />
        <TopStates data={states} />
      </div>
    </div>
  );
}
