// Finds and repairs damaged columns in a payment grid, without ever losing
// a real payment:
//  - columns outside the current cycle dates (e.g. 2024 dates in a 2026 cycle),
//  - weekly columns that are not on the cycle's weekday (start + 7k days),
//  - several columns on the same date.
// A tick found on a removed off-weekday column is moved to the nearest
// valid weekly column (within 3 days) of the same member, so a payment that
// was ticked on the wrong column is kept. Ticks on out-of-cycle columns are
// NOT moved (those dates don't belong to this cycle); the full grid is
// backed up before any change.

export interface GridHealth {
  outOfCycle: string[];
  offCadence: string[];
  duplicates: string[];
  movedTicks: { slotNum: string; from: string; to: string }[];
  droppedTicks: { slotNum: string; weekIdx: string }[];
  weeks: Record<string, string>;
  payments: Record<string, Record<string, boolean>>;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86400000;
const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));

export function analyzeGrid(grid: {
  weeks: Record<string, string>;
  payments?: Record<string, Record<string, boolean>>;
  startDate?: string;
  cycleEndDate?: string;
}, opts: { weekly: boolean }): GridHealth {
  const start = grid.startDate && ISO.test(String(grid.startDate).slice(0, 10)) ? String(grid.startDate).slice(0, 10) : '';
  const end = grid.cycleEndDate && ISO.test(String(grid.cycleEndDate).slice(0, 10)) ? String(grid.cycleEndDate).slice(0, 10) : '';
  const entries = Object.entries(grid.weeks || {}).sort((a, b) => Number(a[0]) - Number(b[0]));

  const outOfCycle: string[] = [];
  const offCadence: string[] = [];
  const duplicates: string[] = [];
  const keep: [string, string][] = [];
  const seenDates = new Map<string, string>();

  for (const [idx, date] of entries) {
    if (typeof date !== 'string' || !ISO.test(date) || (start && date < start) || (end && date > end)) {
      outOfCycle.push(idx);
      continue;
    }
    if (opts.weekly && start && Math.round((utc(date) - utc(start)) / DAY) % 7 !== 0) {
      offCadence.push(idx);
      continue;
    }
    if (seenDates.has(date)) {
      duplicates.push(idx);
      continue;
    }
    seenDates.set(date, idx);
    keep.push([idx, date]);
  }

  const weeks: Record<string, string> = {};
  keep.forEach(([idx, date]) => { weeks[idx] = date; });

  const payments: Record<string, Record<string, boolean>> = {};
  const movedTicks: GridHealth['movedTicks'] = [];
  const droppedTicks: GridHealth['droppedTicks'] = [];
  const keptIdx = new Set(keep.map(([i]) => i));
  const removedForMove = new Set([...offCadence, ...duplicates]);

  for (const [slotNum, row] of Object.entries(grid.payments || {})) {
    payments[slotNum] = {};
    for (const [wIdx, val] of Object.entries(row || {})) {
      if (val !== true) continue;
      if (keptIdx.has(wIdx)) { payments[slotNum][wIdx] = true; continue; }
      if (removedForMove.has(wIdx)) {
        const date = grid.weeks[wIdx];
        // Same date (duplicate) or nearest valid weekly date within 3 days.
        let best: string | null = null;
        let bestGap = 4;
        for (const [kIdx, kDate] of keep) {
          const gap = Math.abs(utc(kDate) - utc(date)) / DAY;
          if (gap < bestGap) { bestGap = gap; best = kIdx; }
        }
        if (best) {
          movedTicks.push({ slotNum, from: wIdx, to: best });
          payments[slotNum][best] = true;
          continue;
        }
      }
      droppedTicks.push({ slotNum, weekIdx: wIdx });
    }
  }

  return { outOfCycle, offCadence, duplicates, movedTicks, droppedTicks, weeks, payments };
}

export function gridNeedsRepair(h: GridHealth): boolean {
  return h.outOfCycle.length + h.offCadence.length + h.duplicates.length > 0;
}
