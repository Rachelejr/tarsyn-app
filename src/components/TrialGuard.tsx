'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, Auth } from 'firebase/auth';
import { doc, getDoc, Firestore } from 'firebase/firestore';

interface TrialGuardProps {
  children: React.ReactNode;
  authInstance?: Auth;
  dbInstance?: Firestore;
}

export default function TrialGuard({ children, authInstance, dbInstance }: TrialGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const activeAuth = authInstance || auth;
  const activeDb = dbInstance || db;

  useEffect(() => {
    const unsub = onAuthStateChanged(activeAuth, async (user) => {
      if (!user) { setChecking(false); return; }
      try {
        const userSnap = await getDoc(doc(activeDb, 'users', user.uid));
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
  }, [router, activeAuth, activeDb]);

  if (checking) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD', gap: '18px' }}>
        <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
        <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '60px', width: 'auto' }} />
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          border: '3px solid #EAD9BE', borderTopColor: '#6B2D4E',
          animation: 'UNIMUNITY-spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return <>{children}</>;
}
