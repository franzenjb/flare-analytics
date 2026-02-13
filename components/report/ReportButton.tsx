'use client';

import { useState, lazy, Suspense } from 'react';
import { FileText } from 'lucide-react';
import { useFlare } from '@/lib/context';
import { buildChapterReport, buildCountyReport, type ReportData } from '@/lib/report-data';

const EntityReport = lazy(() => import('./EntityReport'));

/** Generate Report button for chapters or counties */
export default function ReportButton({ chapterName, countyFips, size = 'default' }: {
  chapterName?: string;
  countyFips?: string;
  size?: 'default' | 'sm';
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

  const label = chapterName ? 'Generate Chapter Report' : 'Generate County Report';

  return (
    <>
      <button
        onClick={handleGenerate}
        className={`inline-flex items-center font-semibold bg-arc-red text-white rounded hover:bg-red-700 transition-colors shadow-sm ${
          size === 'sm' ? 'gap-1.5 px-3 py-1.5 text-xs' : 'gap-2 px-5 py-2.5 text-sm'
        }`}
        title={label}
      >
        <FileText size={size === 'sm' ? 14 : 18} />
        {label}
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
