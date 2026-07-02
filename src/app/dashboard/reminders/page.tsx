'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function RemindersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [customMsg, setCustomMsg] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        const userName = userDoc.exists() ? userDoc.data()?.name : null;
        setAdminName(userName || u.displayName || u.email?.split('@')[0] || 'Admin');

        const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
        const gsnap = await getDocs(gq);
        if (!gsnap.empty) {
          const g = { id: gsnap.docs[0].id, ...gsnap.docs[0].data() };
          setGroup(g);
          const mq = query(collection(db, 'members'), where('organizerId', '==', u.uid));
          const ms = await getDocs(mq);
          setMembers(ms.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.email));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const sendReminder = async (member: any) => {
    setSending(member.id);
    try {
      const res = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberEmail: member.email,
          memberName: member.name,
          groupName: group?.name,
          amount,
          dueDate,
          adminName,
        }),
      });
      if (res.ok) {
        setSent(prev => [...prev, member.id]);
      } else {
        alert('Failed to send reminder to ' + member.name);
      }
    } catch (e) {
      alert('Error sending reminder');
    }
    setSending(null);
  };

  const sendAll = async () => {
    for (const m of members) {
      await sendReminder(m);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD' }}>
      <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#6B2D4E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'transparent', border: 'none', color: '#E9C77B', cursor: 'pointer', fontSize: '20px' }}>←</button>
          <div style={{ color: '#E9C77B', fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: '#E9C77B', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ color: '#6B2D4E', fontSize: '28px', fontWeight: 800, margin: '0 0 4px' }}>
          🔔 Send Reminders
        </h1>
        <p style={{ color: '#6B2D4E', fontSize: '15px', margin: '0 0 32px' }}>
          {group?.name} · Notify members about upcoming contributions
        </p>

        {/* Options */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#6B2D4E', fontWeight: 700, margin: '0 0 16px' }}>Reminder Details (optional)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ color: '#6B2D4E', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Amount Due</label>
              <input value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 150"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8D5C4', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#6B2D4E', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8D5C4', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Send All */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ color: '#6B2D4E', fontSize: '14px', margin: 0 }}>{members.length} members with email</p>
          <button onClick={sendAll}
            style={{ background: '#6B2D4E', color: '#FBEEDD', padding: '10px 24px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
            📨 Send to All
          </button>
        </div>

        {/* Members list */}
        {members.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <p style={{ color: '#6B2D4E' }}>No members with email addresses found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.sort((a, b) => a.position - b.position).map(m => (
              <div key={m.id} style={{ background: 'white', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#6B2D4E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E9C77B', fontWeight: 800, fontSize: '14px' }}>
                    {m.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: '#4A1F38', fontWeight: 700, margin: '0 0 2px', fontSize: '15px' }}>{m.name}</p>
                    <p style={{ color: '#6B2D4E', fontSize: '13px', margin: 0 }}>{m.email} · #{m.position}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {sent.includes(m.id) && (
                    <span style={{ color: '#2E7D32', fontSize: '13px', fontWeight: 600 }}>✅ Sent</span>
                  )}
                  <button
                    onClick={() => sendReminder(m)}
                    disabled={sending === m.id || sent.includes(m.id)}
                    style={{
                      background: sent.includes(m.id) ? '#E8F5E9' : '#6B2D4E',
                      color: sent.includes(m.id) ? '#2E7D32' : '#FBEEDD',
                      padding: '8px 18px', borderRadius: '8px', border: 'none',
                      fontWeight: 600, cursor: sent.includes(m.id) ? 'default' : 'pointer',
                      fontSize: '13px', opacity: sending === m.id ? 0.6 : 1,
                    }}>
                    {sending === m.id ? 'Sending...' : sent.includes(m.id) ? 'Sent' : '📧 Send'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}