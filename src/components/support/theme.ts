// UNIMUNITY Support Widget - shared visual tokens
// Extracted from the colors that ChatWidget.tsx and UnimunityAIPanel.tsx
// already both used (identically) before being unified into one widget.
// Values are unchanged - this file only removes the duplication so the
// shared shell, Home, Messages and AI content all draw from one place.
export const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  white: '#FFFFFF',
  border: '#EAD9BE',
  or: '#E9C77B',
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
