'use client';

// src/components/church/ChurchSidebar.tsx
//
// Shared navigation for every page inside a church workspace.
//
// Accordion menu grouped by category (UNIMUNITY Church master document,
// priority 1): HOME, PEOPLE, MINISTRIES, SPIRITUAL LIFE, EVENTS, FINANCES,
// SOCIAL OUTREACH, COMMUNICATION, DOCUMENTS, REPORTS, ADMINISTRATION,
// SETTINGS. Each category folds open/closed; the category of the current
// page opens automatically.
//
//  - Every existing route is kept exactly as before (members, families,
//    groups, hr, ministries, events, announcements, finance, income, funds,
//    reports). Nothing is renamed or moved.
//  - People follow-up items open the Human Resources page on the right tab
//    (?tab=visitors / converts / affiliation / birthdays).
//  - Items that are not built yet go to the generic coming-soon page with
//    a "Soon" badge - never hidden, never faked.
//  - All labels are in English (UI rule for the whole platform).
//  - Self-sufficient: given churchId it reads the church's own name and
//    logo from churches/{churchId}.
//  - Below 768px it becomes a drawer behind a menu button.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CHURCH_UI } from '@/lib/moduleTheme';

// route: path after /dashboard/church/{churchId}/ ('' = dashboard),
// optionally with ?tab=... ; null = not built yet (coming soon).
type NavItem = { label: string; route: string | null };
type NavGroup = { key: string; label: string; icon: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { key: 'home', label: 'Home', icon: '🏠', items: [
    { label: 'Dashboard', route: '' },
  ] },
  { key: 'people', label: 'People', icon: '👥', items: [
    { label: 'Members', route: 'members' },
    { label: 'Families', route: 'families' },
    { label: 'Groups', route: 'groups' },
    { label: 'People Follow-up', route: 'hr' },
    { label: 'Visitors', route: 'hr?tab=visitors' },
    { label: 'New Converts', route: 'hr?tab=converts' },
    { label: 'Affiliation Requests', route: 'hr?tab=affiliation' },
    { label: 'Birthdays', route: 'hr?tab=birthdays' },
  ] },
  { key: 'ministries', label: 'Ministries', icon: '🧭', items: [
    { label: 'All Ministries', route: 'ministries' },
    { label: 'Assignments', route: null },
    { label: 'Ministry Schedule', route: null },
  ] },
  { key: 'spiritual', label: 'Spiritual Life', icon: '🕊️', items: [
    { label: 'Services & Worship', route: null },
    { label: 'Prayer', route: null },
    { label: 'Pastoral Care', route: null },
    { label: 'Discipleship & Training', route: null },
    { label: 'Sermons & Media', route: null },
    { label: 'Evangelism', route: null },
    { label: 'Missions', route: null },
  ] },
  { key: 'events', label: 'Events', icon: '📅', items: [
    { label: 'Events & Calendar', route: 'events' },
    { label: 'Meetings', route: null },
    { label: 'Registrations', route: null },
    { label: 'Attendance', route: null },
  ] },
  { key: 'finances', label: 'Finances', icon: '💰', items: [
    { label: 'Overview', route: 'finance' },
    { label: 'Income', route: 'income' },
    { label: 'Expenses', route: null },
    { label: 'Funds', route: 'funds' },
    { label: 'Petty Cash', route: null },
    { label: 'Social Fund', route: null },
    { label: 'Budget', route: null },
    { label: 'Contributions', route: null },
    { label: 'Financial Reports', route: 'reports' },
  ] },
  { key: 'social', label: 'Social Outreach', icon: '🤝', items: [
    { label: 'Overview', route: null },
    { label: 'Aid Requests', route: null },
    { label: 'Beneficiaries', route: null },
    { label: 'Aid Given', route: null },
    { label: 'Social Expenses', route: null },
    { label: 'Social Reports', route: null },
  ] },
  { key: 'communication', label: 'Communication', icon: '📣', items: [
    { label: 'Announcements', route: 'announcements' },
    { label: 'Messages', route: null },
    { label: 'Notifications', route: null },
    { label: 'Targeted Messages', route: null },
  ] },
  { key: 'documents', label: 'Documents', icon: '📁', items: [
    { label: 'Church Documents', route: null },
    { label: 'Member Documents', route: null },
    { label: 'Ministry Documents', route: null },
    { label: 'Administrative Documents', route: null },
    { label: 'Templates', route: null },
    { label: 'Archives', route: null },
  ] },
  { key: 'reports', label: 'Reports', icon: '📈', items: [
    { label: 'Financial Reports', route: 'reports' },
    { label: 'General Reports', route: null },
    { label: 'Member Reports', route: null },
    { label: 'Ministry Reports', route: null },
    { label: 'Group Reports', route: null },
    { label: 'Event Reports', route: null },
    { label: 'Attendance Reports', route: null },
    { label: 'Social Reports', route: null },
  ] },
  { key: 'admin', label: 'Administration', icon: '🏛️', items: [
    { label: 'Governance', route: null },
    { label: 'Roles & Permissions', route: null },
    { label: 'Responsibilities', route: null },
    { label: 'Invitations', route: null },
    { label: 'Audit Log', route: null },
    { label: 'Church Administration', route: null },
  ] },
  { key: 'settings', label: 'Settings', icon: '⚙️', items: [
    { label: 'General Settings', route: null },
    { label: 'Church Information', route: null },
    { label: 'Language', route: null },
    { label: 'Currency', route: null },
    { label: 'Time Zone', route: null },
    { label: 'Notifications', route: null },
    { label: 'Statuses & Categories', route: null },
    { label: 'Custom Fields', route: null },
    { label: 'Preferences', route: null },
  ] },
];

