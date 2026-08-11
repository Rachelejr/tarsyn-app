'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

// Same turquoise + rose-bebe palette used across the Church module screens.
const C = {
  primary: '#4FB8AE',
  secondary: '#F7B8C6',
  accent: '#D7F0EC',
  bg: '#FBF6F2',
  cardBg: '#FFFFFF',
  borderSoft: '#F0D9DF',
  borderMed: '#B8E4DE',
  textDark: '#1F4A46',
  textGris: '#7A9490',
  success: '#5A8A6E',
  danger: '#A14444',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  border: `1.5px solid ${C.borderMed}`, borderRadius: '12px',
  fontSize: '14px', color: C.textDark, background: C.bg,
  boxSizing: 'border-box', outline: 'none',
};

interface Church { id: string; churchName?: string; }

function AddChurchMemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChurchId = searchParams.get('churchId') || '';

  const [organizerId, setOrganizerId] = useState('');
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState('');
  const [churchesLoading, setChurchesLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Member');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'sent' | 'failed' | 'no-email' | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setOrganizerId(u.uid);
      try {
        const q = query(collection(db, 'churches'), where('organizerId', '==', u.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Church));
        setChurches(list);
        if (urlChurchId) {
          setSelectedChurchId(urlChurchId);
        } else if (list.length === 1) {
          setSelectedChurchId(list[0].id);
        }
      } catch (e) { console.error(e); }
      setChurchesLoading(false);
    });
    return () => unsub();
  }, [router, urlChurchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedChurchId) return setError('Please select a church.');
    if (!fullName.trim()) return setError('Full name is required.');

    setSaving(true);
    try {
      const memberInviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      await addDoc(collection(db, 'churchMembers'), {
        organizerId,
        churchId: selectedChurchId,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        status: 'pending',
        inviteCode: memberInviteCode,
        createdAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId, category: 'Member',
          action: 'Added church member',
          user: auth.currentUser?.email || '', details: fullName.trim(),
          createdAt: serverTimestamp(),
        });
      } catch (auditErr) { /* silent - audit logging must never block member creation */ }

      if (!email.trim()) {
        setInviteStatus('no-email');
      } else {
        const selectedChurch = churches.find(c => c.id === selectedChurchId);
        const inviteLink = 'https://tarsyn-app.com/join-church/' + memberInviteCode;
        try {
          const res = await fetch('/api/send-church-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emails: [email.trim()],
              churchName: selectedChurch?.churchName || 'your church',
              inviteLink,
            }),
          });
          const data = await res.json();
          setInviteStatus(res.ok && data.sent > 0 ? 'sent' : 'failed');
        } catch (inviteErr) {
          console.error('Church invite send failed:', inviteErr);
          setInviteStatus('failed');
        }
      }

      setSuccess(true);
    } catch (e) {
      console.error(e);
      setError('Something went wrong. Please try again.');
    }
    setSaving(false);
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: C.cardBg, borderRadius: '20px', padding: '40px', maxWidth: '440px', width: '100%', textAlign: 'center' as const, border: `1px solid ${C.borderSoft}` }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: C.textDark, margin: '0 0 8px' }}>Member Added</h2>
          <p style={{ fontSize: '13px', color: C.textGris, margin: '0 0 20px' }}>
            {inviteStatus === 'sent' && 'An invitation email was sent.'}
            {inviteStatus === 'failed' && 'The member was added, but the invitation email could not be sent.'}
            {inviteStatus === 'no-email' && 'The member was added without an email — no invitation was sent.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => { setSuccess(false); setFullName(''); setEmail(''); setPhone(''); setRole('Member'); setInviteStatus(null); }}
              style={{ background: 'white', color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Add Another
            </button>
            <button
              onClick={() => router.push('/dashboard/church')}
              style={{ background: C.primary, color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Back to My Churches
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 24px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard/church')}
          style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px' }}
        >
          &larr; Back to My Churches
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: C.textDark, margin: '0 0 20px' }}>Add Church Member</h1>

        <form onSubmit={handleSubmit} style={{ background: C.cardBg, border: `1px solid ${C.borderSoft}`, borderRadius: '16px', padding: '24px' }}>
          {error && (
            <div style={{ background: '#FBEAEA', color: C.danger, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.textDark, marginBottom: '8px' }}>Church</label>
            {churchesLoading ? (
              <p style={{ fontSize: '13px', color: C.textGris }}>Loading churches...</p>
            ) : churches.length === 0 ? (
              <p style={{ fontSize: '13px', color: C.textGris }}>You have no churches yet. Create one first.</p>
            ) : (
              <select value={selectedChurchId} onChange={e => setSelectedChurchId(e.target.value)} style={inputStyle}>
                <option value="">— Select a church —</option>
                {churches.map(c => (
                  <option key={c.id} value={c.id}>{c.churchName || '(Unnamed church)'}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.textDark, marginBottom: '8px' }}>Full Name *</label>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Jean Dupont" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.textDark, marginBottom: '8px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@example.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.textDark, marginBottom: '8px' }}>Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: C.textDark, marginBottom: '8px' }}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
              <option>Member</option>
              <option>Deacon</option>
              <option>Elder</option>
              <option>Volunteer</option>
              <option>Choir</option>
              <option>Youth Leader</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || churches.length === 0}
            style={{
              width: '100%', padding: '13px', background: C.primary, color: 'white', border: 'none',
              borderRadius: '12px', fontSize: '14.5px', fontWeight: 700,
              cursor: saving || churches.length === 0 ? 'not-allowed' : 'pointer',
              opacity: saving || churches.length === 0 ? 0.6 : 1,
            }}
          >
            {saving ? 'Adding...' : 'Add Member'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AddChurchMemberPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#7A9490' }}>Loading...</div>}>
      <AddChurchMemberContent />
    </Suspense>
  );
}
