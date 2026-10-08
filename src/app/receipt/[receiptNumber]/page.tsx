'use client';

// Payment receipt - issued under the GROUP's name only (no app branding).
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

import { useEffect, useRef, useState } from 'react';
import { buildReceiptHtml, receiptBranding, rebrandLegacyReceiptUrl } from '@/lib/receiptHtml';
import { getOrganizerPlanTier, getPlanLimits } from '@/lib/planLimits';
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
  const [groupLogo, setGroupLogo] = useState('');
  // The receipt shown here is the SAME one the member has in their space.
  const [receiptHtml, setReceiptHtml] = useState('');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameHeight, setFrameHeight] = useState(820);
  // Tab title (also printed in the page header by browsers): the group, not the app.
  useEffect(() => {
    if (groupName) document.title = groupName + ' - Payment Receipt';
  }, [groupName]);

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
        let resolvedLogo = '';
        let memberInfo: any = null;
        let groupInfo: any = null;

        if (data.memberId) {
          const memberSnap = await getDoc(doc(db, 'members', data.memberId));
          if (memberSnap.exists()) {
            const memberData: any = memberSnap.data();
            memberInfo = memberData;
            isPayingMember = memberData.userId === uid;
            if (memberData.groupId) {
              const groupSnap = await getDoc(doc(db, 'groups', memberData.groupId));
              if (groupSnap.exists()) {
                const g = groupSnap.data() as any;
                groupInfo = g;
                resolvedGroupName = g.name || '';
                const brand = g.groupBrand || {};
                if (brand.enabled !== false && typeof brand.logo === 'string' && /^https:\/\//.test(brand.logo)) resolvedLogo = brand.logo;
              }
            }
          }
        }

        if (!isOwner && !isPayingMember) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }

        // 1) The member's copy (Record Payment stores it as rcpt_<number>).
        let html = '';
        try {
          const copy = await getDoc(doc(db, 'documents', 'rcpt_' + receiptNumber));
          const url = copy.exists() ? String((copy.data() as any).url || '') : '';
          if (url.startsWith('data:text/html')) {
            const fixed = rebrandLegacyReceiptUrl(url, resolvedGroupName);
            html = decodeURIComponent(fixed.slice(fixed.indexOf(',') + 1));
          }
        } catch { /* fall back below */ }
        // 2) Older payments without a copy: build it the same way.
        if (!html) {
          let planWL = false;
          try { planWL = getPlanLimits(await getOrganizerPlanTier(db, data.organizerId || '')).whiteLabel; } catch { planWL = false; }
          const brand = receiptBranding(planWL, groupInfo?.groupBrand);
          const hands = Math.max(1, parseInt(String(memberInfo?.shares || 1), 10) || 1);
          const signer = String(groupInfo?.receiptSignature?.name || '').trim();
          html = buildReceiptHtml({
            groupName: resolvedGroupName || 'Group',
            logoUrl: brand.logoUrl,
            watermark: brand.watermark,
            receiptNo: data.receiptNumber,
            issuedOn: data.paymentDate,
            memberName: data.memberName || memberInfo?.fullName || '',
            memberCode: data.memberTynId || memberInfo?.tynId || '',
            info: [
              ['Payment date', data.paymentDate || ''],
              ['Method', data.paymentMethod || ''],
              ['Cycle', data.cycle || ''],
              ['Type', data.contributionType || ''],
              ...(hands > 1 ? [['Hands in this group', String(hands)] as [string, string]] : []),
              ...(data.notes ? [['Notes', data.notes] as [string, string]] : []),
            ],
            lines: [{
              label: (data.contributionType || 'Regular') + ' contribution' + (hands > 1 ? ' \u00b7 ' + hands + ' hands' : ''),
              sub: (data.cycle || '') + ' \u00b7 ' + (data.paymentMethod || ''),
              amount: Number(data.amount || 0),
            }],
            currency: data.currency || '',
            status: data.status === 'confirmed' ? 'Paid' : String(data.status || '').charAt(0).toUpperCase() + String(data.status || '').slice(1),
            signature: signer ? { name: signer, style: groupInfo?.receiptSignature?.style === 'initials' ? 'initials' : 'name' } : undefined,
          });
        }

        if (!cancelled) {
          setReceiptHtml(html);
          setPayment(data);
          setGroupName(resolvedGroupName || 'Group');
          setGroupLogo(resolvedLogo);
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
      <nav style={{ background: C.bordeaux, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div onClick={() => router.push(backHref)} style={{ color: C.dore, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
          {backLabel}
        </div>
        {payment && receiptHtml && (
          <button onClick={() => frameRef.current?.contentWindow?.print()}
            style={{ padding: '8px 16px', background: C.dore, color: C.bordeauxDark, border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
            Print / Save as PDF
          </button>
        )}
      </nav>

      {notFound || !payment ? (
        <div style={{ maxWidth: '560px', margin: '28px auto', padding: '0 20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 14px rgba(107,45,78,0.06)' }}>
            <p style={{ color: C.texteFonce, fontWeight: 700, margin: '0 0 6px' }}>Receipt not found</p>
            <p style={{ color: C.texteGris, fontSize: '13px', margin: 0 }}>
              This receipt may not exist, or you may not have permission to view it.
            </p>
          </div>
        </div>
      ) : (
        // Same receipt as in the member's Documents (same design and content).
        <iframe
          ref={frameRef}
          title={groupName + ' receipt ' + (payment.receiptNumber || '')}
          srcDoc={receiptHtml}
          onLoad={() => {
            const h = frameRef.current?.contentDocument?.documentElement?.scrollHeight;
            if (h) setFrameHeight(h + 10);
          }}
          style={{ display: 'block', width: '100%', height: frameHeight, border: 'none', background: C.creme }}
        />
      )}
    </div>
  );
}
