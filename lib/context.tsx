'use client';

// FlareProvider — global data context for FLARE Analytics v2
// Loads by-county.json once, provides filtered/aggregated data to all tabs

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { CountyData, FilterState, MetricMode, AggregatedRow } from './types';
import { loadCounties } from './data-loader';
import { filterCounties, aggregateCounties, computeNational, injectBenchmarks } from './aggregator';
import { buildOrgHierarchy, type OrgHierarchy } from './org-hierarchy';

interface FlareContextValue {
  // Raw data
  counties: CountyData[];
  loading: boolean;

  // Filters
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  clearFilters: () => void;

  // Metric mode
  metricMode: MetricMode;
  setMetricMode: (mode: MetricMode) => void;

  // Derived data
  filteredCounties: CountyData[];
  national: AggregatedRow;
  filteredNational: AggregatedRow;

  // Aggregation helper
  aggregateBy: (groupBy: 'division' | 'region' | 'chapter' | 'state') => AggregatedRow[];

  // Org hierarchy for cascading filters
  hierarchy: OrgHierarchy;
  divisionOptions: string[];
  regionOptions: string[];
  chapterOptions: string[];
  stateOptions: string[];
}

const EMPTY_FILTERS: FilterState = { division: null, region: null, chapter: null, state: null };

const EMPTY_NATIONAL: AggregatedRow = {
  name: 'National', level: 'national', total: 0, care: 0, notification: 0, gap: 0,
  careRate: 0, gapRate: 0, avgSvi: 0, population: 0, households: 0, poverty: 0,
  medianIncome: 0, medianAge: 0, diversityIndex: 0, homeValue: 0, firesPer10k: 0,
  countyCount: 0, monthly: [],
};

const EMPTY_HIERARCHY: OrgHierarchy = {
  divisions: [],
  divisionToRegions: new Map(),
  regionToChapters: new Map(),
  chapterToRegion: new Map(),
  regionToDivision: new Map(),
};

const FlareContext = createContext<FlareContextValue | null>(null);

export function FlareProvider({ children }: { children: ReactNode }) {
  const [counties, setCounties] = useState<CountyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFiltersState] = useState<FilterState>(EMPTY_FILTERS);
  const [metricMode, setMetricMode] = useState<MetricMode>('raw');

  useEffect(() => {
    loadCounties().then(data => {
      setCounties(data);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load county data:', err);
      setLoading(false);
    });
  }, []);

  const hierarchy = useMemo(() => {
    if (counties.length === 0) return EMPTY_HIERARCHY;
    return buildOrgHierarchy(counties);
  }, [counties]);

  const national = useMemo(() => {
    if (counties.length === 0) return EMPTY_NATIONAL;
    return computeNational(counties);
  }, [counties]);

  const filteredCounties = useMemo(() => {
    return filterCounties(counties, filters);
  }, [counties, filters]);

  const filteredNational = useMemo(() => {
    if (filteredCounties.length === 0) return EMPTY_NATIONAL;
    return computeNational(filteredCounties);
  }, [filteredCounties]);

  // Cascading filter options
  const divisionOptions = useMemo(() => hierarchy.divisions, [hierarchy]);

  const regionOptions = useMemo(() => {
    if (filters.division) {
      return hierarchy.divisionToRegions.get(filters.division) || [];
    }
    return Array.from(hierarchy.divisionToRegions.values()).flat().sort();
  }, [hierarchy, filters.division]);

  const chapterOptions = useMemo(() => {
    if (filters.region) {
      return hierarchy.regionToChapters.get(filters.region) || [];
    }
    if (filters.division) {
      const regions = hierarchy.divisionToRegions.get(filters.division) || [];
      return regions.flatMap(r => hierarchy.regionToChapters.get(r) || []).sort();
    }
    return Array.from(hierarchy.regionToChapters.values()).flat().sort();
  }, [hierarchy, filters.division, filters.region]);

  const stateOptions = useMemo(() => {
    const stateSet = new Set<string>();
    for (const c of filteredCounties.length > 0 ? filteredCounties : counties) {
      if (c.state) stateSet.add(c.state);
    }
    return Array.from(stateSet).sort();
  }, [counties, filteredCounties]);

  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(prev => {
      // Clear downstream filters when upstream changes
      const next = { ...newFilters };
      if (prev.division !== next.division) {
        next.region = null;
        next.chapter = null;
      }
      if (prev.region !== next.region) {
        next.chapter = null;
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(EMPTY_FILTERS);
  }, []);

  const aggregateBy = useCallback((groupBy: 'division' | 'region' | 'chapter' | 'state') => {
    const rows = aggregateCounties(filteredCounties, groupBy);

    // Determine parent for benchmarks
    let parent: AggregatedRow;
    if (filters.region) {
      parent = computeNational(counties.filter(c => c.region === filters.region));
    } else if (filters.division) {
      parent = computeNational(counties.filter(c => c.division === filters.division));
    } else {
      parent = national;
    }

    return injectBenchmarks(rows, parent, national);
  }, [filteredCounties, filters, counties, national]);

  const value: FlareContextValue = {
    counties, loading, filters, setFilters, clearFilters,
    metricMode, setMetricMode,
    filteredCounties, national, filteredNational,
    aggregateBy, hierarchy,
    divisionOptions, regionOptions, chapterOptions, stateOptions,
  };

  return <FlareContext.Provider value={value}>{children}</FlareContext.Provider>;
}

export function useFlare(): FlareContextValue {
  const ctx = useContext(FlareContext);
  if (!ctx) throw new Error('useFlare must be used within FlareProvider');
  return ctx;
}
