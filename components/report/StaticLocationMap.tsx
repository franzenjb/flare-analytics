'use client';

import { useEffect, useState, useMemo } from 'react';
import { loadStatesTopo } from '@/lib/data-loader';
import { parseStatesTopo, STATE_TO_FIPS, type GeoFeature } from '@/lib/geo-utils';

/** Static SVG map for print — highlights entity's state(s) */
export default function StaticLocationMap({ stateCodes }: { stateCodes: Set<string> }) {
  const [features, setFeatures] = useState<GeoFeature[] | null>(null);

  useEffect(() => {
    loadStatesTopo().then(topo => setFeatures(parseStatesTopo(topo)));
  }, []);

  // Convert state abbreviations to FIPS for matching features
  const highlightFips = useMemo(() => {
    const set = new Set<string>();
    for (const code of stateCodes) {
      const fips = STATE_TO_FIPS[code];
      if (fips) set.add(fips);
    }
    return set;
  }, [stateCodes]);

  // Compute viewBox zoomed to highlighted states
  const viewBox = useMemo(() => {
    if (!features || highlightFips.size === 0) return '0 0 975 610';
    const filtered = features.filter(f => highlightFips.has(f.id));
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
  }, [features, highlightFips]);

  if (!features) return null;

  return (
    <svg viewBox={viewBox} className="w-full" style={{ maxHeight: 250 }}>
      {features.map(f => {
        const isHighlighted = highlightFips.has(f.id);
        return (
          <path
            key={f.id}
            d={f.path}
            fill={isHighlighted ? '#ED1B2E' : '#e5e5e5'}
            stroke="#fff"
            strokeWidth={isHighlighted ? 1.5 : 0.5}
            opacity={isHighlighted ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}
