import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Same surcharge logic as Tontine's /api/create-payment-intent: the member
// pays the card processing fee on top, so the church always receives the
// FULL amount they intended to give - never a partial amount after Stripe's
// cut. This route is deliberately separate from the Tontine one (different
// source collection - churchMembers, not members - and no weekIndexes/shares
// concept, just a free-text giving amount + type).
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

const VALID_TYPES = ['tithe', 'offering', 'donation', 'seed'];

export async function POST(req: NextRequest) {
  try {
    const { memberId, churchId, givingType, amount } = await req.json();

    if (!memberId || !churchId || !givingType || !amount) {
      return NextResponse.json({ error: 'Missing memberId, churchId, givingType, or amount' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(givingType)) {
      return NextResponse.json({ error: 'Invalid giving type' }, { status: 400 });
    }
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const memberSnap = await adminDb.collection('churchMembers').doc(memberId).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = memberSnap.data() as any;
    if (member.churchId !== churchId) {
      return NextResponse.json({ error: 'Member does not belong to this church' }, { status: 400 });
    }
    if (!member.userId) {
      return NextResponse.json({ error: 'This member record is not linked to a user account yet. Contact your church administrator.' }, { status: 400 });
    }

    const organizerId = member.organizerId;
    if (!organizerId) {
      return NextResponse.json({ error: 'This member record has no organizer set.' }, { status: 400 });
    }

    const organizerSnap = await adminDb.collection('users').doc(organizerId).get();
    const organizerData = organizerSnap.exists ? organizerSnap.data() : null;
    const connectAccountId = organizerData?.stripeConnect?.accountId as string | undefined;
    const chargesEnabled = !!organizerData?.stripeConnect?.chargesEnabled;

    if (!connectAccountId || !chargesEnabled) {
      return NextResponse.json({ error: 'Your church has not finished setting up payments yet. Please contact your administrator or give another way for now.' }, { status: 400 });
    }

    const currency = 'usd';
    const givingCents = Math.round(amountNum * 100);

    // Surcharge formula: total = (giving + fixedFee) / (1 - percentFee)
    // This guarantees that once Stripe takes its cut from the total charge,
    // exactly `givingCents` is left to transfer to the church's organizer.
    const totalChargeCents = Math.ceil((givingCents + STRIPE_FIXED_CENTS) / (1 - STRIPE_PERCENT));
    const convenienceFeeCents = totalChargeCents - givingCents;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalChargeCents,
      currency,
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: connectAccountId,
        amount: givingCents,
      },
      metadata: {
        memberId,
        churchId,
        givingType,
        userId: member.userId,
        organizerId,
        givingCents: String(givingCents),
        currency,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      giving: givingCents / 100,
      convenienceFee: convenienceFeeCents / 100,
      totalCharge: totalChargeCents / 100,
      currency: currency.toUpperCase(),
    });
  } catch (err: any) {
    console.error('[create-giving-payment-intent] error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create payment' }, { status: 500 });
  }
}
