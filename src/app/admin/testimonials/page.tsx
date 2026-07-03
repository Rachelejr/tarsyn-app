'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', or: '#E9C77B',
  creme: '#FBEEDD', border: '#EAD9BE', muted: '#6b7280',
};

export default function TestimonialsAdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email === SUPER_ADMIN_EMAIL) setAuthorized(true);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'testimonials'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPending(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (authorized) loadPending(); }, [authorized]);

  const moderate = async (testimonialId: string, action: 'approve' | 'reject') => {
    setActingOn(testimonialId);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/testimonials/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, testimonialId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setPending(prev => prev.filter(t => t.id !== testimonialId));
      } else {
        alert('Failed: ' + (data.error || 'unknown error'));
      }
    } catch (e) {
      alert('Failed to moderate.');
    } finally {
      setActingOn(null);
    }
  };

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.creme }}>
      <p style={{ color: C.bordeaux }}>Checking access...</p>
    </div>
  );

  if (!authorized) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.creme }}>
      <p style={{ color: '#C62828', fontWeight: 700 }}>Access denied.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ color: C.bordeaux, fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Review Moderation</h1>
        <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 24px' }}>
          Approve reviews to show them on the public homepage, or reject spam/inappropriate ones.
        </p>

        {loading ? (
          <p style={{ color: C.muted, fontSize: '13px' }}>Loading...</p>
        ) : pending.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p style={{ color: C.muted, fontSize: '14px' }}>No pending reviews.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pending.map((t) => (
              <div key={t.id} style={{ background: 'white', borderRadius: '16px', padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: C.bordeaux, fontWeight: 700, fontSize: '14px', margin: 0 }}>{t.authorName} <span style={{ color: C.muted, fontWeight: 400, fontSize: '12px' }}>({t.authorRole})</span></p>
                    <p style={{ color: C.or, fontSize: '14px', margin: '3px 0 0' }}>{'*'.repeat(t.rating || 0)}{'o'.repeat(5 - (t.rating || 0))}</p>
                  </div>
                </div>
                <p style={{ color: '#333', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 16px' }}>{t.text}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => moderate(t.id, 'approve')} disabled={actingOn === t.id}
                    style={{ background: '#E8F5E9', color: '#2E7D32', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    {actingOn === t.id ? '...' : 'Approve'}
                  </button>
                  <button onClick={() => moderate(t.id, 'reject')} disabled={actingOn === t.id}
                    style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                    {actingOn === t.id ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
