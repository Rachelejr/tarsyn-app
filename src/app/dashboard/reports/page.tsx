'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import { getOrganizerPlanTier, getPlanLimits, PlanTier } from '@/lib/planLimits';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38',
  or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', blanc: '#FFFFFF',
  text: '#3A2F1F', muted: '#8A7B6C', border: '#F0E4D6',
};

interface Contribution { id: string; memberName: string; amount: number; method?: string; date?: string; status: string; receiptNumber?: string; memberId?: string; }
interface Member { id: string; fullName: string; status: string; groupId?: string; }
interface Group { id: string; name: string; amountPerMember?: number; contribution?: number; weeklyAmount?: number; contributionSettings?: { amount?: number }; }

// Same fallback chain used elsewhere in the app (e.g. add-member) so the
// expected total is calculated consistently no matter which field a given
// group actually stores its contribution amount under.
function getGroupContributionAmount(group: any): number {
  if (!group) return 0;
  const amount =
    group?.contributionSettings?.amount ??
    group?.contribution ??
    group?.amountPerMember ??
    group?.weeklyAmount ??
    0;
  return typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
}

// Sentinel groupId value selecting the combined "All Groups" view, only
// offered to organizers on the Business/Enterprise ("Advanced administration")
// tier - see hasAdvancedAdmin below.
const ALL_GROUPS = '__all__';

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get('groupId') || '';

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupId, setGroupId] = useState(urlGroupId);

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [memberShow, setMemberShow] = useState('10');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setGroupsLoading(false); return; }
      try {
        const tier = await getOrganizerPlanTier(db, u.uid);
        setPlanTier(tier);
        const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
        const gsnap = await getDocs(gq);
        const groupList = gsnap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
        setGroups(groupList);
        if (!urlGroupId && groupList.length === 1) {
          setGroupId(groupList[0].id);
        }
      } catch (e) { console.error(e); }
      setGroupsLoading(false);
    });
    return () => unsub();
  }, [urlGroupId]);

  // "Advanced reports" (per-member breakdown, CSV export) unlocks from the
  // Pro plan up; "Advanced administration" (combined all-groups view,
  // per-method breakdown) is reserved for Business/Enterprise, matching the
  // Compare Plans table's Reports row.
  const hasAdvancedReports = planTier === 'growth' || planTier === 'pro' || planTier === 'enterprise';
  const hasAdvancedAdmin = planTier === 'pro' || planTier === 'enterprise';
  const canExport = getPlanLimits(planTier).exportTools;
  const reportLevelLabel = hasAdvancedAdmin ? 'Advanced administration' : hasAdvancedReports ? 'Advanced reports' : 'Basic reports';

  useEffect(() => {
    if (!groupId) return;
    const fetchData = async () => {
      const user = auth.currentUser; if (!user) return;
      setLoading(true);
      try {
        const mq = groupId === ALL_GROUPS
          ? query(collection(db, 'members'), where('organizerId', '==', user.uid))
          : query(collection(db, 'members'), where('groupId', '==', groupId));
        const mSnap = await getDocs(mq);
        const memberList = mSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
        setMembers(memberList);
        const memberIds = new Set(memberList.map(m => m.id));

        const pSnap = await getDocs(query(collection(db, 'payments'), where('organizerId', '==', user.uid)));
        const groupPayments = pSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(p => memberIds.has(p.memberId))
          .map(p => ({
            id: p.id, memberName: p.memberName || '', amount: p.amount || 0,
            method: p.method || '', date: p.paymentDate || '', status: p.status || 'pending',
            receiptNumber: p.receiptNumber || '', memberId: p.memberId,
          } as Contribution));
        setContributions(groupPayments);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchData();
  }, [groupId]);

  if (!mounted || groupsLoading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
      <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '60px', width: 'auto' }} />
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #EAD9BE', borderTopColor: C.bordeaux, animation: 'UNIMUNITY-spin 0.8s linear infinite' }} />
    </div>
  );

  const now = new Date();
  const filtered = contributions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (period === 'all') return true;
    if (!c.date) return false;
    const d = new Date(c.date);
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'quarter') return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalCollected = filtered.filter(c => c.status === 'confirmed').reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = filtered.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
  const confirmedCount = filtered.filter(c => c.status === 'confirmed').length;
  const pendingCount = filtered.filter(c => c.status === 'pending').length;
  const currentGroup = groups.find(g => g.id === groupId);
  const expectedTotal = groupId === ALL_GROUPS
    ? groups.reduce((sum, g) => sum + members.filter(m => m.groupId === g.id).length * getGroupContributionAmount(g), 0)
    : members.length * getGroupContributionAmount(currentGroup);

  // "By Member" breakdown - part of Advanced reports (Pro plan and up).
  const byMember = Object.values(
    filtered.reduce((acc: Record<string, { memberId: string; name: string; collected: number; count: number }>, c) => {
      const key = c.memberId || c.memberName;
      if (!acc[key]) acc[key] = { memberId: key, name: c.memberName || 'Unknown', collected: 0, count: 0 };
      if (c.status === 'confirmed') { acc[key].collected += c.amount || 0; acc[key].count += 1; }
      return acc;
    }, {})
  ).sort((a, b) => b.collected - a.collected);

  // "By Payment Method" breakdown - part of Advanced administration (Business/Enterprise).
  const byMethod = Object.values(
    filtered.filter(c => c.status === 'confirmed').reduce((acc: Record<string, { method: string; total: number; count: number }>, c) => {
      const key = c.method || 'Unspecified';
      if (!acc[key]) acc[key] = { method: key, total: 0, count: 0 };
      acc[key].total += c.amount || 0; acc[key].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const exportCSV = () => {
    if (!canExport) {
      alert('Export tools (CSV) are available starting with the Pro plan. Upgrade your plan to unlock exports.');
      return;
    }
    const rows = [['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Status']];
    filtered.forEach(c => rows.push([c.receiptNumber || '', c.memberName, String(c.amount), c.method || '', c.date || '', c.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'UNIMUNITY-report.csv'; a.click();
  };

  const inputStyle = {
    padding: '7px 11px', borderRadius: 10, border: '1.5px solid #EAD9BE', fontSize: 13.5, color: C.text,
    background: '#FFFDF9', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif', cursor: 'pointer',
  };
  const smallLabel = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8 };
  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };

  const periodLabel: Record<string, string> = { all: 'All time', month: 'This month', quarter: 'This quarter', year: 'This year' };
  const statusLabel: Record<string, string> = { all: 'All', confirmed: 'Confirmed', pending: 'Pending' };
  const groupLabel = groupId === ALL_GROUPS ? 'All Groups (Combined)' : (currentGroup?.name || 'No group selected');
  const visibleMembers = memberShow === 'all' ? byMember : byMember.slice(0, parseInt(memberShow));

  const kpis = [
    { label: 'Collected', value: '$' + totalCollected.toFixed(2), sub: confirmedCount + ' confirmed', top: '#E9C77B', color: C.bordeauxDark },
    { label: 'Pending', value: '$' + totalPending.toFixed(2), sub: pendingCount + ' payment' + (pendingCount === 1 ? '' : 's'), top: '#E8A45C', color: '#92400e' },
    { label: 'Confirmed', value: String(confirmedCount), sub: 'payments', top: '#66BB6A', color: '#065f46' },
    { label: 'Expected', value: '$' + expectedTotal.toFixed(2), sub: 'per round, ' + members.length + ' member' + (members.length === 1 ? '' : 's'), top: '#B39DDB', color: C.text },
  ];

  const LockedCard = ({ title, plan }: { title: string; plan: string }) => (
    <div className="rp-card" style={{ ...cardStyle, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.85 }}>
      <span className="rp-ico" style={{ background: '#EFE6DA', boxShadow: 'none' }}>{'\u{1F512}'}</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#4A1F38' }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Available from the {plan} plan.</p>
      </div>
      <button onClick={() => router.push('/dashboard/subscription')}
        style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 10, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
        Upgrade
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 900px) {
          .rp-grid { grid-template-columns: 1fr !important; }
          .rp-kpis { grid-template-columns: repeat(2, 1fr) !important; }
        }
        .rp-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .rp-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .rp-head { display: flex; align-items: center; gap: 11px; }
        .rp-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .rp-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .rp-form select { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .rp-form select:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .rp-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .rp-back:hover { background: #FBEEDD; }
        .rp-tr:hover td { background: #FFFBF5 !important; }
        .rp-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .rp-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
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
        @media print {
          .rp-no-print { display: none !important; }
          .rp-grid { grid-template-columns: 1fr !important; }
          .rp-card { box-shadow: none !important; }
        }
      `}</style>
      <div style={{ flex: 1 }}>

      <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Reports Center</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Financial reports and exports for your groups.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="rp-form" style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div className="rp-no-print" style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard' + (groupId ? '?groupId=' + groupId : ''))} className="rp-back">Back to Dashboard</button>
        </div>

        <div className="rp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

            {/* Group + filters toolbar */}
            <div className="rp-card rp-no-print" style={{ ...cardStyle, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
              <div className="rp-head" style={{ flexShrink: 0 }}>
                <span className="rp-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F4CA}'}</span>
                <h2 className="rp-title">Group</h2>
              </div>
              {groups.length === 0 ? (
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  You have no groups yet.{' '}
                  <span onClick={() => router.push('/dashboard/create-tontine')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Create a group first</span>
                </p>
              ) : (
                <>
                  <select style={{ ...inputStyle, flex: 1, minWidth: 180 }} value={groupId} onChange={e => setGroupId(e.target.value)}>
                    <option value="">Choose a group...</option>
                    {hasAdvancedAdmin && groups.length > 1 && <option value={ALL_GROUPS}>All Groups (Combined)</option>}
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <select style={inputStyle} value={period} onChange={e => setPeriod(e.target.value)} disabled={!groupId} title="Period">
                    <option value="all">All time</option>
                    <option value="month">This month</option>
                    <option value="quarter">This quarter</option>
                    <option value="year">This year</option>
                  </select>
                  <select style={inputStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} disabled={!groupId} title="Status">
                    <option value="all">All statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                  </select>
                </>
              )}
            </div>

            {!groupId ? (
              groups.length > 0 && (
                <div className="rp-card" style={{ ...cardStyle, padding: '40px', textAlign: 'center' as const }}>
                  <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Select a group above to view its reports.</p>
                </div>
              )
            ) : loading ? (
              <div className="rp-card" style={{ ...cardStyle, padding: '40px', textAlign: 'center' as const }}>
                <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Loading reports...</p>
              </div>
            ) : (
              <>
                {/* KPI cards */}
                <div className="rp-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {kpis.map(k => (
                    <div key={k.label} style={{ ...cardStyle, borderTop: '3px solid ' + k.top, padding: '12px 16px' }}>
                      <p style={{ ...smallLabel, margin: '0 0 4px' }}>{k.label}</p>
                      <p style={{ fontSize: 21, fontWeight: 800, color: k.color, margin: 0, letterSpacing: -0.4 }}>{k.value}</p>
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* By member */}
                {hasAdvancedReports ? (
                  <div className="rp-card" style={{ ...cardStyle, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="rp-head">
                        <span className="rp-ico" style={{ background: 'linear-gradient(135deg,#FCE4EC,#F4B6C7)' }}>{'\u{1F465}'}</span>
                        <h2 className="rp-title">Breakdown by Member <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>({byMember.length})</span></h2>
                      </div>
                      {byMember.length > 5 && (
                        <div className="rp-no-print" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Show:</span>
                          <select value={memberShow} onChange={e => setMemberShow(e.target.value)} style={{ ...inputStyle, padding: '5px 9px', fontSize: 12.5 }}>
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="all">All</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {byMember.length === 0 ? (
                      <p style={{ fontSize: 13, color: C.muted, margin: 0, padding: '24px 20px', textAlign: 'center' as const }}>No contributions in this period.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' as const }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
                              {['#', 'Member', 'Confirmed Payments', 'Total Collected'].map(h => (
                                <th key={h} style={{ padding: '9px 16px', textAlign: (h === 'Member' || h === '#') ? 'left' as const : 'right' as const, fontSize: 11, fontWeight: 700, color: '#FBEEDD', textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visibleMembers.map((m, i) => (
                              <tr key={m.memberId} className="rp-tr">
                                <td style={{ padding: '9px 16px', fontSize: 12.5, color: C.muted, borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : C.blanc, width: 40 }}>{i + 1}</td>
                                <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 700, color: C.text, borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : C.blanc }}>
                                  <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: '#F6E3C4', color: C.bordeauxDark, fontSize: 11, fontWeight: 800, alignItems: 'center', justifyContent: 'center', marginRight: 10, verticalAlign: 'middle' }}>{(m.name || '?').trim().charAt(0).toUpperCase()}</span>
                                  {m.name}
                                </td>
                                <td style={{ padding: '9px 16px', fontSize: 13, color: C.muted, textAlign: 'right' as const, borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : C.blanc }}>{m.count}</td>
                                <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 800, color: C.bordeaux, textAlign: 'right' as const, borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : C.blanc }}>${m.collected.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {visibleMembers.length < byMember.length && (
                          <div className="rp-no-print" style={{ padding: '10px 20px', textAlign: 'center' as const, fontSize: 12, color: C.muted }}>
                            Showing {visibleMembers.length} of {byMember.length}.{' '}
                            <span onClick={() => setMemberShow('all')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Show all</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rp-no-print"><LockedCard title="Breakdown by Member" plan="Pro" /></div>
                )}

                {/* By method */}
                {hasAdvancedAdmin ? (
                  <div className="rp-card" style={{ ...cardStyle, padding: '14px 20px' }}>
                    <div className="rp-head" style={{ marginBottom: 12 }}>
                      <span className="rp-ico" style={{ background: 'linear-gradient(135deg,#66BB6A,#2E7D32)' }}>{'\u{1F4B3}'}</span>
                      <h2 className="rp-title">Breakdown by Payment Method</h2>
                    </div>
                    {byMethod.length === 0 ? (
                      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No confirmed payments in this period.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                        {byMethod.map(m => {
                          const share = totalCollected > 0 ? Math.round((m.total / totalCollected) * 100) : 0;
                          return (
                            <div key={m.method} style={{ background: C.creme, borderRadius: 12, padding: '10px 14px', border: '1px solid ' + C.orLight }}>
                              <p style={{ fontSize: 11, color: C.muted, textTransform: 'capitalize' as const, margin: '0 0 3px', fontWeight: 700 }}>{m.method}</p>
                              <p style={{ fontSize: 16, fontWeight: 800, color: C.bordeauxDark, margin: 0 }}>${m.total.toFixed(2)}</p>
                              <p style={{ fontSize: 10.5, color: C.muted, margin: '2px 0 6px' }}>{m.count} payment{m.count === 1 ? '' : 's'} · {share}%</p>
                              <div style={{ height: 4, background: '#EFE2CC', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: share + '%', height: '100%', background: 'linear-gradient(90deg,#E9C77B,#6B2D4E)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rp-no-print"><LockedCard title="Breakdown by Payment Method" plan="Business" /></div>
                )}
              </>
            )}
          </div>

          {/* Right column - summary + actions */}
          <div className="rp-card rp-no-print" style={{ ...cardStyle, padding: '22px', position: 'sticky' as const, top: 24 }}>
            <div style={{ textAlign: 'center' as const, margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '16px 16px 0 0', borderBottom: '1px solid ' + C.border }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{groupLabel}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase' as const, letterSpacing: 1.2 }}>Report Summary</p>
            </div>
            {[
              { label: 'Period', value: periodLabel[period] || period },
              { label: 'Status', value: statusLabel[statusFilter] || statusFilter },
              { label: 'Members', value: groupId ? String(members.length) : '-' },
              { label: 'Payments shown', value: groupId ? String(filtered.length) : '-' },
              { label: 'Confirmed', value: groupId ? String(confirmedCount) : '-', color: '#065f46' },
              { label: 'Pending', value: groupId ? String(pendingCount) : '-', color: '#92400e' },
              { label: 'Collected', value: groupId ? '$' + totalCollected.toFixed(2) : '-', color: C.bordeaux },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color || C.text }}>{item.value}</span>
              </div>
            ))}

            <div
              onClick={planTier !== 'enterprise' ? () => router.push('/dashboard/subscription') : undefined}
              title={planTier !== 'enterprise' ? 'See plans and upgrade' : undefined}
              style={{ marginTop: 14, padding: '10px 12px', background: 'linear-gradient(135deg,#FBEEDD,#F6E3C4)', borderRadius: 12, border: '1px solid ' + C.orLight, textAlign: 'center' as const, cursor: planTier !== 'enterprise' ? 'pointer' : 'default' }}>
              <p style={{ fontSize: 10.5, color: '#A08B7D', margin: 0, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Report Level</p>
              <p style={{ fontSize: 13.5, color: '#4A1F38', margin: '2px 0 0', fontWeight: 800 }}>{reportLevelLabel}</p>
              {planTier !== 'enterprise' && (
                <p style={{ fontSize: 11.5, color: C.bordeaux, margin: '3px 0 0', fontWeight: 800, textDecoration: 'underline' }}>Upgrade &rarr;</p>
              )}
            </div>

            <button onClick={exportCSV} disabled={!groupId} className="rp-btn"
              style={{ width: '100%', marginTop: 14, padding: '11px', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: C.blanc, border: 'none', borderRadius: 14, fontSize: 14.5, fontWeight: 800, letterSpacing: 0.3, cursor: groupId ? 'pointer' : 'not-allowed', opacity: groupId ? 1 : 0.55, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
              {canExport ? '\u{1F4E5}  Export CSV' : '\u{1F512}  Export CSV'}
            </button>
            <button onClick={() => window.print()} disabled={!groupId} className="rp-btn"
              style={{ width: '100%', marginTop: 8, padding: '10px', background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: groupId ? 'pointer' : 'not-allowed', opacity: groupId ? 1 : 0.55 }}>
              {'\u{1F5A8}\uFE0F'}  Print
            </button>
          </div>
        </div>

      </div>

      </div>
      <div className="rp-no-print"><Footer /></div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
