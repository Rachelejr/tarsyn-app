'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38',
  or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', blanc: '#FFFFFF',
  text: '#1a1a1a', muted: '#6b7280', border: '#e5e7eb',
};

interface AuditEntry {
  id: string;
  action: string;
  category: string;
  user: string;
  details: string;
  createdAt?: { seconds: number };
  groupId?: string;
}

const CATEGORIES = ['All', 'Payment', 'Member', 'Group', 'Auth', 'Document', 'System'];

const categoryColor = (cat: string) => {
  const map: Record<string, { bg: string; color: string }> = {
    Payment: { bg: '#d1fae5', color: '#065f46' },
    Member: { bg: '#dbeafe', color: '#1e40af' },
    Group: { bg: C.creme, color: '#92400e' },
    Auth: { bg: '#f3f4f6', color: '#374151' },
    Document: { bg: '#fef3c7', color: '#92400e' },
    System: { bg: '#f3e0e5', color: '#7B2D42' },
  };
  return map[cat] || { bg: '#f3f4f6', color: '#6b7280' };
};

function AuditLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId') || '';
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const q = query(
          collection(db, 'audit_logs'),
          where('organizerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditEntry)));
      } catch (e) {
        console.error(e);
        setEntries([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted, fontFamily: 'Inter, sans-serif' }}>Loading audit log...</p>
    </div>
  );

  const filtered = entries.filter(e => {
    if (category !== 'All' && e.category !== category) return false;
    if (search && !e.action?.toLowerCase().includes(search.toLowerCase()) && !e.user?.toLowerCase().includes(search.toLowerCase()) && !e.details?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const rows = [['Date', 'Category', 'Action', 'User', 'Details']];
    filtered.forEach(e => rows.push([
      e.createdAt ? new Date(e.createdAt.seconds * 1000).toLocaleString() : '',
      e.category || '', e.action || '', e.user || '', e.details || ''
    ]));
    const csv = rows.map(r => r.map(v => '"' + v + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'audit-log.csv'; a.click();
  };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: C.bordeauxDark, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: C.orLight, fontSize: 18, fontWeight: 700, margin: 0 }}>Audit Log</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0' }}>Complete traceability of all actions</p>
        </div>
        <button onClick={() => router.push('/dashboard/overview?groupId=' + groupId)}
          style={{ background: 'rgba(255,255,255,0.08)', color: C.orLight, border: '1px solid ' + C.or, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' }}>
          Back to Overview
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Events', value: String(entries.length) },
            { label: 'Payments', value: String(entries.filter(e => e.category === 'Payment').length) },
            { label: 'Members', value: String(entries.filter(e => e.category === 'Member').length) },
            { label: 'Auth Events', value: String(entries.filter(e => e.category === 'Auth').length) },
          ].map(k => (
            <div key={k.label} style={{ background: C.blanc, borderRadius: 14, padding: '16px 20px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.8, margin: '0 0 6px' }}>{k.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: 0 }}>{k.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: C.blanc, borderRadius: 14, padding: '16px 20px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} placeholder="Search actions, users..."
            style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, outline: 'none', flex: 1, minWidth: 200 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (category === cat ? C.or : C.border), background: category === cat ? C.or : C.blanc, color: category === cat ? C.bordeauxDark : C.muted }}>
                {cat}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}
            style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 9, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Export CSV
          </button>
        </div>

        <div style={{ background: C.blanc, borderRadius: 14, border: '1px solid ' + C.border, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 24 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: C.or, textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>Event History</h2>
            <span style={{ fontSize: 12, color: C.muted }}>{filtered.length} events</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, color: C.muted, margin: '0 0 8px' }}>No audit events yet</p>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Actions like payments, member changes, and logins will appear here automatically.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Date & Time', 'Category', 'Action', 'User', 'Details'].map(h => (
                    <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const cc = categoryColor(e.category);
                  return (
                    <tr key={e.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? C.blanc : '#fdfcfb' }}>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: C.muted, whiteSpace: 'nowrap' as const }}>
                        {e.createdAt ? new Date(e.createdAt.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cc.bg, color: cc.color }}>{e.category || '-'}</span>
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: C.text }}>{e.action || '-'}</td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: C.muted }}>{e.user || '-'}</td>
                      <td style={{ padding: '12px 18px', fontSize: 12, color: C.muted, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{e.details || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 16, letterSpacing: 0.3 }}>
          Powered by TARSYNTM - A product of Ma Production Luxenn Zara LLC - (c) 2026 All Rights Reserved - v1.0.0
        </p>
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <AuditLogContent />
    </Suspense>
  );
}
