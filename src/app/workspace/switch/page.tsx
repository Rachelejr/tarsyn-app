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
        const [byOrganizer, byAdmin, churchesSnap, churchesByEmail] = await Promise.all([
          getDocs(query(collection(db, 'groups'), where('organizerId', '==', u.uid))),
          getDocs(query(collection(db, 'groups'), where('adminId', '==', u.uid))),
          getDocs(query(collection(db, 'churches'), where('organizerId', '==', u.uid))),
          // Fallback: some churches may have been created under a different
          // uid but with this same admin email - catch those too, the same
          // way Tontine checks both organizerId and adminId.
          u.email
            ? getDocs(query(collection(db, 'churches'), where('adminEmail', '==', u.email)))
            : Promise.resolve({ empty: true, size: 0, docs: [] } as any),
        ]);
        const hasTontine = !byOrganizer.empty || !byAdmin.empty;
        const hasChurch = !churchesSnap.empty || !churchesByEmail.empty;

        // Debug temporaire — à retirer une fois le bug confirmé résolu.
        console.log('[UNIMUNITY debug] uid =', u.uid, 'email =', u.email, '| hasTontine =', hasTontine, '| hasChurch =', hasChurch, '| churches (organizerId) =', churchesSnap.size, '| churches (adminEmail) =', churchesByEmail.size);

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

        // Brand-new admin with nothing set up yet: nothing to choose from,
        // so send them straight to module selection instead of showing an
        // empty screen.
        if (found.length === 0) {
          router.push('/workspace/select-module');
          return;
        }

        // Otherwise, always show the switcher - even with a single active
        // module - so the admin sees where they're going and can add more
        // modules from here.
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

  const subtitle = workspaces.length === 1
    ? 'Continue to your workspace, or activate another module.'
    : 'You have more than one module active. Pick where you want to go.';

  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: '0 0 64px' }}>
      <div style={{
        background: `radial-gradient(circle at 30% -20%, ${C.dore}22, transparent 55%), linear-gradient(160deg, ${C.bordeaux} 0%, ${C.bordeauxDark} 100%)`,
        padding: '32px 32px 44px',
        borderBottom: `3px solid ${C.dore}`,
      }}>
        <img
          src="/unimunity-logo-white.png"
          alt="Unimunity"
          style={{ height: '34px', width: 'auto', display: 'block', marginBottom: '28px' }}
        />
        <h1 style={{ color: 'white', fontSize: '30px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>Choose Your Workspace</h1>
        <p style={{ color: 'rgba(251,238,221,0.85)', fontSize: '14px', margin: 0 }}>{subtitle}</p>
      </div>

      <div style={{ maxWidth: '680px', margin: '36px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {workspaces.map(w => (
          <button
            key={w.key}
            onClick={() => router.push(w.href)}
            className="ws-card"
            style={{
              background: C.blanc,
              border: `1.5px solid ${C.border}`,
              borderRadius: '20px',
              padding: '30px 24px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 2px 10px rgba(107,45,78,0.06)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
            }}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: `linear-gradient(145deg, ${C.dore}33, ${C.dore}11)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}>
              {w.icon}
            </div>
            <div>
              <div style={{ color: C.bordeauxDark, fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{w.title}</div>
              <div style={{ color: C.texteGris, fontSize: '13px', opacity: 0.85, lineHeight: 1.4 }}>{w.subtitle}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '680px', margin: '28px auto 0', padding: '0 24px', textAlign: 'center' }}>
        <button onClick={() => router.push('/workspace/select-module')}
          style={{ background: 'none', border: `1.5px dashed ${C.border}`, borderRadius: '14px', padding: '14px 20px', color: C.bordeaux, fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          + Activate another module
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
          UNIMUNITY™ A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · Version 1.0.0
      </div>

      <style>{`
        .ws-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(107,45,78,0.14);
          border-color: ${C.dore};
        }
      `}</style>
    </div>
  );
}
