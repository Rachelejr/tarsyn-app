'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import { getOrganizerPlanTier, getPlanLimits } from '@/lib/planLimits';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38',
  or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', blanc: '#FFFFFF',
  text: '#3A2F1F', muted: '#8A7B6C', border: '#F0E4D6',
};

interface AuditEntry {
  id: string;
  action: string;
  category: string;
  user: string;
  details: string;
  createdAt?: { seconds: number };
  groupId?: string;
}

const CATEGORIES = ['All', 'Payment', 'Member', 'Group', 'Auth', 'Document', 'System'];

const categoryColor = (cat: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    Payment: { bg: '#d1fae5', color: '#065f46' },
    Member: { bg: '#dbeafe', color: '#1e40af' },
    Group: { bg: C.creme, color: '#92400e' },
    Auth: { bg: '#f3f4f6', color: '#374151' },
    Document: { bg: '#fef3c7', color: '#92400e' },
    System: { bg: '#f3e0e5', color: '#7B2D42' },
  };
  return map[cat] || { bg: '#f3f4f6', color: '#6b7280' };
};

function AuditLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId') || '';
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [canExport, setCanExport] = useState(true);
  const [showCount, setShowCount] = useState('25');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const tier = await getOrganizerPlanTier(db, user.uid);
        setCanExport(getPlanLimits(tier).exportTools);
      } catch (e) { console.error(e); }
      try {
        const q = query(
          collection(db, 'audit_logs'),
          where('organizerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditEntry)));
      } catch (e) {
        console.error(e);
        setEntries([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
      <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '60px', width: 'auto' }} />
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #EAD9BE', borderTopColor: C.bordeaux, animation: 'UNIMUNITY-spin 0.8s linear infinite' }} />
    </div>
  );

  const filtered = entries.filter(e => {
    if (category !== 'All' && e.category !== category) return false;
    if (search && !e.action?.toLowerCase().includes(search.toLowerCase()) && !e.user?.toLowerCase().includes(search.toLowerCase()) && !e.details?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    if (!canExport) {
      alert('Export tools (CSV) are available starting with the Pro plan. Upgrade your plan to unlock exports.');
      return;
    }
    const rows = [['Date', 'Category', 'Action', 'User', 'Details']];
    filtered.forEach(e => rows.push([
      e.createdAt ? new Date(e.createdAt.seconds * 1000).toLocaleString() : '',
      e.category || '', e.action || '', e.user || '', e.details || ''
    ]));
    const csv = rows.map(r => r.map(v => '"' + v + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'audit-log.csv'; a.click();
  };

  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid #F0E4D6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const fieldStyle = { padding: '7px 11px', borderRadius: 10, border: '1.5px solid #EAD9BE', fontSize: 13, color: C.text, background: '#FFFDF9', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif' };
  const smallLabel = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8 };
  const visible = showCount === 'all' ? filtered : filtered.slice(0, parseInt(showCount));
  const countCat = (c: string) => entries.filter(e => e.category === c).length;
  // Fixed categories first, then any other category found in the log (e.g. "Church Member").
  const categoryOptions = Array.from(new Set([...CATEGORIES, ...entries.map(e => e.category).filter(Boolean)]));
  const kpis = [
    { label: 'Total Events', value: entries.length, top: '#E9C77B' },
    { label: 'Payments', value: countCat('Payment'), top: '#66BB6A' },
    { label: 'Members', value: countCat('Member'), top: '#64B5F6' },
    { label: 'Documents', value: countCat('Document'), top: '#F4B6C7' },
    { label: 'Auth Events', value: countCat('Auth'), top: '#B39DDB' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 900px) { .al-kpis { grid-template-columns: repeat(2, 1fr) !important; } }
        .al-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .al-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .al-head { display: flex; align-items: center; gap: 11px; }
        .al-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .al-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .al-form input:focus, .al-form select:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .al-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .al-back:hover { background: #FBEEDD; }
        .al-tr:hover td { background: #FFFBF5 !important; }
        .al-pill { transition: all .15s ease; cursor: pointer; }
        .al-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .al-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
      `}</style>
      <div style={{ flex: 1 }}>

      <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Audit Log</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Complete traceability of all actions.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="al-form" style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard' + (groupId ? '?groupId=' + groupId : ''))} className="al-back">Back to Dashboard</button>
        </div>

        <div className="al-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
          {kpis.map(k => (
            <div key={k.label} style={{ ...cardStyle, borderTop: '3px solid ' + k.top, padding: '11px 16px' }}>
              <p style={{ ...smallLabel, margin: '0 0 3px' }}>{k.label}</p>
              <p style={{ fontSize: 21, fontWeight: 800, color: C.bordeauxDark, margin: 0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="al-card" style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
            <div className="al-head">
              <span className="al-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F4DC}'}</span>
              <h2 className="al-title">Event History <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>({filtered.length})</span></h2>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Show:</span>
              <select value={showCount} onChange={e => setShowCount(e.target.value)} style={{ ...fieldStyle, padding: '4px 8px', fontSize: 12.5 }}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="all">All</option>
              </select>
              <button onClick={exportCSV} className="al-btn"
                style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: C.blanc, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(107,45,78,0.22)' }}>
                {canExport ? '\u{1F4E5} ' : '\u{1F512} '}Export CSV
              </button>
            </div>
          </div>

          <div style={{ padding: '10px 20px', borderBottom: '1px solid #F3E6D8', background: '#FFFCF7', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} placeholder="Search actions, users, details..."
              style={{ ...fieldStyle, flex: 1, minWidth: 200 }} />
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ ...fieldStyle, minWidth: 190, cursor: 'pointer', fontWeight: 600 }}>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All categories (' + entries.length + ')' : cat + ' (' + countCat(cat) + ')'}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center' as const }}>
              <p style={{ fontSize: 15, color: C.text, fontWeight: 700, margin: '0 0 6px' }}>{entries.length === 0 ? 'No audit events yet' : 'No events match your filters'}</p>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{entries.length === 0 ? 'Actions like payments, member changes, and logins will appear here automatically.' : 'Try another category or search term.'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
                    {['#', 'Date & Time', 'Category', 'Action', 'User', 'Details'].map(h => (
                      <th key={h} style={{ padding: '9px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#FBEEDD', textTransform: 'uppercase' as const, letterSpacing: 0.6, whiteSpace: 'nowrap' as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e, i) => {
                    const cc = categoryColor(e.category);
                    const bg = i % 2 ? '#FFFDF9' : C.blanc;
                    const td = { padding: '9px 16px', borderBottom: '1px solid #F7EEE3', background: bg };
                    return (
                      <tr key={e.id} className="al-tr">
                        <td style={{ ...td, fontSize: 12, color: C.muted, width: 36 }}>{i + 1}</td>
                        <td style={{ ...td, fontSize: 12, fontWeight: 700, color: C.bordeaux, whiteSpace: 'nowrap' as const }}>
                          {e.createdAt ? new Date(e.createdAt.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cc.bg, color: cc.color, whiteSpace: 'nowrap' as const }}>{e.category || '-'}</span>
                        </td>
                        <td style={{ ...td, fontSize: 13, fontWeight: 700, color: C.text }}>{e.action || '-'}</td>
                        <td style={{ ...td, fontSize: 12, color: C.muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={e.user || ''}>{e.user || '-'}</td>
                        <td style={{ ...td, fontSize: 12, color: C.muted, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={e.details || ''}>{e.details || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visible.length < filtered.length && (
                <div style={{ padding: '10px 20px', textAlign: 'center' as const, fontSize: 12, color: C.muted }}>
                  Showing {visible.length} of {filtered.length}.{' '}
                  <span onClick={() => setShowCount('all')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Show all</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      </div>
      <Footer />
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <AuditLogContent />
    </Suspense>
  );
}
