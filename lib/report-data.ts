// Report data assembly for FLARE entity reports
// Assembles complete data package for any chapter or county

import type { CountyData, AggregatedRow, MonthlyData } from './types';
import { filterCounties, computeNational, aggregateCounties } from './aggregator';
import { bucketBySvi, computeEquityGap } from './svi';
import type { SviQuintileBucket } from './types';

export interface PeerEntity {
  name: string;
  total: number;
  careRate: number;
  gapRate: number;
  avgSvi: number;
  population: number;
  firesPer10k: number;
  povertyRate: number;
  medianIncome: number;
  stationCount: number;
}

export interface ReportData {
  // Entity info
  entityName: string;
  entityLevel: 'chapter' | 'county';
  dataDate: string;
  generatedAt: string;

  // Parent hierarchy
  chapter?: string;
  region?: string;
  division?: string;
  state?: string;

  // Fire response KPIs
  total: number;
  care: number;
  notification: number;
  gap: number;
  careRate: number;
  gapRate: number;
  avgSvi: number;
  firesPer10k: number;

  // Demographics
  population: number;
  households: number;
  medianIncome: number;
  povertyRate: number;
  homeValue: number;
  medianAge: number;
  diversityIndex: number;
  affordabilityRatio: number;

  // Fire stations
  stationCount: number;
  firesPerStation: number;

  // Monthly trends (12 months)
  monthly: MonthlyData[];

  // SVI analysis
  quintiles: SviQuintileBucket[];
  equityNarrative: string;
  equityGap: number;

  // County count (for chapters)
  countyCount: number;
  counties: { name: string; fips: string; total: number; careRate: number; gapRate: number; stationCount: number }[];

  // Benchmarks
  national: PeerEntity;
  parentRegion?: PeerEntity;

  // Peer comparison (similar-sized entities)
  peers: PeerEntity[];

  // Data quality
  missingDemographics: number; // counties with no census data
  missingStations: number; // counties with 0 stations
}

function toPeer(row: AggregatedRow): PeerEntity {
  return {
    name: row.name,
    total: row.total,
    careRate: row.careRate,
    gapRate: row.gapRate,
    avgSvi: row.avgSvi,
    population: row.population,
    firesPer10k: row.firesPer10k,
    povertyRate: row.povertyRate,
    medianIncome: row.medianIncome,
    stationCount: row.stationCount,
  };
}

/** Build complete report data for a chapter */
export function buildChapterReport(
  chapterName: string,
  allCounties: CountyData[],
): ReportData {
  const entityCounties = allCounties.filter(c => c.chapter === chapterName);
  if (entityCounties.length === 0) {
    throw new Error(`No counties found for chapter: ${chapterName}`);
  }

  const agg = computeNational(entityCounties);
  const national = computeNational(allCounties);

  // Parent region
  const regionName = entityCounties[0]?.region;
  const regionCounties = regionName ? allCounties.filter(c => c.region === regionName) : [];
  const regionAgg = regionCounties.length > 0 ? computeNational(regionCounties) : undefined;

  // SVI
  const quintiles = bucketBySvi(entityCounties);
  const equity = computeEquityGap(quintiles);

  // Find peers — chapters of similar total fire count (within 50% range)
  const chapterRows = aggregateCounties(allCounties, 'chapter');
  const lo = agg.total * 0.5;
  const hi = agg.total * 1.5;
  const peers = chapterRows
    .filter(r => r.name !== chapterName && r.total >= lo && r.total <= hi)
    .sort((a, b) => Math.abs(a.total - agg.total) - Math.abs(b.total - agg.total))
    .slice(0, 5)
    .map(toPeer);

  // Station metrics
  const stationCount = entityCounties.reduce((s, c) => s + (c.stationCount || 0), 0);

  return {
    entityName: chapterName,
    entityLevel: 'chapter',
    dataDate: 'Calendar Year 2024',
    generatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),

    chapter: chapterName,
    region: entityCounties[0]?.region,
    division: entityCounties[0]?.division,

    total: agg.total,
    care: agg.care,
    notification: agg.notification,
    gap: agg.gap,
    careRate: agg.careRate,
    gapRate: agg.gapRate,
    avgSvi: agg.avgSvi,
    firesPer10k: agg.firesPer10k,

    population: agg.population,
    households: agg.households,
    medianIncome: agg.medianIncome,
    povertyRate: agg.povertyRate,
    homeValue: agg.homeValue,
    medianAge: agg.medianAge,
    diversityIndex: agg.diversityIndex,
    affordabilityRatio: agg.affordabilityRatio,

    stationCount,
    firesPerStation: stationCount > 0 ? +(agg.total / stationCount).toFixed(1) : 0,

    monthly: agg.monthly,

    quintiles,
    equityNarrative: equity.narrative,
    equityGap: equity.ratio,

    countyCount: entityCounties.length,
    counties: entityCounties
      .sort((a, b) => b.total - a.total)
      .map(c => ({
        name: `${c.county}, ${c.state}`,
        fips: c.fips,
        total: c.total,
        careRate: c.careRate,
        gapRate: c.gapRate,
        stationCount: c.stationCount || 0,
      })),

    national: toPeer(national),
    parentRegion: regionAgg ? toPeer(regionAgg) : undefined,
    peers,

    missingDemographics: entityCounties.filter(c => !c.population || c.population === 0).length,
    missingStations: entityCounties.filter(c => !c.stationCount || c.stationCount === 0).length,
  };
}

