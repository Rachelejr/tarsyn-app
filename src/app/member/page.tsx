'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import TrialGuard from '@/components/TrialGuard';
import DocumentComments from '@/components/DocumentComments';

const C = {
  bordeaux: '#6E93AC',
  dore: '#E9C77B',
  doreDark: '#C9A55E',
  creme: '#FBEEDD',
  texteGris: '#6E93AC',
  texteFonce: '#4A6B85',
  border: '#EAD9BE',
};

const CATEGORIES = ['All', 'General', 'Rules', 'Contracts', 'Reports', 'Receipts', 'Other'];

function MemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetGroupId = searchParams.get('groupId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState('');
  const [allMemberships, setAllMemberships] = useState<any[]>([]);
  const [activeMember, setActiveMember] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('General');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const fetchDocs = async (organizerId: string, currentUid: string) => {
    const dq = query(collection(db, 'documents'), where('organizerId', '==', organizerId));
    const dsnap = await getDocs(dq);
    const allDocs = dsnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const visibleDocs = allDocs.filter((d: any) => {
      if (!d.visibleTo || d.visibleTo.length === 0) return true;
      return d.visibleTo.includes(currentUid);
    });
    setDocs(visibleDocs.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
  };

  const selectMembership = async (membership: any, currentUid: string) => {
    setActiveMember(membership);
    const gq = query(collection(db, 'groups'), where('organizerId', '==', membership.organizerId));
    const gsnap = await getDocs(gq);
    if (!gsnap.empty) setGroupName(gsnap.docs[0].data().name);
    else setGroupName(membership.groupName || 'Your Group');
    await fetchDocs(membership.organizerId, currentUid);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      try {
        const memberQ = query(collection(db, 'members'), where('userId', '==', u.uid));
        const memberSnap = await getDocs(memberQ);
        if (!memberSnap.empty) {
          const memberships = memberSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setAllMemberships(memberships);
          let target = memberships[0];
          if (targetGroupId) {
            const found = memberships.find((m: any) => m.groupId === targetGroupId);
            if (found) target = found;
          }
          await selectMembership(target, u.uid);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router, targetGroupId]);

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return { label: 'PDF', color: '#C62828' };
    if (type?.includes('image')) return { label: 'IMG', color: '#2E7D32' };
    if (type?.includes('word') || type?.includes('document')) return { label: 'DOC', color: '#1565C0' };
    if (type?.includes('sheet') || type?.includes('excel')) return { label: 'XLS', color: '#2E7D32' };
    return { label: 'FILE', color: C.texteGris };
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt?.seconds) return '—';
    return new Date(createdAt.seconds * 1000).toLocaleDateString();
  };

  const isNew = (createdAt: any) => {
    if (!createdAt?.seconds) return false;
    const ageHours = (Date.now() / 1000 - createdAt.seconds) / 3600;
    return ageHours < 48;
  };

  const openPendingFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setPendingFiles(arr);
    setShowUploadModal(true);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) openPendingFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) openPendingFiles(e.dataTransfer.files);
  };

  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0 || !activeMember?.organizerId || !uid) return;
    setUploading(true);
    setError('');
    try {
      for (const file of pendingFiles) {
        const path = 'documents/' + activeMember.organizerId + '/' + uid + '_' + Date.now() + '_' + file.name;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await addDoc(collection(db, 'documents'), {
          name: file.name, type: file.type, size: file.size, url,
          storagePath: path, category: uploadCategory,
          organizerId: activeMember.organizerId,
          uploadedBy: uid, source: 'member', visibleTo: [],
          createdAt: serverTimestamp(),
        });
      }
      await fetchDocs(activeMember.organizerId, uid);
      setShowUploadModal(false);
      setPendingFiles([]);
      setUploadCategory('General');
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (d: any) => {
    if (d.uploadedBy !== uid) return;
    if (!confirm('Delete "' + d.name + '"?')) return;
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
      <style dangerouslySetInnerHTML={{__html: '.cat-pill{transition:all 0.15s ease;cursor:pointer;}.doc-row{transition:all 0.15s ease;}.doc-row:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(110,147,172,0.08);}.upload-zone{transition:all 0.2s ease;}.group-tab{transition:all 0.15s ease;cursor:pointer;}'}} />

      <nav style={{ background: C.bordeaux, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: C.dore, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: C.bordeaux, fontWeight: 800 }}>T</div>
          <div style={{ color: C.dore, fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: C.dore, padding: '7px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

        {allMemberships.length > 1 && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: C.texteGris, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>My Groups:</span>
            {allMemberships.map((m: any) => (
              <div key={m.id} className="group-tab" onClick={() => selectMembership(m, uid)}
                style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                  background: activeMember?.id === m.id ? C.bordeaux : 'white',
                  color: activeMember?.id === m.id ? 'white' : C.bordeaux,
                  border: '2px solid ' + (activeMember?.id === m.id ? C.bordeaux : C.border),
                  boxShadow: '0 2px 8px rgba(110,147,172,0.08)' }}>
                {m.groupName || m.tynId || 'Group'}
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg, ' + C.bordeaux + ' 0%, #4A6B85 100%)', borderRadius: '20px', padding: '28px 32px', marginBottom: '24px', boxShadow: '0 8px 24px rgba(110,147,172,0.18)' }}>
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: 800, margin: '0 0 16px' }}>{groupName || 'Your Group'}</h1>
          {activeMember && (
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Position</p>
                <p style={{ color: C.dore, fontWeight: 800, fontSize: '17px', margin: 0 }}>#{activeMember.position || '—'}</p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Status</p>
                <span style={{ background: activeMember.status === 'active' ? 'rgba(76,175,80,0.25)' : 'rgba(255,167,38,0.25)', color: activeMember.status === 'active' ? '#A5D6A7' : '#FFCC80', padding: '4px 12px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 700 }}>
                  {activeMember.status || 'pending'}
                </span>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>Payout Date</p>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '15px', margin: 0 }}>{activeMember.payoutDate || '—'}</p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>TYN-ID</p>
                <p style={{ color: 'white', fontWeight: 700, margin: 0, fontFamily: 'monospace', fontSize: '14px' }}>{activeMember.tynId || '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', boxShadow: '0 2px 16px rgba(110,147,172,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ color: C.bordeaux, fontSize: '19px', fontWeight: 800, margin: 0 }}>Documents</h2>
            <span style={{ fontSize: '12px', color: C.texteGris, fontWeight: 600 }}>{filteredDocs.length} file{filteredDocs.length !== 1 ? 's' : ''}</span>
          </div>

          {error && (
            <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
          )}

          <div className="upload-zone" onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            style={{ border: '2px dashed ' + (isDragging ? C.bordeaux : C.border), background: isDragging ? '#F3E9D6' : C.creme, borderRadius: '16px', padding: '28px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: '22px' }}>
            <div style={{ fontSize: '30px', marginBottom: '8px' }}>+</div>
            <p style={{ color: C.bordeaux, fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>Click to upload or drag and drop</p>
            <p style={{ color: C.texteGris, fontSize: '12px', margin: 0 }}>Supports multiple files · PDF, Word, Excel, Images</p>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelected} style={{ display: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by file name..."
              style={{ flex: 1, minWidth: '180px', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <span key={c} className="cat-pill" onClick={() => setFilterCat(c)}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12.5px', fontWeight: 700,
                  background: filterCat === c ? C.bordeaux : 'white', color: filterCat === c ? 'white' : C.texteGris,
                  border: '1.5px solid ' + (filterCat === c ? C.bordeaux : C.border) }}>
                {c}
              </span>
            ))}
          </div>

          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>F</div>
              <p style={{ color: C.texteGris, fontSize: '14px' }}>No documents match your search.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredDocs.map((d: any) => {
                const icon = getFileIcon(d.type);
                return (
                  <div key={d.id}>
                    <div className="doc-row" style={{ background: C.creme, border: '1px solid ' + C.border, borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '220px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: icon.color, border: '1px solid ' + C.border, flexShrink: 0 }}>
                          {icon.label}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                            <p style={{ color: C.texteFonce, fontWeight: 700, margin: 0, fontSize: '14px' }}>{d.name}</p>
                            {isNew(d.createdAt) && (
                              <span style={{ fontSize: '9px', background: C.dore, color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>NEW</span>
                            )}
                            <span style={{ fontSize: '9px', background: d.source === 'admin' ? '#E3F2FD' : '#F3E4DC', color: d.source === 'admin' ? '#1565C0' : C.bordeaux, padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                              {d.source === 'admin' ? 'ADMIN' : 'YOU'}
                            </span>
                          </div>
                          <p style={{ color: C.texteGris, fontSize: '12px', margin: '3px 0 0' }}>
                            {formatSize(d.size)} · {d.category} · {formatDate(d.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <a href={d.url} target="_blank" rel="noreferrer" style={{ background: 'white', color: C.bordeaux, border: '1.5px solid ' + C.bordeaux, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>Preview</a>
                        <a href={d.url} download={d.name} style={{ background: C.bordeaux, color: 'white', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>Download</a>
                        <button onClick={() => handlePrint(d.url)} style={{ background: 'white', color: C.doreDark, border: '1.5px solid ' + C.dore, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Print</button>
                        {d.uploadedBy === uid && (
                          <button onClick={() => handleDelete(d)} disabled={deletingId === d.id} style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                            {deletingId === d.id ? '...' : 'Delete'}
                          </button>
                        )}
                        <button onClick={() => setExpandedDocId(expandedDocId === d.id ? null : d.id)}
                          style={{ background: expandedDocId === d.id ? C.bordeaux : 'white', color: expandedDocId === d.id ? 'white' : C.bordeaux, border: '1.5px solid ' + C.bordeaux, padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                          Comments
                        </button>
                      </div>
                    </div>
                    {expandedDocId === d.id && (
                      <div style={{ background: 'white', border: '1px solid ' + C.border, borderRadius: '0 0 14px 14px', padding: '20px', marginTop: '-4px' }}>
                        <DocumentComments documentId={d.id} currentUserName={activeMember?.fullName || ''} currentUserRole='member' />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showUploadModal && pendingFiles.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(38,64,79,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: C.bordeaux, fontSize: '17px', fontWeight: 800, margin: '0 0 6px' }}>
              Upload {pendingFiles.length > 1 ? pendingFiles.length + ' files' : 'Document'}
            </h3>
            <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '18px' }}>
              {pendingFiles.map((f, i) => (
                <p key={i} style={{ color: C.texteGris, fontSize: '13px', margin: '4px 0', wordBreak: 'break-all' }}>- {f.name}</p>
              ))}
            </div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.texteFonce, marginBottom: '6px' }}>Category</label>
            <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1.5px solid ' + C.border, borderRadius: '10px', fontSize: '13px', outline: 'none', marginBottom: '20px', boxSizing: 'border-box' }}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowUploadModal(false); setPendingFiles([]); }} disabled={uploading}
                style={{ flex: 1, padding: '11px', background: 'transparent', color: C.bordeaux, border: '2px solid ' + C.bordeaux, borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
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

export default function MemberPage() {
  return (
    <TrialGuard>
      <MemberContent />
    </TrialGuard>
  );
}
