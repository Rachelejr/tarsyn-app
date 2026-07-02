'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const C = {
  bordeaux: '#6E93AC',
  bordeauxDark: '#4A6B85',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#1a1a1a',
  muted: '#6b7280',
  border: '#e5e7eb',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid ' + C.border,
  fontSize: 14, color: C.text, background: C.blanc, outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
};

const labelStyle = { fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, display: 'block', marginBottom: 6 };

export default function AddMemberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId') || '';

  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', country: '', memberType: 'Regular',
    role: 'member', position: '', payoutDate: '', expectedAmount: '0',
    currency: 'USD', status: 'pending', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tynId, setTynId] = useState('');
  const [nextPosition, setNextPosition] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = 'TYN-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    setTynId(id);
  }, []);

  useEffect(() => {
    if (!groupId) return;
    const fetchCount = async () => {
      const q = query(collection(db, 'members'), where('groupId', '==', groupId));
      const snap = await getDocs(q);
      setNextPosition(snap.size + 1);
      setForm(f => ({ ...f, position: String(snap.size + 1) }));
    };
    fetchCount();
  }, [groupId]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.fullName || !form.country) return alert('Full name and country are required.');
    if (!groupId) return alert('No group selected.');
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const existing = await getDocs(query(collection(db, 'members'), where('groupId', '==', groupId)));
      const members = existing.docs.map(d => d.data());
      if (form.email && members.some((m: any) => m.email === form.email && m.groupId === groupId)) {
        alert('A member with this email already exists in this group.');
        setLoading(false); return;
      }
      await addDoc(collection(db, 'members'), {
        ...form, tynId, groupId, organizerId: user.uid,
        position: parseInt(form.position) || nextPosition,
        expectedAmount: parseFloat(form.expectedAmount) || 0,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (e) { console.error(e); alert('Error adding member.'); }
    setLoading(false);
  };

  if (!mounted) return null;

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: C.blanc, borderRadius: 18, padding: '48px 40px', textAlign: 'center', maxWidth: 480, width: '90%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>+</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>Member added successfully</h2>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px', lineHeight: 1.6 }}>The member is now part of the active cycle.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard/contribution-log?groupId=' + groupId)}
              style={{ background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              View Register
            </button>
            <button onClick={() => { setSuccess(false); setForm({ fullName: '', phone: '', email: '', country: '', memberType: 'Regular', role: 'member', position: String(nextPosition + 1), payoutDate: '', expectedAmount: '0', currency: 'USD', status: 'pending', notes: '' }); }}
              style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px' }}>

        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
          Back to Dashboard
        </button>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 13, background: C.blanc, border: '1.5px solid ' + C.orLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: C.or }}>+</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Add Member</h1>
              <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>Add a new member to your organization. They will be integrated into the active cycle.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            <div style={{ background: C.blanc, border: '1.5px solid ' + C.orLight, borderRadius: 10, padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.or, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>TYN-ID</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{tynId}</span>
            </div>
            <div style={{ background: C.blanc, border: '1.5px solid ' + C.orLight, borderRadius: 10, padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.or, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Position</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>#{nextPosition} — Auto-assigned</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 18 }}>

            <div style={{ background: C.blanc, borderRadius: 16, padding: '24px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: C.or, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 18px', paddingBottom: 12, borderBottom: '1px solid ' + C.border }}>
                Personal Information
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Full Name *</label>
                  <input style={inputStyle} placeholder="Member full name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} placeholder="+1 234 567 8900" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Country *</label>
                  <select style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)}>
                    <option value="">Select country...</option>
                    <option>United States</option><option>Haiti</option><option>France</option>
                    <option>Canada</option><option>United Kingdom</option><option>Nigeria</option>
                    <option>Senegal</option><option>Ivory Coast</option><option>Cameroon</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Member Type</label>
                  <select style={inputStyle} value={form.memberType} onChange={e => set('memberType', e.target.value)}>
                    <option>Regular</option><option>Premium</option><option>Observer</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="member">Member</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="secretary">Secretary</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background: C.blanc, borderRadius: 16, padding: '24px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: C.or, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 18px', paddingBottom: 12, borderBottom: '1px solid ' + C.border }}>
                Contribution & Rotation
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Position *</label>
                  <input style={inputStyle} type="number" min="1" value={form.position} onChange={e => set('position', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Payout Date</label>
                  <input style={inputStyle} type="date" value={form.payoutDate} onChange={e => set('payoutDate', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Expected Amount</label>
                  <input style={inputStyle} type="number" min="0" step="0.01" value={form.expectedAmount} onChange={e => set('expectedAmount', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select style={inputStyle} value={form.currency} onChange={e => set('currency', e.target.value)}>
                    <option>USD</option><option>EUR</option><option>GBP</option>
                    <option>CAD</option><option>HTG</option><option>XOF</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <input style={inputStyle} placeholder="Optional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <button onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', padding: '14px', background: C.bordeaux, color: C.blanc, border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Adding member...' : 'Add Member'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
                <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Back to Dashboard</button>
              </div>
            </div>
          </div>

          <div style={{ background: C.blanc, borderRadius: 16, padding: '22px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'sticky' as const, top: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.or, textTransform: 'uppercase' as const, letterSpacing: 1, margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid ' + C.border }}>
              Member Summary
            </h3>
            {[
              { label: 'Name', value: form.fullName || '—' },
              { label: 'Country', value: form.country || '—' },
              { label: 'Currency', value: form.currency },
              { label: 'Amount', value: form.currency + ' ' + (parseFloat(form.expectedAmount) || 0).toFixed(2) },
              { label: 'Position', value: '#' + (form.position || nextPosition) },
              { label: 'Status', value: form.status.charAt(0).toUpperCase() + form.status.slice(1) },
              { label: 'Role', value: form.role.charAt(0).toUpperCase() + form.role.slice(1) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9f9f9' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, maxWidth: 140, textAlign: 'right' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '10px 14px', background: C.creme, borderRadius: 10, border: '1px solid ' + C.orLight }}>
              <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>TYN-ID: <strong style={{ color: C.text }}>{tynId}</strong></p>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 40, letterSpacing: 0.3 }}>
          Powered by TARSYN™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
        </p>
      </div>
    </div>
  );
}
