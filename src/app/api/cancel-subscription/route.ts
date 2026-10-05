import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    // The caller must be signed in, and can only act for their own account.
    const authedUid = await getAuthedUid(req);
    if (typeof authedUid !== 'string') return authedUid;
    if (userId !== authedUid) return forbidden('You can only do this for your own account.');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const subscriptionId = userDoc.data()?.subscription?.stripeSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    // Annulation à la fin de la période déjà payée (le client garde l'accès jusque-là).
    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd: (updated as any).current_period_end,
    });
  } catch (err) {
    console.error('Failed to cancel subscription:', err);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}