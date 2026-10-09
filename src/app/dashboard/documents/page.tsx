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
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import { openDocument } from '@/lib/openDocument';
import { rebrandLegacyReceiptUrl } from '@/lib/receiptHtml';

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
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [category, setCategory] = useState('General');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [docShow, setDocShow] = useState('10');

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
      const names: Record<string, string> = {};
      gsnap.docs.forEach(g => { names[g.id] = g.data().name || ''; });
      setGroupNames(names);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Old receipts carried the UNIMUNITY name: show them under the group's name.
  const docUrl = (d: any) => rebrandLegacyReceiptUrl(d?.url || '', groupNames[d?.groupId] || groupName);

  const loadDocs = async (uid: string) => {
    const q = query(collection(db, 'documents'), where('organizerId', '==', uid));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // A member's receipt from UNIMUNITY (their access fee) is private to them.
      .filter((d: any) => !(d.appReceipt && !(d.visibleTo || []).includes(uid)))
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
    openDocument(docUrl(selectedDoc));
    try {
      await updateDoc(doc(db, 'documents', selectedDoc.id), { downloadCount: increment(1) });
      setDocs(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, downloadCount: (d.downloadCount || 0) + 1 } : d));
    } catch (e) { /* silent */ }
    logAction('Downloaded');
  };

  const handlePrint = () => {
    if (!selectedDoc) return;
    openDocument(docUrl(selectedDoc), { print: true });
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme, gap: '18px' }}>
      <style>{`@keyframes UNIMUNITY-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/unimunity-logo.png" alt="UNIMUNITY" style={{ height: '60px', width: 'auto' }} />
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #EAD9BE', borderTopColor: C.bleu, animation: 'UNIMUNITY-spin 0.8s linear infinite' }} />
    </div>
  );

  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid #F0E4D6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
  const fieldStyle = { width: '100%', padding: '7px 11px', borderRadius: 10, border: '1.5px solid #EAD9BE', fontSize: 13, color: C.texteFonce, background: '#FFFDF9', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'Inter, sans-serif' };
  const smallLabel = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8 };
  const visibleDocs = docShow === 'all' ? filteredDocs : filteredDocs.slice(0, parseInt(docShow));
  const totalSize = docs.reduce((s, d) => s + (d.size || 0), 0);
  const totalDownloads = docs.reduce((s, d) => s + (d.downloadCount || 0), 0);
  const actionBtn = { padding: '7px 13px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 900px) {
          .dc-grid { grid-template-columns: 1fr !important; }
          .dc-details { grid-template-columns: 1fr 1fr !important; }
        }
        .dc-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .dc-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .dc-head { display: flex; align-items: center; gap: 11px; }
        .dc-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .dc-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .dc-form input:focus, .dc-form select:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .dc-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .dc-back:hover { background: #FBEEDD; }
        .doc-row { transition: background .15s ease, border-color .15s ease; cursor: pointer; }
        .doc-row:hover { background: #FFFBF5 !important; }
        .doc-row.active { border-color: #6B2D4E !important; background: #FBEEDD !important; }
        .tab-btn { transition: all .15s ease; cursor: pointer; }
        .cat-pill { transition: all .15s ease; cursor: pointer; }
        .star { cursor: pointer; transition: transform .1s ease; }
        .star:hover { transform: scale(1.2); }
        .dc-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .dc-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .scroll-thin::-webkit-scrollbar { width: 6px; }
        .scroll-thin::-webkit-scrollbar-thumb { background: #EAD9BE; border-radius: 3px; }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
      `}} />
      <div style={{ flex: 1 }}>

      <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start', cursor: 'pointer' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Document Center</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Store, share and track your group documents.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="dc-form" style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="dc-back">Back to Dashboard</button>
        </div>

        <div className="dc-grid" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

          {/* LEFT - upload + list */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            <div className="dc-card" style={{ ...cardStyle, padding: '14px 18px' }}>
              <div className="dc-head" style={{ marginBottom: 12, paddingBottom: 9, borderBottom: '1px solid #F3E6D8' }}>
                <span className="dc-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F4E4}'}</span>
                <h2 className="dc-title">Upload</h2>
              </div>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                style={{ border: `2px dashed ${isDragging ? C.bleu : '#EAD9BE'}`, background: isDragging ? C.creme : '#FFFDF9', borderRadius: 12, padding: '14px', textAlign: 'center' as const, cursor: uploading ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
                <div style={{ fontSize: 20, color: C.bleu, fontWeight: 800, lineHeight: 1 }}>+</div>
                <p style={{ color: C.bleuFonce, fontWeight: 700, fontSize: 12.5, margin: '4px 0 0' }}>{uploading ? 'Uploading... ' + progress + '%' : 'Drop a file or click to upload'}</p>
                <input ref={fileInputRef} type="file" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
              </div>
              {uploading && (
                <div style={{ background: C.creme, borderRadius: 999, height: 6, marginBottom: 10 }}>
                  <div style={{ background: 'linear-gradient(90deg,#E9C77B,#6B2D4E)', width: `${progress}%`, height: 6, borderRadius: 999, transition: 'width .3s' }} />
                </div>
              )}
              <label style={{ ...smallLabel, display: 'block', marginBottom: 4 }}>Category for new upload</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={fieldStyle}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="dc-card" style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="dc-head">
                  <span className="dc-ico" style={{ background: 'linear-gradient(135deg,#FCE4EC,#F4B6C7)' }}>{'\u{1F4C1}'}</span>
                  <h2 className="dc-title">Documents <span style={{ fontSize: 12, fontWeight: 600, color: C.texteGris }}>({docs.length})</span></h2>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: C.texteGris, fontWeight: 600 }}>Show:</span>
                  <select value={docShow} onChange={e => setDocShow(e.target.value)} style={{ ...fieldStyle, width: 'auto', padding: '4px 8px', fontSize: 12.5 }}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>
              <div style={{ padding: '10px 18px', borderBottom: '1px solid #F3E6D8', background: '#FFFCF7' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..." style={{ ...fieldStyle, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                  {['All', ...CATEGORIES].map(c => (
                    <span key={c} className="cat-pill" onClick={() => setFilterCat(c)}
                      style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: filterCat === c ? C.bleu : C.blanc, color: filterCat === c ? 'white' : '#8A7B6C',
                        border: `1px solid ${filterCat === c ? C.bleu : '#EAD9BE'}` }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="scroll-thin" style={{ maxHeight: 460, overflowY: 'auto' as const, padding: '10px 12px' }}>
                {filteredDocs.length === 0 ? (
                  <div style={{ textAlign: 'center' as const, padding: '26px 10px', color: '#8A7B6C', fontSize: 13 }}>{docs.length === 0 ? 'No documents yet. Upload your first file above.' : 'No documents match.'}</div>
                ) : visibleDocs.map(d => {
                  const icon = getFileIcon(d.type);
                  return (
                    <div key={d.id} onClick={() => { setSelectedId(d.id); setActiveTab('details'); }}
                      className={'doc-row' + (selectedId === d.id ? ' active' : '')}
                      style={{ border: '1px solid #F0E4D6', background: C.blanc, borderRadius: 11, padding: '9px 10px', marginBottom: 7, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FBF4EA', border: '1px solid #F0E4D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: icon.color, flexShrink: 0 }}>{icon.label}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ color: C.texteFonce, fontWeight: 700, fontSize: 12.5, margin: 0, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                        <p style={{ color: '#8A7B6C', fontSize: 11, margin: '2px 0 0' }}>{formatSize(d.size)} · {d.category}</p>
                      </div>
                    </div>
                  );
                })}
                {visibleDocs.length < filteredDocs.length && (
                  <div style={{ padding: '6px 0 2px', textAlign: 'center' as const, fontSize: 12, color: '#8A7B6C' }}>
                    Showing {visibleDocs.length} of {filteredDocs.length}.{' '}
                    <span onClick={() => setDocShow('all')} style={{ color: C.bleu, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Show all</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT - stats + selected document */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Documents', value: String(docs.length), sub: 'files stored', top: '#E9C77B' },
                { label: 'Storage', value: formatSize(totalSize), sub: 'total size', top: '#B39DDB' },
                { label: 'Downloads', value: String(totalDownloads), sub: 'all documents', top: '#66BB6A' },
              ].map(k => (
                <div key={k.label} style={{ ...cardStyle, borderTop: '3px solid ' + k.top, padding: '11px 16px' }}>
                  <p style={{ ...smallLabel, margin: '0 0 3px' }}>{k.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: C.bleuFonce, margin: 0 }}>{k.value}</p>
                  <p style={{ fontSize: 11, color: '#8A7B6C', margin: '2px 0 0' }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {!selectedDoc ? (
              <div className="dc-card" style={{ ...cardStyle, padding: '50px 20px', textAlign: 'center' as const }}>
                <p style={{ color: '#8A7B6C', fontSize: 14, margin: 0 }}>Select a document to view its details.</p>
              </div>
            ) : (
              <>
                <div className="dc-card" style={{ ...cardStyle, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderBottom: '1px solid #F0E4D6', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: C.blanc, border: '1px solid #F0E4D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: getFileIcon(selectedDoc.type).color, flexShrink: 0 }}>
                      {getFileIcon(selectedDoc.type).label}
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ color: '#3A1F2E', fontWeight: 800, fontSize: 15, margin: 0, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedDoc.name}</p>
                      <p style={{ color: '#C9974D', fontSize: 11, fontWeight: 700, margin: '3px 0 0', textTransform: 'uppercase' as const, letterSpacing: 1 }}>{selectedDoc.category} · v{selectedDoc.version || 1} · {formatSize(selectedDoc.size)}</p>
                    </div>
                  </div>
                  <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    <a href={docUrl(selectedDoc)} target="_blank" rel="noreferrer" onClick={() => logAction('Previewed')} className="dc-btn"
                      style={{ ...actionBtn, background: C.creme, color: C.bleu, border: '1.5px solid #F0DCA8' }}>{'\u{1F441}\uFE0F'} Preview</a>
                    <button onClick={handleDownload} className="dc-btn" style={{ ...actionBtn, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(107,45,78,0.22)' }}>{'\u{1F4E5}'} Download</button>
                    <button onClick={handlePrint} className="dc-btn" style={{ ...actionBtn, background: C.or, color: C.bleuFonce, border: 'none' }}>{'\u{1F5A8}\uFE0F'} Print</button>
                    <button onClick={handleShare} className="dc-btn" style={{ ...actionBtn, background: C.blanc, color: C.bleuFonce, border: '1.5px solid #EAD9BE' }}>{'\u{1F517}'} Share</button>
                    <button onClick={() => handleDelete(selectedDoc)} className="dc-btn" style={{ ...actionBtn, background: '#FFEBEE', color: '#C62828', border: 'none', marginLeft: 'auto' }}>Delete</button>
                  </div>
                </div>

                <div className="dc-card" style={{ ...cardStyle, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #F3E6D8', padding: '0 8px', background: '#FFFCF7' }}>
                    {TABS.map(t => (
                      <div key={t.key} className="tab-btn" onClick={() => setActiveTab(t.key)}
                        style={{ padding: '12px 18px', fontSize: 13, fontWeight: 800,
                          color: activeTab === t.key ? C.bleuFonce : '#A08B7D',
                          borderBottom: activeTab === t.key ? `2.5px solid ${C.bleu}` : '2.5px solid transparent' }}>
                        {t.label}
                      </div>
                    ))}
                  </div>

                  <div className="scroll-thin" style={{ padding: '18px 20px', minHeight: 220, maxHeight: 460, overflowY: 'auto' as const }}>
                    {activeTab === 'details' && (
                      <div className="dc-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px 18px' }}>
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
                          <div key={label} style={{ borderBottom: '1px dashed #F3E6D8', paddingBottom: 8 }}>
                            <p style={{ ...smallLabel, margin: '0 0 3px' }}>{label}</p>
                            <p style={{ color: C.texteFonce, fontWeight: 600, fontSize: 13, margin: 0, wordBreak: 'break-word' as const }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'reviews' && (
                      <div style={{ maxWidth: 420 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                          <span style={{ fontSize: 26, letterSpacing: 2 }}>{[1, 2, 3, 4, 5].map(n => (<span key={n} style={{ color: n <= Math.round(avgRating) ? C.or : '#EAD9BE' }}>{'\u2605'}</span>))}</span>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: 18, color: C.texteFonce, margin: 0 }}>{avgRating.toFixed(1)} / 5</p>
                            <p style={{ fontSize: 12, color: '#8A7B6C', margin: 0 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        {editingReview ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <span key={n} className="star" onClick={() => submitReview(n)}
                                style={{ fontSize: 26, color: n <= myRating ? C.or : '#EAD9BE' }}>{'\u2605'}</span>
                            ))}
                          </div>
                        ) : (
                          <button onClick={() => setEditingReview(true)} className="dc-btn"
                            style={{ ...actionBtn, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: 'white', border: 'none' }}>
                            {myRating > 0 ? 'Edit my review' : 'Add a review'}
                          </button>
                        )}
                      </div>
                    )}

                    {activeTab === 'comments' && (
                      <DocumentComments documentId={selectedDoc.id} currentUserName="Admin" currentUserRole="admin" />
                    )}

                    {activeTab === 'history' && (
                      history.length === 0 ? (
                        <p style={{ color: '#8A7B6C', fontSize: 13, margin: 0 }}>No history recorded for this document yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                          {history.map((h: any) => (
                            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #F3E6D8', padding: '8px 2px' }}>
                              <span style={{ fontSize: 13, color: C.texteFonce, fontWeight: 700 }}>
                                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: C.or, marginRight: 9, verticalAlign: 'middle' }} />
                                {h.action}
                              </span>
                              <span style={{ fontSize: 12, color: '#8A7B6C' }}>{formatDate(h.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      </div>
      <Footer />
    </div>
  );
}
