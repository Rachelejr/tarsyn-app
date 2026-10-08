'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import QRCodeModal from '@/components/qr/QRCodeModal';
import JoinRequestsCard from '@/components/referral/JoinRequestsCard';
import { tontineStatus, TONTINE_STATUS_LABEL, TONTINE_STATUS_ORDER } from '@/lib/tontineStatus';

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
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '0 4px 16px rgba(107,45,78,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          boxShadow: `0 5px 14px ${glow}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ color: '#C4748E', fontSize: '9px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{label}</p>
        <p style={{ color: '#4A1F38', fontSize: '17px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
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
  const [groupEditVisible, setGroupEditVisible] = useState(true);
  // Organizer's signature printed on this group's receipts.
  const [groupEditSigName, setGroupEditSigName] = useState('');
  const [groupEditSigStyle, setGroupEditSigStyle] = useState<'name' | 'initials'>('name');
  // How members' documents are grouped in their space.
  const [groupEditDocGrouping, setGroupEditDocGrouping] = useState<'year' | 'half' | 'quarter'>('quarter');
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [validatingProof, setValidatingProof] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [qrMember, setQrMember] = useState<{ inviteCode?: string; groupId?: string; fullName?: string; name?: string } | null>(null);
  const [memberEditName, setMemberEditName] = useState('');
  const [memberEditPayoutDate, setMemberEditPayoutDate] = useState('');
  const [memberEditAmount, setMemberEditAmount] = useState('');
  const [memberEditCurrency, setMemberEditCurrency] = useState('USD');
  const [memberEditPhone, setMemberEditPhone] = useState('');
  const [memberEditEmail, setMemberEditEmail] = useState('');
  const [memberEditCountry, setMemberEditCountry] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberShowCount, setMemberShowCount] = useState<number | 'all'>(5);
  const [paymentShowCount, setPaymentShowCount] = useState<number | 'all'>(5);
  // Current cycle of each group's payment grid (for the "next cycle answers" card).
  const [gridCycles, setGridCycles] = useState<Record<string, { cycleNumber: number; askedFor: number; memberIds: string[]; startDate?: string; endDate?: string }>>({});

  useEffect(() => {
    let unsubMembers: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const [userSnap, gsnap, psnap] = await Promise.all([
          getDoc(doc(db, 'users', u.uid)),
          getDocs(query(collection(db, 'groups'), where('organizerId', '==', u.uid))),
          getDocs(query(collection(db, 'payments'), where('organizerId', '==', u.uid))),
        ]);

        const role = userSnap.exists() ? userSnap.data().role : null;
        setIsPlatformAdmin(role === 'admin' || role === 'superadmin');

        setGroups(gsnap.docs.map(d => ({ id: d.id, ...d.data() })));
        // Cycle info per group, for the members' next-cycle answers.
        const cycles: Record<string, { cycleNumber: number; askedFor: number; memberIds: string[]; startDate?: string; endDate?: string }> = {};
        await Promise.all(gsnap.docs.map(async (g) => {
          try {
            const gs = await getDoc(doc(db, 'paymentGrids', g.id + '_current'));
            if (!gs.exists()) return;
            const gd: any = gs.data();
            const ids = Array.from(new Set(Object.values(gd.slots || {}).map((s: any) => s.memberId))).filter(Boolean) as string[];
            cycles[g.id] = { cycleNumber: gd.cycleNumber || 1, askedFor: gd.renewalAskedFor || 0, memberIds: ids, startDate: gd.startDate || '', endDate: gd.cycleEndDate || '' };
          } catch { /* grid unreadable: no card for this group */ }
        }));
        setGridCycles(cycles);
        setPayments(psnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Members are kept live rather than fetched once: a member's status
        // flips from "pending" to "active" server-side the moment they
        // finish creating their account through the invite link, and the
        // admin should see that reflected here without reloading the page.
        const membersQuery = query(collection(db, 'members'), where('organizerId', '==', u.uid));
        unsubMembers = onSnapshot(membersQuery, (snap) => {
          setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => { unsub(); if (unsubMembers) unsubMembers(); };
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
        // Members only see the group in their space when this is false.
        hiddenFromMembers: !groupEditVisible,
        receiptSignature: { name: groupEditSigName.trim().slice(0, 80), style: groupEditSigStyle },
        docGrouping: groupEditDocGrouping,
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

  const getPaymentMemberName = (p: any) => {
    if (p.memberName && p.memberName !== '(no name)') return p.memberName;
    const linkedMember = members.find(m => m.id === p.memberId);
    return linkedMember?.name || linkedMember?.fullName || p.memberName || '(no name)';
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
      <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '60px', width: 'auto' }} />
      <div style={{
        width: '30px', height: '30px', borderRadius: '50%',
        border: '3px solid #EAD9BE', borderTopColor: '#6B2D4E',
        animation: 'UNIMUNITY-spin 0.8s linear infinite',
      }} />
    </div>
  );

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const confirmedPayments = payments.filter(p => p.status === 'confirmed').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingProofs = payments.filter(p => p.proofUrl && p.proofStatus === 'pending');

  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif' , display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          opacity: 0;
          animation: fadeUp 0.45s ease forwards;
        }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer {
          0% { background-position: 0% center; }
          100% { background-position: -200% center; }
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
        .rc-card { display: flex; flex-direction: column; }
        /* Side columns keep their own height, whatever the centre column shows. */
        .UNIMUNITY-ov-right .rc-answers { max-height: 420px; overflow-y: auto; }
        .rc-head { display: flex; align-items: center; gap: 11px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #F3E6D8; }
        .rc-ico { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .rc-group { background: linear-gradient(135deg, #FFFDF9 0%, #FBEEDD 100%); border: 1px solid #F0E0CC; border-radius: 13px; padding: 13px; margin-bottom: 10px; }
        .rc-group:last-child { margin-bottom: 0; }
        .modal-fade {
          animation: fadeUp 0.25s ease forwards;
        }
        @media (max-width: 700px) {
          .UNIMUNITY-ov-nav { grid-template-columns: 1fr auto !important; padding: 10px 14px !important; }
          .UNIMUNITY-ov-nav-title { display: none !important; }
          .UNIMUNITY-ov-container { padding: 14px 14px !important; }
          .UNIMUNITY-ov-grid { grid-template-columns: 1fr !important; }
          .UNIMUNITY-ov-sidebar { position: static !important; }
        }
        /* Wide screens: the three columns fit the window (no page scroll) and
           end at the same line. Anything longer scrolls inside its card. */
        @media (min-width: 1201px) {
          .UNIMUNITY-ov-grid { align-items: stretch !important; height: calc(100vh - 228px); min-height: 520px; }
          .UNIMUNITY-ov-grid > div { display: flex; flex-direction: column; min-height: 0; }
          .UNIMUNITY-ov-grid > div > * { flex-shrink: 0; }
          /* Left: Member Management keeps its size; Recent Contributions fills the rest and scrolls. */
          .UNIMUNITY-ov-grid > div:not(.UNIMUNITY-ov-sidebar):not(.UNIMUNITY-ov-right) > :last-child { flex: 1 1 auto; min-height: 0; overflow-y: auto; margin-bottom: 0 !important; }
          /* Middle: Quick Actions fills the height; its list scrolls if the window is small. */
          .UNIMUNITY-ov-sidebar { margin-bottom: 0 !important; }
          .UNIMUNITY-ov-sidebar > :last-child { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
          /* Right: compact cards; Next Cycle Answers takes the rest and scrolls inside. */
          .UNIMUNITY-ov-right { gap: 12px !important; margin-bottom: 0 !important; }
          .UNIMUNITY-ov-right > :last-child { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
        }
        @media (max-width: 1200px) {
          .UNIMUNITY-ov-grid { grid-template-columns: 1fr !important; }
          .UNIMUNITY-ov-sidebar .action-card { padding: 9px 10px !important; }
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

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: groupEditVisible ? '#E8F5E9' : '#FBF0D9', border: '1px solid ' + (groupEditVisible ? '#C8E6C8' : '#EBD9A8'), borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={groupEditVisible} onChange={e => setGroupEditVisible(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: '#6B2D4E', cursor: 'pointer' }} />
              <span>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#4A1F38' }}>Visible to members</span>
                <span style={{ display: 'block', fontSize: '11.5px', color: '#8A7B6C', marginTop: '2px' }}>
                  {groupEditVisible ? 'Members see this group in their member space.' : 'Hidden: members of this group do not see it in their member space.'}
                </span>
              </span>
            </label>

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

            <div style={{ background: '#FDF6EC', border: '1px solid #F3E6D8', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Signature on receipts</label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <input
                  value={groupEditSigName}
                  onChange={e => setGroupEditSigName(e.target.value)}
                  placeholder="Your full name"
                  maxLength={80}
                  style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                />
                <select
                  value={groupEditSigStyle}
                  onChange={e => setGroupEditSigStyle(e.target.value === 'initials' ? 'initials' : 'name')}
                  style={{ width: '100%', padding: '11px 10px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'white' }}
                >
                  <option value="name">Full name</option>
                  <option value="initials">Initials</option>
                </select>
              </div>
              {groupEditSigName.trim() && (
                <p style={{ margin: '10px 0 0', fontFamily: '"Great Vibes", "Brush Script MT", cursive', fontSize: '26px', color: '#4A1F38', lineHeight: 1.1 }}>
                  {groupEditSigStyle === 'initials'
                    ? groupEditSigName.trim().split(/\s+/).map(w => w[0].toUpperCase() + '.').join('')
                    : groupEditSigName.trim()}
                </p>
              )}
              <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: '#8A7B6C' }}>Printed at the bottom of every new receipt of this group, signed electronically.</p>
            </div>

            <label style={{ display: 'block', color: '#C4748E', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Members&apos; documents grouped by</label>
            <select
              value={groupEditDocGrouping}
              onChange={e => setGroupEditDocGrouping(e.target.value === 'year' ? 'year' : e.target.value === 'half' ? 'half' : 'quarter')}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px', background: 'white' }}
            >
              <option value="quarter">Every 3 months</option>
              <option value="half">Every 6 months</option>
              <option value="year">Every year</option>
            </select>

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

      <nav className="UNIMUNITY-ov-nav" style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        padding: '20px 40px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: '16px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
      }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', justifySelf: 'start' }}>
          <div>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block' }} /></a>
            <div style={{ color: '#C4748E', fontSize: '9px', letterSpacing: '2px', fontStyle: 'italic' }}>YOUR COMMUNITY. YOUR POWER.</div>
          </div>
        </div>

        <div className="UNIMUNITY-ov-nav-title fade-up" style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Organizer Dashboard</h1>
        </div>

        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </nav>

      <div className="UNIMUNITY-ov-container" style={{ maxWidth: '1560px', margin: '0 auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '14px', marginBottom: '20px' }}>
          <StatCard label="Total Members" value={members.length} icon={'\ud83d\udc65'} gradient="linear-gradient(135deg,#6B2D4E,#4A1F38)" glow="rgba(107,45,78,0.35)" delay={0} />
          <StatCard label="Active Members" value={activeMembers} icon={'\u2705'} gradient="linear-gradient(135deg,#43A047,#2E7D32)" glow="rgba(46,125,50,0.3)" delay={50} />
          <StatCard label="Total Collected" value={`${totalPaid} ${payments[0]?.currency || ''}`} icon={'\ud83d\udcb0'} gradient="linear-gradient(135deg,#E9C77B,#C9974D)" glow="rgba(233,199,123,0.35)" delay={100} />
          <StatCard label="Confirmed Payments" value={confirmedPayments} icon={'\u2714\ufe0f'} gradient="linear-gradient(135deg,#1E88E5,#1565C0)" glow="rgba(21,101,192,0.3)" delay={150} />
          <StatCard label="Pending Payments" value={pendingPayments} icon={'\u23f3'} gradient="linear-gradient(135deg,#FB8C00,#E65100)" glow="rgba(230,81,0,0.3)" delay={200} />
        </div>
        {/* Order on screen: main panels | Quick Actions | My Groups, Join Requests, Next Cycle Answers */}
        <div className="UNIMUNITY-ov-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 230px 340px', gap: '20px', alignItems: 'start' }}>
        <div className="UNIMUNITY-ov-sidebar" style={{
          order: 2,
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '14px',
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#E9C77B', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { title: 'Record Payment', icon: '\ud83d\udcb0', path: '/dashboard/record-contribution' },
              { title: 'Add Member', icon: '\ud83d\udc64', path: '/dashboard/add-member' },
              { title: 'Referrals', icon: '\ud83e\udd1d', path: '/dashboard/referrals' },
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
                  borderRadius: '10px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(233,199,123,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg,#E9C77B,#C9974D)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  boxShadow: '0 3px 8px rgba(233,199,123,0.4)',
                  flexShrink: 0,
                }}>
                  {a.icon}
                </div>
                <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '12.5px', margin: 0 }}>{a.title}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ order: 1, minWidth: 0 }}>


        <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 700, margin: 0 }}>{'\ud83d\udc65'} Member Management</h3>
            {members.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#C4748E' }}>
                Show:
                <select value={memberShowCount} onChange={(e) => setMemberShowCount(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{ border: '1px solid #FBEEDD', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', color: '#4A1F38', background: 'white', cursor: 'pointer' }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value="all">All ({members.length})</option>
                </select>
              </label>
            )}
          </div>
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
                  {members.sort((a, b) => a.position - b.position).slice(0, memberShowCount === 'all' ? undefined : memberShowCount).map((m, i) => (
                    <tr key={m.id} className="row-hover" style={{ borderBottom: '1px solid #FBEEDD', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '10px 10px', color: '#6B2D4E', fontWeight: 700, fontSize: '13px' }}>#{m.position}</td>
                      <td style={{ padding: '10px 10px', color: '#C4748E', fontFamily: 'monospace', fontSize: '12px' }}>{m.tynId}</td>
                      <td style={{ padding: '10px 10px', color: '#4A1F38', fontWeight: 600, fontSize: '13px' }}>{m.name || m.fullName || '-'}</td>
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
                            {!m.userId && (
                              <button onClick={() => setQrMember(m)} className="btn-action pill" title="Show this member's personal invitation QR code"
                                style={{ background: '#FBEEDD', color: '#6B2D4E', border: '1px solid #F0DCA8', cursor: 'pointer' }}>
                                {'\u25A3'} QR
                              </button>
                            )}
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
                            <button onClick={() => handleDeleteMember(m.id, m.name || m.fullName || 'this member')} disabled={deletingMember === m.id} className="btn-action pill"
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
                    <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{getPaymentMemberName(p)}</p>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 700, margin: 0 }}>{'\ud83d\udccb'} Recent Contributions</h3>
            {payments.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#C4748E' }}>
                Show:
                <select value={paymentShowCount} onChange={(e) => setPaymentShowCount(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{ border: '1px solid #FBEEDD', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', color: '#4A1F38', background: 'white', cursor: 'pointer' }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value="all">All ({payments.length})</option>
                </select>
              </label>
            )}
          </div>
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
                  {payments.slice(0, paymentShowCount === 'all' ? undefined : paymentShowCount).map((p, i) => (
                    <tr key={p.id} className="row-hover" style={{ borderBottom: '1px solid #FBEEDD', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '10px 10px' }}>
                        <a href={`/receipt/${p.receiptNumber}`} target="_blank" rel="noreferrer"
                          style={{ color: '#6B2D4E', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, textDecoration: 'underline' }}>
                          {p.receiptNumber || '-'}
                        </a>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#4A1F38', fontWeight: 600, fontSize: '13px' }}>{getPaymentMemberName(p)}</td>
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

        </div>

        <div className="UNIMUNITY-ov-right" style={{ order: 3, display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '14px' }}>
          {/* My Groups (compact) */}
          <div className="panel-card fade-up rc-card" style={{ background: 'white', borderRadius: '16px', padding: '12px 16px', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
            <div className="rc-head" style={{ marginBottom: '10px', paddingBottom: '9px' }}>
              <span className="rc-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)', boxShadow: '0 4px 10px rgba(201,151,77,0.35)' }}>{'\ud83c\udfd8\ufe0f'}</span>
              <div>
                <h3 style={{ color: '#4A1F38', fontSize: '15px', fontWeight: 800, margin: 0 }}>My Groups</h3>
                <p style={{ color: '#A08B7D', fontSize: '11px', margin: '2px 0 0' }}>{groups.length} {groups.length === 1 ? 'group' : 'groups'}</p>
              </div>
            </div>
            {groups.length === 0 ? (
              <p style={{ color: '#C4748E', fontSize: '13px', margin: 0 }}>No groups yet. <span onClick={() => router.push('/dashboard/create-tontine')} style={{ color: '#6B2D4E', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Create your first group</span></p>
            ) : TONTINE_STATUS_ORDER.flatMap(st => {
              // Tontines in progress first, then upcoming, then completed.
              const list = groups.filter(g => tontineStatus({ status: g.status, startDate: gridCycles[g.id]?.startDate || g.startDate, endDate: gridCycles[g.id]?.endDate }) === st);
              return list.map((g, idx) => ({ g, st, first: idx === 0 }));
            }).map(({ g, st, first }, i) => (
              <div key={g.id || i} style={{ marginBottom: '6px' }}>
              {first && (
                <p style={{ margin: i === 0 ? '0 0 5px' : '10px 0 5px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: st === 'current' ? '#2E7D32' : st === 'upcoming' ? '#9C7A2E' : '#8A7B6C' }}>
                  {TONTINE_STATUS_LABEL[st]}
                </p>
              )}
              <div className="rc-group" style={{ opacity: st === 'completed' ? 0.75 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <p style={{ color: '#4A1F38', fontWeight: 800, fontSize: '14px', margin: 0 }}>{g.name}</p>
                  <span className="pill" style={{ background: g.status === 'active' ? '#E8F5E9' : '#FFF3E0', color: g.status === 'active' ? '#2E7D32' : '#E65100', padding: '3px 9px', fontSize: '10px', textTransform: 'capitalize' }}>
                    {'\u25cf'} {g.status || 'active'}
                  </span>
                  {g.hiddenFromMembers === true && (
                    <span className="pill" title="Members do not see this group in their member space. Change it with Edit." style={{ background: '#FBF0D9', color: '#9C7A2E', padding: '3px 9px', fontSize: '10px' }}>Hidden from members</span>
                  )}
                </div>
                <p style={{ color: '#A08B7D', fontSize: '11.5px', margin: '0 0 7px' }}>
                  {g.frequency || 'Weekly'}{(g.contribution || g.amountPerMember) ? ' \u00b7 ' + (g.contribution || g.amountPerMember) + ' ' + (g.currency || 'USD') : ''}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  <button onClick={() => router.push(`/admin/payment-grid/${g.id}`)} className="btn-action"
                    style={{ background: 'linear-gradient(135deg,#E9C77B,#D9AE5E)', color: '#4A1F38', border: 'none', borderRadius: '9px', padding: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
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
                    setGroupEditVisible(g.hiddenFromMembers !== true);
                    setGroupEditSigName(g.receiptSignature?.name || auth.currentUser?.displayName || '');
                    setGroupEditSigStyle(g.receiptSignature?.style === 'initials' ? 'initials' : 'name');
                    setGroupEditDocGrouping(g.docGrouping === 'year' || g.docGrouping === 'half' ? g.docGrouping : 'quarter');
                  }} className="btn-action"
                    style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FBEEDD', border: 'none', borderRadius: '9px', padding: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                    {'\u270f\ufe0f'} Edit
                  </button>
                </div>
              </div>
              </div>
            ))}
          </div>

          {/* Join requests proposed by members (referral). */}
          <JoinRequestsCard />

          {/* Next cycle answers: what members replied from their page (live). */}
          {(() => {
            const blocks = groups.map((g) => {
              const gc = gridCycles[g.id];
              if (!gc) return null;
              const nextNo = gc.cycleNumber + 1;
              const groupMembers = members.filter((m) => m.groupId === g.id);
              const answered = groupMembers
                .filter((m) => m.nextCycleFor === nextNo && ['yes', 'pause', 'no'].includes(m.nextCycleResponse))
                .sort((a, b) => (b.nextCycleRespondedAt?.seconds || 0) - (a.nextCycleRespondedAt?.seconds || 0));
              if (gc.askedFor !== nextNo && answered.length === 0) return null;
              const answeredIds = new Set(answered.map((m) => m.id));
              const waiting = gc.memberIds.filter((id) => !answeredIds.has(id)).length;
              const count = (k: string) => answered.filter((m) => m.nextCycleResponse === k).length;
              return { g, nextNo, answered, waiting, yes: count('yes'), pause: count('pause'), no: count('no') };
            }).filter(Boolean) as any[];
            const tag = (r: string) => r === 'yes'
              ? { t: '\u2713 Continue', c: '#2E7D32', b: '#E8F5E9' }
              : r === 'pause' ? { t: '\u23f8 Pause', c: '#9C7A2E', b: '#FBF0D9' } : { t: '\u2717 No', c: '#B0525F', b: '#F5E4E6' };
            return (
              <div className="panel-card fade-up rc-card rc-answers" style={{ background: 'white', borderRadius: '16px', padding: '18px', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
                <div className="rc-head">
                  <span className="rc-ico" style={{ background: 'linear-gradient(135deg,#66BB6A,#2E7D32)', boxShadow: '0 4px 10px rgba(46,125,50,0.3)' }}>{'\ud83d\udd01'}</span>
                  <div>
                    <h3 style={{ color: '#4A1F38', fontSize: '15px', fontWeight: 800, margin: 0 }}>Next Cycle Answers</h3>
                    <p style={{ color: '#A08B7D', fontSize: '11px', margin: '2px 0 0' }}>Live answers from your members</p>
                  </div>
                </div>
                {blocks.length === 0 ? (
                  <p style={{ color: '#A08B7D', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                    No question sent yet. Members are asked automatically 30 days before a cycle ends, or use {'\u201c'}Ask members{'\u201d'} on the payment grid.
                  </p>
                ) : blocks.map((bk) => {
                  const total = bk.answered.length + bk.waiting;
                  const pct = total > 0 ? Math.round((bk.answered.length / total) * 100) : 0;
                  return (
                    <div key={bk.g.id} className="rc-group">
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                        <p style={{ color: '#4A1F38', fontWeight: 800, fontSize: '14px', margin: 0 }}>{bk.g.name}</p>
                        <span style={{ color: '#A08B7D', fontSize: '11px', fontWeight: 600 }}>Cycle {bk.nextNo}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
                        {[
                          { n: bk.yes, l: 'Continue', c: '#2E7D32', b: '#E8F5E9' },
                          { n: bk.pause, l: 'Pause', c: '#9C7A2E', b: '#FBF0D9' },
                          { n: bk.no, l: 'No', c: '#B0525F', b: '#F5E4E6' },
                          { n: bk.waiting, l: 'Waiting', c: '#8A7B6C', b: '#F3EEE8' },
                        ].map((x) => (
                          <div key={x.l} style={{ background: x.b, borderRadius: '10px', padding: '7px 4px', textAlign: 'center' }}>
                            <div style={{ color: x.c, fontSize: '17px', fontWeight: 800, lineHeight: 1.1 }}>{x.n}</div>
                            <div style={{ color: x.c, fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{x.l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ height: '6px', background: '#F0E4D6', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                        <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg,#66BB6A,#2E7D32)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                      </div>
                      <p style={{ color: '#A08B7D', fontSize: '10.5px', margin: '0 0 10px' }}>{bk.answered.length} of {total} answered</p>
                      {bk.answered.length === 0 ? (
                        <p style={{ fontSize: '11.5px', color: '#A08B7D', margin: '0 0 10px', fontStyle: 'italic' }}>Question sent. Waiting for answers.</p>
                      ) : bk.answered.map((m: any) => {
                        const tg = tag(m.nextCycleResponse);
                        const when = m.nextCycleRespondedAt?.toDate ? m.nextCycleRespondedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                        return (
                          <div key={m.id} style={{ background: 'white', border: '1px solid #F3E6D8', borderRadius: '9px', padding: '7px 9px', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: tg.c, background: tg.b, borderRadius: '6px', padding: '2px 7px', whiteSpace: 'nowrap' }}>{tg.t}</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#3A2F1F', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName || m.name}</span>
                              <span style={{ fontSize: '10px', color: '#A08B7D' }}>{when}</span>
                            </div>
                            {m.nextCycleNote && (
                              <p style={{ fontSize: '11.5px', color: '#5A4A3A', fontStyle: 'italic', margin: '5px 0 0' }}>{'\u201c' + m.nextCycleNote + '\u201d'}</p>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => router.push(`/admin/payment-grid/${bk.g.id}`)} className="btn-action"
                        style={{ width: '100%', marginTop: '4px', background: 'linear-gradient(135deg,#E9C77B,#D9AE5E)', color: '#4A1F38', border: 'none', borderRadius: '9px', padding: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                        {'\ud83d\udcca'} Open grid
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        </div>
      </div>

      </div>
      <QRCodeModal
        open={!!qrMember}
        onClose={() => setQrMember(null)}
        invitationUrl={qrMember?.inviteCode ? 'https://unimunity.com/join/' + String(qrMember.inviteCode).trim() : ''}
        groupName={groups.find(g => g.id === qrMember?.groupId)?.name || 'UNIMUNITY'}
        groupType="tontine"
        personName={qrMember?.fullName || qrMember?.name || ''}
      />
      <Footer />
    </div>
  );
}

export default function Overview() {
  return <OverviewContent />;
}
