/** Format number with commas: 103400 → "103,400" */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Format percentage: 47.8 → "47.8%" */
export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Format compact number: 103400 → "103.4K" */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** Format SVI score: 0.602 → "0.60" */
export function formatSvi(n: number): string {
  return n.toFixed(2);
}

/** Format month: "2024-01" → "Jan" */
export function formatMonth(m: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = parseInt(m.split('-')[1], 10) - 1;
  return months[idx] || m;
}

/** Format full month: "2024-01" → "January 2024" */
export function formatMonthFull(m: string): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const parts = m.split('-');
  const idx = parseInt(parts[1], 10) - 1;
  return `${months[idx]} ${parts[0]}`;
}

/** Format per-capita value: 3.14159 → "3.14" */
export function formatPerCapita(n: number): string {
  if (n === 0) return '—';
  return n.toFixed(2);
}

/** Format rate: 47.812 → "47.8%" */
export function formatRate(n: number): string {
  if (n === 0) return '0%';
  return `${n.toFixed(1)}%`;
}

/** Format currency: 74483 → "$74,483" */
export function formatCurrency(n: number): string {
  if (n === 0) return '—';
  return `$${n.toLocaleString('en-US')}`;
}

/** Format delta with sign: +2.3 or -1.5 */
export function formatDelta(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}
