/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Resend } from 'resend';
import { PLAN_LIMITS, getPlanTierFromPriceId, PlanTier } from '@/lib/planLimits';
import { computeDues, contributionPerPeriod, payoutForPeriod, toDateOnly, DuePeriod } from '@/lib/dues';
import { reminderEmailHtml } from '@/lib/reminderEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

// Admin-SDK equivalent of planLimits.ts's getOrganizerPlanTier (that one
// uses the client Firestore SDK, which isn't available in this server
// cron route). Cached per organizer for the duration of a single run,
// since one organizer can have several groups.
const organizerTierCache: Record<string, PlanTier> = {};
async function getOrganizerPlanTierAdmin(organizerId: string): Promise<PlanTier> {
  if (organizerTierCache[organizerId]) return organizerTierCache[organizerId];
  let tier: PlanTier = 'free';
  try {
    const snap = await adminDb.collection('users').doc(organizerId).get();
    const subscription = snap.exists ? (snap.data() as any)?.subscription : null;
    if (subscription?.status === 'active' || subscription?.status === 'trialing') {
      tier = getPlanTierFromPriceId(subscription?.plan);
    }
  } catch (e) {
    console.error('getOrganizerPlanTierAdmin failed for', organizerId, e);
  }
  organizerTierCache[organizerId] = tier;
  return tier;
}

