// SVI quintile analysis for FLARE Analytics v2

import type { CountyData, SviQuintileBucket } from './types';

export const SVI_QUINTILES: { label: string; range: [number, number] }[] = [
  { label: 'Very Low', range: [0, 0.2] },
  { label: 'Low', range: [0.2, 0.4] },
  { label: 'Moderate', range: [0.4, 0.6] },
  { label: 'High', range: [0.6, 0.8] },
  { label: 'Very High', range: [0.8, 1.0] },
];

/** Bucket counties into 5 SVI quintiles */
export function bucketBySvi(counties: CountyData[]): SviQuintileBucket[] {
  return SVI_QUINTILES.map(({ label, range }) => {
    const bucket = counties.filter(c =>
      c.avgSvi >= range[0] && (range[1] === 1.0 ? c.avgSvi <= range[1] : c.avgSvi < range[1])
    );

    const total = bucket.reduce((s, c) => s + c.total, 0);
    const care = bucket.reduce((s, c) => s + c.care, 0);
    const gap = bucket.reduce((s, c) => s + c.gap, 0);
    const population = bucket.reduce((s, c) => s + (c.population || 0), 0);

    return {
      label,
      range,
      total,
      care,
      gap,
      careRate: total > 0 ? +((care / total) * 100).toFixed(1) : 0,
      gapRate: total > 0 ? +((gap / total) * 100).toFixed(1) : 0,
      population,
      countyCount: bucket.length,
    };
  });
}

/** Compute equity gap analysis — ratio of highest to lowest SVI quintile gap rates */
export function computeEquityGap(quintiles: SviQuintileBucket[]): {
  ratio: number;
  narrative: string;
  highestGapRate: number;
  lowestGapRate: number;
} {
  const withFires = quintiles.filter(q => q.total > 0);
  if (withFires.length < 2) {
    return { ratio: 1, narrative: 'Insufficient data for equity analysis.', highestGapRate: 0, lowestGapRate: 0 };
  }

  const lowest = withFires[0]; // Very Low SVI
  const highest = withFires[withFires.length - 1]; // Very High SVI

  const ratio = lowest.gapRate > 0 ? +(highest.gapRate / lowest.gapRate).toFixed(2) : 0;

  let narrative: string;
  if (ratio > 1.5) {
    narrative = `Highest-vulnerability communities have a ${highest.gapRate}% gap rate vs ${lowest.gapRate}% in lowest-vulnerability areas — a ${ratio}x equity gap. ${highest.countyCount} counties with Very High SVI account for ${highest.gap.toLocaleString()} missed fires.`;
  } else if (ratio > 1.1) {
    narrative = `Moderate equity gap: ${highest.gapRate}% gap rate in highest-SVI vs ${lowest.gapRate}% in lowest-SVI communities (${ratio}x).`;
  } else {
    narrative = `Gap rates are relatively equitable across SVI quintiles (${ratio}x ratio).`;
  }

  return { ratio, narrative, highestGapRate: highest.gapRate, lowestGapRate: lowest.gapRate };
}
