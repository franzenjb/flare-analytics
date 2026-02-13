'use client';

import { useState, lazy, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { TabId } from '@/lib/types';
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  Calendar,
  Building2,
  Globe,
  Network,
} from 'lucide-react';

const ExecutiveDashboard = lazy(() => import('@/components/dashboard/ExecutiveDashboard'));
const MapExplorer = lazy(() => import('@/components/dashboard/MapExplorer'));
const GapAnalysis = lazy(() => import('@/components/dashboard/GapAnalysis'));
const TemporalPatterns = lazy(() => import('@/components/dashboard/TemporalPatterns'));
const DepartmentIntel = lazy(() => import('@/components/dashboard/DepartmentIntel'));
const RegionalDeepDive = lazy(() => import('@/components/dashboard/RegionalDeepDive'));
const OrganizationView = lazy(() => import('@/components/dashboard/OrganizationView'));

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'executive', label: 'Executive', icon: LayoutDashboard },
  { id: 'map', label: 'Map Explorer', icon: Map },
  { id: 'gap', label: 'Gap Analysis', icon: AlertTriangle },
  { id: 'temporal', label: 'Temporal', icon: Calendar },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'regional', label: 'Regional', icon: Globe },
  { id: 'organization', label: 'Organization', icon: Network },
];

const VALID_TABS = new Set<TabId>(['executive', 'map', 'gap', 'temporal', 'departments', 'regional', 'organization']);

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

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabId | null;
  const initialTab = tabParam && VALID_TABS.has(tabParam) ? tabParam : 'executive';
  const [activeTab, setActiveTabState] = useState<TabId>(initialTab);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    const url = tab === 'executive' ? '/' : `/?tab=${tab}`;
    router.replace(url, { scroll: false });
  }, [router]);

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
            <div className="hidden sm:block text-right">
              <span className="font-[family-name:var(--font-data)] text-xs text-arc-gray-500">
                103,400 fire events
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-arc-gray-100 sticky top-0 z-50 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
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
      </nav>

      {/* Tab Content */}
      <main id={`tabpanel-${activeTab}`} role="tabpanel" aria-label={TABS.find(t => t.id === activeTab)?.label} className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'executive' && <ExecutiveDashboard />}
          {activeTab === 'map' && <MapExplorer />}
          {activeTab === 'gap' && <GapAnalysis />}
          {activeTab === 'temporal' && <TemporalPatterns />}
          {activeTab === 'departments' && <DepartmentIntel />}
          {activeTab === 'regional' && <RegionalDeepDive />}
          {activeTab === 'organization' && <OrganizationView />}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-arc-gray-100 bg-white mt-8 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-arc-gray-500 text-center">
            American Red Cross — FLARE Analytics — Data through December 2024
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
