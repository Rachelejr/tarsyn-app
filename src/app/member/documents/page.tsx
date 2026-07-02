'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [category, setCategory] = useState('General');

  const categories = ['General', 'Rules', 'Contracts', 'Reports', 'Other'];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUserId(u.uid);
      await loadDocs(u.uid);

      const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
      const gsnap = await getDocs(gq);
      if (!gsnap.empty) setGroupName(gsnap.docs[0].data().name);

      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const loadDocs = async (uid: string) => {
    const q = query(collection(db, 'documents'), where('organizerId', '==', uid));
    const snap = await getDocs(q);
    setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    setProgress(0);

    const storageRef = ref(storage, `documents/${userId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)),
      (err) => { console.error(err); setUploading(false); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'documents'), {
          name: file.name,
          url,
          category,
          size: file.size,
          type: file.type,
          organizerId: userId,
          storagePath: `documents/${userId}/${Date.now()}_${file.name}`,
          createdAt: serverTimestamp(),
        });
        await loadDocs(userId);
        setUploading(false);
        setProgress(0);
        e.target.value = '';
      }
    );
  };

  const handleDelete = async (document: any) => {
    if (!confirm(`Delete "${document.name}"?`)) return;
    try {
      const storageRef = ref(storage, document.storagePath);
      await deleteObject(storageRef).catch(() => {});
      await deleteDoc(doc(db, 'documents', document.id));
      setDocs(prev => prev.filter(d => d.id !== document.id));
    } catch (e) { console.error(e); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('image')) return '🖼️';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('sheet') || type?.includes('excel')) return '📊';
    return '📎';
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#FBEEDD' }}>
      <p style={{ color: '#6B2D4E', fontSize: '18px', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#6B2D4E', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'transparent', border: 'none', color: '#E9C77B', cursor: 'pointer', fontSize: '20px' }}>←</button>
          <div style={{ color: '#E9C77B', fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: '#E9C77B', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ color: '#6B2D4E', fontSize: '28px', fontWeight: 800, margin: '0 0 4px' }}>📁 Document Center</h1>
        <p style={{ color: '#6B2D4E', fontSize: '15px', margin: '0 0 32px' }}>{groupName} · Upload and manage group documents</p>

        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#6B2D4E', fontWeight: 700, margin: '0 0 16px' }}>Upload Document</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ color: '#6B2D4E', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E8D5C4', fontSize: '14px', background: 'white' }}>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#6B2D4E', fontSize: '13px', display: 'block', marginBottom: '6px' }}>File</label>
              <input type="file" onChange={handleUpload} disabled={uploading}
                style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #E8D5C4', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
          </div>
          {uploading && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#6B2D4E', fontSize: '13px' }}>Uploading...</span>
                <span style={{ color: '#6B2D4E', fontSize: '13px', fontWeight: 700 }}>{progress}%</span>
              </div>
              <div style={{ background: '#FBEEDD', borderRadius: '999px', height: '8px' }}>
                <div style={{ background: '#6B2D4E', width: `${progress}%`, height: '8px', borderRadius: '999px', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </div>

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
                        <p style={{ color: '#4A1F38', fontWeight: 700, margin: '0 0 2px', fontSize: '14px' }}>{d.name}</p>
                        <p style={{ color: '#6B2D4E', fontSize: '12px', margin: 0 }}>{formatSize(d.size)} · {d.category}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={d.url} target="_blank" rel="noreferrer"
                        style={{ background: '#6B2D4E', color: '#FBEEDD', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                        ⬇️ Download
                      </a>
                      <button onClick={() => handleDelete(d)}
                        style={{ background: '#FFF0F0', color: '#C62828', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {docs.length === 0 && !uploading && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
            <p style={{ color: '#6B2D4E', fontSize: '15px' }}>No documents yet. Upload your first file!</p>
          </div>
        )}
      </div>
    </div>
  );
}