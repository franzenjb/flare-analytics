'use client';

import { FileText } from 'lucide-react';

/** Generate Report button — supports division, region, chapter, county */
export default function ReportButton({ divisionName, regionName, chapterName, countyFips, size = 'default' }: {
  divisionName?: string;
  regionName?: string;
  chapterName?: string;
  countyFips?: string;
  size?: 'default' | 'sm';
}) {
  if (!divisionName && !regionName && !chapterName && !countyFips) return null;

  const level = divisionName ? 'Division' : regionName ? 'Region' : chapterName ? 'Chapter' : 'County';
  const label = `Generate ${level} Report`;
  const param = divisionName
    ? `division=${encodeURIComponent(divisionName)}`
    : regionName
    ? `region=${encodeURIComponent(regionName)}`
    : chapterName
    ? `chapter=${encodeURIComponent(chapterName)}`
    : `county=${encodeURIComponent(countyFips!)}`;

  return (
    <a
      href={`/report?${param}`}
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
