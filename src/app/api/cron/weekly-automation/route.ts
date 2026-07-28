import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DEFAULT_LOGO = 'https://tarsyn-app.com/tarsyn-logo.svg';

function logoBlock(logoUrl?: string) {
  const src = logoUrl || DEFAULT_LOGO;
  return '<div style="text-align: center; margin-bottom: 20px;">' +
    '<img src="' + src + '" alt="TARSYN" style="height: 40px; width: auto; max-width: 200px;" />' +
    '</div>';
}

function computeOverdue(grid: any, members: Record<string, any>) {
  const weeks: Record<string, string> = grid.weeks || {};
  const slots: Record<string, any> = grid.slots || {};
  const payments: Record<string, Record<string, boolean>> = grid.payments || {};
  const today = new Date();

  const elapsedWeekIdxs = Object.entries(weeks)
    .filter(([, dateStr]) => new Date(dateStr as string) <= today)
    .map(([idx]) => idx);

  const slotsByMember: Record<string, string[]> = {};
  Object.entries(slots).forEach(([slotNum, slot]: [string, any]) => {
    if (!slotsByMember[slot.memberId]) slotsByMember[slot.memberId] = [];
    slotsByMember[slot.memberId].push(slotNum);
  });

  const results: any[] = [];
  Object.entries(slotsByMember).forEach(([memberId, slotNums]) => {
    const member = members[memberId];
    if (!member) return;
    let missingSlotWeeks = 0;
    const missingWeekIdxSet = new Set<string>();
    slotNums.forEach((slotNum) => {
      elapsedWeekIdxs.forEach((wIdx) => {
        if (!payments?.[slotNum]?.[wIdx]) {
          missingSlotWeeks++;
          missingWeekIdxSet.add(wIdx);
        }
      });
    });
    if (missingSlotWeeks > 0) {
      results.push({
        memberId,
        member,
        missingWeeksCount: missingWeekIdxSet.size,
        amountOwed: (member.expectedAmount || 0) * missingSlotWeeks,
      });
    }
  });
  return results;
}

async function sendReminderEmail(memberEmail: string, memberName: string, groupName: string, amount: number, adminName: string, logoUrl?: string) {
  await resend.emails.send({
    from: 'TARSYN <noreply@tarsyn-app.com>',
    to: memberEmail,
    subject: 'Reminder: Contribution due - ' + groupName,
    html:
      '<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #FBEEDD; padding: 32px; border-radius: 16px;">' +
      logoBlock(logoUrl) +
      '<h2 style="color: #6B2D4E; font-size: 19px; font-weight: 800; margin: 0 0 12px;">Hello ' + memberName + '</h2>' +
      '<p style="color: #7A5068; font-size: 14px; margin: 0 0 20px;">This is an automatic weekly reminder from ' + groupName + '. Your contribution is currently overdue.</p>' +
      '<div style="background: white; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">' +
      '<p style="color: #7A5068; font-size: 12px; margin: 0 0 6px; text-transform: uppercase;">Amount Due</p>' +
      '<p style="color: #6B2D4E; font-size: 20px; font-weight: 800; margin: 0;">$' + amount.toFixed(2) + '</p>' +
      '</div>' +
      '<p style="color: #7A5068; font-size: 12.5px; margin: 0;">Please log in to TARSYN to view your payment grid and pay online if available.</p>' +
      '<p style="text-align:center; font-size: 10.5px; color: #A08B7D; margin-top: 24px;">Powered by TARSYN(TM) - Ma Production Luxenn Zara LLC</p>' +
      '</div>',
  });
}

async function sendOrganizerSummary(organizerEmail: string, groupsSummary: any[], logoUrl?: string) {
  const rows = groupsSummary.map((g) =>
    '<tr><td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#4A1F38;">' + g.groupName + '</td>' +
    '<td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#3F7D5C;text-align:center;">' + g.paidCount + '</td>' +
    '<td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#B0525F;text-align:center;">' + g.overdueCount + '</td>' +
    '<td style="padding:8px 12px;border-bottom:1px solid #EAD9BE;color:#4A1F38;text-align:right;">$' + g.totalOwed.toFixed(2) + '</td></tr>'
  ).join('');

  await resend.emails.send({
    from: 'TARSYN <noreply@tarsyn-app.com>',
    to: organizerEmail,
    subject: 'Your weekly TARSYN summary',
    html:
      '<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #FBEEDD; padding: 32px; border-radius: 16px;">' +
      logoBlock(logoUrl) +
      '<h2 style="color: #6B2D4E; font-size: 19px; font-weight: 800; margin: 0 0 16px;">Your Weekly Summary</h2>' +
      '<table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;">' +
      '<tr style="background:#6B2D4E;"><th style="padding:8px 12px;color:white;text-align:left;font-size:11px;">GROUP</th>' +
      '<th style="padding:8px 12px;color:white;font-size:11px;">PAID</th><th style="padding:8px 12px;color:white;font-size:11px;">OVERDUE</th>' +
      '<th style="padding:8px 12px;color:white;text-align:right;font-size:11px;">AMOUNT OWED</th></tr>' +
      rows +
      '</table>' +
      '<p style="text-align:center; font-size: 10.5px; color: #A08B7D; margin-top: 24px;">Powered by TARSYN(TM) - Ma Production Luxenn Zara LLC</p>' +
      '</div>',
  });
}

