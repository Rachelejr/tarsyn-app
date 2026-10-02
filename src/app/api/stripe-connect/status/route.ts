import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { getUidFromRequest, isUnreachableAccountError, clearStaleAccount } from '../_shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const uidOrError = await getUidFromRequest(req);
  if (typeof uidOrError !== 'string') return uidOrError;
  const uid = uidOrError;

  try {
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const accountId = userData?.stripeConnect?.accountId as string | undefined;

    if (!accountId) {
      return NextResponse.json({ connected: false });
    }

    let account: Stripe.Account;
    try {
      account = await stripe.accounts.retrieve(accountId);
    } catch (err: any) {
      if (isUnreachableAccountError(err)) {
        // The saved account belongs to other Stripe keys or was deleted:
        // forget it so the organizer can simply connect again.
        await clearStaleAccount(uid, accountId);
        return NextResponse.json({ connected: false, reset: true });
      }
      throw err;
    }

    const status = {
      connected: true,
      accountId,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
      detailsSubmitted: !!account.details_submitted,
    };

    await userRef.set({
      stripeConnect: {
        accountId,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        detailsSubmitted: status.detailsSubmitted,
        lastCheckedAt: new Date().toISOString(),
      },
    }, { merge: true });

    return NextResponse.json(status);
  } catch (err: any) {
    console.error('[stripe-connect/status] error:', err);
    return NextResponse.json({ error: 'Could not check your payment setup status. Please try again.' }, { status: 500 });
  }
}
