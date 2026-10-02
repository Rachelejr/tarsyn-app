'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#3A2F1F',
  muted: '#8A7B6C',
  border: '#F0E4D6',
};

const labelStyle = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8, display: 'block', marginBottom: 4 };
const inputStyle = {
  width: '100%', padding: '7px 11px', borderRadius: 10, border: '1.5px solid #EAD9BE',
  fontSize: 13.5, color: C.text, background: '#FFFDF9', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
};

// Referral Commission Program tiers (rate applies to the referring member's
// total referral count - note the rate decreases as the count climbs):
// 10 referrals = 5%, 15 referrals = 4.5%, 16+ referrals = 3.5%.
function referralRate(count: number): number {
  if (count >= 16) return 3.5;
  if (count >= 15) return 4.5;
  if (count >= 10) return 5;
  return 0;
}

function nameOf(m: any): string {
  return m?.fullName || ((m?.firstName || '') + ' ' + (m?.lastName || '')).trim() || 'Unnamed';
}

export default function ReferralsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);

  // This form is intentionally separate from Add Member - referrals are
  // recorded independently, any time after a member already exists, not
  // only at the moment they're created.
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedReferrerId, setSelectedReferrerId] = useState('');
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralSaved, setReferralSaved] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [showCount, setShowCount] = useState('10');

  const loadMembers = async (uid: string) => {
    const q = query(collection(db, 'members'), where('organizerId', '==', uid));
    const snap = await getDocs(q);
    setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        await loadMembers(u.uid);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const counts: Record<string, number> = {};
  members.forEach(m => {
    if (m.referredBy) counts[m.referredBy] = (counts[m.referredBy] || 0) + 1;
  });

  const rows = members
    .map(m => ({ id: m.id, name: nameOf(m), referralCount: counts[m.id] || 0 }))
    .filter(m => m.referralCount > 0)
    .sort((a, b) => b.referralCount - a.referralCount);

  const saveReferral = async () => {
    setReferralError('');
    if (!selectedMemberId) { setReferralError('Choose a member first.'); return; }
    if (selectedReferrerId === selectedMemberId) { setReferralError('A member cannot refer themself.'); return; }
    setSavingReferral(true);
    try {
      const referrer = members.find(m => m.id === selectedReferrerId);
      const referredByName = referrer ? nameOf(referrer) : '';
      await updateDoc(doc(db, 'members', selectedMemberId), {
        referredBy: selectedReferrerId || '',
        referredByName,
      });
      setMembers(prev => prev.map(m => m.id === selectedMemberId ? { ...m, referredBy: selectedReferrerId, referredByName } : m));
      setReferralSaved(true);
      setSelectedMemberId('');
      setSelectedReferrerId('');
      setTimeout(() => setReferralSaved(false), 3000);
    } catch (e) {
      console.error(e);
      setReferralError('Could not save. Please try again.');
    }
    setSavingReferral(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.muted }}>Loading...</p>
      </div>
    );
  }

  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid #F0E4D6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const totalReferrals = Object.values(counts).reduce((s, n) => s + n, 0);
  const eligibleCount = rows.filter(r => referralRate(r.referralCount) > 0).length;
  const visibleRows = showCount === 'all' ? rows : rows.slice(0, parseInt(showCount));
  const selectedMember = members.find(m => m.id === selectedMemberId);
  const currentReferrer = selectedMember?.referredBy ? members.find(m => m.id === selectedMember.referredBy) : null;
  const tiers = [
    { label: '10 referrals', rate: '5%' },
    { label: '15 referrals', rate: '4.5%' },
    { label: '16 or more', rate: '3.5%' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 900px) { .rf-grid { grid-template-columns: 1fr !important; } .rf-two { grid-template-columns: 1fr !important; } }
        .rf-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .rf-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .rf-head { display: flex; align-items: center; gap: 11px; }
        .rf-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .rf-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .rf-form select:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .rf-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .rf-back:hover { background: #FBEEDD; }
        .rf-tr:hover td { background: #FFFBF5 !important; }
        .rf-submit { transition: transform 0.15s ease, filter 0.15s ease; }
        .rf-submit:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
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
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Referral Commissions</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Members who bring in new members earn a commission.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="rf-form" style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="rf-back">Back to Dashboard</button>
        </div>

        <div className="rf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

            {/* Record a referral */}
            <div className="rf-card" style={{ ...cardStyle, padding: '16px 20px' }}>
              <div className="rf-head" style={{ marginBottom: 12, paddingBottom: 9, borderBottom: '1px solid #F3E6D8' }}>
                <span className="rf-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F91D}'}</span>
                <h2 className="rf-title">Record a Referral</h2>
              </div>
              {members.length === 0 ? (
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  No members yet.{' '}
                  <span onClick={() => router.push('/dashboard/add-member')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Add a member first</span>
                </p>
              ) : (
                <>
                  <div className="rf-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                    <div>
                      <label style={labelStyle}>Member</label>
                      <select style={inputStyle} value={selectedMemberId} onChange={e => { setSelectedMemberId(e.target.value); setReferralError(''); }}>
                        <option value="">Choose a member...</option>
                        {members.map(m => <option key={m.id} value={m.id}>{nameOf(m)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Was Referred By</label>
                      <select style={inputStyle} value={selectedReferrerId} onChange={e => { setSelectedReferrerId(e.target.value); setReferralError(''); }}>
                        <option value="">None / Direct signup</option>
                        {members.filter(m => m.id !== selectedMemberId).map(m => <option key={m.id} value={m.id}>{nameOf(m)}</option>)}
                      </select>
                    </div>
                    <button onClick={saveReferral} disabled={savingReferral} className="rf-submit"
                      style={{ background: referralSaved ? '#2E7D32' : 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: 'white', border: 'none', padding: '9px 20px', borderRadius: 12, fontSize: 13.5, fontWeight: 800, cursor: savingReferral ? 'not-allowed' : 'pointer', opacity: savingReferral ? 0.7 : 1, boxShadow: '0 6px 16px rgba(107,45,78,0.24)', whiteSpace: 'nowrap' as const }}>
                      {savingReferral ? 'Saving...' : referralSaved ? '\u2713 Saved' : 'Save Referral'}
                    </button>
                  </div>
                  {selectedMember && (
                    <p style={{ fontSize: 12, color: C.muted, margin: '10px 0 0' }}>
                      Currently: {currentReferrer ? <>referred by <strong style={{ color: C.bordeaux }}>{nameOf(currentReferrer)}</strong></> : <strong>direct signup</strong>}. Saving will replace this.
                    </p>
                  )}
                  {referralError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '9px 14px', color: '#DC2626', fontSize: 13, marginTop: 12 }}>
                      {referralError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Leaderboard */}
            <div className="rf-card" style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="rf-head">
                  <span className="rf-ico" style={{ background: 'linear-gradient(135deg,#FCE4EC,#F4B6C7)' }}>{'\u{1F3C6}'}</span>
                  <h2 className="rf-title">Top Referrers <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>({rows.length})</span></h2>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Show:</span>
                  <select value={showCount} onChange={e => setShowCount(e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: 12.5 }}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>
              {rows.length === 0 ? (
                <p style={{ padding: '30px 20px', fontSize: 13, color: C.muted, margin: 0, textAlign: 'center' as const }}>No referrals recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
                        {['#', 'Member', 'Referrals', 'Progress', 'Commission Rate'].map(h => (
                          <th key={h} style={{ textAlign: 'left' as const, padding: '9px 16px', color: '#FBEEDD', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r, i) => {
                        const rate = referralRate(r.referralCount);
                        const pct = Math.min(100, (r.referralCount / 10) * 100);
                        const td = { padding: '9px 16px', borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : C.blanc };
                        return (
                          <tr key={r.id} className="rf-tr">
                            <td style={{ ...td, fontSize: 12, color: C.muted, width: 36 }}>{i + 1}</td>
                            <td style={{ ...td, fontSize: 13, fontWeight: 700, color: C.text }}>
                              <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: '50%', background: '#F6E3C4', color: C.bordeauxDark, fontSize: 11, fontWeight: 800, alignItems: 'center', justifyContent: 'center', marginRight: 10, verticalAlign: 'middle' }}>{r.name.trim().charAt(0).toUpperCase()}</span>
                              {r.name}
                            </td>
                            <td style={{ ...td, fontSize: 13, fontWeight: 800, color: C.bordeaux }}>{r.referralCount}</td>
                            <td style={{ ...td, minWidth: 120 }}>
                              <div style={{ height: 6, background: '#EFE2CC', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: pct + '%', height: '100%', background: rate > 0 ? 'linear-gradient(90deg,#66BB6A,#2E7D32)' : 'linear-gradient(90deg,#E9C77B,#6B2D4E)' }} />
                              </div>
                              {rate === 0 && <p style={{ fontSize: 10.5, color: C.muted, margin: '3px 0 0' }}>{10 - r.referralCount} more to qualify</p>}
                            </td>
                            <td style={{ ...td, fontSize: 13 }}>
                              {rate > 0 ? (
                                <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 12 }}>{rate}%</span>
                              ) : (
                                <span style={{ color: C.muted, fontSize: 12 }}>Not yet eligible</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visibleRows.length < rows.length && (
                    <div style={{ padding: '10px 20px', textAlign: 'center' as const, fontSize: 12, color: C.muted }}>
                      Showing {visibleRows.length} of {rows.length}.{' '}
                      <span onClick={() => setShowCount('all')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Show all</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column - program summary */}
          <div className="rf-card" style={{ ...cardStyle, padding: '22px', position: 'sticky' as const, top: 24 }}>
            <div style={{ textAlign: 'center' as const, margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #F0E4D6' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>Referral Program</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase' as const, letterSpacing: 1.2 }}>Summary</p>
            </div>
            {[
              { label: 'Members', value: String(members.length) },
              { label: 'Total referrals', value: String(totalReferrals), color: C.bordeaux },
              { label: 'Active referrers', value: String(rows.length) },
              { label: 'Eligible for commission', value: String(eligibleCount), color: eligibleCount ? '#2E7D32' : undefined },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color || C.text }}>{item.value}</span>
              </div>
            ))}

            <p style={{ fontSize: 10.5, color: '#A08B7D', margin: '16px 0 6px', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>Commission Tiers</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {tiers.map(t => (
                <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'linear-gradient(135deg,#FBEEDD,#F6E3C4)', borderRadius: 10, border: '1px solid ' + C.orLight }}>
                  <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>{t.label}</span>
                  <span style={{ fontSize: 14, color: C.bordeauxDark, fontWeight: 800 }}>{t.rate}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: C.muted, margin: '10px 0 0', lineHeight: 1.5 }}>The rate is based on each member's total number of referrals. Fewer than 10 referrals earns no commission.</p>
          </div>
        </div>

      </div>

      </div>
      <Footer />
    </div>
  );
}
