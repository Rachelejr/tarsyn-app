'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const ADMIN_EMAILS = ['rachelejr779@gmail.com'];

// Données simulées du membre connecté
const MEMBER_DATA = {
  tynId: 'TYN-000003',
  name: 'Sophie Bernard',
  email: 'sophie@example.com',
  country: '🇨🇦',
  position: 3,
  score: 60,
  status: 'Unpaid',
  groupName: 'Sol Group 2026',
  contributionAmount: 200,
  currency: { code: 'USD', symbol: '$', flag: '🇺🇸' },
  frequency: 'Monthly',
  totalMembers: 8,
  myPaymentDate: 'Jun 1, 2026',
  joinedDate: 'Apr 1, 2026',
};

const PAYMENT_HISTORY = [
  { id: 'PAY-001', date: 'May 1, 2026', amount: 200, status: 'Paid', cycle: 1, receipt: 'REC-001' },
  { id: 'PAY-002', date: 'Apr 1, 2026', amount: 200, status: 'Paid', cycle: 0, receipt: 'REC-000' },
];

const CYCLE_VIEW = [
  { position: 1, date: 'May 1, 2026', status: 'Received' },
  { position: 2, date: 'May 15, 2026', status: 'Received' },
  { position: 3, date: 'Jun 1, 2026', status: 'Upcoming' },
  { position: 4, date: 'Jun 6, 2026', status: 'Upcoming' },
  { position: 5, date: 'Jun 20, 2026', status: 'Upcoming' },
  { position: 6, date: 'Jul 4, 2026', status: 'Upcoming' },
  { position: 7, date: 'Jul 18, 2026', status: 'Upcoming' },
  { position: 8, date: 'Aug 1, 2026', status: 'Upcoming' },
];

