'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#1a1a1a',
  muted: '#6b7280',
  border: '#e5e7eb',
};

const labelStyle = { fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, display: 'block', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid ' + C.border,
  fontSize: 14, color: C.text, background: C.blanc, outline: 'none', boxSizing: 'border-box' as const,
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

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>

      <div style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        rowGap: '10px',
      }}>
        <div>
          <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '40px', width: 'auto', display: 'block' }} />
          <div style={{ color: '#C4748E', fontSize: '9px', letterSpacing: '2px', fontStyle: 'italic', marginTop: '2px' }}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <DateTimeWeather textColor="rgba(251,238,221,0.85)" />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>

        <div style={{ marginBottom: 20 }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: 0 }}>
            Back to Dashboard
          </button>
        </div>

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Referral Commissions</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '6px 0 0', maxWidth: 640, lineHeight: 1.6 }}>
            Members who bring in new members earn a commission based on their total number of referrals:
            10 referrals = 5%, 15 referrals = 4.5%, 16 or more = 3.5%.
          </p>
        </div>

        <div style={{ background: C.blanc, borderRadius: 16, padding: '24px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.or, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 18px', paddingBottom: 12, borderBottom: '1px solid ' + C.border }}>
            Record a Referral
          </h2>
          {members.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No members yet - add members first from the Add Member page.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Member</label>
                  <select style={inputStyle} value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                    <option value="">Choose a member...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{nameOf(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Was Referred By</label>
                  <select style={inputStyle} value={selectedReferrerId} onChange={e => setSelectedReferrerId(e.target.value)}>
                    <option value="">None / Direct signup</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{nameOf(m)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {referralError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginTop: 14 }}>
                  {referralError}
                </div>
              )}
              <button onClick={saveReferral} disabled={savingReferral}
                style={{ marginTop: 16, background: C.bordeaux, color: 'white', border: 'none', padding: '11px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: savingReferral ? 'not-allowed' : 'pointer', opacity: savingReferral ? 0.7 : 1 }}>
                {savingReferral ? 'Saving...' : referralSaved ? 'Saved!' : 'Save Referral'}
              </button>
            </>
          )}
        </div>

        <div style={{ background: C.blanc, borderRadius: 16, border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {rows.length === 0 ? (
            <p style={{ padding: 24, fontSize: 13, color: C.muted, margin: 0 }}>
              No referrals recorded yet.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid ' + C.creme }}>
                  {['Member', 'Referrals', 'Commission Rate'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 20px', color: C.or, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const rate = referralRate(r.referralCount);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid ' + C.creme }}>
                      <td style={{ padding: '12px 20px', color: C.text, fontWeight: 600, fontSize: 13 }}>{r.name}</td>
                      <td style={{ padding: '12px 20px', color: C.text, fontSize: 13 }}>{r.referralCount}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13 }}>
                        {rate > 0 ? (
                          <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>{rate}%</span>
                        ) : (
                          <span style={{ color: C.muted }}>Not yet eligible (10+ needed)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 40, letterSpacing: 0.3 }}>
          Powered by UNIMUNITYTM - A product of Ma Production Luxenn Zara LLC - (c) 2026 All Rights Reserved - v1.0.0
        </p>
      </div>
    </div>
  );
}
