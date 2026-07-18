'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import TrialGuard from '@/components/TrialGuard';
import * as XLSX from 'xlsx';

const C = {
  cream: '#F8F4EC',
  creamAccent: '#F4E8D8',
  white: '#FFFFFF',
  burgundy: '#4A1F38',
  burgundyDark: '#4A1F38',
  burgundySoft: '#6B2D4E',
  gold: '#E9C77B',
  goldLight: '#F0DCA8',
  gray: '#666666',
  lightGray: '#D9D9D9',
};

type PaymentStatus = 'paid' | 'pending' | 'late' | 'excused' | 'missed';

const STATUS_STYLE: Record<PaymentStatus, { bg: string; color: string; label: string; dot: string }> = {
  paid: { bg: C.gold, color: '#FFFFFF', label: 'Paid', dot: C.gold },
  pending: { bg: C.creamAccent, color: C.burgundyDark, label: 'Pending', dot: '#D9B98C' },
  late: { bg: C.burgundyDark, color: '#FFFFFF', label: 'Late', dot: C.burgundyDark },
  excused: { bg: C.goldLight, color: C.burgundyDark, label: 'Excused', dot: C.goldLight },
  missed: { bg: C.lightGray, color: C.gray, label: 'Missed', dot: C.lightGray },
};

const ALL_STATUSES: PaymentStatus[] = ['paid', 'pending', 'late', 'excused', 'missed'];

