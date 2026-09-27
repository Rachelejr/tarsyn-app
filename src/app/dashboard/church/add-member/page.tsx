'use client';

// src/app/dashboard/church/add-member/page.tsx
//
// Redesigned per the "REFONTE DE LA PAGE Add Member" spec:
//  - Card-based layout (Personal Information, Contact Information, Family
//    Information, Church Information, Additional Information), pastel
//    accents, mostly white/ivoire cards.
//  - "status" (Member Status: Active/Inactive/New/Pending/Transferred/
//    Visitor/Suspended/Deceased/Other) is a NEW, SEPARATE field from
//    "maritalStatus" — never confused with each other.
//  - Optional profile photo upload (Firebase Storage).
//  - Family: pick an EXISTING family (from churches/{churchId}/families,
//    the same collection the Families page already uses) or quickly
//    create a new one — never a second, parallel family system. Picking
//    or creating a family adds this member to that family's memberIds.
//  - Ministry / Group: dropdowns from the real, existing Ministries
//    (churches/{churchId}/ministries, top-level only) and Groups
//    (churchGroups, filtered by churchId) — no made-up lists.
//  - Height and Previous Address removed from this standard form (per
//    spec) — nothing is deleted from existing Firestore data, these two
//    fields are just no longer collected here going forward.
//  - Everything from before is kept: auto-generated Member ID, National ID
//    (protected, never shown to ordinary members), automatic join
//    invitation email, duplicate-email guard.

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, setDoc, getDoc, getDocs, query, where,
  onSnapshot, updateDoc, arrayUnion, increment, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc } from 'firebase/firestore';

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
const cardStyle = { background: C.white, borderRadius: 16, padding: 24, border: '1.5px solid ' + C.border, marginBottom: 18 };

const GENDER_OPTIONS = ['', 'Male', 'Female'];
const MARITAL_OPTIONS = ['', 'Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
const MEMBER_STATUS_OPTIONS = ['Active', 'Inactive', 'New', 'Pending', 'Transferred', 'Visitor', 'Suspended', 'Deceased', 'Other'];
const ROLE_OPTIONS = ['Member', 'Leader', 'Deacon', 'Deaconess', 'Elder', 'Pastor', 'Administrator', 'Committee President', 'Usher Leader', 'Choir Director', 'Other'];

interface OptionRow { id: string; name: string; }

function CardHeader({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ width: 6, alignSelf: 'stretch', borderRadius: 4, background: accent }} />
      <div>
        <h2 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: C.text }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 11.5, color: C.muted }}>{subtitle}</p>
      </div>
    </div>
  );
}

function AddChurchMemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = searchParams.get('churchId') || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    dateOfBirth: '', gender: '', maritalStatus: '', status: 'Active',
    street: '', city: '', state: '', zip: '', country: 'United States',
    spouseName: '', familyId: '',
    dateJoined: '', baptismDate: '', ministryId: '', groupId: '', role: 'Member',
    nationalId: '', notes: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [families, setFamilies] = useState<OptionRow[]>([]);
  const [ministries, setMinistries] = useState<OptionRow[]>([]);
  const [groups, setGroups] = useState<OptionRow[]>([]);

  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'sent' | 'failed' | 'no-email' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [nextPosition, setNextPosition] = useState(1);
  const [memberCode, setMemberCode] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!churchId) return;
    getDoc(doc(db, 'churches', churchId)).then((snap) => {
      if (snap.exists()) setChurchName((snap.data().name as string) || (snap.data().churchName as string) || '');
    }).catch((err) => console.error('Failed to load church name:', err));
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'churchMembers'), where('churchId', '==', churchId)));
        setNextPosition(snap.size + 1);
      } catch (err) { console.error('Failed to count existing members:', err); }
    })();
  }, [churchId]);

  useEffect(() => {
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    if (!first && !last) { setMemberCode(''); return; }
    const firstInitial = first[0]?.toUpperCase() || '';
    const lastInitial = last[0]?.toUpperCase() || firstInitial;
    setMemberCode(firstInitial + lastInitial + '-' + String(nextPosition).padStart(3, '0'));
  }, [form.firstName, form.lastName, nextPosition]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (!u) router.push('/login'); });
    return () => unsub();
  }, [router]);

  // Existing Families, top-level Ministries, and Groups — reused, never duplicated.
  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, 'churches', churchId, 'families'), (snap) => {
      setFamilies(snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || 'Family' })));
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, 'churches', churchId, 'ministries'), (snap) => {
      setMinistries(snap.docs
        .filter((d) => !d.data().parentMinistryId)
        .map((d) => ({ id: d.id, name: (d.data().name as string) || 'Ministry' })));
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(query(collection(db, 'churchGroups'), where('churchId', '==', churchId)), (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || 'Group' })));
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleCreateFamily() {
    if (!newFamilyName.trim() || !churchId || !auth.currentUser) return;
    setCreatingFamily(true);
    try {
      const ref = await addDoc(collection(db, 'churches', churchId, 'families'), {
        organizerId: auth.currentUser.uid,
        churchId,
        name: newFamilyName.trim(),
        headOfHouseholdId: null,
        headOfHouseholdName: null,
        memberIds: [],
        memberCount: 0,
        address: '',
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setForm((f) => ({ ...f, familyId: ref.id }));
      setNewFamilyName('');
      setShowNewFamily(false);
    } catch (err) {
      console.error(err);
      alert('Could not create the family. Please try again.');
    } finally {
      setCreatingFamily(false);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!form.phone.trim()) errs.phone = 'Phone is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  }

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', phone: '', email: '',
      dateOfBirth: '', gender: '', maritalStatus: '', status: 'Active',
      street: '', city: '', state: '', zip: '', country: 'United States',
      spouseName: '', familyId: '',
      dateJoined: '', baptismDate: '', ministryId: '', groupId: '', role: 'Member',
      nationalId: '', notes: '',
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setFieldError({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!churchId) { alert('Missing church. Please go back to the Dashboard and try again.'); return; }
    const user = auth.currentUser;
    if (!user) return;

    const fullName = (form.firstName + ' ' + form.lastName).trim();
    setLoading(true);

    try {
      const existing = await getDocs(query(collection(db, 'churchMembers'), where('churchId', '==', churchId)));
      const members = existing.docs.map((d) => d.data());
      if (members.some((m: any) => m.email === form.email)) {
        alert('A member with this email already exists in this church.');
        setLoading(false);
        return;
      }

      const memberRef = doc(collection(db, 'churchMembers'));

      let photoUrl = '';
      if (photoFile) {
        try {
          const ext = photoFile.name.split('.').pop() || 'jpg';
          const path = 'churchMemberPhotos/' + churchId + '/' + memberRef.id + '.' + ext;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, photoFile);
          photoUrl = await getDownloadURL(fileRef);
        } catch (photoErr) {
          console.error('Photo upload failed (continuing without it):', photoErr);
        }
      }

      const ministryName = ministries.find((m) => m.id === form.ministryId)?.name || '';
      const groupName = groups.find((g) => g.id === form.groupId)?.name || '';
      const familyName = families.find((f) => f.id === form.familyId)?.name || '';
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();

      await setDoc(memberRef, {
        firstName: form.firstName,
        lastName: form.lastName,
        fullName,
        memberCode,
        photoUrl,
        phone: form.phone,
        email: form.email,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        status: form.status,
        address: { street: form.street, city: form.city, state: form.state, zip: form.zip, country: form.country },
        spouseName: form.spouseName,
        familyId: form.familyId || null,
        familyName: familyName || null,
        dateJoined: form.dateJoined,
        baptismDate: form.baptismDate,
        ministryId: form.ministryId || null,
        ministryName: ministryName || null,
        groupId: form.groupId || null,
        groupName: groupName || null,
        role: form.role,
        nationalId: form.nationalId,
        notes: form.notes,
        churchId,
        organizerId: user.uid,
        userId: null,
        inviteCode,
        createdAt: serverTimestamp(),
      });

      if (form.familyId) {
        try {
          await updateDoc(doc(db, 'churches', churchId, 'families', form.familyId), {
            memberIds: arrayUnion(memberRef.id),
            memberCount: increment(1),
            updatedAt: Date.now(),
          });
        } catch (famErr) {
          console.error('Could not attach member to family:', famErr);
        }
      }

      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: user.uid,
          category: 'Church Member',
          action: 'Added church member',
          user: user.email || '',
          details: fullName + ' - ' + memberCode,
          createdAt: serverTimestamp(),
        });
      } catch (auditErr) { /* silent — must never block member creation */ }

      if (!form.email) {
        setInviteStatus('no-email');
      } else {
        const inviteLink = 'https://unimunity.com/join-church/' + inviteCode;
        try {
          const inviteRes = await fetch('/api/send-church-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: [form.email], churchName: churchName || 'your church', inviteLink }),
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
      alert('Error adding member. Please try again.');
    }
    setLoading(false);
  };

  if (!mounted) return null;

  const pageBg = {
    minHeight: '100vh',
    background: `linear-gradient(120deg, ${C.pink} 0%, ${C.cream} 55%, ${C.green} 100%)`,
    padding: 24, boxSizing: 'border-box' as const,
  };

  if (success) {
    return (
      <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: C.white, borderRadius: 18, padding: '48px 40px', textAlign: 'center', maxWidth: 460, width: '100%', boxShadow: '0 8px 30px rgba(36,50,74,0.10)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 24 }}>&#10003;</div>
          <h2 style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>Member added successfully</h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 6px', lineHeight: 1.6 }}>
            An invitation has been sent to their email address.
          </p>
          <p style={{ fontSize: 12, color: C.goldText, fontWeight: 700, margin: '0 0 16px' }}>Member ID: {memberCode}</p>

          {inviteStatus === 'sent' && <div style={{ background: C.greenBg, color: C.greenText, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, margin: '0 0 20px' }}>Invitation email sent — they can now create their account.</div>}
          {inviteStatus === 'no-email' && <div style={{ background: C.amberBg, color: C.amberText, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, margin: '0 0 20px' }}>No email on file — no invitation was sent.</div>}
          {inviteStatus === 'failed' && <div style={{ background: C.dangerBg, color: C.danger, borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, margin: '0 0 20px' }}>Member added, but the invitation email could not be sent. You can resend it from the Members page.</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => router.push(`/dashboard/church/${churchId}/members`)} style={{ background: C.gold, color: C.text, border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>View Members</button>
            <button onClick={() => { setSuccess(false); setInviteStatus(null); resetForm(); }} style={{ background: C.cream, color: C.goldText, border: `1.5px solid ${C.gold}`, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Add Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => router.push(`/dashboard/church/${churchId}`)} style={{ background: 'rgba(216,177,90,0.14)', border: 'none', color: C.goldText, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '6px 12px', borderRadius: 999 }}>← Dashboard</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 800, color: C.text }}>Add Member</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>They will automatically receive an email invitation to create their account.</p>
        </div>

        {/* 1. Personal Information */}
        <div style={cardStyle}>
          <CardHeader title="Personal Information" subtitle="Basic information about the member." accent={C.pink} />
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div onClick={() => fileInputRef.current?.click()} style={{ width: 76, height: 76, borderRadius: '50%', background: C.cream, border: `1.5px dashed ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', backgroundImage: photoPreview ? `url(${photoPreview})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {!photoPreview && <span style={{ fontSize: 22 }}>📷</span>}
              </div>
              <span onClick={() => fileInputRef.current?.click()} style={{ fontSize: 11, color: C.goldText, fontWeight: 700, cursor: 'pointer' }}>Upload Photo</span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelected} style={{ display: 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: 260, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle} placeholder="First name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                {fieldError.firstName && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.danger }}>{fieldError.firstName}</p>}
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input style={inputStyle} placeholder="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                {fieldError.lastName && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.danger }}>{fieldError.lastName}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" placeholder="email@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                {fieldError.email && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.danger }}>{fieldError.email}</p>}
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input style={inputStyle} placeholder="+1 234 567 8900" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                {fieldError.phone && <p style={{ margin: '4px 0 0', fontSize: 11, color: C.danger }}>{fieldError.phone}</p>}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Date of Birth</label>
              <input style={inputStyle} type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select style={inputStyle} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g || 'Not specified'}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Marital Status</label>
              <select style={inputStyle} value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
                {MARITAL_OPTIONS.map((m) => <option key={m} value={m}>{m || 'Not specified'}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Member Status *</label>
              <select style={inputStyle} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {MEMBER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Contact Information + 3. Family Information side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <CardHeader title="Contact Information" subtitle="Current address and location." accent={C.green} />
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Street Address</label>
              <input style={inputStyle} placeholder="Optional" value={form.street} onChange={(e) => set('street', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} placeholder="Optional" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input style={inputStyle} placeholder="Optional" value={form.state} onChange={(e) => set('state', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Postal Code</label>
                <input style={inputStyle} placeholder="Optional" value={form.zip} onChange={(e) => set('zip', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input style={inputStyle} value={form.country} onChange={(e) => set('country', e.target.value)} />
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <CardHeader title="Family Information" subtitle="Link to a family and spouse, if any." accent={C.gold} />
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Spouse (if married)</label>
              <input style={inputStyle} placeholder="Spouse name" value={form.spouseName} onChange={(e) => set('spouseName', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Family</label>
              <select style={inputStyle} value={form.familyId} onChange={(e) => set('familyId', e.target.value)}>
                <option value="">Select or create a family</option>
                {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {!showNewFamily ? (
                <button onClick={() => setShowNewFamily(true)} style={{ marginTop: 8, background: 'transparent', border: `1.5px solid ${C.gold}`, color: C.goldText, borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                  + Create New Family
                </button>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Family name" value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} />
                  <button onClick={handleCreateFamily} disabled={creatingFamily} style={{ background: C.gold, border: 'none', color: C.text, borderRadius: 8, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {creatingFamily ? '…' : 'Add'}
                  </button>
                  <button onClick={() => { setShowNewFamily(false); setNewFamilyName(''); }} style={{ background: 'transparent', border: '1px solid #D1D5DB', color: '#4B5563', borderRadius: 8, padding: '0 10px', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Church Information + 5. Additional Information */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <CardHeader title="Church Information" subtitle="Involvement and role in the church." accent={C.pink} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Date Joined Church</label>
                <input style={inputStyle} type="date" value={form.dateJoined} onChange={(e) => set('dateJoined', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Baptism Date</label>
                <input style={inputStyle} type="date" value={form.baptismDate} onChange={(e) => set('baptismDate', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Ministry</label>
                <select style={inputStyle} value={form.ministryId} onChange={(e) => set('ministryId', e.target.value)}>
                  <option value="">Select ministry</option>
                  {ministries.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Group</label>
                <select style={inputStyle} value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
                  <option value="">Select group</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Role / Position</label>
                <select style={inputStyle} value={form.role} onChange={(e) => set('role', e.target.value)}>
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <CardHeader title="Additional Information" subtitle="Optional information and notes." accent={C.green} />
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>National ID Number (Optional)</label>
              <input style={inputStyle} placeholder="ID number" value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
              <p style={{ margin: '4px 0 0', fontSize: 10.5, color: C.muted }}>Protected — never shown to ordinary members.</p>
            </div>
            <div>
              <label style={labelStyle}>Notes (Optional)</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' as const }} rows={4} placeholder="Add any additional notes…" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => router.push(`/dashboard/church/${churchId}`)} style={{ background: 'transparent', border: `1.5px solid ${C.border}`, color: C.muted, borderRadius: 12, padding: '13px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: 14, background: C.gold, color: C.text, border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving member…' : 'Save Member'}
          </button>
        </div>

        {memberCode && (
          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: C.goldText, fontWeight: 700 }}>Member ID will be: {memberCode}</p>
        )}

        <div style={{ textAlign: 'center', marginTop: 26, fontSize: 11, color: C.muted }}>
          Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
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