/** Build complete report data for a county */
export function buildCountyReport(
  countyFips: string,
  allCounties: CountyData[],
): ReportData {
  const county = allCounties.find(c => c.fips === countyFips);
  if (!county) {
    throw new Error(`County not found: ${countyFips}`);
  }

  const national = computeNational(allCounties);
  const poverty = county.poverty || 0;
  const povertyRate = county.population > 0 ? +((poverty / county.population) * 100).toFixed(1) : 0;
  const affordabilityRatio = county.medianIncome > 0 ? +((county.homeValue || 0) / county.medianIncome).toFixed(1) : 0;

  // Parent chapter/region
  const chapterCounties = county.chapter ? allCounties.filter(c => c.chapter === county.chapter) : [];
  const chapterAgg = chapterCounties.length > 0 ? computeNational(chapterCounties) : undefined;

  // SVI (single county)
  const quintiles = bucketBySvi([county]);
  const equity = computeEquityGap(quintiles);

  const stationCount = county.stationCount || 0;

  return {
    entityName: `${county.county}, ${county.state}`,
    entityLevel: 'county',
    dataDate: 'Calendar Year 2024',
    generatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),

    chapter: county.chapter,
    region: county.region,
    division: county.division,
    state: county.state,

    total: county.total,
    care: county.care,
    notification: county.notification,
    gap: county.gap,
    careRate: county.careRate,
    gapRate: county.gapRate,
    avgSvi: county.avgSvi,
    firesPer10k: county.firesPer10k,

    population: county.population,
    households: county.households,
    medianIncome: county.medianIncome,
    povertyRate,
    homeValue: county.homeValue,
    medianAge: county.medianAge,
    diversityIndex: county.diversityIndex,
    affordabilityRatio,

    stationCount,
    firesPerStation: stationCount > 0 ? +(county.total / stationCount).toFixed(1) : 0,

    monthly: county.monthly,

    quintiles,
    equityNarrative: equity.narrative,
    equityGap: equity.ratio,

    countyCount: 1,
    counties: [{
      name: `${county.county}, ${county.state}`,
      fips: county.fips,
      total: county.total,
      careRate: county.careRate,
      gapRate: county.gapRate,
      stationCount,
    }],

    national: toPeer(national),
    parentRegion: chapterAgg ? { ...toPeer(chapterAgg), name: county.chapter || 'Chapter' } : undefined,
    peers: [],

    missingDemographics: county.population === 0 ? 1 : 0,
    missingStations: stationCount === 0 ? 1 : 0,
  };
}

/** Generate executive summary narrative (template-based) */
export function generateSummary(report: ReportData): string {
  const { entityName, total, careRate, gapRate, avgSvi, national, population, stationCount, medianIncome } = report;

  const careDiff = careRate - national.careRate;
  const careAdj = careDiff > 5 ? 'above' : careDiff < -5 ? 'below' : 'near';

  const gapDiff = gapRate - national.gapRate;
  const gapAdj = gapDiff > 5 ? 'above' : gapDiff < -5 ? 'below' : 'near';

  const sviAdj = avgSvi > 0.6 ? 'high' : avgSvi > 0.4 ? 'moderate' : 'low';

  let summary = `${entityName} experienced ${total.toLocaleString()} residential fire events in CY2024, `;
  summary += `serving a population of ${population.toLocaleString()}. `;
  summary += `The care rate of ${careRate.toFixed(1)}% is ${careAdj} the national average (${national.careRate.toFixed(1)}%), `;
  summary += `while the gap rate of ${gapRate.toFixed(1)}% is ${gapAdj} the national average (${national.gapRate.toFixed(1)}%). `;
  summary += `The area has ${sviAdj} social vulnerability (SVI: ${avgSvi.toFixed(2)}). `;

  if (medianIncome > 0 && medianIncome < national.medianIncome * 0.8) {
    summary += `The median income of $${medianIncome.toLocaleString()} is below the national average, indicating communities with elevated need. `;
  }

  if (stationCount > 0) {
    summary += `The area is served by ${stationCount.toLocaleString()} fire stations (${report.firesPerStation} fires per station). `;
  }

  return summary;
}
