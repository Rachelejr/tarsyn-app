import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe's standard US card rate: 2.9% + $0.30. We add a surcharge on top of
// the contribution amount so that after Stripe takes its cut, the organizer
// still receives the FULL contribution amount - the member absorbs the fee,
// never the organizer.
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

export async function POST(req: NextRequest) {
  try {
    const { memberId, groupId, weekIndexes } = await req.json();
    if (!memberId || !groupId || !Array.isArray(weekIndexes) || weekIndexes.length === 0) {
      return NextResponse.json({ error: 'Missing memberId, groupId, or weekIndexes' }, { status: 400 });
    }

    const memberSnap = await adminDb.collection('members').doc(memberId).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const member = memberSnap.data() as any;
    if (member.groupId !== groupId) {
      return NextResponse.json({ error: 'Member does not belong to this group' }, { status: 400 });
    }
    if (!member.userId) {
      return NextResponse.json({ error: 'This member record is not linked to a user account yet. Contact your organizer.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Your organizer has not finished setting up payments yet. Please contact them or pay another way for now.' }, { status: 400 });
    }

    const shares = Math.max(1, parseInt(member.shares) || 1);
    const perWeekAmount = (member.expectedAmount || 0) * shares;
    const currency = (member.currency || 'USD').toLowerCase();

    const contributionAmount = Math.round(perWeekAmount * weekIndexes.length * 100) / 100;
    const contributionCents = Math.round(contributionAmount * 100);

    if (contributionCents <= 0) {
      return NextResponse.json({ error: 'Nothing to pay - amount is zero.' }, { status: 400 });
    }

    // Surcharge formula: total = (contribution + fixedFee) / (1 - percentFee)
    // This guarantees that once Stripe takes its cut from the total charge,
    // exactly `contributionCents` is left to transfer to the organizer.
    const totalChargeCents = Math.ceil((contributionCents + STRIPE_FIXED_CENTS) / (1 - STRIPE_PERCENT));
    const convenienceFeeCents = totalChargeCents - contributionCents;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalChargeCents,
      currency,
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: connectAccountId,
        amount: contributionCents,
      },
      metadata: {
        memberId,
        groupId,
        weekIndexes: weekIndexes.join(','),
        userId: member.userId,
        organizerId,
        contributionCents: String(contributionCents),
        currency,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      contribution: contributionCents / 100,
      convenienceFee: convenienceFeeCents / 100,
      totalCharge: totalChargeCents / 100,
      currency: currency.toUpperCase(),
    });
  } catch (err: any) {
    console.error('[create-payment-intent] error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create payment' }, { status: 500 });
  }
}
