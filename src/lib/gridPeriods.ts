// Splits a tontine's weeks into periods so long grids stay readable:
// half-years (Jan-Jun / Jul-Dec) for tontines up to 18 months, calendar
// years beyond that. Each period is labelled Completed / In progress /
// Upcoming from today's date.

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
  const yearly = months > 18;

  const map = new Map<string, { start: Date; end: Date; label: string; weekIdxs: string[] }>();
  for (const [idx, date] of entries) {
    const d = new Date(date + 'T00:00:00');
    const y = d.getFullYear();
    const half = d.getMonth() < 6 ? 0 : 1;
    const key = yearly ? String(y) : y + '-H' + (half + 1);
    if (!map.has(key)) {
      const start = yearly ? new Date(y, 0, 1) : new Date(y, half * 6, 1);
      const end = yearly ? new Date(y, 11, 31) : new Date(y, half * 6 + 5 + 1, 0);
      const label = yearly ? String(y) : MONTHS[half * 6] + ' - ' + MONTHS[half * 6 + 5] + ' ' + y;
      map.set(key, { start, end, label, weekIdxs: [] });
    }
    map.get(key)!.weekIdxs.push(idx);
  }

  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Array.from(map.entries()).map(([key, p]) => ({
    key,
    label: p.label,
    status: (p.end < t ? 'completed' : p.start > t ? 'upcoming' : 'current') as PeriodStatus,
    weekIdxs: p.weekIdxs.sort((a, b) => Number(a) - Number(b)),
  }));
}

/** Default period to show: the one in progress, else the next upcoming, else the last. */
export function defaultPeriodKey(periods: GridPeriod[]): string {
  return (periods.find(p => p.status === 'current') || periods.find(p => p.status === 'upcoming') || periods[periods.length - 1])?.key || '';
}
