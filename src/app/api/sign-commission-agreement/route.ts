import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { buildCommissionAgreementDoc } from '@/lib/commission-agreement-doc';

// Lets an already-registered member sign the organizer's commission
// agreement after logging in - for members whose account was created
// before this consent step existed, or who join without hitting the
// /join/[code] signature step. The caller must own the member record
// they are signing for.
export async function POST(req: NextRequest) {
  try {
    const { memberId, userId, name } = await req.json();
    if (!memberId || !userId || !name || !String(name).trim()) {
      return NextResponse.json({ error: 'Missing memberId, userId or name' }, { status: 400 });
    }

    const memberRef = adminDb.collection('members').doc(memberId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const memberData = memberSnap.data() as any;
    if (memberData.userId !== userId) {
      return NextResponse.json({ error: 'Not authorized to sign for this member' }, { status: 403 });
    }

    await memberRef.update({
      commissionAgreement: {
        member: { name: String(name).trim(), signedAt: new Date() },
      },
    });

    // Archive a Word-openable copy of the signed agreement (both
    // signatures) in the member's Documents as a record - non-blocking,
    // since a failure here should never stop the signature itself from
    // being saved.
    try {
      const groupId = memberData.groupId;
      if (groupId) {
        const groupSnap = await adminDb.collection('groups').doc(groupId).get();
        const gData = groupSnap.exists ? (groupSnap.data() as any) : {};
        const organizerId = memberData.organizerId || gData?.organizerId || gData?.adminId;
        let tiers = Array.isArray(gData?.commissionAgreement?.tiers) ? gData.commissionAgreement.tiers : [];
        if (tiers.length === 0 && organizerId) {
          const orgSnap = await adminDb.collection('users').doc(organizerId).get();
          const orgTiers = orgSnap.exists ? (orgSnap.data() as any)?.commissionTiers : null;
          tiers = Array.isArray(orgTiers) ? orgTiers : [];
        }
        const adminSigned = gData?.commissionAgreement?.admin;
        let organizerName = adminSigned?.name || '';
        const organizerSignedAt: Date | null = adminSigned?.signedAt?.toDate ? adminSigned.signedAt.toDate() : (adminSigned?.signedAt ? new Date(adminSigned.signedAt) : null);
        if (!organizerName && organizerId) {
          try {
            const organizerUser = await adminAuth.getUser(organizerId);
            organizerName = organizerUser.displayName || organizerUser.email || 'Organizer';
          } catch (e) { organizerName = 'Organizer'; }
        }
        const agreementDoc = buildCommissionAgreementDoc({
          groupName: gData?.name || memberData.groupName || 'Your Group',
          memberName: String(name).trim(),
          memberSignedAt: new Date(),
          organizerName: organizerName || 'Organizer',
          organizerSignedAt,
          tiers,
          currency: gData?.currency || '',
        });
        await adminDb.collection('documents').add({
          name: agreementDoc.name, type: agreementDoc.type, size: agreementDoc.size, url: agreementDoc.url,
          storagePath: '', category: 'Contracts',
          organizerId: organizerId || '',
          uploadedBy: 'system', source: 'admin', visibleTo: [userId],
          createdAt: new Date(),
        });
      }
    } catch (docErr) {
      console.error('sign-commission-agreement: archive doc generation failed (non-blocking):', docErr);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('sign-commission-agreement error:', e);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
