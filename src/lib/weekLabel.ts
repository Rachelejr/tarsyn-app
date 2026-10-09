// Week names shown to people start at W1 (the first week of a cycle is W1).
// The stored week index still starts at 0: only what is DISPLAYED changes.
export function weekLabel(idx: string | number): string {
  const n = Number(idx);
  return 'W' + (Number.isFinite(n) ? n + 1 : idx);
}
