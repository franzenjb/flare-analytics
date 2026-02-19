'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  id: string;
  title: string;
  subtitle?: string;
  stat?: string;
  statLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function Accordion({ id, title, subtitle, stat, statLabel, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setHeight(contentRef.current.scrollHeight);
      const timer = setTimeout(() => setHeight(undefined), 300);
      return () => clearTimeout(timer);
    } else {
      setHeight(contentRef.current.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [open]);

  return (
    <div id={id} className="border border-arc-gray-100 rounded bg-white scroll-mt-24">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-arc-cream/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arc-red focus-visible:ring-offset-1 rounded"
        aria-expanded={open}
        aria-controls={`accordion-content-${id}`}
      >
        <div className="flex-1 min-w-0">
          <h2 className="font-[family-name:var(--font-headline)] text-lg font-bold text-arc-black leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-arc-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {stat && (
          <div className="hidden sm:block text-right shrink-0">
            <span className="font-[family-name:var(--font-data)] text-xl font-bold text-arc-red">{stat}</span>
            {statLabel && <span className="block text-xs text-arc-gray-500">{statLabel}</span>}
          </div>
        )}
        <ChevronDown
          size={20}
          className={`shrink-0 text-arc-gray-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={`accordion-content-${id}`}
        ref={contentRef}
        style={{ height: height === undefined ? 'auto' : height }}
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
      >
        <div className="px-6 pb-6 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
}
