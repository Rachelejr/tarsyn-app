'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';

const C = {
  primary: '#1E3A8A',
  gold: '#D4AF37',
  ivory: '#FFFDF7',
  lightBlue: '#EFF6FF',
  champagne: '#F8F1D8',
  navy: '#172554',
  textDark: '#172554',
  textMuted: '#5B6B8C',
  border: '#E2E8F5',
};

interface ChurchDoc {
  churchName?: string;
  city?: string;
  country?: string;
}

export default function ChurchDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const churchId = params?.churchId as string;

  const [uid, setUid] = useState('');
  const [church, setChurch] = useState<ChurchDoc | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [newMemberCount, setNewMemberCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const churchSnap = await getDoc(doc(db, 'churches', churchId));
        if (churchSnap.exists()) {
          setChurch(churchSnap.data() as ChurchDoc);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, [router, churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchMembers'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => {
      setMemberCount(snap.size);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let recent = 0;
      snap.docs.forEach(d => {
        const createdAt = d.data().createdAt;
        if (createdAt?.seconds && createdAt.seconds * 1000 > thirtyDaysAgo) recent++;
      });
      setNewMemberCount(recent);
    });
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchGroups'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => setGroupCount(snap.size));
    return () => unsub();
  }, [churchId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.ivory, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: `3px solid ${C.champagne}`, borderTopColor: C.primary, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <ChurchSidebar churchId={churchId} churchName={church?.churchName} />

      <div style={{ flex: 1, padding: '28px 32px', maxWidth: '1200px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: C.textDark, margin: '0 0 4px' }}>
            {church?.churchName || 'Church Dashboard'}
          </h1>
          <p style={{ fontSize: '13px', color: C.textMuted, margin: 0 }}>
            {[church?.city, church?.country].filter(Boolean).join(', ') || 'Vue d\'ensemble de votre église'}
          </p>
        </div>

        {/* Summary cards - only real, wired-up numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Membres totaux" value={memberCount} color={C.primary} icon="👥" />
          <StatCard label="Nouveaux membres (30j)" value={newMemberCount} color="#3C7A4E" icon="✨" />
          <StatCard label="Groupes actifs" value={groupCount} color="#7C3AED" icon="👫" />
        </div>

        {/* Phase 1 note instead of fake data for not-yet-built sections */}
        <div style={{ background: C.lightBlue, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '18px 20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: C.textDark, margin: 0, fontWeight: 600 }}>
            🚧 Événements, présences, prières, contributions et rapports arrivent dans les prochaines phases du module Church.
          </p>
        </div>

        {/* Quick actions - only for what's actually built */}
        <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: C.textDark, margin: '0 0 14px' }}>Actions rapides</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
            <QuickAction label="Ajouter un membre" icon="➕" onClick={() => router.push(`/dashboard/church/add-member?churchId=${churchId}`)} />
            <QuickAction label="Voir les membres" icon="👥" onClick={() => router.push(`/dashboard/church/${churchId}/members`)} />
            <QuickAction label="Créer un groupe" icon="👫" onClick={() => router.push(`/dashboard/church/${churchId}/groups`)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '18px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '10px' }}>
        {icon}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: C.textDark }}>{value}</div>
      <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function QuickAction({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ background: C.lightBlue, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '110px' }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color: C.textDark, textAlign: 'center' as const }}>{label}</span>
    </button>
  );
}
