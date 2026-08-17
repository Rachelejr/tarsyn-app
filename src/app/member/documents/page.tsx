'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  dore: '#E9C77B',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  texteGris: '#6B2D4E',
  texteFonce: '#4A1F38',
  border: '#EAD9BE',
};

const CATEGORIES = ['General', 'Rules', 'Contracts', 'Reports', 'Other'];

function getFileIcon(type: string) {
  if (type?.includes('pdf')) return { label: 'PDF', color: '#C62828' };
  if (type?.includes('image')) return { label: 'IMG', color: '#2E7D32' };
  if (type?.includes('word') || type?.includes('document')) return { label: 'DOC', color: '#1565C0' };
  if (type?.includes('sheet') || type?.includes('excel')) return { label: 'XLS', color: '#2E7D32' };
  return { label: 'FILE', color: C.texteGris };
}

function formatSize(bytes: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(ts: any) {
  if (!ts?.seconds) return '-';
  return new Date(ts.seconds * 1000).toLocaleDateString();
}

function MemberDocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetGroupId = searchParams.get('groupId');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberships, setMemberships] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const memberQ = query(collection(db, 'members'), where('userId', '==', u.uid));
        const memberSnap = await getDocs(memberQ);
        if (memberSnap.empty) { setNotFound(true); setLoading(false); return; }

        const memberships = memberSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        setMemberships(memberships);

        let target = memberships[0];
        if (targetGroupId) {
          const found = memberships.find((m) => m.groupId === targetGroupId);
          if (found) target = found;
        }

        const groupSnap = await getDoc(doc(db, 'groups', target.groupId));
        if (!groupSnap.exists()) { setNotFound(true); setLoading(false); return; }
        const groupData = groupSnap.data() as any;
        setGroupName(groupData.name || 'Group');

        // Documents are stored per-organizer (same as the admin-side Documents
        // page), so members see every document their organizer has shared -
        // not filtered by groupId, since documents don't carry that field today.
        const docsQ = query(collection(db, 'documents'), where('organizerId', '==', groupData.organizerId));
        const docsSnap = await getDocs(docsQ);
        const list = docsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setDocs(list);
      } catch (e) {
        console.error(e);
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router, targetGroupId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.bordeaux, fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  const filteredDocs = docs.filter((d) => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'All' || d.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: C.bordeaux, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          onClick={() => router.push('/member' + (targetGroupId ? '?groupId=' + targetGroupId : ''))}
          style={{ color: C.dore, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
        >
          ← Back to My Portal
        </div>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <img src="/UNIMUNITY-logo-white.svg" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block' }} />
        </a>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px' }}>
        <h1 style={{ color: C.bordeaux, fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>
          Documents — {groupName}
        </h1>
        <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 20px' }}>
          Files your organizer has shared with the group.
        </p>

        {memberships.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {memberships.map((m) => (
              <button
                key={m.id}
                onClick={() => router.push('/member/documents?groupId=' + m.groupId)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1.5px solid ' + C.border,
                  background: m.groupId === targetGroupId ? C.bordeaux : C.ivoire,
                  color: m.groupId === targetGroupId ? C.creme : C.bordeaux,
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {m.groupId}
              </button>
            ))}
          </div>
        )}

        {notFound ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
            <p style={{ color: C.texteGris, fontSize: '14px', margin: 0 }}>
              We couldn&apos;t find your group. Contact your organizer if this seems wrong.
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid ' + C.border, padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files..."
                style={{ flex: 1, minWidth: 160, padding: '8px 12px', borderRadius: '8px', border: '1px solid ' + C.border, fontSize: '13px', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['All', ...CATEGORIES].map((c) => (
                  <span
                    key={c}
                    onClick={() => setFilterCat(c)}
                    style={{
                      padding: '5px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      background: filterCat === c ? C.bordeaux : C.ivoire,
                      color: filterCat === c ? 'white' : C.texteGris,
                      border: '1px solid ' + (filterCat === c ? C.bordeaux : C.border),
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {filteredDocs.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
                <p style={{ color: C.texteGris, fontSize: '14px', margin: 0 }}>
                  {docs.length === 0
                    ? "Your organizer hasn't shared any documents yet."
                    : 'No documents match your search.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredDocs.map((d) => {
                  const icon = getFileIcon(d.type);
                  return (
                    <div
                      key={d.id}
                      style={{
                        background: 'white', borderRadius: '12px', border: '1px solid ' + C.border,
                        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px',
                      }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: C.ivoire, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: icon.color, flexShrink: 0 }}>
                        {icon.label}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: C.texteFonce, fontWeight: 700, fontSize: '13.5px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                        <p style={{ color: C.texteGris, fontSize: '11.5px', margin: '2px 0 0' }}>{formatSize(d.size)} · {d.category} · {formatDate(d.createdAt)}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <a href={d.url} target="_blank" rel="noreferrer"
                          style={{ background: C.ivoire, color: C.bordeauxDark, border: '1.5px solid ' + C.bordeaux, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                          Preview
                        </a>
                        <a href={d.url} download
                          style={{ background: C.bordeaux, color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                          Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MemberDocumentsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FBEEDD' }} />}>
      <MemberDocumentsContent />
    </Suspense>
  );
}
