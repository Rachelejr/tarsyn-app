'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// ============ STATIC DATA (to be replaced with Firestore) ============
const MEMBER_DATA = {
  tynId: 'TYN-000003',
  groupName: 'Tontine 2026',
  contributionAmount: 200,
  currency: { code: 'USD', symbol: '$', flag: '🇺🇸' },
  frequency: 'Monthly',
  totalMembers: 8,
  position: 3,
  myPaymentDate: 'Jun 1, 2026',
  joinedDate: 'Apr 1, 2026',
  score: 60,
  status: 'Unpaid',
  organizerEmail: 'organizer@tarsyn-app.com',
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

const NOTIFICATIONS = [
  { id: 1, type: 'warning', text: 'Payment due in 5 days — Jun 1, 2026', time: '2 hours ago', read: false },
  { id: 2, type: 'success', text: 'Receipt REC-001 generated for your payment', time: 'May 1, 2026', read: true },
  { id: 3, type: 'info', text: 'Cycle 3 starts on Jun 1, 2026 — your turn!', time: 'Apr 28, 2026', read: true },
];

const DOCUMENTS = [
  { id: 'DOC-001', name: 'Receipt REC-001 — May 2026', type: 'receipt', date: 'May 1, 2026', size: '245 KB', icon: '🧾' },
  { id: 'DOC-002', name: 'Receipt REC-000 — Apr 2026', type: 'receipt', date: 'Apr 1, 2026', size: '238 KB', icon: '🧾' },
  { id: 'DOC-003', name: 'Group Contract — Tontine 2026', type: 'contract', date: 'Apr 1, 2026', size: '1.2 MB', icon: '📄' },
];

const FAQ = [
  { q: 'How does a tontine work?', a: 'Each member contributes a fixed amount every cycle. One member receives the full pot each cycle, rotating until everyone has received.' },
  { q: 'How is my TYN-ID used?', a: 'Your TYN-ID is your anonymous identifier. Other members only see your TYN-ID, not your personal information.' },
  { q: 'What happens if I miss a payment?', a: 'Late payments affect your reputation score. You may receive a penalty and your turn could be delayed. Contact your organizer immediately.' },
  { q: 'How do I receive my payout?', a: 'When it\'s your turn, the organizer will contact you to arrange the payout. Make sure your contact information is up to date.' },
  { q: 'Can I change my position in the cycle?', a: 'Position changes require agreement from the organizer and all affected members. Contact your organizer to request a change.' },
  { q: 'How is my reputation score calculated?', a: 'Your score is based on on-time payments, participation, and overall reliability. Pay on time to maintain a high score.' },
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ht', label: 'Kreyòl Ayisyen', flag: '🇭🇹' },
];

export default function MemberPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [language, setLanguage] = useState('en');
  const [unreadCount, setUnreadCount] = useState(NOTIFICATIONS.filter(n => !n.read).length);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', phone: '', country: '', bio: '' });
  const [profileSaved, setProfileSaved] = useState(false);

  // Contact organizer
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Comments
  const [comment, setComment] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  const [comments, setComments] = useState([
    { id: 1, text: 'Great experience so far! The system is very transparent.', date: 'May 15, 2026', author: 'TYN-000001' },
    { id: 2, text: 'Love the confidentiality feature. Very professional.', date: 'May 10, 2026', author: 'TYN-000002' },
  ]);

  // Rating
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSent, setRatingSent] = useState(false);

  // Documents
  const [uploadedDocs, setUploadedDocs] = useState(DOCUMENTS);
  const [docFilter, setDocFilter] = useState('All');

  // Notifications
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  // Privacy
  const [privacySettings, setPrivacySettings] = useState({
    showEmail: false,
    showCountry: true,
    showScore: true,
    emailNotifications: true,
    smsNotifications: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { window.location.href = '/login'; return; }
      try {
        const snap = await getDoc(doc(db, 'users', u.uid));
        const role = snap.data()?.role;
        if (role === 'superadmin' || role === 'organizer') {
          window.location.href = '/dashboard';
          return;
        }
        setProfileData({
          name: u.displayName || '',
          phone: snap.data()?.phone || '',
          country: snap.data()?.country || '',
          bio: snap.data()?.bio || '',
        });
      } catch { }
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

  const name = profileData.name || user?.displayName || user?.email?.split('@')[0] || 'Member';
  const initials = name.slice(0, 2).toUpperCase();
  const sym = MEMBER_DATA.currency.symbol;
  const paidCycles = PAYMENT_HISTORY.filter(p => p.status === 'Paid').length;

  const handleSaveProfile = async () => {
   try {
    await updateProfile(user, { displayName: profileData.name });
    await setDoc(doc(db, 'users', user.uid), {
      displayName: profileData.name,
      phone: profileData.phone,
      country: profileData.country,
      bio: profileData.bio,
      language: profileData.language,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    setProfileSaved(true);
    setEditingProfile(false);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) { console.error(e); }
  };
  };
    if (!contactSubject || !contactMessage) return;
    try {
      await addDoc(collection(db, 'messages'), {
        from: user.uid,
        tynId: MEMBER_DATA.tynId,
        subject: contactSubject,
        message: contactMessage,
        createdAt: serverTimestamp(),
        read: false,
      });
      setContactSent(true);
      setContactSubject('');
      setContactMessage('');
      setTimeout(() => setContactSent(false), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim()) return;
    const newComment = { id: Date.now(), text: comment, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), author: MEMBER_DATA.tynId };
    setComments([newComment, ...comments]);
    try {
      await addDoc(collection(db, 'comments'), {
        tynId: MEMBER_DATA.tynId,
        text: comment,
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    setComment('');
    setCommentSent(true);
    setTimeout(() => setCommentSent(false), 3000);
  };

  const handleSendRating = async () => {
    if (!rating) return;
    try {
      await addDoc(collection(db, 'ratings'), {
        tynId: MEMBER_DATA.tynId,
        rating,
        comment: ratingComment,
        createdAt: serverTimestamp(),
      });
    } catch (e) { console.error(e); }
    setRatingSent(true);
  };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const navItems = [
    { id: 'home', icon: '🏠', label: 'My Space' },
    { id: 'payments', icon: '💰', label: 'My Payments' },
    { id: 'documents', icon: '📁', label: 'My Documents' },
    { id: 'cycles', icon: '🔄', label: 'Cycles' },
    { id: 'stats', icon: '📊', label: 'My Statistics' },
    { id: 'profile', icon: '👤', label: 'My Profile' },
    { id: 'contact', icon: '📧', label: 'Contact' },
    { id: 'comments', icon: '💬', label: 'Comments' },
    { id: 'rating', icon: '⭐', label: 'Rate Service' },
    { id: 'notifications', icon: '🔔', label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'rules', icon: '📜', label: 'Group Rules' },
    { id: 'faq', icon: '❓', label: 'Help / FAQ' },
    { id: 'privacy', icon: '🔒', label: 'Privacy' },
    { id: 'invite', icon: '📱', label: 'Invite a Friend' },
    { id: 'language', icon: '🌍', label: 'Language' },
  ];

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1.5px solid #D9C0CC', borderRadius: '8px',
    fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', color: '#2C1A24',
    background: '#FAF0E6',
  };

  const btn = (extra = {}): React.CSSProperties => ({
    padding: '10px 20px', background: '#6B2D4E', color: 'white',
    border: 'none', borderRadius: '8px', fontSize: '13px',
    fontWeight: '700', cursor: 'pointer', ...extra,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex' }}>

      {/* SIDEBAR */}
      <aside style={{ width: '230px', background: '#6B2D4E', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50, overflowY: 'auto' }}>
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

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setActivePage(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 20px', cursor: 'pointer',
                background: activePage === item.id ? 'rgba(212,175,122,0.2)' : 'transparent',
                borderLeft: activePage === item.id ? '3px solid #D4AF7A' : '3px solid transparent',
              }}>
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: activePage === item.id ? '700' : '400', color: activePage === item.id ? '#D4AF7A' : 'rgba(250,240,230,0.8)' }}>{item.label}</span>
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
      <main style={{ marginLeft: '230px', flex: 1, minHeight: '100vh' }}>

        {/* TOPBAR */}
        <div style={{ background: 'white', borderBottom: '1px solid #D9C0CC', padding: '0 28px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ fontSize: '17px', fontWeight: '700', color: '#6B2D4E' }}>{MEMBER_DATA.groupName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#7A5068' }}>{MEMBER_DATA.tynId}</span>
            {unreadCount > 0 && (
              <span onClick={() => setActivePage('notifications')} style={{ fontSize: '11px', fontWeight: '700', background: '#C0392B', color: 'white', padding: '4px 10px', borderRadius: '20px', cursor: 'pointer' }}>
                🔔 {unreadCount}
              </span>
            )}
            <span style={{ fontSize: '11px', fontWeight: '700', background: '#EDD9E5', color: '#6B2D4E', padding: '4px 12px', borderRadius: '20px' }}>MEMBER</span>
          </div>
        </div>

        <div style={{ padding: '24px' }}>

          {/* ===== HOME ===== */}
          {activePage === 'home' && (
            <>
              <div style={{ background: 'linear-gradient(135deg,#6B2D4E,#8B3D62)', borderRadius: '14px', padding: '24px 28px', marginBottom: '24px' }}>
                <h2 style={{ color: '#FAF0E6', fontSize: '20px', marginBottom: '4px' }}>Welcome, <span style={{ color: '#D4AF7A' }}>{name}</span> 👋</h2>
                <p style={{ color: 'rgba(250,240,230,0.7)', fontSize: '13px' }}>{MEMBER_DATA.groupName} • Position #{MEMBER_DATA.position} • {MEMBER_DATA.frequency}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'MY TYN-ID', value: MEMBER_DATA.tynId, sub: 'Anonymous ID', icon: '🪪' },
                  { label: 'MY POSITION', value: `#${MEMBER_DATA.position}`, sub: `of ${MEMBER_DATA.totalMembers}`, icon: '📍' },
                  { label: 'CONTRIBUTION', value: `${sym}${MEMBER_DATA.contributionAmount}`, sub: MEMBER_DATA.frequency, icon: '💰' },
                  { label: 'REPUTATION', value: `${MEMBER_DATA.score} pts`, sub: MEMBER_DATA.score >= 80 ? '🏆 Excellent' : '🥈 Good', icon: '⭐' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontSize: '11px', color: '#7A5068', marginBottom: '6px', fontWeight: '600' }}>{s.icon} {s.label}</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#6B2D4E' }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: '#C4748E', marginTop: '4px', fontWeight: '600' }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: MEMBER_DATA.status === 'Paid' ? '#d4edda' : '#fff3cd', border: `1px solid ${MEMBER_DATA.status === 'Paid' ? '#c3e6cb' : '#ffeeba'}`, borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{MEMBER_DATA.status === 'Paid' ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: '700', color: MEMBER_DATA.status === 'Paid' ? '#155724' : '#856404', fontSize: '14px' }}>
                    {MEMBER_DATA.status === 'Paid' ? 'Your contribution is paid' : `Payment due — ${MEMBER_DATA.myPaymentDate}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7A5068', marginTop: '2px' }}>Amount: {sym}{MEMBER_DATA.contributionAmount} • Contact your organizer to record payment</div>
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', marginBottom: '16px' }}>🚀 Quick Actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '10px' }}>
                  {[
                    { icon: '💰', label: 'My Payments', page: 'payments' },
                    { icon: '📁', label: 'Documents', page: 'documents' },
                    { icon: '📧', label: 'Contact', page: 'contact' },
                    { icon: '💬', label: 'Comments', page: 'comments' },
                    { icon: '⭐', label: 'Rate Service', page: 'rating' },
                    { icon: '🔔', label: 'Notifications', page: 'notifications' },
                  ].map(a => (
                    <button key={a.label} onClick={() => setActivePage(a.page)}
                      style={{ background: '#FAF0E6', border: '1.5px solid #D9C0CC', borderRadius: '12px', padding: '14px 10px', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', marginBottom: '5px' }}>{a.icon}</div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B2D4E' }}>{a.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== PAYMENTS ===== */}
          {activePage === 'payments' && (
            <>
              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9C0CC' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E' }}>💰 My Payment History</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAF0E6' }}>
                      {['Receipt', 'Date', 'Amount', 'Cycle', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#7A5068' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PAYMENT_HISTORY.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F5EAF0' }}>
                        <td style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6B2D4E' }}>{p.receipt}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>{p.date}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: '#6B2D4E' }}>{sym}{p.amount}</td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#7A5068' }}>Cycle {p.cycle}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', background: '#d4edda', color: '#155724' }}>✅ {p.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => alert(`Downloading ${p.receipt}...`)} style={{ padding: '4px 10px', border: '1px solid #D9C0CC', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#6B2D4E', fontWeight: '600' }}>📥 Download</button>
                            <button onClick={() => alert(`Printing ${p.receipt}...`)} style={{ padding: '4px 10px', border: '1px solid #D9C0CC', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '11px', color: '#6B2D4E', fontWeight: '600' }}>🖨️ Print</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: '#EDD9E5', borderRadius: '12px', padding: '20px' }}>
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

          {/* ===== DOCUMENTS ===== */}
          {activePage === 'documents' && (
            <>
              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', marginBottom: '20px', padding: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', marginBottom: '14px' }}>📁 My Documents</div>
                <div style={{ border: '2px dashed #D9C0CC', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#FAF0E6', marginBottom: '16px' }}
                  onClick={() => {
                    const newDoc = { id: `DOC-00${uploadedDocs.length + 1}`, name: `Uploaded Document ${uploadedDocs.length + 1}`, type: 'personal', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), size: '500 KB', icon: '📎' };
                    setUploadedDocs([...uploadedDocs, newDoc]);
                    alert('✅ Document uploaded successfully!');
                  }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
                  <div style={{ color: '#6B2D4E', fontWeight: '600', fontSize: '14px' }}>Click to Upload Document</div>
                  <div style={{ color: '#7A5068', fontSize: '12px', marginTop: '4px' }}>PDF, Word, Excel, JPG, PNG — max 10MB</div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {['All', 'Receipts', 'Contracts', 'Personal'].map(f => (
                    <button key={f} onClick={() => setDocFilter(f)}
                      style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px solid #D9C0CC', background: docFilter === f ? '#6B2D4E' : 'white', color: docFilter === f ? 'white' : '#6B2D4E', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{f}</button>
                  ))}
                </div>

                {uploadedDocs.filter(d => docFilter === 'All' || d.type === docFilter.toLowerCase().slice(0, -1)).map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #D9C0CC', borderRadius: '10px', marginBottom: '8px', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '24px' }}>{d.icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#2C1A24' }}>{d.name}</div>
                        <div style={{ fontSize: '11px', color: '#7A5068' }}>{d.id} • {d.date} • {d.size}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => alert(`Downloading ${d.name}...`)} style={{ padding: '6px 10px', border: '1px solid #D9C0CC', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>📥</button>
                      <button onClick={() => alert(`Printing ${d.name}...`)} style={{ padding: '6px 10px', border: '1px solid #D9C0CC', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>🖨️</button>
                      <button onClick={() => setUploadedDocs(uploadedDocs.filter(x => x.id !== d.id))} style={{ padding: '6px 10px', border: '1px solid #f5c6cb', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#C0392B' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== CYCLES ===== */}
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
                  <div key={c.position} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: `2px solid ${c.position === MEMBER_DATA.position ? '#6B2D4E' : '#EDD9E5'}`, borderRadius: '10px', marginBottom: '8px', background: c.position === MEMBER_DATA.position ? '#EDD9E5' : 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', minWidth: '30px' }}>#{c.position}</span>
                      <span style={{ fontSize: '13px', color: '#7A5068' }}>{c.date}</span>
                      {c.position === MEMBER_DATA.position && (
                        <span style={{ fontSize: '11px', fontWeight: '700', background: '#6B2D4E', color: '#D4AF7A', padding: '2px 8px', borderRadius: '20px' }}>← YOU</span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', background: c.status === 'Received' ? '#d4edda' : '#EDD9E5', color: c.status === 'Received' ? '#155724' : '#7A5068' }}>
                      {c.status === 'Received' ? '✅ Received' : '⏳ Upcoming'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== STATISTICS ===== */}
          {activePage === 'stats' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'TOTAL PAID', value: `${sym}${paidCycles * MEMBER_DATA.contributionAmount}`, icon: '💰' },
                  { label: 'ON-TIME PAYMENTS', value: `${paidCycles}/${PAYMENT_HISTORY.length}`, icon: '✅' },
                  { label: 'CYCLES COMPLETED', value: paidCycles.toString(), icon: '🔄' },
                  { label: 'REPUTATION', value: `${MEMBER_DATA.score}/100`, icon: '⭐' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '16px 18px' }}>
                    <div style={{ fontSize: '11px', color: '#7A5068', marginBottom: '6px', fontWeight: '600' }}>{s.icon} {s.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#6B2D4E' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', marginBottom: '16px' }}>⭐ Reputation Score Detail</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '48px', fontWeight: '800', color: MEMBER_DATA.score >= 80 ? '#4A7C59' : '#856404' }}>{MEMBER_DATA.score}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: '#EDD9E5', borderRadius: '8px', height: '12px', marginBottom: '8px' }}>
                      <div style={{ background: MEMBER_DATA.score >= 80 ? '#4A7C59' : '#D4AF7A', borderRadius: '8px', height: '12px', width: `${MEMBER_DATA.score}%` }}></div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#7A5068' }}>🥈 Good — Pay on time to improve your score</div>
                  </div>
                </div>
                {[
                  { label: 'On-time payments', value: `${paidCycles}/${PAYMENT_HISTORY.length}`, points: '+40 pts' },
                  { label: 'Cycles completed', value: paidCycles.toString(), points: '+20 pts' },
                  { label: 'Member since', value: 'Apr 2026', points: '+0 pts' },
                  { label: 'Late payments', value: '0', points: '+0 pts' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5EAF0' }}>
                    <span style={{ fontSize: '13px', color: '#7A5068' }}>{r.label}</span>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#2C1A24' }}>{r.value}</span>
                      <span style={{ fontSize: '12px', color: '#4A7C59', fontWeight: '600' }}>{r.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== PROFILE ===== */}
          {activePage === 'profile' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E' }}>👤 My Profile</div>
                <button onClick={() => setEditingProfile(!editingProfile)} style={btn()}>
                  {editingProfile ? '✕ Cancel' : '✏️ Edit Profile'}
                </button>
              </div>

              {profileSaved && (
                <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  ✅ Profile saved successfully!
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', padding: '20px', background: '#FAF0E6', borderRadius: '12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#6B2D4E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: '#D4AF7A' }}>{initials}</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#2C1A24' }}>{name}</div>
                  <div style={{ fontSize: '13px', color: '#7A5068' }}>{user?.email}</div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B2D4E', marginTop: '4px' }}>{MEMBER_DATA.tynId} • {MEMBER_DATA.groupName}</div>
                </div>
              </div>

              {editingProfile ? (
                <div>
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your full name' },
                    { label: 'Phone Number', key: 'phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
                    { label: 'Country', key: 'country', type: 'text', placeholder: 'Haiti, USA, Canada...' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#6B2D4E', marginBottom: '5px' }}>{f.label}</label>
                      <input type={f.type} value={(profileData as any)[f.key]} onChange={e => setProfileData({ ...profileData, [f.key]: e.target.value })} placeholder={f.placeholder} style={inp} />
                    </div>
                  ))}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#6B2D4E', marginBottom: '5px' }}>Bio</label>
                    <textarea value={profileData.bio} onChange={e => setProfileData({ ...profileData, bio: e.target.value })} placeholder="A few words about yourself..." rows={3} style={{ ...inp, resize: 'vertical' }} />
                  </div>
                  <button onClick={handleSaveProfile} style={btn({ width: '100%', padding: '12px' })}>
                    💾 Save Profile
                  </button>
                </div>
              ) : (
                <>
                  {[
                    { label: 'TYN-ID', value: MEMBER_DATA.tynId },
                    { label: 'Group', value: MEMBER_DATA.groupName },
                    { label: 'Position', value: `#${MEMBER_DATA.position} of ${MEMBER_DATA.totalMembers}` },
                    { label: 'Contribution', value: `${sym}${MEMBER_DATA.contributionAmount} / ${MEMBER_DATA.frequency}` },
                    { label: 'Phone', value: profileData.phone || '—' },
                    { label: 'Country', value: profileData.country || '—' },
                    { label: 'Bio', value: profileData.bio || '—' },
                    { label: 'Member Since', value: MEMBER_DATA.joinedDate },
                    { label: 'Reputation Score', value: `${MEMBER_DATA.score} pts` },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #F5EAF0' }}>
                      <span style={{ fontSize: '13px', color: '#7A5068', fontWeight: '600' }}>{f.label}</span>
                      <span style={{ fontSize: '13px', color: '#2C1A24', fontWeight: '700' }}>{f.value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ===== CONTACT ===== */}
          {activePage === 'contact' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '24px' }}>📧 Contact Organizer</div>

              {contactSent && (
                <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                  ✅ Message sent successfully! The organizer will reply by email.
                </div>
              )}

              <div style={{ background: '#EDD9E5', borderRadius: '8px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#6B2D4E' }}>
                📬 Your message will be sent to the group organizer. You will receive a reply by email within 24-48 hours.
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#6B2D4E', marginBottom: '5px' }}>Subject</label>
                <select value={contactSubject} onChange={e => setContactSubject(e.target.value)} style={inp}>
                  <option value="">— Select a subject —</option>
                  <option>Payment question</option>
                  <option>Request position change</option>
                  <option>Technical issue</option>
                  <option>Document request</option>
                  <option>Withdrawal request</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#6B2D4E', marginBottom: '5px' }}>Message</label>
                <textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Write your message here..." rows={5} style={{ ...inp, resize: 'vertical' }} />
              </div>
              <button onClick={handleSendContact} disabled={!contactSubject || !contactMessage}
                style={btn({ width: '100%', padding: '12px', opacity: !contactSubject || !contactMessage ? 0.6 : 1 })}>
                📤 Send Message
              </button>
            </div>
          )}

          {/* ===== COMMENTS ===== */}
          {activePage === 'comments' && (
            <>
              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '16px' }}>💬 Leave a Comment</div>

                {commentSent && (
                  <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                    ✅ Comment posted successfully!
                  </div>
                )}

                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience or thoughts about the tontine..." rows={4} style={{ ...inp, marginBottom: '14px', resize: 'vertical' }} />
                <button onClick={handleSendComment} disabled={!comment.trim()} style={btn({ opacity: !comment.trim() ? 0.6 : 1 })}>
                  💬 Post Comment
                </button>
              </div>

              <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', marginBottom: '16px' }}>💬 All Comments</div>
                {comments.map(c => (
                  <div key={c.id} style={{ padding: '14px', background: '#FAF0E6', borderRadius: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '13px', color: '#2C1A24', marginBottom: '8px' }}>{c.text}</div>
                    <div style={{ fontSize: '11px', color: '#7A5068' }}>{c.author} • {c.date}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== RATING ===== */}
          {activePage === 'rating' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '8px' }}>⭐ Rate TARSYN Service</div>
              <div style={{ fontSize: '13px', color: '#7A5068', marginBottom: '24px' }}>Your feedback helps us improve the platform for everyone.</div>

              {ratingSent ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#6B2D4E', marginBottom: '8px' }}>Thank you for your rating!</div>
                  <div style={{ fontSize: '13px', color: '#7A5068' }}>Your feedback has been submitted successfully.</div>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#6B2D4E', marginBottom: '16px' }}>How would you rate our service?</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          style={{ fontSize: '40px', cursor: 'pointer', transition: 'transform 0.1s', transform: (hoverRating || rating) >= star ? 'scale(1.2)' : 'scale(1)', filter: (hoverRating || rating) >= star ? 'none' : 'grayscale(1)' }}>
                          ⭐
                        </span>
                      ))}
                    </div>
                    {rating > 0 && (
                      <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: '600', color: '#6B2D4E' }}>
                        {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent!'} ({rating}/5)
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#6B2D4E', marginBottom: '5px' }}>Additional Comments (optional)</label>
                    <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Tell us what you liked or how we can improve..." rows={4} style={{ ...inp, resize: 'vertical' }} />
                  </div>

                  <button onClick={handleSendRating} disabled={!rating} style={btn({ width: '100%', padding: '12px', opacity: !rating ? 0.6 : 1 })}>
                    ⭐ Submit Rating
                  </button>
                </>
              )}
            </div>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {activePage === 'notifications' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #D9C0CC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E' }}>🔔 Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#C4748E', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Mark all as read</button>
                )}
              </div>
              {notifications.map(n => (
                <div key={n.id} style={{ padding: '14px 20px', borderBottom: '1px solid #F5EAF0', background: n.read ? 'white' : '#FAF0E6', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '20px' }}>{n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#2C1A24', fontWeight: n.read ? '400' : '600' }}>{n.text}</div>
                    <div style={{ fontSize: '11px', color: '#7A5068', marginTop: '4px' }}>{n.time}</div>
                  </div>
                  {!n.read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6B2D4E', flexShrink: 0, marginTop: '4px' }}></span>}
                </div>
              ))}
            </div>
          )}

          {/* ===== RULES ===== */}
          {activePage === 'rules' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '24px' }}>📜 Group Rules & Contract</div>
              {[
                { title: '1. Contribution', text: `Each member must contribute ${MEMBER_DATA.currency.symbol}${MEMBER_DATA.contributionAmount} every ${MEMBER_DATA.frequency.toLowerCase()}. Payments must be made before the due date.` },
                { title: '2. Rotation Order', text: 'The rotation order is determined at the start of the group and cannot be changed without agreement from the organizer and all affected members.' },
                { title: '3. Late Payments', text: 'Late payments will result in a penalty and a reduction in your reputation score. Chronic late payments may result in suspension from the group.' },
                { title: '4. Confidentiality', text: 'Member identities are protected. Only TYN-IDs are visible to other members. Personal information is strictly confidential.' },
                { title: '5. Commission', text: 'The organizer charges a commission of 1% per distribution cycle. This is clearly stated and transparent.' },
                { title: '6. Withdrawal', text: 'Early withdrawal from the group requires 30 days notice and approval from the organizer. Penalties may apply.' },
                { title: '7. Disputes', text: 'Any disputes must be communicated in writing to the organizer within 7 days of the issue.' },
              ].map(r => (
                <div key={r.title} style={{ marginBottom: '20px', padding: '16px', background: '#FAF0E6', borderRadius: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#6B2D4E', marginBottom: '8px' }}>{r.title}</div>
                  <div style={{ fontSize: '13px', color: '#7A5068', lineHeight: '1.6' }}>{r.text}</div>
                </div>
              ))}
              <button onClick={() => alert('Downloading contract PDF...')} style={btn({ width: '100%', padding: '12px' })}>
                📥 Download Contract PDF
              </button>
            </div>
          )}

          {/* ===== FAQ ===== */}
          {activePage === 'faq' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '24px' }}>❓ Help & FAQ</div>
              {FAQ.map((f, i) => (
                <details key={i} style={{ marginBottom: '12px', border: '1px solid #D9C0CC', borderRadius: '10px', overflow: 'hidden' }}>
                  <summary style={{ padding: '14px 18px', fontSize: '14px', fontWeight: '600', color: '#6B2D4E', cursor: 'pointer', background: '#FAF0E6' }}>
                    {f.q}
                  </summary>
                  <div style={{ padding: '14px 18px', fontSize: '13px', color: '#7A5068', lineHeight: '1.6', borderTop: '1px solid #EDD9E5' }}>
                    {f.a}
                  </div>
                </details>
              ))}
              <div style={{ marginTop: '24px', padding: '16px', background: '#EDD9E5', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#6B2D4E', marginBottom: '10px' }}>Still have questions?</div>
                <button onClick={() => setActivePage('contact')} style={btn()}>📧 Contact Organizer</button>
              </div>
            </div>
          )}

          {/* ===== PRIVACY ===== */}
          {activePage === 'privacy' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '24px' }}>🔒 Privacy Settings</div>
              {[
                { label: 'Show email to organizer', key: 'showEmail' },
                { label: 'Show country in profile', key: 'showCountry' },
                { label: 'Show reputation score', key: 'showScore' },
                { label: 'Email notifications', key: 'emailNotifications' },
                { label: 'SMS notifications', key: 'smsNotifications' },
              ].map(s => (
                <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F5EAF0' }}>
                  <span style={{ fontSize: '13px', color: '#2C1A24', fontWeight: '500' }}>{s.label}</span>
                  <button onClick={() => setPrivacySettings({ ...privacySettings, [s.key]: !(privacySettings as any)[s.key] })}
                    style={{ background: (privacySettings as any)[s.key] ? '#6B2D4E' : '#D9C0CC', border: 'none', borderRadius: '20px', padding: '4px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: 'white', minWidth: '52px' }}>
                    {(privacySettings as any)[s.key] ? 'ON' : 'OFF'}
                  </button>
                </div>
              ))}
              <button onClick={() => alert('✅ Privacy settings saved!')} style={btn({ marginTop: '20px', width: '100%', padding: '12px' })}>
                💾 Save Settings
              </button>
            </div>
          )}

          {/* ===== INVITE ===== */}
          {activePage === 'invite' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '8px' }}>📱 Invite a Friend</div>
              <div style={{ fontSize: '13px', color: '#7A5068', marginBottom: '24px' }}>Invite someone to join TARSYN or your tontine group.</div>

              <div style={{ background: '#EDD9E5', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#7A5068', marginBottom: '8px' }}>Your invite link</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#6B2D4E', background: 'white', padding: '10px', borderRadius: '8px', wordBreak: 'break-all' }}>
                  https://tarsyn-app.com/register?ref={MEMBER_DATA.tynId}
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`https://tarsyn-app.com/register?ref=${MEMBER_DATA.tynId}`); alert('✅ Link copied!'); }} style={{ ...btn(), marginTop: '12px' }}>
                  📋 Copy Link
                </button>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#6B2D4E', marginBottom: '5px' }}>Or send by email</label>
                <input type="email" placeholder="friend@example.com" style={inp} />
              </div>
              <button onClick={() => alert('✅ Invitation sent!')} style={btn({ width: '100%', padding: '12px' })}>
                📧 Send Invitation
              </button>
            </div>
          )}

          {/* ===== LANGUAGE ===== */}
          {activePage === 'language' && (
            <div style={{ background: 'white', border: '1px solid #D9C0CC', borderRadius: '12px', padding: '28px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#6B2D4E', marginBottom: '24px' }}>🌍 Language / Langue / Lang</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {LANGUAGES.map(l => (
                  <div key={l.code} onClick={() => { setLanguage(l.code); alert(`Language set to ${l.label}`); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', border: `2px solid ${language === l.code ? '#6B2D4E' : '#D9C0CC'}`, borderRadius: '12px', cursor: 'pointer', background: language === l.code ? '#EDD9E5' : 'white' }}>
                    <span style={{ fontSize: '28px' }}>{l.flag}</span>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#2C1A24' }}>{l.label}</span>
                    {language === l.code && <span style={{ marginLeft: 'auto', color: '#6B2D4E', fontWeight: '700' }}>✓ Selected</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}


