'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';

const C = {
  primary: '#1E3A8A',
  gold: '#D4AF37',
  ivory: '#FFFDF7',
  lightBlue: '#EFF6FF',
  textDark: '#172554',
  textMuted: '#5B6B8C',
  border: '#E2E8F5',
};

interface ChurchGroup {
  id: string;
  name?: string;
  description?: string;
  leaderName?: string;
  memberCount?: number;
}

export default function ChurchGroupsPage() {
  const router = useRouter();
  const params = useParams();
  const churchId = params?.churchId as string;

  const [uid, setUid] = useState('');
  const [churchName, setChurchName] = useState('');
  const [groups, setGroups] = useState<ChurchGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const churchSnap = await getDoc(doc(db, 'churches', churchId));
        if (churchSnap.exists()) setChurchName(churchSnap.data().churchName || '');
      } catch (e) {
        console.error(e);
      }
    });
    return () => unsub();
  }, [router, churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchGroups'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChurchGroup)));
      setLoading(false);
    });
    return () => unsub();
  }, [churchId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Le nom du groupe est requis.'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'churchGroups'), {
        churchId,
        organizerId: uid,
        name: name.trim(),
        description: description.trim(),
        leaderName: leaderName.trim(),
        memberCount: 0,
        createdAt: serverTimestamp(),
      });
      setName('');
      setDescription('');
      setLeaderName('');
      setShowForm(false);
    } catch (e) {
      setError('La création du groupe a échoué. Veuillez réessayer.');
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.ivory, display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <ChurchSidebar churchId={churchId} churchName={churchName} />

      <div style={{ flex: 1, padding: '28px 32px', maxWidth: '1000px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.textDark, margin: '0 0 4px' }}>Groupes</h1>
            <p style={{ fontSize: '13px', color: C.textMuted, margin: 0 }}>{groups.length} groupe{groups.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: '10px', padding: '11px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            {showForm ? 'Annuler' : '+ Créer un groupe'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            {error && <div style={{ background: '#FDECEA', color: '#C0392B', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '14px' }}>{error}</div>}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Nom du groupe *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Jeunesse, Chorale, Groupe de prière..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Responsable</label>
              <input value={leaderName} onChange={e => setLeaderName(e.target.value)} placeholder="Nom du responsable" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
            </div>
            <button type="submit" disabled={saving}
              style={{ background: C.primary, color: 'white', border: 'none', borderRadius: '10px', padding: '11px 22px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Création...' : 'Créer le groupe'}
            </button>
          </form>
        )}

        {loading ? (
          <p style={{ color: C.textMuted, fontSize: '13px' }}>Chargement...</p>
        ) : groups.length === 0 ? (
          <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '40px 20px', textAlign: 'center' as const }}>
            <p style={{ fontSize: '14px', color: C.textMuted, margin: 0 }}>Aucun groupe pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
            {groups.map(g => (
              <div key={g.id} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '18px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.textDark, margin: '0 0 6px' }}>{g.name}</h3>
                {g.leaderName && <p style={{ fontSize: '12.5px', color: C.textMuted, margin: '0 0 4px' }}>Responsable: {g.leaderName}</p>}
                {g.description && <p style={{ fontSize: '12.5px', color: C.textMuted, margin: 0 }}>{g.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#172554', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F5', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
