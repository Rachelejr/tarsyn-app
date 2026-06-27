'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setChecking(false); return; }
      try {
        const q = query(collection(db, 'workspaces'), where('members', 'array-contains', user.uid));
        const snap = await getDocs(q);
        if (snap.empty) { setChecking(false); return; }

        let trialExpired = false;
        snap.docs.forEach(d => {
          const data = d.data();
          const status = data.subscriptionStatus;
          const trialEndsAt = data.trialEndsAt;
          if (status !== 'active' && trialEndsAt?.seconds) {
            const now = Date.now() / 1000;
            if (now > trialEndsAt.seconds) {
              trialExpired = true;
            }
          }
        });

        if (trialExpired) {
          router.push('/subscribe');
          return;
        }
      } catch (e) {
        console.error('TrialGuard check failed:', e);
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6' }}>
        <p style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
