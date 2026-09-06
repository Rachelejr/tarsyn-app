﻿import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { buildCommissionAgreementDoc } from '@/lib/commission-agreement-doc';

// One-time (safe to re-run) backfill: creates the archived, two-signature
// commission agreement document for members who signed BEFORE the
// auto-archiving feature existed, so they see it in their Documents too.
// Idempotent - a member who already has one is skipped, so visiting this
// URL more than once never creates duplicates.
export async function GET(req: NextRequest) {
  try {
    const membersSnap = await adminDb.collection('members').get();
    const signedMembers = membersSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((m) => m.userId && m.groupId && m.commissionAgreement?.member?.signedAt);

    const contractsSnap = await adminDb.collection('documents').where('category', '==', 'Contracts').get();
    const existingKeys = new Set(
      contractsSnap.docs.map((d) => {
        const data = d.data() as any;
        const visibleTo = Array.isArray(data.visibleTo) ? data.visibleTo.join(',') : '';
        return (data.organizerId || '') + '::' + visibleTo;
      })
    );

    const results: any[] = [];

    for (const m of signedMembers) {
      try {
        const groupSnap = await adminDb.collection('groups').doc(m.groupId).get();
        const gData = groupSnap.exists ? (groupSnap.data() as any) : {};
        const organizerId = m.organizerId || gData?.organizerId || gData?.adminId || '';
        const key = organizerId + '::' + m.userId;

        if (existingKeys.has(key)) {
          results.push({ member: m.id, status: 'already has one' });
          continue;
        }

        let tiers = Array.isArray(gData?.commissionAgreement?.tiers) ? gData.commissionAgreement.tiers : [];
        if (tiers.length === 0 && organizerId) {
          const orgSnap = await adminDb.collection('users').doc(organizerId).get();
          const orgTiers = orgSnap.exists ? (orgSnap.data() as any)?.commissionTiers : null;
          tiers = Array.isArray(orgTiers) ? orgTiers : [];
        }

        const adminSigned = gData?.commissionAgreement?.admin;
        let organizerName = adminSigned?.name || '';
        const organizerSignedAt: Date | null = adminSigned?.signedAt?.toDate
          ? adminSigned.signedAt.toDate()
          : (adminSigned?.signedAt ? new Date(adminSigned.signedAt) : null);
        if (!organizerName && organizerId) {
          try {
            const organizerUser = await adminAuth.getUser(organizerId);
            organizerName = organizerUser.displayName || organizerUser.email || 'Organizer';
          } catch (e) {
            organizerName = 'Organizer';
          }
        }

        const memberSignedAtRaw = m.commissionAgreement.member.signedAt;
        const memberSignedAt: Date = memberSignedAtRaw?.toDate ? memberSignedAtRaw.toDate() : new Date(memberSignedAtRaw);

        const agreementDoc = buildCommissionAgreementDoc({
          groupName: gData?.name || m.groupName || 'Your Group',
          memberName: m.commissionAgreement.member.name || m.fullName || m.name || 'Member',
          memberSignedAt,
          organizerName: organizerName || 'Organizer',
          organizerSignedAt,
          tiers,
          currency: gData?.currency || '',
        });

        await adminDb.collection('documents').add({
          name: agreementDoc.name, type: agreementDoc.type, size: agreementDoc.size, url: agreementDoc.url,
          storagePath: '', category: 'Contracts',
          organizerId,
          uploadedBy: 'system', source: 'admin', visibleTo: [m.userId],
          createdAt: new Date(),
        });
        results.push({ member: m.id, status: 'created' });
      } catch (e: any) {
        results.push({ member: m.id, status: 'error', error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (e: any) {
    console.error('backfill-commission-agreement-docs error:', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
