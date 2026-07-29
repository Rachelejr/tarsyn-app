'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import TrialGuard from '@/components/TrialGuard';
import DateTimeWeather from '@/components/DateTimeWeather';

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;
    startRef.current = null;
    let raf = 0;
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function StatCard({ label, value, icon, gradient, glow, delay }: { label: string; value: number | string; icon: string; gradient: string; glow: string; delay: number }) {
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);
  return (
    <div
      className="stat-card fade-up"
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 4px 16px rgba(107,45,78,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          boxShadow: `0 5px 14px ${glow}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ color: '#C4748E', fontSize: '10px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '1.1px', fontWeight: 700 }}>{label}</p>
        <p style={{ color: '#4A1F38', fontSize: '21px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          {isNumeric ? animated : value}
        </p>
      </div>
    </div>
  );
}

function OverviewContent() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [groupEditName, setGroupEditName] = useState('');
  const [groupEditFrequency, setGroupEditFrequency] = useState('Weekly');
  const [groupEditAmount, setGroupEditAmount] = useState('');
  const [groupEditCurrency, setGroupEditCurrency] = useState('USD');
  const [groupEditRegion, setGroupEditRegion] = useState('');
  const [groupEditStartDate, setGroupEditStartDate] = useState('');
  const [groupEditStatus, setGroupEditStatus] = useState('active');
  const [groupEditDescription, setGroupEditDescription] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [validatingProof, setValidatingProof] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberEditName, setMemberEditName] = useState('');
  const [memberEditPayoutDate, setMemberEditPayoutDate] = useState('');
  const [memberEditAmount, setMemberEditAmount] = useState('');
  const [memberEditCurrency, setMemberEditCurrency] = useState('USD');
  const [memberEditPhone, setMemberEditPhone] = useState('');
  const [memberEditEmail, setMemberEditEmail] = useState('');
  const [memberEditCountry, setMemberEditCountry] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const [userSnap, gsnap, msnap, psnap] = await Promise.all([
          getDoc(doc(db, 'users', u.uid)),
          getDocs(query(collection(db, 'groups'), where('organizerId', '==', u.uid))),
          getDocs(query(collection(db, 'members'), where('organizerId', '==', u.uid))),
          getDocs(query(collection(db, 'payments'), where('organizerId', '==', u.uid))),
        ]);

        const role = userSnap.exists() ? userSnap.data().role : null;
        setIsPlatformAdmin(role === 'admin' || role === 'superadmin');

        setGroups(gsnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setMembers(msnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPayments(psnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSaveGroup = async () => {
    if (!editingGroup || !groupEditName.trim()) return;
    setSavingGroup(true);
    try {
      const updates = {
        name: groupEditName.trim(),
        frequency: groupEditFrequency,
        contribution: parseFloat(groupEditAmount) || 0,
        amountPerMember: parseFloat(groupEditAmount) || 0,
        currency: groupEditCurrency,
        region: groupEditRegion.trim(),
        startDate: groupEditStartDate || null,
        status: groupEditStatus,
        description: groupEditDescription.trim(),
      };
      await updateDoc(doc(db, 'groups', editingGroup.id), updates);
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, ...updates } : g));
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await addDoc(collection(db, 'audit_logs'), {
            organizerId: currentUser.uid, category: 'Group',
            action: 'Edited group', user: currentUser.email || '',
            details: groupEditName.trim(), createdAt: serverTimestamp(),
          });
        }
      } catch (auditErr) { /* silent - audit logging must never block group edit */ }
      setEditingGroup(null);
      setGroupEditName('');
      setGroupEditFrequency('Weekly');
      setGroupEditAmount('');
      setGroupEditCurrency('USD');
      setGroupEditRegion('');
      setGroupEditStartDate('');
      setGroupEditStatus('active');
      setGroupEditDescription('');
    } catch (e) { console.error(e); }
    setSavingGroup(false);
  };

  const handleSaveMember = async () => {
    if (!editingMember || !memberEditName.trim()) return;
    setSavingMember(true);
    try {
      const updates = {
        name: memberEditName.trim(),
        fullName: memberEditName.trim(),
        payoutDate: memberEditPayoutDate || null,
        expectedAmount: parseFloat(memberEditAmount) || 0,
        currency: memberEditCurrency,
        phone: memberEditPhone.trim(),
        email: memberEditEmail.trim(),
        country: memberEditCountry,
      };
      await updateDoc(doc(db, 'members', editingMember.id), updates);
      setMembers(members.map(m => m.id === editingMember.id ? { ...m, ...updates } : m));
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await addDoc(collection(db, 'audit_logs'), {
            organizerId: currentUser.uid, category: 'Member',
            action: 'Edited member', user: currentUser.email || '',
            details: memberEditName.trim(), createdAt: serverTimestamp(),
          });
        }
      } catch (auditErr) { /* silent - audit logging must never block member edit */ }
      setEditingMember(null);
      setMemberEditName('');
      setMemberEditPayoutDate('');
      setMemberEditAmount('');
      setMemberEditCurrency('USD');
      setMemberEditPhone('');
      setMemberEditEmail('');
      setMemberEditCountry('');
    } catch (e) { console.error(e); }
    setSavingMember(false);
  };

  const handleUpdateStatus = async (memberId: string, newStatus: string) => {
    setUpdatingMember(memberId);
    try {
      await updateDoc(doc(db, 'members', memberId), { status: newStatus });
      setMembers(members.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
      try {
        const currentUser = auth.currentUser;
        const targetMember = members.find(m => m.id === memberId);
        if (currentUser) {
          await addDoc(collection(db, 'audit_logs'), {
            organizerId: currentUser.uid, category: 'Member',
            action: newStatus === 'active' ? 'Activated member' : 'Paused member',
            user: currentUser.email || '',
            details: (targetMember?.name || targetMember?.fullName || memberId),
            createdAt: serverTimestamp(),
          });
        }
      } catch (auditErr) { /* silent - audit logging must never block status update */ }
    } catch (e) { console.error(e); }
    setUpdatingMember(null);
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to delete ${memberName}?`)) return;
    setDeletingMember(memberId);
    try {
      await deleteDoc(doc(db, 'members', memberId));
      setMembers(members.filter(m => m.id !== memberId));
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await addDoc(collection(db, 'audit_logs'), {
            organizerId: currentUser.uid, category: 'Member',
            action: 'Deleted member', user: currentUser.email || '',
            details: memberName, createdAt: serverTimestamp(),
          });
        }
      } catch (auditErr) { /* silent - audit logging must never block member deletion */ }
    } catch (e) { console.error(e); }
    setDeletingMember(null);
  };

  const handleValidateProof = async (paymentId: string, action: 'verified' | 'rejected') => {
    setValidatingProof(paymentId);
    try {
      await updateDoc(doc(db, 'payments', paymentId), { proofStatus: action });
      setPayments(payments.map(p => p.id === paymentId ? { ...p, proofStatus: action } : p));
    } catch (e) { console.error(e); }
    setValidatingProof(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD', gap: '18px' }}>
      <style>{`@keyframes tarsyn-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/tarsyn-logo.svg" alt="TARSYN" style={{ height: '52px', width: 'auto' }} />
      <div style={{
        width: '30px', height: '30px', borderRadius: '50%',
        border: '3px solid #EAD9BE', borderTopColor: '#6B2D4E',
        animation: 'tarsyn-spin 0.8s linear infinite',
      }} />
    </div>
  );

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const confirmedPayments = payments.filter(p => p.status === 'confirmed').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingProofs = payments.filter(p => p.proofUrl && p.proofStatus === 'pending');

  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          opacity: 0;
          animation: fadeUp 0.45s ease forwards;
        }
        .stat-card, .panel-card, .action-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px) scale(1.012);
          box-shadow: 0 8px 22px rgba(107,45,78,0.14) !important;
        }
        .panel-card:hover {
          box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important;
        }
        .action-card:hover {
          transform: translateY(-3px) scale(1.015);
          box-shadow: 0 10px 26px rgba(233,199,123,0.35) !important;
        }
        .row-hover:hover {
          background: #FBF3EC !important;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 11px;
          border-radius: 18px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .btn-action {
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .btn-action:hover {
          filter: brightness(0.96);
        }
        .btn-action:active {
          transform: scale(0.96);
        }
        .modal-fade {
          animation: fadeUp 0.25s ease forwards;
        }
        @media (max-width: 700px) {
          .tarsyn-ov-nav { grid-template-columns: 1fr auto !important; padding: 10px 14px !important; }
          .tarsyn-ov-nav-title { display: none !important; }
          .tarsyn-ov-container { padding: 14px 14px !important; }
        }
      `}</style>

      {editingGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
          <div className="modal-fade" style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Edit Group</h3>

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Group Name</label>
            <input
              value={groupEditName}
              onChange={e => setGroupEditName(e.target.value)}
              placeholder="Group name..."
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Frequency</label>
                <select
                  value={groupEditFrequency}
                  onChange={e => setGroupEditFrequency(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                >
                  <option>Weekly</option><option>Bi-Weekly</option><option>Monthly</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Status</label>
                <select
                  value={groupEditStatus}
                  onChange={e => setGroupEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Contribution Amount</label>
                <input
                  type="number" min="0" step="0.01"
                  value={groupEditAmount}
                  onChange={e => setGroupEditAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Currency</label>
                <select
                  value={groupEditCurrency}
                  onChange={e => setGroupEditCurrency(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                >
                  <option>USD</option><option>EUR</option><option>GBP</option>
                  <option>CAD</option><option>HTG</option><option>XOF</option>
                </select>
              </div>
            </div>

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Region</label>
            <input
              value={groupEditRegion}
              onChange={e => setGroupEditRegion(e.target.value)}
              placeholder="e.g. United States, Haiti..."
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            />

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Start Date</label>
            <input
              type="date"
              value={groupEditStartDate}
              onChange={e => setGroupEditStartDate(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            />

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Description</label>
            <textarea
              value={groupEditDescription}
              onChange={e => setGroupEditDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', fontFamily: 'Inter, sans-serif', resize: 'vertical' as const }}
            />

            <p style={{ fontSize: '11px', color: '#A08B7D', margin: '0 0 16px', lineHeight: 1.5 }}>
              Note: changing the contribution amount here does not retroactively change individual members' amounts already set. Edit each member separately if needed.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                setEditingGroup(null);
                setGroupEditName(''); setGroupEditFrequency('Weekly'); setGroupEditAmount('');
                setGroupEditCurrency('USD'); setGroupEditRegion(''); setGroupEditStartDate('');
                setGroupEditStatus('active'); setGroupEditDescription('');
              }} className="btn-action"
                style={{ flex: 1, padding: '12px', background: 'transparent', color: '#6B2D4E', border: '2px solid #6B2D4E', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveGroup} disabled={savingGroup || !groupEditName.trim()} className="btn-action"
                style={{ flex: 1, padding: '12px', background: '#6B2D4E', color: '#FBEEDD', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: (savingGroup || !groupEditName.trim()) ? 0.6 : 1 }}>
                {savingGroup ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
          <div className="modal-fade" style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Edit Member</h3>

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Name</label>
            <input
              value={memberEditName}
              onChange={e => setMemberEditName(e.target.value)}
              placeholder="Member name..."
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Phone</label>
                <input
                  value={memberEditPhone}
                  onChange={e => setMemberEditPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Email</label>
                <input
                  type="email"
                  value={memberEditEmail}
                  onChange={e => setMemberEditEmail(e.target.value)}
                  placeholder="email@example.com"
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Country</label>
            <select
              value={memberEditCountry}
              onChange={e => setMemberEditCountry(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px', background: 'white' }}
            >
              <option value="">Select country...</option>
              <option>United States</option><option>Haiti</option><option>France</option>
              <option>Canada</option><option>United Kingdom</option><option>Nigeria</option>
              <option>Senegal</option><option>Ivory Coast</option><option>Cameroon</option>
              <option>Other</option>
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Contribution Amount</label>
                <input
                  type="number" min="0" step="0.01"
                  value={memberEditAmount}
                  onChange={e => setMemberEditAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Currency</label>
                <select
                  value={memberEditCurrency}
                  onChange={e => setMemberEditCurrency(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                >
                  <option>USD</option><option>EUR</option><option>GBP</option>
                  <option>CAD</option><option>HTG</option><option>XOF</option>
                </select>
              </div>
            </div>

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Payout Date</label>
            <input
              type="date"
              value={memberEditPayoutDate}
              onChange={e => setMemberEditPayoutDate(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />

            <p style={{ fontSize: '11px', color: '#A08B7D', margin: '0 0 16px', lineHeight: 1.5 }}>
              Note: this does not change the member's position in the rotation or their number of parts. Editing the contribution amount only affects future weeks, not weeks already marked paid.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                setEditingMember(null);
                setMemberEditName(''); setMemberEditPayoutDate(''); setMemberEditAmount('');
                setMemberEditCurrency('USD'); setMemberEditPhone(''); setMemberEditEmail(''); setMemberEditCountry('');
              }} className="btn-action"
                style={{ flex: 1, padding: '12px', background: 'transparent', color: '#6B2D4E', border: '2px solid #6B2D4E', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveMember} disabled={savingMember || !memberEditName.trim()} className="btn-action"
                style={{ flex: 1, padding: '12px', background: '#6B2D4E', color: '#FBEEDD', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: (savingMember || !memberEditName.trim()) ? 0.6 : 1 }}>
                {savingMember ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="tarsyn-ov-nav" style={{
        background: 'linear-gradient(135deg, #6B2D4E 0%, #4A1F38 100%)',
        padding: '12px 28px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: '16px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
      }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', justifySelf: 'start' }}>
          <div>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/tarsyn-logo-white.svg" alt="TARSYN" style={{ height: '48px', width: 'auto', display: 'block' }} /></a>
            <div style={{ color: 'rgba(251,238,221,0.6)', fontSize: '9px', letterSpacing: '2px', fontStyle: 'italic' }}>YOUR COMMUNITY. YOUR POWER.</div>
          </div>
        </div>

        <div className="tarsyn-ov-nav-title fade-up" style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
          <h1 style={{ color: '#F0DCE8', fontSize: '17px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}> TARSYN Handles the Rest</h1>
          <p style={{ color: 'rgba(251,238,221,0.65)', fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Rotation, reminders, reports - all automatic.</p>
        </div>

        <div style={{ justifySelf: 'end' }}><DateTimeWeather /></div>
      </nav>

      <div className="tarsyn-ov-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginBottom: '18px' }}>
          <StatCard label="Total Members" value={members.length} icon={'\ud83d\udc65'} gradient="linear-gradient(135deg,#6B2D4E,#4A1F38)" glow="rgba(107,45,78,0.35)" delay={0} />
          <StatCard label="Active Members" value={activeMembers} icon={'\u2705'} gradient="linear-gradient(135deg,#43A047,#2E7D32)" glow="rgba(46,125,50,0.3)" delay={50} />
          <StatCard label="Total Collected" value={`${totalPaid} ${payments[0]?.currency || ''}`} icon={'\ud83d\udcb0'} gradient="linear-gradient(135deg,#E9C77B,#C9974D)" glow="rgba(233,199,123,0.35)" delay={100} />
          <StatCard label="Confirmed Payments" value={confirmedPayments} icon={'\u2714\ufe0f'} gradient="linear-gradient(135deg,#1E88E5,#1565C0)" glow="rgba(21,101,192,0.3)" delay={150} />
          <StatCard label="Pending Payments" value={pendingPayments} icon={'\u23f3'} gradient="linear-gradient(135deg,#FB8C00,#E65100)" glow="rgba(230,81,0,0.3)" delay={200} />
        </div>

        <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '14px' }}>
          <h3 style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>{'\ud83c\udfd8\ufe0f'} My Groups</h3>
          {groups.length === 0 ? (
            <p style={{ color: '#C4748E', fontSize: '13px' }}>No groups yet. <span onClick={() => router.push('/dashboard/create-tontine')} style={{ color: '#6B2D4E', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Create your first group</span></p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '10px' }}>
              {groups.map((g, i) => (
                <div key={i} style={{ background: '#FBEEDD', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '14px', margin: '0 0 2px' }}>{g.name}</p>
                    <p style={{ color: '#C4748E', fontSize: '11px', margin: 0 }}>{g.frequency} - {g.status}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => router.push(`/admin/payment-grid/${g.id}`)} className="btn-action"
                      style={{ background: '#E9C77B', color: '#4A1F38', border: 'none', borderRadius: '8px', padding: '5px 11px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      {'\ud83d\udcca'} Payment Grid
                    </button>
                    <button onClick={() => {
                      setEditingGroup(g);
                      setGroupEditName(g.name || '');
                      setGroupEditFrequency(g.frequency || 'Weekly');
                      setGroupEditAmount(String(g.contribution || g.amountPerMember || ''));
                      setGroupEditCurrency(g.currency || 'USD');
                      setGroupEditRegion(g.region || '');
                      setGroupEditStartDate(g.startDate || '');
                      setGroupEditStatus(g.status || 'active');
                      setGroupEditDescription(g.description || '');
                    }} className="btn-action"
                      style={{ background: '#6B2D4E', color: '#FBEEDD', border: 'none', borderRadius: '8px', padding: '5px 11px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      {'\u270f\ufe0f'} Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '14px' }}>
          <h3 style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>{'\ud83d\udc65'} Member Management</h3>
          {members.length === 0 ? (
            <p style={{ color: '#C4748E', fontSize: '13px' }}>No members yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #FBEEDD' }}>
                    {['#', 'TYN-ID', 'Name', 'Payout Date', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#C4748E', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.sort((a, b) => a.position - b.position).map((m, i) => (
                    <tr key={m.id} className="row-hover" style={{ borderBottom: '1px solid #FBEEDD', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '10px 10px', color: '#6B2D4E', fontWeight: 700, fontSize: '13px' }}>#{m.position}</td>
                      <td style={{ padding: '10px 10px', color: '#C4748E', fontFamily: 'monospace', fontSize: '12px' }}>{m.tynId}</td>
                      <td style={{ padding: '10px 10px', color: '#4A1F38', fontWeight: 600, fontSize: '13px' }}>{m.name}</td>
                      <td style={{ padding: '10px 10px', color: '#C4748E', fontSize: '12px' }}>{m.payoutDate || '-'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span className="pill" style={{
                          background: m.status === 'active' ? '#E8F5E9' : m.status === 'paused' ? '#E3F2FD' : '#FFF3E0',
                          color: m.status === 'active' ? '#2E7D32' : m.status === 'paused' ? '#1565C0' : '#E65100',
                        }}>
                          {m.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        {m.role !== 'admin' && (
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button onClick={() => {
                              setEditingMember(m);
                              setMemberEditName(m.name || m.fullName || '');
                              setMemberEditPayoutDate(m.payoutDate || '');
                              setMemberEditAmount(String(m.expectedAmount || ''));
                              setMemberEditCurrency(m.currency || 'USD');
                              setMemberEditPhone(m.phone || '');
                              setMemberEditEmail(m.email || '');
                              setMemberEditCountry(m.country || '');
                            }} className="btn-action pill"
                              style={{ background: '#E3F2FD', color: '#1565C0', border: 'none', cursor: 'pointer' }}>
                              {'\u270f\ufe0f'} Edit
                            </button>
                            {m.status !== 'active' && (
                              <button onClick={() => handleUpdateStatus(m.id, 'active')} disabled={updatingMember === m.id} className="btn-action pill"
                                style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', cursor: 'pointer' }}>
                                {'\u2705'} Activate
                              </button>
                            )}
                            {m.status !== 'paused' && (
                              <button onClick={() => handleUpdateStatus(m.id, 'paused')} disabled={updatingMember === m.id} className="btn-action pill"
                                style={{ background: '#E3F2FD', color: '#1565C0', border: 'none', cursor: 'pointer' }}>
                                {'\u23f8\ufe0f'} Pause
                              </button>
                            )}
                            <button onClick={() => handleDeleteMember(m.id, m.name)} disabled={deletingMember === m.id} className="btn-action pill"
                              style={{ background: '#FFEBEE', color: '#C62828', border: 'none', cursor: 'pointer' }}>
                              {deletingMember === m.id ? '...' : '\ud83d\uddd1\ufe0f Delete'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pendingProofs.length > 0 && (
          <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '14px' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>{'\ud83d\udcce'} Payment Proofs</h3>
            <p style={{ color: '#C4748E', fontSize: '12px', margin: '0 0 12px' }}>{pendingProofs.length} proof(s) waiting for validation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingProofs.map((p, i) => (
                <div key={p.id} style={{ background: '#FBEEDD', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{p.memberName}</p>
                    <p style={{ color: '#C4748E', fontSize: '11px', margin: 0 }}>{p.amount} {p.currency} - {p.paymentDate} - {p.paymentMethod}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="btn-action pill"
                      style={{ background: '#E3F2FD', color: '#1565C0', textDecoration: 'none' }}>
                      {'\ud83d\udc41\ufe0f'} View
                    </a>
                    <button onClick={() => handleValidateProof(p.id, 'verified')} disabled={validatingProof === p.id} className="btn-action pill"
                      style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', cursor: 'pointer' }}>
                      {'\u2705'} Validate
                    </button>
                    <button onClick={() => handleValidateProof(p.id, 'rejected')} disabled={validatingProof === p.id} className="btn-action pill"
                      style={{ background: '#FFEBEE', color: '#C62828', border: 'none', cursor: 'pointer' }}>
                      {'\u274c'} Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '14px' }}>
          <h3 style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>{'\ud83d\udccb'} Recent Contributions</h3>
          {payments.length === 0 ? (
            <p style={{ color: '#C4748E', fontSize: '13px' }}>No payments recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #FBEEDD' }}>
                    {['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#C4748E', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 10).map((p, i) => (
                    <tr key={p.id} className="row-hover" style={{ borderBottom: '1px solid #FBEEDD', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '10px 10px' }}>
                        <a href={`/receipt/${p.receiptNumber}`} target="_blank" rel="noreferrer"
                          style={{ color: '#6B2D4E', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, textDecoration: 'underline' }}>
                          {p.receiptNumber || '-'}
                        </a>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#4A1F38', fontWeight: 600, fontSize: '13px' }}>{p.memberName}</td>
                      <td style={{ padding: '10px 10px', color: '#2E7D32', fontWeight: 700, fontSize: '13px' }}>{p.amount} {p.currency}</td>
                      <td style={{ padding: '10px 10px', color: '#C4748E', fontSize: '12px' }}>{p.paymentMethod}</td>
                      <td style={{ padding: '10px 10px', color: '#C4748E', fontSize: '12px' }}>{p.paymentDate}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span className="pill" style={{ background: p.status === 'confirmed' ? '#E8F5E9' : p.status === 'pending' ? '#FFF3E0' : '#FFEBEE', color: p.status === 'confirmed' ? '#2E7D32' : p.status === 'pending' ? '#E65100' : '#C62828' }}>
                          {p.status || 'confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', paddingBottom: '24px' }}>
          {[
            { title: 'Record Payment', icon: '\ud83d\udcb0', path: '/dashboard/record-contribution' },
            { title: 'Add Member', icon: '\ud83d\udc64', path: '/dashboard/add-member' },
            { title: 'Digital Register', icon: '\ud83d\udccb', path: '/dashboard/contribution-log' },
            { title: 'Send Reminder', icon: '\ud83d\udd14', path: '/dashboard/reminders' },
            { title: 'Connect Payments', icon: '\ud83c\udfe6', path: '/dashboard/payments-setup' },
            { title: 'Reports', icon: '\ud83d\udcca', path: '/dashboard/reports' },
            { title: 'Audit Log', icon: '\ud83d\udcdc', path: '/dashboard/audit-log' },
            { title: 'Documents', icon: '\ud83d\udcc1', path: '/dashboard/documents' },
            { title: 'Security', icon: '\ud83d\udd12', path: '/dashboard/security' },
            { title: 'White Label', icon: '\ud83c\udfa8', path: '/dashboard/branding' },
            { title: 'Leave a Review', icon: '\u2b50', path: '/leave-review' },
            ...(isPlatformAdmin ? [{ title: 'Repair Members', icon: '\ud83d\udee0\ufe0f', path: '/admin/repair-members' }] : []),
          ].map((a, i) => (
            <div key={i} className="action-card" onClick={() => router.push(a.path)}
              style={{
                background: 'linear-gradient(135deg, #FBEEDD 0%, #F3E4D4 100%)',
                border: '1px solid #E8D5C0',
                borderRadius: '16px',
                padding: '18px',
                cursor: 'pointer',
                boxShadow: '0 3px 14px rgba(233,199,123,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg,#E9C77B,#C9974D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                boxShadow: '0 4px 12px rgba(233,199,123,0.4)',
                flexShrink: 0,
              }}>
                {a.icon}
              </div>
              <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '14px', margin: 0 }}>{a.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  return (
    <TrialGuard>
      <OverviewContent />
    </TrialGuard>
  );
}
