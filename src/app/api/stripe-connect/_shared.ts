import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Resolves the signed-in organizer from the Firebase ID token sent by the
// page. The uid is never taken from the URL or body, so nobody can read or
// change another organizer's payment setup.
export async function getUidFromRequest(req: NextRequest): Promise<string | NextResponse> {
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  try {
    const { uid } = await adminAuth.verifyIdToken(idToken);
    return uid;
  } catch {
    return NextResponse.json({ error: 'Invalid session. Please sign in again.' }, { status: 401 });
  }
}

// True when Stripe says the saved connected account can't be reached with
// the current secret key (created under other keys, other mode, or deleted).
export function isUnreachableAccountError(err: any): boolean {
  const msg = String(err?.message || '');
  return err?.type === 'StripePermissionError'
    || err?.code === 'account_invalid'
    || err?.code === 'resource_missing'
    || /does not have access to account|No such account|account does not exist/i.test(msg);
}

// Forgets a connected account that can no longer be reached, keeping a
// trace of the old id so it can still be looked up in Stripe if needed.
export async function clearStaleAccount(uid: string, accountId: string) {
  await adminDb.collection('users').doc(uid).set({
    stripeConnect: FieldValue.delete(),
    stripeConnectPrevious: { accountId, clearedAt: new Date().toISOString(), reason: 'unreachable with current Stripe key' },
  }, { merge: true });
}
