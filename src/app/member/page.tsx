'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const C = {
  bordeaux: '#6B2D4E',
  dore: '#D4AF7A',
  creme: '#FAF0E6',
  texteGris: '#7A5068',
  texteFonce: '#2C1A3E',
  border: '#E8D5E0',
};

const CATEGORIES = ['General', 'Rules', 'Contracts', 'Reports', 'Other'];

export default function MemberPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState('');
  const [organizerId, setOrganizerId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('General');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = async (organizerIdArg: string) => {
    const dq = query(collection(db, 'documents'), where('organizerId', '==', organizerIdArg));
    const dsnap = await getDocs(dq);
    setDocs(dsnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const memberQ = query(collection(db, 'members'), where('userId', '==', u.uid));
        const memberSnap = await getDocs(memberQ);
        if (!memberSnap.empty) {
          const mData = memberSnap.docs[0].data();
          setMemberInfo(mData);
          const oid = mData.organizerId;
          setOrganizerId(oid);

          const gq = query(collection(db, 'groups'), where('organizerId', '==', oid));
          const gsnap = await getDocs(gq);
          if (!gsnap.empty) setGroupName(gsnap.docs[0].data().name);

          await fetchAll(oid);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return 'PDF';
    if (type?.includes('image')) return 'IMG';
    if (type?.includes('word') || type?.includes('document')) return 'DOC';
    if (type?.includes('sheet') || type?.includes('excel')) return 'XLS';
    return 'FILE';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isNew = (createdAt: any) => {
    if (!createdAt?.seconds) return false;
    const ageHours = (Date.now() / 1000 - createdAt.seconds) / 3600;
    return ageHours < 48;
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setShowUploadModal(true);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile || !organizerId || !uid) return;
    setUploading(true);
    setError('');
    try {
      const path = `documents/${organizerId}/${uid}_${Date.now()}_${pendingFile.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, pendingFile);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'documents'), {
        name: pendingFile.name,
        type: pendingFile.type,
        size: pendingFile.size,
        url,
        storagePath: path,
        category: uploadCategory,
        organizerId,
        uploadedBy: uid,
        source: 'member',
        createdAt: serverTimestamp(),
      });

      await fetchAll(organizerId);
      setShowUploadModal(false);
      setPendingFile(null);
      setUploadCategory('General');
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (d: any) => {
    if (d.uploadedBy !== uid) return;
    if (!confirm(`Delete "${d.name}"?`)) return;
    setDeletingId(d.id);
    try {
      if (d.storagePath) {
        try { await deleteObject(ref(storage, d.storagePath)); } catch {}
      }
      await deleteDoc(doc(db, 'documents', d.id));
      setDocs(docs.filter(x => x.id !== d.id));
    } catch (e) {
      setError('Could not delete this file.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = (url: string) => {
    const w = window.open(url, '_blank');
    w?.addEventListener('load', () => w.print());
  };

  const filteredDocs = docs.filter(d => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || d.category === filterCat;
    return matchSearch && matchCat;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme }}>
      <p style={{ color: C.bordeaux, fontSize: '18px', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: C.bordeaux, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: C.dore, fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: `1px solid rgba(212,175,122,0.5)`, color: C.dore, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Resume membre */}
        <div style={{ background: 'white', borderRadius: '18px', padding: '24px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h1 style={{ color: C.bordeaux, fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>{groupName || 'Your Group'}</h1>
          {memberInfo && (
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '14px' }}>
              <div>
                <p style={{ color: C.texteGris, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 2px' }}>Position</p>
                <p style={{ color: C.texteFonce, fontWeight: 700, margin: 0 }}>#{memberInfo.position || '—'}</p>
              </div>
              <div>
                <p style={{ color: C.texteGris, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 2px' }}>Status</p>
                <span style={{
                  background: memberInfo.status === 'active' ? '#E8F5E9' : '#FFF3E0',
                  color: memberInfo.status === 'active' ? '#2E7D32' : '#E65100',
                  padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600
                }}>
                  {memberInfo.status || 'pending'}
                </span>
              </div>
              <div>
                <p style={{ color: C.texteGris, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 2px' }}>Payout Date</p>
                <p style={{ color: C.texteFonce, fontWeight: 700, margin: 0 }}>{memberInfo.payoutDate || '—'}</p>
              </div>
              <div>
                <p style={{ color: C.texteGris, fontSize: '11px', textTransform: 'uppercase', margin: '0 0 2px' }}>TYN-ID</p>
                <p style={{ color: C.texteFonce, fontWeight: 700, margin: 0, fontFamily: 'monospace', fontSize: '13px' }}>{memberInfo.tynId || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Documents */}
        <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ color: C.bordeaux, fontSize: '18px', fontWeight: 700, margin: 0 }}>Documents</h2>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              + Upload
            </button>
            <input ref={fileInputRef} type="file" onChange={handleFileSelected} style={{ display: 'none' }} />
          </div>

          {error && (
            <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              style={{ flex: 1, minWidth: '180px', padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              style={{ padding: '9px 12px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', background: 'white', cursor: 'pointer' }}>
              <option value="All">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: C.texteGris, fontSize: '14px' }}>No documents available yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredDocs.map((d: any) => (
                <div key={d.id} style={{ background: C.creme, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: C.bordeaux, background: 'white', padding: '4px 8px', borderRadius: '6px' }}>{getFileIcon(d.type)}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ color: C.texteFonce, fontWeight: 700, margin: 0, fontSize: '14px' }}>{d.name}</p>
                        {isNew(d.createdAt) && (
                          <span style={{ fontSize: '9px', background: C.dore, color: 'white', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>NEW</span>
                        )}
                        <span style={{ fontSize: '9px', background: d.source === 'admin' ? '#E3F2FD' : '#F3E4DC', color: d.source === 'admin' ? '#1565C0' : C.bordeaux, padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
                          {d.source === 'admin' ? 'ADMIN' : 'YOU'}
                        </span>
                      </div>
                      <p style={{ color: C.texteGris, fontSize: '12px', margin: '2px 0 0' }}>{formatSize(d.size)} · {d.category}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      style={{ background: C.bordeaux, color: 'white', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                      Download
                    </a>
                    <button onClick={() => handlePrint(d.url)}
                      style={{ background: 'white', color: C.bordeaux, border: `1.5px solid ${C.bordeaux}`, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      Print
                    </button>
                    {d.uploadedBy === uid && (
                      <button onClick={() => handleDelete(d)} disabled={deletingId === d.id}
                        style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        {deletingId === d.id ? '...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload modal */}
      {showUploadModal && pendingFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '380px', width: '100%' }}>
            <h3 style={{ color: C.bordeaux, fontSize: '17px', fontWeight: 700, margin: '0 0 6px' }}>Upload Document</h3>
            <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 18px', wordBreak: 'break-all' }}>{pendingFile.name}</p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.texteFonce, marginBottom: '6px' }}>Category</label>
            <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
              style={{ width: '100%', padding: '10px', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowUploadModal(false); setPendingFile(null); }} disabled={uploading}
                style={{ flex: 1, padding: '11px', background: 'transparent', color: C.bordeaux, border: `2px solid ${C.bordeaux}`, borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleConfirmUpload} disabled={uploading}
                style={{ flex: 1, padding: '11px', background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
