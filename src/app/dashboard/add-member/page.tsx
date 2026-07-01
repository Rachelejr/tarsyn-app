'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const COUNTRIES = [
  'Haiti','Canada','United States','France','Belgium','Switzerland',
  'Senegal','Ivory Coast','Cameroon','Congo','Mali','Guinea',
  'Togo','Benin','Burkina Faso','Madagascar','Martinique','Guadeloupe',
  'United Kingdom','Germany','Italy','Spain','Portugal','Brazil',
  'Mexico','Colombia','Jamaica','Trinidad','Other'
];

const inputStyle = { width: '100%', padding: '8px 11px', border: '1.5px solid #E8D5E0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, background: 'white' };
const labelStyle = { display: 'block', color: '#6B2D4E', fontSize: '12px', fontWeight: 600, marginBottom: '3px' };
const sectionTitle = { color: '#C8A24B', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' };

export default function AddMember() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [position, setPosition] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [memberType, setMemberType] = useState('Regular');
  const [role, setRole] = useState('member');
  const [status, setStatus] = useState('pending');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedMember, setSavedMember] = useState<any>(null);
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setAdminName(user.displayName || user.email?.split('@')[0] || 'Admin');
      const q = query(collection(db, 'groups'), where('organizerId', '==', user.uid));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const gId = snap.docs[0].id;
      setGroupId(gId);
      setGroupName(snap.docs[0].data().name || 'TARSYN Group');
      const mq = query(collection(db, 'members'), where('organizerId', '==', user.uid));
      const ms = await getDocs(mq);
      setExistingMembers(ms.docs.map(d => ({ id: d.id, ...d.data() })));
      setMemberCount(ms.docs.length);
      setPosition(String(ms.docs.length + 1));
    };
    load();
  }, []);

  const generateTynId = (countryCode: string, count: number) => {
    const code = countryCode.substring(0, 2).toUpperCase();
    const seq = String(count + 1).padStart(6, '0');
    return `TYN-${code}-${seq}`;
  };

  const validate = () => {
    setError('');
    if (name.trim().length < 2) { setError('Name must be at least 2 characters.'); return false; }
    if (!country) { setError('Country is required.'); return false; }
    if (!position || parseInt(position) < 1) { setError('Position must be a positive number.'); return false; }
    if (!payoutDate) { setError('Payout date is required.'); return false; }
    const dupPosition = existingMembers.find(m => m.position === parseInt(position) && m.groupId === groupId);
    if (dupPosition) { setError(`Position ${position} is already taken by ${dupPosition.name}.`); return false; }
    if (email) {
      const dupEmail = existingMembers.find(m => m.email === email.trim() && m.groupId === groupId);
      if (dupEmail) { setError(`Email already used by ${dupEmail.name} in this group.`); return false; }
    }
    if (phone) {
      const dupPhone = existingMembers.find(m => m.phone === phone.trim() && m.groupId === groupId);
      if (dupPhone) { setError(`Phone already used by ${dupPhone.name} in this group.`); return false; }
    }
    return true;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }
      const countryCode = country.substring(0, 2).toUpperCase();
      const tynId = generateTynId(countryCode, memberCount);
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const inviteLink = `${window.location.origin}/join/${inviteCode}`;

      const memberData = {
        groupId,
        organizerId: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        country,
        position: parseInt(position),
        payoutDate,
        memberType,
        role,
        status,
        expectedAmount: expectedAmount ? parseFloat(expectedAmount) : null,
        currency,
        tynId,
        inviteCode,
        notes: notes.trim(),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'members'), memberData);
      setSavedMember({ ...memberData, tynId });

      if (email.trim()) {
        const res = await fetch('/api/invite-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberEmail: email.trim(),
            memberName: name.trim(),
            groupName,
            inviteCode,
            inviteLink,
            adminName,
            tynId,
          }),
        });
        if (!res.ok) {
          console.error('Failed to send invitation email');
        }
      }

      setName(''); setPhone(''); setEmail(''); setCountry('');
      setPayoutDate(''); setNotes(''); setExpectedAmount('');
      setMemberCount(prev => prev + 1);
      setPosition(String(memberCount + 2));
    } catch (e) {
      console.error(e);
      setError('Error adding member. Please try again.');
    }
    setLoading(false);
  };

  if (savedMember) return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '18px', padding: '28px', maxWidth: '420px', width: '100%', boxShadow: '0 8px 32px rgba(107,45,78,0.12)', textAlign: 'center' }}>
        <div style={{ fontSize: '38px', marginBottom: '8px' }}>✅</div>
        <h2 style={{ color: '#6B2D4E', fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>Member Added!</h2>
        <p style={{ color: '#7A5068', fontSize: '12.5px', margin: '0 0 14px' }}>
          {savedMember.email ? `✉️ Invitation sent to ${savedMember.email}` : 'No email provided — share the invite code manually.'}
        </p>
        <div style={{ background: '#FAF0E6', borderRadius: '12px', padding: '12px', margin: '14px 0', textAlign: 'left' }}>
          <p style={{ margin: '0 0 4px', color: '#2C1A3E', fontWeight: 700, fontSize: '14px' }}>{savedMember.name}</p>
          <p style={{ margin: '0 0 3px', color: '#7A5068', fontSize: '12px' }}>TYN-ID: <strong style={{ color: '#6B2D4E', fontFamily: 'monospace' }}>{savedMember.tynId}</strong></p>
          <p style={{ margin: '0 0 3px', color: '#7A5068', fontSize: '12px' }}>Country: {savedMember.country}</p>
          <p style={{ margin: '0 0 3px', color: '#7A5068', fontSize: '12px' }}>Position: #{savedMember.position}</p>
          <p style={{ margin: '0 0 3px', color: '#7A5068', fontSize: '12px' }}>Invite Code: <strong style={{ color: '#6B2D4E', fontFamily: 'monospace' }}>{savedMember.inviteCode}</strong></p>
          <p style={{ margin: 0, color: '#7A5068', fontSize: '12px' }}>Status: <span style={{ background: '#FFF3E0', color: '#E65100', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{savedMember.status}</span></p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setSavedMember(null)}
            style={{ flex: 1, background: '#6B2D4E', color: '#FAF0E6', padding: '10px', borderRadius: '9px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Add Another
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ flex: 1, background: '#FAF0E6', color: '#6B2D4E', padding: '10px', borderRadius: '9px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .tn-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .tn-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 900px) { .tn-grid3 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .tn-grid3, .tn-grid2 { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <div onClick={() => router.push('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6B2D4E', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '14px' }}>
          ← Back to Dashboard
        </div>

        <div style={{ background: 'white', borderRadius: '18px', padding: '24px 28px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>
          <h1 style={{ color: '#6B2D4E', fontSize: '20px', fontWeight: 800, margin: '0 0 2px' }}>Add Member</h1>
          <p style={{ color: '#7A5068', fontSize: '12px', margin: '0 0 16px' }}>TYN-ID generated automatically · Position {position} auto-assigned</p>

          {error && <p style={{ color: '#E53935', fontSize: '12px', marginBottom: '12px', background: '#FFEBEE', padding: '8px 12px', borderRadius: '8px' }}>{error}</p>}

          <p style={sectionTitle}>👤 Personal Information</p>
          <div className="tn-grid3" style={{ marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Member full name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Country *</label>
              <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
                <option value="">Select country...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Member Type</label>
              <select value={memberType} onChange={e => setMemberType(e.target.value)} style={inputStyle}>
                {['Regular', 'VIP', 'Founder', 'Organizer', 'Guest'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                {['member', 'assistant', 'secretary', 'treasurer', 'auditor'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div style={{ height: '1px', background: '#F4E8D8', margin: '14px 0' }} />

          <p style={sectionTitle}>🔄 Payout & Contribution</p>
          <div className="tn-grid3" style={{ marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Position *</label>
              <input value={position} onChange={e => setPosition(e.target.value)} type="number" min="1" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payout Date *</label>
              <input value={payoutDate} onChange={e => setPayoutDate(e.target.value)} type="date" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Expected Amount</label>
              <input value={expectedAmount} onChange={e => setExpectedAmount(e.target.value)} type="number" min="0" placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                {['USD', 'CAD', 'EUR', 'GBP', 'HTG', 'XOF', 'XAF', 'BRL'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." style={inputStyle} />
            </div>
          </div>

          <button onClick={handleAdd} disabled={loading}
            style={{ width: '100%', background: loading ? '#9B6B8E' : '#6B2D4E', color: '#FAF0E6', padding: '11px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}