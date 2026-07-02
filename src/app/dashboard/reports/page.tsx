'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const C = {
  bordeaux: '#B24C72', bordeauxDark: '#8F3A5A',
  or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', blanc: '#FFFFFF',
  text: '#1a1a1a', muted: '#6b7280', border: '#e5e7eb',
};

interface Contribution { id: string; memberName: string; amount: number; method?: string; date?: string; status: string; receiptNumber?: string; groupId: string; }
interface Member { id: string; fullName: string; status: string; expectedAmount?: number; }

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId') || '';
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!groupId) return;
    const fetch = async () => {
      const user = auth.currentUser; if (!user) { setLoading(false); return; }
      if (!user) { setLoading(false); return; }
      try {
        const cSnap = await getDocs(query(collection(db, 'contributions'), where('groupId', '==', groupId), orderBy('createdAt', 'desc')));
        setContributions(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution)));
        const mSnap = await getDocs(query(collection(db, 'members'), where('groupId', '==', groupId)));
        setMembers(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, [groupId, router]);

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted, fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </div>
  );

  const now = new Date();
  const filtered = contributions.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (period === 'all') return true;
    if (!c.date) return false;
    const d = new Date(c.date);
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'quarter') return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalCollected = filtered.filter(c => c.status === 'confirmed').reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = filtered.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
  const confirmedCount = filtered.filter(c => c.status === 'confirmed').length;
  const pendingCount = filtered.filter(c => c.status === 'pending').length;
  const expectedTotal = members.reduce((s, m) => s + (m.expectedAmount || 0), 0);

  const exportCSV = () => {
    const rows = [['Receipt', 'Member', 'Amount', 'Method', 'Date', 'Status']];
    filtered.forEach(c => rows.push([c.receiptNumber || '', c.memberName, String(c.amount), c.method || '', c.date || '', c.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tarsyn-report.csv'; a.click();
  };

  const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5 };
  const selectStyle = { padding: '8px 12px', borderRadius: 9, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, background: C.blanc, cursor: 'pointer', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: C.bordeauxDark, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: C.orLight, fontSize: 18, fontWeight: 700, margin: 0 }}>Reports Center</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0' }}>Financial reports & exports</p>
        </div>
        <button onClick={() => router.push('/dashboard/overview?groupId=' + groupId)}
          style={{ background: 'rgba(255,255,255,0.08)', color: C.orLight, border: '1px solid ' + C.or, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
          Back to Overview
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        <div style={{ background: C.blanc, borderRadius: 16, padding: '18px 22px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
          <div>
            <p style={labelStyle}>Period</p>
            <select style={selectStyle} value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="all">All time</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="year">This year</option>
            </select>
          </div>
          <div>
            <p style={labelStyle}>Status</p>
            <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={exportCSV}
              style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Export CSV
            </button>
            <button onClick={() => window.print()}
              style={{ background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Print
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Collected', value: '$' + totalCollected.toFixed(2), color: C.or },
            { label: 'Total Pending', value: '$' + totalPending.toFixed(2), color: '#92400e' },
            { label: 'Confirmed', value: String(confirmedCount), color: '#065f46' },
            { label: 'Expected', value: '$' + expectedTotal.toFixed(2), color: C.text },
          ].map(k => (
            <div key={k.label} style={{ background: C.blanc, borderRadius: 16, padding: '18px 20px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.8, margin: '0 0 8px' }}>{k.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: k.color, margin: 0, letterSpacing: -0.5 }}>{k.value}</p>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 32, letterSpacing: 0.3 }}>
          Powered by TARSYN™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
        </p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
