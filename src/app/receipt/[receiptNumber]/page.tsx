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
  success: '#3F7D5C',
  successBg: '#E4F0E9',
  danger: '#B0525F',
  dangerBg: '#F5E4E6',
};

interface MemberView {
  memberName: string;
  slots: string[];
  weeks: Record<string, string>;
  payments: Record<string, Record<string, boolean>>;
}

function MyPaymentGridContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetGroupId = searchParams.get('groupId');

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [memberships, setMemberships] = useState<any[]>([]);
  const [view, setView] = useState<MemberView | null>(null);

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
        setGroupName(groupSnap.exists() ? groupSnap.data().name || 'Group' : 'Group');

        const gridId = target.groupId + '_current';
        const viewSnap = await getDoc(doc(db, 'paymentGrids', gridId, 'memberViews', target.id));
        if (viewSnap.exists()) {
          setView(viewSnap.data() as MemberView);
        } else {
          setNotFound(true);
        }
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

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: C.bordeaux, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          onClick={() => router.push('/member' + (targetGroupId ? '?groupId=' + targetGroupId : ''))}
          style={{ color: C.dore, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
        >
          ← Back to My Portal
        </div>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/tarsyn-logo-white.svg" alt="TARSYN" style={{ height: '48px', width: 'auto', display: 'block' }} /></a>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px' }}>
        <h1 style={{ color: C.bordeaux, fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>
          My Payment Grid — {groupName}
        </h1>
        <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 20px' }}>
          Your weekly contribution status, kept up to date by your organizer.
        </p>

        {memberships.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {memberships.map((m) => (
              <button
                key={m.id}
                onClick={() => router.push('/member/payment-grid?groupId=' + m.groupId)}
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

        {notFound || !view ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
            <p style={{ color: C.texteGris, fontSize: '14px', margin: 0 }}>
              Your organizer hasn&apos;t published a payment grid for you yet. Check back after
              they save the first round of weekly contributions.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {(() => {
                const weekEntries = Object.entries(view.weeks || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
                const totalWeeks = weekEntries.length;
                let paidWeeks = 0;
                view.slots.forEach((slotNum) => {
                  weekEntries.forEach(([wIdx]) => {
                    if (view.payments[slotNum]?.[wIdx]) paidWeeks++;
                  });
                });
                const totalCells = totalWeeks * view.slots.length;
                const completion = totalCells > 0 ? Math.round((paidWeeks / totalCells) * 100) : 0;
                return (
                  <>
                    <div style={{ background: C.ivoire, border: '1px solid ' + C.border, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, color: C.texteGris }}>
                      Parts: <strong style={{ color: C.bordeaux }}>{view.slots.length}</strong>
                    </div>
                    <div style={{ background: C.ivoire, border: '1px solid ' + C.border, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, color: C.texteGris }}>
                      Weeks paid: <strong style={{ color: C.bordeaux }}>{paidWeeks} / {totalCells}</strong>
                    </div>
                    <div style={{ background: C.ivoire, border: '1px solid ' + C.border, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, color: C.texteGris }}>
                      Completion: <strong style={{ color: C.bordeaux }}>{completion}%</strong>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ background: C.ivoire, borderRadius: 14, border: '1px solid ' + C.border, overflow: 'auto', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: C.bordeaux, color: C.ivoire, padding: '10px 14px', textAlign: 'left', minWidth: 140 }}>
                      Part
                    </th>
                    {Object.entries(view.weeks || {})
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([idx, date]) => (
                        <th key={idx} style={{ background: C.bordeaux, color: C.dore, padding: '8px 10px', fontSize: 11, minWidth: 78, textAlign: 'center' }}>
                          W{idx}
                          <div style={{ color: C.ivoire, fontWeight: 400, fontSize: 9.5 }}>{date}</div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {view.slots.map((slotNum, i) => (
                    <tr key={slotNum} style={{ borderBottom: '1px solid ' + C.border }}>
                      <td style={{ position: 'sticky', left: 0, background: C.ivoire, padding: '10px 14px', fontWeight: 700, color: C.texteFonce, fontSize: 13 }}>
                        {view.slots.length > 1 ? `Part ${i + 1}` : view.memberName}
                      </td>
                      {Object.entries(view.weeks || {})
                        .sort((a, b) => Number(a[0]) - Number(b[0]))
                        .map(([weekIdx]) => {
                          const isPaid = view.payments[slotNum]?.[weekIdx] || false;
                          return (
                            <td key={weekIdx} style={{ textAlign: 'center', padding: 8 }}>
                              <div
                                style={{
                                  width: 26,
                                  height: 26,
                                  margin: '0 auto',
                                  borderRadius: 7,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: isPaid ? C.success : 'white',
                                  border: '1.5px solid ' + (isPaid ? C.success : C.border),
                                }}
                              >
                                {isPaid && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>}
                              </div>
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MyPaymentGridPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FBEEDD' }} />}>
      <MyPaymentGridContent />
    </Suspense>
  );
}