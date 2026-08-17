import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { uid, email } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    let accountId = userData?.stripeConnect?.accountId as string | undefined;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || userData?.email || undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { UNIMUNITYUserId: uid },
      });
      accountId = account.id;

      await userRef.set({
        stripeConnect: {
          accountId,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          createdAt: new Date().toISOString(),
        },
      }, { merge: true });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/payments-setup?refresh=true`,
      return_url: `${baseUrl}/dashboard/payments-setup?return=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('[stripe-connect/start] error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to start onboarding' }, { status: 500 });
  }
}
