'use client';

// src/app/dashboard/church/[churchId]/page.tsx
//
// Church Dashboard - summary + quick access, in the shared UNIMUNITY
// design (ChurchPageHeader + churchUi cards). Wide landscape layout.
//
//  - Every number is real (live Firestore). Nothing is invented.
//      Members, New members (last 30 days), Pending invitations,
//      Ministries (both storage places), Groups, Families.
//  - Quick access follows the sidebar categories (People, Ministries,
//    Events, Finances, Communication). Only real pages are linked.
//  - Ministries overview uses the real member lists of each ministry.
//  - Right column: next upcoming events and the newest members.
//  - No drawings in the header (decision of Sept 29).
//  - English UI, church's own logo in the header.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';
import ChurchPageHeader from '@/components/church/ChurchPageHeader';
import { useChurchBrand } from '@/components/church/useChurchBrand';
import { useChurchMinistries } from '@/components/church/useChurchMinistries';
import { ChurchUiStyles, ChurchSummaryCard, ChurchAvatar } from '@/components/church/churchUi';

interface RecentMember { id: string; fullName: string; role: string; photoUrl: string; createdAtMs: number; }
interface UpcomingEvent { id: string; title: string; date: string; time: string; location: string; startAt: number; }

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const t = v as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
}

function timeAgo(ms: number): string {
  if (!ms) return '';
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return min + ' min ago';
  const h = Math.floor(min / 60);
  if (h < 24) return h + ' hour' + (h > 1 ? 's' : '') + ' ago';
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 30) return d + ' days ago';
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function eventWhen(e: UpcomingEvent): { day: string; month: string; rest: string } {
  const d = e.date ? new Date(e.date + 'T00:00:00') : new Date(e.startAt);
  const day = isNaN(d.getTime()) ? '' : String(d.getDate());
  const month = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  let time = '';
  if (e.time) {
    const [hh, mm] = e.time.split(':').map(Number);
    const t = new Date(); t.setHours(hh || 0, mm || 0, 0, 0);
    time = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return { day, month, rest: [isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' }), time, e.location].filter(Boolean).join(' \u00B7 ') };
}

const PAGE_CSS = `
.db-shell { display: flex; min-height: 100vh; background: linear-gradient(180deg, #FFFDF9 0%, #FBF8F1 100%); }
.db-main { flex: 1; min-width: 0; }
.db-inner { width: 100%; max-width: 1480px; margin: 0 auto; padding: 20px 28px 12px; box-sizing: border-box; }
.db-summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.db-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
.db-card { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(36,50,74,0.03), 0 6px 18px -14px rgba(184,145,63,0.35); min-width: 0; }
.db-card + .db-card { margin-top: 18px; }
.db-card-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; }
.db-card-head h2 { margin: 0; font-size: 15px; font-weight: 800; color: #24324A; }
.db-link { background: none; border: none; padding: 0; color: #8A6D1F; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.db-link:hover { text-decoration: underline; }
.db-link:focus-visible, .db-tile:focus-visible { outline: 2px solid #B8913F; outline-offset: 2px; }

.db-cat { margin-bottom: 14px; }
.db-cat:last-child { margin-bottom: 0; }
.db-cat-title { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #8A6D1F; margin: 0 0 8px; }
.db-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.db-tile { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 14px; border: 1px solid #F0E6D2; background: #FFFDF9; cursor: pointer; font-family: inherit; text-align: left; color: #24324A; }
.db-tile:hover { border-color: #D8B15A; background: #FFFFFF; box-shadow: 0 6px 16px -12px rgba(184,145,63,0.6); }
.db-tile-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.db-tile-label { font-size: 13px; font-weight: 700; }
.db-tile-sub { font-size: 11px; color: #68758A; margin-top: 1px; }

.db-bar-row { display: grid; grid-template-columns: 170px minmax(0, 1fr) 90px; gap: 12px; align-items: center; padding: 6px 0; }
.db-bar-name { font-size: 13px; font-weight: 600; color: #24324A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.db-bar { height: 10px; border-radius: 999px; background: #F6EFDD; overflow: hidden; }
.db-bar > span { display: block; height: 100%; border-radius: 999px; }
.db-bar-count { font-size: 12px; color: #68758A; text-align: right; }
.db-empty { margin: 0; font-size: 13px; color: #68758A; text-align: center; padding: 10px 0; }

.db-event { display: flex; gap: 12px; align-items: center; padding: 8px 0; border-top: 1px solid #F5EEDF; }
.db-event:first-child { border-top: none; }
.db-date { width: 46px; height: 50px; border-radius: 12px; background: linear-gradient(160deg, #FDE2E4, #E2F0CB); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
.db-date strong { font-size: 17px; font-weight: 800; color: #24324A; line-height: 1; }
.db-date span { font-size: 10px; font-weight: 700; color: #8A6D1F; margin-top: 2px; }
.db-ev-title { font-size: 13px; font-weight: 700; color: #24324A; margin: 0; }
.db-ev-sub { font-size: 11.5px; color: #68758A; margin: 2px 0 0; }

.db-person { display: flex; gap: 10px; align-items: center; padding: 7px 0; border-top: 1px solid #F5EEDF; cursor: pointer; }
.db-person:first-child { border-top: none; }
.db-person-name { font-size: 13px; font-weight: 700; color: #24324A; margin: 0; }
.db-person-sub { font-size: 11.5px; color: #68758A; margin: 1px 0 0; }
.db-footer { text-align: center; padding: 22px 0 8px; font-size: 11px; color: #8A93A3; }

@media (max-width: 1280px) { .db-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1024px) { .db-layout { grid-template-columns: 1fr; } .db-inner { padding: 16px 18px 12px; } }
@media (max-width: 640px) {
  .db-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .db-inner { padding: 12px; }
  .db-bar-row { grid-template-columns: 110px minmax(0, 1fr) 70px; }
}
`;

const ICON_PEOPLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.6 0 4.6 1.8 5.5 4.9" /></svg>
);
const ICON_SPARK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
);
const ICON_MAIL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
);
const ICON_COMPASS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>
);
const ICON_GROUP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="7" cy="9" r="3" /><circle cx="17" cy="9" r="3" /><path d="M2 20c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5M12 20c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5" /></svg>
);
const ICON_HOME = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></svg>
);

