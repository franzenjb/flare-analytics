'use client';

import { FileText } from 'lucide-react';

/** Generate Report button — opens report in new tab */
export default function ReportButton({ chapterName, countyFips, size = 'default' }: {
  chapterName?: string;
  countyFips?: string;
  size?: 'default' | 'sm';
}) {
  if (!chapterName && !countyFips) return null;

  const label = chapterName ? 'Generate Chapter Report' : 'Generate County Report';
  const href = chapterName
    ? `/report?chapter=${encodeURIComponent(chapterName)}`
    : `/report?county=${encodeURIComponent(countyFips!)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center font-semibold bg-arc-red text-white rounded hover:bg-red-700 transition-colors shadow-sm ${
        size === 'sm' ? 'gap-1.5 px-3 py-1.5 text-xs' : 'gap-2 px-5 py-2.5 text-sm'
      }`}
      title={label}
    >
      <FileText size={size === 'sm' ? 14 : 18} />
      {label}
    </a>
  );
}
