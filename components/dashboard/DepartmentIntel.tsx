'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { loadDepartments } from '@/lib/data-loader';
import { formatNumber, formatPercent, formatSvi } from '@/lib/format';
import type { DepartmentData } from '@/lib/types';
import { CATEGORY_COLORS } from '@/lib/types';

const PAGE_SIZE = 25;

export default function DepartmentIntel() {
  const [departments, setDepartments] = useState<DepartmentData[] | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<keyof DepartmentData>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadDepartments().then(setDepartments);
  }, []);

  const filtered = useMemo(() => {
    if (!departments) return [];
    let result = departments;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return result;
  }, [departments, search, sortBy, sortAsc]);

  const paged = useMemo(() => {
    return filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Exclude "Unknown" from charts (61K fires distorts all visuals)
  const knownDepartments = useMemo(() => {
    if (!departments) return [];
    return departments.filter(d => d.name !== 'Unknown');
  }, [departments]);

  const unknownDept = useMemo(() => {
    if (!departments) return null;
    return departments.find(d => d.name === 'Unknown') || null;
  }, [departments]);

  // Top 20 for chart (excluding Unknown)
  const top20 = useMemo(() => {
    return knownDepartments.slice(0, 20).map(d => ({
      name: d.name.length > 25 ? d.name.slice(0, 25) + '...' : d.name,
      care: d.care,
      notification: d.notification,
      gap: d.gap,
    }));
  }, [knownDepartments]);

  // Scatter data: high-volume departments (excluding Unknown)
  const scatterData = useMemo(() => {
    return knownDepartments
      .filter(d => d.total >= 20)
      .map(d => ({ name: d.name, total: d.total, careRate: d.careRate }));
  }, [knownDepartments]);

  // Auto-generated insight
  const insight = useMemo(() => {
    if (!departments) return '';
    const highVolLowCare = departments.filter(d => d.total >= 100 && d.careRate < 30);
    return `${highVolLowCare.length} departments with 100+ fires have care rates below 30%`;
  }, [departments]);

  const handleSort = (col: keyof DepartmentData) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
    setPage(0);
  };

  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = ['Department', 'Total', 'Care', 'Notification', 'Gap', 'Care Rate', 'Gap Rate', 'Avg SVI', 'Gap Score'];
    const rows = filtered.map(d => [
      `"${d.name}"`, d.total, d.care, d.notification, d.gap,
      d.careRate, d.gapRate, d.avgSvi, d.gapScore,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flare-departments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!departments) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-arc-gray-100 rounded" />
        <div className="h-96 bg-arc-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          Fire Department Intelligence
        </h2>
        <p className="text-sm text-arc-gray-500 mt-1">
          {formatNumber(departments.length)} departments analyzed — {insight}
        </p>
      </div>

      {/* Unknown department callout */}
      {unknownDept && (
        <div className="bg-white border-l-4 border-l-arc-caution rounded p-4 text-sm">
          <strong>{formatNumber(unknownDept.total)} fires have no identified department</strong>
          <span className="text-arc-gray-500"> — excluded from charts below to show actionable department-level patterns.</span>
        </div>
      )}

      {/* Top 20 chart */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-4">
          Top 20 Departments by Volume
        </h3>
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={top20} layout="vertical" margin={{ top: 0, right: 10, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={180} />
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

      {/* Engagement scatter */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black mb-1">
          Engagement Analysis
        </h3>
        <p className="text-xs text-arc-gray-500 mb-4">
          High-volume / low-engagement outliers are in the bottom-right quadrant
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              type="number"
              dataKey="total"
              name="Total Fires"
              tick={{ fontSize: 11 }}
              label={{ value: 'Total Fires', position: 'bottom', offset: 5, style: { fontSize: 11 } }}
            />
            <YAxis
              type="number"
              dataKey="careRate"
              name="Care Rate"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              label={{ value: 'Care Rate %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-arc-gray-100 rounded p-3 shadow-sm text-xs">
                    <p className="font-semibold text-sm">{d.name}</p>
                    <p>Total: {formatNumber(d.total)} fires</p>
                    <p>Care Rate: {formatPercent(d.careRate)}</p>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData}>
              {scatterData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.careRate < 30 && d.total > 100 ? '#ED1B2E' : '#a3a3a3'}
                  fillOpacity={0.6}
                  r={3}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Searchable table */}
      <div className="bg-white rounded p-5 border border-arc-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">
            All Departments
          </h3>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-arc-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search departments..."
                className="pl-8 pr-3 py-1.5 text-xs border border-arc-gray-100 rounded bg-arc-cream focus:outline-none focus:border-arc-gray-300 w-56"
              />
            </div>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-arc-gray-100 rounded hover:bg-arc-gray-300"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-arc-black">
                {([
                  ['name', 'Department', 'left'],
                  ['total', 'Total', 'right'],
                  ['care', 'Care', 'right'],
                  ['gap', 'Gap', 'right'],
                  ['careRate', 'Care %', 'right'],
                  ['gapRate', 'Gap %', 'right'],
                  ['avgSvi', 'Avg SVI', 'right'],
                  ['gapScore', 'Gap Score', 'right'],
                ] as const).map(([key, label, align]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`py-2 px-2 font-medium cursor-pointer hover:text-arc-black ${
                      align === 'right' ? 'text-right' : 'text-left'
                    } ${sortBy === key ? 'text-arc-red' : 'text-arc-gray-500'}`}
                  >
                    {label} {sortBy === key ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(dept => (
                <tr key={dept.name} className="border-b border-arc-gray-100 hover:bg-arc-cream/50">
                  <td className="py-2 px-2 max-w-[200px] truncate" title={dept.name}>{dept.name}</td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatNumber(dept.total)}</td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatNumber(dept.care)}</td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] text-arc-red">{formatNumber(dept.gap)}</td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">
                    <span className={dept.careRate >= 60 ? 'text-arc-success' : dept.careRate < 30 ? 'text-arc-red' : ''}>
                      {formatPercent(dept.careRate)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">
                    <span className={dept.gapRate >= 50 ? 'text-arc-red' : ''}>
                      {formatPercent(dept.gapRate)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)]">{formatSvi(dept.avgSvi)}</td>
                  <td className="py-2 px-2 text-right font-[family-name:var(--font-data)] font-medium">{dept.gapScore.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 text-xs text-arc-gray-500">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {formatNumber(filtered.length)}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-arc-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 py-1">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-arc-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
