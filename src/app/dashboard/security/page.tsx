'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
  green: '#2E7D32',
  greenBg: '#E8F5E9',
  red: '#C62828',
};

export default function SecurityCenterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [revokeMsg, setRevokeMsg] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      try {
        const q = query(
          collection(db, 'login_history'),
          where('userId', '==', u.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 20));
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const formatDate = (ts: any) => {
    if (!ts?.seconds) return '-';
    return new Date(ts.seconds * 1000).toLocaleDateString() + ' at ' +
      new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRevokeAll = async () => {
    if (!user) return;
    if (!confirm('This will sign you out of all devices, including this one. You will need to sign in again. Continue?')) return;
    setRevoking(true);
    setRevokeMsg('');
    try {
      const res = await fetch('/api/revoke-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        await auth.signOut();
        router.push('/login');
      } else {
        setRevokeMsg('Could not sign out of all devices. Please try again.');
      }
    } catch (e) {
      setRevokeMsg('Could not sign out of all devices. Please try again.');
    }
    setRevoking(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.bordeaux, fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: C.bordeauxDark, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: C.or, cursor: 'pointer', fontSize: '20px' }}>&lt;-</button>
          <h1 style={{ color: C.orLight, fontSize: '18px', fontWeight: 700, margin: 0 }}>Security Center</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <DateTimeWeather textColor="rgba(255,255,255,0.85)" />
          <button onClick={() => auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: C.or, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Two-Factor Authentication</h2>
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>Every sign-in requires a 6-digit code sent to your email.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.greenBg, color: C.green, padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}>
            Enabled (Email verification)
          </div>
        </div>

        <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Active Session</h2>
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>
            If you no longer recognize a device in your history, you can sign out everywhere at once.
          </p>
          <button onClick={handleRevokeAll} disabled={revoking}
            style={{ background: 'transparent', color: C.red, border: '1.5px solid ' + C.red, padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: revoking ? 'not-allowed' : 'pointer', opacity: revoking ? 0.6 : 1 }}>
            {revoking ? 'Signing out everywhere...' : 'Sign out of all devices'}
          </button>
          {revokeMsg && <p style={{ color: C.red, fontSize: '12px', marginTop: '10px' }}>{revokeMsg}</p>}
        </div>

        <div style={{ background: C.blanc, borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 800, margin: '0 0 4px' }}>Connection History</h2>
          <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>Last 20 sign-ins to your account.</p>

          {history.length === 0 ? (
            <p style={{ color: C.muted, fontSize: '13px' }}>No history recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((h) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.creme, borderRadius: '10px' }}>
                  <div>
                    <p style={{ color: C.text, fontSize: '13px', fontWeight: 700, margin: 0 }}>{h.action || 'Signed in'}</p>
                    <p style={{ color: C.muted, fontSize: '11.5px', margin: '2px 0 0' }}>{h.device || 'Unknown device'}</p>
                  </div>
                  <span style={{ color: C.muted, fontSize: '12px' }}>{formatDate(h.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