const MOBILE_BREAKPOINT = 768;

const SIDEBAR_CSS = `
.csb { display: flex; flex-direction: column; height: 100%; font-family: inherit; }
.csb-brand { padding: 0 20px 14px; border-bottom: 1px solid ${CHURCH_UI.border}; margin-bottom: 8px; }
.csb-brand img { width: 100%; max-width: 170px; height: auto; display: block; margin-bottom: 10px; }
.csb-module { color: ${CHURCH_UI.textSoft}; font-size: 9px; font-weight: 700; letter-spacing: 0.8px; }
.csb-nav { flex: 1; overflow-y: auto; padding: 4px 10px 10px; }
.csb-group { margin-bottom: 2px; }
.csb-ghead { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: none; background: transparent; border-radius: 10px; cursor: pointer; font-family: inherit; color: ${CHURCH_UI.text}; font-size: 12px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; text-align: left; }
.csb-ghead:hover { background: #FBF6EA; }
.csb-ghead:focus-visible, .csb-item:focus-visible { outline: 2px solid ${CHURCH_UI.gold}; outline-offset: 1px; }
.csb-ghead.has-active { color: ${CHURCH_UI.goldText}; }
.csb-gicon { font-size: 15px; width: 20px; text-align: center; }
.csb-glabel { flex: 1; }
.csb-chev { width: 14px; height: 14px; color: ${CHURCH_UI.textSoft}; transition: transform 0.18s ease; }
.csb-group.is-open .csb-chev { transform: rotate(90deg); }
.csb-items { overflow: hidden; padding: 2px 0 6px 20px; }
.csb-item { width: 100%; display: flex; align-items: center; gap: 8px; padding: 7px 10px; margin: 1px 0; border: none; border-radius: 9px; background: transparent; cursor: pointer; font-family: inherit; text-align: left; color: ${CHURCH_UI.textSoft}; font-size: 13px; font-weight: 500; border-left: 2px solid #F1EADB; border-top-left-radius: 0; border-bottom-left-radius: 0; }
.csb-item:hover { background: #FBF6EA; color: ${CHURCH_UI.text}; }
.csb-item.is-active { background: ${CHURCH_UI.activeGradient}; color: ${CHURCH_UI.text}; font-weight: 700; font-style: italic; border-left-color: ${CHURCH_UI.gold}; box-shadow: 0 2px 8px rgba(36,50,74,0.06); }
.csb-item-label { flex: 1; }
.csb-soon { font-size: 9px; background: ${CHURCH_UI.cream}; color: ${CHURCH_UI.goldText}; padding: 2px 7px; border-radius: 999px; font-weight: 700; font-style: normal; }
.csb-foot { padding: 14px 20px; border-top: 1px solid ${CHURCH_UI.border}; color: ${CHURCH_UI.textSoft}; font-size: 12px; }
.csb-foot-name { font-weight: 700; color: ${CHURCH_UI.text}; font-size: 12.5px; margin-bottom: 2px; }
.csb-switch { background: none; border: none; color: ${CHURCH_UI.goldText}; font-size: 11px; font-weight: 600; cursor: pointer; padding: 0; font-family: inherit; }
@media (prefers-reduced-motion: reduce) { .csb-chev { transition: none; } }
@media print { .csb-root { display: none !important; } }
`;

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
const Chevron = () => (
  <svg className="csb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const desktopStyle = {
  width: '248px', minWidth: '248px', background: 'rgba(255,255,255,0.88)', borderRight: '1px solid ' + CHURCH_UI.border,
  minHeight: '100vh', maxHeight: '100vh', position: 'sticky' as const, top: 0, backdropFilter: 'blur(8px)', padding: '20px 0', boxSizing: 'border-box' as const,
};
const menuBtnStyle = {
  position: 'fixed' as const, top: 14, left: 14, zIndex: 1100, width: 42, height: 42, borderRadius: 10, background: CHURCH_UI.white,
  border: '1px solid ' + CHURCH_UI.border, color: CHURCH_UI.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
};
const overlayStyle = { position: 'fixed' as const, inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1150 };
const closeBtnStyle = { position: 'absolute' as const, top: 14, right: 14, background: 'none', border: 'none', color: CHURCH_UI.text, cursor: 'pointer', display: 'flex', padding: 4 };

