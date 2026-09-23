// UNIMUNITY - one color theme per module / section.
//
// The page you are on decides the colors. The floating support widget
// (chat window, launcher button, AI avatar ring) and the Church sidebar
// all read from here, so they switch color automatically when you move
// from one module or section to another. No page has to do anything.
//
// To give another section its own colors: add a theme below, then add
// its route in getModuleTheme().
import type { CSSProperties } from 'react';

export interface ModuleTheme {
  key: string;
  name: string;
  accent: string;      // main color (buttons, launcher, active tab)
  accentDark: string;  // darker shade (titles in the chat)
  accent2: string;     // secondary color (launcher icon, avatar ring)
  soft: string;        // light background (chat header, active menu item)
  border: string;      // light border
  grad: string;        // gradient (hero banners, primary buttons, avatar)
  hero: string;        // large banner background
}

export const THEMES: Record<string, ModuleTheme> = {
  // Tontine module - the original bordeaux / gold
  tontine: {
    key: 'tontine', name: 'Tontine',
    accent: '#6B2D4E', accentDark: '#4A1F38', accent2: '#E9C77B',
    soft: '#FBEEDD', border: '#EAD9BE',
    grad: 'linear-gradient(135deg, #6B2D4E, #9C4A6E)',
    hero: 'linear-gradient(120deg, #FBEEDD 0%, #FFFDF7 100%)',
  },
  // Church module - soft pastel palette (baby pink / cream / baby green,
  // discreet gold). Every Church page shares the gold accent; each section
  // gets its own pastel tint for the chat header and avatar ring.
  church: {
    key: 'church', name: 'Church',
    accent: '#B8913F', accentDark: '#24324A', accent2: '#F6EFDD',
    soft: '#FBF7EC', border: '#EFE4CC',
    grad: 'linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%)',
    hero: 'linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%)',
  },
  // Church > Dashboard - baby green tint
  churchDashboard: {
    key: 'churchDashboard', name: 'Dashboard',
    accent: '#B8913F', accentDark: '#24324A', accent2: '#E2F0CB',
    soft: '#F1F7E6', border: '#DDEBCB',
    grad: 'linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%)',
    hero: 'linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%)',
  },
  // Church > Ministries - baby pink tint
  churchMinistries: {
    key: 'churchMinistries', name: 'Ministries',
    accent: '#B8913F', accentDark: '#24324A', accent2: '#FDE2E4',
    soft: '#FEF1F2', border: '#F6DADD',
    grad: 'linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%)',
    hero: 'linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%)',
  },
};

export function getModuleTheme(pathname: string | null | undefined): ModuleTheme {
  const p = pathname || '';

  // /dashboard/church/<churchId>/<section>
  const m = p.match(/^\/dashboard\/church\/([^/]+)(?:\/([^/?#]+))?/);
  if (m && m[1] !== 'add-member') {
    const section = m[2];
    if (!section) return THEMES.churchDashboard;
    if (section === 'ministries') return THEMES.churchMinistries; // list + detail pages
    return THEMES.church;
  }

  if (
    p.startsWith('/dashboard/church') ||
    p.startsWith('/create-church') ||
    p.startsWith('/join-church')
  ) {
    return THEMES.church;
  }

  return THEMES.tontine;
}

// CSS variables read by src/components/support/theme.ts and RobotAvatar.
export function themeCssVars(t: ModuleTheme): CSSProperties {
  return {
    '--uni-accent': t.accent,
    '--uni-accent-dark': t.accentDark,
    '--uni-accent-2': t.accent2,
    '--uni-soft': t.soft,
    '--uni-border': t.border,
  } as CSSProperties;
}

// Shared Church module palette (pages, sidebar, cards).
export const CHURCH_UI = {
  pink: '#FDE2E4',
  cream: '#F6EFDD',
  green: '#E2F0CB',
  lavender: '#EEE8F8',
  gold: '#D8B15A',
  goldText: '#8C6A22',   // gold dark enough to read as text on white
  white: '#FFFFFF',
  text: '#24324A',
  textSoft: '#68758A',
  page: '#FFFCF7',       // warm white page background (never grey)
  border: '#F1EADB',
  shadow: '0 2px 14px rgba(36,50,74,0.06)',
  shadowHover: '0 10px 28px rgba(36,50,74,0.10)',
  gradient: 'linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%)',
  activeGradient: 'linear-gradient(120deg, #FDE2E4, #E2F0CB)',
  font: '-apple-system, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
};
