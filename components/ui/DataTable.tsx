'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import ExportButton from './ExportButton';
import SparkLine from './SparkLine';
import type { ExportColumn } from '@/lib/export';

export interface ColumnDef<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown, row: T) => string;
  sortable?: boolean;
  width?: string;
  heatmap?: {
    min: number;
    max: number;
    lowColor: string;  // CSS color at min
    highColor: string; // CSS color at max
  };
  sparkline?: (row: T) => number[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  searchFields?: string[];
  pageSize?: number;
  exportFilename?: string;
  onRowClick?: (row: T) => void;
  highlightFn?: (row: T) => boolean;
  rowKey?: (row: T) => string;
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}

function heatColor(value: number, min: number, max: number, lowColor: string, highColor: string): string {
  const t = max === min ? 0 : (value - min) / (max - min);
  // Parse hex colors
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(lowColor);
  const [r2, g2, b2] = parse(highColor);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DataTable<T extends Record<string, any>>({
  data, columns, searchable = false, searchFields, pageSize = 25,
  exportFilename, onRowClick, highlightFn, rowKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Search filter
  const searched = useMemo(() => {
    if (!search || !searchable) return data;
    const q = search.toLowerCase();
    const fields = searchFields || columns.filter(c => c.align !== 'right').map(c => c.key);
    return data.filter(row =>
      fields.some(f => String(getNestedValue(row as Record<string, unknown>, f) ?? '').toLowerCase().includes(q))
    );
  }, [data, search, searchable, searchFields, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return searched;
    return [...searched].sort((a, b) => {
      const va = getNestedValue(a as Record<string, unknown>, sortKey);
      const vb = getNestedValue(b as Record<string, unknown>, sortKey);
      const na = typeof va === 'number' ? va : parseFloat(String(va)) || 0;
      const nb = typeof vb === 'number' ? vb : parseFloat(String(vb)) || 0;
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? na - nb : nb - na;
    });
  }, [searched, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const startRow = page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, sorted.length);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  // Export columns
  const exportCols: ExportColumn[] = columns.map(c => ({
    key: c.key,
    label: c.label,
    format: c.format ? (v: unknown) => c.format!(v, {} as T) : undefined,
  }));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {searchable && (
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-arc-gray-300" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search..."
                className="pl-7 pr-3 py-1.5 text-xs border border-arc-gray-100 rounded bg-white focus:outline-none focus:ring-1 focus:ring-arc-red w-48"
                aria-label="Search table"
              />
            </div>
          )}
          <span className="text-[10px] text-arc-gray-500 font-[family-name:var(--font-data)]">
            {startRow}–{endRow} of {sorted.length.toLocaleString()}
          </span>
        </div>
        {exportFilename && (
          <ExportButton
            data={sorted as Record<string, unknown>[]}
            columns={exportCols}
            filename={exportFilename}
          />
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-arc-gray-100 rounded">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-arc-gray-100">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-arc-gray-500 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.sortable !== false ? 'cursor-pointer select-none hover:text-arc-black' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => {
              const isHighlighted = highlightFn?.(row);
              const key = rowKey ? rowKey(row) : String(i);
              return (
                <tr
                  key={key}
                  className={`border-t border-arc-gray-100 transition-colors ${
                    i % 2 === 1 ? 'bg-[#faf9f7]' : 'bg-white'
                  } ${onRowClick ? 'cursor-pointer hover:bg-arc-gray-100' : 'hover:bg-[#f0efed]'} ${
                    isHighlighted ? 'ring-1 ring-inset ring-arc-red/30' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => {
                    const rawValue = getNestedValue(row as Record<string, unknown>, col.key);
                    const displayValue = col.format ? col.format(rawValue, row) : String(rawValue ?? '');
                    const sparkData = col.sparkline?.(row);
                    const bgStyle = col.heatmap && typeof rawValue === 'number'
                      ? { backgroundColor: heatColor(rawValue, col.heatmap.min, col.heatmap.max, col.heatmap.lowColor, col.heatmap.highColor) }
                      : undefined;

                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2 font-[family-name:var(--font-data)] whitespace-nowrap ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                        style={bgStyle}
                      >
                        <span className="inline-flex items-center gap-2">
                          {displayValue}
                          {sparkData && <SparkLine data={sparkData} width={48} height={14} />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-arc-gray-500">
                  No data matches your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs border border-arc-gray-100 rounded disabled:opacity-30 hover:bg-arc-gray-100 transition-colors"
          >
            Previous
          </button>
          <span className="text-[10px] text-arc-gray-500 font-[family-name:var(--font-data)]">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 text-xs border border-arc-gray-100 rounded disabled:opacity-30 hover:bg-arc-gray-100 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
