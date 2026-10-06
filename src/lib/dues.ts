// Single source of truth for "how much does this member owe" and
// "how much will the beneficiary receive". Used by the weekly automatic
// reminders, the Send Reminder page, the member portal and the payment grid,
// so every screen and every email shows the same, correct numbers.
//
// Rules (conservative: a member is never asked for more than they owe):
//  1. Only the CURRENT cycle counts: weeks before the cycle start or after
//     the cycle end are ignored (this also ignores corrupted dates).
//  2. A member only owes from the date they joined (never for periods whose
//     due date is before they were added).
//  3. Contributions follow the group's FREQUENCY. The grid has one column per
//     week; for a monthly group all the weeks of a month form ONE period, which
//     is paid as soon as any of its weeks is ticked (same for bi-weekly,
//     quarterly, bi-annual and annual).
//  4. A period is due on its first week's date, and only once that date has
//     passed (today included).
//  5. Each share (slot) of a member owes one contribution per period.
//  6. Weekly groups owe only on the grid's weekly dates (cycle start + 7k
//     days); columns on another weekday (corrupted data) are ignored, and
//     two columns on the same date count once.

export type Frequency = 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Bi-annual' | 'Annual';

export interface DuePeriod {
  key: string;
  label: string;
  dueDate: string;
  weekIdxs: string[];
}

