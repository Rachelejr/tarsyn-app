'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Shared navigation for every page inside a specific church workspace.
// Only Dashboard, Members and Groups are wired to real pages in Phase 1.
// Every other item routes to the generic /coming-soon page instead of
// being hidden, per the "don't fake functionality, but don't hide it
// either" rule — it just doesn't pretend to work yet.
const C = {
  navy: '#172554',
  primary: '#1E3A8A',
  gold: '#D4AF37',
  ivory: '#FFFDF7',
  lightBlue: '#EFF6FF',
  champagne: '#F8F1D8',
  textMuted: 'rgba(255,255,255,0.55)',
  textActive: '#FFFFFF',
};

type NavItem = { key: string; label: string; icon: string; enabled: boolean };

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠', enabled: true },
  { key: 'members', label: 'Membres', icon: '👥', enabled: true },
  { key: 'families', label: 'Familles', icon: '👨‍👩‍👧‍👦', enabled: false },
  { key: 'groups', label: 'Groupes', icon: '👫', enabled: true },
  { key: 'ministries', label: 'Ministères', icon: '⛪', enabled: false },
  { key: 'services', label: 'Cultes & Services', icon: '🕊️', enabled: false },
  { key: 'events', label: 'Événements & Calendrier', icon: '📅', enabled: false },
  { key: 'attendance', label: 'Présences', icon: '✅', enabled: false },
  { key: 'pastoral-care', label: 'Suivi pastoral', icon: '💬', enabled: false },
  { key: 'prayer', label: 'Prières', icon: '🙏', enabled: false },
  { key: 'discipleship', label: 'Discipulat & Formations', icon: '📖', enabled: false },
  { key: 'sermons', label: 'Sermons & Médias', icon: '🎙️', enabled: false },
  { key: 'children', label: 'Enfants', icon: '🧒', enabled: false },
  { key: 'youth', label: 'Jeunesse', icon: '🧑‍🎓', enabled: false },
  { key: 'volunteers', label: 'Bénévoles', icon: '🤝', enabled: false },
  { key: 'outreach', label: 'Évangélisation', icon: '📣', enabled: false },
  { key: 'missions', label: 'Missions', icon: '🌍', enabled: false },
  { key: 'communication', label: 'Communication', icon: '💌', enabled: false },
  { key: 'contributions', label: 'Contributions', icon: '💰', enabled: false },
  { key: 'expenses', label: 'Dépenses & Budget', icon: '📊', enabled: false },
  { key: 'documents', label: 'Documents', icon: '📁', enabled: false },
  { key: 'governance', label: 'Gouvernance', icon: '🏛️', enabled: false },
  { key: 'reports', label: 'Rapports', icon: '📈', enabled: false },
  { key: 'roles', label: 'Rôles & Permissions', icon: '🔐', enabled: false },
  { key: 'audit-log', label: "Journal d'audit", icon: '📜', enabled: false },
  { key: 'settings', label: 'Paramètres Church', icon: '⚙️', enabled: false },
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
      <div style={{ padding: '0 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '10px' }}>
        <div style={{ color: C.textActive, fontSize: '15px', fontWeight: 800 }}>UNIMUNITY</div>
        <div style={{ color: C.gold, fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>MODULE CHURCH</div>
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
                background: active ? C.primary : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                color: active ? C.textActive : C.textMuted,
                fontSize: '13px', fontWeight: active ? 700 : 500,
              }}
            >
              <span style={{ fontSize: '15px' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {!item.enabled && (
                <span style={{ fontSize: '9px', background: 'rgba(212,175,55,0.18)', color: C.gold, padding: '2px 6px', borderRadius: '999px', fontWeight: 700 }}>
                  Bientôt
                </span>
              )}
            </button>
          );
        })}
      </div>

      {churchName && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', color: C.textMuted, fontSize: '12px' }}>
          <div style={{ fontWeight: 700, color: C.textActive, fontSize: '13px', marginBottom: '2px' }}>{churchName}</div>
          <button onClick={() => router.push('/dashboard/church')} style={{ background: 'none', border: 'none', color: C.gold, fontSize: '11px', cursor: 'pointer', padding: 0 }}>
            Changer d'église
          </button>
        </div>
      )}
    </>
  );

  // Desktop: unchanged from before - a permanent 236px column, part of the
  // normal flex row layout every Church page already wraps it in.
  if (!isMobile) {
    return (
      <div style={{ width: '236px', minWidth: '236px', background: C.navy, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
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
        aria-label="Ouvrir le menu Church"
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 1100,
          width: 42, height: 42, borderRadius: 10, background: C.navy,
          border: 'none', color: C.textActive, display: 'flex',
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
          width: 'min(236px, 82vw)', background: C.navy,
          display: 'flex', flexDirection: 'column', padding: '20px 0',
          zIndex: 1200, boxShadow: '4px 0 24px rgba(0,0,0,0.32)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s ease',
        }}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Fermer le menu Church"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: C.textActive, cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <CloseIcon />
        </button>
        {navContent}
      </div>
    </>
  );
}
