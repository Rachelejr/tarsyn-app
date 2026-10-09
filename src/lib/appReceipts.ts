// Receipts for payments made TO UNIMUNITY (the app itself), not to a group:
// the organizer's one-time access fee ($24.99), the member's one-time access
// fee ($9.99) and every paid plan invoice. Same receipt design as the group
// receipts, but issued by UNIMUNITY with the original UNIMUNITY logo (header
// and watermark). Stored in `documents` so the payer finds it in their space.
/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore data is untyped here. */
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { buildReceiptHtml } from '@/lib/receiptHtml';

export const UNIMUNITY_LOGO_URL = 'https://unimunity.com/unimunity-logo-color.png';

export async function createAppReceipt(opts: {
  docId: string;                 // fixed id: a Stripe retry never creates a duplicate
  receiptNo: string;
  payerUid: string;              // who sees the receipt
  organizerId: string;           // whose document list it is stored under
  groupId?: string;
  payerName: string;
  payerEmail?: string;
  description: string;           // e.g. "Organizer lifetime access"
  sub?: string;                  // e.g. "One-time payment"
  amountCents: number;
  currency: string;
  paidOn?: string;               // YYYY-MM-DD
}) {
  const ref = adminDb.collection('documents').doc(opts.docId);
  if ((await ref.get()).exists) return; // already issued
  const currency = (opts.currency || 'usd').toUpperCase();
  const issuedOn = opts.paidOn || new Date().toISOString().slice(0, 10);
  const html = buildReceiptHtml({
    groupName: 'UNIMUNITY',
    logoUrl: UNIMUNITY_LOGO_URL,
    watermark: true,
    receiptNo: opts.receiptNo,
    issuedOn,
    info: [
      ['Customer', opts.payerName],
      ...(opts.payerEmail ? [['Email', opts.payerEmail] as [string, string]] : []),
      ['Paid to', 'UNIMUNITY - Ma Production Luxenn Zara LLC'],
      ['Method', 'Card (via Stripe)'],
      ['Payment date', issuedOn],
    ],
    lines: [{ label: opts.description, sub: opts.sub, amount: Math.round(opts.amountCents) / 100 }],
    currency,
    status: 'Paid',
  });
  await ref.set({
    name: 'Receipt - ' + opts.description + ' - ' + issuedOn,
    type: 'text/html',
    size: html.length,
    url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html),
    storagePath: '',
    category: 'Receipts',
    organizerId: opts.organizerId,
    uploadedBy: 'system',
    source: 'unimunity',
    appReceipt: true,              // a receipt from the app, private to the payer
    visibleTo: [opts.payerUid],
    groupId: opts.groupId || '',
    receiptNumber: opts.receiptNo,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Name and email of a user, from their user doc. */
export async function userIdentity(uid: string): Promise<{ name: string; email: string }> {
  const d = (await adminDb.collection('users').doc(uid).get()).data() as any || {};
  return { name: String(d.name || d.fullName || d.email || 'Customer'), email: String(d.email || '') };
}
