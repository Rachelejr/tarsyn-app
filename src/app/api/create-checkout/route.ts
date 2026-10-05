import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { priceId, userId, email } = await req.json();
    // The caller must be signed in, and can only act for their own account.
    const authedUid = await getAuthedUid(req);
    if (typeof authedUid !== 'string') return authedUid;
    if (userId !== authedUid) return forbidden('You can only do this for your own account.');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { userId },
      },
      metadata: { userId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}