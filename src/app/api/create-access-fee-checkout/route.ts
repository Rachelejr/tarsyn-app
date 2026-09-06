import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// One-time LIFETIME platform access fee - separate from the recurring
// organizer subscription plans on /dashboard/subscription. Charged once
// ever: $25 for a brand new organizer account, $15 for a member the first
// time they ever join a group. Both use Stripe Checkout in one-time
// 'payment' mode (not 'subscription') and go straight to the main
// UNIMUNITY Stripe account (Ma Production Luxenn Zara LLC) - same account
// as the subscription plans, never an organizer's connected account.
const PRICE_IDS: Record<'organizer' | 'member', string> = {
  organizer: 'price_1UCXfAJBtj4UALaPaOy9jJvt', // UNIMUNITY Organizer Access Fee (One-Time) - $25
  member: 'price_1UCXfGJBtj4UALaPPsingZ88', // UNIMUNITY Member Access Fee (One-Time) - $15
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

    const successUrl = role === 'organizer'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/access-fee?success=true`
      : `${process.env.NEXT_PUBLIC_APP_URL}/member?accessFeeSuccess=true`;
    const cancelUrl = role === 'organizer'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/access-fee?canceled=true`
      : `${process.env.NEXT_PUBLIC_APP_URL}/member?accessFeeCanceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{ price: PRICE_IDS[role as 'organizer' | 'member'], quantity: 1 }],
      payment_intent_data: { metadata },
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('create-access-fee-checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
