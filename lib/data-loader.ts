// Data loaders for FLARE Analytics v2
// Primary source: by-county.json (2,997 records) — all aggregation done client-side

import type { DailyData, FirePointsData, FireStationsData, CountyData } from './types';
import type { Topology } from 'topojson-specification';

const cache = new Map<string, unknown>();

async function fetchJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const data = await res.json();
  cache.set(path, data);
  return data as T;
}

// Primary data source — loads once, aggregator does the rest
export const loadCounties = () => fetchJson<CountyData[]>('/data/by-county.json');

// Lazy-loaded for map + trends
export const loadFirePoints = () => fetchJson<FirePointsData>('/data/fires-points.json');
export const loadFireStations = () => fetchJson<FireStationsData>('/data/fire-stations.json');
export const loadDaily = () => fetchJson<DailyData[]>('/data/by-day.json');

// TopoJSON for choropleth
export const loadStatesTopo = () => fetchJson<Topology>('/data/geo/states-albers-10m.json');
export const loadCountiesTopo = () => fetchJson<Topology>('/data/geo/counties-albers-10m.json');
