import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_NOTIFICATION_EMAIL = 'sales@tarsyn-app.com';
const SUPPORT_LOG_EMAIL = 'support@tarsyn-app.com';

const PRICE_ID_TO_PLAN_NAME: Record<string, string> = {
  'price_1TkzC7JBtj4UALaPm0ZOEB1T': 'Starter (monthly)',
  'price_1TkzC7JBtj4UALaPhySF1Nb1': 'Starter (annual)',
  'price_1TkzC9JBtj4UALaPZZIBDCV3': 'Growth (monthly)',
  'price_1TkzC8JBtj4UALaPtELbrfO9': 'Growth (annual)',
  'price_1TkzC3JBtj4UALaPFseCERie': 'Pro (monthly)',
  'price_1TkzC2JBtj4UALaPBvORrRyy': 'Pro (annual)',
};

async function sendSubscriptionCreatedNotification(params: {
  userId: string;
  customerEmail: string | null;
  customerName: string | null;
  priceId: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
}) {
  const { userId, customerEmail, customerName, priceId, amount, currency, status } = params;
  const planLabel = priceId ? (PRICE_ID_TO_PLAN_NAME[priceId] || priceId) : 'Unknown plan';
  const amountLabel = amount !== null && currency
    ? `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
    : 'N/A';
  const timestamp = new Date().toISOString();

  const subject = `New TARSYN Subscription — ${planLabel}`;
  const htmlBody = `
    <h2>New subscription created</h2>
    <p><strong>Customer:</strong> ${customerName || 'N/A'} (${customerEmail || 'N/A'})</p>
    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>Plan:</strong> ${planLabel}</p>
    <p><strong>Amount:</strong> ${amountLabel}</p>
    <p><strong>Status:</strong> ${status}</p>
    <p><strong>Timestamp:</strong> ${timestamp}</p>
  `;

  try {
    await resend.emails.send({
      from: 'noreply@tarsyn-app.com',
      to: ADMIN_NOTIFICATION_EMAIL,
      subject,
      html: htmlBody,
    });
    console.log(`[webhook] Admin notification email sent successfully to ${ADMIN_NOTIFICATION_EMAIL} for user ${userId}`);
  } catch (err) {
    console.error(`[webhook] Failed to send admin notification email to ${ADMIN_NOTIFICATION_EMAIL} for user ${userId}:`, err);
  }

  try {
    await resend.emails.send({
      from: 'noreply@tarsyn-app.com',
      to: SUPPORT_LOG_EMAIL,
      subject: `[Log] ${subject}`,
      html: htmlBody,
    });
    console.log(`[webhook] Support log email sent successfully to ${SUPPORT_LOG_EMAIL} for user ${userId}`);
  } catch (err) {
    console.error(`[webhook] Failed to send support log email to ${SUPPORT_LOG_EMAIL} for user ${userId}:`, err);
  }
}

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

  console.log('[webhook] Event type:', event.type);
  console.log('[webhook] Extracted userId from metadata:', userId);

  if (userId) {
    const userRef = adminDb.collection('users').doc(userId);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          const item = sub.items.data[0];
          const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end;

          const updatePayload = {
            subscription: {
              status: sub.status,
              plan: item?.price.id ?? null,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
              trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            }
          };

          console.log('[webhook] About to write to Firestore for userId:', userId, 'payload:', JSON.stringify(updatePayload));

          await userRef.update(updatePayload);

          console.log('[webhook] Firestore update SUCCEEDED for userId:', userId);

          if (event.type === 'customer.subscription.created') {
            try {
              const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
              let customerEmail: string | null = null;
              let customerName: string | null = null;

              if (customerId) {
                const customer = await stripe.customers.retrieve(customerId);
                if (!('deleted' in customer)) {
                  customerEmail = customer.email ?? null;
                  customerName = customer.name ?? null;
                }
              }

              await sendSubscriptionCreatedNotification({
                userId,
                customerEmail,
                customerName,
                priceId: item?.price.id ?? null,
                amount: item?.price.unit_amount ?? null,
                currency: item?.price.currency ?? null,
                status: sub.status,
              });
            } catch (notifyErr) {
              console.error(`[webhook] Notification step failed for user ${userId} (non-blocking):`, notifyErr);
            }
          }
          break;
        }
        case 'customer.subscription.deleted':
          await userRef.update({
            subscription: { status: 'canceled', plan: null, stripeSubscriptionId: null }
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