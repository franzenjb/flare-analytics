'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

export default function SearchSelect({ options, value, onChange, placeholder, ariaLabel }: {
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 100); // Show first 100 when no search
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q)).slice(0, 100);
  }, [options, query]);

  const selectedLabel = value ? options.find(o => o.value === value)?.label : null;

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative" aria-label={ariaLabel}>
      {/* Trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs border border-arc-gray-100 rounded px-2 py-1.5 bg-white text-arc-black focus:outline-none focus:ring-1 focus:ring-arc-red min-w-[140px] max-w-[200px]"
      >
        <span className="truncate flex-1 text-left">
          {selectedLabel || placeholder}
        </span>
        {value ? (
          <X size={12} className="shrink-0 text-arc-gray-400 hover:text-arc-red" onClick={handleClear} />
        ) : (
          <ChevronDown size={12} className="shrink-0 text-arc-gray-400" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-arc-gray-100 rounded shadow-lg z-50">
          {/* Search input */}
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-arc-gray-100">
            <Search size={12} className="text-arc-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search counties..."
              className="flex-1 text-xs outline-none bg-transparent text-arc-black placeholder:text-arc-gray-300"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X size={10} className="text-arc-gray-400" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {/* All Counties option */}
            <button
              onClick={() => { onChange(null); setOpen(false); setQuery(''); }}
              className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-arc-cream transition-colors ${!value ? 'font-semibold text-arc-red' : 'text-arc-gray-500'}`}
            >
              {placeholder}
            </button>
            {filtered.map(o => (
              <button
                key={o.value}
                onClick={() => handleSelect(o.value)}
                className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-arc-cream transition-colors ${value === o.value ? 'font-semibold text-arc-red bg-red-50' : 'text-arc-black'}`}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-xs text-arc-gray-400 text-center">No counties found</p>
            )}
            {filtered.length === 100 && query === '' && (
              <p className="px-2.5 py-1.5 text-[10px] text-arc-gray-300 text-center">Type to search {options.length.toLocaleString()} counties...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
