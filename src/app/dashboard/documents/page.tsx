'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, where,
  serverTimestamp, orderBy, updateDoc, increment,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import DocumentComments from '@/components/DocumentComments';

const C = {
  bleu: '#6B2D4E',
  bleuFonce: '#4A1F38',
  or: '#E9C77B',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  blanc: '#FFFFFF',
  border: '#EAD9BE',
  texteGris: '#7A9490',
  texteFonce: '#3A2F1F',
};

const CATEGORIES = ['General', 'Rules', 'Contracts', 'Reports', 'Other'];
const TABS = [
  { key: 'details', label: 'Details', icon: 'D' },
  { key: 'reviews', label: 'Reviews', icon: 'R' },
  { key: 'comments', label: 'Comments', icon: 'C' },
  { key: 'history', label: 'History', icon: 'H' },
];

export default function DocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [category, setCategory] = useState('General');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  const [reviews, setReviews] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [editingReview, setEditingReview] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUserId(u.uid);
      setUserEmail(u.email || '');
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
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setDocs(list);
    if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
  };

  const selectedDoc = docs.find(d => d.id === selectedId) || null;

  // ---- Reviews (collection: reviews) ----
  useEffect(() => {
    if (!selectedId) { setReviews([]); return; }
    const fetchReviews = async () => {
      try {
        const q = query(collection(db, 'reviews'), where('documentId', '==', selectedId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReviews(list);
        const mine = list.find((r: any) => r.authorId === userId);
        setMyRating(mine ? mine.rating : 0);
      } catch (e) { console.error(e); setReviews([]); }
    };
    fetchReviews();
  }, [selectedId, userId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length)
    : 0;

  const submitReview = async (rating: number) => {
    if (!selectedId || !userId) return;
    try {
      const existing = reviews.find((r: any) => r.authorId === userId);
      if (existing) {
        await updateDoc(doc(db, 'reviews', existing.id), { rating, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'reviews'), {
          documentId: selectedId, organizerId: userId, authorId: userId,
          rating, createdAt: serverTimestamp(),
        });
      }
      setMyRating(rating);
      setEditingReview(false);
      const q = query(collection(db, 'reviews'), where('documentId', '==', selectedId));
      const snap = await getDocs(q);
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  // ---- History (collection: audit_logs, category Document, filtered by documentId) ----
  useEffect(() => {
    if (!selectedId) { setHistory([]); return; }
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'audit_logs'),
          where('documentId', '==', selectedId),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { setHistory([]); }
    };
    fetchHistory();
  }, [selectedId]);

  const logAction = async (action: string) => {
    if (!selectedDoc || !userId) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        organizerId: userId, documentId: selectedDoc.id, category: 'Document',
        action, documentName: selectedDoc.name, createdAt: serverTimestamp(),
        user: userEmail, details: action + ' - ' + selectedDoc.name,
      });
    } catch (e) { /* silent - history is best-effort */ }
  };

  // ---- Upload ----
  const doUpload = async (file: File) => {
    if (!file || !userId) return;
    setUploading(true);
    setProgress(0);
    const path = `documents/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed',
      (snapshot) => setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)),
      (err) => { console.error(err); setUploading(false); },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        const docRef = await addDoc(collection(db, 'documents'), {
          name: file.name, url, category, size: file.size, type: file.type,
          organizerId: userId, storagePath: path, downloadCount: 0, version: 1,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        await loadDocs(userId);
        setSelectedId(docRef.id);
        setUploading(false);
        setProgress(0);
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: userId, documentId: docRef.id, category: 'Document',
          action: 'Uploaded', documentName: file.name, createdAt: serverTimestamp(),
          user: userEmail, details: 'Uploaded - ' + file.name,
        });
      }
    );
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const handleDelete = async (document: any) => {
    if (!confirm(`Delete "${document.name}"?`)) return;
    try {
      const storageRef = ref(storage, document.storagePath);
      await deleteObject(storageRef).catch(() => {});
      await deleteDoc(doc(db, 'documents', document.id));
      setDocs(prev => prev.filter(d => d.id !== document.id));
      if (selectedId === document.id) setSelectedId(null);
      await logAction('Deleted');
    } catch (e) { console.error(e); }
  };

  const handleDownload = async () => {
    if (!selectedDoc) return;
    window.open(selectedDoc.url, '_blank');
    try {
      await updateDoc(doc(db, 'documents', selectedDoc.id), { downloadCount: increment(1) });
      setDocs(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d));
    } catch (e) { /* silent */ }
    logAction('Downloaded');
  };

  const handlePrint = () => {
    if (!selectedDoc) return;
    const w = window.open(selectedDoc.url, '_blank');
    w?.addEventListener('load', () => w.print());
    logAction('Printed');
  };

  const handleShare = async () => {
    if (!selectedDoc) return;
    try {
      await navigator.clipboard.writeText(selectedDoc.url);
      alert('Link copied to clipboard.');
    } catch (e) { /* silent */ }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (ts: any) => {
    if (!ts?.seconds) return '-';
    return new Date(ts.seconds * 1000).toLocaleDateString() + ' ' + new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return { label: 'PDF', color: '#C62828' };
    if (type?.includes('image')) return { label: 'IMG', color: '#2E7D32' };
    if (type?.includes('word') || type?.includes('document')) return { label: 'DOC', color: '#1565C0' };
    if (type?.includes('sheet') || type?.includes('excel')) return { label: 'XLS', color: '#2E7D32' };
    return { label: 'FILE', color: C.texteGris };
  };

  const filteredDocs = docs.filter(d => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || d.category === filterCat;
    return matchSearch && matchCat;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme }}>
      <p style={{ color: C.bleu, fontSize: '18px', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  return (
    <div className="tarsyn-docs-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.ivoire, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .doc-row{transition:all .15s ease;cursor:pointer;}
        .doc-row:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(74,31,56,0.10);}
        .doc-row.active{border-color:${C.bleu} !important;background:${C.creme} !important;}
        .tab-btn{transition:all .15s ease;cursor:pointer;}
        .cat-pill{transition:all .15s ease;cursor:pointer;}
        .star{cursor:pointer;transition:transform .1s ease;}
        .star:hover{transform:scale(1.2);}
        .scroll-thin::-webkit-scrollbar{width:6px;}
        .scroll-thin::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
        @media (max-width: 900px) {
          .tarsyn-docs-root { height: auto !important; min-height: 100vh; overflow: visible !important; }
          .tarsyn-docs-main { flex-direction: column !important; height: auto !important; overflow: visible !important; }
          .tarsyn-docs-list { width: 100% !important; max-height: 320px; }
          .tarsyn-docs-detail { min-height: 400px; }
        }
        @media (max-width: 600px) {
          .tarsyn-docs-topbar { padding: 12px 16px !important; }
          .tarsyn-docs-topbar h1 { font-size: 15px !important; }
          .tarsyn-docs-actions { flex-wrap: wrap !important; }
        }
      `}} />

      {/* TOP BAR - group info */}
      <div className="tarsyn-docs-topbar" style={{ flexShrink: 0, background: C.bleu, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', color: C.or, cursor: 'pointer', fontSize: '20px' }}>{'<'}</button>
          <div>
            <h1 style={{ color: 'white', fontSize: '17px', fontWeight: 800, margin: 0 }}>Document Center</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', margin: 0 }}>{groupName || 'Your Group'} - {docs.length} document{docs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: C.or, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
          Sign Out
        </button>
      </div>

      {/* MAIN ROW - list (left) + selected doc (right) */}
      <div className="tarsyn-docs-main" style={{ flex: 1, display: 'flex', minHeight: 0, padding: '16px', gap: '16px' }}>

        {/* LEFT - Documents list */}
        <div className="tarsyn-docs-list" style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: C.blanc, borderRadius: '16px', boxShadow: '0 2px 12px rgba(74,31,56,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{ border: `2px dashed ${isDragging ? C.bleu : C.border}`, background: isDragging ? C.creme : C.ivoire, borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', marginBottom: '10px' }}>
              <div style={{ fontSize: '20px' }}>+</div>
              <p style={{ color: C.bleuFonce, fontWeight: 700, fontSize: '12px', margin: '2px 0 0' }}>Drop file or click to upload</p>
              <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            </div>
            {uploading && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ background: C.creme, borderRadius: '999px', height: '6px' }}>
                  <div style={{ background: C.bleu, width: `${progress}%`, height: '6px', borderRadius: '999px', transition: 'width .3s' }} />
                </div>
              </div>
            )}
            <select value={category} onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '12px', background: 'white', marginBottom: '8px' }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {['All', ...CATEGORIES].map(c => (
                <span key={c} className="cat-pill" onClick={() => setFilterCat(c)}
                  style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 700,
                    background: filterCat === c ? C.bleu : C.ivoire, color: filterCat === c ? 'white' : C.texteGris,
                    border: `1px solid ${filterCat === c ? C.bleu : C.border}` }}>
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: C.texteGris, fontSize: '13px' }}>No documents match.</div>
            ) : filteredDocs.map(d => {
              const icon = getFileIcon(d.type);
              return (
                <div key={d.id} onClick={() => { setSelectedId(d.id); setActiveTab('details'); }}
                  className={'doc-row' + (selectedId === d.id ? ' active' : '')}
                  style={{ border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px', marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: C.ivoire, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: icon.color, flexShrink: 0 }}>{icon.label}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: C.texteFonce, fontWeight: 700, fontSize: '12.5px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                    <p style={{ color: C.texteGris, fontSize: '11px', margin: '2px 0 0' }}>{formatSize(d.size)} - {d.category}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT - Selected document + tabs */}
        <div className="tarsyn-docs-detail" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: '16px' }}>

          {!selectedDoc ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.blanc, borderRadius: '16px', boxShadow: '0 2px 12px rgba(74,31,56,0.08)' }}>
              <p style={{ color: C.texteGris, fontSize: '14px' }}>Select a document to view details.</p>
            </div>
          ) : (
            <>
              {/* Selected doc panel */}
              <div className="tarsyn-docs-panel" style={{ flexShrink: 0, background: C.blanc, borderRadius: '16px', padding: '18px 22px', boxShadow: '0 2px 12px rgba(74,31,56,0.08)', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: getFileIcon(selectedDoc.type).color, flexShrink: 0 }}>
                  {getFileIcon(selectedDoc.type).label}
                </div>
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <p style={{ color: C.texteFonce, fontWeight: 800, fontSize: '15px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedDoc.name}</p>
                  <p style={{ color: C.texteGris, fontSize: '12px', margin: '3px 0 0' }}>{formatSize(selectedDoc.size)} - {selectedDoc.category} - v{selectedDoc.version || 1}</p>
                </div>
                <div className="tarsyn-docs-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={selectedDoc.url} target="_blank" rel="noreferrer" onClick={() => logAction('Previewed')}
                    style={{ background: C.ivoire, color: C.bleuFonce, border: `1.5px solid ${C.bleu}`, padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>Preview</a>
                  <button onClick={handleDownload} style={{ background: C.bleu, color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Download</button>
                  <button onClick={handlePrint} style={{ background: C.ivoire, color: C.bleuFonce, border: `1.5px solid ${C.or}`, padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Print</button>
                  <button onClick={handleShare} style={{ background: C.ivoire, color: C.bleuFonce, border: `1.5px solid ${C.border}`, padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Share</button>
                  <button onClick={() => handleDelete(selectedDoc)} style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: C.blanc, borderRadius: '16px', boxShadow: '0 2px 12px rgba(74,31,56,0.08)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                  {TABS.map(t => (
                    <div key={t.key} className="tab-btn" onClick={() => setActiveTab(t.key)}
                      style={{ padding: '13px 22px', fontSize: '13px', fontWeight: 700,
                        color: activeTab === t.key ? C.bleuFonce : C.texteGris,
                        borderBottom: activeTab === t.key ? `2.5px solid ${C.bleu}` : '2.5px solid transparent' }}>
                      {t.label}
                    </div>
                  ))}
                </div>

                <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                  {activeTab === 'details' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px' }}>
                      {[
                        ['Name', selectedDoc.name],
                        ['Type', selectedDoc.type || '-'],
                        ['Size', formatSize(selectedDoc.size)],
                        ['Category', selectedDoc.category],
                        ['Uploaded', formatDate(selectedDoc.createdAt)],
                        ['Last modified', formatDate(selectedDoc.updatedAt || selectedDoc.createdAt)],
                        ['Downloads', String(selectedDoc.downloadCount || 0)],
                        ['Version', 'v' + (selectedDoc.version || 1)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p style={{ color: C.texteGris, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 3px' }}>{label}</p>
                          <p style={{ color: C.texteFonce, fontWeight: 600, fontSize: '13.5px', margin: 0, wordBreak: 'break-word' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div style={{ maxWidth: '420px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                        <span style={{ fontSize: '30px', color: C.or }}>{'*'.repeat(Math.round(avgRating)) + 'o'.repeat(5 - Math.round(avgRating))}</span>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '18px', color: C.texteFonce, margin: 0 }}>{avgRating.toFixed(1)} / 5</p>
                          <p style={{ fontSize: '12px', color: C.texteGris, margin: 0 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {editingReview ? (
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <span key={n} className="star" onClick={() => submitReview(n)}
                              style={{ fontSize: '26px', color: n <= myRating ? C.or : C.border }}>*</span>
                          ))}
                        </div>
                      ) : (
                        <button onClick={() => setEditingReview(true)}
                          style={{ background: C.bleu, color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                          {myRating > 0 ? 'Edit my review' : 'Add a review'}
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'comments' && (
                    <DocumentComments documentId={selectedDoc.id} currentUserName="Admin" currentUserRole="admin" />
                  )}

                  {activeTab === 'history' && (
                    <div>
                      {history.length === 0 ? (
                        <p style={{ color: C.texteGris, fontSize: '13px' }}>No history recorded for this document yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {history.map((h: any) => (
                            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
                              <span style={{ fontSize: '13px', color: C.texteFonce, fontWeight: 600 }}>{h.action}</span>
                              <span style={{ fontSize: '12px', color: C.texteGris }}>{formatDate(h.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
