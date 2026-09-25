'use client';

// src/app/dashboard/church/add-member/page.tsx
//
// Add Member page for the Church module. Unlike Tontine's add-member page,
// there is no group/rotation/shares/payout-position concept here — a church
// member just has contact info + a role. On successful creation, a join
// invitation email is sent automatically (no manual "send invite" step),
// linking to /join-church/{inviteCode} — the pastel-styled, no-payment
// signup page built earlier.
//
// churchId comes from the query string (?churchId=...), matching how the
// Dashboard's "Add Member" tile already links here.

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';

const C = {
  pink: '#FDE2E4',
  cream: '#F6EFDD',
  green: '#E2F0CB',
  gold: '#D8B15A',
  goldText: '#8A6D1F',
  text: '#24324A',
  muted: '#68758A',
  white: '#FFFFFF',
  border: 'rgba(216,177,90,0.35)',
  danger: '#B4453E',
  dangerBg: '#FDECEC',
  greenBg: '#E2F0CB',
  greenText: '#3F6B34',
  amberBg: '#FEF3C7',
  amberText: '#92400E',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid ' + C.border,
  fontSize: 14, color: C.text, background: C.white, outline: 'none', boxSizing: 'border-box' as const,
};

const labelStyle = { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, display: 'block', marginBottom: 6 };

const ROLE_OPTIONS = ['Member', 'Leader', 'Deacon', 'Elder', 'Pastor', 'Administrator'];

function AddChurchMemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = searchParams.get('churchId') || '';

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', address: '', role: 'Member', notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'sent' | 'failed' | 'no-email' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [churchName, setChurchName] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!churchId) return;
    getDoc(doc(db, 'churches', churchId))
      .then((snap) => {
        if (snap.exists()) {
          setChurchName((snap.data().name as string) || (snap.data().churchName as string) || '');
        }
      })
      .catch((err) => console.error('Failed to load church name:', err));
  }, [churchId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login'); return; }
    });
    return () => unsub();
  }, [router]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      alert('First name, last name, email and phone number are required.');
      return;
    }
    if (!churchId) {
      alert('Missing church. Please go back to the Dashboard and try again.');
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    const fullName = (form.firstName + ' ' + form.lastName).trim();
    setLoading(true);

    try {
      const existing = await getDocs(query(
        collection(db, 'churchMembers'),
        where('churchId', '==', churchId)
      ));
      const members = existing.docs.map(d => d.data());
      if (members.some((m: any) => m.email === form.email)) {
        alert('A member with this email already exists in this church.');
        setLoading(false);
        return;
      }

      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();

      await addDoc(collection(db, 'churchMembers'), {
        firstName: form.firstName,
        lastName: form.lastName,
        fullName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        role: form.role,
        notes: form.notes,
        churchId,
        organizerId: user.uid,
        userId: null,
        inviteCode,
        createdAt: serverTimestamp(),
      });

      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: user.uid,
          category: 'Church Member',
          action: 'Added church member',
          user: user.email || '',
          details: fullName,
          createdAt: serverTimestamp(),
        });
      } catch (auditErr) {
        // Silent — audit logging must never block member creation.
      }

      if (!form.email) {
        setInviteStatus('no-email');
      } else {
        const inviteLink = 'https://unimunity.com/join-church/' + inviteCode;
        try {
          const inviteRes = await fetch('/api/send-church-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emails: [form.email],
              churchName: churchName || 'your church',
              inviteLink,
            }),
          });
          const inviteData = await inviteRes.json();
          setInviteStatus(inviteRes.ok && inviteData.sent > 0 ? 'sent' : 'failed');
        } catch (inviteErr) {
          console.error('Invite send failed:', inviteErr);
          setInviteStatus('failed');
        }
      }

      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Error adding member.');
    }
    setLoading(false);
  };

  if (!mounted) return null;

  const pageBg = {
    minHeight: '100vh',
    flex: 1,
    padding: 24,
    boxSizing: 'border-box' as const,
    background: `linear-gradient(120deg, ${C.pink} 0%, ${C.cream} 55%, ${C.green} 100%)`,
    backgroundAttachment: 'fixed' as const,
  };

  if (success) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <ChurchSidebar churchId={churchId} />
        <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.white, borderRadius: 18, padding: '48px 40px', textAlign: 'center', maxWidth: 460, width: '100%', boxShadow: '0 8px 30px rgba(36,50,74,0.10)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 24 }}>&#10003;</div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>Member added successfully</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 16px', lineHeight: 1.6 }}>
              {form.firstName} {form.lastName} is now part of your church.
            </p>

            {inviteStatus === 'sent' && (
              <div style={{ background: C.greenBg, color: C.greenText, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, margin: '0 0 20px' }}>
                Invitation email sent — they can now create their account.
              </div>
            )}
            {inviteStatus === 'no-email' && (
              <div style={{ background: C.amberBg, color: C.amberText, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, margin: '0 0 20px' }}>
                No email on file — no invitation was sent.
              </div>
            )}
            {inviteStatus === 'failed' && (
              <div style={{ background: C.dangerBg, color: C.danger, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, margin: '0 0 20px' }}>
                Member added, but the invitation email could not be sent. You can resend it from the Members page.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => router.push(`/dashboard/church/${churchId}/members`)}
                style={{ background: C.gold, color: C.text, border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                View Members
              </button>
              <button onClick={() => { setSuccess(false); setInviteStatus(null); setForm({ firstName: '', lastName: '', phone: '', email: '', address: '', role: 'Member', notes: '' }); }}
                style={{ background: C.cream, color: C.goldText, border: `1.5px solid ${C.gold}`, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Add Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <ChurchSidebar churchId={churchId} />
      <div style={pageBg}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          <div style={{ marginBottom: 20 }}>
            <button onClick={() => router.push(`/dashboard/church/${churchId}`)}
              style={{ background: 'rgba(216,177,90,0.14)', border: 'none', color: C.goldText, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 999 }}>
              ← Dashboard
            </button>
          </div>

          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: C.text, textAlign: 'center' as const }}>Add Member</h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, textAlign: 'center' as const }}>
            They will automatically receive an email invitation to create their account.
          </p>

          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: C.goldText, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 16px', paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              Personal Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle} placeholder="First name" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input style={inputStyle} placeholder="Last name" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input style={inputStyle} placeholder="+1 234 567 8900" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} placeholder="Optional" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input style={inputStyle} placeholder="Optional" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', padding: 14, background: C.gold, color: C.text, border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Adding member…' : 'Add Member'}
          </button>

          <div style={{ textAlign: 'center' as const, marginTop: 34, fontSize: 11, color: C.muted }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddChurchMemberPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#68758A' }}>Loading...</div>}>
      <AddChurchMemberContent />
    </Suspense>
  );
}
