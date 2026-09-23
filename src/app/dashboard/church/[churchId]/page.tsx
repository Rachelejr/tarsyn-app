'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';
import { getModuleTheme, CHURCH_UI } from '@/lib/moduleTheme';
import { CommunityArt } from '@/components/church/ministryKit';

// Church Dashboard - summary + quick access only.
// Every number here is real (live Firestore counts). Sections that are not
// built yet are shown with a "Soon" badge, never with made-up numbers.
const C = {
  page: CHURCH_UI.page,
  card: CHURCH_UI.white,
  border: CHURCH_UI.border,
  textDark: CHURCH_UI.text,
  text: CHURCH_UI.textSoft,
  textMuted: CHURCH_UI.textSoft,
  pink: CHURCH_UI.pink,
  mint: CHURCH_UI.green,
  lilac: CHURCH_UI.lavender,
  peach: CHURCH_UI.cream,
};

interface ChurchDoc {
  churchName?: string;
  city?: string;
  country?: string;
}

interface RecentMember {
  id: string;
  fullName: string;
  role: string;
  createdAtMs: number;
}

interface MinistryRow {
  id: string;
  name: string;
  memberCount: number;
  status: string;
  parentMinistryId: string | null;
}

function timeAgo(ms: number): string {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function ChurchDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const churchId = params?.churchId as string;
  const theme = getModuleTheme(pathname);

  const [userName, setUserName] = useState('');
  const [church, setChurch] = useState<ChurchDoc | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [newMemberCount, setNewMemberCount] = useState(0);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [groupCount, setGroupCount] = useState(0);
  const [ministries, setMinistries] = useState<MinistryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUserName(u.displayName || (u.email ? u.email.split('@')[0] : ''));
      try {
        const churchSnap = await getDoc(doc(db, 'churches', churchId));
        if (churchSnap.exists()) {
          setChurch(churchSnap.data() as ChurchDoc);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, [router, churchId]);

  // Members: total, new in the last 30 days, and the 5 most recent.
  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchMembers'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => {
      setMemberCount(snap.size);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let recent = 0;
      const rows: RecentMember[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const ms = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0;
        if (ms > thirtyDaysAgo) recent++;
        rows.push({ id: d.id, fullName: data.fullName || '(No name)', role: data.role || 'Member', createdAtMs: ms });
      });
      rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
      setNewMemberCount(recent);
      setRecentMembers(rows.slice(0, 5));
    });
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchGroups'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => setGroupCount(snap.size));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchMinistries'), where('churchId', '==', churchId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMinistries(snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || '(No name)',
            memberCount: typeof data.memberCount === 'number' ? data.memberCount : (Array.isArray(data.memberIds) ? data.memberIds.length : 0),
            status: data.status || 'active',
            parentMinistryId: data.parentMinistryId || null,
          };
        }));
      },
      (err) => console.error(err),
    );
    return () => unsub();
  }, [churchId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: `3px solid ${theme.soft}`, borderTopColor: theme.accent, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const base = `/dashboard/church/${churchId}`;
  const soon = (label: string) => `${base}/coming-soon?section=${encodeURIComponent(label)}`;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = userName.split(' ')[0];

  const topMinistries = [...ministries]
    .filter(m => !m.parentMinistryId)
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 5);
  const maxMinistryMembers = Math.max(1, ...topMinistries.map(m => m.memberCount));

  const tiles: { icon: string; label: string; desc: string; bg: string; live: boolean; href: string }[] = [
    { icon: '👥', label: 'Members', desc: 'Directory, profiles and invitations.', bg: C.mint, live: true, href: `${base}/members` },
    { icon: '👫', label: 'Groups', desc: 'Small groups and their leaders.', bg: C.lilac, live: true, href: `${base}/groups` },
    { icon: '⛪', label: 'Ministries', desc: 'Ministries, sub-ministries and teams.', bg: C.pink, live: true, href: `${base}/ministries` },
    { icon: '➕', label: 'Add Member', desc: 'Register a new member of the church.', bg: C.peach, live: true, href: `/dashboard/church/add-member?churchId=${churchId}` },
    { icon: '👨‍👩‍👧‍👦', label: 'Families', desc: 'Households and family links.', bg: C.mint, live: false, href: soon('Families') },
    { icon: '🕊️', label: 'Services & Worship', desc: 'Service plans and order of worship.', bg: C.pink, live: false, href: soon('Services & Worship') },
    { icon: '📅', label: 'Events & Calendar', desc: 'Church calendar and registrations.', bg: C.lilac, live: false, href: soon('Events & Calendar') },
    { icon: '💰', label: 'Contributions', desc: 'Tithes, offerings and pledges.', bg: C.peach, live: false, href: soon('Contributions') },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.page, display: 'flex', fontFamily: CHURCH_UI.font }}>
      <ChurchSidebar churchId={churchId} churchName={church?.churchName} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{ height: '62px', minHeight: '62px', background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 28px 0 64px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              aria-hidden="true"
              style={{ width: '34px', height: '34px', borderRadius: '999px', background: theme.grad, color: C.textDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, boxShadow: `0 0 0 2px #FFFFFF, 0 0 0 4px ${theme.soft}` }}
            >
              {initialsOf(userName)}
            </div>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: C.textDark, lineHeight: 1.1 }}>{userName}</div>
              <div style={{ fontSize: '10.5px', color: C.textMuted }}>Administrator</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px 40px', boxSizing: 'border-box', maxWidth: '1320px', width: '100%' }}>

          {/* Hero */}
          <div style={{ borderRadius: '18px', overflow: 'hidden', position: 'relative', background: theme.hero, padding: '28px 32px', marginBottom: '22px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: CHURCH_UI.goldText, letterSpacing: '0.4px', marginBottom: '6px', textTransform: 'uppercase' }}>{today}</div>
            <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 800, color: C.textDark, letterSpacing: '-0.3px' }}>
              {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
            </h1>
            <p style={{ margin: '0 0 10px', fontSize: '14px', color: C.text, maxWidth: '520px' }}>
              Here is what is happening at {church?.churchName || 'your church'}
              {[church?.city, church?.country].filter(Boolean).length > 0 ? ` (${[church?.city, church?.country].filter(Boolean).join(', ')})` : ''}.
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: C.text, fontStyle: 'italic', maxWidth: '560px' }}>
              &ldquo;For where two or three gather in my name, there am I with them.&rdquo; &mdash; Matthew 18:20
            </p>
            <div className="um-hero-art" aria-hidden="true" style={{ position: 'absolute', right: '18px', bottom: 0, width: '300px', height: '100%' }}>
              <CommunityArt />
            </div>
            <style>{`@media (max-width: 900px) { .um-hero-art { display: none; } }`}</style>
          </div>

          <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Main column */}
            <div style={{ flex: '1 1 560px', minWidth: 0 }}>

              {/* Stats - real numbers only */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                <StatCard icon="👥" bg={C.mint} value={memberCount} label="Members" />
                <StatCard icon="✨" bg={C.pink} value={newMemberCount} label="New members (30 days)" />
                <StatCard icon="👫" bg={C.lilac} value={groupCount} label="Groups" />
                <StatCard icon="⛪" bg={C.peach} value={ministries.length} label="Ministries" />
              </div>

              {/* Quick access */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.textDark }}>Quick Access</h2>
                <span style={{ fontSize: '11.5px', color: C.textMuted }}>Jump straight into a section</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {tiles.map(t => (
                  <button
                    key={t.label}
                    onClick={() => router.push(t.href)}
                    style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', textAlign: 'left', cursor: 'pointer', boxShadow: CHURCH_UI.shadow, display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'inherit' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>{t.icon}</div>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: t.live ? CHURCH_UI.green : CHURCH_UI.cream, color: t.live ? '#3E6B2F' : CHURCH_UI.goldText }}>
                        {t.live ? 'Live' : 'Soon'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.textDark }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted, lineHeight: 1.4 }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* Ministries overview */}
              <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.textDark }}>Ministries Overview</h2>
                  <button onClick={() => router.push(`${base}/ministries`)} style={{ border: 'none', background: 'none', color: CHURCH_UI.goldText, fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    View all ministries &rarr;
                  </button>
                </div>
                {topMinistries.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>
                    No ministries yet. Create your first one from the Ministries page.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {topMinistries.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '150px', fontSize: '12.5px', fontWeight: 600, color: C.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                        <div style={{ flex: 1, height: '10px', borderRadius: '999px', background: CHURCH_UI.cream, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((m.memberCount / maxMinistryMembers) * 100)}%`, height: '10px', borderRadius: '999px', background: i % 2 === 0 ? '#CFE6B0' : '#F6C6CC' }} />
                        </div>
                        <div style={{ width: '84px', textAlign: 'right', fontSize: '11.5px', color: C.textMuted }}>
                          {m.memberCount} member{m.memberCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right rail */}
            <div style={{ flex: '0 1 290px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => router.push(`/dashboard/church/add-member?churchId=${churchId}`)}
                style={{ width: '100%', boxSizing: 'border-box', border: 'none', background: theme.grad, color: C.textDark, borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + Add Member
              </button>

              <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.textDark, marginBottom: '8px' }}>Upcoming Events</div>
                <p style={{ margin: '0 0 10px', fontSize: '12px', color: C.textMuted, lineHeight: 1.5 }}>
                  Events &amp; Calendar is coming soon. Your services and events will show up here.
                </p>
                <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: CHURCH_UI.cream, color: CHURCH_UI.goldText }}>Soon</span>
              </div>

              <div style={{ background: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.textDark }}>Newest Members</div>
                  <button onClick={() => router.push(`${base}/members`)} style={{ border: 'none', background: 'none', color: CHURCH_UI.goldText, fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    View all
                  </button>
                </div>
                {recentMembers.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: C.textMuted }}>No members yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentMembers.map((m, i) => (
                      <div key={m.id} style={{ display: 'flex', gap: '9px', alignItems: 'center' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: [C.mint, C.pink, C.lilac, C.peach][i % 4], flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: C.textDark }}>
                          {initialsOf(m.fullName)}
                        </div>
                        <div style={{ fontSize: '11.5px', color: C.text, lineHeight: 1.4, minWidth: 0 }}>
                          <strong style={{ color: C.textDark }}>{m.fullName}</strong> joined as {m.role}
                          <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '1px' }}>{timeAgo(m.createdAtMs)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '11px', color: C.textMuted, marginTop: '34px' }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, bg, value, label }: { icon: string; bg: string; value: number; label: string }) {
  return (
    <div style={{ background: C.card, borderRadius: '16px', padding: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: CHURCH_UI.shadow }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '21px', fontWeight: 800, color: C.textDark, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '11.5px', color: C.textMuted }}>{label}</div>
      </div>
    </div>
  );
}
