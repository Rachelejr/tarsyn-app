'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
  const [showCount, setShowCount] = useState('10');

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

  // Turns a raw navigator.userAgent string into a short readable label like
  // "Chrome on Windows". If the stored value is already short (older entries
  // saved before this formatting existed, e.g. "Chrome on Windows" or
  // "Safari on macOS"), it's returned as-is instead of being re-parsed.
  const formatDevice = (device?: string) => {
    if (!device) return 'Unknown device';
    if (device.length < 60 && !device.includes('Mozilla')) return device;

    let browser = 'Unknown browser';
    if (/Edg\//.test(device)) browser = 'Edge';
    else if (/OPR\//.test(device)) browser = 'Opera';
    else if (/Chrome\//.test(device) && !/Chromium/.test(device)) browser = 'Chrome';
    else if (/CriOS\//.test(device)) browser = 'Chrome';
    else if (/FxiOS\//.test(device)) browser = 'Firefox';
    else if (/Firefox\//.test(device)) browser = 'Firefox';
    else if (/Safari\//.test(device) && !/Chrome\//.test(device)) browser = 'Safari';

    let os = 'Unknown OS';
    if (/Windows/.test(device)) os = 'Windows';
    else if (/iPhone|iPad|iPod/.test(device)) os = 'iOS';
    else if (/Mac OS X/.test(device)) os = 'macOS';
    else if (/Android/.test(device)) os = 'Android';
    else if (/Linux/.test(device)) os = 'Linux';

    return `${browser} on ${os}`;
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
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
      <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '60px', width: 'auto' }} />
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #EAD9BE', borderTopColor: C.bordeaux, animation: 'UNIMUNITY-spin 0.8s linear infinite' }} />
    </div>
  );

  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid #F0E4D6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const smallLabel = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8 };
  const visible = showCount === 'all' ? history : history.slice(0, parseInt(showCount));
  const devices = Array.from(new Set(history.map(h => formatDevice(h.device))));
  const lastSignIn = history[0]?.createdAt;
  const deviceIcon = (label: string) => /iOS|Android/.test(label) ? '\u{1F4F1}' : '\u{1F4BB}';

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 900px) { .sc-grid { grid-template-columns: 1fr !important; } }
        .sc-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .sc-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .sc-head { display: flex; align-items: center; gap: 11px; }
        .sc-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .sc-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .sc-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .sc-back:hover { background: #FBEEDD; }
        .sc-tr:hover td { background: #FFFBF5 !important; }
        .sc-danger { transition: background 0.15s ease; }
        .sc-danger:not(:disabled):hover { background: #FFEBEE !important; }
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
        <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start', cursor: 'pointer' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Security Center</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Protect your account and review recent sign-ins.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="sc-back">Back to Dashboard</button>
        </div>

        <div className="sc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Two-Factor', value: 'Enabled', sub: 'email code', top: '#66BB6A', color: C.green },
                { label: 'Recent Sign-ins', value: String(history.length), sub: 'last 20 max', top: '#E9C77B', color: C.bordeauxDark },
                { label: 'Devices Seen', value: String(devices.length), sub: devices.slice(0, 2).join(', ') || '-', top: '#B39DDB', color: C.bordeauxDark },
              ].map(k => (
                <div key={k.label} style={{ ...cardStyle, borderTop: '3px solid ' + k.top, padding: '11px 16px' }}>
                  <p style={{ ...smallLabel, margin: '0 0 3px' }}>{k.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Connection history */}
            <div className="sc-card" style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="sc-head">
                  <span className="sc-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F552}'}</span>
                  <h2 className="sc-title">Connection History <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>({history.length})</span></h2>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Show:</span>
                  <select value={showCount} onChange={e => setShowCount(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 10, border: '1.5px solid #EAD9BE', fontSize: 12.5, background: '#FFFDF9', color: C.text, outline: 'none' }}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>
              {history.length === 0 ? (
                <p style={{ padding: '30px 20px', color: C.muted, fontSize: 13, margin: 0, textAlign: 'center' as const }}>No history recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' as const }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
                        {['#', 'Event', 'Device', 'Date & Time'].map(h => (
                          <th key={h} style={{ textAlign: 'left' as const, padding: '9px 16px', color: '#FBEEDD', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((h, i) => {
                        const dev = formatDevice(h.device);
                        const td = { padding: '9px 16px', borderBottom: '1px solid #F7EEE3', background: i % 2 ? '#FFFDF9' : C.blanc };
                        return (
                          <tr key={h.id} className="sc-tr">
                            <td style={{ ...td, fontSize: 12, color: C.muted, width: 36 }}>{i + 1}</td>
                            <td style={{ ...td, fontSize: 13, fontWeight: 700, color: C.text }}>
                              {h.action || 'Signed in'}
                              {i === 0 && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, color: C.green, background: C.greenBg, padding: '2px 8px', borderRadius: 10 }}>Latest</span>}
                            </td>
                            <td style={{ ...td, fontSize: 12.5, color: C.muted }}>{deviceIcon(dev)} {dev}</td>
                            <td style={{ ...td, fontSize: 12, fontWeight: 700, color: C.bordeaux, whiteSpace: 'nowrap' as const }}>{formatDate(h.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visible.length < history.length && (
                    <div style={{ padding: '10px 20px', textAlign: 'center' as const, fontSize: 12, color: C.muted }}>
                      Showing {visible.length} of {history.length}.{' '}
                      <span onClick={() => setShowCount('all')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Show all</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="sc-card" style={{ ...cardStyle, padding: '22px', position: 'sticky' as const, top: 24 }}>
            <div style={{ textAlign: 'center' as const, margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '16px 16px 0 0', borderBottom: '1px solid #F0E4D6' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#3A1F2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user?.email || 'Your account'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase' as const, letterSpacing: 1.2 }}>Account Security</p>
            </div>
            {[
              { label: 'Two-factor', value: 'Enabled', color: C.green },
              { label: 'Method', value: 'Email code' },
              { label: 'Last sign-in', value: formatDate(lastSignIn) },
              { label: 'Email verified', value: user?.emailVerified ? 'Yes' : 'No', color: user?.emailVerified ? C.green : C.red },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{item.label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: item.color || C.text, textAlign: 'right' as const }}>{item.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 14, padding: '10px 12px', background: C.greenBg, borderRadius: 10, border: '1px solid #C8E6C8' }}>
              <p style={{ fontSize: 11.5, color: C.text, margin: 0, lineHeight: 1.55 }}>
                {'\u{1F512}'} Every sign-in requires a 6-digit code sent to your email.
              </p>
            </div>

            <p style={{ ...smallLabel, margin: '18px 0 6px' }}>Active Sessions</p>
            <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px', lineHeight: 1.5 }}>
              If you don&apos;t recognize a device in your history, sign out everywhere at once.
            </p>
            <button onClick={handleRevokeAll} disabled={revoking} className="sc-danger"
              style={{ width: '100%', background: C.blanc, color: C.red, border: '1.5px solid ' + C.red, padding: '10px', borderRadius: 12, fontSize: 13.5, fontWeight: 800, cursor: revoking ? 'not-allowed' : 'pointer', opacity: revoking ? 0.6 : 1 }}>
              {revoking ? 'Signing out everywhere...' : 'Sign out of all devices'}
            </button>
            {revokeMsg && <p style={{ color: C.red, fontSize: 12, margin: '8px 0 0' }}>{revokeMsg}</p>}
          </div>
        </div>

      </div>

      </div>
      <Footer />
    </div>
  );
}
