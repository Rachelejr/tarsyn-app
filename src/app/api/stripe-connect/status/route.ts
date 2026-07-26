import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;
    const accountId = userData?.stripeConnect?.accountId as string | undefined;

    if (!accountId) {
      return NextResponse.json({ connected: false });
    }

    const account = await stripe.accounts.retrieve(accountId);

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
    return NextResponse.json({ error: err?.message || 'Failed to fetch status' }, { status: 500 });
  }
}
