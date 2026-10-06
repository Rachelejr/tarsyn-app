// Whether a tontine is upcoming, in progress or completed, from its start
// and end dates (and an explicit "completed"/"archived" status).

export type TontineStatus = 'upcoming' | 'current' | 'completed';

export const TONTINE_STATUS_LABEL: Record<TontineStatus, string> = {
  current: 'In progress',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

export const TONTINE_STATUS_ORDER: TontineStatus[] = ['current', 'upcoming', 'completed'];

export function tontineStatus(opts: { status?: string; startDate?: string | null; endDate?: string | null }, today: Date = new Date()): TontineStatus {
  const st = String(opts.status || '').toLowerCase();
  if (st === 'completed' || st === 'archived' || st === 'closed') return 'completed';
  const t = today.toISOString().slice(0, 10);
  if (opts.startDate && String(opts.startDate).slice(0, 10) > t) return 'upcoming';
  if (opts.endDate && String(opts.endDate).slice(0, 10) < t) return 'completed';
  return 'current';
}
