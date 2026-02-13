'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useFlare } from '@/lib/context';
import { loadFirePoints, loadStatesTopo, loadCountiesTopo } from '@/lib/data-loader';
import { parseStatesTopo, parseCountiesTopo, getMetricColor, getLabelColor, LABEL_STATES, STATE_TO_FIPS, type GeoFeature } from '@/lib/geo-utils';
import { formatNumber, formatPercent, formatSvi } from '@/lib/format';
import { bucketBySvi, computeEquityGap } from '@/lib/svi';
import type { FirePointsData, CountyData } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';
import SectionHeader from '@/components/ui/SectionHeader';
import KpiCard from '@/components/ui/KpiCard';
import SviQuintileChart from '@/components/ui/SviQuintileChart';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import { Flame, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';

type MapMode = 'choropleth' | 'points';
type GeoLevel = 'state' | 'county';
type ChoroplethMetric = 'total' | 'careRate' | 'gapRate' | 'avgSvi' | 'firesPer10k';

const METRIC_OPTIONS: { key: ChoroplethMetric; label: string }[] = [
  { key: 'total', label: 'Total Fires' },
  { key: 'careRate', label: 'Care Rate' },
  { key: 'gapRate', label: 'Gap Rate' },
  { key: 'avgSvi', label: 'Avg SVI' },
  { key: 'firesPer10k', label: 'Fires Per 10K' },
];

const CATEGORY_RGB: Record<number, [number, number, number]> = {
  0: [45, 90, 39],
  1: [30, 74, 109],
  2: [237, 27, 46],
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
  const careRate = total > 0 ? (care / total) * 100 : 0;
  const gapRate = total > 0 ? (gap / total) * 100 : 0;

  const quintiles = useMemo(() => bucketBySvi(entityCounties), [entityCounties]);
  const equity = useMemo(() => computeEquityGap(quintiles), [quintiles]);

  return (
    <div className="bg-white rounded border border-arc-gray-100 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-headline)] text-base font-bold text-arc-black">{entity.name}</h3>
        <button onClick={onClose} className="text-xs text-arc-gray-500 hover:text-arc-red">Close</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Fires" value={formatNumber(total)} icon={Flame} sparklineData={[]} />
        <KpiCard label="Care Rate" value={formatPercent(careRate)} icon={ShieldCheck} />
        <KpiCard label="Gap Rate" value={formatPercent(gapRate)} icon={AlertTriangle} highlight />
        <KpiCard label="Population" value={formatNumber(population)} icon={Activity} />
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

  const metricType = metric === 'gapRate' ? 'gapRate' : metric === 'careRate' ? 'careRate' : metric === 'avgSvi' ? 'avgSvi' : 'total';

  return (
    <svg viewBox="0 0 975 610" className="w-full" style={{ maxHeight: 500 }}>
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

// DeckGL Point Map (carried forward from v1)
function DeckGLPointMap({ points, filters, hierarchy }: {
  points: FirePointsData;
  filters: { showCare: boolean; showNotification: boolean; showGap: boolean };
  hierarchy: ReturnType<typeof import('@/lib/org-hierarchy').buildOrgHierarchy>;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const deckRefInternal = useRef<unknown>(null);
  const mapRefInternal = useRef<unknown>(null);

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
          getTooltip: ({ object }: { object?: PointDatum }) => {
            if (!object) return null;
            const lines = [`<strong>${catLabels[object.cat]}</strong>`, `SVI: ${object.svi.toFixed(3)}`];
            if (object.chapter) lines.push(`Chapter: ${object.chapter}`);
            if (object.region) lines.push(`Region: ${object.region}`);
            return { html: lines.join('<br/>'), style: { fontFamily: 'var(--font-body)', fontSize: '12px', padding: '8px 12px', background: 'white', border: '1px solid #e5e5e5', borderRadius: '4px', color: '#1a1a1a' } };
          },
        });
        map.addControl(overlay);
        deckRefInternal.current = overlay;
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

  // Update layers when filtered data changes
  useEffect(() => {
    if (!deckRefInternal.current) return;
    import('@deck.gl/layers').then(layers => {
      const overlay = deckRefInternal.current as { setProps: (p: { layers: unknown[] }) => void };
      overlay.setProps({
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
      });
    });
  }, [filteredData]);

  return (
    <div className="relative">
      <div ref={mapContainerRef} style={{ width: '100%', height: 500 }} className="rounded" />
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-xs border border-arc-gray-100">
        <div className="flex gap-3">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] }} />
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
        });
      }
    }
    return map;
  }, [aggregateBy]);

  const countyDataMap = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const c of filteredCounties) {
      map.set(c.fips, {
        total: c.total, careRate: c.careRate, gapRate: c.gapRate,
        avgSvi: c.avgSvi, firesPer10k: c.firesPer10k,
      });
    }
    return map;
  }, [filteredCounties]);

  // Filtered FIPS set — only highlight counties/states that match filters
  const filteredFips = useMemo(() => {
    if (!filters.division && !filters.region && !filters.chapter && !filters.state) return null;
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
              { key: 'showCare' as const, label: 'Care', color: CATEGORY_COLORS.care },
              { key: 'showNotification' as const, label: 'Notification', color: CATEGORY_COLORS.notification },
              { key: 'showGap' as const, label: 'Gap', color: CATEGORY_COLORS.gap },
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
          </div>
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
            <DeckGLPointMap points={points} filters={pointFilters} hierarchy={hierarchy} />
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