export default function ChurchDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const churchId = params?.churchId as string;
  const brand = useChurchBrand(churchId);
  const { ministries, byMember } = useChurchMinistries(churchId);

  const [userName, setUserName] = useState('');
  const [members, setMembers] = useState<RecentMember[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [familyCount, setFamilyCount] = useState(0);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login'); return; }
      setUserName(u.displayName || (u.email ? u.email.split('@')[0] : ''));
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchMembers'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => {
      let pending = 0;
      const rows: RecentMember[] = snap.docs.map((d) => {
        const x = d.data() as Record<string, any>;
        if (x.email && !x.userId) pending++;
        return {
          id: d.id,
          fullName: x.fullName || ((x.firstName || '') + ' ' + (x.lastName || '')).trim() || 'Unnamed member',
          role: x.role || 'Member',
          photoUrl: x.photoUrl || '',
          createdAtMs: toMillis(x.createdAt),
        };
      });
      rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
      setMembers(rows);
      setPendingCount(pending);
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(query(collection(db, 'churchGroups'), where('churchId', '==', churchId)), (snap) => setGroupCount(snap.size), (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, 'churches', churchId, 'families'), (snap) => setFamilyCount(snap.size), (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, 'churches', churchId, 'events'), (snap) => {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const rows = snap.docs.map((d) => {
        const x = d.data() as Record<string, any>;
        return { id: d.id, title: x.title || 'Event', date: x.date || '', time: x.time || '', location: x.location || '', startAt: typeof x.startAt === 'number' ? x.startAt : 0 };
      }).filter((e) => e.startAt >= startOfToday.getTime()).sort((a, b) => a.startAt - b.startAt);
      setEvents(rows.slice(0, 4));
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  const newCount = useMemo(() => members.filter((m) => m.createdAtMs && Date.now() - m.createdAtMs <= THIRTY_DAYS).length, [members]);

  const topMinistries = useMemo(() => {
    const rows = ministries
      .filter((m) => !m.parentMinistryId)
      .map((m) => {
        let count = 0;
        byMember.forEach((list) => { if (list.some((e) => e.ministryId === m.id)) count++; });
        return { id: m.id, name: m.name, count };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return rows.slice(0, 6);
  }, [ministries, byMember]);
  const maxMin = Math.max(1, ...topMinistries.map((m) => m.count));

  const base = '/dashboard/church/' + churchId;
  const addMemberHref = '/dashboard/church/add-member?churchId=' + churchId;
  const firstName = userName.split(' ')[0];

  const categories: { title: string; tiles: { icon: string; bg: string; label: string; sub: string; href: string }[] }[] = [
    { title: 'People', tiles: [
      { icon: '👥', bg: '#E2F0CB', label: 'Members', sub: members.length + ' in the church', href: base + '/members' },
      { icon: '➕', bg: '#F6EFDD', label: 'Add Member', sub: 'Register someone new', href: addMemberHref },
      { icon: '🏡', bg: '#FDE2E4', label: 'Families', sub: familyCount + ' households', href: base + '/families' },
      { icon: '👫', bg: '#E2F0CB', label: 'Groups', sub: groupCount + ' groups', href: base + '/groups' },
      { icon: '🧾', bg: '#F6EFDD', label: 'People Follow-up', sub: 'Visitors, converts, birthdays', href: base + '/hr' },
    ] },
    { title: 'Ministries & Events', tiles: [
      { icon: '🧭', bg: '#FDE2E4', label: 'Ministries', sub: ministries.length + ' ministries', href: base + '/ministries' },
      { icon: '📅', bg: '#E2F0CB', label: 'Events & Calendar', sub: events.length ? events.length + ' upcoming' : 'Plan an event', href: base + '/events' },
      { icon: '📣', bg: '#F6EFDD', label: 'Announcements', sub: 'Share news', href: base + '/announcements' },
    ] },
    { title: 'Finances', tiles: [
      { icon: '💰', bg: '#F6EFDD', label: 'Finance Overview', sub: 'Totals by category', href: base + '/finance' },
      { icon: '💵', bg: '#E2F0CB', label: 'Income', sub: 'Record with a receipt', href: base + '/income' },
      { icon: '🏦', bg: '#FDE2E4', label: 'Funds', sub: 'Balances and transfers', href: base + '/funds' },
      { icon: '📈', bg: '#F6EFDD', label: 'Reports', sub: 'Print or export', href: base + '/reports' },
    ] },
  ];

  const location = [brand.city, brand.country].filter(Boolean).join(', ');

  return (
    <div className="db-shell">
      <ChurchUiStyles />
      <style>{PAGE_CSS}</style>
      <ChurchSidebar churchId={churchId} />

      <div className="db-main">
        <div className="db-inner">
          <ChurchPageHeader
            churchId={churchId}
            title={firstName ? 'Welcome back, ' + firstName : 'Welcome back'}
            subtitle={'Here is what is happening at ' + (brand.name || 'your church') + (location ? ' (' + location + ')' : '') + '.'}
            description={'\u201CFor where two or three gather in my name, there am I with them.\u201D \u2014 Matthew 18:20'}
            breadcrumb="Dashboard"
            primaryAction={{ label: 'Add Member', icon: '+', href: addMemberHref }}
            secondaryAction={{ label: 'View Members', href: base + '/members' }}
          />

          <div className="db-summary">
            <ChurchSummaryCard label="Members" value={members.length} tint="cream" icon={ICON_PEOPLE} />
            <ChurchSummaryCard label="New (30 days)" value={newCount} tint="pink" icon={ICON_SPARK} />
            <ChurchSummaryCard label="Pending invitations" value={pendingCount} tint="gold" icon={ICON_MAIL} />
            <ChurchSummaryCard label="Ministries" value={ministries.length} tint="green" icon={ICON_COMPASS} />
            <ChurchSummaryCard label="Groups" value={groupCount} tint="cream" icon={ICON_GROUP} />
            <ChurchSummaryCard label="Families" value={familyCount} tint="pink" icon={ICON_HOME} />
          </div>

          <div className="db-layout">
            <div>
              <section className="db-card">
                <div className="db-card-head"><h2>Quick access</h2></div>
                {categories.map((c) => (
                  <div key={c.title} className="db-cat">
                    <p className="db-cat-title">{c.title}</p>
                    <div className="db-tiles">
                      {c.tiles.map((t) => (
                        <button key={t.label} type="button" className="db-tile" onClick={() => router.push(t.href)}>
                          <span className="db-tile-icon" style={{ background: t.bg }} aria-hidden="true">{t.icon}</span>
                          <span>
                            <span className="db-tile-label">{t.label}</span>
                            <span className="db-tile-sub" style={{ display: 'block' }}>{t.sub}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>

              <section className="db-card">
                <div className="db-card-head">
                  <h2>Ministries overview</h2>
                  <button type="button" className="db-link" onClick={() => router.push(base + '/ministries')}>View all &rarr;</button>
                </div>
                {topMinistries.length === 0 ? (
                  <p className="db-empty">No ministries yet. Create your first one from the Ministries page.</p>
                ) : topMinistries.map((m, i) => (
                  <div key={m.id} className="db-bar-row">
                    <span className="db-bar-name">{m.name}</span>
                    <div className="db-bar"><span style={{ width: Math.round((m.count / maxMin) * 100) + '%', background: i % 2 === 0 ? '#CFE6B0' : '#F6C6CC' }} /></div>
                    <span className="db-bar-count">{m.count} member{m.count === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </section>
            </div>

            <div>
              <section className="db-card">
                <div className="db-card-head">
                  <h2>Upcoming events</h2>
                  <button type="button" className="db-link" onClick={() => router.push(base + '/events')}>View all</button>
                </div>
                {events.length === 0 ? (
                  <p className="db-empty">No upcoming events. Create one from Events &amp; Calendar.</p>
                ) : events.map((e) => {
                  const w = eventWhen(e);
                  return (
                    <div key={e.id} className="db-event">
                      <div className="db-date"><strong>{w.day}</strong><span>{w.month}</span></div>
                      <div style={{ minWidth: 0 }}>
                        <p className="db-ev-title">{e.title}</p>
                        <p className="db-ev-sub">{w.rest}</p>
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="db-card">
                <div className="db-card-head">
                  <h2>Newest members</h2>
                  <button type="button" className="db-link" onClick={() => router.push(base + '/members')}>View all</button>
                </div>
                {members.length === 0 ? (
                  <p className="db-empty">No members yet.</p>
                ) : members.slice(0, 5).map((m) => (
                  <div key={m.id} className="db-person" role="link" tabIndex={0} onClick={() => router.push(base + '/members/' + m.id)} onKeyDown={(ev) => { if (ev.key === 'Enter') router.push(base + '/members/' + m.id); }}>
                    <ChurchAvatar name={m.fullName} photoUrl={m.photoUrl} size={34} />
                    <div style={{ minWidth: 0 }}>
                      <p className="db-person-name">{m.fullName}</p>
                      <p className="db-person-sub">{m.role}{m.createdAtMs ? ' \u00B7 ' + timeAgo(m.createdAtMs) : ''}</p>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>

          <div className="db-footer">
            Powered by UNIMUNITY&trade; &middot; A product of Ma Production Luxenn Zara LLC &middot; &copy; 2026 All Rights Reserved &middot; v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}
