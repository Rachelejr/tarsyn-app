'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';

const C = {
  gold:      '#C9941F',
  goldDark:  '#9C7314',
  bg:        '#FAF3E6',
  surface:   '#FFFFFF',
  border:    '#E8D9BC',
  textDark:  '#3A2E1A',
  textGris:  '#7A6E58',
};

type Workspace = {
  id: string;
  name: string;
  orgType: string;
  country: string;
};

function ConnectWorkspaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleSlug = searchParams.get('module') || '';

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError('You must be signed in to view your workspaces.');
        setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'workspaces'), where('members', 'array-contains', user.uid));
        const snap = await getDocs(q);
        const list: Workspace[] = snap.docs.map(d => ({
          id: d.id,
          name: d.data().name,
          orgType: d.data().orgType,
          country: d.data().country,
        }));
        setWorkspaces(list);
      } catch (err: any) {
        console.error('WORKSPACE LOAD ERROR:', err);
        setError(`Could not load your workspaces: ${err.code || err.message || 'unknown error'}`);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    if (!selectedId) return;
    setConnecting(true);
    setError('');
    try {
      await updateDoc(doc(db, 'workspaces', selectedId), {
        activeModules: arrayUnion(moduleSlug),
      });
      router.push(`/dashboard/create-tontine?workspaceId=${selectedId}`);
    } catch (err: any) {
      console.error('CONNECT MODULE ERROR:', err);
      setError(`Could not connect this module: ${err.code || err.message || 'unknown error'}`);
      setConnecting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: C.goldDark, fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Connect to Existing Workspace</h1>
          <p style={{ color: C.textGris, fontSize: '14px', margin: 0 }}>
            Choose a workspace to attach the {moduleSlug.replace(/-/g, ' ')} module to.
          </p>
        </div>

        <div style={{ background: C.surface, borderRadius: '20px', padding: '28px', boxShadow: '0 12px 40px rgba(156,115,20,0.10)', border: `1px solid ${C.border}` }}>

          {error && (
            <div style={{ background: '#FBEDED', border: '1px solid #E8C5C5', borderRadius: '10px', padding: '10px 14px', color: '#A14444', fontSize: '13px', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          {loading && (
            <p style={{ textAlign: 'center', color: C.textGris, fontSize: '14px', padding: '20px 0' }}>Loading your workspaces...</p>
          )}

          {!loading && !error && workspaces.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: C.textGris, fontSize: '14px', marginBottom: '16px' }}>
                You don't have any workspace yet.
              </p>
              <button onClick={() => router.push('/dashboard/create-workspace')}
                style={{ padding: '12px 20px', background: C.gold, color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                Create a New Workspace
              </button>
            </div>
          )}

          {!loading && workspaces.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {workspaces.map(ws => (
                  <label key={ws.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                      border: `1.5px solid ${selectedId === ws.id ? C.gold : C.border}`,
                      background: selectedId === ws.id ? '#FFF8EA' : 'white',
                      borderRadius: '12px', cursor: 'pointer',
                    }}>
                    <input type="radio" name="workspace" checked={selectedId === ws.id}
                      onChange={() => setSelectedId(ws.id)}
                      style={{ width: '16px', height: '16px', accentColor: C.gold }} />
                    <div>
                      <div style={{ fontWeight: 700, color: C.textDark, fontSize: '14px' }}>{ws.name}</div>
                      <div style={{ fontSize: '12px', color: C.textGris }}>{ws.orgType} · {ws.country}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button onClick={handleConnect} disabled={!selectedId || connecting}
                style={{
                  width: '100%', padding: '14px', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                  background: selectedId ? C.gold : C.border, color: selectedId ? 'white' : C.textGris,
                  cursor: selectedId ? 'pointer' : 'not-allowed',
                }}>
                {connecting ? 'Connecting...' : 'Connect Module'}
              </button>
            </>
          )}

          <button onClick={() => router.back()}
            style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '16px', background: 'none', border: 'none', color: C.textGris, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConnectWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <ConnectWorkspaceInner />
    </Suspense>
  );
}
