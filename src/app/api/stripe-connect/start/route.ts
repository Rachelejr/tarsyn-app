import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getUidFromRequest, isUnreachableAccountError, clearStaleAccount } from '../_shared';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const uidOrError = await getUidFromRequest(req);
  if (typeof uidOrError !== 'string') return uidOrError;
  const uid = uidOrError;

  try {
    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    let accountId = userData?.stripeConnect?.accountId as string | undefined;

    // A saved account the current key can't reach is useless: drop it and
    // create a fresh one below.
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch (err: any) {
        if (!isUnreachableAccountError(err)) throw err;
        await clearStaleAccount(uid, accountId);
        accountId = undefined;
      }
    }

    if (!accountId) {
      const authUser = await adminAuth.getUser(uid);
      const account = await stripe.accounts.create({
        type: 'express',
        email: authUser.email || userData?.email || undefined,
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
    return NextResponse.json({ error: 'Could not start the bank connection. Please try again.' }, { status: 500 });
  }
}
