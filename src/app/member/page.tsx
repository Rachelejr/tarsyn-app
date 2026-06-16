'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function MemberDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const memberQ = query(collection(db, 'members'), where('userId', '==', u.uid));
        const memberSnap = await getDocs(memberQ);
        if (!memberSnap.empty) {
          const organizerId = memberSnap.docs[0].data().organizerId;
          const gq = query(collection(db, 'groups'), where('organizerId', '==', organizerId));
          const gsnap = await getDocs(gq);
          if (!gsnap.empty) setGroupName(gsnap.docs[0].data().name);

          const dq = query(collection(db, 'documents'), where('organizerId', '==', organizerId));
          const dsnap = await getDocs(dq);
          setDocs(dsnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('sheet') || type?.includes('excel')) return '📊';
    return '📎';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const categories = ['General', 'Rules', 'Contracts', 'Reports', 'Other'];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FAF0E6' }}>
      <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#6B2D4E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.push('/member')}
            style={{ background: 'transparent', border: 'none', color: '#D4AF7A', cursor: 'pointer', fontSize: '20px' }}>←</button>
          <div style={{ color: '#D4AF7A', fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(212,175,122,0.5)', color: '#D4AF7A', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ color: '#6B2D4E', fontSize: '28px', fontWeight: 800, margin: '0 0 4px' }}>📁 Documents</h1>
        <p style={{ color: '#7A5068', fontSize: '15px', margin: '0 0 32px' }}>{groupName} · Group documents</p>

        {categories.map(cat => {
          const catDocs = docs.filter((d: any) => d.category === cat);
          if (catDocs.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '16px', margin: '0 0 12px' }}>{cat}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {catDocs.map((d: any) => (
                  <div key={d.id} style={{ background: 'white', borderRadius: '14px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '28px' }}>{getFileIcon(d.type)}</span>
                      <div>
                        <p style={{ color: '#2C1A3E', fontWeight: 700, margin: '0 0 2px', fontSize: '14px' }}>{d.name}</p>
                        <p style={{ color: '#7A5068', fontSize: '12px', margin: 0 }}>{formatSize(d.size)} · {d.category}</p>
                      </div>
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      style={{ background: '#6B2D4E', color: '#FAF0E6', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                      ⬇️ Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {docs.length === 0 && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
            <p style={{ color: '#7A5068', fontSize: '15px' }}>No documents available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}