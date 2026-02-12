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
  count: number;
}

export type TabId = 'executive' | 'map' | 'gap' | 'temporal' | 'departments' | 'regional';

export const CATEGORY_COLORS = {
  care: '#2d5a27',
  notification: '#4a4a4a',
  gap: '#ED1B2E',
} as const;

export const CATEGORY_LABELS = {
  care: 'RC Care',
  notification: 'RC Notification',
  gap: 'No Notification',
} as const;
