import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_NOTIFICATION_EMAIL = 'sales@tarsyn-app.com';
const SUPPORT_LOG_EMAIL = 'support@tarsyn-app.com';

// Mapping Price ID Stripe -> nom de plan lisible, utilisé uniquement pour
// le contenu de l'email de notification (pas pour la logique applicative).
const PRICE_ID_TO_PLAN_NAME: Record<string, string> = {
  'price_1TipthJk3DYYTrgp7LEDrLgE': 'Starter (legacy monthly)',
  'price_1Tiq1IJk3DYYTrgp2VmhXb6J': 'Growth (legacy monthly)',
  'price_1Tiq3AJk3DYYTrgpuElHGRxd': 'Pro (legacy monthly)',
  'price_1TjVjQJk3DYYTrgpEDu8OfyI': 'Starter (monthly)',
  'price_1TjVjQJk3DYYTrgpOaG0DWjU': 'Starter (annual)',
  'price_1TjX5gJk3DYYTrgpw5ngPx4P': 'Growth (monthly)',
  'price_1TjX5gJk3DYYTrgp6xy976sv': 'Growth (annual)',
  'price_1TjXA0Jk3DYYTrgpL0cf12Mw': 'Pro (monthly)',
  'price_1TjXA0Jk3DYYTrgp6shxK6SC': 'Pro (annual)',
};

// ---------------------------------------------------------------------------
// Notification email envoyée après une mise à jour Firestore réussie suite à
// customer.subscription.created. Ne doit JAMAIS faire échouer le webhook :
// toute erreur ici est uniquement loggée, jamais propagée.
// ---------------------------------------------------------------------------
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

  // Email principal à l'équipe sales
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

  // Copie optionnelle pour les logs support
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

          // Notification email uniquement sur la création initiale d'abonnement,
          // et seulement APRÈS le succès de la mise à jour Firestore ci-dessus.
          // Ne bloque jamais la réponse du webhook en cas d'échec d'envoi.
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
              // Ne doit jamais faire échouer le webhook : log uniquement.
              console.error(`[webhook] Notification step failed for user ${userId} (non-blocking):`, notifyErr);
            }
          }
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