// Member-facing emails (reminders, payout notices) should read as coming
// from the organizer's own group when White Label is active for their
// plan, instead of always showing "UNIMUNITY" - otherwise white-labeling
// only applies to the in-app pages, not the automated emails members
// actually receive. The "Powered by UNIMUNITY" footer follows the same
// Business+/Branding Studio toggle used on the in-app preview.
// A group name is free text an organizer typed in - strip characters that
// would break the "Name <email>" header syntax (quotes, angle brackets,
// commas, line breaks) before ever using it as an email sender name.
function sanitizeSenderName(name: string): string {
  const cleaned = name.replace(/["<>,\r\n]/g, '').trim();
  return cleaned || 'UNIMUNITY';
}

function emailBranding(tier: PlanTier, groupName: string, groupBrand: any) {
  const brandEnabled = groupBrand?.enabled !== false;
  const whiteLabeled = PLAN_LIMITS[tier].whiteLabel && brandEnabled;
  const canHideBadge = tier === 'pro' || tier === 'enterprise';
  // The sender name is always the group's own name, on every plan
  // (Starter included) - members should recognize which tontine sent
  // them a reminder. Only the "Powered by UNIMUNITY" footer stays tied
  // to the White Label / Business+ badge-hide setting.
  const senderName = sanitizeSenderName(groupName);
  const showBadge = !(whiteLabeled && canHideBadge && groupBrand?.showUNIMUNITYBadge === false);
  return { senderName, showBadge };
}

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Email header: the group's logo (if any) AND its name in text, so the name
// is still shown when the mail app blocks images.
// UNIMUNITY is only the tool - the email comes from the group.
function headerBlock(groupName: string, logoUrl?: string) {
  const logo = logoUrl && /^https:\/\//.test(logoUrl)
    ? '<div style="text-align: center; margin-bottom: 8px;">' +
      '<img src="' + esc(logoUrl) + '" alt="' + esc(groupName) + '" style="height: 48px; width: auto; max-width: 220px;" />' +
      '</div>'
    : '';
  return logo + '<p style="text-align: center; margin: 0 0 20px; color: #4A1F38; font-size: 20px; font-weight: 800; letter-spacing: 0.04em;">' + esc(groupName) + '</p>';
}

function money(amount: number, currency: string) {
  return esc(currency) + ' ' + amount.toFixed(2);
}

// Members with these statuses are not asked for contributions.
const NO_REMINDER_STATUSES = ['paused', 'inactive', 'removed', 'left'];

function computeOverdue(grid: any, members: Record<string, any>, group: any) {
  const slots: Record<string, any> = grid.slots || {};
  const slotsByMember: Record<string, string[]> = {};
  Object.entries(slots).forEach(([slotNum, slot]: [string, any]) => {
    if (!slot?.memberId) return;
    if (!slotsByMember[slot.memberId]) slotsByMember[slot.memberId] = [];
    slotsByMember[slot.memberId].push(slotNum);
  });

  const results: any[] = [];
  Object.entries(slotsByMember).forEach(([memberId, slotNums]) => {
    const member = members[memberId];
    if (!member) return;
    if (NO_REMINDER_STATUSES.includes(String(member.status || '').toLowerCase())) return;
    const dues = computeDues({
      weeks: grid.weeks || {},
      payments: grid.payments || {},
      slotNums,
      frequency: group?.frequency || group?.paymentFrequency,
      cycleStart: grid.startDate,
      cycleEnd: grid.cycleEndDate,
      memberSince: member.createdAt,
      amountPerPeriod: contributionPerPeriod(member, group),
    });
    if (dues.unpaid.length > 0 && dues.amountOwed > 0) {
      results.push({
        memberId,
        member,
        unpaidPeriods: dues.unpaid.map(u => u.period),
        amountPerPeriod: dues.amountPerPeriod,
        amountOwed: dues.amountOwed,
        currency: String(member.currency || group?.currency || 'USD').toUpperCase(),
      });
    }
  });
  return results;
}

async function sendReminderEmail(opts: {
  memberEmail: string; memberName: string; groupName: string; logoUrl?: string; senderName: string;
  unpaidPeriods: DuePeriod[]; amountPerPeriod: number; amountOwed: number; currency: string;
}) {
  await resend.emails.send({
    from: opts.senderName + ' <noreply@unimunity.com>',
    to: opts.memberEmail,
    subject: 'Reminder: Contribution due - ' + opts.groupName,
    html: reminderEmailHtml({
      groupName: opts.groupName,
      logoUrl: opts.logoUrl,
      memberName: opts.memberName,
      unpaidPeriods: opts.unpaidPeriods,
      amountPerPeriod: opts.amountPerPeriod,
      amountOwed: opts.amountOwed,
      currency: opts.currency,
    }),
  });
}

async function sendOrganizerSummary(organizerEmail: string, groupsSummary: any[]) {
  const rows = groupsSummary.map((g) =>
    '<tr><td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#4A1F38;">' + esc(g.groupName) + '</td>' +
    '<td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#3F7D5C;text-align:center;">' + g.paidCount + '</td>' +
    '<td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#B0525F;text-align:center;">' + g.overdueCount + '</td>' +
    '<td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#4A1F38;text-align:right;">' + money(g.totalOwed, g.currency) + '</td></tr>'
  ).join('');

  await resend.emails.send({
    from: 'UNIMUNITY <noreply@unimunity.com>',
    to: organizerEmail,
    subject: 'Your weekly summary',
    html:
      '<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #FBEEDD; padding: 32px; border-radius: 16px;">' +
      '<h2 style="color: #6B2D4E; font-size: 19px; font-weight: 800; margin: 0 0 16px;">Your Weekly Summary</h2>' +
      '<table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;">' +
      '<tr style="background:#6B2D4E;"><th style="padding:8px 12px;color:white;text-align:left;font-size:11px;">GROUP</th>' +
      '<th style="padding:8px 12px;color:white;font-size:11px;">UP TO DATE</th><th style="padding:8px 12px;color:white;font-size:11px;">OVERDUE</th>' +
      '<th style="padding:8px 12px;color:white;text-align:right;font-size:11px;">AMOUNT DUE</th></tr>' +
      rows +
      '</table>' +
      '<p style="color: #7A5068; font-size: 12px; margin: 14px 0 0;">Amounts count only the current cycle, from each member\'s join date, following each group\'s contribution frequency.</p>' +
      '</div>',
  });
}

async function sendUpcomingPayoutNotice(opts: {
  memberEmail: string; memberName: string; groupName: string; payoutDate: string; organizerEmail?: string;
  logoUrl?: string; senderName: string; payout: { pool: number; commission: number; net: number; ratePercent: number }; currency: string;
}) {
  const amountBlock = opts.payout.pool > 0
    ? '<p style="color: #7A5068; font-size: 12px; margin: 14px 0 6px; text-transform: uppercase;">Estimated amount you receive</p>' +
      '<p style="color: #6B2D4E; font-size: 20px; font-weight: 800; margin: 0;">' + money(opts.payout.net, opts.currency) + '</p>' +
      '<p style="color: #7A5068; font-size: 12px; margin: 6px 0 0;">Total contributions ' + money(opts.payout.pool, opts.currency) +
      (opts.payout.ratePercent > 0 ? ' - organizer commission ' + opts.payout.ratePercent + '% (' + money(opts.payout.commission, opts.currency) + ')' : '') +
      '. Final amount depends on all members paying this period.</p>'
    : '';
  await resend.emails.send({
    from: opts.senderName + ' <noreply@unimunity.com>',
    to: opts.memberEmail,
    ...(opts.organizerEmail ? { replyTo: opts.organizerEmail } : {}),
    subject: 'Your payout is coming up - ' + opts.groupName,
    html:
      '<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #FBEEDD; padding: 32px; border-radius: 16px;">' +
      headerBlock(opts.groupName, opts.logoUrl) +
      '<h2 style="color: #6B2D4E; font-size: 19px; font-weight: 800; margin: 0 0 12px;">Good news, ' + esc(opts.memberName) + '!</h2>' +
      '<p style="color: #7A5068; font-size: 14px; margin: 0 0 20px;">Your turn to receive the pooled contribution in <strong>' + esc(opts.groupName) + '</strong> is coming up soon.</p>' +
      '<div style="background: white; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">' +
      '<p style="color: #7A5068; font-size: 12px; margin: 0 0 6px; text-transform: uppercase;">Payout Date</p>' +
      '<p style="color: #6B2D4E; font-size: 20px; font-weight: 800; margin: 0;">' + esc(opts.payoutDate) + '</p>' +
      amountBlock +
      '</div>' +
      '</div>',
  });
}

export async function GET(req: NextRequest) {
  // Protect this endpoint: Vercel Cron sends this header automatically when
  // CRON_SECRET is set as an environment variable.
  // Vercel Cron sends the secret as a header automatically. For manual testing
  // from a browser address bar (no custom headers possible), a ?secret=
  // query parameter is also accepted.
  const authHeader = req.headers.get('authorization');
  const querySecret = req.nextUrl.searchParams.get('secret');
  // Fails closed: without CRON_SECRET configured nobody can trigger the
  // emails (otherwise anyone could send reminders to every member).
  const secret = process.env.CRON_SECRET || '';
  const isAuthorized = !!secret && (authHeader === 'Bearer ' + secret || querySecret === secret);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { remindersSent: 0, summariesSent: 0, payoutNoticesSent: 0, errors: [] as string[] };

  try {
    const gridsSnap = await adminDb.collection('paymentGrids').get();
    const organizerSummaries: Record<string, any[]> = {};

    for (const gridDoc of gridsSnap.docs) {
      // Only the CURRENT cycle of each group (archived cycles are history).
      if (!gridDoc.id.endsWith('_current')) continue;
      const groupId = gridDoc.id.replace(/_current$/, '');
      const grid = gridDoc.data() as any;
      if (!grid.organizerId) continue;

      try {
        const groupSnap = await adminDb.collection('groups').doc(groupId).get();
        const groupData = groupSnap.exists ? groupSnap.data() as any : null;
        const groupName = groupData?.name || 'Your Group';
        const logoUrl = groupData?.groupBrand?.logo || undefined;
        const organizerTier = await getOrganizerPlanTierAdmin(grid.organizerId);
        const { senderName } = emailBranding(organizerTier, groupName, groupData?.groupBrand);

        const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
        const membersById: Record<string, any> = {};
        membersSnap.docs.forEach((d) => { membersById[d.id] = { id: d.id, ...d.data() }; });

        // --- 1. Automatic overdue reminders (current cycle, from join date, per frequency) ---
        const overdue = computeOverdue(grid, membersById, groupData);
        let totalOwed = 0;
        for (const item of overdue) {
          totalOwed += item.amountOwed;
          if (item.member.email) {
            try {
              await sendReminderEmail({
                memberEmail: item.member.email,
                memberName: item.member.fullName || item.member.name || 'Member',
                groupName, logoUrl, senderName,
                unpaidPeriods: item.unpaidPeriods,
                amountPerPeriod: item.amountPerPeriod,
                amountOwed: item.amountOwed,
                currency: item.currency,
              });
              results.remindersSent++;
            } catch (e: any) {
              results.errors.push('reminder failed for ' + item.memberId + ': ' + e.message);
            }
          }
        }

        // --- 2. Track for organizer weekly summary ---
        const membersInGrid = new Set(Object.values(grid.slots || {}).map((sl: any) => sl?.memberId).filter(Boolean));
        const paidCount = Math.max(0, membersInGrid.size - overdue.length);
        if (!organizerSummaries[grid.organizerId]) organizerSummaries[grid.organizerId] = [];
        organizerSummaries[grid.organizerId].push({
          groupName, paidCount, overdueCount: overdue.length, totalOwed: Math.round(totalOwed * 100) / 100,
          currency: String(groupData?.currency || 'USD').toUpperCase(),
        });

        // --- 3. Upcoming payout notifications (next 7 days, once per payout date) ---
        const todayStr = new Date().toISOString().slice(0, 10);
        const in7Str = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
        // Pool of one period: every active slot's contribution.
        const slotContributions = Object.values(grid.slots || {}).map((sl: any) => {
          const m = membersById[sl?.memberId];
          if (!m || NO_REMINDER_STATUSES.includes(String(m.status || '').toLowerCase())) return 0;
          return contributionPerPeriod(m, groupData);
        });
        const payout = payoutForPeriod({ slotContributions, commissionRatePercent: groupData?.commissionRate });
        let organizerEmail: string | undefined;
        for (const member of Object.values(membersById) as any[]) {
          const dates: string[] = (Array.isArray(member.payoutDates) && member.payoutDates.length > 0
            ? member.payoutDates
            : (member.payoutDate ? [member.payoutDate] : []))
            .map((d: unknown) => toDateOnly(d))
            .filter((d: string | null): d is string => !!d);
          const upcoming = dates.find((d) => d >= todayStr && d <= in7Str);
          const alreadySent: string[] = Array.isArray(member.payoutNoticeDates) ? member.payoutNoticeDates : [];
          if (!upcoming || !member.email || alreadySent.includes(upcoming)) continue;
          try {
            if (organizerEmail === undefined) {
              organizerEmail = (await adminAuth.getUser(grid.organizerId).catch(() => null))?.email || '';
            }
            await sendUpcomingPayoutNotice({
              memberEmail: member.email,
              memberName: member.fullName || member.name || 'Member',
              groupName, payoutDate: upcoming, organizerEmail: organizerEmail || undefined,
              logoUrl, senderName, payout,
              currency: String(groupData?.currency || member.currency || 'USD').toUpperCase(),
            });
            // Remember each payout date notified (a member can have several).
            await adminDb.collection('members').doc(member.id).update({ payoutNoticeDates: [...alreadySent, upcoming] });
            results.payoutNoticesSent++;
          } catch (e: any) {
            results.errors.push('payout notice failed for ' + member.id + ': ' + e.message);
          }
        }
      } catch (groupErr: any) {
        results.errors.push('group ' + groupId + ' failed: ' + groupErr.message);
      }
    }

    // --- Send one weekly summary email per organizer ---
    for (const [organizerId, groupsSummary] of Object.entries(organizerSummaries)) {
      try {
        const organizerUser = await adminAuth.getUser(organizerId);
        if (organizerUser.email) {
          await sendOrganizerSummary(organizerUser.email, groupsSummary);
          results.summariesSent++;
        }
      } catch (e: any) {
        results.errors.push('summary failed for organizer ' + organizerId + ': ' + e.message);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (e: any) {
    console.error('weekly-automation cron error:', e);
    return NextResponse.json({ error: e.message || 'Internal error', ...results }, { status: 500 });
  }
}