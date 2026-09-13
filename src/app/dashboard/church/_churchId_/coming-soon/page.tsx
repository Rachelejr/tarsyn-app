'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';

const C = {
  primary: '#1E3A8A',
  gold: '#D4AF37',
  ivory: '#FFFDF7',
  textDark: '#172554',
  textMuted: '#5B6B8C',
  border: '#E2E8F5',
  champagne: '#F8F1D8',
};

function ComingSoonInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const churchId = params?.churchId as string;
  const section = searchParams.get('section') || 'Cette section';

  const [churchName, setChurchName] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const churchSnap = await getDoc(doc(db, 'churches', churchId));
        if (churchSnap.exists()) setChurchName(churchSnap.data().churchName || '');
      } catch (e) {
        console.error(e);
      }
    });
    return () => unsub();
  }, [router, churchId]);

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <ChurchSidebar churchId={churchId} churchName={churchName} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ textAlign: 'center' as const, maxWidth: '420px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: C.textDark, margin: '0 0 8px' }}>{section}</h1>
          <p style={{ fontSize: '13px', color: C.textMuted, margin: '0 0 24px' }}>
            Cette fonctionnalité arrive dans une prochaine phase du module Church. Elle n'est pas encore disponible.
          </p>
          <button onClick={() => router.push(`/dashboard/church/${churchId}`)}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: '10px', padding: '11px 22px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Retour au Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={null}>
      <ComingSoonInner />
    </Suspense>
  );
}
