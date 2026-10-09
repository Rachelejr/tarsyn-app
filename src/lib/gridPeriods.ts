// Splits a tontine's weeks into periods so long grids stay readable.
// Periods follow the CYCLE (they start on the first week), not the calendar:
// - up to 8 months: one single period (no split at all);
// - up to 18 months: blocks of 6 months from the first week;
// - longer: blocks of 12 months from the first week.
// Each period is labelled Completed / In progress / Upcoming from today.

export type PeriodStatus = 'completed' | 'current' | 'upcoming';

export interface GridPeriod {
  key: string;
  label: string;
  status: PeriodStatus;
  weekIdxs: string[];
}

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  completed: 'Completed',
  current: 'In progress',
  upcoming: 'Upcoming',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildGridPeriods(weeks: Record<string, string>, today: Date = new Date()): GridPeriod[] {
  const entries = Object.entries(weeks || {})
    .filter(([, d]) => /^\d{4}-\d{2}-\d{2}/.test(String(d)))
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  if (entries.length === 0) return [];

  const first = new Date(entries[0][1] + 'T00:00:00');
  const last = new Date(entries[entries.length - 1][1] + 'T00:00:00');
  const months = (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()) + 1;
  const size = months <= 8 ? Math.max(months, 1) : months <= 18 ? 6 : 12;

  const label = (start: Date, end: Date) => {
    const a = MONTHS[start.getMonth()], b = MONTHS[end.getMonth()];
    if (start.getFullYear() === end.getFullYear()) return (a === b ? a : a + ' - ' + b) + ' ' + start.getFullYear();
    return a + ' ' + start.getFullYear() + ' - ' + b + ' ' + end.getFullYear();
  };

  const map = new Map<number, { start: Date; end: Date; weekIdxs: string[] }>();
  for (const [idx, date] of entries) {
    const d = new Date(date + 'T00:00:00');
    const sinceStart = (d.getFullYear() - first.getFullYear()) * 12 + (d.getMonth() - first.getMonth());
    const n = Math.floor(sinceStart / size);
    if (!map.has(n)) {
      const start = new Date(first.getFullYear(), first.getMonth() + n * size, 1);
      const end = new Date(first.getFullYear(), first.getMonth() + (n + 1) * size, 0);
      map.set(n, { start, end, weekIdxs: [] });
    }
    map.get(n)!.weekIdxs.push(idx);
  }

  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([n, p]) => {
    // Label from the real first/last weeks of the block, so a one-period
    // cycle reads "Jun - Dec 2026".
    const dates = p.weekIdxs.map(i => new Date(weeks[i] + 'T00:00:00')).sort((x, y) => x.getTime() - y.getTime());
    return {
      key: 'P' + n,
      label: label(dates[0], dates[dates.length - 1]),
      status: (p.end < t ? 'completed' : p.start > t ? 'upcoming' : 'current') as PeriodStatus,
      weekIdxs: p.weekIdxs.sort((a, b) => Number(a) - Number(b)),
    };
  });
}

/** Default period to show: the one in progress, else the next upcoming, else the last. */
export function defaultPeriodKey(periods: GridPeriod[]): string {
  return (periods.find(p => p.status === 'current') || periods.find(p => p.status === 'upcoming') || periods[periods.length - 1])?.key || '';
}