const SIDEBAR_ITEMS = [
  { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
  { icon: '👥', label: 'Members', path: '/dashboard/add-member' },
  { icon: '🔄', label: 'Cycles', path: '/dashboard/overview' },
  { icon: '📋', label: 'Register', path: '/dashboard/contribution-log', active: true },
  { icon: '📁', label: 'Documents', path: '/dashboard/documents' },
  { icon: '⚙️', label: 'Settings', path: '/dashboard/subscription' },
];

function StatusCell({ status, onClick }: { status?: PaymentStatus; onClick: (e: React.MouseEvent) => void }) {
  const s = status ? STATUS_STYLE[status] : null;
  return (
    <div onClick={onClick} style={{
      width: '52px', height: '26px', borderRadius: '6px', cursor: 'pointer',
      background: s ? s.bg : '#FAFAFA', color: s ? s.color : '#999',
      border: s ? 'none' : '1px dashed #D9D9D9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '9.5px', fontWeight: 700,
    }}>
      {s ? s.label : '—'}
    </div>
  );
}

function DonutChart({ data }: { data: { status: PaymentStatus; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p style={{ color: C.gray, fontSize: '12px', textAlign: 'center' }}>No data yet.</p>;
  let cumulative = 0;
  const stops = data.map(d => {
    const start = (cumulative / total) * 360;
    cumulative += d.count;
    const end = (cumulative / total) * 360;
    return `${STATUS_STYLE[d.status].dot} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center' }}>
      <div style={{
        width: '110px', height: '110px', borderRadius: '50%',
        background: `conic-gradient(${stops})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: C.burgundyDark, fontWeight: 800, fontSize: '15px' }}>{total}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {data.filter(d => d.count > 0).map(d => (
          <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '3px', background: STATUS_STYLE[d.status].dot }} />
            <span style={{ fontSize: '11px', color: C.gray, fontWeight: 600 }}>{STATUS_STYLE[d.status].label} · {d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [organizerId, setOrganizerId] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [cycleFilter, setCycleFilter] = useState<string>('All');
  const [periodFilter, setPeriodFilter] = useState<string>('All Time');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusMenu, setStatusMenu] = useState<{ memberId: string; cycle: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setOrganizerId(u.uid);
      try {
        const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
        const gsnap = await getDocs(gq);
        if (!gsnap.empty) setGroup({ id: gsnap.docs[0].id, ...gsnap.docs[0].data() });

        const mq = query(collection(db, 'members'), where('organizerId', '==', u.uid));
        const msnap = await getDocs(mq);
        setMembers(msnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const pq = query(collection(db, 'payments'), where('organizerId', '==', u.uid));
        const psnap = await getDocs(pq);
        setPayments(psnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const cycles = useMemo(() => {
    const set = new Set<number>();
    payments.forEach(p => { if (typeof p.cycle === 'number') set.add(p.cycle); });
    const highestRecorded = set.size > 0 ? Math.max(...set) : 0;
    // A tontine cycle = one full rotation (every member contributes, one member is paid out).
    // Total cycles should automatically track the REAL, current member count — not the
    // capacity originally planned when the group was created (group.numMembers), which
    // doesn't change as members are actually added. Falls back to that planned number
    // only before any real members exist yet, so this never shows "0 cycles".
    const configuredTotal = members.length > 0 ? members.length : (group?.numMembers || 4);
    return Array.from({ length: Math.max(highestRecorded, configuredTotal) }, (_, i) => i + 1);
  }, [payments, group, members]);

  // The "current cycle" is the first cycle not yet fully paid by every member —
  // not simply the last cycle in the list (that made it always equal the total
  // cycle count, so "Cycles" and "Current Cycle" always showed the same number).
  const currentCycle = useMemo(() => {
    for (const c of cycles) {
      const allPaid = members.length > 0 && members.every(m => {
        const p = payments.find(pp => pp.memberId === m.id && pp.cycle === c);
        return p && p.status === 'confirmed';
      });
      if (!allPaid) return c;
    }
    return cycles[cycles.length - 1] || 1;
  }, [cycles, members, payments]);

  const getPaymentFor = (memberId: string, cycle: number) => payments.find(p => p.memberId === memberId && p.cycle === cycle);

  const getStatusLabel = (p: any): PaymentStatus | undefined =>
    !p ? undefined : p.status === 'confirmed' ? 'paid' : p.status === 'pending' ? 'pending' : p.status === 'late' ? 'late' : p.status === 'excused' ? 'excused' : 'missed';

  const handleStatusChange = async (memberId: string, cycle: number, newStatus: PaymentStatus) => {
    const existing = getPaymentFor(memberId, cycle);
    const firestoreStatus = newStatus === 'paid' ? 'confirmed' : newStatus;
    setStatusError('');
    try {
      if (existing) {
        await updateDoc(doc(db, 'payments', existing.id), { status: firestoreStatus });
        setPayments(prev => prev.map(p => p.id === existing.id ? { ...p, status: firestoreStatus } : p));
      } else {
        const member = members.find(m => m.id === memberId);
        const newDoc = await addDoc(collection(db, 'payments'), {
          memberId, memberName: member?.fullName || member?.name || '', cycle, status: firestoreStatus, amount: 0,
          currency: payments[0]?.currency || '', organizerId,
          paymentDate: new Date().toISOString().slice(0, 10), createdAt: serverTimestamp(),
        });
        setPayments(prev => [...prev, { id: newDoc.id, memberId, memberName: member?.fullName || member?.name || '', cycle, status: firestoreStatus, amount: 0, organizerId, paymentDate: new Date().toISOString().slice(0, 10) }]);
      }
    } catch (e: any) {
      console.error(e);
      setStatusError('Could not save this status change: ' + (e?.message || 'unknown error'));
    }
  };

  const getBalance = (memberId: string) => payments.filter(p => p.memberId === memberId && p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
  const getLastPayment = (memberId: string) => {
    const ps = payments.filter(p => p.memberId === memberId && p.paymentDate).sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
    return ps[0]?.paymentDate || '—';
  };

  const handleExportExcel = () => {
    const rows = members.sort((a, b) => a.position - b.position).map(m => {
      const row: any = { '#': m.position, 'TYN-ID': m.tynId, 'Name': (m.fullName || m.name || ''), 'Status': m.status || 'pending', 'Balance': getBalance(m.id), 'Last Payment': getLastPayment(m.id) };
      cycles.forEach(c => { const p = getPaymentFor(m.id, c); row[`Cycle ${c}`] = p ? (p.status === 'confirmed' ? 'Paid' : p.status) : ''; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Register');
    XLSX.writeFile(wb, `TARSYN_Register_${group?.name || 'Group'}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = members.sort((a, b) => a.position - b.position).map(m => ({ '#': m.position, 'TYN-ID': m.tynId, 'Name': (m.fullName || m.name || ''), 'Status': m.status || 'pending', 'Balance': getBalance(m.id) }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `TARSYN_Register_${group?.name || 'Group'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizerId) return;
    setImporting(true); setImportMsg('');
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      let added = 0, skipped = 0;
      for (const row of rows) {
        const name = row['Name'] || row['name'];
        if (!name) { skipped++; continue; }
        if (members.find(m => (m.fullName || m.name)?.toLowerCase() === String(name).toLowerCase())) { skipped++; continue; }
        await addDoc(collection(db, 'members'), {
          name: String(name), tynId: row['TYN-ID'] || row['tynId'] || `TYN-IMP-${Date.now()}-${added}`,
          position: Number(row['#'] || row['position'] || members.length + added + 1),
          status: (row['Status'] || row['status'] || 'pending').toLowerCase(),
          payoutDate: row['Payout Date'] || row['payoutDate'] || '', organizerId, source: 'excel-import', createdAt: serverTimestamp(),
        });
        added++;
      }
      setImportMsg(`✓ ${added} imported, ${skipped} skipped.`);
      const mq = query(collection(db, 'members'), where('organizerId', '==', organizerId));
      const msnap = await getDocs(mq);
      setMembers(msnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      setImportMsg('✗ Import failed.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handlePrint = () => window.print();

  const filteredMembers = members.filter(m => {
    const matchSearch = (m.fullName || m.name)?.toLowerCase().includes(search.toLowerCase()) || m.tynId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || m.status === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.cream }}>
      <p style={{ color: C.burgundy, fontSize: '18px', fontWeight: 600 }}>Loading register...</p>
    </div>
  );

  const totalCollected = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
  const paidThisCycle = payments.filter(p => p.cycle === currentCycle && p.status === 'confirmed').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const lateCount = payments.filter(p => p.status === 'late').length;
  const expected = members.length * (group?.amountPerMember || 0);
  const commission = totalCollected * ((group?.commissionRate || 1) / 100);

  const statusCounts: { status: PaymentStatus; count: number }[] = ALL_STATUSES.map(st => ({
    status: st,
    count: payments.filter(p => getStatusLabel(p) === st).length,
  }));

  const recentActivity = [
    group?.createdAt && { icon: '🏘️', text: 'Group created', date: group.name },
    ...members.slice(0, 3).map(m => ({ icon: '👤', text: `${m.fullName || m.name || 'A member'} added as member`, date: m.tynId })),
    ...payments.slice(-3).reverse().map(p => ({ icon: '💰', text: `Payment recorded — ${p.amount} ${p.currency}`, date: p.paymentDate })),
  ].filter(Boolean) as { icon: string; text: string; date: string }[];

  const methodCounts: Record<string, number> = {};
  payments.forEach(p => { if (p.paymentMethod) methodCounts[p.paymentMethod] = (methodCounts[p.paymentMethod] || 0) + 1; });
  const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'Inter, sans-serif', display: 'flex' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { opacity: 0; animation: fadeUp 0.4s ease forwards; }
        .reg-row { transition: background 0.15s ease; cursor: pointer; }
        .reg-row:hover { background: ${C.creamAccent} !important; }
        .filter-pill { transition: all 0.15s ease; cursor: pointer; }
        .btn-action { transition: all 0.15s ease; }
        .btn-action:hover { filter: brightness(0.95); }
        .side-item { transition: all 0.15s ease; cursor: pointer; }
        .side-item:hover { background: rgba(255,255,255,0.08); }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="no-print" style={{ width: '210px', background: C.burgundyDark, flexShrink: 0, padding: '20px 14px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '28px', paddingLeft: '6px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', background: group?.logoUrl ? 'transparent' : C.gold,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: C.burgundyDark, fontSize: '15px', overflow: 'hidden', flexShrink: 0,
          }}>
            {group?.logoUrl ? <img src={group.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (group?.officialName || group?.name || 'T').charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: C.goldLight, fontWeight: 800, fontSize: '13.5px', margin: 0, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {group?.officialName || group?.name || 'Your Org'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '9px', margin: 0 }}>Powered by TARSYN™</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {SIDEBAR_ITEMS.map(item => (
            <div key={item.label} className="side-item" onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px',
                background: item.active ? 'rgba(233,199,123,0.18)' : 'transparent',
                color: item.active ? C.gold : 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: item.active ? 700 : 600,
              }}>
              <span style={{ fontSize: '15px' }}>{item.icon}</span> {item.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            A product of Ma Production Luxenn Zara LLC<br />© 2026 · v1.0.0
          </p>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="no-print" style={{ background: C.burgundy, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 14px rgba(0,0,0,0.15)' }}>
          <div>
            <p style={{ color: C.goldLight, fontWeight: 800, fontSize: '18px', margin: 0 }}>Digital Tontine Register</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11.5px', margin: '2px 0 0', fontWeight: 600 }}>Admin Only</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span style={{ fontSize: '16px', cursor: 'pointer' }}>🔔</span>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px 28px 50px' }}>
          <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: C.white, borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.gray, fontSize: '10.5px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Collected</p>
              <p style={{ color: C.burgundyDark, fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{totalCollected.toLocaleString()}</p>
              <p style={{ color: C.gray, fontSize: '9.5px', margin: '2px 0 0' }}>{payments[0]?.currency || ''}</p>
            </div>
            <div style={{ background: C.white, borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.gray, fontSize: '10.5px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Expected</p>
              <p style={{ color: C.burgundyDark, fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{expected.toLocaleString()}</p>
              <p style={{ color: C.gray, fontSize: '9.5px', margin: '2px 0 0' }}>{payments[0]?.currency || ''}</p>
            </div>
            <div style={{ background: C.white, borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.gray, fontSize: '10.5px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Paid (Cycle {currentCycle})</p>
              <p style={{ color: C.gold, fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{paidThisCycle}/{members.length}</p>
              <p style={{ color: C.gray, fontSize: '9.5px', margin: '2px 0 0' }}>members</p>
            </div>
            <div style={{ background: C.white, borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.gray, fontSize: '10.5px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Pending</p>
              <p style={{ color: C.burgundyDark, fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{pendingCount}</p>
              <p style={{ color: C.gray, fontSize: '9.5px', margin: '2px 0 0' }}>payments</p>
            </div>
            <div style={{ background: C.white, borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.gray, fontSize: '10.5px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Late</p>
              <p style={{ color: C.burgundyDark, fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{lateCount}</p>
              <p style={{ color: C.gray, fontSize: '9.5px', margin: '2px 0 0' }}>payments</p>
            </div>
            <div style={{ background: C.white, borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.gray, fontSize: '10.5px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Commission</p>
              <p style={{ color: C.burgundyDark, fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{commission.toFixed(2)}</p>
              <p style={{ color: C.gray, fontSize: '9.5px', margin: '2px 0 0' }}>{group?.commissionRate || 1}%</p>
            </div>
            <div style={{ background: C.white, borderRadius: '12px', padding: '14px 12px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.gray, fontSize: '10.5px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Top Method</p>
              <p style={{ color: C.burgundyDark, fontSize: '16px', fontWeight: 800, margin: '4px 0 0', textTransform: 'capitalize' }}>{topMethod}</p>
              <p style={{ color: C.gray, fontSize: '9.5px', margin: '2px 0 0' }}>payment type</p>
            </div>
          </div>

          {statusError && (
            <div className="fade-up no-print" style={{ background: '#FDEAEA', border: '1px solid #E8B4B4', borderRadius: '10px', padding: '10px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: '#8B2D2D', fontSize: '12.5px', margin: 0 }}>⚠️ {statusError}</p>
              <button onClick={() => setStatusError('')} style={{ background: 'none', border: 'none', color: '#8B2D2D', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>✕</button>
            </div>
          )}

          <div className="fade-up no-print" style={{ background: C.white, borderRadius: '12px', padding: '16px 18px', marginBottom: '16px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text" placeholder="Search by name or TYN-ID..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '9px 14px', borderRadius: '8px', border: `1px solid ${C.lightGray}`, fontSize: '13px', outline: 'none' }}
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', border: `1px solid ${C.lightGray}`, fontSize: '13px', color: C.burgundyDark, fontWeight: 600, cursor: 'pointer' }}>
              <option value="All">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
              <option value="missed">Missed</option>
            </select>
            <select value={cycleFilter} onChange={e => setCycleFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', border: `1px solid ${C.lightGray}`, fontSize: '13px', color: C.burgundyDark, fontWeight: 600, cursor: 'pointer' }}>
              <option value="All">All Cycles</option>
              {cycles.map(c => <option key={c} value={String(c)}>Cycle {c}</option>)}
            </select>
            <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', border: `1px solid ${C.lightGray}`, fontSize: '13px', color: C.burgundyDark, fontWeight: 600, cursor: 'pointer' }}>
              <option value="All Time">All Time</option>
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          <div className="fade-up no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button className="btn-action" onClick={handleExportExcel}
              style={{ background: C.gold, color: C.white, border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
              📊 Export Excel
            </button>
            <button className="btn-action" onClick={handleExportCSV}
              style={{ background: C.burgundy, color: C.white, border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
              📄 Export CSV
            </button>
            <button className="btn-action" onClick={handlePrint}
              style={{ background: C.white, color: C.burgundyDark, border: `1px solid ${C.lightGray}`, borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
              🖨️ Print
            </button>
            <button className="btn-action" onClick={() => fileInputRef.current?.click()} disabled={importing}
              style={{ background: C.white, color: C.burgundyDark, border: `1px solid ${C.lightGray}`, borderRadius: '8px', padding: '9px 16px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
              {importing ? '⏳ Importing...' : '📥 Import Excel'}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ display: 'none' }} />
            {importMsg && <span style={{ fontSize: '12px', color: C.burgundyDark, fontWeight: 600 }}>{importMsg}</span>}
          </div>

          <div className="fade-up" style={{ background: C.white, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(74,31,56,0.06)', marginBottom: '24px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: C.burgundyDark }}>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: C.goldLight, fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase' }}>#</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: C.goldLight, fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase' }}>Member</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: C.goldLight, fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase' }}>TYN-ID</th>
                    {cycles.map(c => (
                      <th key={c} style={{ padding: '12px 8px', textAlign: 'center', color: C.goldLight, fontWeight: 700, fontSize: '10.5px' }}>C{c}</th>
                    ))}
                    <th style={{ padding: '12px 10px', textAlign: 'right', color: C.goldLight, fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase' }}>Balance</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: C.goldLight, fontWeight: 700, fontSize: '10.5px', textTransform: 'uppercase' }}>Last Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.sort((a, b) => (a.position || 0) - (b.position || 0)).map((m, idx) => (
                    <tr key={m.id} className="reg-row" onClick={() => setSelectedMember(m)}
                      style={{ borderBottom: `1px solid ${C.cream}`, background: idx % 2 === 0 ? C.white : C.cream }}>
                      <td style={{ padding: '10px 10px', color: C.gray, fontWeight: 600 }}>{m.position || idx + 1}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', background: C.goldLight,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: C.burgundyDark, fontSize: '11px', flexShrink: 0, overflow: 'hidden',
                          }}>
                            {m.photoUrl ? <img src={m.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.fullName || m.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ color: C.burgundyDark, fontWeight: 700 }}>{m.fullName || m.name || '(no name)'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', color: C.gray, fontSize: '11px' }}>{m.tynId}</td>
                      {cycles.map(c => (
                        <td key={c} style={{ padding: '8px 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <StatusCell status={getStatusLabel(getPaymentFor(m.id, c))} onClick={e => {
                            e.stopPropagation();
                            setStatusMenu({ memberId: m.id, cycle: c, x: e.clientX, y: e.clientY });
                          }} />
                        </td>
                      ))}
                      <td style={{ padding: '10px 10px', textAlign: 'right', color: C.burgundyDark, fontWeight: 700 }}>{getBalance(m.id).toLocaleString()}</td>
                      <td style={{ padding: '10px 10px', color: C.gray, fontSize: '11px' }}>{getLastPayment(m.id)}</td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr><td colSpan={cycles.length + 5} style={{ padding: '30px', textAlign: 'center', color: C.gray }}>No members match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="fade-up no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: C.white, borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.burgundyDark, fontWeight: 800, fontSize: '14px', margin: '0 0 14px' }}>Financial Summary</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: C.gray, fontSize: '12px' }}>Total Collected</span>
                <span style={{ color: C.burgundyDark, fontWeight: 700, fontSize: '12.5px' }}>{totalCollected.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: C.gray, fontSize: '12px' }}>Total Expected</span>
                <span style={{ color: C.burgundyDark, fontWeight: 700, fontSize: '12.5px' }}>{expected.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: C.gray, fontSize: '12px' }}>Commission ({group?.commissionRate || 1}%)</span>
                <span style={{ color: C.burgundyDark, fontWeight: 700, fontSize: '12.5px' }}>{commission.toFixed(2)}</span>
              </div>
              <div style={{ height: '1px', background: C.cream, margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.burgundyDark, fontSize: '13px', fontWeight: 800 }}>Net Balance</span>
                <span style={{ color: C.gold, fontWeight: 800, fontSize: '14px' }}>{(totalCollected - commission).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ background: C.white, borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.burgundyDark, fontWeight: 800, fontSize: '14px', margin: '0 0 14px', textAlign: 'center' }}>Participation</p>
              <DonutChart data={statusCounts} />
            </div>

            <div style={{ background: C.white, borderRadius: '14px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(74,31,56,0.06)' }}>
              <p style={{ color: C.burgundyDark, fontWeight: 800, fontSize: '14px', margin: '0 0 14px' }}>Recent Activity</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {recentActivity.length === 0 && <p style={{ color: C.gray, fontSize: '12px' }}>No recent activity.</p>}
                {recentActivity.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{a.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: C.burgundyDark, fontSize: '11.5px', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{a.text}</p>
                      <p style={{ color: C.gray, fontSize: '10px', margin: '1px 0 0' }}>{a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="fade-up no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: C.creamAccent, borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ color: C.gray, fontSize: '10px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Members</p>
              <p style={{ color: C.burgundyDark, fontSize: '15px', fontWeight: 800, margin: '3px 0 0' }}>{members.length}</p>
            </div>
            <div style={{ background: C.creamAccent, borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ color: C.gray, fontSize: '10px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Cycles</p>
              <p style={{ color: C.burgundyDark, fontSize: '15px', fontWeight: 800, margin: '3px 0 0' }}>{cycles.length}</p>
            </div>
            <div style={{ background: C.creamAccent, borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ color: C.gray, fontSize: '10px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Current Cycle</p>
              <p style={{ color: C.burgundyDark, fontSize: '15px', fontWeight: 800, margin: '3px 0 0' }}>{currentCycle}</p>
            </div>
            <div style={{ background: C.creamAccent, borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ color: C.gray, fontSize: '10px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Currency</p>
              <p style={{ color: C.burgundyDark, fontSize: '15px', fontWeight: 800, margin: '3px 0 0' }}>{payments[0]?.currency || '—'}</p>
            </div>
            <div style={{ background: C.creamAccent, borderRadius: '12px', padding: '12px 14px' }}>
              <p style={{ color: C.gray, fontSize: '10px', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Frequency</p>
              <p style={{ color: C.burgundyDark, fontSize: '15px', fontWeight: 800, margin: '3px 0 0' }}>{group?.paymentFrequency || '—'}</p>
            </div>
          </div>

          <div className="no-print" style={{ textAlign: 'center', padding: '20px 0 0' }}>
            <p style={{ color: C.gray, fontSize: '10.5px', margin: 0 }}>
              Powered by TARSYN™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
            </p>
          </div>
        </div>
      </div>

      {statusMenu && (
        <div onClick={() => setStatusMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
          <div style={{
            position: 'fixed', top: statusMenu.y, left: statusMenu.x, background: C.white, borderRadius: '10px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.18)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 1000,
          }}>
            {ALL_STATUSES.map(st => (
              <div key={st} onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(statusMenu.memberId, statusMenu.cycle, st);
                setStatusMenu(null);
              }} style={{
                padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].color, whiteSpace: 'nowrap',
              }}>
                {STATUS_STYLE[st].label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContributionLogPage() {
  return (
    <TrialGuard>
      <RegisterContent />
    </TrialGuard>
  );
}
