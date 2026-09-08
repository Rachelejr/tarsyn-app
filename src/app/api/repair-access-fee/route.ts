import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// One-time (safe to re-run) repair for the lifetime access-fee flow.
//
// Between the domain move to unimunity.com and this fix, the Stripe
// webhook endpoint was still registered against the old tarsyn-app.com
// URL, which now only issues a redirect - Stripe never follows a redirect
// to deliver a webhook, so payment_intent.succeeded events never reached
// /api/stripe-webhook. Anyone who paid the one-time access fee during
// that window has a real, successful Stripe charge but never got
// orgAccessFeePaid / accessFeePaid stamped on their record, so the app
// keeps asking them to pay again every time they log back in.
//
// This re-verifies the PaymentIntent directly with Stripe (status must be
// "succeeded" and its metadata must match the type + uid/memberId passed
// in) before writing anything, then applies the exact same Firestore
// update the webhook itself would have made. Visiting this URL again for
// an already-repaired account is harmless - it just confirms and exits.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!uid || !paymentIntentId) {
      return NextResponse.json({ error: 'Missing uid or paymentIntentId query parameter' }, { status: 400 });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: `PaymentIntent status is "${pi.status}", not "succeeded" - nothing to repair.` }, { status: 400 });
    }

    const meta = pi.metadata || {};

    if (meta.type === 'orgAccessFee') {
      if (meta.userId !== uid) {
        return NextResponse.json({ error: 'This payment does not belong to the given uid.' }, { status: 400 });
      }
      const userRef = adminDb.collection('users').doc(uid);
      const before = (await userRef.get()).data() || {};
      await userRef.update({ orgAccessFeePaid: true, orgAccessFeePaidAt: new Date() });
      return NextResponse.json({
        success: true,
        repaired: 'organizer access fee',
        uid,
        paymentIntentId,
        amount: pi.amount,
        wasAlreadyPaid: before.orgAccessFeePaid === true,
      });
    }

    if (meta.type === 'memberAccessFee') {
      const memberId = meta.memberId;
      if (!memberId) {
        return NextResponse.json({ error: 'This payment has no memberId in its metadata.' }, { status: 400 });
      }
      const memberRef = adminDb.collection('members').doc(memberId);
      const memberSnap = await memberRef.get();
      if (!memberSnap.exists) {
        return NextResponse.json({ error: `No member found with id ${memberId}.` }, { status: 404 });
      }
      const memberData = memberSnap.data() as any;
      if (memberData.userId !== uid) {
        return NextResponse.json({ error: 'This payment does not belong to the given uid.' }, { status: 400 });
      }
      const wasAlreadyPaid = memberData.accessFeePaid === true;
      await memberRef.update({ accessFeePaid: true, accessFeePaidAt: new Date() });

      // Lifetime fee - propagate to every other group this same person
      // belongs to as well, exactly like the webhook does.
      const siblingsSnap = await adminDb.collection('members').where('userId', '==', uid).get();
      const batch = adminDb.batch();
      siblingsSnap.docs.forEach((d) => {
        if (d.id !== memberId) {
          batch.update(d.ref, { accessFeePaid: true, accessFeePaidAt: new Date() });
        }
      });
      await batch.commit();

      return NextResponse.json({
        success: true,
        repaired: 'member access fee',
        uid,
        memberId,
        paymentIntentId,
        amount: pi.amount,
        wasAlreadyPaid,
        siblingGroupsAlsoUpdated: siblingsSnap.size - 1 >= 0 ? Math.max(0, siblingsSnap.size - 1) : 0,
      });
    }

    return NextResponse.json({ error: `This PaymentIntent's metadata.type ("${meta.type}") is not an access fee payment.` }, { status: 400 });
  } catch (e: any) {
    console.error('repair-access-fee error:', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
