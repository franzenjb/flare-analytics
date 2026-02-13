'use client';

import { X } from 'lucide-react';
import { useFlare } from '@/lib/context';

export default function FilterBar() {
  const { filters, setFilters, clearFilters, divisionOptions, regionOptions, chapterOptions, stateOptions } = useFlare();

  const hasFilters = filters.division || filters.region || filters.chapter || filters.state;

  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.division) activeChips.push({ label: filters.division, clear: () => setFilters({ ...filters, division: null, region: null, chapter: null }) });
  if (filters.region) activeChips.push({ label: filters.region, clear: () => setFilters({ ...filters, region: null, chapter: null }) });
  if (filters.chapter) activeChips.push({ label: filters.chapter, clear: () => setFilters({ ...filters, chapter: null }) });
  if (filters.state) activeChips.push({ label: `State: ${filters.state}`, clear: () => setFilters({ ...filters, state: null }) });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Division */}
      <select
        value={filters.division || ''}
        onChange={e => setFilters({ ...filters, division: e.target.value || null })}
        className="text-xs border border-arc-gray-100 rounded px-2 py-1.5 bg-white text-arc-black focus:outline-none focus:ring-1 focus:ring-arc-red"
        aria-label="Filter by Division"
      >
        <option value="">All Divisions</option>
        {divisionOptions.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* Region */}
      <select
        value={filters.region || ''}
        onChange={e => setFilters({ ...filters, region: e.target.value || null })}
        className="text-xs border border-arc-gray-100 rounded px-2 py-1.5 bg-white text-arc-black focus:outline-none focus:ring-1 focus:ring-arc-red"
        aria-label="Filter by Region"
      >
        <option value="">All Regions</option>
        {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      {/* Chapter */}
      <select
        value={filters.chapter || ''}
        onChange={e => setFilters({ ...filters, chapter: e.target.value || null })}
        className="text-xs border border-arc-gray-100 rounded px-2 py-1.5 bg-white text-arc-black focus:outline-none focus:ring-1 focus:ring-arc-red"
        aria-label="Filter by Chapter"
      >
        <option value="">All Chapters</option>
        {chapterOptions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* State */}
      <select
        value={filters.state || ''}
        onChange={e => setFilters({ ...filters, state: e.target.value || null })}
        className="text-xs border border-arc-gray-100 rounded px-2 py-1.5 bg-white text-arc-black focus:outline-none focus:ring-1 focus:ring-arc-red"
        aria-label="Filter by State"
      >
        <option value="">All States</option>
        {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Clear button */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-2 py-1 text-xs text-arc-red hover:bg-red-50 rounded transition-colors"
        >
          <X size={12} />
          Clear All
        </button>
      )}

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-2">
          {activeChips.map((chip, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-arc-gray-100 rounded text-arc-gray-700">
              {chip.label}
              <button onClick={chip.clear} className="hover:text-arc-red"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
