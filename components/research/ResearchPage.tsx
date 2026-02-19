'use client';

import { useState } from 'react';
import { ArrowLeft, BookOpen, List } from 'lucide-react';
import Link from 'next/link';
import Accordion from './Accordion';

/* ─── Reusable sub-components ─── */

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="bg-white border border-arc-gray-100 rounded p-4 text-center">
      <div className="font-[family-name:var(--font-data)] text-2xl sm:text-3xl font-bold text-arc-red leading-none">{value}</div>
      <div className="text-sm font-medium text-arc-black mt-1.5">{label}</div>
      {sub && <div className="text-xs text-arc-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function KeyFinding({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-arc-red bg-arc-cream rounded-r px-4 py-3 my-4">
      <p className="text-sm font-medium text-arc-black leading-relaxed">{children}</p>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 bg-arc-black text-white font-medium text-xs uppercase tracking-wide first:rounded-tl last:rounded-tr">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-arc-cream/50'}>
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-medium text-arc-black' : 'text-arc-gray-700'} ${/^[\d$~+−–%.x]/.test(cell) ? 'font-[family-name:var(--font-data)]' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sources({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 pt-3 border-t border-arc-gray-100">
      <button onClick={() => setOpen(o => !o)} className="text-xs text-arc-gray-500 hover:text-arc-gray-700 flex items-center gap-1">
        <BookOpen size={12} />
        {open ? 'Hide' : 'Show'} sources ({items.length})
      </button>
      {open && (
        <ul className="mt-2 space-y-0.5">
          {items.map((s, i) => <li key={i} className="text-xs text-arc-gray-500 leading-relaxed">{s}</li>)}
        </ul>
      )}
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-arc-gray-700 leading-relaxed space-y-3">{children}</div>;
}

/* ─── Table of Contents ─── */

const TOC = [
  { id: 'scale', label: 'The Scale' },
  { id: 'paradox', label: 'The Paradox' },
  { id: 'causes', label: 'What Kills' },
  { id: 'poverty', label: 'Poverty Multiplier' },
  { id: 'housing', label: 'Pre-1970 Housing' },
  { id: 'heaters', label: 'Space Heaters' },
  { id: 'firebelt', label: 'The Fire Belt' },
  { id: 'alarms', label: 'Smoke Alarms' },
  { id: 'soundthealarm', label: 'Sound the Alarm' },
  { id: 'sprinklers', label: 'Sprinklers & Infrastructure' },
  { id: 'international', label: 'International' },
];

