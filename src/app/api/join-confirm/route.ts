import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { memberId, userId, name, email } = await req.json();

    if (!memberId || !userId) {
      return NextResponse.json({ error: 'Missing memberId or userId' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberData = memberSnap.data() as any;

    const updateData: Record<string, any> = {
      userId,
      status: 'active',
    };
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    await memberRef.update(updateData);

    const organizerId = memberData.organizerId;
    const memberName = name || memberData.fullName || memberData.name || 'A member';
    const memberEmail = email || memberData.email || '';

    // Look up the group name for a more useful notification (non-blocking on failure).
    let groupName = '';
    try {
      if (memberData.groupId) {
        const groupSnap = await adminDb.collection('groups').doc(memberData.groupId).get();
        if (groupSnap.exists) groupName = (groupSnap.data() as any)?.name || '';
      }
    } catch (groupErr) { /* non-blocking */ }

    // Audit log entry, visible to the organizer in their Audit Log page.
    try {
      await adminDb.collection('audit_logs').add({
        organizerId: organizerId || '',
        category: 'Member',
        action: 'Member activated their account',
        user: 'system',
        details: memberName + (groupName ? ' - ' + groupName : ''),
        createdAt: new Date(),
      });
    } catch (auditErr) {
      console.error('join-confirm: audit log failed (non-blocking):', auditErr);
    }

    // Email notification to the organizer so they know without checking the app.
    try {
      if (organizerId) {
        const organizerUser = await adminAuth.getUser(organizerId);
        const organizerEmail = organizerUser.email;
        if (organizerEmail) {
          await resend.emails.send({
            from: 'TARSYN <noreply@tarsyn-app.com>',
            to: organizerEmail,
            subject: memberName + ' is now active on TARSYN',
            html:
              '<div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; background: #FBEEDD; padding: 32px; border-radius: 16px;">' +
              '<div style="text-align: center; margin-bottom: 20px;">' +
              '<div style="background: #6B2D4E; display: inline-block; padding: 10px 22px; border-radius: 12px;">' +
              '<span style="color: #E9C77B; font-weight: 800; font-size: 20px;">TARSYN</span>' +
              '</div></div>' +
              '<h2 style="color: #6B2D4E; font-size: 19px; font-weight: 800; margin: 0 0 12px;">Good news - a member just joined</h2>' +
              '<div style="background: white; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">' +
              '<p style="color: #6B2D4E; font-size: 15px; font-weight: 700; margin: 0 0 6px;">' + memberName + '</p>' +
              (memberEmail ? '<p style="color: #7A5068; font-size: 13px; margin: 0 0 4px;">' + memberEmail + '</p>' : '') +
              (groupName ? '<p style="color: #7A5068; font-size: 13px; margin: 0;">Group: ' + groupName + '</p>' : '') +
              '</div>' +
              '<p style="color: #7A5068; font-size: 13px; margin: 0;">They have successfully created their account and can now view their payment grid and pay their contribution online.</p>' +
              '<p style="text-align:center; font-size: 10.5px; color: #A08B7D; margin-top: 24px;">Powered by TARSYN(TM) - Ma Production Luxenn Zara LLC</p>' +
              '</div>',
          });
        }
      }
    } catch (emailErr) {
      console.error('join-confirm: organizer notification email failed (non-blocking):', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('join-confirm error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
