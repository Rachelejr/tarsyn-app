'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Same turquoise + rose-bebe palette used across the Church module screens,
// kept deliberately consistent with create-church/page.tsx.
const C = {
  primary: '#4FB8AE',
  secondary: '#F7B8C6',
  accent: '#D7F0EC',
  bg: '#FBF6F2',
  cardBg: '#FFFFFF',
  borderSoft: '#F0D9DF',
  borderMed: '#B8E4DE',
  textDark: '#1F4A46',
  textGris: '#7A9490',
  success: '#5A8A6E',
};

interface Church {
  id: string;
  churchName?: string;
  code?: string;
  denomination?: string;
  country?: string;
  city?: string;
  estimatedMembers?: string | number;
  status?: string;
  leadPastor?: string;
}

export default function MyChurchesPage() {
  const router = useRouter();
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubChurches: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return; }
      const q = query(collection(db, 'churches'), where('organizerId', '==', user.uid));
      unsubChurches = onSnapshot(
        q,
        (snap) => {
          setChurches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Church)));
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
        }
      );
    });
    return () => { unsubAuth(); if (unsubChurches) unsubChurches(); };
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '32px 24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' as const, gap: '12px' }}>
          <div>
            <button
              onClick={() => router.push('/workspace/select-module')}
              style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '8px' }}
            >
              &larr; Back to Modules
            </button>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: C.textDark, margin: 0 }}>My Churches</h1>
          </div>
          <button
            onClick={() => router.push('/dashboard/create-church')}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Create New Church
          </button>
        </div>

        {loading ? (
          <p style={{ color: C.textGris, fontSize: '14px' }}>Loading...</p>
        ) : churches.length === 0 ? (
          <div style={{ background: C.cardBg, border: `1px solid ${C.borderSoft}`, borderRadius: '16px', padding: '48px 24px', textAlign: 'center' as const }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: C.textDark, margin: '0 0 8px' }}>No churches yet</p>
            <p style={{ fontSize: '13px', color: C.textGris, margin: '0 0 20px' }}>Create your first church to get started.</p>
            <button
              onClick={() => router.push('/dashboard/create-church')}
              style={{ background: C.primary, color: 'white', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              + Create New Church
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {churches.map((c) => (
              <div key={c.id} onClick={() => router.push(`/dashboard/church/${c.id}`)}
                style={{ background: C.cardBg, border: `1px solid ${C.borderSoft}`, borderRadius: '16px', padding: '20px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: C.textDark, margin: 0 }}>{c.churchName || '(Unnamed church)'}</h2>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                    background: c.status === 'active' ? C.accent : C.borderSoft,
                    color: c.status === 'active' ? C.success : C.textGris,
                  }}>
                    {c.status || 'active'}
                  </span>
                </div>
                {c.code && <p style={{ fontSize: '12px', color: C.textGris, margin: '0 0 6px', fontFamily: 'monospace' }}>{c.code}</p>}
                {c.denomination && <p style={{ fontSize: '13px', color: C.textDark, margin: '0 0 4px' }}>{c.denomination}</p>}
                {(c.city || c.country) && (
                  <p style={{ fontSize: '13px', color: C.textGris, margin: '0 0 4px' }}>{[c.city, c.country].filter(Boolean).join(', ')}</p>
                )}
                {c.leadPastor && <p style={{ fontSize: '13px', color: C.textGris, margin: '0 0 4px' }}>Lead: {c.leadPastor}</p>}
                {c.estimatedMembers && <p style={{ fontSize: '13px', color: C.textGris, margin: 0 }}>~{c.estimatedMembers} members</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