function TableOfContents() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside className="hidden xl:block fixed top-24 right-8 w-48 z-40">
        <p className="text-xs font-medium text-arc-gray-500 uppercase tracking-wide mb-2">Contents</p>
        <nav className="space-y-0.5">
          {TOC.map(({ id, label }) => (
            <a key={id} href={`#${id}`} className="block text-xs text-arc-gray-500 hover:text-arc-red py-0.5 transition-colors">
              {label}
            </a>
          ))}
        </nav>
      </aside>
      {/* Mobile: collapsible */}
      <div className="xl:hidden mb-6">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-sm font-medium text-arc-gray-500 hover:text-arc-black">
          <List size={16} />
          {open ? 'Hide' : 'Show'} Table of Contents
        </button>
        {open && (
          <nav className="mt-2 flex flex-wrap gap-2">
            {TOC.map(({ id, label }) => (
              <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="text-xs px-2.5 py-1 bg-white border border-arc-gray-100 rounded-full text-arc-gray-500 hover:text-arc-red hover:border-arc-red transition-colors">
                {label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}

/* ─── Main Page ─── */

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-arc-cream">
      {/* Header */}
      <header className="bg-white border-b-[3px] border-arc-black">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-7 h-7">
                  <rect x="12" y="4" width="8" height="24" fill="#ED1B2E" />
                  <rect x="4" y="12" width="24" height="8" fill="#ED1B2E" />
                </svg>
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-headline)] text-lg font-bold text-arc-black leading-tight">
                  FLARE Analytics
                </h1>
                <p className="text-xs text-arc-gray-500 leading-tight">
                  Deep Research Report
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-arc-gray-500 hover:text-arc-black border border-arc-gray-200 rounded hover:border-arc-gray-400 transition-colors"
            >
              <ArrowLeft size={14} />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white border-b border-arc-gray-100">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="w-10 h-[3px] bg-arc-red mb-4" />
          <h1 className="font-[family-name:var(--font-headline)] text-3xl sm:text-4xl font-bold text-arc-black leading-tight">
            The American Home Fire Crisis
          </h1>
          <p className="text-base text-arc-gray-500 mt-3 max-w-2xl leading-relaxed">
            Home fires kill more Americans annually than all natural disasters combined, yet receive a fraction of the attention. This report compiles findings from NFPA, USFA/FEMA, CPSC, CDC, Census Bureau, Pew Charitable Trusts, and peer-reviewed academic research.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            <StatCard value="329,500" label="Home Fires" sub="per year (2024)" />
            <StatCard value="2,920" label="Lives Lost" sub="8 per day (2024)" />
            <StatCard value="$11.4B" label="Property Damage" sub="per year (2024)" />
            <StatCard value="96 sec" label="Fire Frequency" sub="1 home fire every" />
          </div>
          <p className="text-xs text-arc-gray-500 mt-4">
            All statistics cited to authoritative sources. Compiled February 2026.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TableOfContents />

        <div className="space-y-4">

          {/* ─── 1. THE SCALE ─── */}
          <Accordion id="scale" title="The Scale of the Problem" subtitle="Annual toll, historical context, and the numbers behind the crisis" stat="2,920" statLabel="deaths/year">
            <Prose>
              <DataTable
                headers={['Metric', 'Annual Average (2019–2023)']}
                rows={[
                  ['Home structure fires', '328,590'],
                  ['Civilian deaths', '2,600'],
                  ['Civilian injuries', '10,770'],
                  ['Direct property damage', '$8.9 billion'],
                  ['Frequency', '1 home fire every 96 seconds'],
                ]}
              />
              <p>The most recent year (2024) was worse: <strong>329,500 fires</strong>, <strong>2,920 deaths</strong> (75% of all fire deaths), and <strong>$11.4 billion</strong> in direct property damage. A home fire death occurred every 3 hours.</p>
              <KeyFinding>The often-cited &quot;7 lives lost daily&quot; is accurate for the 5-year average (2,600 ÷ 365 = 7.1/day). The 2024 figure is worse: 8.0 per day.</KeyFinding>
              <p>The commonly referenced &quot;$7 billion annual damage&quot; is actually an <strong>undercount</strong> — the 5-year average is $8.9 billion, and 2024 hit $11.4 billion.</p>
            </Prose>
            <Sources items={[
              'NFPA, "Home Structure Fires," Shelby Hall & Tucker McGree, August 2025',
              'NFPA, "Fire Loss in the United States During 2024," November 2025',
            ]} />
          </Accordion>

          {/* ─── 2. THE PARADOX ─── */}
          <Accordion id="paradox" title="The Paradox: Fewer Fires, Higher Lethality" subtitle="55% fewer fires since 1980 — but each fire is 23% more likely to kill" stat="+23%" statLabel="death rate per fire">
            <Prose>
              <DataTable
                headers={['Metric', '1980', '2023', 'Change']}
                rows={[
                  ['Home fires', '734,000', '332,000', '−55%'],
                  ['Home fire deaths', '5,200', '2,890', '−44%'],
                  ['Deaths per 1,000 fires (all homes)', '7.1', '8.7', '+23%'],
                  ['Deaths per 1,000 fires (1-2 family)', '7.0', '9.7', '+38%'],
                  ['Deaths per million population', '22.9', '8.6', '−62%'],
                ]}
              />
              <p><strong>Why is each fire more lethal?</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Modern synthetic furnishings burn faster and hotter than natural materials</li>
                <li>Open floor plans allow fire to spread more rapidly</li>
                <li>NIST research: <strong>available escape time has dropped from 17 minutes to 3 minutes</strong> over the past 30+ years</li>
                <li>Bedroom and living room fire death rates are 2× and 1.7× higher per fire than in 1980</li>
              </ul>
              <KeyFinding>Your house is less likely to catch fire than it was in 1980 — but if it does, you are significantly more likely to die. Escape time has collapsed from 17 minutes to 3 minutes.</KeyFinding>
              <p><strong>The &quot;36% increase since 2010&quot;</strong> is partially accurate: from the 2012 record low to 2024, fire deaths rose 37%. USFA per-capita rates rose 27% from 2014–2023.</p>
              <DataTable
                headers={['Year', 'Deaths', 'Rate per Million']}
                rows={[
                  ['2014', '3,428', '10.8'],
                  ['2016', '3,515', '10.9'],
                  ['2018', '3,810', '11.7'],
                  ['2020', '3,790', '11.4'],
                  ['2021', '4,316', '13.0'],
                  ['2022', '4,446', '13.3'],
                  ['2023', '4,371', '13.1'],
                ]}
              />
            </Prose>
            <Sources items={[
              'NFPA, "Home Structure Fires," August 2025',
              'USFA/FEMA, "Fire Death and Injury Risk"',
              'NIST, escape time research (legacy vs. modern furnishings)',
            ]} />
          </Accordion>

          {/* ─── 3. WHAT KILLS ─── */}
          <Accordion id="causes" title="What Causes Fire Deaths" subtitle="Smoking kills the most, cooking starts the most, and the deadliest hours are 2–4 AM" stat="48%" statLabel="of deaths 11pm–7am">
            <Prose>
              <DataTable
                headers={['Cause', 'Fires/Year', 'Deaths/Year', '% of Deaths']}
                rows={[
                  ['Smoking materials', '15,200', '600', '~23% (#1)'],
                  ['Heating equipment', '65,000', '430', '~17%'],
                  ['Electrical distribution', '31,650', '430', '~17%'],
                  ['Cooking', '159,400', '430', '~17%'],
                  ['Intentional', '24,600', '120', '~5%'],
                  ['Candles', '5,830', '70', '~3%'],
                ]}
              />
              <KeyFinding>Smoking causes only 5% of fires but 23% of deaths. It ignites upholstered furniture and bedding, smoldering undetected at night while occupants sleep.</KeyFinding>
              <p><strong>The deadliest items when first ignited:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Upholstered furniture:</strong> 4,300 fires/yr → 370 deaths (1 in 12 fires kills)</li>
                <li><strong>Mattresses/bedding:</strong> 7,300 fires/yr → 300 deaths (1 in 25 fires kills)</li>
              </ul>
              <p><strong>Time of day:</strong> 11 PM–7 AM accounts for only 19% of home fires but <strong>48% of deaths</strong>. Peak fatal period: 2–4 AM. Peak fire reporting: 5–8 PM (cooking).</p>
              <p><strong>Seasonal:</strong> November–March: 46% of fires, 53% of deaths. January is the peak month. 48% of heating fires occur December–February.</p>
            </Prose>
            <Sources items={[
              'NFPA, "Home Structure Fires," August 2025',
              'USFA Topical Fire Reports (time-of-day, seasonal)',
            ]} />
          </Accordion>

          {/* ─── 4. THE POVERTY MULTIPLIER ─── */}
          <Accordion id="poverty" title="The Poverty Multiplier" subtitle="Fire deaths fall hardest on the poor, the elderly, and Black Americans" stat="2×" statLabel="risk for Black Americans">
            <Prose>
              <p>The claim that &quot;households below the poverty line are 2.5× more likely to experience a home fire&quot; is directionally supported by overwhelming evidence, even if the exact multiplier comes from older data:</p>
              <DataTable
                headers={['Group', 'Fire Death Risk vs. National Average']}
                rows={[
                  ['African American (all ages)', '2× (CPSC/USFA)'],
                  ['African American, age 65+', '4.5× (USFA, 2022)'],
                  ['African American, age 85+', '8× (USFA, 2022)'],
                  ['African American children under 15', '4× white children (USFA)'],
                  ['Rural African Americans', '3.5× rural whites (USFA)'],
                  ['Children in low-income families', '5× (FEMA)'],
                ]}
              />
              <KeyFinding>Black Americans are 13% of the population but account for 24% of fire deaths and 27% of fire injuries.</KeyFinding>
              <p><strong>Why poverty equals fire risk:</strong></p>
              <DataTable
                headers={['Factor', 'Mechanism']}
                rows={[
                  ['No/broken smoke alarms', "Can't afford batteries; nuisance alarms from cooking lead to disconnection"],
                  ['Space heater dependence', '3M+ low-income households use space heaters as primary heat'],
                  ['Older housing', 'Pre-1970 wiring, no GFCI/AFCI, fuse boxes, balloon framing'],
                  ['Deferred maintenance', "Can't afford electrical upgrades, chimney cleaning, furnace repair"],
                  ['Overcrowding', 'More ignition sources, more people at risk per fire'],
                  ['No insurance', '45% of renters have no renters insurance'],
                ]}
              />
            </Prose>
            <Sources items={[
              'FEMA case studies; USFA "Fire Risk in 2019" and "Fire Risk in 2020"',
              'CPSC press releases on residential fire disparities',
              'Shai, "Income, Housing, and Fire Injuries," Public Health Reports, 2006 (PMC1525262)',
              'Harvard JCHS, "America\'s Rental Housing 2024"',
            ]} />
          </Accordion>

          {/* ─── 5. PRE-1970 HOUSING ─── */}
          <Accordion id="housing" title="Pre-1970 Housing: The Hidden Infrastructure Crisis" subtitle="35% of American homes predate modern fire codes — and they're 17× deadlier" stat="17×" statLabel="higher death rate">
            <Prose>
              <p>Approximately <strong>35% of U.S. owner-occupied homes</strong> were built before 1970 (ACS 2022–2023). The median age of U.S. homes is now <strong>41 years</strong>, up from 31 in 2005. The housing stock is aging faster than it&apos;s being replaced.</p>

              <KeyFinding>The Pew Charitable Trusts (September 2025) published the first-ever analysis of U.S. fire deaths by building type AND age. Residents of pre-1970 homes face a fire death risk 17× higher than those in post-2010 apartments.</KeyFinding>

              <DataTable
                headers={['Housing Type', 'Fire Death Rate (per million, 2023)']}
                rows={[
                  ['Pre-2000 apartments', '7.7'],
                  ['All single-family homes', '7.6'],
                  ['Post-2000 apartments', '1.2'],
                  ['Post-2010 apartments', '~0.5'],
                ]}
              />

              <p>Among the ~8.3 million Americans in post-2010 apartments, only <strong>four</strong> died in a residential fire in all of 2023.</p>

              <p><strong>What changed around 1970 — the Building Code Revolution:</strong></p>
              <DataTable
                headers={['Safety Feature', 'Pre-1970', 'Post-2000']}
                rows={[
                  ['Grounded outlets', 'Often absent', 'Required throughout'],
                  ['GFCI protection', 'Not present', 'All wet areas'],
                  ['AFCI protection', 'Not present', 'All living areas'],
                  ['Circuit breakers', 'May have fuse box', 'Modern panel'],
                  ['Smoke alarms', 'Not present', 'Hardwired, interconnected, every room'],
                  ['Fire sprinklers', 'Almost never', 'Required in many jurisdictions'],
                  ['Fire stops in walls', 'Absent (balloon frame)', 'Built into platform frame'],
                  ['Electrical capacity', '60–100 amp', '200 amp standard'],
                ]}
              />

              <p><strong>Specific hazards in pre-1970 homes:</strong></p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Aluminum wiring (1965–1973):</strong> ~2 million homes. CPSC found these are <strong>55× more likely to reach fire hazard conditions</strong> at outlets than copper-wired homes.</li>
                <li><strong>Federal Pacific Electric panels (1950s–1980s):</strong> Breakers fail to trip 25–65% of the time. Estimated 2,800 fires, 13 deaths, $40M damage annually. FPE committed fraud on UL certification.</li>
                <li><strong>Balloon-frame construction (pre-1940s):</strong> 5–8 million homes. Open stud bays act as chimneys — fire travels basement to attic in minutes with no horizontal barriers.</li>
                <li><strong>Knob-and-tube wiring (pre-1950):</strong> No grounding, deteriorated insulation, designed for minimal loads.</li>
              </ul>

              <KeyFinding>Lead paint (banned 1978) and asbestos require certified abatement before walls can be opened for rewiring or fire stops — making safety upgrades more expensive and complex, causing owners to defer them indefinitely.</KeyFinding>

              <p><strong>Geographic concentration:</strong> Pre-1970 housing is concentrated in the Northeast and Midwest — D.C. median build year ~1951, New York ~1959, Massachusetts ~1964. These are the same regions with older populations, aging heating systems, and extreme winters.</p>
            </Prose>
            <Sources items={[
              'Pew Charitable Trusts, "Modern Multifamily Buildings Provide the Most Fire Protection," September 2025',
              'CPSC Publication #516: Repairing Aluminum Wiring',
              'IEEE/Aronstein 2012, Federal Pacific panel failure rates',
              'NAHB/ACS housing age data; Census Bureau ACS 2022–2023',
              'NFPA 70 (NEC) code development history',
            ]} />
          </Accordion>

          {/* ─── 6. SPACE HEATERS ─── */}
          <Accordion id="heaters" title="Space Heaters: Silent Killers" subtitle="29–43% of heating fires but 77–85% of heating fire deaths" stat="85%" statLabel="of heating deaths">
            <Prose>
              <p>Space heaters are the most lethal heating source by far. Their death rate per fire is <strong>~10× higher</strong> than fireplaces and chimneys.</p>
              <DataTable
                headers={['Metric', 'Annual Average']}
                rows={[
                  ['Heating equipment fires', '38,881'],
                  ['Deaths from heating fires', '432'],
                  ['Injuries', '1,352'],
                  ['Property damage', '$1.1 billion'],
                ]}
              />
              <p><strong>Who uses space heaters:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>23% of Americans currently use one</li>
                <li>3 million low-income households use them as <strong>primary heat</strong></li>
                <li>5 million households couldn&apos;t use their main heating because they couldn&apos;t afford repairs or fuel (EIA, 2020)</li>
              </ul>
              <KeyFinding>December–February: 46–49% of all heating fires and 57–59% of heating fire deaths. 45% of space heater deaths are concentrated in December–January alone.</KeyFinding>
              <p><strong>Carbon monoxide — the related killer:</strong> 200+ deaths/year from non-fire CO poisoning via consumer products. CO deaths rose 69% from 2009 to 2019 — seven consecutive years of increases.</p>
            </Prose>
            <Sources items={[
              'NFPA, "Home Heating Fires Report," 2025',
              'USFA, "Portable Heater Fires," 2021',
              'CPSC CO Fatalities Reports (2023, 2024)',
              'EIA, 2020 Residential Energy Consumption Survey (RECS)',
              'SafeHome.org, space heater usage survey',
            ]} />
          </Accordion>

          {/* ─── 7. THE FIRE BELT ─── */}
          <Accordion id="firebelt" title="The Fire Belt: Geographic Patterns" subtitle="8 of the top 10 fire death states are Southern or border-South" stat="28.2" statLabel="per million (WV)">
            <Prose>
              <DataTable
                headers={['Rank', 'State', 'Rate/Million', 'vs. National']}
                rows={[
                  ['1', 'West Virginia', '28.2', '2.2×'],
                  ['2', 'Oklahoma', '27.9', '2.1×'],
                  ['3', 'Arkansas', '25.8', '2.0×'],
                  ['4', 'Mississippi', '25.2', '1.9×'],
                  ['5', 'Tennessee', '24.7', '1.9×'],
                  ['6', 'Alabama', '23.7', '1.8×'],
                  ['7', 'Kentucky', '21.9', '1.7×'],
                  ['8', 'Kansas', '21.8', '1.7×'],
                  ['9', 'Louisiana', '19.5', '1.5×'],
                  ['10', 'Missouri', '19.5', '1.5×'],
                  ['—', 'National average', '13.1', '1.0×'],
                  ['Lowest', 'CA, CO, MA, NH', '~6–7', '0.5×'],
                ]}
              />
              <p><strong>Why the South burns:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Higher rural populations with volunteer fire departments (longer response times)</li>
                <li>Higher poverty rates</li>
                <li>Older, substandard housing (especially pre-1976 manufactured homes)</li>
                <li>Lower smoke alarm adoption (73% of rural fires had no working detector)</li>
                <li>Greater reliance on space heaters, kerosene heaters, wood stoves</li>
              </ul>
              <KeyFinding>Rural areas have significantly higher per-capita fire death rates. Rural: 73% of fires had no working smoke detector. Volunteer fire departments serve 32% of the population with 82% of all departments — with response targets of 14 minutes vs. 5 for career departments.</KeyFinding>
            </Prose>
            <Sources items={[
              'USFA, "State Fire Death Risk," 2023',
              'USFA, "The Rural Fire Problem"',
              'Census ACS QuickFacts (county-level poverty)',
              'NFPA 1710 & 1720 response time standards',
            ]} />
          </Accordion>

          {/* ─── 8. SMOKE ALARMS ─── */}
          <Accordion id="alarms" title="Smoke Alarms: The Single Most Impactful Intervention" subtitle="60% reduction in fire death risk — but 57% of deaths still occur without a working alarm" stat="60%" statLabel="death risk reduction">
            <Prose>
              <p>Working smoke alarms <strong>reduce fire death risk by 60%</strong> and reduce fire spread beyond the room of origin by 71%.</p>
              <DataTable
                headers={['Status', '% of U.S. Homes', '% of Fire Deaths']}
                rows={[
                  ['Has smoke alarm(s)', '96%', '—'],
                  ['No smoke alarm (~5M homes)', '~4%', '43%'],
                  ['Alarm present, not working', '—', '14%'],
                  ['Total: no working alarm', '—', '57%'],
                ]}
              />
              <KeyFinding>96% of American homes have at least one smoke alarm — but 57% of fire deaths occur in homes with no working alarm. The gap between ownership and actual protection is the deadliest statistic in fire safety.</KeyFinding>
              <p><strong>Why alarms fail:</strong> Dead/missing batteries (#1 cause), nuisance alarms from cooking lead to disconnection, 33% of Americans never test their alarms, real-world alarm survival averages only 6.34 years (not the rated 10), and only 22.3% of homes are &quot;adequately protected&quot; per NFPA guidelines.</p>
              <p><strong>The technology gap:</strong></p>
              <DataTable
                headers={['Feature', 'Ionization', 'Photoelectric', 'Dual-Sensor']}
                rows={[
                  ['Fast/flaming fires', '30–90 sec faster', '—', 'Yes'],
                  ['Slow/smoldering fires', '—', '15–50 min faster', 'Yes'],
                  ['False alarm rate', 'Higher', 'Lower', 'Moderate'],
                ]}
              />
              <p>Smoldering fires are most responsible for fatalities. Photoelectric alarms detect them 15–50 minutes faster, yet ionization alarms remain more common. Interconnected alarms (when one triggers, all sound) are required in new construction but almost never present in older homes.</p>
            </Prose>
            <Sources items={[
              'NFPA, "Smoke Alarms in U.S. Home Fires," September 2024',
              'NFPA/CPSC joint survey, 2024',
              'NIST Technical Note, smoke alarm performance research',
              'Georgia Southern University, smoke alarm survival study',
            ]} />
          </Accordion>

          {/* ─── 9. SOUND THE ALARM ─── */}
          <Accordion id="soundthealarm" title="Sound the Alarm & the Red Cross Response" subtitle="~2.9 million alarms installed, 2,266–2,420 lives saved — and a looming time bomb" stat="2,266+" statLabel="lives saved">
            <Prose>
              <DataTable
                headers={['Claim (from original report)', 'Current Verified', 'Status']}
                rows={[
                  ['2.5M+ smoke alarms installed', '~2.9 million', 'Understated'],
                  ['1,500+ lives saved', '2,266–2,420', 'Outdated (accurate ~2022)'],
                  ['3M+ households educated', '1.2M households / 3.1M people', 'Conflates units'],
                ]}
              />
              <p><strong>Program history:</strong> Precursor began in Cleveland, Ohio (1992). Home Fire Campaign launched nationally October 2014. &quot;Sound the Alarm&quot; branding introduced 2017–2018. Reached 2.5M alarm milestone March 2023.</p>
              <p><strong>&quot;Lives Saved&quot; methodology:</strong> This is a documented, case-by-case count — not a statistical model. Each case requires: a home fire in a previously served residence, fire department confirmation of a working Red Cross-installed alarm, and survivor attribution. It&apos;s inherently conservative.</p>
              <KeyFinding>A 2025 peer-reviewed study found HFC participants had 36% greater prevalence of having escape plans. Installed alarms are 5× more likely to still work a year later vs. giveaway programs.</KeyFinding>
              <p><strong>Cost-effectiveness:</strong> $3.21 return for every $1 spent (Dallas study). 68% fewer medically treated fire injuries in served homes.</p>
              <p><strong>The 10-year replacement time bomb:</strong> The earliest installations from 2014 are now at or past the 10-year mark. Real-world data shows mean alarm survival is only 6.34 years. Potentially hundreds of thousands of installed alarms may already be non-functional.</p>
            </Prose>
            <Sources items={[
              'American Red Cross, Sound the Alarm program data',
              'ScienceDirect, "Evaluation of ARC Home Fire Campaign," 2025',
              'PMC cost-effectiveness studies (Dallas "Operation Installation")',
              'Red Cross Home Fire Progress Report Dashboard',
            ]} />
          </Accordion>

          {/* ─── 10. SPRINKLERS & INFRASTRUCTURE ─── */}
          <Accordion id="sprinklers" title="Sprinklers & Fire Department Infrastructure" subtitle="85% death reduction from sprinklers — present in only 7% of homes" stat="85%" statLabel="death reduction">
            <Prose>
              <p><strong>Residential sprinklers:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>85% reduction in fire death risk when present</li>
                <li>Fire contained to room of origin 96% of the time</li>
                <li>Present in only 7% of home fires</li>
                <li>Only 3 jurisdictions require them in all new residential: CA, MD, DC</li>
                <li>Cost: approximately 1% of total new construction cost</li>
              </ul>
              <KeyFinding>NFPA has no record of a fire killing more than 2 people in a fully sprinklered building. Ever.</KeyFinding>
              <p><strong>Fire department infrastructure gap:</strong></p>
              <DataTable
                headers={['Metric', 'Value']}
                rows={[
                  ['Volunteer departments', '82% of all departments'],
                  ['Fire stations over 40 years old', '44%'],
                  ['Engines 15+ years old', '43%'],
                  ['Departments lacking formal training', '49%'],
                  ['No fitness/health programs', '72%'],
                  ['No behavioral health programs', '73%'],
                ]}
              />
              <p><strong>Response time disparity:</strong> Career departments (NFPA 1710) target first engine in 5 minutes, 90% of calls. Volunteer departments (NFPA 1720) target 6 staff in 14 minutes, 80% of calls. A fire doubles in size every minute.</p>
            </Prose>
            <Sources items={[
              'NFPA, "U.S. Experience with Sprinklers"',
              'NFPA, "Fifth Needs Assessment of the U.S. Fire Service," November 2021',
              'NFPA sprinkler effectiveness data, 2024',
            ]} />
          </Accordion>

          {/* ─── 11. INTERNATIONAL ─── */}
          <Accordion id="international" title="International Comparison" subtitle="The U.S. fire death rate remains among the highest in the industrialized world" stat="13.1" statLabel="per million (U.S.)">
            <Prose>
              <DataTable
                headers={['Country', 'Rate per Million (2007)', 'Source']}
                rows={[
                  ['United States', '12.4', 'USFA/WFSC'],
                  ['United Kingdom', '7.6', 'USFA/WFSC'],
                  ['Switzerland', '~2.0', 'USFA/WFSC'],
                  ['International avg (24 nations)', '10.7', 'USFA/WFSC'],
                ]}
              />
              <p>The U.S. rate in 2023 was <strong>13.1 per million</strong> (USFA) — still well above peer nations. While the U.S. has improved 46% since 1979 in absolute terms, it still ranks above the international average. The disparity is driven by the same factors documented throughout this report: aging housing stock, poverty-driven risk, and gaps in smoke alarm functionality and fire department coverage.</p>
            </Prose>
            <Sources items={[
              'USFA, "Fire Death Rate Trends: An International Perspective"',
              'CTIF, "World Fire Statistics Report No. 30," 2025',
            ]} />
          </Accordion>

        </div>

        {/* Master source note */}
        <div className="mt-10 pt-6 border-t border-arc-gray-100">
          <p className="text-xs text-arc-gray-500 leading-relaxed">
            <strong>About this report:</strong> All statistics are cited to authoritative sources including NFPA, USFA/FEMA, CPSC, CDC, U.S. Census Bureau, Pew Charitable Trusts, Harvard Joint Center for Housing Studies, and peer-reviewed academic research. Sources accessed February 2026. This report represents the most current publicly available data at time of compilation.
          </p>
          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-arc-gray-500 hover:text-arc-red transition-colors">
              <ArrowLeft size={14} />
              Back to FLARE Analytics Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-arc-gray-100 bg-white mt-8">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-arc-gray-500 text-center">
            American Red Cross — FLARE Analytics v2 — Deep Research Report — February 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
