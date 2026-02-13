'use client';

import { useState, lazy, Suspense, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFlare } from '@/lib/context';
import type { TabId, MetricMode } from '@/lib/types';
import FilterBar from '@/components/ui/FilterBar';
import MetricToggle from '@/components/ui/MetricToggle';
import {
  LayoutDashboard,
  Table2,
  Map,
  TrendingUp,
} from 'lucide-react';

const DashboardTab = lazy(() => import('@/components/dashboard/DashboardTab'));
const DataExplorerTab = lazy(() => import('@/components/dashboard/DataExplorerTab'));
const GeographyTab = lazy(() => import('@/components/dashboard/GeographyTab'));
const TrendsTab = lazy(() => import('@/components/dashboard/TrendsTab'));

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'explorer', label: 'Data Explorer', icon: Table2 },
  { id: 'geography', label: 'Geography', icon: Map },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
];

const VALID_TABS = new Set<TabId>(['dashboard', 'explorer', 'geography', 'trends']);

function TabSkeleton() {
  return (
    <div className="animate-pulse p-8">
      <div className="h-8 bg-arc-gray-100 rounded w-64 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-arc-gray-100 rounded" />
        ))}
      </div>
      <div className="h-64 bg-arc-gray-100 rounded" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-arc-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4">
          <svg viewBox="0 0 32 32" className="w-full h-full animate-pulse">
            <rect x="12" y="4" width="8" height="24" fill="#ED1B2E" />
            <rect x="4" y="12" width="24" height="8" fill="#ED1B2E" />
          </svg>
        </div>
        <p className="text-sm text-arc-gray-500">Loading FLARE Analytics...</p>
        <p className="text-[10px] text-arc-gray-300 mt-1">2,997 counties • 103,400 fire events</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loading, filteredNational, setFilters, setMetricMode } = useFlare();

  // Parse URL params on mount
  const tabParam = searchParams.get('tab') as TabId | null;
  const initialTab = tabParam && VALID_TABS.has(tabParam) ? tabParam : 'dashboard';
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  // Sync URL filters to context on mount
  useEffect(() => {
    const div = searchParams.get('div') || null;
    const reg = searchParams.get('reg') || null;
    const ch = searchParams.get('ch') || null;
    const state = searchParams.get('state') || null;
    const mode = searchParams.get('mode') as MetricMode | null;

    if (div || reg || ch || state) {
      setFilters({ division: div, region: reg, chapter: ch, state, county: null });
    }
    if (mode && ['raw', 'perCapita', 'perHousehold'].includes(mode)) {
      setMetricMode(mode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    const url = tab === 'dashboard' ? '/' : `/?tab=${tab}`;
    router.replace(url, { scroll: false });
  }, [router]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-arc-cream">
      {/* Header */}
      <header className="bg-white border-b-[3px] border-arc-black print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-7 h-7">
                  <rect x="12" y="4" width="8" height="24" fill="#ED1B2E" />
                  <rect x="4" y="12" width="24" height="8" fill="#ED1B2E" />
                </svg>
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-headline)] text-lg font-bold text-arc-black leading-tight">
                  FLARE Analytics
                </h1>
                <p className="text-xs text-arc-gray-500 leading-tight">
                  Fire Loss Analysis &amp; Response Evaluation — 2024
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <span className="font-[family-name:var(--font-data)] text-xs text-arc-gray-500">
                {filteredNational.total.toLocaleString()} fires · {filteredNational.countyCount.toLocaleString()} counties
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-arc-gray-100 sticky top-0 z-50 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-0 overflow-x-auto" role="tablist" aria-label="Dashboard sections">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={`tabpanel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arc-red focus-visible:ring-offset-1 ${
                    activeTab === id
                      ? 'border-arc-red text-arc-black'
                      : 'border-transparent text-arc-gray-500 hover:text-arc-gray-700 hover:border-arc-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Filter Bar + Metric Toggle */}
      <div className="bg-white border-b border-arc-gray-100 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterBar />
            <MetricToggle />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main id={`tabpanel-${activeTab}`} role="tabpanel" aria-label={TABS.find(t => t.id === activeTab)?.label} className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'explorer' && <DataExplorerTab />}
          {activeTab === 'geography' && <GeographyTab />}
          {activeTab === 'trends' && <TrendsTab />}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-arc-gray-100 bg-white mt-8 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-arc-gray-500 text-center">
            American Red Cross — FLARE Analytics v2 — Data through December 2024
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
