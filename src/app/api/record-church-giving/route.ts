import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Called by the member portal right after Stripe confirms the payment
// client-side. This route independently re-checks the PaymentIntent's
// status with Stripe (never trusts the browser's own "it worked" claim)
// before writing anything to Firestore - important since this creates a
// real financial record (a tithe/offering/donation/seed gift).
export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment has not succeeded yet.', status: paymentIntent.status }, { status: 400 });
    }

    const meta = paymentIntent.metadata || {};
    const churchId = meta.churchId;
    const memberId = meta.memberId;
    const givingType = meta.givingType;
    const userId = meta.userId;
    const organizerId = meta.organizerId;
    const givingCents = Number(meta.givingCents) || 0;
    const currency = meta.currency || 'usd';

    if (!churchId || !memberId || !givingType) {
      return NextResponse.json({ error: 'Payment metadata is incomplete.' }, { status: 400 });
    }

    // Avoid recording the same successful payment twice if this route is
    // ever called more than once for the same PaymentIntent.
    const existing = await adminDb
      .collection('churches').doc(churchId)
      .collection('giving')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0].data();
      return NextResponse.json({
        recorded: true,
        alreadyRecorded: true,
        amount: doc.amount,
        currency: doc.currency,
        type: doc.type,
      });
    }

    await adminDb.collection('churches').doc(churchId).collection('giving').add({
      memberId,
      userId,
      organizerId: organizerId || null,
      churchId,
      type: givingType,
      amount: givingCents / 100,
      currency: currency.toUpperCase(),
      paymentIntentId,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      recorded: true,
      amount: givingCents / 100,
      currency: currency.toUpperCase(),
      type: givingType,
    });
  } catch (err: any) {
    console.error('[record-church-giving] error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to record giving' }, { status: 500 });
  }
}
