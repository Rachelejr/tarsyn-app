'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Gates the dashboard behind the one-time $25 lifetime organizer access
// fee. Only ever blocks accounts that have `orgAccessFeeRequired` set on
// their users/{uid} doc - that field is only written at signup going
// forward (see /register), so every existing admin account has no such
// field and is never blocked, exactly like TrialGuard already does for
// trialEndsAt on older accounts.
export default function AccessFeeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setChecking(false); return; }
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (!userSnap.exists()) { setChecking(false); return; }
        const data = userSnap.data();

        if (data.orgAccessFeeRequired && !data.orgAccessFeePaid && pathname !== '/dashboard/access-fee') {
          router.push('/dashboard/access-fee');
          return;
        }
      } catch (e) {
        console.error('AccessFeeGuard check failed:', e);
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router, pathname]);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD' }}>
        <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #EAD9BE', borderTopColor: '#6B2D4E', animation: 'UNIMUNITY-spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return <>{children}</>;
}
