// Geo utilities for FLARE Analytics choropleth maps
// Converts TopoJSON to SVG paths using pre-projected AlbersUSA coordinates (no d3-geo needed)

import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';

// FIPS state code → 2-letter abbreviation
export const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '72': 'PR', '78': 'VI', '66': 'GU',
};

// State abbreviation → FIPS
export const STATE_TO_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(FIPS_TO_STATE).map(([fips, abbr]) => [abbr, fips])
);

// County FIPS (5-digit) → state FIPS (first 2 digits)
export function countyFipsToStateFips(fips: string): string {
  return fips.padStart(5, '0').slice(0, 2);
}

export interface GeoFeature {
  id: string; // FIPS code
  abbr: string; // state abbreviation (for state features)
  name: string;
  path: string; // SVG path d attribute
  centroid: [number, number];
}

// Convert a GeoJSON polygon ring to SVG path string
function ringToPath(ring: number[][]): string {
  return ring.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join('') + 'Z';
}

// Convert a GeoJSON geometry to SVG path d string
function geometryToPath(geometry: GeoJSON.Geometry): string {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ringToPath).join('');
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map(poly => poly.map(ringToPath).join('')).join('');
  }
  return '';
}

// Compute centroid of a polygon (simple average of exterior ring)
function computeCentroid(geometry: GeoJSON.Geometry): [number, number] {
  let coords: number[][] = [];
  if (geometry.type === 'Polygon') {
    coords = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    // Use the largest polygon's exterior ring
    let maxLen = 0;
    for (const poly of geometry.coordinates) {
      if (poly[0].length > maxLen) {
        maxLen = poly[0].length;
        coords = poly[0];
      }
    }
  }
  if (coords.length === 0) return [0, 0];
  const n = coords.length;
  const x = coords.reduce((s, c) => s + c[0], 0) / n;
  const y = coords.reduce((s, c) => s + c[1], 0) / n;
  return [x, y];
}

// Parse state TopoJSON into SVG-ready features
export function parseStatesTopo(topo: Topology): GeoFeature[] {
  const geojson = feature(topo, topo.objects.states as GeometryCollection);
  return geojson.features
    .map(f => {
      const fipsId = String(f.id).padStart(2, '0');
      const abbr = FIPS_TO_STATE[fipsId] || '';
      if (!abbr) return null;
      return {
        id: fipsId,
        abbr,
        name: (f.properties as { name?: string })?.name || abbr,
        path: geometryToPath(f.geometry),
        centroid: computeCentroid(f.geometry),
      };
    })
    .filter((f): f is GeoFeature => f !== null);
}

// Parse county TopoJSON into SVG-ready features
export function parseCountiesTopo(topo: Topology): GeoFeature[] {
  const geojson = feature(topo, topo.objects.counties as GeometryCollection);
  return geojson.features.map(f => {
    const fipsId = String(f.id).padStart(5, '0');
    return {
      id: fipsId,
      abbr: FIPS_TO_STATE[countyFipsToStateFips(fipsId)] || '',
      name: (f.properties as { name?: string })?.name || fipsId,
      path: geometryToPath(f.geometry),
      centroid: computeCentroid(f.geometry),
    };
  });
}

// Quantile color scales for choropleth metrics
export function getMetricColor(
  value: number,
  maxValue: number,
  metric: string
): string {
  if (maxValue === 0) return '#e5e5e5';
  const intensity = value / maxValue;

  if (metric === 'gapRate' || metric === 'povertyRate') {
    // Red scale — higher is worse
    if (intensity > 0.8) return '#991b1b';
    if (intensity > 0.6) return '#dc2626';
    if (intensity > 0.4) return '#f87171';
    if (intensity > 0.2) return '#fca5a5';
    return '#fee2e2';
  }
  if (metric === 'careRate') {
    if (intensity > 0.8) return '#14532d';
    if (intensity > 0.6) return '#166534';
    if (intensity > 0.4) return '#22c55e';
    if (intensity > 0.2) return '#86efac';
    return '#dcfce7';
  }
  if (metric === 'medianIncome' || metric === 'homeValue') {
    // Blue scale — neutral
    if (intensity > 0.8) return '#1e3a5f';
    if (intensity > 0.6) return '#2563eb';
    if (intensity > 0.4) return '#60a5fa';
    if (intensity > 0.2) return '#93c5fd';
    return '#dbeafe';
  }
  if (metric === 'medianAge') {
    // Amber/neutral scale
    if (intensity > 0.8) return '#78350f';
    if (intensity > 0.6) return '#b45309';
    if (intensity > 0.4) return '#f59e0b';
    if (intensity > 0.2) return '#fcd34d';
    return '#fef3c7';
  }
  // total / avgSvi / default — neutral gray-blue scale
  if (intensity > 0.8) return '#1e293b';
  if (intensity > 0.6) return '#475569';
  if (intensity > 0.4) return '#64748b';
  if (intensity > 0.2) return '#94a3b8';
  return '#cbd5e1';
}

// Determine if label text should be white or dark based on fill color
export function getLabelColor(fillColor: string): string {
  // Dark colors need white text
  const dark = ['#991b1b', '#dc2626', '#14532d', '#166534', '#1e293b', '#475569', '#64748b', '#1e3a5f', '#2563eb', '#78350f', '#b45309'];
  return dark.includes(fillColor) ? '#ffffff' : '#1a1a1a';
}

// States large enough to show labels on
export const LABEL_STATES = new Set([
  'TX', 'CA', 'MT', 'AZ', 'NV', 'CO', 'NM', 'OR', 'WY', 'MI',
  'MN', 'WI', 'IA', 'IL', 'MO', 'AR', 'OK', 'KS', 'NE', 'SD',
  'ND', 'GA', 'FL', 'AL', 'MS', 'LA', 'NC', 'SC', 'TN', 'KY',
  'VA', 'WV', 'OH', 'IN', 'PA', 'NY', 'ME', 'WA', 'ID', 'UT',
]);
