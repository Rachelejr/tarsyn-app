'use client';

// src/app/dashboard/church/add-member/page.tsx
//
// Add Member page for the Church module.
//  - Full-width banner header (logo, centered title + tagline, live
//    date/time/temperature on the right) — same LAYOUT idea as Tontine's
//    Organizer Dashboard header, but in the Church pastel palette instead
//    of Tontine's bordeaux, so the two products still never look alike.
//  - Expanded name fields: Last Name, First Name, Middle Name, Initial.
//  - Structured addresses (Street, City, State, Zip) for both Current and
//    Previous address, instead of one free-text line.
//  - Title/Position field with a preset list PLUS a free-text "Other"
//    option, since not every church uses the same titles.
//  - Auto-generated Member ID (e.g. "JD-001"), National ID Number, Date of
//    Birth, Gender, Marital Status, Height, Color Tag — all from the
//    previous round of changes, unchanged.
//  - On successful creation, a join invitation email is sent automatically.

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';

const C = {
  pink: '#FDE2E4',
  cream: '#F6EFDD',
  green: '#E2F0CB',
  gold: '#D8B15A',
  goldText: '#8A6D1F',
  goldDark: '#B4923F',
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
const GENDER_OPTIONS = ['', 'Male', 'Female'];
const MARITAL_OPTIONS = ['', 'Single', 'Married', 'Divorced', 'Widowed'];
const COLOR_TAG_OPTIONS = ['', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'];
const TITLE_OPTIONS = ['', 'Pastor', 'Assistant Pastor', 'Elder', 'Deacon', 'Deaconess', 'Committee President', 'Committee Member', 'Usher Leader', 'Choir Director', 'Other'];

// --- Church banner header (full-width bar, Church palette) -------------

function ChurchBanner({ churchId, churchName, title, tagline }: { churchId: string; churchName: string; title: string; tagline: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + pos.coords.latitude + '&longitude=' + pos.coords.longitude + '&current=temperature_2m';
          const res = await fetch(url);
          const data = await res.json();
          if (data?.current?.temperature_2m != null) setTemp(Math.round(data.current.temperature_2m));
        } catch (err) { /* weather is best-effort */ }
      },
      () => { /* permission denied — skip */ },
      { timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(doc(db, 'churches', churchId), (snap) => {
      if (snap.exists()) setLogoUrl((snap.data().logoUrl as string) || undefined);
    });
    return () => unsub();
  }, [churchId]);

  const dateStr = now ? now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
  const timeStr = now ? now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <div style={{
      background: `linear-gradient(115deg, ${C.cream} 0%, ${C.cream} 16%, ${C.gold} 55%, ${C.goldDark} 100%)`,
      boxShadow: '0 2px 16px rgba(0,0,0,0.12)', padding: '14px 32px',
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16,
    }}>
      <img src={logoUrl || '/unimunity-logo.png'} alt={churchName || 'UNIMUNITY'} style={{ height: 44, width: 'auto', maxWidth: 200, display: 'block', justifySelf: 'start' }} />
      <div style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px', color: C.text, letterSpacing: '-0.3px' }}>{title}</h1>
        <p style={{ fontSize: 11.5, fontWeight: 600, margin: 0, color: C.text, opacity: 0.75 }}>{tagline}</p>
      </div>
      <div style={{ justifySelf: 'end', display: 'flex', gap: 8, alignItems: 'center' }}>
        {dateStr && <span style={{ fontSize: 11, fontWeight: 700, color: C.text, background: 'rgba(255,255,255,0.55)', padding: '4px 10px', borderRadius: 999 }}>📆 {dateStr}</span>}
        {timeStr && <span style={{ fontSize: 11, fontWeight: 700, color: C.text, background: 'rgba(255,255,255,0.55)', padding: '4px 10px', borderRadius: 999 }}>🕐 {timeStr}</span>}
        {temp !== null && <span style={{ fontSize: 11, fontWeight: 700, color: C.text, background: 'rgba(255,255,255,0.55)', padding: '4px 10px', borderRadius: 999 }}>🌤️ {temp}°C</span>}
      </div>
    </div>
  );
}

function AddChurchMemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = searchParams.get('churchId') || '';

  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '', initial: '',
    phone: '', email: '',
    street: '', city: '', state: '', zip: '',
    prevStreet: '', prevCity: '', prevState: '', prevZip: '',
    dateOfBirth: '', gender: '', maritalStatus: '',
    nationalId: '', height: '', colorTag: '',
    title: '', customTitle: '',
    role: 'Member', notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'sent' | 'failed' | 'no-email' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [nextPosition, setNextPosition] = useState(1);
  const [memberCode, setMemberCode] = useState('');

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
    if (!churchId) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'churchMembers'), where('churchId', '==', churchId)));
        setNextPosition(snap.size + 1);
      } catch (err) {
        console.error('Failed to count existing members:', err);
      }
    })();
  }, [churchId]);

  useEffect(() => {
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    if (!first && !last) { setMemberCode(''); return; }
    const firstInitial = first[0]?.toUpperCase() || '';
    const lastInitial = last[0]?.toUpperCase() || firstInitial;
    const seq = String(nextPosition).padStart(3, '0');
    setMemberCode(firstInitial + lastInitial + '-' + seq);
  }, [form.firstName, form.lastName, nextPosition]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login'); return; }
    });
    return () => unsub();
  }, [router]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const resetForm = () => setForm({
    firstName: '', lastName: '', middleName: '', initial: '',
    phone: '', email: '',
    street: '', city: '', state: '', zip: '',
    prevStreet: '', prevCity: '', prevState: '', prevZip: '',
    dateOfBirth: '', gender: '', maritalStatus: '',
    nationalId: '', height: '', colorTag: '',
    title: '', customTitle: '',
    role: 'Member', notes: '',
  });

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
    const resolvedTitle = form.title === 'Other' ? form.customTitle.trim() : form.title;
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
        middleName: form.middleName,
        initial: form.initial,
        fullName,
        memberCode,
        phone: form.phone,
        email: form.email,
        address: {
          street: form.street, city: form.city, state: form.state, zip: form.zip,
        },
        previousAddress: {
          street: form.prevStreet, city: form.prevCity, state: form.prevState, zip: form.prevZip,
        },
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        nationalId: form.nationalId,
        height: form.height,
        colorTag: form.colorTag,
        title: resolvedTitle,
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
          details: fullName + ' - ' + memberCode,
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
    background: `linear-gradient(120deg, ${C.pink} 0%, ${C.cream} 55%, ${C.green} 100%)`,
    display: 'flex', flexDirection: 'column' as const,
  };

  if (success) {
    return (
      <div style={pageBg}>
        <ChurchBanner churchId={churchId} churchName={churchName} title="Add Member" tagline="Registration complete" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: C.white, borderRadius: 18, padding: '48px 40px', textAlign: 'center', maxWidth: 460, width: '100%', boxShadow: '0 8px 30px rgba(36,50,74,0.10)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 24 }}>&#10003;</div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>Member added successfully</h2>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 6px', lineHeight: 1.6 }}>
              {form.firstName} {form.lastName} is now part of your church.
            </p>
            <p style={{ fontSize: 12, color: C.goldText, fontWeight: 700, margin: '0 0 16px' }}>Member ID: {memberCode}</p>

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
              <button onClick={() => { setSuccess(false); setInviteStatus(null); resetForm(); }}
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
    <div style={pageBg}>
      <ChurchBanner churchId={churchId} churchName={churchName} title="Add Member" tagline="They will automatically receive an email invitation to create their account." />

      <div style={{ flex: 1, padding: 24, boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          <div style={{ marginBottom: 20 }}>
            <button onClick={() => router.push(`/dashboard/church/${churchId}`)}
              style={{ background: 'rgba(216,177,90,0.14)', border: 'none', color: C.goldText, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 999 }}>
              ← Dashboard
            </button>
          </div>

          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: C.goldText, textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>
                Name
              </h2>
              {memberCode && (
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text, background: C.cream, padding: '4px 10px', borderRadius: 999 }}>
                  ID: {memberCode}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input style={inputStyle} placeholder="Last name" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle} placeholder="First name" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Middle Name</label>
                <input style={inputStyle} placeholder="Optional" value={form.middleName} onChange={e => set('middleName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Initial</label>
                <input style={inputStyle} placeholder="Optional" maxLength={4} value={form.initial} onChange={e => set('initial', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: C.goldText, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 16px', paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              Contact & Identity
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input style={inputStyle} placeholder="+1 234 567 8900" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input style={inputStyle} type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g || 'Not specified'}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Marital Status</label>
                <select style={inputStyle} value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)}>
                  {MARITAL_OPTIONS.map(m => <option key={m} value={m}>{m || 'Not specified'}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>National ID Number</label>
                <input style={inputStyle} placeholder="Optional" value={form.nationalId} onChange={e => set('nationalId', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Height</label>
                <input style={inputStyle} placeholder="e.g. 5'8&quot; or 173 cm" value={form.height} onChange={e => set('height', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Color Tag</label>
                <select style={inputStyle} value={form.colorTag} onChange={e => set('colorTag', e.target.value)}>
                  {COLOR_TAG_OPTIONS.map(c => <option key={c} value={c}>{c || 'None'}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: C.goldText, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 16px', paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              Current Address
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Street</label>
                <input style={inputStyle} placeholder="Optional" value={form.street} onChange={e => set('street', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} placeholder="Optional" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} placeholder="Optional" value={form.state} onChange={e => set('state', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Zip / Postal Code</label>
                <input style={inputStyle} placeholder="Optional" value={form.zip} onChange={e => set('zip', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: C.goldText, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 16px', paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              Previous Address (Optional)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Street</label>
                <input style={inputStyle} placeholder="Optional" value={form.prevStreet} onChange={e => set('prevStreet', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} placeholder="Optional" value={form.prevCity} onChange={e => set('prevCity', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} placeholder="Optional" value={form.prevState} onChange={e => set('prevState', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Zip / Postal Code</label>
                <input style={inputStyle} placeholder="Optional" value={form.prevZip} onChange={e => set('prevZip', e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: C.goldText, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 16px', paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              Church Information
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Title / Position</label>
                <select style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)}>
                  {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t || 'None'}</option>)}
                </select>
                {form.title === 'Other' && (
                  <input style={{ ...inputStyle, marginTop: 8 }} placeholder="Type the title" value={form.customTitle} onChange={e => set('customTitle', e.target.value)} />
                )}
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
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
