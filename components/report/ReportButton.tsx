'use client';

import { useState, lazy, Suspense } from 'react';
import { FileText } from 'lucide-react';
import { useFlare } from '@/lib/context';
import { buildChapterReport, buildCountyReport, type ReportData } from '@/lib/report-data';

const EntityReport = lazy(() => import('./EntityReport'));

/** Generate Report button for chapters or counties */
export default function ReportButton({ chapterName, countyFips, size = 'sm' }: {
  chapterName?: string;
  countyFips?: string;
  size?: 'sm' | 'xs';
}) {
  const { counties } = useFlare();
  const [report, setReport] = useState<ReportData | null>(null);

  const handleGenerate = () => {
    try {
      if (chapterName) {
        setReport(buildChapterReport(chapterName, counties));
      } else if (countyFips) {
        setReport(buildCountyReport(countyFips, counties));
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  if (!chapterName && !countyFips) return null;

  return (
    <>
      <button
        onClick={handleGenerate}
        className={`inline-flex items-center gap-1 font-medium text-arc-red hover:text-red-700 transition-colors ${
          size === 'xs' ? 'text-[10px]' : 'text-xs'
        }`}
        title="Generate PDF Report"
      >
        <FileText size={size === 'xs' ? 10 : 12} />
        Report
      </button>
      {report && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
            <p className="text-sm text-gray-500">Generating report...</p>
          </div>
        }>
          <EntityReport report={report} onClose={() => setReport(null)} />
        </Suspense>
      )}
    </>
  );
}
