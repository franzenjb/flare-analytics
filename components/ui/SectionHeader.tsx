'use client';

import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-arc-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  );
}