export default function ChurchSidebar({ churchId }: { churchId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [churchName, setChurchName] = useState<string | undefined>(undefined);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const base = '/dashboard/church/' + churchId;

  useEffect(() => {
    if (!churchId) return;
    const unsubscribe = onSnapshot(doc(db, 'churches', churchId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setChurchName((data.name as string) || (data.churchName as string) || undefined);
        setLogoUrl((data.logoUrl as string) || undefined);
      }
    });
    return () => unsubscribe();
  }, [churchId]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname, searchParams]);

  // Which item matches the current page. When several items share a page
  // (e.g. People Follow-up / Visitors on the HR page), the ?tab= decides.
  const activeKey = useMemo(() => {
    const tab = searchParams?.get('tab') || '';
    const section = searchParams?.get('section') || '';
    let best: string | null = null;
    for (const g of NAV) {
      for (const it of g.items) {
        const k = g.key + '/' + it.label;
        if (it.route === null) {
          if (pathname === base + '/coming-soon' && section === it.label && !best) best = k;
          continue;
        }
        const [path, query] = it.route.split('?');
        const full = path ? base + '/' + path : base;
        if (pathname !== full) continue;
        const itemTab = query ? new URLSearchParams(query).get('tab') || '' : '';
        if (itemTab && itemTab === tab) best = k;
        else if (!itemTab && !best) best = k;
      }
    }
    return best;
  }, [pathname, searchParams, base]);

  const activeGroup = activeKey ? activeKey.split('/')[0] : 'home';

  // The category of the current page is always open.
  useEffect(() => {
    setOpenGroups((prev) => (prev.includes(activeGroup) ? prev : [...prev, activeGroup]));
  }, [activeGroup]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const go = (item: NavItem) => {
    if (item.route === null) {
      router.push(base + '/coming-soon?section=' + encodeURIComponent(item.label));
    } else {
      router.push(item.route ? base + '/' + item.route : base);
    }
  };

  const content = (
    <div className="csb">
      <style>{SIDEBAR_CSS}</style>
      <div className="csb-brand">
        <img src={logoUrl || '/unimunity-logo.png'} alt={churchName || 'UNIMUNITY'} />
        <div className="csb-module">CHURCH MODULE</div>
      </div>

      <nav className="csb-nav" aria-label="Church menu">
        {NAV.map((g) => {
          const open = openGroups.includes(g.key);
          const hasActive = activeGroup === g.key;
          return (
            <div key={g.key} className={'csb-group' + (open ? ' is-open' : '')}>
              <button
                type="button"
                className={'csb-ghead' + (hasActive ? ' has-active' : '')}
                aria-expanded={open}
                onClick={() => (g.items.length === 1 && g.items[0].route !== null ? go(g.items[0]) : toggleGroup(g.key))}
              >
                <span className="csb-gicon" aria-hidden="true">{g.icon}</span>
                <span className="csb-glabel">{g.label}</span>
                {g.items.length > 1 ? <Chevron /> : null}
              </button>
              {open && g.items.length > 1 ? (
                <div className="csb-items">
                  {g.items.map((it) => {
                    const k = g.key + '/' + it.label;
                    const active = activeKey === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        className={'csb-item' + (active ? ' is-active' : '')}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => go(it)}
                      >
                        <span className="csb-item-label">{it.label}</span>
                        {it.route === null ? <span className="csb-soon">Soon</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {churchName ? (
        <div className="csb-foot">
          <div className="csb-foot-name">{churchName}</div>
          <button type="button" className="csb-switch" onClick={() => router.push('/dashboard/church')}>Switch church</button>
        </div>
      ) : null}
    </div>
  );

  if (!isMobile) {
    return <aside className="csb-root" style={desktopStyle}>{content}</aside>;
  }

  const drawerStyle = {
    position: 'fixed' as const, top: 0, left: 0, height: '100dvh', maxHeight: '100vh', width: 'min(260px, 84vw)', background: '#FFFFFF',
    padding: '20px 0', zIndex: 1200, boxShadow: '4px 0 24px rgba(0,0,0,0.32)', boxSizing: 'border-box' as const,
    transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.22s ease',
  };

  return (
    <div className="csb-root">
      <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open Church menu" style={menuBtnStyle}>
        <MenuIcon />
      </button>
      {drawerOpen ? <div onClick={() => setDrawerOpen(false)} aria-hidden="true" style={overlayStyle} /> : null}
      <div style={drawerStyle}>
        <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close Church menu" style={closeBtnStyle}>
          <CloseIcon />
        </button>
        {content}
      </div>
    </div>
  );
}
