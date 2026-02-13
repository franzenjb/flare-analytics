// Core computation engine for FLARE Analytics v2
// All aggregation from raw county data — no pre-aggregated JSON files needed

import type { CountyData, MonthlyData, AggregatedRow, FilterState, MetricMode, OrgLevel } from './types';

/** Filter counties by org hierarchy + state */
export function filterCounties(counties: CountyData[], filters: FilterState): CountyData[] {
  return counties.filter(c => {
    if (filters.division && c.division !== filters.division) return false;
    if (filters.region && c.region !== filters.region) return false;
    if (filters.chapter && c.chapter !== filters.chapter) return false;
    if (filters.state && c.state !== filters.state) return false;
    return true;
  });
}

/** Aggregate counties into grouped rows by org level */
export function aggregateCounties(
  counties: CountyData[],
  groupBy: 'division' | 'region' | 'chapter' | 'state'
): AggregatedRow[] {
  const groups = new Map<string, CountyData[]>();
  for (const c of counties) {
    const key = c[groupBy];
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const levelMap: Record<string, OrgLevel> = {
    division: 'division',
    region: 'region',
    chapter: 'chapter',
    state: 'state',
  };

  return Array.from(groups.entries()).map(([name, group]) =>
    buildAggregatedRow(name, levelMap[groupBy], group)
  );
}

/** Compute national-level aggregate from all counties */
export function computeNational(counties: CountyData[]): AggregatedRow {
  return buildAggregatedRow('National', 'national', counties);
}

/** Build a single AggregatedRow from a group of counties */
function buildAggregatedRow(name: string, level: OrgLevel, counties: CountyData[]): AggregatedRow {
  let total = 0, care = 0, notification = 0, gap = 0;
  let population = 0, households = 0, poverty = 0, stationCount = 0;
  let incomeSum = 0, incomeCount = 0;
  let ageSum = 0, ageCount = 0;
  let diversitySum = 0, diversityCount = 0;
  let homeSum = 0, homeCount = 0;
  let sviWeightedSum = 0, sviWeightTotal = 0;

  // Monthly accumulator — assume 12 months
  const monthlyMap = new Map<string, { care: number; notification: number; gap: number; total: number }>();

  for (const c of counties) {
    total += c.total;
    care += c.care;
    notification += c.notification;
    gap += c.gap;
    population += c.population || 0;
    households += c.households || 0;
    poverty += c.poverty || 0;
    stationCount += c.stationCount || 0;

    // Weight demographics by fire count (not population) for meaningful averages
    if (c.medianIncome > 0) { incomeSum += c.medianIncome * c.total; incomeCount += c.total; }
    if (c.medianAge > 0) { ageSum += c.medianAge * c.total; ageCount += c.total; }
    if (c.diversityIndex > 0) { diversitySum += c.diversityIndex * c.total; diversityCount += c.total; }
    if (c.homeValue > 0) { homeSum += c.homeValue * c.total; homeCount += c.total; }

    // SVI weighted by fire count
    if (c.avgSvi > 0 && c.total > 0) {
      sviWeightedSum += c.avgSvi * c.total;
      sviWeightTotal += c.total;
    }

    // Monthly
    for (const m of c.monthly) {
      const existing = monthlyMap.get(m.month);
      if (existing) {
        existing.care += m.care;
        existing.notification += m.notification;
        existing.gap += m.gap;
        existing.total += m.total;
      } else {
        monthlyMap.set(m.month, { care: m.care, notification: m.notification, gap: m.gap, total: m.total });
      }
    }
  }

  const monthly: MonthlyData[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({ month, ...d }));

  return {
    name,
    level,
    total,
    care,
    notification,
    gap,
    careRate: total > 0 ? (care / total) * 100 : 0,
    gapRate: total > 0 ? (gap / total) * 100 : 0,
    avgSvi: sviWeightTotal > 0 ? sviWeightedSum / sviWeightTotal : 0,
    population,
    households,
    poverty,
    medianIncome: incomeCount > 0 ? Math.round(incomeSum / incomeCount) : 0,
    medianAge: ageCount > 0 ? +(ageSum / ageCount).toFixed(1) : 0,
    diversityIndex: diversityCount > 0 ? +(diversitySum / diversityCount).toFixed(1) : 0,
    homeValue: homeCount > 0 ? Math.round(homeSum / homeCount) : 0,
    firesPer10k: population > 0 ? +((total / population) * 10000).toFixed(1) : 0,
    povertyRate: population > 0 ? +((poverty / population) * 100).toFixed(1) : 0,
    affordabilityRatio: incomeCount > 0 && (incomeSum / incomeCount) > 0
      ? +((homeCount > 0 ? homeSum / homeCount : 0) / (incomeSum / incomeCount)).toFixed(1)
      : 0,
    stationCount,
    countyCount: counties.length,
    monthly,
  };
}

/** Inject parent + national benchmarks onto rows */
export function injectBenchmarks(
  rows: AggregatedRow[],
  parentAvg: AggregatedRow,
  nationalAvg: AggregatedRow
): AggregatedRow[] {
  return rows.map(row => ({
    ...row,
    parentCareRate: parentAvg.careRate,
    parentGapRate: parentAvg.gapRate,
    nationalCareRate: nationalAvg.careRate,
    nationalGapRate: nationalAvg.gapRate,
  }));
}

/** Normalize a value based on metric mode */
export function applyMetricMode(
  value: number,
  population: number,
  households: number,
  mode: MetricMode
): number {
  if (mode === 'raw') return value;
  if (mode === 'perCapita') {
    return population > 0 ? +((value / population) * 10000).toFixed(2) : 0;
  }
  if (mode === 'perHousehold') {
    return households > 0 ? +((value / households) * 10000).toFixed(2) : 0;
  }
  return value;
}

/** Get metric mode label suffix */
export function metricModeLabel(mode: MetricMode): string {
  if (mode === 'perCapita') return ' per 10K pop';
  if (mode === 'perHousehold') return ' per 10K HH';
  return '';
}
