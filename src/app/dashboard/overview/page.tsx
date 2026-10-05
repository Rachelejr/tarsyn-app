'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

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
        padding: '12px 16px',
        border: '1px solid #F0E4D6',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
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
        <p style={{ color: '#A08B7D', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>{label}</p>
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
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingMember, setDeletingMember] = useState<string | null>(null);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);
  const [validatingProof, setValidatingProof] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberEditName, setMemberEditName] = useState('');
  const [memberEditPayoutDate, setMemberEditPayoutDate] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [memberShow, setMemberShow] = useState('10');
  const [paymentShow, setPaymentShow] = useState('10');

  useEffect(() => {
    let unsubMembers: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const userSnap = await getDoc(doc(db, 'users', u.uid));
        const role = userSnap.exists() ? userSnap.data().role : null;
        setIsPlatformAdmin(role === 'admin' || role === 'superadmin');

        const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
        const gsnap = await getDocs(gq);
        const groupList = gsnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGroups(groupList);

        if (groupList.length > 0) {
          // Live-updated so a member's status flips from "pending" to
          // "active" here automatically the moment they finish creating
          // their account, without the admin needing to reload the page.
          const mq = query(collection(db, 'members'), where('organizerId', '==', u.uid));
          unsubMembers = onSnapshot(mq, (snap) => {
            setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          });

          const pq = query(collection(db, 'payments'), where('organizerId', '==', u.uid));
          const ps = await getDocs(pq);
          setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => { unsub(); if (unsubMembers) unsubMembers(); };
  }, [router]);

  const handleSaveGroupName = async () => {
    if (!editingGroup || !newGroupName.trim()) return;
    setSavingGroup(true);
    try {
      await updateDoc(doc(db, 'groups', editingGroup.id), { name: newGroupName.trim() });
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name: newGroupName.trim() } : g));
      setEditingGroup(null);
      setNewGroupName('');
    } catch (e) { console.error(e); }
    setSavingGroup(false);
  };

  const handleSaveMember = async () => {
    if (!editingMember || !memberEditName.trim()) return;
    setSavingMember(true);
    try {
      await updateDoc(doc(db, 'members', editingMember.id), {
        name: memberEditName.trim(),
        payoutDate: memberEditPayoutDate || null,
      });
      setMembers(members.map(m => m.id === editingMember.id
        ? { ...m, name: memberEditName.trim(), payoutDate: memberEditPayoutDate || null }
        : m));
      setEditingMember(null);
      setMemberEditName('');
      setMemberEditPayoutDate('');
    } catch (e) { console.error(e); }
    setSavingMember(false);
  };

  const handleUpdateStatus = async (memberId: string, newStatus: string) => {
    setUpdatingMember(memberId);
    try {
      await updateDoc(doc(db, 'members', memberId), { status: newStatus });
      setMembers(members.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD' }}>
      <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
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
        .rc-card { display: flex; flex-direction: column; }
        /* Side columns keep their own height, whatever the centre column shows. */
        .rc-head { display: flex; align-items: center; gap: 11px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #F3E6D8; }
        .rc-ico { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .rc-group { background: linear-gradient(135deg, #FFFDF9 0%, #FBEEDD 100%); border: 1px solid #F0E0CC; border-radius: 13px; padding: 13px; margin-bottom: 10px; }
        .rc-group:last-child { margin-bottom: 0; }
        @media (max-width: 1100px) {
          .UNIMUNITY-ov-grid { grid-template-columns: 1fr !important; }
        }
        .ov-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .ov-back:hover { background: #FBEEDD; }
        .ov-show { padding: 4px 8px; border-radius: 10px; border: 1.5px solid #EAD9BE; font-size: 12.5px; background: #FFFDF9; color: #3A2F1F; outline: none; }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
        @media (max-width: 700px) {
          .UNIMUNITY-ov-nav { grid-template-columns: 1fr auto !important; padding: 10px 14px !important; }
          .UNIMUNITY-ov-nav-title { display: none !important; }
          .UNIMUNITY-ov-container { padding: 14px 14px !important; }
        }
      `}</style>

      {editingGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-fade" style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Edit Group Name</h3>
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="New group name..."
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setEditingGroup(null); setNewGroupName(''); }} className="btn-action"
                style={{ flex: 1, padding: '12px', background: 'transparent', color: '#6B2D4E', border: '2px solid #6B2D4E', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveGroupName} disabled={savingGroup} className="btn-action"
                style={{ flex: 1, padding: '12px', background: '#6B2D4E', color: '#FBEEDD', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                {savingGroup ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-fade" style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>Edit Member</h3>
            <label style={{ display: 'block', color: '#8A7B6C', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Name</label>
            <input
              value={memberEditName}
              onChange={e => setMemberEditName(e.target.value)}
              placeholder="Member name..."
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            />
            <label style={{ display: 'block', color: '#8A7B6C', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px' }}>Payout Date</label>
            <input
              type="date"
              value={memberEditPayoutDate}
              onChange={e => setMemberEditPayoutDate(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setEditingMember(null); setMemberEditName(''); setMemberEditPayoutDate(''); }} className="btn-action"
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

      <div className="UNIMUNITY-ov-nav" style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start', cursor: 'pointer' }} />
        <div className="UNIMUNITY-ov-nav-title" style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Overview</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Rotation, reminders, reports - all automatic.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="UNIMUNITY-ov-container" style={{ maxWidth: 1560, margin: '0 auto', padding: '14px 24px 20px' }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="ov-back">Back to Dashboard</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px', marginBottom: '12px' }}>
          <StatCard label="Total Members" value={members.length} icon="👥" gradient="linear-gradient(135deg,#6B2D4E,#4A1F38)" glow="rgba(107,45,78,0.35)" delay={0} />
          <StatCard label="Active Members" value={activeMembers} icon="✅" gradient="linear-gradient(135deg,#43A047,#2E7D32)" glow="rgba(46,125,50,0.3)" delay={50} />
          <StatCard label="Total Collected" value={`${totalPaid} ${payments[0]?.currency || ''}`} icon="💰" gradient="linear-gradient(135deg,#E9C77B,#C9974D)" glow="rgba(233,199,123,0.35)" delay={100} />
          <StatCard label="Confirmed Payments" value={confirmedPayments} icon="💳" gradient="linear-gradient(135deg,#1E88E5,#1565C0)" glow="rgba(21,101,192,0.3)" delay={150} />
          <StatCard label="Pending Payments" value={pendingPayments} icon="⏳" gradient="linear-gradient(135deg,#FB8C00,#E65100)" glow="rgba(230,81,0,0.3)" delay={200} />
        </div>

        <div className="UNIMUNITY-ov-grid" style={{ display: 'grid', gridTemplateColumns: '250px minmax(0, 1fr) 320px', gap: '16px', alignItems: 'start' }}>
        <div className="UNIMUNITY-ov-sidebar" style={{ background: '#FFFFFF', borderRadius: '18px', padding: '16px 18px', border: '1px solid #F0E4D6', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 12px', paddingBottom: '10px', borderBottom: '1px solid #F3E6D8' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
            { title: 'Record Payment', icon: '💵', path: '/dashboard/record-contribution' },
            { title: 'Add Member', icon: '➕', path: '/dashboard/add-member' },
            { title: 'Referrals', icon: '🤝', path: '/dashboard/referrals' },
            { title: 'Digital Register', icon: '📖', path: '/dashboard/contribution-log' },
            { title: 'Send Reminder', icon: '🔔', path: '/dashboard/reminders' },
            { title: 'Connect Payments', icon: '🏦', path: '/dashboard/payments-setup' },
            { title: 'Reports', icon: '📊', path: '/dashboard/reports' },
            { title: 'Audit Log', icon: '📋', path: '/dashboard/audit-log' },
            { title: 'Documents', icon: '📁', path: '/dashboard/documents' },
            { title: 'Security', icon: '🔒', path: '/dashboard/security' },
            { title: 'White Label', icon: '🎨', path: '/dashboard/branding' },
            { title: 'Leave a Review', icon: '⭐', path: '/leave-review' },
            ...(isPlatformAdmin ? [{ title: 'Repair Members', icon: '🔧', path: '/admin/repair-members' }] : []),
            ].map((a, i) => (
              <div key={i} className="action-card" onClick={() => router.push(a.path)}
                style={{ background: 'linear-gradient(135deg, #FBEEDD 0%, #F3E4D4 100%)', border: '1px solid #E8D5C0', borderRadius: '10px', padding: '4px 10px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(233,199,123,0.15)', display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '9px', background: 'linear-gradient(135deg,#E9C77B,#C9974D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', boxShadow: '0 3px 8px rgba(233,199,123,0.4)', flexShrink: 0 }}>
                  {a.icon}
                </div>
                <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '12.5px', margin: 0 }}>{a.title}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
        <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '18px', padding: '14px 20px', border: '1px solid #F0E4D6', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 12px', paddingBottom: '9px', borderBottom: '1px solid #F3E6D8' }}>
            <h3 style={{ color: '#4A1F38', fontSize: '15px', fontWeight: 800, margin: 0 }}>👤 Member Management <span style={{ fontSize: 12, fontWeight: 600, color: '#8A7B6C' }}>({members.length})</span></h3>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#8A7B6C', fontWeight: 600 }}>Show:</span>
              <select className="ov-show" value={memberShow} onChange={e => setMemberShow(e.target.value)}>
                <option value="5">5</option><option value="10">10</option><option value="25">25</option><option value="all">All</option>
              </select>
            </div>
          </div>
          {members.length === 0 ? (
            <p style={{ color: '#8A7B6C', fontSize: '13px' }}>No members yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
                    {['#', 'TYN-ID', 'Name', 'Payout Date', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 10px', color: '#FBEEDD', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...members].sort((a, b) => a.position - b.position).slice(0, memberShow === 'all' ? undefined : parseInt(memberShow)).map((m, i) => (
                    <tr key={m.id} className="row-hover" style={{ borderBottom: '1px solid #FBEEDD', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '10px 10px', color: '#6B2D4E', fontWeight: 700, fontSize: '13px' }}>#{m.position}</td>
                      <td style={{ padding: '10px 10px', color: '#8A7B6C', fontFamily: 'monospace', fontSize: '12px' }}>{m.tynId}</td>
                      <td style={{ padding: '10px 10px', color: '#4A1F38', fontWeight: 600, fontSize: '13px' }}>{m.name || m.fullName || '-'}</td>
                      <td style={{ padding: '10px 10px', color: '#8A7B6C', fontSize: '12px' }}>{m.payoutDate || '-'}</td>
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
                            <button onClick={() => { setEditingMember(m); setMemberEditName(m.name || ''); setMemberEditPayoutDate(m.payoutDate || ''); }} className="btn-action pill"
                              style={{ background: '#E3F2FD', color: '#1565C0', border: 'none', cursor: 'pointer' }}>
                              ✏️ Edit
                            </button>
                            {m.status !== 'active' && (
                              <button onClick={() => handleUpdateStatus(m.id, 'active')} disabled={updatingMember === m.id} className="btn-action pill"
                                style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', cursor: 'pointer' }}>
                                ▶️ Activate
                              </button>
                            )}
                            {m.status !== 'paused' && (
                              <button onClick={() => handleUpdateStatus(m.id, 'paused')} disabled={updatingMember === m.id} className="btn-action pill"
                                style={{ background: '#E3F2FD', color: '#1565C0', border: 'none', cursor: 'pointer' }}>
                                ⏸️ Pause
                              </button>
                            )}
                            <button onClick={() => handleDeleteMember(m.id, m.name)} disabled={deletingMember === m.id} className="btn-action pill"
                              style={{ background: '#FFEBEE', color: '#C62828', border: 'none', cursor: 'pointer' }}>
                              {deletingMember === m.id ? '...' : '🗑️ Delete'}
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
          <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '18px', padding: '14px 20px', border: '1px solid #F0E4D6', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '12px' }}>
            <h3 style={{ color: '#6B2D4E', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>🧾 Payment Proofs</h3>
            <p style={{ color: '#8A7B6C', fontSize: '12px', margin: '0 0 12px' }}>{pendingProofs.length} proof(s) waiting for validation</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingProofs.map((p, i) => (
                <div key={p.id} style={{ background: '#FBEEDD', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{getPaymentMemberName(p)}</p>
                    <p style={{ color: '#8A7B6C', fontSize: '11px', margin: 0 }}>{p.amount} {p.currency} - {p.paymentDate} - {p.paymentMethod}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <a href={p.proofUrl} target="_blank" rel="noopener noreferrer" className="btn-action pill"
                      style={{ background: '#E3F2FD', color: '#1565C0', textDecoration: 'none' }}>
                      👁️ View
                    </a>
                    <button onClick={() => handleValidateProof(p.id, 'verified')} disabled={validatingProof === p.id} className="btn-action pill"
                      style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', cursor: 'pointer' }}>
                      ✅ Validate
                    </button>
                    <button onClick={() => handleValidateProof(p.id, 'rejected')} disabled={validatingProof === p.id} className="btn-action pill"
                      style={{ background: '#FFEBEE', color: '#C62828', border: 'none', cursor: 'pointer' }}>
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel-card fade-up" style={{ background: 'white', borderRadius: '18px', padding: '14px 20px', border: '1px solid #F0E4D6', boxShadow: '0 2px 14px rgba(107,45,78,0.06)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 12px', paddingBottom: '9px', borderBottom: '1px solid #F3E6D8' }}>
            <h3 style={{ color: '#4A1F38', fontSize: '15px', fontWeight: 800, margin: 0 }}>💵 Recent Contributions <span style={{ fontSize: 12, fontWeight: 600, color: '#8A7B6C' }}>({payments.length})</span></h3>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#8A7B6C', fontWeight: 600 }}>Show:</span>
              <select className="ov-show" value={paymentShow} onChange={e => setPaymentShow(e.target.value)}>
                <option value="5">5</option><option value="10">10</option><option value="25">25</option><option value="all">All</option>
              </select>
            </div>
          </div>
          {payments.length === 0 ? (
            <p style={{ color: '#8A7B6C', fontSize: '13px' }}>No payments recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>
                    {['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '9px 10px', color: '#FBEEDD', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, paymentShow === 'all' ? undefined : parseInt(paymentShow)).map((p, i) => (
                    <tr key={p.id} className="row-hover" style={{ borderBottom: '1px solid #FBEEDD', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '10px 10px' }}>
                        <a href={`/receipt/${p.receiptNumber}`} target="_blank" rel="noreferrer"
                          style={{ color: '#6B2D4E', fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, textDecoration: 'underline' }}>
                          {p.receiptNumber || '-'}
                        </a>
                      </td>
                      <td style={{ padding: '10px 10px', color: '#4A1F38', fontWeight: 600, fontSize: '13px' }}>{getPaymentMemberName(p)}</td>
                      <td style={{ padding: '10px 10px', color: '#2E7D32', fontWeight: 700, fontSize: '13px' }}>{p.amount} {p.currency}</td>
                      <td style={{ padding: '10px 10px', color: '#8A7B6C', fontSize: '12px' }}>{p.paymentMethod}</td>
                      <td style={{ padding: '10px 10px', color: '#8A7B6C', fontSize: '12px' }}>{p.paymentDate}</td>
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

        <div className="UNIMUNITY-ov-right" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
          <div className="panel-card fade-up rc-card" style={{ background: 'white', borderRadius: '18px', padding: '18px', border: '1px solid #F0E4D6', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
            <div className="rc-head">
              <span className="rc-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)', boxShadow: '0 4px 10px rgba(201,151,77,0.35)' }}>{'\u{1F3D8}\uFE0F'}</span>
              <div>
                <h3 style={{ color: '#4A1F38', fontSize: '15px', fontWeight: 800, margin: 0 }}>My Groups</h3>
                <p style={{ color: '#A08B7D', fontSize: '11px', margin: '2px 0 0' }}>{groups.length} {groups.length === 1 ? 'group' : 'groups'}</p>
              </div>
            </div>
            {groups.length === 0 ? (
              <p style={{ color: '#8A7B6C', fontSize: '13px', margin: 0 }}>No groups yet. <span onClick={() => router.push('/dashboard/create-tontine')} style={{ color: '#6B2D4E', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Create one</span></p>
            ) : groups.map((g, i) => (
              <div key={i} className="rc-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <p style={{ color: '#4A1F38', fontWeight: 800, fontSize: '14px', margin: 0 }}>{g.name}</p>
                  <span className="pill" style={{ background: g.status === 'active' ? '#E8F5E9' : '#FFF3E0', color: g.status === 'active' ? '#2E7D32' : '#E65100', padding: '3px 9px', fontSize: '10px', textTransform: 'capitalize' }}>
                    {'\u25CF'} {g.status || 'active'}
                  </span>
                </div>
                <p style={{ color: '#A08B7D', fontSize: '11.5px', margin: '0 0 10px' }}>
                  {g.frequency || 'Weekly'}{(g.contribution || g.amountPerMember) ? ' \u00B7 ' + (g.contribution || g.amountPerMember) + ' ' + (g.currency || 'USD') : ''}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  <button onClick={() => router.push(`/admin/payment-grid/${g.id}`)} className="btn-action"
                    style={{ background: 'linear-gradient(135deg,#E9C77B,#D9AE5E)', color: '#4A1F38', border: 'none', borderRadius: '9px', padding: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                    {'\u{1F4CA}'} Payment Grid
                  </button>
                  <button onClick={() => { setEditingGroup(g); setNewGroupName(g.name); }} className="btn-action"
                    style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FBEEDD', border: 'none', borderRadius: '9px', padding: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                    {'\u270F\uFE0F'} Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      </div>
      <Footer />
    </div>
  );
}

export default function Overview() {
  return <OverviewContent />;
}
