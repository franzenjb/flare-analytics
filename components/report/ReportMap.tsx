'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { loadFirePoints, loadFireStations } from '@/lib/data-loader';
import { formatNumber } from '@/lib/format';
import type { FirePointsData, FireStationsData } from '@/lib/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/types';

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
}

interface StationDatum {
  position: [number, number];
  name: string;
  addr: string;
  city: string;
}

/** Interactive Deck.gl map for entity reports, filtered to entity's FIPS codes */
export default function ReportMap({ fipsCodes }: { fipsCodes: Set<string> }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<unknown>(null);
  const mapRef = useRef<unknown>(null);

  const [points, setPoints] = useState<FirePointsData | null>(null);
  const [stations, setStations] = useState<FireStationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCare, setShowCare] = useState(true);
  const [showNotification, setShowNotification] = useState(true);
  const [showGap, setShowGap] = useState(true);
  const [showStations, setShowStations] = useState(true);

  // Load data
  useEffect(() => {
    Promise.all([loadFirePoints(), loadFireStations()]).then(([p, s]) => {
      setPoints(p);
      setStations(s);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load map data:', err);
      setLoading(false);
    });
  }, []);

  // Filter fire points to entity's FIPS codes
  const filteredPoints = useMemo(() => {
    if (!points) return [];
    const result: PointDatum[] = [];
    const chapters = points.chapters || [];

    for (let i = 0; i < points.count; i++) {
      const cat = points.cat[i];
      if (cat === 0 && !showCare) continue;
      if (cat === 1 && !showNotification) continue;
      if (cat === 2 && !showGap) continue;

      // Filter by FIPS match
      if (!fipsCodes.has(points.fips[i])) continue;

      const chIdx = points.ch?.[i] ?? -1;
      result.push({
        position: [points.lon[i], points.lat[i]],
        cat,
        svi: points.svi[i],
        chapter: chIdx >= 0 ? chapters[chIdx] : undefined,
      });
    }
    return result;
  }, [points, showCare, showNotification, showGap, fipsCodes]);

  // Filter stations to entity's FIPS codes
  const filteredStations = useMemo(() => {
    if (!stations || !showStations) return [];
    const result: StationDatum[] = [];
    for (let i = 0; i < stations.count; i++) {
      if (fipsCodes.has(stations.fips[i])) {
        result.push({
          position: [stations.lon[i], stations.lat[i]],
          name: stations.name[i],
          addr: stations.addr[i],
          city: stations.city[i],
        });
      }
    }
    return result;
  }, [stations, showStations, fipsCodes]);

  // Compute bounds from stations + entity fire points for auto-zoom
  const bounds = useMemo(() => {
    if (!stations) return null;
    // Use stations in the entity as anchors for bounds
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    let count = 0;
    for (let i = 0; i < stations.count; i++) {
      if (fipsCodes.has(stations.fips[i])) {
        const lat = stations.lat[i];
        const lon = stations.lon[i];
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        count++;
      }
    }
    if (count === 0) return null;
    // Add padding
    const latPad = Math.max((maxLat - minLat) * 0.15, 0.1);
    const lonPad = Math.max((maxLon - minLon) * 0.15, 0.1);
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLon: minLon - lonPad,
      maxLon: maxLon + lonPad,
    };
  }, [stations, fipsCodes]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || loading) return;
    let cleanup = false;

    // Compute initial center/zoom from bounds
    let center: [number, number] = [-98.5, 39.8];
    let zoom = 4;
    if (bounds) {
      center = [(bounds.minLon + bounds.maxLon) / 2, (bounds.minLat + bounds.maxLat) / 2];
      const latSpan = bounds.maxLat - bounds.minLat;
      const lonSpan = bounds.maxLon - bounds.minLon;
      const maxSpan = Math.max(latSpan, lonSpan);
      if (maxSpan < 0.5) zoom = 10;
      else if (maxSpan < 1) zoom = 9;
      else if (maxSpan < 2) zoom = 8;
      else if (maxSpan < 4) zoom = 7;
      else if (maxSpan < 8) zoom = 6;
      else if (maxSpan < 16) zoom = 5;
      else zoom = 4;
    }

    Promise.all([
      import('maplibre-gl'),
      import('@deck.gl/mapbox'),
      import('@deck.gl/layers'),
    ]).then(([maplibregl, deckMapbox, layers]) => {
      if (cleanup || !mapContainerRef.current) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center,
        zoom,
      });
      mapRef.current = map;

      map.on('load', () => {
        if (cleanup) return;
        const catLabels = ['RC Care', 'RC Notification', 'No Notification'];
        const overlay = new deckMapbox.MapboxOverlay({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          layers: buildLayers(layers, filteredPoints, filteredStations) as any,
          getTooltip: ({ object }: { object?: PointDatum | StationDatum }) => {
            if (!object) return null;
            const style = { fontFamily: 'var(--font-body)', fontSize: '12px', padding: '8px 12px', background: 'white', border: '1px solid #e5e5e5', borderRadius: '4px', color: '#1a1a1a' };
            if ('name' in object && !('cat' in object)) {
              const s = object as StationDatum;
              const lines = [`<strong>${s.name}</strong>`];
              if (s.addr) lines.push(s.addr);
              if (s.city) lines.push(s.city);
              return { html: lines.join('<br/>'), style };
            }
            const p = object as PointDatum;
            const lines = [`<strong>${catLabels[p.cat]}</strong>`, `SVI: ${p.svi.toFixed(3)}`];
            if (p.chapter) lines.push(`Chapter: ${p.chapter}`);
            return { html: lines.join('<br/>'), style };
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
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, bounds]);

  // Update layers when toggles change
  useEffect(() => {
    if (!deckRef.current) return;
    import('@deck.gl/layers').then(layers => {
      const overlay = deckRef.current as { setProps: (p: { layers: unknown[] }) => void };
      overlay.setProps({ layers: buildLayers(layers, filteredPoints, filteredStations) });
    });
  }, [filteredPoints, filteredStations]);

  if (loading) {
    return (
      <div className="h-[400px] animate-pulse bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
        Loading map data...
      </div>
    );
  }

  return (
    <div className="print:hidden">
      {/* Toggle controls */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {([
          { key: 'showCare' as const, label: CATEGORY_LABELS.care, color: CATEGORY_COLORS.care, val: showCare, set: setShowCare },
          { key: 'showNotification' as const, label: CATEGORY_LABELS.notification, color: CATEGORY_COLORS.notification, val: showNotification, set: setShowNotification },
          { key: 'showGap' as const, label: CATEGORY_LABELS.gap, color: CATEGORY_COLORS.gap, val: showGap, set: setShowGap },
        ]).map(({ key, label, color, val, set }) => (
          <button
            key={key}
            onClick={() => set(!val)}
            className="flex items-center gap-1.5 text-xs"
          >
            {val ? <Eye size={12} /> : <EyeOff size={12} className="text-gray-300" />}
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val ? color : '#a3a3a3' }} />
            <span className={val ? 'text-gray-700' : 'text-gray-300'}>{label}</span>
          </button>
        ))}
        <button
          onClick={() => setShowStations(!showStations)}
          className="flex items-center gap-1.5 text-xs ml-auto"
        >
          {showStations ? <Eye size={12} /> : <EyeOff size={12} className="text-gray-300" />}
          <svg width="10" height="10" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill={showStations ? '#f9a825' : '#a3a3a3'} /></svg>
          <span className={showStations ? 'text-gray-700' : 'text-gray-300'}>
            Fire Stations ({formatNumber(filteredStations.length)})
          </span>
        </button>
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={mapContainerRef} style={{ width: '100%', height: 400 }} className="rounded border border-gray-200" />
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded px-2.5 py-1.5 text-[10px] border border-gray-200">
          <div className="flex gap-2.5">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] }} />
                <span>{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="#f9a825" /></svg>
              <span>Station</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildLayers(
  layers: typeof import('@deck.gl/layers'),
  filteredPoints: PointDatum[],
  filteredStations: StationDatum[],
): unknown[] {
  const layerList: unknown[] = [
    new layers.ScatterplotLayer({
      id: 'scatter',
      data: filteredPoints,
      getPosition: (d: PointDatum) => d.position,
      getFillColor: (d: PointDatum) => [...CATEGORY_RGB[d.cat], 160],
      getRadius: 800,
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      pickable: true,
    }),
  ];
  if (filteredStations.length > 0) {
    layerList.push(
      new layers.IconLayer({
        id: 'stations',
        data: filteredStations,
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
  return layerList;
}
