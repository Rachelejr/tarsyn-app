import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';
import { computeDues, contributionPerPeriod } from '@/lib/dues';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe's standard US card rate: 2.9% + $0.30. We add a surcharge on top of
// the contribution amount so that after Stripe takes its cut, the organizer
// still receives the FULL contribution amount - the member absorbs the fee,
// never the organizer.
const STRIPE_PERCENT = 0.029;
const STRIPE_FIXED_CENTS = 30;

export async function POST(req: NextRequest) {
  try {
    // The weeks and the amount are decided HERE from the payment grid, never
    // by the browser: the member pays exactly what is due in the current cycle.
    const { memberId, groupId } = await req.json();
    if (!memberId || !groupId) {
      return NextResponse.json({ error: 'Missing memberId or groupId' }, { status: 400 });
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
    // Only the member who owns this record can pay for it.
    const authedUid = await getAuthedUid(req);
    if (typeof authedUid !== 'string') return authedUid;
    if (member.userId !== authedUid) return forbidden('You can only pay for your own membership.');

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

    const [groupSnap, gridSnap] = await Promise.all([
      adminDb.collection('groups').doc(groupId).get(),
      adminDb.collection('paymentGrids').doc(groupId + '_current').get(),
    ]);
    if (!gridSnap.exists) {
      return NextResponse.json({ error: 'This group has no payment grid yet.' }, { status: 400 });
    }
    const group = groupSnap.exists ? (groupSnap.data() as any) : {};
    const grid = gridSnap.data() as any;
    const slotNums = Object.entries(grid.slots || {})
      .filter(([, sl]: [string, any]) => sl?.memberId === memberId)
      .map(([n]) => n);
    const dues = computeDues({
      weeks: grid.weeks || {},
      payments: grid.payments || {},
      slotNums,
      frequency: group.frequency || group.paymentFrequency,
      cycleStart: grid.startDate,
      cycleEnd: grid.cycleEndDate,
      memberSince: member.createdAt,
      amountPerPeriod: contributionPerPeriod(member, group),
    });
    // One week index per unpaid period (its due week); the webhook ticks it for
    // the member's slots, which marks the whole period as paid.
    const weekIndexes = Array.from(new Set(dues.unpaid.map(u => u.period.weekIdxs[0])));
    const currency = String(member.currency || group.currency || 'USD').toLowerCase();

    const contributionAmount = dues.amountOwed;
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
