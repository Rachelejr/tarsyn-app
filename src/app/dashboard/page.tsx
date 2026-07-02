'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
  contributionAmount: number;
  frequency: string;
  status?: string;
  memberCount?: number;
  numMembers?: number;
  currentCycle?: number;
  totalCycles?: number;
  createdAt?: { seconds: number };
}

const C = {
  bordeaux: '#B24C72',
  bordeauxDark: '#8F3A5A',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#1a1a1a',
  muted: '#6b7280',
};

export default function DashboardPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const q = query(
          collection(db, 'groups'),
          where('organizerId', '==', user.uid),
          
        );
        const snap = await getDocs(q);
        const list: Group[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
        setGroups(list);
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => { setMounted(true); }, []);

  const startEdit = (g: Group) => {
    setEditingGroupId(g.id);
    setEditValue(String(g.numMembers || ''));
  };

  const saveMaxMembers = async (groupId: string) => {
    const value = parseInt(editValue);
    if (!value || value < 2) { alert('Please enter a number of 2 or more.'); return; }
    try {
      await updateDoc(doc(db, 'groups', groupId), { numMembers: value });
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, numMembers: value } : g));
      setEditingGroupId(null);
    } catch (e) {
      console.error(e);
      alert('Could not update. Please try again.');
    }
  };

  if (!mounted || loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.muted, fontFamily: 'Inter, sans-serif' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      <div style={{ background: C.bordeauxDark, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ color: C.orLight, fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 1 }}>TARSYN</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: '2px 0 0' }}>Community Savings Dashboard</p>
        </div>
        <button
          onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'rgba(255,255,255,0.08)', color: C.orLight, border: '1px solid ' + C.or, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '24px 24px 0', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>My Groups</h2>
            <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/create-tontine')}
            style={{ background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(233,199,123,0.3)' }}
          >
            + New Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <div style={{ background: C.blanc, border: '1px solid #e5e7eb', borderRadius: 18, padding: '48px 40px', textAlign: 'center', width: '100%', maxWidth: 580, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ width: 60, height: 60, borderRadius: 14, background: C.creme, border: '2px solid ' + C.orLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <span style={{ color: C.or, fontWeight: 700, fontSize: 26 }}>G</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 10px' }}>No groups available</h3>
              <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px', lineHeight: 1.6 }}>
                Create your first group to get started.
              </p>
              <button
                onClick={() => router.push('/dashboard/create-tontine')}
                style={{ background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 10, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(233,199,123,0.3)' }}
              >
                + New Group
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {groups.map((g) => (
              <div
                key={g.id}
                style={{ background: C.blanc, border: '1px solid #e5e7eb', borderRadius: 16, padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: C.creme, border: '1.5px solid ' + C.orLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: C.bordeaux, flexShrink: 0 }}>
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>{g.name}</h3>
                      <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', textTransform: 'capitalize' }}>{g.frequency || 'Monthly'}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: g.status === 'active' ? '#d1fae5' : '#fef3c7', color: g.status === 'active' ? '#065f46' : '#92400e', whiteSpace: 'nowrap' }}>
                    {g.status ? g.status.charAt(0).toUpperCase() + g.status.slice(1) : 'Active'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: C.creme, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Members</p>
                      {editingGroupId !== g.id && (
                        <button onClick={() => startEdit(g)} title="Edit max members"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.bordeaux, fontSize: 11, padding: 0, fontWeight: 700, textDecoration: 'underline' }}>Edit</button>
                      )}
                    </div>
                    {editingGroupId === g.id ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center' }}>
                        <input type="number" min={2} value={editValue} onChange={e => setEditValue(e.target.value)}
                          style={{ width: 50, fontSize: 13, padding: '3px 5px', borderRadius: 6, border: '1px solid ' + C.orLight }} />
                        <button onClick={() => saveMaxMembers(g.id)}
                          style={{ background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingGroupId(null)}
                          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '3px 0 0' }}>{g.memberCount || 0} / {g.numMembers || '?'}</p>
                    )}
                  </div>
                  <div style={{ background: C.creme, borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Cycle</p>
                    <p style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '3px 0 0' }}>{g.currentCycle || 1} / {g.totalCycles || '?'}</p>
                  </div>
                  <div style={{ background: C.creme, borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Amount</p>
                    <p style={{ fontSize: 17, fontWeight: 700, color: C.or, margin: '3px 0 0' }}>${g.contributionAmount || 0}</p>
                  </div>
                  <div style={{ background: C.creme, borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>Created</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '3px 0 0' }}>
                      {g.createdAt ? new Date(g.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => router.push('/dashboard/overview?groupId=' + g.id)}
                    style={{ flex: 1, background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 9, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/contribution-log?groupId=' + g.id)}
                    style={{ background: C.creme, color: C.bordeaux, border: '1px solid ' + C.orLight, borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '32px 0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 2, letterSpacing: 0.3 }}>
            Powered by TARSYN™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
