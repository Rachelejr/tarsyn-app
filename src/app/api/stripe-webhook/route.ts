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

  const subject = `New TARSYN Subscription - ${planLabel}`;
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
        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const meta = pi.metadata || {};
          const memberId = meta.memberId;
          const groupId = meta.groupId;
          const weekIndexesStr = meta.weekIndexes;
          const organizerId = meta.organizerId;

          if (!memberId || !groupId || !weekIndexesStr) {
            console.error('[webhook] payment_intent.succeeded missing required metadata, skipping grid update');
            break;
          }

          const weekIdxList = weekIndexesStr.split(',').filter(Boolean);
          const gridRef = adminDb.collection('paymentGrids').doc(groupId + '_current');
          const gridSnap = await gridRef.get();

          if (!gridSnap.exists) {
            console.error('[webhook] payment grid not found for group', groupId);
            break;
          }

          const grid = gridSnap.data() as any;
          const slots: Record<string, any> = grid.slots || {};
          const memberSlotNums = Object.entries(slots)
            .filter(([, s]: [string, any]) => s.memberId === memberId)
            .map(([slotNum]) => slotNum);

          const paymentsUpdate: Record<string, any> = {};
          weekIdxList.forEach((wIdx: string) => {
            memberSlotNums.forEach((slotNum: string) => {
              paymentsUpdate['payments.' + slotNum + '.' + wIdx] = true;
            });
          });

          if (Object.keys(paymentsUpdate).length > 0) {
            await gridRef.update(paymentsUpdate);
          }

          // Sync this member's personal payment view so their portal reflects
          // the new status immediately (same shape the admin grid page writes).
          try {
            const updatedGridSnap = await gridRef.get();
            const updatedGrid = updatedGridSnap.data() as any;
            const memberViewPayments: Record<string, any> = {};
            memberSlotNums.forEach((slotNum: string) => {
              memberViewPayments[slotNum] = updatedGrid.payments?.[slotNum] || {};
            });
            await gridRef.collection('memberViews').doc(userId).set({
              memberName: (slots[memberSlotNums[0]] || {}).memberName || '',
              slots: memberSlotNums,
              weeks: updatedGrid.weeks || {},
              payments: memberViewPayments,
            }, { merge: true });
          } catch (syncErr) {
            console.error('[webhook] memberView sync failed (non-blocking):', syncErr);
          }

          // Auto-generate a receipt for this card payment, visible to the member.
          try {
            const memberSnap = await adminDb.collection('members').doc(memberId).get();
            const memberData = memberSnap.exists ? memberSnap.data() as any : {};
            const contributionAmount = meta.contributionCents ? (parseInt(meta.contributionCents) / 100) : 0;
            const currencyLabel = (meta.currency || 'usd').toUpperCase();
            const weeksLabel = weekIdxList.map((w: string) => 'W' + w).join(', ');
            const receiptHtml =
              '<html><body style="font-family:sans-serif;padding:32px;color:#4A1F38;">' +
              '<h2 style="color:#6B2D4E;">TARSYN Payment Receipt</h2>' +
              '<p><strong>Member:</strong> ' + (memberData.fullName || memberData.name || '') + '</p>' +
              '<p><strong>Weeks:</strong> ' + weeksLabel + '</p>' +
              '<p><strong>Amount:</strong> ' + currencyLabel + ' ' + contributionAmount.toFixed(2) + '</p>' +
              '<p><strong>Payment method:</strong> Card (via Stripe)</p>' +
              '<p><strong>Status:</strong> Paid</p>' +
              '<hr/><p style="font-size:11px;color:#8A7B6C;">Powered by TARSYN(TM) - A product of Ma Production Luxenn Zara LLC</p>' +
              '</body></html>';
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(receiptHtml);

            await adminDb.collection('documents').add({
              name: 'Receipt - Card Payment - ' + weeksLabel,
              type: 'text/html',
              size: receiptHtml.length,
              url: dataUrl,
              storagePath: '',
              category: 'Receipts',
              organizerId: organizerId || '',
              uploadedBy: 'system',
              source: 'admin',
              visibleTo: [userId],
              createdAt: new Date(),
            });
          } catch (receiptErr) {
            console.error('[webhook] receipt generation failed (non-blocking):', receiptErr);
          }

          // Sync the Digital Register's Cycle columns too, so a card payment
          // shows up there automatically (week index N maps to Cycle N+1).
          try {
            const memberSnap2 = await adminDb.collection('members').doc(memberId).get();
            const memberData2 = memberSnap2.exists ? memberSnap2.data() as any : {};
            const contributionPerWeek = meta.contributionCents
              ? (parseInt(meta.contributionCents) / 100) / Math.max(1, weekIdxList.length)
              : 0;
            const registerSyncPromises = weekIdxList.map((wIdx: string) => {
              const cycleNumber = parseInt(wIdx, 10) + 1;
              const registerDocId = memberId + '_cycle' + cycleNumber;
              return adminDb.collection('payments').doc(registerDocId).set({
                organizerId: organizerId || '',
                memberId,
                memberName: memberData2.fullName || memberData2.name || '',
                amount: contributionPerWeek,
                currency: (meta.currency || 'usd').toUpperCase(),
                paymentDate: grid.weeks ? grid.weeks[wIdx] : '',
                paymentMethod: 'Card (Stripe)',
                status: 'confirmed',
                cycle: 'Cycle ' + cycleNumber,
                contributionType: 'Weekly Contribution',
                notes: 'Auto-synced from card payment (W' + wIdx + ')',
                recordedBy: 'system',
                createdAt: new Date(),
              }, { merge: true });
            });
            await Promise.all(registerSyncPromises);
          } catch (registerSyncErr) {
            console.error('[webhook] register sync failed (non-blocking):', registerSyncErr);
          }

          // Audit log entry for the organizer's dashboard.
          try {
            await adminDb.collection('audit_logs').add({
              organizerId: organizerId || '',
              category: 'Payment',
              action: 'Member paid via card',
              user: 'member',
              details: memberId + ' - weeks ' + weekIdxList.join(', '),
              createdAt: new Date(),
            });
          } catch (auditErr) {
            console.error('[webhook] audit log failed (non-blocking):', auditErr);
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