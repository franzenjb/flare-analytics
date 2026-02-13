'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
  Legend, LineChart, Line,
} from 'recharts';
import { ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { loadDivisions, loadRegions, loadChapters, loadCounties, loadSummary } from '@/lib/data-loader';
import { formatNumber, formatPercent, formatSvi, formatCompact } from '@/lib/format';
import type { OrgUnitData, CountyData, SummaryData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

type DrillLevel = 'division' | 'region' | 'chapter' | 'county';

interface DrillState {
  level: DrillLevel;
  divisionName?: string;
  regionName?: string;
  chapterName?: string;
}

function trendDirection(monthly: { total: number }[] | undefined): 'worsening' | 'improving' | 'stable' {
  if (!monthly || monthly.length < 6) return 'stable';
  const first3 = monthly.slice(0, 3).reduce((s, m) => s + m.total, 0);
  const last3 = monthly.slice(-3).reduce((s, m) => s + m.total, 0);
  if (last3 > first3 * 1.1) return 'worsening';
  if (last3 < first3 * 0.9) return 'improving';
  return 'stable';
}

export default function OrganizationView({ onNavigate, initialDrill }: {
  onNavigate?: (tab: string, params?: Record<string, string>) => void;
  initialDrill?: DrillState;
}) {
  const [divisions, setDivisions] = useState<OrgUnitData[] | null>(null);
  const [regions, setRegions] = useState<OrgUnitData[] | null>(null);
  const [chapters, setChapters] = useState<OrgUnitData[] | null>(null);
  const [counties, setCounties] = useState<CountyData[] | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [drill, setDrill] = useState<DrillState>(initialDrill || { level: 'division' });
  const [sortBy, setSortBy] = useState<'total' | 'gapRate' | 'firesPer10k'>('total');
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [compareChapters, setCompareChapters] = useState<[string | null, string | null]>([null, null]);

  useEffect(() => {
    Promise.all([loadDivisions(), loadRegions(), loadChapters(), loadCounties(), loadSummary()])
      .then(([d, r, ch, co, s]) => {
        setDivisions(d);
        setRegions(r);
        setChapters(ch);
        setCounties(co);
        setSummary(s);
      });
  }, []);

  // Current data based on drill level
  const currentData = useMemo(() => {
    if (!divisions || !regions || !chapters || !counties) return [];

    switch (drill.level) {
      case 'division':
        return divisions;
      case 'region':
        return drill.divisionName
          ? regions.filter(r => {
              const regionCounties = counties.filter(c => c.region === r.name);
              return regionCounties.some(c => c.division === drill.divisionName);
            })
          : regions;
      case 'chapter':
        return drill.regionName
          ? chapters.filter(ch => {
              const chapterCounties = counties.filter(c => c.chapter === ch.name);
              return chapterCounties.some(c => c.region === drill.regionName);
            })
          : chapters;
      case 'county':
        return drill.chapterName
          ? counties.filter(c => c.chapter === drill.chapterName)
          : counties.slice(0, 50);
    }
  }, [divisions, regions, chapters, counties, drill]);

  const sortedData = useMemo(() => {
    if (!currentData.length) return [];
    let data = [...currentData].sort((a, b) => {
      if (sortBy === 'gapRate') return b.gapRate - a.gapRate;
      if (sortBy === 'firesPer10k') return (b.firesPer10k || 0) - (a.firesPer10k || 0);
      return b.total - a.total;
    });
    // At-risk filter: gapRate > national avg (40.1%) AND avgSvi >= 0.6
    if (showAtRisk && summary) {
      data = data.filter(d => d.gapRate > summary.gapRate && d.avgSvi >= 0.6);
    }
    return data;
  }, [currentData, sortBy, showAtRisk, summary]);

  // Peer comparison context
  const peerContext = useMemo(() => {
    if (!divisions || !regions || !chapters || !counties) return null;

    if (drill.level === 'region' && drill.divisionName) {
      // Show current region's rank within its division
      const divRegions = regions.filter(r => {
        const rc = counties.filter(c => c.region === r.name);
        return rc.some(c => c.division === drill.divisionName);
      });
      const divAvgGap = divRegions.reduce((s, r) => s + r.gapRate, 0) / divRegions.length;
      const divAvgCare = divRegions.reduce((s, r) => s + r.careRate, 0) / divRegions.length;
      return { parentName: drill.divisionName, peerCount: divRegions.length, avgGap: divAvgGap, avgCare: divAvgCare, level: 'region' as const };
    }
    if (drill.level === 'chapter' && drill.regionName) {
      const regChapters = chapters.filter(ch => {
        const cc = counties.filter(c => c.chapter === ch.name);
        return cc.some(c => c.region === drill.regionName);
      });
      const avgGap = regChapters.reduce((s, c) => s + c.gapRate, 0) / regChapters.length;
      const avgCare = regChapters.reduce((s, c) => s + c.careRate, 0) / regChapters.length;
      return { parentName: drill.regionName, peerCount: regChapters.length, avgGap, avgCare, level: 'chapter' as const };
    }
    return null;
  }, [divisions, regions, chapters, counties, drill]);

  // Insight
  const insight = useMemo(() => {
    if (!sortedData.length) return '';
    const totalAll = sortedData.reduce((s, d) => s + d.total, 0);
    const worst = [...sortedData].sort((a, b) => b.gapRate - a.gapRate)[0];
    const best = [...sortedData].sort((a, b) => a.gapRate - b.gapRate)[0];
    return `${sortedData.length} ${drill.level}s with ${formatNumber(totalAll)} total fires. Highest gap rate: ${worst.name} (${formatPercent(worst.gapRate)}). Lowest: ${best.name} (${formatPercent(best.gapRate)}).`;
  }, [sortedData, drill.level]);

  // Breadcrumb navigation
  function drillDown(name: string) {
    switch (drill.level) {
      case 'division':
        setDrill({ level: 'region', divisionName: name });
        break;
      case 'region':
        setDrill({ ...drill, level: 'chapter', regionName: name });
        break;
      case 'chapter':
        setDrill({ ...drill, level: 'county', chapterName: name });
        break;
    }
  }

  function drillUp() {
    switch (drill.level) {
      case 'region':
        setDrill({ level: 'division' });
        break;
      case 'chapter':
        setDrill({ level: 'region', divisionName: drill.divisionName });
        break;
      case 'county':
        setDrill({ level: 'chapter', divisionName: drill.divisionName, regionName: drill.regionName });
        break;
    }
  }

  if (!divisions || !regions || !chapters || !counties) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-48 bg-arc-gray-100 rounded" />
        <div className="h-64 bg-arc-gray-100 rounded" />
      </div>
    );
  }

  // Top bar chart data (top 20)
  const chartData = sortedData.slice(0, 20).map(d => ({
    name: d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name,
    fullName: d.name,
    'RC Care': d.care,
    'RC Notification': d.notification,
    'No Notification': d.gap,
    gapRate: d.gapRate,
    firesPer10k: d.firesPer10k || 0,
  }));

  // Scatter data for demographics correlation (county level only)
  const scatterData = drill.level === 'county'
    ? (sortedData as CountyData[])
        .filter(c => c.population > 0 && c.medianIncome > 0)
        .slice(0, 200)
        .map(c => ({
          name: c.county || c.name,
          x: c.medianIncome,
          y: c.firesPer10k,
          z: c.total,
          gapRate: c.gapRate,
        }))
    : [];

  const levelLabel = drill.level.charAt(0).toUpperCase() + drill.level.slice(1);

  // Chapter comparison
  const chapA = chapters.find(c => c.name === compareChapters[0]);
  const chapB = chapters.find(c => c.name === compareChapters[1]);

  return (
    <div className="space-y-6">
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          Organization View
        </h2>
        <p className="text-sm text-arc-gray-500 mt-1">
          Red Cross hierarchy: 6 Divisions → 48 Regions → 218 Chapters → 2,997 Counties
        </p>
        {insight && <p className="text-xs text-arc-gray-700 mt-2 bg-arc-cream rounded px-3 py-2">{insight}</p>}
      </div>

      {/* Breadcrumb + Drill Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {drill.level !== 'division' && (
            <button
              onClick={drillUp}
              className="flex items-center gap-1 text-arc-gray-500 hover:text-arc-black"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          )}
          <div className="flex items-center gap-1 text-xs text-arc-gray-500">
            <button
              onClick={() => setDrill({ level: 'division' })}
              className={`hover:text-arc-black ${drill.level === 'division' ? 'font-bold text-arc-black' : ''}`}
            >
              Divisions
            </button>
            {drill.divisionName && (
              <>
                <ChevronRight size={12} />
                <button
                  onClick={() => setDrill({ level: 'region', divisionName: drill.divisionName })}
                  className={`hover:text-arc-black ${drill.level === 'region' ? 'font-bold text-arc-black' : ''}`}
                >
                  {drill.divisionName}
                </button>
              </>
            )}
            {drill.regionName && (
              <>
                <ChevronRight size={12} />
                <button
                  onClick={() => setDrill({ ...drill, level: 'chapter' })}
                  className={`hover:text-arc-black ${drill.level === 'chapter' ? 'font-bold text-arc-black' : ''}`}
                >
                  {drill.regionName}
                </button>
              </>
            )}
            {drill.chapterName && (
              <>
                <ChevronRight size={12} />
                <span className="font-bold text-arc-black">{drill.chapterName}</span>
              </>
            )}
          </div>
        </div>
        {/* At-Risk toggle */}
        <button
          onClick={() => setShowAtRisk(v => !v)}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded ${
            showAtRisk
              ? 'bg-red-50 text-arc-red border border-red-200'
              : 'bg-arc-gray-100 text-arc-gray-700 hover:bg-arc-gray-300'
          }`}
        >
          <AlertTriangle size={12} />
          {showAtRisk ? 'At-Risk Only' : 'Flag At-Risk'}
        </button>
      </div>

      {/* Peer comparison context bar */}
      {peerContext && sortedData.length > 0 && (
        <div className="bg-arc-cream rounded px-4 py-3 text-xs flex flex-wrap gap-x-6 gap-y-1">
          <span className="font-medium text-arc-black">
            {peerContext.peerCount} {peerContext.level}s in {peerContext.parentName}
          </span>
          <span>
            Avg Gap Rate: <span className="font-[family-name:var(--font-data)] text-arc-red">{formatPercent(peerContext.avgGap)}</span>
          </span>
          <span>
            Avg Care Rate: <span className="font-[family-name:var(--font-data)] text-arc-success">{formatPercent(peerContext.avgCare)}</span>
          </span>
        </div>
      )}

      {/* Division Summary Cards (only at top level) */}
      {drill.level === 'division' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {divisions.map(d => {
            const isAtRisk = summary && d.gapRate > summary.gapRate && d.avgSvi >= 0.6;
            return (
              <button
                key={d.name}
                onClick={() => drillDown(d.name)}
                className={`bg-white rounded p-4 border hover:border-arc-red transition-colors text-left group ${
                  isAtRisk && showAtRisk ? 'border-l-4 border-l-arc-red border-arc-gray-100' : 'border-arc-gray-100'
                }`}
              >
                <p className="text-xs text-arc-gray-500 truncate">{d.name}</p>
                <p className="font-[family-name:var(--font-data)] text-lg font-bold mt-1">
                  {formatCompact(d.total)}
                </p>
                <div className="flex justify-between text-[10px] mt-2">
                  <span className="text-arc-red">{formatPercent(d.gapRate)} gap</span>
                  <span className="text-arc-gray-500">{formatNumber(d.firesPer10k)}/10k</span>
                </div>
                <div className="h-1.5 bg-arc-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-arc-red rounded-full" style={{ width: `${d.gapRate}%` }} />
                </div>
                {d.monthly && d.monthly.length > 1 && (
                  <div className="h-6 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={d.monthly}>
                        <Line type="monotone" dataKey="total" stroke="#a3a3a3" strokeWidth={1} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="text-[10px] text-arc-gray-500 mt-1 group-hover:text-arc-red transition-colors">
                  {d.countyCount} counties · Click to drill →
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Bar Chart */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
            Top {Math.min(sortedData.length, 20)} {levelLabel}s by {sortBy === 'total' ? 'Volume' : sortBy === 'gapRate' ? 'Gap Rate' : 'Per Capita Rate'}
          </h3>
          <div className="flex gap-2">
            {([
              ['total', 'Volume'],
              ['gapRate', 'Gap Rate'],
              ['firesPer10k', 'Per Capita'],
            ] as [typeof sortBy, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  sortBy === key
                    ? 'bg-arc-black text-white'
                    : 'bg-arc-gray-100 text-arc-gray-700 hover:bg-arc-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 28)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
              formatter={(value) => formatNumber(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="RC Care" stackId="a" fill={CATEGORY_COLORS.care} isAnimationActive={false} />
            <Bar dataKey="RC Notification" stackId="a" fill={CATEGORY_COLORS.notification} isAnimationActive={false} />
            <Bar dataKey="No Notification" stackId="a" fill={CATEGORY_COLORS.gap} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
          {levelLabel} Leaderboard
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b-2 border-arc-black">
                <th className="text-left py-2 px-2 text-arc-gray-500">#</th>
                <th className="text-left py-2 px-2 text-arc-gray-500">Name</th>
                <th className="text-right py-2 px-2 text-arc-gray-500">Fires</th>
                <th className="text-right py-2 px-2 text-arc-gray-500">Care Rate</th>
                <th className="text-right py-2 px-2 text-arc-gray-500">Gap Rate</th>
                <th className="text-right py-2 px-2 text-arc-gray-500">Avg SVI</th>
                <th className="text-right py-2 px-2 text-arc-gray-500">Population</th>
                <th className="text-right py-2 px-2 text-arc-gray-500">Per 10k</th>
                <th className="text-center py-2 px-2 text-arc-gray-500">Trend</th>
                {drill.level !== 'county' && <th className="text-right py-2 px-2 text-arc-gray-500"></th>}
              </tr>
            </thead>
            <tbody>
              {sortedData.slice(0, 50).map((d, i) => {
                const careHeat = d.careRate >= 55 ? 'bg-green-50' : d.careRate < 35 ? 'bg-red-50' : '';
                const gapHeat = d.gapRate >= 45 ? 'bg-red-50' : d.gapRate < 30 ? 'bg-green-50' : '';
                const rowStripe = i % 2 === 1 ? 'bg-arc-cream/30' : '';
                const isAtRisk = summary && d.gapRate > summary.gapRate && d.avgSvi >= 0.6;
                const trend = trendDirection(d.monthly);
                return (
                  <tr
                    key={d.name}
                    className={`border-b border-arc-gray-100 ${rowStripe} ${drill.level !== 'county' ? 'cursor-pointer hover:bg-arc-cream/50' : ''} ${
                      isAtRisk && showAtRisk ? 'border-l-4 border-l-arc-red' : ''
                    }`}
                    onClick={() => drill.level !== 'county' && drillDown(d.name)}
                  >
                    <td className="py-2 px-2 text-arc-gray-500 font-[family-name:var(--font-data)]">{i + 1}</td>
                    <td className="py-2 px-2 font-medium max-w-[200px] truncate">
                      {isAtRisk && showAtRisk && <AlertTriangle size={10} className="inline text-arc-red mr-1" />}
                      {d.name}
                    </td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatNumber(d.total)}</td>
                    <td className={`py-2 px-2 text-right font-[family-name:var(--font-data)] text-arc-success ${careHeat}`}>{formatPercent(d.careRate)}</td>
                    <td className={`py-2 px-2 text-right font-[family-name:var(--font-data)] text-arc-red ${gapHeat}`}>{formatPercent(d.gapRate)}</td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatSvi(d.avgSvi)}</td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatCompact(d.population || 0)}</td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{(d.firesPer10k || 0).toFixed(1)}</td>
                    <td className="py-1 px-1">
                      {d.monthly && d.monthly.length > 1 && (
                        <div className="w-24 h-8 mx-auto">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={d.monthly}>
                              <Line
                                type="monotone"
                                dataKey="total"
                                stroke={trend === 'worsening' ? '#ED1B2E' : trend === 'improving' ? '#2d5a27' : '#4a4a4a'}
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </td>
                    {drill.level !== 'county' && (
                      <td className="py-2 px-2 text-right">
                        <ChevronRight size={12} className="text-arc-gray-300" />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedData.length > 50 && (
          <p className="text-xs text-arc-gray-500 mt-2 text-center">
            Showing top 50 of {formatNumber(sortedData.length)} {drill.level}s
          </p>
        )}
      </div>

      {/* Chapter Comparison Tool */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
          Chapter Comparison
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[0, 1].map(idx => (
            <select
              key={idx}
              value={compareChapters[idx] || ''}
              onChange={e => {
                const val = e.target.value || null;
                setCompareChapters(prev => {
                  const next = [...prev] as [string | null, string | null];
                  next[idx] = val;
                  return next;
                });
              }}
              className="px-3 py-2 text-xs border border-arc-gray-100 rounded bg-arc-cream"
            >
              <option value="">Select chapter...</option>
              {chapters.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({formatNumber(c.total)})</option>
              ))}
            </select>
          ))}
        </div>
        {chapA && chapB ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-arc-black">
                  <th className="text-left py-2 px-2 text-arc-gray-500">Metric</th>
                  <th className="text-right py-2 px-2 font-bold">{chapA.name.length > 30 ? chapA.name.substring(0, 27) + '...' : chapA.name}</th>
                  <th className="text-right py-2 px-2 font-bold">{chapB.name.length > 30 ? chapB.name.substring(0, 27) + '...' : chapB.name}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Total Fires', formatNumber(chapA.total), formatNumber(chapB.total)],
                  ['RC Care', formatNumber(chapA.care), formatNumber(chapB.care)],
                  ['No Notification', formatNumber(chapA.gap), formatNumber(chapB.gap)],
                  ['Care Rate', formatPercent(chapA.careRate), formatPercent(chapB.careRate)],
                  ['Gap Rate', formatPercent(chapA.gapRate), formatPercent(chapB.gapRate)],
                  ['Avg SVI', formatSvi(chapA.avgSvi), formatSvi(chapB.avgSvi)],
                  ['Counties', formatNumber(chapA.countyCount), formatNumber(chapB.countyCount)],
                  ['Population', formatCompact(chapA.population), formatCompact(chapB.population)],
                  ['Fires Per 10k', (chapA.firesPer10k || 0).toFixed(1), (chapB.firesPer10k || 0).toFixed(1)],
                ].map(([label, a, b]) => (
                  <tr key={label} className="border-b border-arc-gray-100">
                    <td className="py-2 px-2 text-arc-gray-500">{label}</td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] font-medium">{a}</td>
                    <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] font-medium">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-arc-gray-500 text-center py-6">Select two chapters above to compare side-by-side</p>
        )}
      </div>

      {/* Demographics Scatter (county drill only) */}
      {drill.level === 'county' && scatterData.length > 0 && (
        <div className="bg-white rounded p-5 border border-arc-gray-100">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
            Income vs Fire Rate
          </h3>
          <p className="text-xs text-arc-gray-500 mb-4">
            Median household income vs fires per 10,000 residents — bubble size = total fires
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                type="number"
                dataKey="x"
                name="Median Income"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                label={{ value: 'Median Household Income', position: 'bottom', offset: 15, style: { fontSize: 11 } }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Fires/10k"
                tick={{ fontSize: 11 }}
                label={{ value: 'Fires per 10k', angle: -90, position: 'insideLeft', offset: -5, style: { fontSize: 11 } }}
              />
              <ZAxis type="number" dataKey="z" range={[20, 400]} />
              <Tooltip
                contentStyle={{ fontFamily: 'var(--font-data)', fontSize: 12, border: '1px solid #e5e5e5' }}
                formatter={(value, name) => {
                  const v = Number(value);
                  if (name === 'Median Income') return [`$${formatNumber(v)}`, name];
                  if (name === 'Fires/10k') return [v.toFixed(1), name];
                  return [formatNumber(v), name];
                }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
              />
              <Scatter
                data={scatterData}
                fill="#ED1B2E"
                fillOpacity={0.5}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
