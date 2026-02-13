'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Map as MapIcon, Eye, EyeOff } from 'lucide-react';
import { loadFirePoints, loadSummary } from '@/lib/data-loader';
import { formatNumber, formatSvi } from '@/lib/format';
import type { FirePointsData, SummaryData } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';

const INITIAL_VIEW = {
  longitude: -98.5,
  latitude: 39.8,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

const CATEGORY_RGB: Record<number, [number, number, number]> = {
  0: [45, 90, 39],    // care - green
  1: [30, 74, 109],   // notification - blue
  2: [237, 27, 46],   // gap - red
};

type ViewMode = 'scatter' | 'heatmap';

interface FilterState {
  showCare: boolean;
  showNotification: boolean;
  showGap: boolean;
  monthRange: [number, number];
  sviMin: number;
}

interface PointDatum {
  position: [number, number];
  cat: number;
  svi: number;
  chapter?: string;
  region?: string;
}

function DeckGLMap({ filteredData, gapData, viewMode }: {
  filteredData: PointDatum[];
  gapData: PointDatum[];
  viewMode: ViewMode;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<unknown>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cleanup = false;

    Promise.all([
      import('maplibre-gl'),
      import('@deck.gl/mapbox'),
      import('@deck.gl/layers'),
      import('@deck.gl/aggregation-layers'),
    ]).then(([maplibregl, deckMapbox, layers, aggLayers]) => {
      if (cleanup || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
        zoom: INITIAL_VIEW.zoom,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (cleanup) return;

        const catLabels = ['RC Care', 'RC Notification', 'No Notification'];
        const overlay = new deckMapbox.MapboxOverlay({
          layers: buildLayers(layers.ScatterplotLayer, aggLayers.HeatmapLayer),
          getTooltip: ({ object }: { object?: PointDatum }) => {
            if (!object) return null;
            const label = catLabels[object.cat] || 'Unknown';
            const lines = [
              `<strong>${label}</strong>`,
              `SVI: ${object.svi.toFixed(3)}`,
            ];
            if (object.chapter) lines.push(`Chapter: ${object.chapter}`);
            if (object.region) lines.push(`Region: ${object.region}`);
            return { html: lines.join('<br/>'), style: { fontFamily: 'var(--font-body)', fontSize: '12px', padding: '8px 12px', background: 'white', border: '1px solid #e5e5e5', borderRadius: '4px', color: '#1a1a1a' } };
          },
        });

        map.addControl(overlay);
        deckRef.current = overlay;
      });
    });

    return () => {
      cleanup = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
      }
    };
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers when data/mode changes
  useEffect(() => {
    if (!deckRef.current) return;

    Promise.all([
      import('@deck.gl/layers'),
      import('@deck.gl/aggregation-layers'),
    ]).then(([layers, aggLayers]) => {
      const overlay = deckRef.current as { setProps: (props: { layers: unknown[] }) => void };
      overlay.setProps({
        layers: buildLayers(layers.ScatterplotLayer, aggLayers.HeatmapLayer),
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, gapData, viewMode]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildLayers(ScatterplotLayer: any, HeatmapLayer: any) {
    if (viewMode === 'heatmap') {
      return [
        new HeatmapLayer({
          id: 'heatmap',
          data: gapData,
          getPosition: (d: { position: [number, number] }) => d.position,
          getWeight: (d: { svi: number }) => d.svi,
          radiusPixels: 30,
          intensity: 1,
          threshold: 0.1,
          colorRange: [
            [255, 255, 178],
            [254, 204, 92],
            [253, 141, 60],
            [240, 59, 32],
            [189, 0, 38],
          ],
        }),
      ];
    }
    return [
      new ScatterplotLayer({
        id: 'scatter',
        data: filteredData,
        getPosition: (d: { position: [number, number] }) => d.position,
        getFillColor: (d: { cat: number }) => [...CATEGORY_RGB[d.cat], 160],
        getRadius: 800,
        radiusMinPixels: 1.5,
        radiusMaxPixels: 8,
        pickable: true,
      }),
    ];
  }

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
}

export default function MapExplorer() {
  const [points, setPoints] = useState<FirePointsData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('scatter');
  const [filters, setFilters] = useState<FilterState>({
    showCare: true,
    showNotification: true,
    showGap: true,
    monthRange: [1, 12],
    sviMin: 0,
  });

  useEffect(() => {
    Promise.all([loadFirePoints(), loadSummary()])
      .then(([p, s]) => { setPoints(p); setSummary(s); });
  }, []);

  const filteredData = useMemo(() => {
    if (!points) return [];
    const result: PointDatum[] = [];
    const chapters = points.chapters || [];
    const regions = points.regions || [];
    for (let i = 0; i < points.count; i++) {
      const cat = points.cat[i];
      const month = points.month[i];
      const svi = points.svi[i];
      if (cat === 0 && !filters.showCare) continue;
      if (cat === 1 && !filters.showNotification) continue;
      if (cat === 2 && !filters.showGap) continue;
      if (month < filters.monthRange[0] || month > filters.monthRange[1]) continue;
      if (svi < filters.sviMin) continue;
      const chIdx = points.ch?.[i] ?? -1;
      const rgIdx = points.rg?.[i] ?? -1;
      result.push({
        position: [points.lon[i], points.lat[i]],
        cat,
        svi,
        chapter: chIdx >= 0 ? chapters[chIdx] : undefined,
        region: rgIdx >= 0 ? regions[rgIdx] : undefined,
      });
    }
    return result;
  }, [points, filters]);

  const gapData = useMemo(() => filteredData.filter(d => d.cat === 2), [filteredData]);

  const viewportStats = useMemo(() => {
    const care = filteredData.filter(d => d.cat === 0).length;
    const notification = filteredData.filter(d => d.cat === 1).length;
    const gap = filteredData.filter(d => d.cat === 2).length;
    const total = filteredData.length;
    const avgSvi = total > 0 ? filteredData.reduce((sum, d) => sum + d.svi, 0) / total : 0;
    return { total, care, notification, gap, avgSvi };
  }, [filteredData]);

  if (!points || !summary) {
    return (
      <div className="animate-pulse">
        <div className="h-[600px] bg-arc-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="w-10 h-[3px] bg-arc-red mb-3" />
        <h2 className="font-[family-name:var(--font-headline)] text-2xl font-bold text-arc-black">
          Map Explorer
        </h2>
        <p className="text-sm text-arc-gray-500 mt-1">
          {formatNumber(points.count)} fire events rendered in real-time
        </p>
        <p className="text-xs text-arc-gray-700 mt-2 bg-arc-cream rounded px-3 py-2">
          Showing {formatNumber(viewportStats.total)} points — {formatNumber(viewportStats.gap)} ({viewportStats.total > 0 ? ((viewportStats.gap / viewportStats.total) * 100).toFixed(1) : 0}%) have no RC notification. Avg SVI: {formatSvi(viewportStats.avgSvi)}.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar controls */}
        <div className="lg:w-72 shrink-0 space-y-4">
          {/* View mode toggle */}
          <div className="bg-white rounded p-4 border border-arc-gray-100">
            <h4 className="text-xs font-medium text-arc-gray-500 uppercase tracking-wide mb-3">View Mode</h4>
            <div className="flex gap-2">
              {(['scatter', 'heatmap'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded ${
                    viewMode === mode
                      ? 'bg-arc-black text-white'
                      : 'bg-arc-gray-100 text-arc-gray-700 hover:bg-arc-gray-300'
                  }`}
                >
                  {mode === 'scatter' ? 'Points' : 'Heatmap'}
                </button>
              ))}
            </div>
          </div>

          {/* Category filters */}
          <div className="bg-white rounded p-4 border border-arc-gray-100">
            <h4 className="text-xs font-medium text-arc-gray-500 uppercase tracking-wide mb-3">Categories</h4>
            <div className="space-y-2">
              {([
                { key: 'showCare' as const, label: 'RC Care', color: CATEGORY_COLORS.care },
                { key: 'showNotification' as const, label: 'RC Notification', color: CATEGORY_COLORS.notification },
                { key: 'showGap' as const, label: 'No Notification', color: CATEGORY_COLORS.gap },
              ]).map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                  className="flex items-center gap-2 w-full"
                >
                  {filters[key] ? <Eye size={14} /> : <EyeOff size={14} className="text-arc-gray-300" />}
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: filters[key] ? color : '#a3a3a3' }}
                  />
                  <span className={`text-xs ${filters[key] ? 'text-arc-gray-700' : 'text-arc-gray-300'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SVI threshold */}
          <div className="bg-white rounded p-4 border border-arc-gray-100">
            <h4 className="text-xs font-medium text-arc-gray-500 uppercase tracking-wide mb-3">
              Min SVI Risk: {filters.sviMin.toFixed(1)}
            </h4>
            <input
              type="range"
              min={0}
              max={0.9}
              step={0.1}
              value={filters.sviMin}
              onChange={e => setFilters(f => ({ ...f, sviMin: parseFloat(e.target.value) }))}
              className="w-full accent-arc-red"
            />
            <div className="flex justify-between text-[10px] text-arc-gray-500 mt-1">
              <span>0.0</span><span>0.5</span><span>1.0</span>
            </div>
          </div>

          {/* Month range */}
          <div className="bg-white rounded p-4 border border-arc-gray-100">
            <h4 className="text-xs font-medium text-arc-gray-500 uppercase tracking-wide mb-3">
              Months: {filters.monthRange[0]} – {filters.monthRange[1]}
            </h4>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={1}
                max={12}
                value={filters.monthRange[0]}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  setFilters(f => ({ ...f, monthRange: [Math.min(v, f.monthRange[1]), f.monthRange[1]] }));
                }}
                className="flex-1 accent-arc-gray-700"
              />
              <input
                type="range"
                min={1}
                max={12}
                value={filters.monthRange[1]}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  setFilters(f => ({ ...f, monthRange: [f.monthRange[0], Math.max(v, f.monthRange[0])] }));
                }}
                className="flex-1 accent-arc-gray-700"
              />
            </div>
          </div>

          {/* Live stats */}
          <div className="bg-white rounded p-4 border border-arc-gray-100">
            <h4 className="text-xs font-medium text-arc-gray-500 uppercase tracking-wide mb-3">
              Filtered Points
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-arc-gray-700">Total</span>
                <span className="font-[family-name:var(--font-data)] font-medium">{formatNumber(viewportStats.total)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: CATEGORY_COLORS.care }}>RC Care</span>
                <span className="font-[family-name:var(--font-data)] font-medium">{formatNumber(viewportStats.care)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: CATEGORY_COLORS.notification }}>RC Notification</span>
                <span className="font-[family-name:var(--font-data)] font-medium">{formatNumber(viewportStats.notification)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: CATEGORY_COLORS.gap }}>No Notification</span>
                <span className="font-[family-name:var(--font-data)] font-medium">{formatNumber(viewportStats.gap)}</span>
              </div>
              <div className="pt-2 border-t border-arc-gray-100 flex justify-between text-xs">
                <span className="text-arc-gray-700">Avg SVI</span>
                <span className="font-[family-name:var(--font-data)] font-medium">{formatSvi(viewportStats.avgSvi)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map container */}
        <div className="flex-1 h-[600px] rounded overflow-hidden border border-arc-gray-100 relative bg-arc-gray-100">
          <DeckGLMap filteredData={filteredData} gapData={gapData} viewMode={viewMode} />

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-xs border border-arc-gray-100">
            <div className="flex gap-3">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
