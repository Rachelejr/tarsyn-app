'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDoc, query, where, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Suspense } from 'react';
import TrialGuard from '@/components/TrialGuard';
import DocumentComments from '@/components/DocumentComments';

const C = {
  bordeaux: '#6B2D4E',
  dore: '#E9C77B',
  doreDark: '#C9A55E',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  texteGris: '#6B2D4E',
  texteFonce: '#4A1F38',
  border: '#EAD9BE',
  muted: '#8A7A88',
  success: '#3F7D5C',
  successBg: '#E4F0E9',
  danger: '#B0525F',
  dangerBg: '#F5E4E6',
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
  const [groupMemberCount, setGroupMemberCount] = useState(0);
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
  const [branding, setBranding] = useState<{ slogan?: string; primaryColor?: string; secondaryColor?: string; logo?: string; showTarsynBadge?: boolean; enabled?: boolean } | null>(null);
  const [activity, setActivity] = useState<any[]>([]);

  // --- Payment grid (member view) state ---
  const [myPayments, setMyPayments] = useState<{
    paid: number;
    total: number;
    missingWeeks: string[];
    weeks: Record<string, string>;
    payments: Record<string, Record<string, boolean>>;
    slots: string[];
    memberName: string;
  } | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showAllWeeks, setShowAllWeeks] = useState(false);

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

  const fetchActivity = async (organizerId: string) => {
    try {
      const aq = query(
        collection(db, 'audit_logs'),
        where('organizerId', '==', organizerId),
        where('category', '==', 'Document'),
        orderBy('createdAt', 'desc')
      );
      const asnap = await getDocs(aq);
      setActivity(asnap.docs.slice(0, 8).map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { setActivity([]); }
  };

  // Robust member count: tries groupId first, then falls back to the group's
  // real organizerId/adminId (groups sometimes use one or the other field).
  const fetchGroupMemberCount = async (membership: any) => {
    try {
      let count = 0;

      if (membership.groupId) {
        const mq = query(collection(db, 'members'), where('groupId', '==', membership.groupId));
        const msnap = await getDocs(mq);
        count = msnap.size;

        if (count === 0) {
          const groupSnap = await getDoc(doc(db, 'groups', membership.groupId));
          if (groupSnap.exists()) {
            const gData = groupSnap.data();
            const realOrganizerId = gData?.organizerId || gData?.adminId;
            if (realOrganizerId) {
              const mq2 = query(collection(db, 'members'), where('organizerId', '==', realOrganizerId));
              const msnap2 = await getDocs(mq2);
              count = msnap2.size;
            }
          }
        }
      } else if (membership.organizerId) {
        const mq = query(collection(db, 'members'), where('organizerId', '==', membership.organizerId));
        const msnap = await getDocs(mq);
        count = msnap.size;
      }

      setGroupMemberCount(count);
    } catch (e) {
      setGroupMemberCount(0);
    }
  };

  // Reads this member's payment status from paymentGrids/{groupId}_current/memberViews/{uid}
  const fetchMyPayments = async (membership: any, currentUid: string) => {
    if (!membership?.groupId) { setMyPayments(null); return; }
    setPaymentsLoading(true);
    try {
      const gridId = membership.groupId + '_current';
      const viewSnap = await getDoc(doc(db, 'paymentGrids', gridId, 'memberViews', currentUid));
      if (!viewSnap.exists()) { setMyPayments(null); setPaymentsLoading(false); return; }

      const data = viewSnap.data();
      const weeks: Record<string, string> = data.weeks || {};
      const payments: Record<string, Record<string, boolean>> = data.payments || {};
      const slots: string[] = data.slots || [];

      const weekKeys = Object.keys(weeks).sort((a, b) => Number(a) - Number(b));
      const today = new Date();
      let paid = 0;
      let total = 0;
      const missingWeeks: string[] = [];

      weekKeys.forEach((wIdx) => {
        const weekDate = new Date(weeks[wIdx]);
        if (weekDate > today) return; // only count elapsed weeks
        slots.forEach((slotNum) => {
          total++;
          if (payments[slotNum]?.[wIdx]) {
            paid++;
          } else {
            missingWeeks.push('W' + wIdx);
          }
        });
      });

      setMyPayments({ paid, total, missingWeeks, weeks, payments, slots, memberName: data.memberName || membership?.fullName || 'You' });
    } catch (e) {
      setMyPayments(null);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const selectMembership = async (membership: any, currentUid: string) => {
    setActiveMember(membership);
    try {
      if (membership.groupId) {
        const groupDoc = await getDoc(doc(db, 'groups', membership.groupId));
        if (groupDoc.exists()) {
          setGroupName(groupDoc.data().name || membership.groupName || 'Your Group');
          setBranding(groupDoc.data().groupBrand || null);
        } else {
          setGroupName(membership.groupName || 'Your Group');
          setBranding(null);
        }
      } else {
        const gq = query(collection(db, 'groups'), where('organizerId', '==', membership.organizerId));
        const gsnap = await getDocs(gq);
        if (!gsnap.empty) {
          setGroupName(gsnap.docs[0].data().name);
          setBranding(gsnap.docs[0].data().groupBrand || null);
        } else {
          setGroupName(membership.groupName || 'Your Group');
          setBranding(null);
        }
      }
    } catch (e) { setBranding(null); }
    await fetchDocs(membership.organizerId, currentUid);
    await fetchActivity(membership.organizerId);
    await fetchGroupMemberCount(membership);
    await fetchMyPayments(membership, currentUid);
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
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (createdAt: any) => {
    if (!createdAt?.seconds) return '-';
    return new Date(createdAt.seconds * 1000).toLocaleDateString();
  };

  const formatDateTime = (ts: any) => {
    if (!ts?.seconds) return '-';
    return new Date(ts.seconds * 1000).toLocaleDateString() + ' ' + new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isNew = (createdAt: any) => {
    if (!createdAt?.seconds) return false;
    const ageHours = (Date.now() / 1000 - createdAt.seconds) / 3600;
    return ageHours < 48;
  };

  const openPendingFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setError('');
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
    if (pendingFiles.length === 0) return;
    if (!uid) { setError('You are not signed in. Please refresh and sign in again.'); return; }
    if (!activeMember?.organizerId) {
      setError('Could not find your group information (missing organizerId on your member record). Please contact your organizer - this membership record may need to be fixed.');
      console.error('Upload blocked: activeMember is', activeMember);
      return;
    }
    setUploading(true);
    setError('');
    try {
      for (const file of pendingFiles) {
        const path = 'documents/' + activeMember.organizerId + '/' + uid + '_' + Date.now() + '_' + file.name;
        const storageRef = ref(storage, path);

        console.log('STEP 1: uploading to storage...');
        await uploadBytes(storageRef, file);
        console.log('STEP 1 OK');

        console.log('STEP 2: getting download URL...');
        const url = await getDownloadURL(storageRef);
        console.log('STEP 2 OK');

        console.log('STEP 3: creating documents record...');
        await addDoc(collection(db, 'documents'), {
          name: file.name, type: file.type, size: file.size, url,
          storagePath: path, category: uploadCategory,
          organizerId: activeMember.organizerId,
          uploadedBy: uid, source: 'member', visibleTo: [],
          createdAt: serverTimestamp(),
        });
        console.log('STEP 3 OK');

        console.log('STEP 4: creating audit_logs record...');
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: activeMember.organizerId, category: 'Document',
          action: 'Uploaded ' + file.name, createdAt: serverTimestamp(),
          actorId: uid,
        });
        console.log('STEP 4 OK');
      }

      console.log('STEP 5: fetching docs...');
      await fetchDocs(activeMember.organizerId, uid);
      console.log('STEP 5 OK');

      console.log('STEP 6: fetching activity...');
      await fetchActivity(activeMember.organizerId);
      console.log('STEP 6 OK');

      setShowUploadModal(false);
      setPendingFiles([]);
      setUploadCategory('General');
    } catch (err: any) {
      console.error('UPLOAD ERROR:', err);
      console.error('UPLOAD ERROR CODE:', err?.code);
      console.error('UPLOAD ERROR MESSAGE:', err?.message);
      setError('Upload failed: ' + (err?.code || err?.message || 'unknown error'));
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
        try { await deleteObject(ref(storage, d.storagePath)); } catch { /* file may already be gone from storage - not fatal */ }
      }
      await deleteDoc(doc(db, 'documents', d.id));
      setDocs(docs.filter(x => x.id !== d.id));
    } catch (e: any) {
      setError('Could not delete this file: ' + (e?.message || 'unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  // NEW: delete an admin-generated receipt via the secure server route
  // (Admin SDK), since the member is not the organizerId owner and the
  // existing Firestore rules would otherwise block a direct client delete.
  // This is purely additive - it does not touch handleDelete or any rule.
  const handleDeleteAdminDoc = async (d: any) => {
    if (!confirm('Delete "' + d.name + '"?')) return;
    setDeletingId(d.id);
    try {
      const res = await fetch('/api/delete-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: d.id, userId: uid }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Delete failed (${res.status})`);
      }
      setDocs(docs.filter(x => x.id !== d.id));
    } catch (e: any) {
      setError('Could not delete this file: ' + (e?.message || 'unknown error'));
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

  const receiptDocs = docs.filter(d => d.category === 'Receipts');
  const recentUploads = docs.slice(0, 5);
  const effectiveBranding = branding && branding.enabled !== false ? branding : null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme }}>
      <p style={{ color: C.bordeaux, fontSize: '18px', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  const paymentPct = myPayments && myPayments.total > 0 ? Math.round((myPayments.paid / myPayments.total) * 100) : null;
  const weekKeysSorted = myPayments ? Object.keys(myPayments.weeks).sort((a, b) => Number(a) - Number(b)) : [];
  const weeksToShow = showAllWeeks ? weekKeysSorted : weekKeysSorted.slice(0, 8);

  return (
    <div className="tarsyn-mem-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.ivoire, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .cat-pill{transition:all 0.15s ease;cursor:pointer;}
        .doc-row{transition:all 0.15s ease;}
        .doc-row:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(107,45,78,0.08);}
        .upload-zone{transition:all 0.2s ease;}
        .group-tab{transition:all 0.15s ease;cursor:pointer;}
        .qa-btn{transition:all 0.15s ease;cursor:pointer;}
        .qa-btn:hover{transform:translateY(-1px);}
        .pay-cell{transition:all 0.15s ease;}
        @media (max-width: 1050px) {
          .tarsyn-mem-grid { grid-template-columns: 240px 1fr !important; }
          .tarsyn-mem-right { display: none !important; }
        }
        @media (max-width: 700px) {
          .tarsyn-mem-root { height: auto !important; overflow: visible !important; }
          .tarsyn-mem-grid { grid-template-columns: 1fr !important; height: auto !important; overflow: visible !important; }
          .tarsyn-mem-left, .tarsyn-mem-center { overflow: visible !important; max-height: none !important; position: static !important; }
          .tarsyn-mem-nav { padding: 12px 16px !important; }
        }
      `}} />

      <nav className="tarsyn-mem-nav" style={{ flexShrink: 0, background: effectiveBranding?.primaryColor || C.bordeaux, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          {effectiveBranding?.logo && (
            <img src={effectiveBranding.logo} alt="Logo" style={{ maxHeight: '30px', maxWidth: '140px' }} />
          )}
          <div>
            <div style={{ color: C.dore, fontWeight: 800, fontSize: '17px', lineHeight: 1 }}>{groupName || 'TARSYN'}</div>
            {effectiveBranding?.slogan && (
              <div style={{ color: 'rgba(233,199,123,0.7)', fontSize: '10px', letterSpacing: '0.05em', marginTop: '2px' }}>{effectiveBranding.slogan}</div>
            )}
          </div>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'transparent', border: '1px solid rgba(233,199,123,0.5)', color: C.dore, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          Sign Out
        </button>
      </nav>

      {allMemberships.length > 1 && (
        <div style={{ flexShrink: 0, background: C.creme, padding: '8px 28px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.texteGris, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>My Groups:</span>
          {allMemberships.map((m: any) => (
            <div key={m.id} className="group-tab" onClick={() => selectMembership(m, uid)}
              style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: activeMember?.id === m.id ? C.bordeaux : 'white',
                color: activeMember?.id === m.id ? 'white' : C.bordeaux,
                border: '1.5px solid ' + (activeMember?.id === m.id ? C.bordeaux : C.border) }}>
              {m.groupName || m.tynId || 'Group'}
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions Bar */}
      <div style={{ flexShrink: 0, background: 'white', padding: '10px 28px', display: 'flex', gap: '10px', borderBottom: `1px solid ${C.border}` }}>
        <button className="qa-btn" onClick={() => fileInputRef.current?.click()}
          style={{ background: C.bordeaux, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
          + Upload Document
        </button>
        <button className="qa-btn" onClick={() => { setFilterCat('Receipts'); }}
          style={{ background: C.creme, color: C.bordeaux, border: `1.5px solid ${C.border}`, padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
          View Receipts ({receiptDocs.length})
        </button>
        <button className="qa-btn" onClick={() => router.push('/leave-review')}
          style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.border, padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
          Leave a Review
        </button>
      </div>

      {/* 3-column grid */}
      <div className="tarsyn-mem-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 280px', minHeight: 0 }}>

        {/* LEFT - Group Info */}
        <div className="tarsyn-mem-left" style={{ borderRight: `1px solid ${C.border}`, padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'linear-gradient(135deg, ' + (effectiveBranding?.primaryColor || C.bordeaux) + ' 0%, #4A1F38 100%)', borderRadius: '16px', padding: '20px 18px', marginBottom: '16px', boxShadow: '0 6px 18px rgba(107,45,78,0.18)' }}>
            <h1 style={{ color: 'white', fontSize: '18px', fontWeight: 800, margin: '0 0 14px', wordBreak: 'break-word' }}>{groupName || 'Your Group'}</h1>
            {activeMember && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Member</p>
                  <p style={{ color: 'white', fontWeight: 800, fontSize: '15px', margin: 0 }}>
                    {activeMember.fullName || activeMember.name || 'Member'}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Position</p>
                  <p style={{ color: C.dore, fontWeight: 800, fontSize: '16px', margin: 0 }}>
                    #{activeMember.position || '-'}{groupMemberCount > 0 ? '/' + groupMemberCount : ''}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Status</p>
                  <span style={{ background: activeMember.status === 'active' ? 'rgba(76,175,80,0.25)' : 'rgba(255,167,38,0.25)', color: activeMember.status === 'active' ? '#A5D6A7' : '#FFCC80', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                    {activeMember.status || 'pending'}
                  </span>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Payout Date</p>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', margin: 0 }}>{activeMember.payoutDate || '-'}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>TYN-ID</p>
                  <p style={{ color: 'white', fontWeight: 700, margin: 0, fontFamily: 'monospace', fontSize: '13px' }}>{activeMember.tynId || '-'}</p>
                </div>
              </div>
            )}
          </div>

          {/* My Payments card */}
          <div style={{ background: 'white', border: '1px solid ' + C.border, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: C.muted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>My Payments</p>
            {paymentsLoading ? (
              <p style={{ color: C.texteGris, fontSize: '12.5px', margin: 0 }}>Loading...</p>
            ) : !myPayments ? (
              <p style={{ color: C.texteGris, fontSize: '12.5px', margin: 0 }}>No payment data yet for this group.</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: C.bordeaux }}>{paymentPct}%</span>
                  <span style={{ fontSize: '11.5px', color: C.texteGris }}>paid ({myPayments.paid}/{myPayments.total})</span>
                </div>
                <div style={{ height: '6px', borderRadius: '4px', background: C.creme, overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ height: '100%', width: paymentPct + '%', background: paymentPct === 100 ? C.success : C.dore }} />
                </div>
                {myPayments.missingWeeks.length > 0 ? (
                  <p style={{ fontSize: '11px', color: C.danger, margin: '0 0 10px' }}>
                    Missing: {myPayments.missingWeeks.slice(0, 6).join(', ')}{myPayments.missingWeeks.length > 6 ? '...' : ''}
                  </p>
                ) : (
                  <p style={{ fontSize: '11px', color: C.success, margin: '0 0 10px', fontWeight: 700 }}>All caught up!</p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {weeksToShow.map((wIdx) => {
                    const isPaid = myPayments.slots.some((s) => myPayments.payments[s]?.[wIdx]);
                    const weekDate = new Date(myPayments.weeks[wIdx]);
                    const isFuture = weekDate > new Date();
                    return (
                      <div key={wIdx} className="pay-cell" title={myPayments.weeks[wIdx]}
                        style={{
                          width: '30px', height: '30px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700,
                          background: isFuture ? C.creme : isPaid ? C.successBg : C.dangerBg,
                          color: isFuture ? C.muted : isPaid ? C.success : C.danger,
                          border: '1px solid ' + C.border,
                        }}>
                        W{wIdx}
                      </div>
                    );
                  })}
                </div>
                {weekKeysSorted.length > 8 && (
                  <button onClick={() => setShowAllWeeks(!showAllWeeks)}
                    style={{ background: 'none', border: 'none', color: C.bordeaux, fontSize: '11px', fontWeight: 700, cursor: 'pointer', marginTop: '8px', padding: 0 }}>
                    {showAllWeeks ? 'Show less' : 'Show all weeks'}
                  </button>
                )}
              </>
            )}
          </div>

          <p style={{ color: C.muted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Filter documents</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {CATEGORIES.map(c => (
              <span key={c} className="cat-pill" onClick={() => setFilterCat(c)}
                style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700,
                  background: filterCat === c ? C.bordeaux : 'transparent', color: filterCat === c ? 'white' : C.texteGris,
                  border: '1.5px solid ' + (filterCat === c ? C.bordeaux : 'transparent') }}>
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* CENTER - Documents (main) */}
        <div className="tarsyn-mem-center" style={{ padding: '20px', overflowY: 'auto' }}>

          {/* My Payment Grid (full table, read-only, this member's rows only) */}
          {myPayments && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h2 style={{ color: C.bordeaux, fontSize: '19px', fontWeight: 800, margin: 0 }}>My Payment Grid</h2>
                <span style={{ fontSize: '12px', color: C.texteGris, fontWeight: 600 }}>
                  {myPayments.paid}/{myPayments.total} weeks paid
                </span>
              </div>
              <div style={{ background: C.ivoire, borderRadius: '14px', border: '1px solid ' + C.border, overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: C.bordeaux, color: C.ivoire, padding: '12px 16px', textAlign: 'left', zIndex: 2, minWidth: 180 }}>
                        Member
                      </th>
                      {weekKeysSorted.map((wIdx) => (
                        <th key={wIdx} style={{ background: C.bordeaux, color: C.dore, padding: '10px 10px', fontSize: 11, minWidth: 64, textAlign: 'center' }}>
                          W{wIdx}
                          <div style={{ color: C.ivoire, fontWeight: 400, fontSize: 9.5 }}>{myPayments.weeks[wIdx]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myPayments.slots.map((slotNum, i) => (
                      <tr key={slotNum} style={{ borderBottom: '1px solid ' + C.border }}>
                        <td style={{ position: 'sticky', left: 0, background: C.ivoire, padding: '10px 16px', fontWeight: 600, color: C.texteFonce, fontSize: 13 }}>
                          {myPayments.memberName}{myPayments.slots.length > 1 ? ' (part ' + (i + 1) + ')' : ''}
                        </td>
                        {weekKeysSorted.map((wIdx) => {
                          const isPaid = myPayments.payments[slotNum]?.[wIdx] || false;
                          const isFuture = new Date(myPayments.weeks[wIdx]) > new Date();
                          return (
                            <td key={wIdx} style={{ textAlign: 'center', padding: 6 }}>
                              <div style={{
                                width: 26, height: 26, margin: '0 auto', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isPaid ? C.bordeaux : isFuture ? C.creme : C.dangerBg,
                                border: '1.5px solid ' + (isPaid ? C.bordeaux : C.border),
                              }}>
                                {isPaid && <span style={{ color: C.dore, fontSize: 13, fontWeight: 700 }}>✓</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '10.5px', color: C.muted, margin: '8px 0 0' }}>
                View only — your organizer marks payments as received.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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
            style={{ border: '2px dashed ' + (isDragging ? C.bordeaux : C.border), background: isDragging ? '#F3E9D6' : C.creme, borderRadius: '14px', padding: '20px', textAlign: 'center', cursor: 'pointer', marginBottom: '16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>+</div>
            <p style={{ color: C.bordeaux, fontWeight: 700, fontSize: '13px', margin: '0 0 3px' }}>Click to upload or drag and drop</p>
            <p style={{ color: C.texteGris, fontSize: '11.5px', margin: 0 }}>PDF, Word, Excel, Images</p>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelected} style={{ display: 'none' }} />
          </div>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by file name..."
            style={{ width: '100%', padding: '9px 14px', border: '1.5px solid ' + C.border, borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />

          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
              <p style={{ color: C.texteGris, fontSize: '14px' }}>No documents match your search.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredDocs.map((d: any) => {
                const icon = getFileIcon(d.type);
                return (
                  <div key={d.id}>
                    <div className="doc-row" style={{ background: C.creme, border: '1px solid ' + C.border, borderRadius: '14px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: icon.color, border: '1px solid ' + C.border, flexShrink: 0 }}>
                          {icon.label}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                            <p style={{ color: C.texteFonce, fontWeight: 700, margin: 0, fontSize: '13.5px' }}>{d.name}</p>
                            {isNew(d.createdAt) && (
                              <span style={{ fontSize: '9px', background: C.dore, color: 'white', padding: '2px 7px', borderRadius: '10px', fontWeight: 800 }}>NEW</span>
                            )}
                            <span style={{ fontSize: '9px', background: d.source === 'admin' ? '#E3F2FD' : '#F3E4DC', color: d.source === 'admin' ? '#1565C0' : C.bordeaux, padding: '2px 7px', borderRadius: '10px', fontWeight: 800 }}>
                              {d.source === 'admin' ? 'ADMIN' : 'YOU'}
                            </span>
                          </div>
                          <p style={{ color: C.texteGris, fontSize: '11.5px', margin: '3px 0 0' }}>
                            {formatSize(d.size)} - {d.category} - {formatDate(d.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <a href={d.url} target="_blank" rel="noreferrer" style={{ background: 'white', color: C.bordeaux, border: '1.5px solid ' + C.bordeaux, padding: '6px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, textDecoration: 'none' }}>Preview</a>
                        <a href={d.url} download={d.name} style={{ background: C.bordeaux, color: 'white', padding: '6px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, textDecoration: 'none' }}>Download</a>
                        <button onClick={() => handlePrint(d.url)} style={{ background: 'white', color: C.doreDark, border: '1.5px solid ' + C.dore, padding: '6px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>Print</button>
                        {d.uploadedBy === uid && (
                          <button onClick={() => handleDelete(d)} disabled={deletingId === d.id} style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '6px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                            {deletingId === d.id ? '...' : 'Delete'}
                          </button>
                        )}
                        {d.source === 'admin' && d.uploadedBy !== uid && (
                          <button onClick={() => handleDeleteAdminDoc(d)} disabled={deletingId === d.id} style={{ background: '#FFEBEE', color: '#C62828', border: 'none', padding: '6px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                            {deletingId === d.id ? '...' : 'Delete'}
                          </button>
                        )}
                        <button onClick={() => setExpandedDocId(expandedDocId === d.id ? null : d.id)}
                          style={{ background: expandedDocId === d.id ? C.bordeaux : 'white', color: expandedDocId === d.id ? 'white' : C.bordeaux, border: '1.5px solid ' + C.bordeaux, padding: '6px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}>
                          Comments
                        </button>
                      </div>
                    </div>
                    {expandedDocId === d.id && (
                      <div style={{ background: 'white', border: '1px solid ' + C.border, borderRadius: '0 0 14px 14px', padding: '18px', marginTop: '-4px' }}>
                        <DocumentComments documentId={d.id} currentUserName={activeMember?.fullName || ''} currentUserRole='member' />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(!effectiveBranding?.logo || effectiveBranding?.showTarsynBadge !== false) && (
            <div style={{ textAlign: 'center', padding: '18px 0 4px' }}>
              <span style={{ color: C.texteGris, fontSize: '11px', opacity: 0.7 }}>Powered by TARSYN</span>
            </div>
          )}
        </div>

        {/* RIGHT - Activity / Insights */}
        <div className="tarsyn-mem-right" style={{ borderLeft: `1px solid ${C.border}`, padding: '20px', overflowY: 'auto', background: C.creme }}>
          <p style={{ color: C.muted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Recent uploads</p>
          {recentUploads.length === 0 ? (
            <p style={{ color: C.muted, fontSize: '12px', marginBottom: '20px' }}>No documents yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {recentUploads.map((d: any) => (
                <div key={d.id} style={{ background: 'white', borderRadius: '10px', padding: '9px 12px' }}>
                  <p style={{ color: C.texteFonce, fontSize: '11.5px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                  <p style={{ color: C.muted, fontSize: '10.5px', margin: '2px 0 0' }}>{formatDate(d.createdAt)}</p>
                </div>
              ))}
            </div>
          )}

          <p style={{ color: C.muted, fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Activity log</p>
          {activity.length === 0 ? (
            <p style={{ color: C.muted, fontSize: '12px' }}>No recent activity.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activity.map((a: any) => (
                <div key={a.id} style={{ background: 'white', borderRadius: '10px', padding: '9px 12px' }}>
                  <p style={{ color: C.texteFonce, fontSize: '11px', fontWeight: 600, margin: 0 }}>{a.action}</p>
                  <p style={{ color: C.muted, fontSize: '10px', margin: '2px 0 0' }}>{formatDateTime(a.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showUploadModal && pendingFiles.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,16,32,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: C.bordeaux, fontSize: '17px', fontWeight: 800, margin: '0 0 6px' }}>
              Upload {pendingFiles.length > 1 ? pendingFiles.length + ' files' : 'Document'}
            </h3>
            {error && (
              <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: '10px', padding: '10px 14px', fontSize: '12.5px', marginBottom: '14px', lineHeight: 1.5 }}>{error}</div>
            )}
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
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
        <MemberContent />
      </Suspense>
    </TrialGuard>
  );
}