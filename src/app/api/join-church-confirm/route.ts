import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Mirrors /api/join-confirm but for churchMembers — sets userId + status
// active on the member record, and notifies the organizer. Deliberately
// has no TYN-ID / rotation-position logic since none of that applies to a
// church community.
export async function POST(req: NextRequest) {
  try {
    const { memberId, userId, name, email } = await req.json();

    if (!memberId || !userId) {
      return NextResponse.json({ error: 'Missing memberId or userId' }, { status: 400 });
    }

    const memberRef = adminDb.collection('churchMembers').doc(memberId);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberData = memberSnap.data() as any;

    const updateData: Record<string, any> = {
      userId,
      status: 'active',
    };
    if (name) updateData.fullName = name;
    if (email) updateData.email = email;

    await memberRef.update(updateData);

    const organizerId = memberData.organizerId;
    const memberName = name || memberData.fullName || 'A member';
    const memberEmail = email || memberData.email || '';

    let churchName = '';
    try {
      if (memberData.churchId) {
        const churchSnap = await adminDb.collection('churches').doc(memberData.churchId).get();
        if (churchSnap.exists) churchName = (churchSnap.data() as any)?.churchName || '';
      }
    } catch (churchErr) { /* non-blocking */ }

    try {
      await adminDb.collection('audit_logs').add({
        organizerId: organizerId || '',
        category: 'Member',
        action: 'Church member activated their account',
        user: 'system',
        details: memberName + (churchName ? ' - ' + churchName : ''),
        createdAt: new Date(),
      });
    } catch (auditErr) {
      console.error('join-church-confirm: audit log failed (non-blocking):', auditErr);
    }

    try {
      if (organizerId) {
        const organizerUser = await adminAuth.getUser(organizerId);
        const organizerEmail = organizerUser.email;
        if (organizerEmail) {
          await resend.emails.send({
            from: 'TARSYN <noreply@tarsyn-app.com>',
            to: organizerEmail,
            subject: memberName + ' just joined ' + (churchName || 'your church') + ' on TARSYN',
            html:
              '<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #FBF6F2; padding: 32px; border-radius: 16px;">' +
              '<div style="text-align: center; margin-bottom: 20px;">' +
              '<img src="https://tarsyn-app.com/tarsyn-logo.svg" alt="TARSYN" style="height: 36px; width: auto; max-width: 180px;" />' +
              '</div>' +
              '<h2 style="color: #1F4A46; font-size: 19px; font-weight: 800; margin: 0 0 12px;">Good news \u2014 a new member joined</h2>' +
              '<div style="background: white; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">' +
              '<p style="color: #1F4A46; font-size: 15px; font-weight: 700; margin: 0 0 6px;">' + memberName + '</p>' +
              (memberEmail ? '<p style="color: #7A9490; font-size: 13px; margin: 0 0 4px;">' + memberEmail + '</p>' : '') +
              (churchName ? '<p style="color: #7A9490; font-size: 13px; margin: 0;">Church: ' + churchName + '</p>' : '') +
              '</div>' +
              '<p style="color: #7A9490; font-size: 13px; margin: 0;">They have successfully created their account and joined your church community.</p>' +
              '<p style="text-align:center; font-size: 10.5px; color: #A08B7D; margin-top: 24px;">Powered by TARSYN(TM) - Ma Production Luxenn Zara LLC</p>' +
              '</div>',
          });
        }
      }
    } catch (emailErr) {
      console.error('join-church-confirm: organizer notification email failed (non-blocking):', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('join-church-confirm error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
