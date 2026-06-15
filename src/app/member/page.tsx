'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function MemberDashboard() {
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', country: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          const role = userDoc.data()?.role;
          if (role === 'admin' || role === 'superadmin' || role === 'organizer') {
            router.push('/dashboard');
            return;
          }
        }
        const mq = query(collection(db, 'members'), where('userId', '==', u.uid));
        const ms = await getDocs(mq);
        if (!ms.empty) {
          const data = { id: ms.docs[0].id, ...ms.docs[0].data() } as any;
          setMember(data);
          setEditForm({ name: data.name || '', phone: data.phone || '', email: data.email || '', country: data.country || '' });
          const gs = await getDocs(collection(db, 'groups'));
          const gDoc = gs.docs.find(d => d.id === data.groupId);
          if (gDoc) setGroup({ id: gDoc.id, ...gDoc.data() });
          const pq = query(collection(db, 'payments'), where('memberId', '==', ms.docs[0].id));
          const ps = await getDocs(pq);
          setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSave = async () => {
    if (!member?.id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'members', member.id), editForm);
      setMember({ ...member, ...editForm });
      setEditMode(false);
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>, paymentId: string) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setUploadMsg('Only PDF, JPG or PNG files accepted.');
      setTimeout(() => setUploadMsg(''), 4000);
      return;
    }
    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const storageRef = ref(storage, `payment-proofs/${user.uid}/${paymentId}-${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'payments', paymentId), {
        proofUrl: downloadURL,
        proofStatus: 'pending',
        proofUploadedAt: serverTimestamp(),
      });
      setUploadMsg('✅ Proof uploaded! Waiting for admin validation.');
      setTimeout(() => setUploadMsg(''), 5000);
    } catch (err) {
      console.error(err);
      setUploadMsg('Error uploading. Please try again.');
      setTimeout(() => setUploadMsg(''), 4000);
    }
    setUploading(false);
  };

  const printReceipt = (p: any) => {
    const receiptNum = p.receiptNumber || `TR-${new Date().getFullYear()}-${p.id?.slice(-6).toUpperCase()}`;
    const content = `
      <html><head><title>Receipt ${receiptNum}</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 40px; color: #2C1A3E; }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { font-size: 28px; font-weight: 900; color: #6B2D4E; letter-spacing: 4px; }
        .subtitle { color: #D4AF7A; font-size: 12px; letter-spacing: 2px; }
        .receipt-num { font-size: 18px; font-weight: 700; color: #6B2D4E; margin: 16px 0; }
        .divider { border: 1px solid #E8D5E0; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #FAF0E6; }
        .label { color: #7A5068; font-size: 13px; }
        .value { color: #2C1A3E; font-weight: 600; font-size: 13px; }
        .amount { font-size: 24px; font-weight: 900; color: #6B2D4E; text-align: center; margin: 20px 0; }
        .status { text-align: center; background: #E8F5E9; color: #2E7D32; padding: 8px 20px; border-radius: 20px; display: inline-block; font-weight: 700; }
        .footer { text-align: center; margin-top: 40px; color: #7A5068; font-size: 12px; }
      </style></head><body>
      <div class="header">
        <div class="logo">TARSYN</div>
        <div class="subtitle">YOUR COMMUNITY. YOUR POWER.</div>
        <div class="receipt-num">Receipt ${receiptNum}</div>
      </div>
      <div class="divider"></div>
      <div class="amount">${p.amount} ${p.currency || ''}</div>
      <div style="text-align:center;margin-bottom:20px"><span class="status">${p.status || 'confirmed'}</span></div>
      <div class="divider"></div>
      ${[
        ['TYN-ID', member?.tynId],
        ['Member Name', member?.name],
        ['Group Name', group?.name || 'N/A'],
        ['Payment Date', p.paymentDate || 'N/A'],
        ['Payment Method', p.paymentMethod || 'N/A'],
        ['Transaction ID', p.id?.slice(-10).toUpperCase() || 'N/A'],
        ['Generated Date', new Date().toLocaleDateString()],
      ].map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v}</span></div>`).join('')}
      <div class="footer">
        <p>This receipt was generated automatically by TARSYN.</p>
        <p>Receipts cannot be modified.</p>
      </div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(content); win.document.close(); win.print(); }
  };

  const val = (v: any) => (v && v !== '') ? v : 'Not provided';
  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
  const expectedAmount = group?.contributionSettings?.amount || member?.expectedAmount || 0;
  const remaining = Math.max(0, expectedAmount - totalPaid);

  const statusColor = (s: string) => {
    if (s === 'active') return { bg: '#E8F5E9', color: '#2E7D32' };
    if (s === 'pending') return { bg: '#FFF3E0', color: '#E65100' };
    return { bg: '#FAF0E6', color: '#7A5068' };
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'contributions', label: 'Contributions', icon: '💰' },
    { id: 'rotation', label: 'Rotation', icon: '🔄' },
    { id: 'group', label: 'Group', icon: '🏘️' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6' }}>
      <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading your account...</p>
    </div>
  );

  if (!member) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>🔍</div>
      <h2 style={{ color: '#6B2D4E', fontSize: '22px', fontWeight: 800, margin: 0 }}>No membership found</h2>
      <p style={{ color: '#7A5068', fontSize: '14px', margin: 0 }}>You are not registered as a member in any group.</p>
      <button onClick={() => router.push('/')} style={{ background: '#6B2D4E', color: '#FAF0E6', padding: '12px 24px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Go Home</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', fontFamily: 'Inter, sans-serif' }}>

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ fontWeight: 900, fontSize: '20px', color: '#6B2D4E', letterSpacing: '3px', margin: 0 }}>TARSYN</p>
              <p style={{ color: '#D4AF7A', fontSize: '10px', letterSpacing: '2px', margin: '4px 0 0' }}>YOUR COMMUNITY. YOUR POWER.</p>
              <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '16px', margin: '12px 0 0' }}>
                Receipt {selectedReceipt.receiptNumber || `TR-${new Date().getFullYear()}-${selectedReceipt.id?.slice(-6).toUpperCase()}`}
              </p>
            </div>
            <div style={{ background: '#FAF0E6', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ color: '#6B2D4E', fontSize: '28px', fontWeight: 900, margin: '0 0 8px' }}>{selectedReceipt.amount} {selectedReceipt.currency}</p>
              <span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{selectedReceipt.status || 'confirmed'}</span>
            </div>
            {[
              ['TYN-ID', member.tynId],
              ['Member Name', member.name],
              ['Group Name', group?.name || 'N/A'],
              ['Payment Date', selectedReceipt.paymentDate || 'N/A'],
              ['Payment Method', selectedReceipt.paymentMethod || 'N/A'],
              ['Transaction ID', selectedReceipt.id?.slice(-10).toUpperCase() || 'N/A'],
              ['Generated Date', new Date().toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #FAF0E6' }}>
                <span style={{ color: '#7A5068', fontSize: '13px' }}>{label}</span>
                <span style={{ color: '#2C1A3E', fontWeight: 600, fontSize: '13px' }}>{value}</span>
              </div>
            ))}
            <p style={{ color: '#7A5068', fontSize: '11px', textAlign: 'center', margin: '16px 0' }}>
              This receipt was generated automatically by TARSYN. Receipts cannot be modified.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setSelectedReceipt(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', color: '#6B2D4E', border: '2px solid #6B2D4E', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
              <button onClick={() => printReceipt(selectedReceipt)}
                style={{ flex: 1, padding: '10px', background: '#6B2D4E', color: '#FAF0E6', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ background: '#6B2D4E', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ color: '#D4AF7A', fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
          <div style={{ color: 'rgba(250,240,230,0.6)', fontSize: '10px', letterSpacing: '2px' }}>MEMBER PORTAL</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#D4AF7A', fontSize: '12px', fontWeight: 600, fontFamily: 'monospace', background: 'rgba(212,175,122,0.2)', borderRadius: '20px', padding: '6px 14px' }}>{member.tynId}</span>
          <button onClick={() => auth.signOut().then(() => router.push('/login'))} style={{ background: 'transparent', border: '1px solid rgba(212,175,122,0.5)', color: '#D4AF7A', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Sign Out</button>
        </div>
      </nav>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1A3A)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ color: 'rgba(250,240,230,0.6)', fontSize: '13px', margin: '0 0 4px' }}>Welcome back</p>
            <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>{member.name}</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ ...statusColor(member.status), padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{member.status || 'active'}</span>
              <span style={{ background: 'rgba(212,175,122,0.2)', color: '#D4AF7A', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Position #{member.position}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px 24px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(250,240,230,0.6)', fontSize: '11px', margin: '0 0 4px', letterSpacing: '1px' }}>TYN-ID</p>
            <p style={{ color: '#D4AF7A', fontSize: '16px', fontWeight: 800, margin: 0, fontFamily: 'monospace' }}>{member.tynId}</p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ maxWidth: '800px', margin: '16px auto 0', padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
          {[
            { label: 'Total Paid', value: `${totalPaid} ${group?.contributionSettings?.currency || ''}`, icon: '✅', color: '#2E7D32', bg: '#E8F5E9' },
            { label: 'Next Payment', value: member.nextPayment || 'Not set', icon: '📅', color: '#1565C0', bg: '#E3F2FD' },
            { label: 'Payout Date', value: member.payoutDate || 'Not set', icon: '🎯', color: '#6B2D4E', bg: '#FAF0E6' },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: '14px', padding: '14px 16px' }}>
              <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>{s.icon}</span>
              <p style={{ color: '#7A5068', fontSize: '10px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</p>
              <p style={{ color: s.color, fontSize: '14px', fontWeight: 800, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div style={{ background: 'white', borderBottom: '1px solid #E8D5E0', position: 'sticky', top: 0, zIndex: 50, marginTop: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: activeTab === tab.id ? '#6B2D4E' : '#7A5068', borderBottom: activeTab === tab.id ? '3px solid #6B2D4E' : '3px solid transparent', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        {saveMsg && <div style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontWeight: 600 }}>✅ {saveMsg}</div>}
        {uploadMsg && <div style={{ background: uploadMsg.includes('✅') ? '#E8F5E9' : '#FFEBEE', color: uploadMsg.includes('✅') ? '#2E7D32' : '#C62828', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontWeight: 600 }}>{uploadMsg}</div>}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 700, margin: 0 }}>👤 My Profile</h3>
              {!editMode && <button onClick={() => setEditMode(true)} style={{ background: '#FAF0E6', color: '#6B2D4E', border: '1px solid #D4AF7A', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Edit Profile</button>}
            </div>
            {!editMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Full Name', value: val(member.name) },
                  { label: 'TYN-ID', value: val(member.tynId), mono: true },
                  { label: 'Country', value: val(member.country) },
                  { label: 'Phone', value: val(member.phone) },
                  { label: 'Email', value: val(member.email) },
                  { label: 'Position', value: `#${member.position}` },
                  { label: 'Role', value: val(member.role) },
                  { label: 'Member Type', value: val(member.memberType) },
                  { label: 'Status', value: val(member.status) },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FAF0E6', borderRadius: '12px', padding: '14px 16px' }}>
                    <p style={{ color: '#7A5068', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</p>
                    <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '14px', margin: 0, fontFamily: (item as any).mono ? 'monospace' : 'inherit' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ background: '#FFF8E7', border: '1px solid #D4AF7A', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#7A5068' }}>
                  TYN-ID, Position, Role, Status and Member Type cannot be changed.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {[{ label: 'Full Name', key: 'name' }, { label: 'Phone', key: 'phone' }, { label: 'Email', key: 'email' }, { label: 'Country', key: 'country' }].map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', color: '#7A5068', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{field.label}</label>
                      <input value={(editForm as any)[field.key]} onChange={e => setEditForm({ ...editForm, [field.key]: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #D4AF7A', borderRadius: '10px', fontSize: '14px', color: '#333', background: '#FAF0E6', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#6B2D4E', border: '2px solid #6B2D4E', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', background: '#6B2D4E', color: '#FAF0E6', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTRIBUTIONS */}
        {activeTab === 'contributions' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 700, margin: '0 0 20px' }}>💳 Payment History</h3>
            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#7A5068' }}>
                <p style={{ fontSize: '32px', margin: '0 0 8px' }}>💸</p>
                <p style={{ fontSize: '14px', margin: 0 }}>No payments recorded yet.</p>
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #FAF0E6' }}>
                      {['Amount', 'Method', 'Date', 'Status', 'Receipt', 'Proof'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#7A5068', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #FAF0E6', background: i % 2 === 0 ? 'transparent' : '#FDFAF7' }}>
                        <td style={{ padding: '10px', color: '#2E7D32', fontWeight: 700, fontSize: '13px' }}>{p.amount} {p.currency}</td>
                        <td style={{ padding: '10px', color: '#7A5068', fontSize: '12px' }}>{p.paymentMethod || 'Not provided'}</td>
                        <td style={{ padding: '10px', color: '#7A5068', fontSize: '12px' }}>{p.paymentDate || 'Not provided'}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ background: p.status === 'confirmed' ? '#E8F5E9' : '#FFF3E0', color: p.status === 'confirmed' ? '#2E7D32' : '#E65100', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{p.status || 'pending'}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <button onClick={() => setSelectedReceipt(p)}
                            style={{ background: '#FAF0E6', color: '#6B2D4E', border: '1px solid #D4AF7A', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                            🧾 View
                          </button>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {p.proofUrl ? (
                            <span style={{ background: p.proofStatus === 'verified' ? '#E8F5E9' : '#FFF3E0', color: p.proofStatus === 'verified' ? '#2E7D32' : '#E65100', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                              {p.proofStatus === 'verified' ? '✅ Verified' : '⏳ Pending'}
                            </span>
                          ) : (
                            <label style={{ cursor: 'pointer' }}>
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUploadProof(e, p.id)} style={{ display: 'none' }} />
                              <span style={{ background: '#E3F2FD', color: '#1565C0', border: '1px solid #1565C0', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                {uploading ? '...' : '📎 Upload'}
                              </span>
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => {
                    const csv = ['Amount,Currency,Method,Date,Status']
                      .concat(payments.map(p => `${p.amount},${p.currency},${p.paymentMethod || ''},${p.paymentDate || ''},${p.status || ''}`))
                      .join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `contributions-${member.tynId}.csv`; a.click();
                  }} style={{ background: '#FAF0E6', color: '#6B2D4E', border: '1px solid #D4AF7A', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    📥 Export CSV
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ROTATION */}
        {activeTab === 'rotation' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 700, margin: '0 0 16px' }}>🔄 My Rotation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#FAF0E6', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ color: '#7A5068', fontSize: '11px', margin: '0 0 4px' }}>My Position</p>
                <p style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: 0 }}>#{member.position}</p>
              </div>
              <div style={{ background: '#FAF0E6', borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ color: '#7A5068', fontSize: '11px', margin: '0 0 4px' }}>Payout Date</p>
                <p style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 800, margin: 0 }}>{member.payoutDate || 'Not set'}</p>
              </div>
            </div>
          </div>
        )}

        {/* GROUP */}
        {activeTab === 'group' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 700, margin: '0 0 20px' }}>🏘️ Group Information</h3>
            {group ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { label: 'Group Name', value: val(group.name) },
                  { label: 'Total Members', value: val(group.numMembers || group.memberCount) },
                  { label: 'Frequency', value: val(group.frequency) },
                  { label: 'Status', value: val(group.status) },
                ].map(item => (
                  <div key={item.label} style={{ background: '#FAF0E6', borderRadius: '12px', padding: '14px 16px' }}>
                    <p style={{ color: '#7A5068', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</p>
                    <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '14px', margin: 0 }}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#7A5068', fontSize: '14px' }}>Group information not available.</p>}
          </div>
        )}

        {/* ALERTS */}
        {activeTab === 'alerts' && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 700, margin: '0 0 20px' }}>🔔 My Alerts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#E3F2FD', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>👋</span>
                <div>
                  <p style={{ color: '#1565C0', fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>Welcome to TARSYN!</p>
                  <p style={{ color: '#1976D2', fontSize: '13px', margin: 0 }}>Your membership is active.</p>
                </div>
              </div>
              {remaining > 0 && (
                <div style={{ background: '#FFF3E0', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⏰</span>
                  <div>
                    <p style={{ color: '#E65100', fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>Payment Reminder</p>
                    <p style={{ color: '#EF6C00', fontSize: '13px', margin: 0 }}>Amount remaining: <strong>{remaining}</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}