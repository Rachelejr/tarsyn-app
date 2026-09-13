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
  textDark: '#172554',
  textMuted: '#5B6B8C',
  border: '#E2E8F5',
  successBg: '#E7F4EA',
  success: '#3C7A4E',
  pendingBg: '#FFF3D6',
  pending: '#9A6A00',
};

interface ChurchMember {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
}

export default function ChurchMembersPage() {
  const router = useRouter();
  const params = useParams();
  const churchId = params?.churchId as string;

  const [churchName, setChurchName] = useState('');
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const churchSnap = await getDoc(doc(db, 'churches', churchId));
        if (churchSnap.exists()) setChurchName(churchSnap.data().churchName || '');
      } catch (e) {
        console.error(e);
      }
    });
    return () => unsubAuth();
  }, [router, churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchMembers'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchMember)));
      setLoading(false);
    });
    return () => unsub();
  }, [churchId]);

  const filtered = members.filter(m =>
    (m.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <ChurchSidebar churchId={churchId} churchName={churchName} />

      <div style={{ flex: 1, padding: '28px 32px', maxWidth: '1100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.textDark, margin: '0 0 4px' }}>Membres</h1>
            <p style={{ fontSize: '13px', color: C.textMuted, margin: 0 }}>{members.length} membre{members.length !== 1 ? 's' : ''} enregistré{members.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/church/add-member?churchId=${churchId}`)}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            + Ajouter un membre
          </button>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un membre par nom ou email..."
          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '18px' }}
        />

        {loading ? (
          <p style={{ color: C.textMuted, fontSize: '13px' }}>Chargement...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' as const }}>
            <p style={{ fontSize: '14px', color: C.textMuted, margin: 0 }}>
              {members.length === 0 ? 'Aucun membre pour le moment.' : 'Aucun membre ne correspond à votre recherche.'}
            </p>
          </div>
        ) : (
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' }}>
              <thead>
                <tr style={{ background: C.lightBlue }}>
                  <th style={thStyle}>Nom</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Téléphone</th>
                  <th style={thStyle}>Rôle</th>
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, idx) => (
                  <tr key={m.id} style={{ borderTop: `1px solid ${C.border}`, background: idx % 2 === 0 ? 'white' : C.ivory }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: C.textDark }}>{m.fullName || '(sans nom)'}</span>
                    </td>
                    <td style={tdStyle}>{m.email || '—'}</td>
                    <td style={tdStyle}>{m.phone || '—'}</td>
                    <td style={tdStyle}>{m.role || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                        background: m.status === 'active' ? C.successBg : C.pendingBg,
                        color: m.status === 'active' ? C.success : C.pending,
                      }}>
                        {m.status === 'active' ? 'Actif' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.4px' };
const tdStyle: React.CSSProperties = { padding: '11px 14px', color: '#172554' };
