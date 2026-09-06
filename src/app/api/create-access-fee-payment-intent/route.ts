import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// One-time LIFETIME platform access fee - separate from the recurring
// organizer subscription plans on /dashboard/subscription, and separate
// from members' weekly contribution payments. Charged once ever: $25 for
// a brand new organizer account, $15 for a member the first time they
// ever join a group.
//
// This creates a plain PaymentIntent (no transfer_data), so the money
// stays entirely on the main UNIMUNITY Stripe account (Ma Production
// Luxenn Zara LLC) - never an organizer's connected account. It is
// confirmed with an embedded Stripe Payment Element mounted directly on
// our own pages (never a redirect to a Stripe-hosted checkout page), so
// no Stripe branding or stripe.com URL is ever shown to the user.
const AMOUNTS_CENTS: Record<'organizer' | 'member', number> = {
  organizer: 2500,
  member: 1500,
};

export async function POST(req: NextRequest) {
  try {
    const { role, uid, email, memberId } = await req.json();

    if (role !== 'organizer' && role !== 'member') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }
    if (role === 'member' && !memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const metadata: Record<string, string> = {
      type: role === 'organizer' ? 'orgAccessFee' : 'memberAccessFee',
      userId: uid,
    };
    if (memberId) metadata.memberId = memberId;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: AMOUNTS_CENTS[role as 'organizer' | 'member'],
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      receipt_email: email || undefined,
      metadata,
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('create-access-fee-payment-intent error:', err);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
