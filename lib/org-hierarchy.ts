// Builds organizational hierarchy from county data
// Division → Region → Chapter mappings

import type { CountyData } from './types';

export interface OrgHierarchy {
  divisions: string[];
  divisionToRegions: Map<string, string[]>;
  regionToChapters: Map<string, string[]>;
  chapterToRegion: Map<string, string>;
  regionToDivision: Map<string, string>;
}

export function buildOrgHierarchy(counties: CountyData[]): OrgHierarchy {
  const divisionToRegionsSet = new Map<string, Set<string>>();
  const regionToChaptersSet = new Map<string, Set<string>>();
  const chapterToRegion = new Map<string, string>();
  const regionToDivision = new Map<string, string>();

  for (const c of counties) {
    if (!c.division || !c.region || !c.chapter) continue;

    // Division → Regions
    if (!divisionToRegionsSet.has(c.division)) {
      divisionToRegionsSet.set(c.division, new Set());
    }
    divisionToRegionsSet.get(c.division)!.add(c.region);

    // Region → Chapters
    if (!regionToChaptersSet.has(c.region)) {
      regionToChaptersSet.set(c.region, new Set());
    }
    regionToChaptersSet.get(c.region)!.add(c.chapter);

    // Reverse lookups
    chapterToRegion.set(c.chapter, c.region);
    regionToDivision.set(c.region, c.division);
  }

  const divisions = [...divisionToRegionsSet.keys()].sort();
  const divisionToRegions = new Map<string, string[]>();
  for (const [div, regs] of divisionToRegionsSet) {
    divisionToRegions.set(div, [...regs].sort());
  }
  const regionToChapters = new Map<string, string[]>();
  for (const [reg, chs] of regionToChaptersSet) {
    regionToChapters.set(reg, [...chs].sort());
  }

  return { divisions, divisionToRegions, regionToChapters, chapterToRegion, regionToDivision };
}
