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
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'groups'), where('organizerId', '==', user.uid));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const gId = snap.docs[0].id;
      setGroupId(gId);
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
    const dupPosition = existingMembers.find(m => m.position === parseInt(position));
    if (dupPosition) { setError(`Position ${position} is already taken by ${dupPosition.name}.`); return false; }
    if (email) {
      const dupEmail = existingMembers.find(m => m.email === email.trim());
      if (dupEmail) { setError(`Email already used by ${dupEmail.name}.`); return false; }
    }
    if (phone) {
      const dupPhone = existingMembers.find(m => m.phone === phone.trim());
      if (dupPhone) { setError(`Phone already used by ${dupPhone.name}.`); return false; }
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
        const gq = query(collection(db, 'groups'), where('organizerId', '==', user.uid));
        const gs = await getDocs(gq);
        const groupName = gs.empty ? 'TARSYN Group' : gs.docs[0].data().name;
        await fetch('/api/invite-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            name: name.trim(),
            tynId,
            groupName,
            inviteCode,
          }),
        });
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
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '480px', width: '100%', boxShadow: '0 8px 32px rgba(107,45,78,0.12)', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>Member Added!</h2>
        <div style={{ background: '#FAF0E6', borderRadius: '16px', padding: '20px', margin: '24px 0', textAlign: 'left' }}>
          <p style={{ margin: '0 0 8px', color: '#2C1A3E', fontWeight: 700, fontSize: '16px' }}>{savedMember.name}</p>
          <p style={{ margin: '0 0 6px', color: '#7A5068', fontSize: '13px' }}>TYN-ID: <strong style={{ color: '#6B2D4E', fontFamily: 'monospace' }}>{savedMember.tynId}</strong></p>
          <p style={{ margin: '0 0 6px', color: '#7A5068', fontSize: '13px' }}>Country: {savedMember.country}</p>
          <p style={{ margin: '0 0 6px', color: '#7A5068', fontSize: '13px' }}>Position: #{savedMember.position}</p>
          <p style={{ margin: '0 0 6px', color: '#7A5068', fontSize: '13px' }}>Payout Date: {savedMember.payoutDate}</p>
          <p style={{ margin: '0 0 6px', color: '#7A5068', fontSize: '13px' }}>Invite Code: <strong style={{ color: '#6B2D4E', fontFamily: 'monospace' }}>{savedMember.inviteCode}</strong></p>
          <p style={{ margin: 0, color: '#7A5068', fontSize: '13px' }}>Status: <span style={{ background: '#FFF3E0', color: '#E65100', padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{savedMember.status}</span></p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setSavedMember(null)}
            style={{ flex: 1, background: '#6B2D4E', color: '#FAF0E6', padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Add Another
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ flex: 1, background: '#FAF0E6', color: '#6B2D4E', padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>

          <div onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
            <div style={{ width: '32px', height: '32px', background: '#6B2D4E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF7A', fontWeight: 800, fontSize: '13px' }}>T</div>
            <span style={{ color: '#6B2D4E', fontWeight: 800, fontSize: '16px' }}>TARSYN</span>
          </div>

          <h1 style={{ color: '#6B2D4E', fontSize: '28px', fontWeight: 800, margin: '0 0 4px' }}>Add Member</h1>
          <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 32px' }}>TYN-ID generated automatically • Position {position} auto-assigned</p>

          {error && <p style={{ color: '#E53935', fontSize: '13px', marginBottom: '16px', background: '#FFEBEE', padding: '10px 14px', borderRadius: '8px' }}>{error}</p>}

          <p style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>Identity</p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Member full name"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Country *</label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
              <option value="">Select country...</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Member Type</label>
              <select value={memberType} onChange={e => setMemberType(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                {['Regular', 'VIP', 'Founder', 'Organizer', 'Guest'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                {['member', 'assistant', 'secretary', 'treasurer', 'auditor'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <p style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>Payout</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Position *</label>
              <input value={position} onChange={e => setPosition(e.target.value)} type="number" min="1"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Payout Date *</label>
              <input value={payoutDate} onChange={e => setPayoutDate(e.target.value)} type="date"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <p style={{ color: '#6B2D4E', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>Contribution</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Expected Amount</label>
              <input value={expectedAmount} onChange={e => setExpectedAmount(e.target.value)} type="number" min="0" placeholder="0.00"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                {['USD', 'CAD', 'EUR', 'GBP', 'HTG', 'XOF', 'XAF', 'BRL'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={3}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8D5E0', borderRadius: '10px', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handleAdd} disabled={loading}
            style={{ width: '100%', background: loading ? '#9B6B8E' : '#6B2D4E', color: '#FAF0E6', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>

          <button onClick={() => router.push('/dashboard')}
            style={{ width: '100%', background: 'transparent', color: '#7A5068', padding: '12px', borderRadius: '12px', border: 'none', fontSize: '14px', cursor: 'pointer', marginTop: '12px' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}