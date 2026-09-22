'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';

const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38', or: '#E9C77B',
  creme: '#FBEEDD', border: '#EAD9BE', muted: '#6b7280',
};

export default function TestimonialsAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email === SUPER_ADMIN_EMAIL) setAuthorized(true);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  // No orderBy in either query on purpose: pairing where('status', '==',
  // ...) with orderBy('createdAt', ...) needs a composite Firestore index
  // that was never created for this project, so the query used to fail
  // every time (silently - the error only ever reached the console), and
  // this page always showed "No pending reviews" even when people had
  // submitted some. Sorting each small list by hand below gets the same
  // newest-first order without requiring that index.
  const loadPending = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'testimonials'), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setPending(docs);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadApproved = async () => {
    try {
      const q = query(collection(db, 'testimonials'), where('status', '==', 'approved'));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      docs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setApproved(docs);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (authorized) { loadPending(); loadApproved(); } }, [authorized]);

  const moderate = async (testimonialId: string, action: 'approve' | 'reject' | 'delete') => {
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
        setApproved(prev => prev.filter(t => t.id !== testimonialId));
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
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Same header bar as every other page in the app (logo + tagline,
          date/time/temperature on the right) - this page was missing it
          entirely and had no way back into the rest of the app. Logo is
          clickable back to /dashboard, matching the other admin pages. */}
      <div style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        rowGap: '10px',
      }}>
        <div>
          <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', cursor: 'pointer' }} />
          <div style={{ color: '#C4748E', fontSize: '9px', letterSpacing: '2px', fontStyle: 'italic', marginTop: '2px' }}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <DateTimeWeather textColor="rgba(251,238,221,0.85)" />
        </div>
      </div>

      <div style={{ flex: 1, padding: '40px 24px' }}>
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
                    <p style={{ color: C.or, fontSize: '14px', margin: '3px 0 0' }}>{'★'.repeat(t.rating || 0)}{'☆'.repeat(5 - (t.rating || 0))}</p>
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

        {/* Published reviews - the ones already showing on the public
            homepage, with a Remove option. Added so Rachele can clear out
            her own test submissions (used to check the moderation flow
            actually worked) without needing to touch Firebase directly. */}
        <h2 style={{ color: C.bordeaux, fontSize: '18px', fontWeight: 800, margin: '36px 0 6px' }}>Published on homepage</h2>
        <p style={{ color: C.muted, fontSize: '13px', margin: '0 0 16px' }}>
          These are live on the public homepage right now. Remove any you don&apos;t want showing (e.g. test reviews).
        </p>
        {approved.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p style={{ color: C.muted, fontSize: '14px' }}>Nothing published yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {approved.map((t) => (
              <div key={t.id} style={{ background: 'white', borderRadius: '16px', padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <p style={{ color: C.bordeaux, fontWeight: 700, fontSize: '14px', margin: 0 }}>{t.authorName} <span style={{ color: C.muted, fontWeight: 400, fontSize: '12px' }}>({t.authorRole})</span></p>
                    <p style={{ color: C.or, fontSize: '14px', margin: '3px 0 0' }}>{'★'.repeat(t.rating || 0)}{'☆'.repeat(5 - (t.rating || 0))}</p>
                  </div>
                </div>
                <p style={{ color: '#333', fontSize: '13.5px', lineHeight: 1.6, margin: '0 0 16px' }}>{t.text}</p>
                <button onClick={() => { if (confirm('Remove this review from the homepage? This cannot be undone.')) moderate(t.id, 'delete'); }} disabled={actingOn === t.id}
                  style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                  {actingOn === t.id ? '...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
