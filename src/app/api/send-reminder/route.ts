/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';
import { computeDues, contributionPerPeriod } from '@/lib/dues';
import { reminderEmailHtml } from '@/lib/reminderEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

// Sends a contribution reminder to ONE member of the caller's group.
// The amount is always computed here, on the server, from the payment grid
// (current cycle, from the member's join date, following the group's
// frequency) - the browser never decides what a member is told they owe.
export async function POST(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;

    const { groupId, memberId } = await req.json().catch(() => ({}));
    if (!groupId || !memberId || typeof groupId !== 'string' || typeof memberId !== 'string') {
      return NextResponse.json({ error: 'Missing groupId or memberId' }, { status: 400 });
    }

    const groupSnap = await adminDb.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    const group = groupSnap.data() as any;
    if (group.organizerId !== uid) return forbidden('You can only send reminders for your own groups.');

    const memberSnap = await adminDb.collection('members').doc(memberId).get();
    if (!memberSnap.exists || memberSnap.data()?.groupId !== groupId) {
      return NextResponse.json({ error: 'Member not found in this group' }, { status: 404 });
    }
    const member = memberSnap.data() as any;
    if (!member.email) return NextResponse.json({ error: 'No email on file' }, { status: 400 });

    const gridSnap = await adminDb.collection('paymentGrids').doc(groupId + '_current').get();
    if (!gridSnap.exists) return NextResponse.json({ error: 'This group has no payment grid yet' }, { status: 400 });
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
    if (dues.unpaid.length === 0 || dues.amountOwed <= 0) {
      return NextResponse.json({ error: 'This member has nothing overdue in the current cycle' }, { status: 409 });
    }

    const organizer = await adminAuth.getUser(uid).catch(() => null);
    const groupName = String(group.name || 'Your group');
    const senderName = groupName.replace(/["<>,\r\n]/g, '').trim() || 'UNIMUNITY';
    const currency = String(member.currency || group.currency || 'USD').toUpperCase();
    const brand = group.groupBrand || {};

    const { error } = await resend.emails.send({
      from: senderName + ' <noreply@unimunity.com>',
      to: member.email,
      ...(organizer?.email ? { replyTo: organizer.email } : {}),
      subject: 'Reminder: Contribution due - ' + groupName,
      html: reminderEmailHtml({
        groupName,
        logoUrl: brand.enabled !== false ? brand.logo : undefined,
        memberName: member.fullName || member.name || 'Member',
        fromName: organizer?.displayName || undefined,
        unpaidPeriods: dues.unpaid.map(u => u.period),
        amountPerPeriod: dues.amountPerPeriod,
        amountOwed: dues.amountOwed,
        currency,
      }),
    });
    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, amountOwed: dues.amountOwed, currency, periods: dues.unpaid.length });
  } catch (err) {
    console.error('send-reminder error:', err);
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 });
  }
}
