'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFlare } from '@/lib/context';
import { buildChapterReport, buildCountyReport } from '@/lib/report-data';
import EntityReport from '@/components/report/EntityReport';

function ReportPage() {
  const searchParams = useSearchParams();
  const { counties, loading } = useFlare();

  const chapter = searchParams.get('chapter');
  const county = searchParams.get('county');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4">
            <svg viewBox="0 0 32 32" className="w-full h-full animate-pulse">
              <rect x="12" y="4" width="8" height="24" fill="#ED1B2E" />
              <rect x="4" y="12" width="24" height="8" fill="#ED1B2E" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (!chapter && !county) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="font-[family-name:var(--font-headline)] text-xl font-bold text-gray-900 mb-2">
            FLARE Report
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            No entity specified. Use a URL like:
          </p>
          <div className="text-xs text-gray-400 space-y-1 font-[family-name:var(--font-data)]">
            <p>/report?chapter=Chapter+Name</p>
            <p>/report?county=12345</p>
          </div>
          <a href="/" className="inline-block mt-6 text-sm text-arc-red hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  try {
    const report = chapter
      ? buildChapterReport(chapter, counties)
      : buildCountyReport(county!, counties);

    return <EntityReport report={report} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="font-[family-name:var(--font-headline)] text-xl font-bold text-gray-900 mb-2">
            Report Not Found
          </h1>
          <p className="text-sm text-gray-500 mb-4">{message}</p>
          <a href="/" className="inline-block text-sm text-arc-red hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }
}

export default function ReportRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    }>
      <ReportPage />
    </Suspense>
  );
}
