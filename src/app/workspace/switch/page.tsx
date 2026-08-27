'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  dore: '#E9C77B',
  border: '#D9C0CC',
  texteGris: '#6B2D4E',
};

type ActiveWorkspace = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
};

export default function SwitchWorkspacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<ActiveWorkspace[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const [byOrganizer, byAdmin, churchesSnap] = await Promise.all([
          getDocs(query(collection(db, 'groups'), where('organizerId', '==', u.uid))),
          getDocs(query(collection(db, 'groups'), where('adminId', '==', u.uid))),
          getDocs(query(collection(db, 'churches'), where('organizerId', '==', u.uid))),
        ]);
        const hasTontine = !byOrganizer.empty || !byAdmin.empty;
        const hasChurch = !churchesSnap.empty;

        const found: ActiveWorkspace[] = [];
        if (hasTontine) {
          found.push({
            key: 'tontine',
            icon: '🤝',
            title: 'Tontine / Sol',
            subtitle: 'Manage your rotating savings groups',
            href: '/dashboard',
          });
        }
        if (hasChurch) {
          found.push({
            key: 'church',
            icon: '⛪',
            title: 'Church',
            subtitle: 'Manage tithes, offerings and members',
            href: '/dashboard/church',
          });
        }

        // Safety net: if this page is somehow reached with 0 or 1 active
        // module, don't leave the admin stuck here.
        if (found.length === 0) {
          router.push('/workspace/select-module');
          return;
        }
        if (found.length === 1) {
          router.push(found[0].href);
          return;
        }

        setWorkspaces(found);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #EAD9BE', borderTopColor: C.bordeaux, animation: 'UNIMUNITY-spin 0.8s linear infinite' }} />
        <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: '0 0 64px' }}>
      <div style={{ background: `linear-gradient(160deg, ${C.bordeaux} 0%, ${C.bordeauxDark} 100%)`, padding: '56px 32px 40px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '30px', fontWeight: 800, margin: '0 0 8px' }}>Choose Your Workspace</h1>
        <p style={{ color: 'rgba(251,238,221,0.8)', fontSize: '14px', margin: 0 }}>You have more than one module active. Pick where you want to go.</p>
      </div>

      <div style={{ maxWidth: '640px', margin: '32px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        {workspaces.map(w => (
          <button key={w.key} onClick={() => router.push(w.href)}
            style={{ background: C.blanc, border: `1.5px solid ${C.border}`, borderRadius: '18px', padding: '28px 22px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '32px' }}>{w.icon}</div>
            <div style={{ color: C.bordeauxDark, fontSize: '17px', fontWeight: 700 }}>{w.title}</div>
            <div style={{ color: C.texteGris, fontSize: '13px' }}>{w.subtitle}</div>
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '640px', margin: '28px auto 0', padding: '0 24px', textAlign: 'center' }}>
        <button onClick={() => router.push('/workspace/select-module')}
          style={{ background: 'none', border: `1.5px dashed ${C.border}`, borderRadius: '14px', padding: '14px 20px', color: C.bordeaux, fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          + Activate another module
        </button>
      </div>
    </div>
  );
}
