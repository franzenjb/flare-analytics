import type {
  SummaryData,
  FunnelData,
  MonthlyData,
  DailyData,
  StateData,
  DepartmentData,
  GapAnalysisData,
  RiskDistributionData,
  FirePointsData,
} from './types';

const cache = new Map<string, unknown>();

async function fetchJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const data = await res.json();
  cache.set(path, data);
  return data as T;
}

export const loadSummary = () => fetchJson<SummaryData>('/data/summary.json');
export const loadFunnel = () => fetchJson<FunnelData>('/data/funnel.json');
export const loadMonthly = () => fetchJson<MonthlyData[]>('/data/by-month.json');
export const loadDaily = () => fetchJson<DailyData[]>('/data/by-day.json');
export const loadStates = () => fetchJson<StateData[]>('/data/by-state.json');
export const loadDepartments = () => fetchJson<DepartmentData[]>('/data/by-department.json');
export const loadGapAnalysis = () => fetchJson<GapAnalysisData[]>('/data/gap-analysis.json');
export const loadRiskDistribution = () => fetchJson<RiskDistributionData>('/data/risk-distribution.json');
export const loadFirePoints = () => fetchJson<FirePointsData>('/data/fires-points.json');
