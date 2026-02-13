'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useFlare } from '@/lib/context';
import { loadFirePoints, loadFireStations, loadStatesTopo, loadCountiesTopo } from '@/lib/data-loader';
import { parseStatesTopo, parseCountiesTopo, getMetricColor, getLabelColor, LABEL_STATES, STATE_TO_FIPS, FIPS_TO_STATE, type GeoFeature } from '@/lib/geo-utils';
import { formatNumber, formatCompact, formatPercent, formatSvi, formatCurrency } from '@/lib/format';
import { bucketBySvi, computeEquityGap } from '@/lib/svi';
import type { FirePointsData, FireStationsData, CountyData } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';
import SectionHeader from '@/components/ui/SectionHeader';
import KpiCard from '@/components/ui/KpiCard';
import SviQuintileChart from '@/components/ui/SviQuintileChart';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import ReportButton from '@/components/report/ReportButton';
import { Flame, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';

type MapMode = 'choropleth' | 'points';
type GeoLevel = 'state' | 'county';
type ChoroplethMetric = 'total' | 'careRate' | 'gapRate' | 'avgSvi' | 'firesPer10k' | 'medianIncome' | 'homeValue' | 'medianAge';

const METRIC_OPTIONS: { key: ChoroplethMetric; label: string }[] = [
  { key: 'total', label: 'Total Fires' },
  { key: 'careRate', label: 'Care Rate' },
  { key: 'gapRate', label: 'Gap Rate' },
  { key: 'avgSvi', label: 'Avg SVI' },
  { key: 'firesPer10k', label: 'Fires Per 10K' },
  { key: 'medianIncome', label: 'Median Income' },
  { key: 'homeValue', label: 'Home Value' },
  { key: 'medianAge', label: 'Median Age' },
];

const CATEGORY_RGB: Record<number, [number, number, number]> = {
  0: [34, 139, 34],   // care — vivid green
  1: [30, 100, 200],  // notification — bright blue
  2: [220, 38, 38],   // gap — strong red
};

interface PointDatum {
  position: [number, number];
  cat: number;
  svi: number;
  chapter?: string;
  region?: string;
}

// Detail panel for clicked state/county
function DetailPanel({ entity, counties, onClose }: {
  entity: { name: string; fips: string };
  counties: CountyData[];
  onClose: () => void;
}) {
  const entityCounties = useMemo(() => {
    // For states, match by state abbreviation from FIPS
    return counties.filter(c => {
      if (entity.fips.length === 2) {
        return c.state === entity.name;
      }
      return c.fips === entity.fips;
    });
  }, [counties, entity]);

  const total = entityCounties.reduce((s, c) => s + c.total, 0);
  const care = entityCounties.reduce((s, c) => s + c.care, 0);
  const gap = entityCounties.reduce((s, c) => s + c.gap, 0);
  const population = entityCounties.reduce((s, c) => s + (c.population || 0), 0);
  const households = entityCounties.reduce((s, c) => s + (c.households || 0), 0);
  const poverty = entityCounties.reduce((s, c) => s + (c.poverty || 0), 0);
  const careRate = total > 0 ? (care / total) * 100 : 0;
  const gapRate = total > 0 ? (gap / total) * 100 : 0;
  const povertyRate = population > 0 ? (poverty / population) * 100 : 0;

  // Weighted averages for demographics
  const incomeWeighted = entityCounties.reduce((s, c) => c.medianIncome > 0 ? s + c.medianIncome * c.total : s, 0);
  const incomeTotal = entityCounties.reduce((s, c) => c.medianIncome > 0 ? s + c.total : s, 0);
  const medianIncome = incomeTotal > 0 ? Math.round(incomeWeighted / incomeTotal) : 0;

  const homeWeighted = entityCounties.reduce((s, c) => c.homeValue > 0 ? s + c.homeValue * c.total : s, 0);
  const homeTotal = entityCounties.reduce((s, c) => c.homeValue > 0 ? s + c.total : s, 0);
  const homeValue = homeTotal > 0 ? Math.round(homeWeighted / homeTotal) : 0;

  const ageWeighted = entityCounties.reduce((s, c) => c.medianAge > 0 ? s + c.medianAge * c.total : s, 0);
  const ageTotal = entityCounties.reduce((s, c) => c.medianAge > 0 ? s + c.total : s, 0);
  const medianAge = ageTotal > 0 ? +(ageWeighted / ageTotal).toFixed(1) : 0;

  const divWeighted = entityCounties.reduce((s, c) => c.diversityIndex > 0 ? s + c.diversityIndex * c.total : s, 0);
  const divTotal = entityCounties.reduce((s, c) => c.diversityIndex > 0 ? s + c.total : s, 0);
  const diversityIndex = divTotal > 0 ? +(divWeighted / divTotal).toFixed(1) : 0;
  const stationCountTotal = entityCounties.reduce((s, c) => s + (c.stationCount || 0), 0);
  const firesPerStation = stationCountTotal > 0 ? +(total / stationCountTotal).toFixed(1) : 0;

  const quintiles = useMemo(() => bucketBySvi(entityCounties), [entityCounties]);
  const equity = useMemo(() => computeEquityGap(quintiles), [quintiles]);

  return (
    <div className="bg-white rounded border border-arc-gray-100 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">{entity.name}</h3>
        <div className="flex items-center gap-3">
          {entity.fips.length === 5 && <ReportButton countyFips={entity.fips} size="sm" />}
          <button onClick={onClose} className="text-xs text-arc-gray-500 hover:text-arc-red">Close</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Fires" value={formatNumber(total)} icon={Flame} sparklineData={[]} />
        <KpiCard label="Care Rate" value={formatPercent(careRate)} icon={ShieldCheck} />
        <KpiCard label="Gap Rate" value={formatPercent(gapRate)} icon={AlertTriangle} highlight />
        <KpiCard label="Population" value={formatCompact(population)} icon={Activity} />
      </div>
      {/* Community Profile */}
      <div>
        <h4 className="text-xs font-semibold text-arc-gray-500 mb-2">Community Profile</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-arc-gray-500">Income</span><span className="font-[family-name:var(--font-data)] font-medium">{formatCurrency(medianIncome)}</span></div>
          <div className="flex justify-between"><span className="text-arc-gray-500">Home Value</span><span className="font-[family-name:var(--font-data)] font-medium">{formatCurrency(homeValue)}</span></div>
          <div className="flex justify-between"><span className="text-arc-gray-500">Median Age</span><span className="font-[family-name:var(--font-data)] font-medium">{medianAge}</span></div>
          <div className="flex justify-between"><span className="text-arc-gray-500">Households</span><span className="font-[family-name:var(--font-data)] font-medium">{formatCompact(households)}</span></div>
          <div className="flex justify-between"><span className="text-arc-gray-500">Fire Stations</span><span className="font-[family-name:var(--font-data)] font-medium">{formatNumber(stationCountTotal)}</span></div>
          <div className="flex justify-between"><span className="text-arc-gray-500">Fires/Station</span><span className="font-[family-name:var(--font-data)] font-medium">{firesPerStation}</span></div>
        </div>
      </div>
      {quintiles.some(q => q.total > 0) && (
        <div>
          <p className="text-[10px] text-arc-gray-700 mb-2">{equity.narrative}</p>
          <SviQuintileChart quintiles={quintiles} />
        </div>
      )}
    </div>
  );
}

// Choropleth SVG Map
function ChoroplethMap({ features, dataMap, metric, geoLevel, selectedFips, onSelect, filteredFips }: {
  features: GeoFeature[];
  dataMap: Map<string, Record<string, number>>;
  metric: ChoroplethMetric;
  geoLevel: GeoLevel;
  selectedFips: string | null;
  onSelect: (fips: string, name: string) => void;
  filteredFips: Set<string> | null;
}) {
  const maxValue = useMemo(() => {
    let max = 0;
    for (const d of dataMap.values()) {
      const v = d[metric] || 0;
      if (v > max) max = v;
    }
    return max;
  }, [dataMap, metric]);

  const metricType = metric;

  // Auto-zoom viewBox when filtering
  const viewBox = useMemo(() => {
    if (!filteredFips) return '0 0 975 610';
    const filtered = features.filter(f => filteredFips.has(f.id));
    if (filtered.length === 0) return '0 0 975 610';

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const f of filtered) {
      const [x, y] = f.centroid;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }

    const spanX = maxX - minX || 100;
    const spanY = maxY - minY || 60;
    const pad = Math.max(spanX, spanY) * 0.4 + 80;

    return `${Math.max(0, minX - pad)} ${Math.max(0, minY - pad)} ${Math.max(100, spanX + pad * 2)} ${Math.max(60, spanY + pad * 2)}`;
  }, [features, filteredFips]);

  return (
    <svg viewBox={viewBox} className="w-full" style={{ maxHeight: 500 }}>
      {features.map(f => {
        const data = dataMap.get(f.id);
        const value = data?.[metric] || 0;
        const isFiltered = filteredFips ? filteredFips.has(f.id) : true;
        const fill = isFiltered ? getMetricColor(value, maxValue, metricType) : '#f0f0f0';
        const isSelected = f.id === selectedFips;

        return (
          <g key={f.id}>
            <path
              d={f.path}
              fill={fill}
              stroke={isSelected ? '#ED1B2E' : '#fff'}
              strokeWidth={isSelected ? 2 : geoLevel === 'state' ? 1 : 0.3}
              opacity={isFiltered ? 1 : 0.3}
              className="cursor-pointer transition-opacity"
              onClick={() => onSelect(f.id, f.abbr || f.name)}
            >
              <title>{`${f.name}: ${value}`}</title>
            </path>
            {geoLevel === 'state' && LABEL_STATES.has(f.abbr) && isFiltered && (
              <text
                x={f.centroid[0]}
                y={f.centroid[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fontWeight={600}
                fill={getLabelColor(fill)}
                pointerEvents="none"
              >
                {f.abbr}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface StationDatum {
  position: [number, number];
  name: string;
  addr: string;
  city: string;
}

// DeckGL Point Map (carried forward from v1)
function DeckGLPointMap({ points, filters, hierarchy, stations, showStations }: {
  points: FirePointsData;
  filters: { showCare: boolean; showNotification: boolean; showGap: boolean };
  hierarchy: ReturnType<typeof import('@/lib/org-hierarchy').buildOrgHierarchy>;
  stations: FireStationsData | null;
  showStations: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const deckRefInternal = useRef<unknown>(null);
  const mapRefInternal = useRef<unknown>(null);
  const [mapReady, setMapReady] = useState(false);

  const { filteredCounties: globalFilteredCounties } = useFlare();
  const globalFilters = useFlare().filters;

  const filteredData = useMemo(() => {
    const result: PointDatum[] = [];
    const chapters = points.chapters || [];
    const regions = points.regions || [];

    // Build chapter filter set from global filters
    let chapterFilterSet: Set<number> | null = null;
    if (globalFilters.chapter || globalFilters.region || globalFilters.division) {
      chapterFilterSet = new Set<number>();
      const allowedChapters = new Set<string>();
      if (globalFilters.chapter) {
        allowedChapters.add(globalFilters.chapter);
      } else if (globalFilters.region) {
        const chs = hierarchy.regionToChapters.get(globalFilters.region) || [];
        chs.forEach(ch => allowedChapters.add(ch));
      } else if (globalFilters.division) {
        const regs = hierarchy.divisionToRegions.get(globalFilters.division) || [];
        for (const r of regs) {
          const chs = hierarchy.regionToChapters.get(r) || [];
          chs.forEach(ch => allowedChapters.add(ch));
        }
      }
      for (let ci = 0; ci < chapters.length; ci++) {
        if (allowedChapters.has(chapters[ci])) chapterFilterSet.add(ci);
      }
    }

    // State filter
    const stateFilter = globalFilters.state;

    for (let i = 0; i < points.count; i++) {
      const cat = points.cat[i];
      if (cat === 0 && !filters.showCare) continue;
      if (cat === 1 && !filters.showNotification) continue;
      if (cat === 2 && !filters.showGap) continue;

      if (chapterFilterSet) {
        const chIdx = points.ch?.[i] ?? -1;
        if (chIdx < 0 || !chapterFilterSet.has(chIdx)) continue;
      }

      // State filter via FIPS prefix
      if (stateFilter) {
        const fips = points.fips[i];
        if (!fips || FIPS_TO_STATE[fips.slice(0, 2)] !== stateFilter) continue;
      }

      // County filter via direct FIPS match
      if (globalFilters.county && points.fips[i] !== globalFilters.county) continue;

      const chIdx = points.ch?.[i] ?? -1;
      const rgIdx = points.rg?.[i] ?? -1;
      result.push({
        position: [points.lon[i], points.lat[i]],
        cat,
        svi: points.svi[i],
        chapter: chIdx >= 0 ? chapters[chIdx] : undefined,
        region: rgIdx >= 0 ? regions[rgIdx] : undefined,
      });
    }
    return result;
  }, [points, filters, globalFilters, hierarchy]);

  // Build station data for the layer
  const stationData = useMemo(() => {
    if (!stations || !showStations) return [];
    const result: StationDatum[] = [];
    for (let i = 0; i < stations.count; i++) {
      result.push({
        position: [stations.lon[i], stations.lat[i]],
        name: stations.name[i],
        addr: stations.addr[i],
        city: stations.city[i],
      });
    }
    return result;
  }, [stations, showStations]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cleanup = false;

    Promise.all([
      import('maplibre-gl'),
      import('@deck.gl/mapbox'),
      import('@deck.gl/layers'),
    ]).then(([maplibregl, deckMapbox, layers]) => {
      if (cleanup || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [-98.5, 39.8],
        zoom: 4,
      });
      mapRefInternal.current = map;

      map.on('load', () => {
        if (cleanup) return;
        const catLabels = ['RC Care', 'RC Notification', 'No Notification'];
        const overlay = new deckMapbox.MapboxOverlay({
          layers: [
            new layers.ScatterplotLayer({
              id: 'scatter',
              data: filteredData,
              getPosition: (d: PointDatum) => d.position,
              getFillColor: (d: PointDatum) => [...CATEGORY_RGB[d.cat], 160],
              getRadius: 800,
              radiusMinPixels: 1.5,
              radiusMaxPixels: 8,
              pickable: true,
            }),
          ],
          getTooltip: ({ object }: { object?: PointDatum | StationDatum }) => {
            if (!object) return null;
            const style = { fontFamily: 'var(--font-body)', fontSize: '12px', padding: '8px 12px', background: 'white', border: '1px solid #e5e5e5', borderRadius: '4px', color: '#1a1a1a' };
            // Station tooltip
            if ('name' in object && !('cat' in object)) {
              const s = object as StationDatum;
              const lines = [`<strong>${s.name}</strong>`];
              if (s.addr) lines.push(s.addr);
              if (s.city) lines.push(s.city);
              return { html: lines.join('<br/>'), style };
            }
            // Fire point tooltip
            const p = object as PointDatum;
            const lines = [`<strong>${catLabels[p.cat]}</strong>`, `SVI: ${p.svi.toFixed(3)}`];
            if (p.chapter) lines.push(`Chapter: ${p.chapter}`);
            if (p.region) lines.push(`Region: ${p.region}`);
            return { html: lines.join('<br/>'), style };
          },
        });
        map.addControl(overlay);
        deckRefInternal.current = overlay;
        setMapReady(true);
      });
    });

    return () => {
      cleanup = true;
      if (mapRefInternal.current) {
        (mapRefInternal.current as { remove: () => void }).remove();
        mapRefInternal.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers when filtered data or stations change
  useEffect(() => {
    if (!deckRefInternal.current) return;
    import('@deck.gl/layers').then(layers => {
      const overlay = deckRefInternal.current as { setProps: (p: { layers: unknown[] }) => void };
      const layerList: unknown[] = [
        new layers.ScatterplotLayer({
          id: 'scatter',
          data: filteredData,
          getPosition: (d: PointDatum) => d.position,
          getFillColor: (d: PointDatum) => [...CATEGORY_RGB[d.cat], 160],
          getRadius: 800,
          radiusMinPixels: 1.5,
          radiusMaxPixels: 8,
          pickable: true,
        }),
      ];
      if (stationData.length > 0) {
        layerList.push(
          new layers.IconLayer({
            id: 'stations',
            data: stationData,
            getPosition: (d: StationDatum) => d.position,
            getIcon: () => ({
              url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="%23f9a825" fill-opacity="0.5" stroke="%23f57f17" stroke-width="1"/></svg>'),
              width: 16,
              height: 16,
              anchorY: 8,
            }),
            getSize: 12,
            sizeMinPixels: 4,
            sizeMaxPixels: 14,
            pickable: true,
          }),
        );
      }
      overlay.setProps({ layers: layerList });
    });
  }, [filteredData, stationData]);

  // Auto-zoom to filtered area when org filters change or data loads
  const filtersKey = `${globalFilters.division}|${globalFilters.region}|${globalFilters.chapter}|${globalFilters.state}|${globalFilters.county}`;
  const pointCount = filteredData.length;

  useEffect(() => {
    if (!mapReady || !mapRefInternal.current) return;
    const map = mapRefInternal.current as { flyTo: (opts: object) => void; fitBounds: (bounds: [[number, number], [number, number]], opts?: object) => void };

    const hasFilters = !!(globalFilters.division || globalFilters.region || globalFilters.chapter || globalFilters.state || globalFilters.county);

    if (!hasFilters) {
      map.flyTo({ center: [-98.5, 39.8], zoom: 4, duration: 1000 });
      return;
    }

    if (filteredData.length === 0) return;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    for (const p of filteredData) {
      const [lon, lat] = p.position;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
    map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 60, duration: 1000, maxZoom: 14 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, mapReady, pointCount]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} style={{ width: '100%', height: 500 }} className="rounded" />
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-xs border border-arc-gray-100">
        <div className="flex gap-3">
          {([
            { label: 'RC Care', color: '#22c55e' },
            { label: 'RC Notification', color: '#3b82f6' },
            { label: 'No Notification', color: '#ef4444' },
          ]).map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-xs border border-arc-gray-100 font-[family-name:var(--font-data)]">
        {formatNumber(filteredData.length)} points
      </div>
    </div>
  );
}

export default function GeographyTab() {
  const { filteredCounties, filters, hierarchy, aggregateBy } = useFlare();
  const [mapMode, setMapMode] = useState<MapMode>('choropleth');
  const [geoLevel, setGeoLevel] = useState<GeoLevel>('state');
  const [metric, setMetric] = useState<ChoroplethMetric>('gapRate');
  const [selectedEntity, setSelectedEntity] = useState<{ name: string; fips: string } | null>(null);
  const [stateFeatures, setStateFeatures] = useState<GeoFeature[] | null>(null);
  const [countyFeatures, setCountyFeatures] = useState<GeoFeature[] | null>(null);
  const [points, setPoints] = useState<FirePointsData | null>(null);
  const [stations, setStations] = useState<FireStationsData | null>(null);
  const [showStations, setShowStations] = useState(false);
  const [pointFilters, setPointFilters] = useState({ showCare: true, showNotification: true, showGap: true });

  // Load geo data
  useEffect(() => {
    loadStatesTopo().then(topo => setStateFeatures(parseStatesTopo(topo)));
    loadCountiesTopo().then(topo => setCountyFeatures(parseCountiesTopo(topo)));
  }, []);

  // Lazy load points only when switching to points mode
  useEffect(() => {
    if (mapMode === 'points' && !points) {
      loadFirePoints().then(setPoints);
    }
  }, [mapMode, points]);

  // Lazy load stations when toggle is on
  useEffect(() => {
    if (showStations && !stations) {
      loadFireStations().then(setStations);
    }
  }, [showStations, stations]);

  // Build data maps for choropleth
  const stateDataMap = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    const stateAgg = aggregateBy('state');
    for (const row of stateAgg) {
      const fips = STATE_TO_FIPS[row.name];
      if (fips) {
        map.set(fips, {
          total: row.total, careRate: row.careRate, gapRate: row.gapRate,
          avgSvi: row.avgSvi, firesPer10k: row.firesPer10k,
          medianIncome: row.medianIncome, povertyRate: row.povertyRate,
          homeValue: row.homeValue, medianAge: row.medianAge,
        });
      }
    }
    return map;
  }, [aggregateBy]);

  const countyDataMap = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const c of filteredCounties) {
      const povertyRate = c.population > 0 ? +((( c.poverty || 0) / c.population) * 100).toFixed(1) : 0;
      map.set(c.fips, {
        total: c.total, careRate: c.careRate, gapRate: c.gapRate,
        avgSvi: c.avgSvi, firesPer10k: c.firesPer10k,
        medianIncome: c.medianIncome, povertyRate,
        homeValue: c.homeValue, medianAge: c.medianAge,
      });
    }
    return map;
  }, [filteredCounties]);

  // Filtered FIPS set — only highlight counties/states that match filters
  const filteredFips = useMemo(() => {
    if (!filters.division && !filters.region && !filters.chapter && !filters.state && !filters.county) return null;
    const set = new Set<string>();
    for (const c of filteredCounties) {
      set.add(c.fips); // county FIPS
      set.add(c.fips.slice(0, 2)); // state FIPS
    }
    return set;
  }, [filteredCounties, filters]);

  const handleSelect = useCallback((fips: string, name: string) => {
    setSelectedEntity(prev => prev?.fips === fips ? null : { fips, name });
  }, []);

  // Sub-entity table for detail panel
  const subEntities = useMemo(() => {
    if (!selectedEntity) return [];
    if (selectedEntity.fips.length === 2) {
      // State selected — show counties in that state
      return filteredCounties
        .filter(c => c.state === selectedEntity.name)
        .sort((a, b) => b.total - a.total);
    }
    return [];
  }, [selectedEntity, filteredCounties]);

  const subTableCols: ColumnDef<CountyData>[] = [
    { key: 'county', label: 'County', sortable: true },
    { key: 'total', label: 'Fires', align: 'right', sortable: true, format: v => formatNumber(Number(v)) },
    { key: 'gapRate', label: 'Gap %', align: 'right', sortable: true, format: v => formatPercent(Number(v)),
      heatmap: { min: 20, max: 70, lowColor: '#22c55e', highColor: '#fca5a5' } },
    { key: 'avgSvi', label: 'SVI', align: 'right', sortable: true, format: v => formatSvi(Number(v)) },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Geography"
        subtitle={`Spatial distribution of ${formatNumber(filteredCounties.reduce((s, c) => s + c.total, 0))} fires`}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Map mode toggle */}
        <div className="flex items-center gap-1 bg-white rounded border border-arc-gray-100">
          {(['choropleth', 'points'] as MapMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMapMode(m)}
              className={`px-3 py-1.5 text-xs font-medium ${mapMode === m ? 'bg-arc-black text-white' : 'text-arc-gray-500 hover:text-arc-black'}`}
            >
              {m === 'choropleth' ? 'Choropleth' : 'Point Map'}
            </button>
          ))}
        </div>

        {mapMode === 'choropleth' && (
          <>
            {/* Geo level toggle */}
            <div className="flex items-center gap-1 bg-white rounded border border-arc-gray-100">
              {(['state', 'county'] as GeoLevel[]).map(l => (
                <button
                  key={l}
                  onClick={() => setGeoLevel(l)}
                  className={`px-3 py-1.5 text-xs font-medium ${geoLevel === l ? 'bg-arc-black text-white' : 'text-arc-gray-500 hover:text-arc-black'}`}
                >
                  {l === 'state' ? 'States' : 'Counties'}
                </button>
              ))}
            </div>

            {/* Metric selector */}
            <select
              value={metric}
              onChange={e => setMetric(e.target.value as ChoroplethMetric)}
              className="text-xs border border-arc-gray-100 rounded px-2 py-1.5 bg-white"
            >
              {METRIC_OPTIONS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </>
        )}

        {mapMode === 'points' && (
          <div className="flex items-center gap-3">
            {([
              { key: 'showCare' as const, label: 'Care', color: '#22c55e' },
              { key: 'showNotification' as const, label: 'Notification', color: '#3b82f6' },
              { key: 'showGap' as const, label: 'Gap', color: '#ef4444' },
            ]).map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setPointFilters(f => ({ ...f, [key]: !f[key] }))}
                className="flex items-center gap-1.5 text-xs"
              >
                {pointFilters[key] ? <Eye size={12} /> : <EyeOff size={12} className="text-arc-gray-300" />}
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pointFilters[key] ? color : '#a3a3a3' }} />
                <span className={pointFilters[key] ? 'text-arc-gray-700' : 'text-arc-gray-300'}>{label}</span>
              </button>
            ))}
            <span className="w-px h-4 bg-arc-gray-200" />
            <button
              onClick={() => setShowStations(s => !s)}
              className="flex items-center gap-1.5 text-xs"
            >
              {showStations ? <Eye size={12} /> : <EyeOff size={12} className="text-arc-gray-300" />}
              <svg width="10" height="10" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill={showStations ? '#f9a825' : '#a3a3a3'} /></svg>
              <span className={showStations ? 'text-arc-gray-700' : 'text-arc-gray-300'}>
                Stations {stations ? `(${formatNumber(stations.count)})` : ''}
              </span>
            </button>
          </div>
        )}

        {/* Fire stations toggle — choropleth mode only (point mode has it inline above) */}
        {mapMode === 'choropleth' && (
          <button
            onClick={() => setShowStations(s => !s)}
            className="flex items-center gap-1.5 text-xs ml-auto"
          >
            {showStations ? <Eye size={12} /> : <EyeOff size={12} className="text-arc-gray-300" />}
            <svg width="10" height="10" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill={showStations ? '#f9a825' : '#a3a3a3'} /></svg>
            <span className={showStations ? 'text-arc-gray-700' : 'text-arc-gray-300'}>
              Stations {stations ? `(${formatNumber(stations.count)})` : ''}
            </span>
          </button>
        )}
      </div>

      {/* Map + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          {mapMode === 'choropleth' ? (
            <div className="bg-white rounded p-4 border border-arc-gray-100">
              {geoLevel === 'state' && stateFeatures ? (
                <ChoroplethMap
                  features={stateFeatures}
                  dataMap={stateDataMap}
                  metric={metric}
                  geoLevel="state"
                  selectedFips={selectedEntity?.fips || null}
                  onSelect={handleSelect}
                  filteredFips={filteredFips}
                />
              ) : countyFeatures ? (
                <ChoroplethMap
                  features={countyFeatures}
                  dataMap={countyDataMap}
                  metric={metric}
                  geoLevel="county"
                  selectedFips={selectedEntity?.fips || null}
                  onSelect={handleSelect}
                  filteredFips={filteredFips}
                />
              ) : (
                <div className="h-[500px] animate-pulse bg-arc-gray-100 rounded" />
              )}
            </div>
          ) : points ? (
            <DeckGLPointMap points={points} filters={pointFilters} hierarchy={hierarchy} stations={stations} showStations={showStations} />
          ) : (
            <div className="h-[500px] animate-pulse bg-arc-gray-100 rounded flex items-center justify-center text-xs text-arc-gray-500">
              Loading 103K fire points...
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedEntity && (
          <div className="lg:w-80 shrink-0 space-y-4">
            <DetailPanel
              entity={selectedEntity}
              counties={filteredCounties}
              onClose={() => setSelectedEntity(null)}
            />
            {subEntities.length > 0 && (
              <div className="bg-white rounded p-4 border border-arc-gray-100">
                <h4 className="text-xs font-semibold text-arc-gray-500 mb-3">Counties in {selectedEntity.name}</h4>
                <DataTable
                  data={subEntities}
                  columns={subTableCols}
                  pageSize={10}
                  exportFilename={`flare-${selectedEntity.name}-counties`}
                  rowKey={r => r.fips}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
