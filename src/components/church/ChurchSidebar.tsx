'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CHURCH_UI } from '@/lib/moduleTheme';

// Shared navigation for every page inside a specific church workspace.
// Only Dashboard, Members, Groups, Ministries and Families are wired to real pages.
// All labels are in English (UI rule for the whole platform).
// Every other item routes to the generic /coming-soon page instead of
// being hidden, per the "don't fake functionality, but don't hide it
// either" rule — it just doesn't pretend to work yet.
// Light sidebar (soft white), active item in the pink -> green pastel
// gradient with dark text. Palette: CHURCH_UI in src/lib/moduleTheme.ts.
const C = {
  bg: 'rgba(255,255,255,0.85)',
  border: CHURCH_UI.border,
  text: CHURCH_UI.textSoft,
  textDark: CHURCH_UI.text,
  label: CHURCH_UI.textSoft,
};

type NavItem = { key: string; label: string; icon: string; enabled: boolean };

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠', enabled: true },
  { key: 'members', label: 'Members', icon: '👥', enabled: true },
  { key: 'families', label: 'Families', icon: '👨‍👩‍👧‍👦', enabled: true },
  { key: 'groups', label: 'Groups', icon: '👫', enabled: true },
  { key: 'ministries', label: 'Ministries', icon: '🧭', enabled: true },
  { key: 'services', label: 'Services & Worship', icon: '🕊️', enabled: false },
  { key: 'events', label: 'Events & Calendar', icon: '📅', enabled: false },
  { key: 'attendance', label: 'Attendance', icon: '✅', enabled: false },
  { key: 'pastoral-care', label: 'Pastoral Care', icon: '💬', enabled: false },
  { key: 'prayer', label: 'Prayer', icon: '🙏', enabled: false },
  { key: 'discipleship', label: 'Discipleship & Training', icon: '📖', enabled: false },
  { key: 'sermons', label: 'Sermons & Media', icon: '🎙️', enabled: false },
  { key: 'children', label: 'Children', icon: '🧒', enabled: false },
  { key: 'youth', label: 'Youth', icon: '🧑‍🎓', enabled: false },
  { key: 'volunteers', label: 'Volunteers', icon: '🤝', enabled: false },
  { key: 'outreach', label: 'Evangelism', icon: '📣', enabled: false },
  { key: 'missions', label: 'Missions', icon: '🌍', enabled: false },
  { key: 'communication', label: 'Communication', icon: '💌', enabled: false },
  { key: 'contributions', label: 'Contributions', icon: '💰', enabled: false },
  { key: 'expenses', label: 'Expenses & Budget', icon: '📊', enabled: false },
  { key: 'documents', label: 'Documents', icon: '📁', enabled: false },
  { key: 'governance', label: 'Governance', icon: '🏛️', enabled: false },
  { key: 'reports', label: 'Reports', icon: '📈', enabled: false },
  { key: 'roles', label: 'Roles & Permissions', icon: '🔐', enabled: false },
  { key: 'audit-log', label: 'Audit Log', icon: '📜', enabled: false },
  { key: 'settings', label: 'Church Settings', icon: '⚙️', enabled: false },
];

// Below this width the sidebar is no longer a permanent 236px column - it
// becomes a closeable drawer behind a small menu button. Matches the
// tablet/mobile cutover used elsewhere in the app.
const MOBILE_BREAKPOINT = 768;

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function ChurchSidebar({ churchId, churchName }: { churchId: string; churchName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // A route change means the person already picked where to go - close the
  // drawer so it never sits open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const go = (item: NavItem) => {
    if (item.key === 'dashboard') {
      router.push(`/dashboard/church/${churchId}`);
    } else if (item.enabled) {
      router.push(`/dashboard/church/${churchId}/${item.key}`);
    } else {
      router.push(`/dashboard/church/${churchId}/coming-soon?section=${encodeURIComponent(item.label)}`);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.key === 'dashboard') return pathname === `/dashboard/church/${churchId}`;
    return pathname === `/dashboard/church/${churchId}/${item.key}`;
  };

  const navContent = (
    <>
      <div style={{ padding: '0 20px 14px', borderBottom: `1px solid ${C.border}`, marginBottom: '10px' }}>
        <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ width: '100%', maxWidth: '170px', height: 'auto', display: 'block', marginBottom: '10px' }} />
        <div style={{ color: C.label, fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px' }}>CHURCH MODULE</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
        {NAV_ITEMS.map(item => {
          const active = isActive(item);
          return (
            <button
              key={item.key}
              onClick={() => go(item)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', marginBottom: '2px', borderRadius: '9px',
                background: active ? CHURCH_UI.activeGradient : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                color: active ? C.textDark : C.text,
                boxShadow: active ? '0 2px 8px rgba(36,50,74,0.06)' : 'none',
                fontSize: '13px', fontWeight: active ? 700 : 500,
              }}
            >
              <span style={{ fontSize: '15px' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {!item.enabled && (
                <span style={{ fontSize: '9px', background: CHURCH_UI.cream, color: CHURCH_UI.goldText, padding: '2px 7px', borderRadius: '999px', fontWeight: 700 }}>
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {churchName && (
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, color: C.label, fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: C.textDark, fontSize: '12.5px', marginBottom: '2px' }}>{churchName}</div>
          <button onClick={() => router.push('/dashboard/church')} style={{ background: 'none', border: 'none', color: CHURCH_UI.goldText, fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            Switch church
          </button>
        </div>
      )}
    </>
  );

  // Desktop: unchanged from before - a permanent 236px column, part of the
  // normal flex row layout every Church page already wraps it in.
  if (!isMobile) {
    return (
      <div style={{ width: '236px', minWidth: '236px', background: C.bg, borderRight: `1px solid ${C.border}`, minHeight: '100vh', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        {navContent}
      </div>
    );
  }

  // Tablet/mobile: the sidebar no longer reserves any space in the page's
  // flex row (so the content column can use the full screen width) - it
  // becomes a small toggle button plus a closeable drawer, both taken out
  // of normal flow with position: fixed.
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Church menu"
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 1100,
          width: 42, height: 42, borderRadius: 10, background: CHURCH_UI.white,
          border: `1px solid ${CHURCH_UI.border}`, color: CHURCH_UI.text, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
        }}
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1150 }}
        />
      )}

      <div
        style={{
          position: 'fixed', top: 0, left: 0, height: '100dvh', maxHeight: '100vh',
          width: 'min(236px, 82vw)', background: '#FFFFFF',
          display: 'flex', flexDirection: 'column', padding: '20px 0',
          zIndex: 1200, boxShadow: '4px 0 24px rgba(0,0,0,0.32)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s ease',
        }}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close Church menu"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: C.textDark, cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <CloseIcon />
        </button>
        {navContent}
      </div>
    </>
  );
}
