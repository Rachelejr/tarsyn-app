import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { updateDoc, doc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  const userId = (event.data.object as any)?.metadata?.userId;

  if (userId) {
    const userRef = doc(db, 'users', userId);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const sub = event.data.object as Stripe.Subscription;
        await updateDoc(userRef, {
          subscription: {
            status: sub.status,
            plan: sub.items.data[0]?.price.id,
            currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          }
        });
        break;
      case 'customer.subscription.deleted':
        await updateDoc(userRef, {
          subscription: { status: 'canceled', plan: null }
        });
        break;
    }
  }

  return NextResponse.json({ received: true });
}