// Data types for FLARE Analytics

export interface SummaryData {
  totalFires: number;
  rcCare: number;
  rcNotification: number;
  noNotification: number;
  careRate: number;
  gapRate: number;
  avgSviRisk: number;
  uniqueDepartments: number;
  statesCovered: number;
}

export interface FunnelStage {
  label: string;
  value: number;
  color: string;
}

export interface FunnelData {
  stages: FunnelStage[];
}

export interface MonthlyData {
  month: string;
  care: number;
  notification: number;
  gap: number;
  total: number;
}

export interface DailyData {
  date: string;
  care: number;
  notification: number;
  gap: number;
  total: number;
}

export interface StateData {
  state: string;
  total: number;
  care: number;
  notification: number;
  gap: number;
  careRate: number;
  gapRate: number;
  avgSvi: number;
  monthly: MonthlyData[];
}

export interface DepartmentData {
  name: string;
  total: number;
  care: number;
  notification: number;
  gap: number;
  careRate: number;
  gapRate: number;
  avgSvi: number;
  gapScore: number;
}

export interface GapAnalysisData {
  state: string;
  gapCount: number;
  totalFires: number;
  avgSvi: number;
  opportunityScore: number;
  gapRate: number;
  careRate: number;
}

export interface RiskDistributionData {
  bins: string[];
  total: number[];
  gap: number[];
}

export interface FirePointsData {
  lat: number[];
  lon: number[];
  cat: number[];  // 0=care, 1=notification, 2=gap
  svi: number[];
  month: number[];
  ch: number[];   // chapter index (-1 = unknown)
  rg: number[];   // region index (-1 = unknown)
  chapters: string[];
  regions: string[];
  count: number;
}

export interface CountyData {
  name: string;
  fips: string;
  county: string;
  state: string;
  chapter: string;
  region: string;
  division: string;
  total: number;
  care: number;
  notification: number;
  gap: number;
  careRate: number;
  gapRate: number;
  avgSvi: number;
  population: number;
  medianIncome: number;
  households: number;
  poverty: number;
  medianAge: number;
  diversityIndex: number;
  homeValue: number;
  firesPer10k: number;
  monthly: MonthlyData[];
}

export interface OrgUnitData {
  name: string;
  total: number;
  care: number;
  notification: number;
  gap: number;
  careRate: number;
  gapRate: number;
  avgSvi: number;
  countyCount: number;
  population: number;
  firesPer10k: number;
  monthly: MonthlyData[];
}

export type TabId = 'executive' | 'map' | 'gap' | 'temporal' | 'departments' | 'regional' | 'organization';

export const CATEGORY_COLORS = {
  care: '#2d5a27',
  notification: '#1e4a6d',
  gap: '#ED1B2E',
} as const;

export const CATEGORY_LABELS = {
  care: 'RC Care',
  notification: 'RC Notification',
  gap: 'No Notification',
} as const;
