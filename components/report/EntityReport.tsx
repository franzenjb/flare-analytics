'use client';

import { useMemo, lazy, Suspense } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ReportData, PeerEntity } from '@/lib/report-data';
import { generateSummary } from '@/lib/report-data';
import { formatNumber, formatPercent, formatCurrency, formatSvi, formatMonth } from '@/lib/format';
import { CATEGORY_COLORS } from '@/lib/types';
import SviQuintileChart from '@/components/ui/SviQuintileChart';
import StaticLocationMap from './StaticLocationMap';

const ReportMap = lazy(() => import('./ReportMap'));

function KpiRow({ label, value, national }: {
  label: string; value: string; national: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold font-[family-name:var(--font-data)]">{value}</span>
        <span className="text-xs text-gray-400 font-[family-name:var(--font-data)] w-20 text-right">{national}</span>
      </div>
    </div>
  );
}

function PeerTable({ peers, entity }: { peers: PeerEntity[]; entity: ReportData }) {
  if (peers.length === 0) return null;
  return (
    <table className="w-full text-xs font-[family-name:var(--font-data)]">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-1.5 font-medium text-gray-500">Entity</th>
          <th className="text-right py-1.5 font-medium text-gray-500">Fires</th>
          <th className="text-right py-1.5 font-medium text-gray-500">Care %</th>
          <th className="text-right py-1.5 font-medium text-gray-500">Gap %</th>
          <th className="text-right py-1.5 font-medium text-gray-500">SVI</th>
          <th className="text-right py-1.5 font-medium text-gray-500">Per 10K</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-gray-100 bg-red-50 font-semibold">
          <td className="py-1.5">{entity.entityName}</td>
          <td className="text-right py-1.5">{formatNumber(entity.total)}</td>
          <td className="text-right py-1.5">{formatPercent(entity.careRate)}</td>
          <td className="text-right py-1.5">{formatPercent(entity.gapRate)}</td>
          <td className="text-right py-1.5">{formatSvi(entity.avgSvi)}</td>
          <td className="text-right py-1.5">{entity.firesPer10k.toFixed(1)}</td>
        </tr>
        {peers.map(p => (
          <tr key={p.name} className="border-b border-gray-100">
            <td className="py-1.5">{p.name}</td>
            <td className="text-right py-1.5">{formatNumber(p.total)}</td>
            <td className="text-right py-1.5">{formatPercent(p.careRate)}</td>
            <td className="text-right py-1.5">{formatPercent(p.gapRate)}</td>
            <td className="text-right py-1.5">{formatSvi(p.avgSvi)}</td>
            <td className="text-right py-1.5">{p.firesPer10k.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function EntityReport({ report, onClose }: { report: ReportData; onClose?: () => void }) {
  const summary = useMemo(() => generateSummary(report), [report]);

  const chartData = report.monthly.map(d => ({
    month: formatMonth(d.month),
    'RC Care': d.care,
    'RC Notification': d.notification,
    'No Notification': d.gap,
  }));

  // FIPS codes for the interactive map
  const fipsCodes = useMemo(() => new Set(report.counties.map(c => c.fips)), [report.counties]);

  // State codes for the static print map
  const stateCodes = useMemo(() => {
    const states = new Set<string>();
    if (report.state) states.add(report.state);
    // For chapter reports, collect all states from county names like "Cook, IL"
    for (const c of report.counties) {
      const parts = c.name.split(', ');
      if (parts.length === 2 && parts[1].length === 2) states.add(parts[1]);
    }
    return states;
  }, [report]);

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto print:static print:overflow-visible">
      {/* Print/Close controls (hidden in print) */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden">
        <span className="text-sm text-gray-500">Report Preview</span>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 text-sm font-medium bg-arc-red text-white rounded hover:bg-red-700"
          >
            Print / Save PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium border border-gray-200 rounded text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-[850px] mx-auto p-8 space-y-8 print:p-0 print:space-y-6">

        {/* 1. Header */}
        <div className="border-b-2 border-red-600 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-gray-900">
                {report.entityName}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {{ division: 'Division', region: 'Region', chapter: 'Chapter', county: 'County' }[report.entityLevel]} Report
                {report.entityLevel === 'chapter' && report.region && ` — ${report.region}`}
                {report.entityLevel !== 'division' && report.division && ` / ${report.division}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">American Red Cross</p>
              <p className="text-xs text-gray-400">FLARE Analytics</p>
              <p className="text-xs text-gray-400 mt-1">{report.dataDate}</p>
              <p className="text-xs text-gray-400">Generated {report.generatedAt}</p>
            </div>
          </div>
        </div>

        {/* 2. Executive Summary */}
        <section>
          <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-2">
            Executive Summary
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded p-4">
            {summary}
          </p>
        </section>

        {/* 3. Fire Response KPIs */}
        <section>
          <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-3">
            Fire Response Performance
          </h2>
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <KpiRow label="Total Fires" value={formatNumber(report.total)} national={`Natl: ${formatNumber(report.national.total)}`} />
              <KpiRow label="RC Care" value={formatNumber(report.care)} national="" />
              <KpiRow label="No Notification (Gap)" value={formatNumber(report.gap)} national="" />
              <KpiRow label="Care Rate" value={formatPercent(report.careRate)} national={`Natl: ${formatPercent(report.national.careRate)}`} />
            </div>
            <div>
              <KpiRow label="Gap Rate" value={formatPercent(report.gapRate)} national={`Natl: ${formatPercent(report.national.gapRate)}`} />
              <KpiRow label="Avg SVI" value={formatSvi(report.avgSvi)} national={`Natl: ${formatSvi(report.national.avgSvi)}`} />
              <KpiRow label="Fires Per 10K" value={report.firesPer10k.toFixed(1)} national={`Natl: ${report.national.firesPer10k.toFixed(1)}`} />
              <KpiRow label="Counties" value={formatNumber(report.countyCount)} national="" />
            </div>
          </div>
        </section>

        {/* 4. Community Profile */}
        <section>
          <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-3">
            Community Profile
          </h2>
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <KpiRow label="Population" value={formatNumber(report.population)} national={`Natl: ${formatNumber(report.national.population)}`} />
              <KpiRow label="Median Income" value={formatCurrency(report.medianIncome)} national={`Natl: ${formatCurrency(report.national.medianIncome)}`} />
              <KpiRow label="Home Value" value={formatCurrency(report.homeValue)} national="" />
              <KpiRow label="Affordability Ratio" value={`${report.affordabilityRatio.toFixed(1)}x`} national="" />
            </div>
            <div>
              <KpiRow label="Median Age" value={report.medianAge.toFixed(1)} national="" />
              <KpiRow label="Households" value={formatNumber(report.households)} national="" />
              <KpiRow label="Fire Stations" value={formatNumber(report.stationCount)} national="" />
              <KpiRow label="Fires Per 10K Pop" value={report.firesPer10k.toFixed(1)} national={`Natl: ${report.national.firesPer10k.toFixed(1)}`} />
            </div>
          </div>
        </section>

        {/* 5. SVI Equity Analysis */}
        {report.quintiles.some(q => q.total > 0) && (
          <section>
            <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-2">
              SVI Equity Analysis
            </h2>
            <p className="text-xs text-gray-600 mb-3 bg-gray-50 rounded p-3">{report.equityNarrative}</p>
            <div className="h-[200px]">
              <SviQuintileChart quintiles={report.quintiles} />
            </div>
          </section>
        )}

        {/* 6a. Interactive Map (hidden in print) */}
        {fipsCodes.size > 0 && (
          <section className="print:hidden">
            <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-3">
              Interactive Map
            </h2>
            <Suspense fallback={
              <div className="h-[400px] animate-pulse bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                Loading map...
              </div>
            }>
              <ReportMap fipsCodes={fipsCodes} />
            </Suspense>
          </section>
        )}

        {/* 6b. Static Location Map (print only) */}
        {stateCodes.size > 0 && (
          <section className="hidden print:block">
            <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-2">
              Service Area
            </h2>
            <div className="border border-gray-200 rounded p-2">
              <StaticLocationMap stateCodes={stateCodes} />
            </div>
          </section>
        )}

        {/* 7. Monthly Trends */}
        <section className="break-before-auto print:break-before-page">
          <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-3">
            Monthly Trends
          </h2>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(value) => formatNumber(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="RC Care" stackId="1" fill={CATEGORY_COLORS.care} />
                <Bar dataKey="RC Notification" stackId="1" fill={CATEGORY_COLORS.notification} />
                <Bar dataKey="No Notification" stackId="1" fill={CATEGORY_COLORS.gap} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 8. Fire Stations */}
        <section>
          <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-3">
            Fire Stations
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center bg-gray-50 rounded p-3">
              <p className="text-2xl font-bold font-[family-name:var(--font-data)]">{formatNumber(report.stationCount)}</p>
              <p className="text-xs text-gray-500">Stations</p>
            </div>
            <div className="text-center bg-gray-50 rounded p-3">
              <p className="text-2xl font-bold font-[family-name:var(--font-data)]">{report.firesPerStation}</p>
              <p className="text-xs text-gray-500">Fires per Station</p>
            </div>
            <div className="text-center bg-gray-50 rounded p-3">
              <p className="text-2xl font-bold font-[family-name:var(--font-data)]">{formatNumber(report.total)}</p>
              <p className="text-xs text-gray-500">Total Fires</p>
            </div>
          </div>
        </section>

        {/* 9. County Breakdown (for chapters) */}
        {report.entityLevel !== 'county' && report.counties.length > 1 && (
          <section>
            <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-3">
              County Breakdown
            </h2>
            <table className="w-full text-xs font-[family-name:var(--font-data)]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 font-medium text-gray-500">County</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Fires</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Care %</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Gap %</th>
                  <th className="text-right py-1.5 font-medium text-gray-500">Stations</th>
                </tr>
              </thead>
              <tbody>
                {report.counties.slice(0, 25).map(c => (
                  <tr key={c.fips} className="border-b border-gray-100">
                    <td className="py-1">{c.name}</td>
                    <td className="text-right py-1">{formatNumber(c.total)}</td>
                    <td className="text-right py-1">{formatPercent(c.careRate)}</td>
                    <td className="text-right py-1">{formatPercent(c.gapRate)}</td>
                    <td className="text-right py-1">{c.stationCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.counties.length > 25 && (
              <p className="text-xs text-gray-400 mt-2">Showing top 25 of {report.counties.length} counties</p>
            )}
          </section>
        )}

        {/* 10. Peer Comparison */}
        {report.peers.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-gray-900 mb-3">
              Peer Comparison
            </h2>
            <p className="text-xs text-gray-500 mb-2">
              Compared against {report.peers.length} chapters with similar fire volume ({Math.round(report.total * 0.5)}–{Math.round(report.total * 1.5)} fires)
            </p>
            <PeerTable peers={report.peers} entity={report} />
          </section>
        )}

        {/* 11. Data Quality & Sources */}
        <section className="border-t border-gray-200 pt-4">
          <h2 className="font-[family-name:var(--font-headline)] text-sm font-bold text-gray-700 mb-2">
            Data Quality & Sources
          </h2>
          <div className="text-xs text-gray-500 space-y-1">
            {report.missingDemographics > 0 && (
              <p>Note: {report.missingDemographics} of {report.countyCount} counties missing Census demographic data.</p>
            )}
            {report.missingStations > 0 && (
              <p>Note: {report.missingStations} of {report.countyCount} counties have no matched fire stations.</p>
            )}
            <p>Fire data: NFIRS & Red Cross Matching (CY2024, 103,400 total events nationwide)</p>
            <p>Demographics: U.S. Census Bureau ACS 5-Year Estimates</p>
            <p>SVI: CDC/ATSDR Social Vulnerability Index 2022</p>
            <p>Fire Stations: HIFLD (Homeland Infrastructure Foundation-Level Data, 53,087 stations)</p>
            <p>Organizational Hierarchy: ARC Master Geography FY2026</p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
          FLARE Analytics — Fire Loss Analysis & Response Evaluation — American Red Cross
        </div>
      </div>
    </div>
  );
}