export interface DuesResult {
  /** Periods already due for this member (oldest first). */
  duePeriods: DuePeriod[];
  /** Due periods still unpaid, per slot, flattened (oldest first). */
  unpaid: { slotNum: string; period: DuePeriod }[];
  /** Number of slot-periods due / paid. */
  dueCount: number;
  paidCount: number;
  /** Contribution per period per slot, and total owed. */
  amountPerPeriod: number;
  amountOwed: number;
  /** Week indexes that are the due week of an unpaid period (for highlighting). */
  unpaidWeekIdxs: Set<string>;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86400000;

export function normalizeFrequency(value: unknown): Frequency {
  const v = String(value || '').toLowerCase().replace(/[\s_]/g, '');
  if (v.startsWith('bi-week') || v.startsWith('biweek') || v === 'fortnightly') return 'Bi-weekly';
  if (v.startsWith('month')) return 'Monthly';
  if (v.startsWith('quarter')) return 'Quarterly';
  if (v.startsWith('bi-annual') || v.startsWith('biannual') || v.startsWith('semi')) return 'Bi-annual';
  if (v.startsWith('annual') || v.startsWith('year')) return 'Annual';
  return 'Weekly';
}

/** Date-only string (YYYY-MM-DD) from a Date, an ISO string or a Firestore Timestamp. */
export function toDateOnly(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const s = value.slice(0, 10);
    return ISO.test(s) ? s : null;
  }
  const v = value as { toDate?: () => Date; seconds?: number };
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (typeof v.toDate === 'function') d = v.toDate();
  else if (typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
  if (!d || isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function utc(dateStr: string): number {
  return Date.UTC(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1, Number(dateStr.slice(8, 10)));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodOf(date: string, freq: Frequency, anchor: string): { key: string; label: string } {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1;
  switch (freq) {
    case 'Bi-weekly': {
      const n = Math.floor((utc(date) - utc(anchor)) / (14 * DAY));
      return { key: 'B' + n, label: 'Period ' + (n + 1) };
    }
    case 'Monthly':
      return { key: y + '-' + String(m + 1).padStart(2, '0'), label: MONTHS[m] + ' ' + y };
    case 'Quarterly':
      return { key: y + '-Q' + (Math.floor(m / 3) + 1), label: 'Q' + (Math.floor(m / 3) + 1) + ' ' + y };
    case 'Bi-annual':
      return { key: y + '-H' + (m < 6 ? 1 : 2), label: (m < 6 ? 'Jan-Jun ' : 'Jul-Dec ') + y };
    case 'Annual':
      return { key: String(y), label: String(y) };
    default:
      return { key: 'W' + date, label: date };
  }
}

export function computeDues(opts: {
  weeks: Record<string, string>;
  payments: Record<string, Record<string, boolean>>;
  slotNums: string[];
  frequency?: unknown;
  cycleStart?: unknown;
  cycleEnd?: unknown;
  memberSince?: unknown;
  amountPerPeriod: number;
  today?: Date;
}): DuesResult {
  const freq = normalizeFrequency(opts.frequency);
  const todayStr = (opts.today || new Date()).toISOString().slice(0, 10);
  const cycleStart = toDateOnly(opts.cycleStart);
  const cycleEnd = toDateOnly(opts.cycleEnd);
  const since = toDateOnly(opts.memberSince);
  const amountPerPeriod = Number.isFinite(opts.amountPerPeriod) && opts.amountPerPeriod > 0 ? opts.amountPerPeriod : 0;

  // 1. Weeks of the current cycle only, in date order.
  let weeks = Object.entries(opts.weeks || {})
    .filter(([, d]) => typeof d === 'string' && ISO.test(d))
    .filter(([, d]) => (!cycleStart || d >= cycleStart) && (!cycleEnd || d <= cycleEnd))
    .sort((a, b) => a[1].localeCompare(b[1]) || Number(a[0]) - Number(b[0]));

  // 3. Group weeks into periods following the group's frequency.
  const anchor = cycleStart || weeks[0]?.[1] || todayStr;
  // The grid always creates weekly columns on the cycle start's weekday
  // (start + 7 days, + 14 days...). A weekly group therefore only owes on
  // those dates: columns that drifted to another weekday (corrupted data)
  // are never counted as an extra contribution. Longer frequencies group
  // weeks by calendar period, where such columns can't add anything.
  if (freq === 'Weekly' && cycleStart) {
    for (let k = weeks.length - 1; k >= 0; k--) {
      const diffDays = Math.round((utc(weeks[k][1]) - utc(cycleStart)) / DAY);
      if (diffDays % 7 !== 0) weeks.splice(k, 1);
    }
  }
  if (freq === 'Weekly') {
    // Two columns on the same date are the same contribution: merge them.
    const seen = new Map<string, string[]>();
    for (const [idx, date] of weeks) seen.set(date, [...(seen.get(date) || []), idx]);
    weeks = Array.from(seen.entries()).map(([date, idxs]) => [idxs.join('|'), date] as [string, string]);
  }
  const periods: DuePeriod[] = [];
  const byKey = new Map<string, DuePeriod>();
  for (const [idx, date] of weeks) {
    const { key, label } = periodOf(date, freq, anchor);
    let p = byKey.get(key);
    if (!p) {
      p = { key, label, dueDate: date, weekIdxs: [] };
      byKey.set(key, p);
      periods.push(p);
    }
    p.weekIdxs.push(...idx.split('|'));
  }

  // 2 + 4. Due once the due date has passed, and not before the member joined.
  const duePeriods = periods.filter(p => p.dueDate <= todayStr && (!since || p.dueDate >= since));

  // 5. One contribution per slot per period; paid if any week of it is ticked.
  const unpaid: { slotNum: string; period: DuePeriod }[] = [];
  const unpaidWeekIdxs = new Set<string>();
  let paidCount = 0;
  for (const p of duePeriods) {
    for (const slotNum of opts.slotNums) {
      const paid = p.weekIdxs.some(w => opts.payments?.[slotNum]?.[w] === true);
      if (paid) paidCount++;
      else {
        unpaid.push({ slotNum, period: p });
        unpaidWeekIdxs.add(p.weekIdxs[0]);
      }
    }
  }
  const dueCount = duePeriods.length * opts.slotNums.length;

  return {
    duePeriods,
    unpaid,
    dueCount,
    paidCount,
    amountPerPeriod,
    amountOwed: Math.round(unpaid.length * amountPerPeriod * 100) / 100,
    unpaidWeekIdxs,
  };
}

/** Contribution expected from a member per period: their own amount, else the group's. */
export function contributionPerPeriod(member: Record<string, unknown> | null | undefined, group: Record<string, unknown> | null | undefined): number {
  const own = Number((member as { expectedAmount?: unknown })?.expectedAmount);
  if (Number.isFinite(own) && own > 0) return own;
  const g = (group || {}) as { contributionSettings?: { amount?: unknown }; contribution?: unknown; amountPerMember?: unknown; weeklyAmount?: unknown };
  const raw = g.contributionSettings?.amount ?? g.contribution ?? g.amountPerMember ?? g.weeklyAmount;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Amount the beneficiary receives for one payout: every active slot's
 * contribution for the period, minus the organizer commission.
 * It is an estimate: it assumes everyone pays that period.
 */
export function payoutForPeriod(opts: {
  slotContributions: number[];
  commissionRatePercent?: unknown;
}): { pool: number; commission: number; net: number; ratePercent: number } {
  const pool = Math.round(opts.slotContributions.reduce((s, n) => s + (Number.isFinite(n) && n > 0 ? n : 0), 0) * 100) / 100;
  const r = Number(opts.commissionRatePercent);
  const ratePercent = Number.isFinite(r) && r > 0 && r < 100 ? r : 0;
  const commission = Math.round(pool * ratePercent) / 100;
  return { pool, commission, net: Math.round((pool - commission) * 100) / 100, ratePercent };
}
