'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setChecking(false); return; }
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) { setChecking(false); return; }

        const data = userSnap.data();

        // Paid and active on Stripe -> never block, regardless of trialEndsAt.
        const subStatus = data.subscription?.status;
        if (subStatus === 'active' || subStatus === 'trialing') {
          setChecking(false);
          return;
        }

        // No trialEndsAt recorded yet (older accounts) -> do not block.
        // trialEndsAt is only set for accounts created after this feature
        // was added, or manually assigned in Firestore for existing admins.
        const trialEndsAt = data.trialEndsAt;
        if (!trialEndsAt) { setChecking(false); return; }

        const trialEndMs = trialEndsAt.seconds
          ? trialEndsAt.seconds * 1000
          : new Date(trialEndsAt).getTime();

        if (Date.now() > trialEndMs) {
          router.push('/dashboard/subscription');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD' }}>
        <p style={{ color: '#6B2D4E', fontSize: '16px', fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}