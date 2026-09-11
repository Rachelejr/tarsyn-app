'use client';

// UNIMUNITY - Payment Receipt
// Looks up a real payment by its receiptNumber (written by
// dashboard/record-contribution/page.tsx into the `payments` collection)
// and renders it as a receipt. Access is restricted to the organizer who
// recorded the payment or the member who made it - see the authorization
// check in loadReceipt() below.
//
// NOTE ON SCOPE: payments auto-synced from the admin Payment Grid
// (src/app/admin/payment-grid/[groupId]/page.tsx -> syncRegisterCycles)
// are written without a receiptNumber, so they intentionally do not have
// a receipt reachable through this route. Those grid-synced weeks instead
// get their own separate HTML "document" receipt (generateReceiptsForNewlyPaid,
// stored in the `documents` collection) - a different, already-working
// mechanism that this page does not touch or replace.

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';

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
  warning: '#B8860B',
  warningBg: '#FBF3DE',
  danger: '#B0525F',
  dangerBg: '#F5E4E6',
};

interface PaymentRecord {
  id: string;
  organizerId: string;
  memberId: string;
  memberName: string;
  memberTynId?: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  cycle: string;
  contributionType: string;
  receiptNumber: string;
  notes?: string;
  createdAt?: any;
}

function statusColors(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'confirmed') return { bg: C.successBg, fg: C.success };
  if (s === 'pending') return { bg: C.warningBg, fg: C.warning };
  if (s === 'late' || s === 'rejected') return { bg: C.dangerBg, fg: C.danger };
  return { bg: C.creme, fg: C.bordeaux }; // partial / other
}

export default function ReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const receiptNumber = String(params?.receiptNumber || '');

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOrganizerView, setIsOrganizerView] = useState(false);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/login');
        return;
      }
      setUid(u.uid);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (checkingAuth || !uid || !receiptNumber) return;

    let cancelled = false;

    (async () => {
      try {
        const q = query(
          collection(db, 'payments'),
          where('receiptNumber', '==', receiptNumber),
          limit(1)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }

        const docSnap = snap.docs[0];
        const data = { id: docSnap.id, ...docSnap.data() } as PaymentRecord;

        // Authorization: only the organizer who recorded this payment, or
        // the member it belongs to, may view it. Everyone else sees the
        // same "not found" state so the receipt's existence isn't leaked.
        const isOwner = data.organizerId === uid;
        let isPayingMember = false;
        let resolvedGroupName = '';

        if (data.memberId) {
          const memberSnap = await getDoc(doc(db, 'members', data.memberId));
          if (memberSnap.exists()) {
            const memberData: any = memberSnap.data();
            isPayingMember = memberData.userId === uid;
            if (memberData.groupId) {
              const groupSnap = await getDoc(doc(db, 'groups', memberData.groupId));
              if (groupSnap.exists()) {
                resolvedGroupName = (groupSnap.data() as any).name || '';
              }
            }
          }
        }

        if (!isOwner && !isPayingMember) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }

        if (!cancelled) {
          setPayment(data);
          setGroupName(resolvedGroupName || 'Group');
          setIsOrganizerView(isOwner);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) { setNotFound(true); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [checkingAuth, uid, receiptNumber]);

  const backHref = isOrganizerView ? '/dashboard' : '/member';
  const backLabel = isOrganizerView ? '← Back to Dashboard' : '← Back to My Portal';

  if (checkingAuth || loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.bordeaux, fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@media print { nav, .receipt-no-print { display: none !important; } }`}</style>
      <nav style={{ background: C.bordeaux, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          onClick={() => router.push(backHref)}
          style={{ color: C.dore, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
        >
          {backLabel}
        </div>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/unimunity-logo-white.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block' }} /></a>
      </nav>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '28px 20px' }}>
        {notFound || !payment ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
            <p style={{ color: C.texteFonce, fontWeight: 700, margin: '0 0 6px' }}>Receipt not found</p>
            <p style={{ color: C.texteGris, fontSize: '13px', margin: 0 }}>
              This receipt may not exist, or you may not have permission to view it.
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: 'white', borderRadius: '18px', padding: '28px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <h1 style={{ color: C.bordeaux, fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Payment Receipt</h1>
                  <p style={{ color: C.texteGris, fontSize: '12.5px', margin: 0 }}>{groupName}</p>
                </div>
                {(() => {
                  const sc = statusColors(payment.status);
                  return (
                    <span style={{ background: sc.bg, color: sc.fg, fontSize: '11.5px', fontWeight: 800, padding: '6px 12px', borderRadius: '20px', textTransform: 'capitalize' as const, whiteSpace: 'nowrap' as const }}>
                      {payment.status}
                    </span>
                  );
                })()}
              </div>

              <div style={{ background: C.creme, border: '1px solid ' + C.border, borderRadius: '12px', padding: '14px 16px', marginBottom: '18px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Receipt Number</p>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.bordeaux, fontFamily: 'monospace' }}>{payment.receiptNumber}</p>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Amount</p>
                <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: C.texteFonce }}>
                  {payment.amount?.toLocaleString()} <span style={{ fontSize: '15px', fontWeight: 700, color: C.texteGris }}>{payment.currency}</span>
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Member</p>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: C.texteFonce }}>{payment.memberName}</p>
                  {payment.memberTynId && <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: C.texteGris }}>{payment.memberTynId}</p>}
                </div>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Payment Date</p>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: C.texteFonce }}>{payment.paymentDate}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Payment Method</p>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: C.texteFonce }}>{payment.paymentMethod}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Cycle</p>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: C.texteFonce }}>{payment.cycle}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Type</p>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: C.texteFonce }}>{payment.contributionType}</p>
                </div>
                {payment.createdAt?.toDate && (
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Recorded</p>
                    <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: C.texteFonce }}>{payment.createdAt.toDate().toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {payment.notes && (
                <div style={{ marginBottom: '18px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.5px', color: C.texteGris, textTransform: 'uppercase' as const }}>Notes</p>
                  <p style={{ margin: 0, fontSize: '13px', color: C.texteFonce }}>{payment.notes}</p>
                </div>
              )}

              <div style={{ borderTop: '1px solid ' + C.border, paddingTop: '12px', marginTop: '6px' }}>
                <p style={{ margin: 0, fontSize: '10.5px', color: '#8A7B6C' }}>
                  Powered by UNIMUNITY™ — A product of Ma Production Luxenn Zara LLC
                </p>
              </div>
            </div>

            <button
              className="receipt-no-print"
              onClick={() => window.print()}
              style={{
                marginTop: '16px', width: '100%', padding: '11px', background: C.bordeaux, color: C.creme,
                border: 'none', borderRadius: '10px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Print / Save as PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
