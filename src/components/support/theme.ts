// UNIMUNITY Support Widget - shared visual tokens
//
// The main colors are CSS variables so the widget (chat, launcher, AI
// avatar ring) automatically takes the colors of the module / page the
// person is on. UnimunitySupportWidget sets these variables from
// src/lib/moduleTheme.ts. The value after the comma is the original
// Tontine bordeaux/gold, used if no variable is set.
export const C = {
  bordeaux: 'var(--uni-accent, #6B2D4E)',
  bordeauxDark: 'var(--uni-accent-dark, #4A1F38)',
  creme: 'var(--uni-soft, #FBEEDD)',
  ivoire: '#FFFDF7',
  white: '#FFFFFF',
  border: 'var(--uni-border, #EAD9BE)',
  or: 'var(--uni-accent-2, #E9C77B)',
  muted: '#6b7280',
};

// Single shared breakpoints (previously duplicated in both components).
export const MOBILE_BREAKPOINT = 640;
export const TABLET_BREAKPOINT = 1024;

export type DeviceTier = 'mobile' | 'tablet' | 'desktop';

export function deviceTierFor(width: number): DeviceTier {
  if (width < MOBILE_BREAKPOINT) return 'mobile';
  if (width < TABLET_BREAKPOINT) return 'tablet';
  return 'desktop';
}