async function sendUpcomingPayoutNotice(memberEmail: string, memberName: string, groupName: string, payoutDate: string, organizerEmail?: string, logoUrl?: string) {
  await resend.emails.send({
    from: 'TARSYN <noreply@tarsyn-app.com>',
    to: memberEmail,
    cc: organizerEmail ? [organizerEmail] : undefined,
    subject: 'Your payout is coming up - ' + groupName,
    html:
      '<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #FBEEDD; padding: 32px; border-radius: 16px;">' +
      logoBlock(logoUrl) +
      '<h2 style="color: #6B2D4E; font-size: 19px; font-weight: 800; margin: 0 0 12px;">Good news, ' + memberName + '!</h2>' +
      '<p style="color: #7A5068; font-size: 14px; margin: 0 0 20px;">Your turn to receive the pooled contribution in <strong>' + groupName + '</strong> is coming up soon.</p>' +
      '<div style="background: white; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">' +
      '<p style="color: #7A5068; font-size: 12px; margin: 0 0 6px; text-transform: uppercase;">Payout Date</p>' +
      '<p style="color: #6B2D4E; font-size: 20px; font-weight: 800; margin: 0;">' + payoutDate + '</p>' +
      '</div>' +
      '<p style="text-align:center; font-size: 10.5px; color: #A08B7D; margin-top: 24px;">Powered by TARSYN(TM) - Ma Production Luxenn Zara LLC</p>' +
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
  const isAuthorized =
    !process.env.CRON_SECRET ||
    authHeader === 'Bearer ' + process.env.CRON_SECRET ||
    querySecret === process.env.CRON_SECRET;
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { remindersSent: 0, summariesSent: 0, payoutNoticesSent: 0, errors: [] as string[] };

  try {
    const gridsSnap = await adminDb.collection('paymentGrids').get();
    const organizerSummaries: Record<string, any[]> = {};
    const organizerLogos: Record<string, string | undefined> = {};

    for (const gridDoc of gridsSnap.docs) {
      const groupId = gridDoc.id.replace(/_current$/, '');
      const grid = gridDoc.data() as any;
      if (!grid.organizerId) continue;

      try {
        const groupSnap = await adminDb.collection('groups').doc(groupId).get();
        const groupData = groupSnap.exists ? groupSnap.data() as any : null;
        const groupName = groupData?.name || 'Your Group';
        const logoUrl = groupData?.groupBrand?.logo || undefined;

        const membersSnap = await adminDb.collection('members').where('groupId', '==', groupId).get();
        const membersById: Record<string, any> = {};
        membersSnap.docs.forEach((d) => { membersById[d.id] = { id: d.id, ...d.data() }; });

        // --- 1. Automatic overdue reminders ---
        const overdue = computeOverdue(grid, membersById);
        let totalOwed = 0;
        for (const item of overdue) {
          totalOwed += item.amountOwed;
          if (item.member.email) {
            try {
              await sendReminderEmail(item.member.email, item.member.fullName || item.member.name || 'Member', groupName, item.amountOwed, 'your organizer', logoUrl);
              results.remindersSent++;
            } catch (e: any) {
              results.errors.push('reminder failed for ' + item.memberId + ': ' + e.message);
            }
          }
        }

        // --- 2. Track for organizer weekly summary ---
        const paidCount = Object.keys(membersById).length - overdue.length;
        if (!organizerSummaries[grid.organizerId]) organizerSummaries[grid.organizerId] = [];
        organizerSummaries[grid.organizerId].push({ groupName, paidCount, overdueCount: overdue.length, totalOwed });
        // Remember the first available group logo per organizer, used for
        // the weekly summary email header (an organizer may run several
        // groups; we just need one representative logo, falling back to
        // the default TARSYN logo if none of their groups has one).
        if (!organizerLogos[grid.organizerId] && logoUrl) {
          organizerLogos[grid.organizerId] = logoUrl;
        }

        // --- 3. Upcoming payout notifications (within next 7 days, not yet notified) ---
        const now = new Date();
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        for (const member of Object.values(membersById) as any[]) {
          const datesToCheck: string[] = Array.isArray(member.payoutDates) && member.payoutDates.length > 0
            ? member.payoutDates
            : (member.payoutDate ? [member.payoutDate] : []);
          const hasUpcoming = datesToCheck.some((d) => {
            if (!d) return false;
            const dt = new Date(d);
            return dt >= now && dt <= in7Days;
          });
          if (hasUpcoming && member.email && !member.payoutReminderSent) {
            try {
              const organizerData = grid.organizerId ? await adminAuth.getUser(grid.organizerId).catch(() => null) : null;
              await sendUpcomingPayoutNotice(
                member.email,
                member.fullName || member.name || 'Member',
                groupName,
                datesToCheck.find((d) => { const dt = new Date(d); return dt >= now && dt <= in7Days; }) || '',
                organizerData?.email,
                logoUrl
              );
              await adminDb.collection('members').doc(member.id).update({ payoutReminderSent: true });
              results.payoutNoticesSent++;
            } catch (e: any) {
              results.errors.push('payout notice failed for ' + member.id + ': ' + e.message);
            }
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
          await sendOrganizerSummary(organizerUser.email, groupsSummary, organizerLogos[organizerId]);
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