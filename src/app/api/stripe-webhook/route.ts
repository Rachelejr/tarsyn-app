import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

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
    const userRef = adminDb.collection('users').doc(userId);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const item = sub.items.data[0];
          const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end;

          await userRef.update({
            subscription: {
              status: sub.status,
              plan: item?.price.id ?? null,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
              trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            }
          });
          break;
        }
        case 'customer.subscription.deleted':
          await userRef.update({
            subscription: { status: 'canceled', plan: null }
          });
          break;
      }
    } catch (err) {
      console.error('Firestore update failed in webhook:', err);
      return NextResponse.json({ error: 'Firestore update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}