export default function MemberPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { window.location.href = '/login'; return; }
      // Si c'est un admin, rediriger vers le dashboard
      if (ADMIN_EMAILS.includes(u.email || '')) {
        window.location.href = '/dashboard';
        return;
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', background: '#6B2D4E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px', color: '#D4AF7A' }}>✦</div>
        <p style={{ color: '#6B2D4E', fontWeight: '600' }}>Loading TARSYN...</p>
      </div>
    </div>
  );

  const name = user?.displayName || user?.email?.split('@')[0] || 'Member';
  const initials = name.slice(0, 2).toUpperCase();
  const sym = MEMBER_DATA.currency.symbol;
  const paidCycles = PAYMENT_HISTORY.filter(p => p.status === 'Paid').length;

  const navItems = [
    { id: 'home', icon: '🏠', label: 'My Space' },
    { id: 'payments', icon: '💰', label: 'My Payments' },
    { id: 'cycles', icon: '🔄', label: 'Cycles' },
    { id: 'profile', icon: '👤', label: 'My Profile' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex' }}>

      {/* SIDEBAR */}
      <aside style={{ width: '220px', background: '#6B2D4E', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#D4AF7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#6B2D4E' }}>✦</div>
            <div>
              <div style={{ color: '#FAF0E6', fontSize: '16px', fontWeight: '700', letterSpacing: '2px' }}>TARSYN</div>
              <div style={{ color: '#D4AF7A', fontSize: '8px', letterSpacing: '2px' }}>YOUR COMMUNITY. YOUR POWER.</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#D4AF7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#6B2D4E' }}>{initials}</div>
            <div>
              <div style={{ color: '#FAF0E6', fontSize: '12px', fontWeight: '600' }}>{name}</div>
              <div style={{ color: '#D4AF7A', fontSize: '9px', letterSpacing: '1px' }}>MEMBER • {MEMBER_DATA.tynId}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setActivePage(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 20px', cursor: 'pointer',
                background: activePage === item.id ? 'rgba(212,175,122,0.2)' : 'transparent',
                borderLeft: activePage === item.id ? '3px solid #D4AF7A' : '3px solid transparent',
              }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: activePage === item.id ? '700' : '400', color: activePage === item.id ? '#D4AF7A' : 'rgba(250,240,230,0.8)' }}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => signOut(auth).then(() => window.location.href = '/login')}
            style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#FAF0E6', fontSize: '13px', cursor: 'pointer' }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft: '220px', flex: 1, minHeight: '100vh' }}>

        {/* TOPBAR */}
        <div style={{ background: 'white', borderBottom: '1px solid #D9C0CC', padding: '0 28px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ fontSize: '17px', fontWeight: '700', color: '#6B2D4E' }}>{MEMBER_DATA.groupName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#7A5068' }}>{MEMBER_DATA.tynId}</span>
            <span style={{ fontSize: '11px', fontWeight: '700', background: '#EDD9E5', color: '#6B2D4E', padding: '4px 12px', borderRadius: '20px' }}>MEMBER</span>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {/* HOME PAGE */}
          {activePage === 'home' && (
            <>
              {/* Welcome */}
              <div style={{ background: 'linear-gradient(135deg,#6B2D4E,#8B3D62)', borderRadius: '14px', padding: '24px 28px', marginBottom: '24px' }}>
                <h2 style={{ color: '#FAF0E6', fontSize: '20px', marginBottom: '4px' }}>Welcome, <span style={{ color: '#D4AF7A' }}>{name}</span> 👋</h2>
                <p style={{ color: 'rgba(250,240,230,0.7)', fontSize: '13px' }}>{MEMBER_DATA.groupName} • Position #{MEMBER_DATA.position} • {MEMBER_DATA.frequency}</p>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'MY TYN-ID', value: MEMBER_DATA.tynId, sub: 'Your anonymous ID', icon: '🪪' },
                  { label: 'MY POSITION', value: `#${MEMBER_DATA.position}`, sub: `of ${MEMBER_DATA.totalMembers} members`, icon: '📍' },
                  { label: 'MY CONTRIBUTION', value: `${sym}${MEMBER_DATA.contributionAmount}`, sub: MEMBER_DATA.frequency, icon: '💰' },
                  { label: 'REPUTATION', value: `${MEMBER_DATA.score} pts`, sub: MEMBER_DATA.score >= 80 ? '🏆 Excellent' : MEMBER_DATA.score >= 60 ? '🥈 Good' : '⚠️ At risk', icon: '⭐' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontSize: '11px', color: '#7A5068', marginBottom: '6px', fontWeight: '600' }}>{s.icon} {s.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#6B2D4E' }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: '#C4748E', marginTop: '4px', fontWeight: '600' }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Next payment alert */}
              <div style={{ background: MEMBER_DATA.status === 'Paid' ? '#d4edda' : '#fff3cd', border: `1px solid ${MEMBER_DATA.status === 'Paid' ? '#c3e6cb' : '#ffeeba'}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{MEMBER_DATA.status === 'Paid' ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: '700', color: MEMBER_DATA.status === 'Paid' ? '#155724' : '#856404', fontSize: '14px' }}>
                    {MEMBER_DATA.status === 'Paid' ? 'Your contribution is paid for this cycle' : 'Payment due — ' + MEMBER_DATA.myPaymentDate}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7A5068', marginTop: '2px' }}>
                    Amount: {sym}{MEMBER_DATA.contributionAmount} • Contact your organizer to record payment
                  </div>
                </div>
              </div>

              {/* Reputation score */}
              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', marginBottom: '16px' }}>⭐ My Reputation Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '40px', fontWeight: '800', color: MEMBER_DATA.score >= 80 ? '#4A7C59' : MEMBER_DATA.score >= 60 ? '#856404' : '#721c24' }}>
                    {MEMBER_DATA.score}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: '#EDD9E5', borderRadius: '8px', height: '12px', marginBottom: '8px' }}>
                      <div style={{ background: MEMBER_DATA.score >= 80 ? '#4A7C59' : MEMBER_DATA.score >= 60 ? '#D4AF7A' : '#C4748E', borderRadius: '8px', height: '12px', width: `${MEMBER_DATA.score}%`, transition: 'width 0.5s' }}></div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#7A5068' }}>
                      {MEMBER_DATA.score >= 80 ? '🏆 Excellent — Keep it up!' : MEMBER_DATA.score >= 60 ? '🥈 Good — Pay on time to improve' : '⚠️ At risk — Please pay immediately'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '16px' }}>
                  {[
                    { label: 'On-time payments', value: `${paidCycles}/${PAYMENT_HISTORY.length}` },
                    { label: 'Cycles completed', value: paidCycles.toString() },
                    { label: 'Member since', value: 'Apr 2026' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#FAF0E6', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E' }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: '#7A5068', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PAYMENTS PAGE */}
          {activePage === 'payments' && (
            <>
              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9C0CC' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E' }}>💰 My Payment History</span>
                </div>
                {PAYMENT_HISTORY.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#7A5068', fontSize: '14px' }}>No payments recorded yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#FAF0E6' }}>
                        {['Receipt', 'Date', 'Amount', 'Cycle', 'Status'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A5068' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PAYMENT_HISTORY.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F5EAF0' }}>
                          <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6B2D4E' }}>{p.receipt}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#2C1A24' }}>{p.date}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#6B2D4E' }}>{sym}{p.amount}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#7A5068' }}>Cycle {p.cycle}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', background: '#d4edda', color: '#155724' }}>
                              ✅ {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ background: '#EDD9E5', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', marginBottom: '8px' }}>ℹ️ How to pay?</div>
                <div style={{ fontSize: '13px', color: '#7A5068', lineHeight: '1.8' }}>
                  1. Pay your contribution to your group organizer<br />
                  2. The organizer records your payment in the system<br />
                  3. You receive a receipt with QR Code by email<br />
                  4. Your status updates automatically
                </div>
              </div>
            </>
          )}

          {/* CYCLES PAGE */}
          {activePage === 'cycles' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9C0CC' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E' }}>🔄 Cycle Rotation</span>
              </div>
              <div style={{ padding: '16px 20px', background: '#EDD9E5', margin: '16px', borderRadius: '8px', fontSize: '13px', color: '#6B2D4E' }}>
                🔒 Confidential mode — Only dates and positions are shown. No member names visible.
              </div>
              <div style={{ padding: '0 20px 20px' }}>
                {CYCLE_VIEW.map(c => (
                  <div key={c.position} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', border: `2px solid ${c.position === MEMBER_DATA.position ? '#6B2D4E' : '#EDD9E5'}`,
                    borderRadius: '10px', marginBottom: '8px',
                    background: c.position === MEMBER_DATA.position ? '#EDD9E5' : 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', minWidth: '30px' }}>#{c.position}</span>
                      <span style={{ fontSize: '13px', color: '#7A5068' }}>{c.date}</span>
                      {c.position === MEMBER_DATA.position && (
                        <span style={{ fontSize: '11px', fontWeight: '700', background: '#6B2D4E', color: '#D4AF7A', padding: '2px 8px', borderRadius: '20px' }}>← YOU</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px',
                      background: c.status === 'Received' ? '#d4edda' : '#EDD9E5',
                      color: c.status === 'Received' ? '#155724' : '#7A5068'
                    }}>
                      {c.status === 'Received' ? '✅ Received' : '⏳ Upcoming'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFILE PAGE */}
          {activePage === 'profile' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '24px' }}>👤 My Profile</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', padding: '20px', background: '#FAF0E6', borderRadius: '12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#6B2D4E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: '#D4AF7A' }}>{initials}</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#2C1A24' }}>{name}</div>
                  <div style={{ fontSize: '13px', color: '#7A5068' }}>{user?.email}</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B2D4E', marginTop: '4px' }}>{MEMBER_DATA.tynId} • {MEMBER_DATA.groupName}</div>
                </div>
              </div>
              {[
                { label: 'TYN-ID', value: MEMBER_DATA.tynId },
                { label: 'Group', value: MEMBER_DATA.groupName },
                { label: 'Position', value: `#${MEMBER_DATA.position} of ${MEMBER_DATA.totalMembers}` },
                { label: 'Contribution', value: `${sym}${MEMBER_DATA.contributionAmount} / ${MEMBER_DATA.frequency}` },
                { label: 'Member Since', value: MEMBER_DATA.joinedDate },
                { label: 'Reputation Score', value: `${MEMBER_DATA.score} pts` },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #F5EAF0' }}>
                  <span style={{ fontSize: '13px', color: '#7A5068', fontWeight: '600' }}>{f.label}</span>
                  <span style={{ fontSize: '13px', color: '#2C1A24', fontWeight: '700' }}>{f.value}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
