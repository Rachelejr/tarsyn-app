import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Cette route permet a la page publique /join/[code] de retrouver un membre
// invite SANS que la collection Firestore "members" soit lisible par tout le
// monde. Seuls les champs strictement necessaires a l'ecran d'inscription
// sont renvoyes - jamais le document complet (pas de organizerId, pas de
// paiements, pas de telephone/notes internes, etc.).
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const codeStr = code.trim().toUpperCase();
    const snap = await adminDb
      .collection('members')
      .where('inviteCode', '==', codeStr)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ found: false });
    }

    const memberDoc = snap.docs[0];
    const data = memberDoc.data();

    let groupName = '';
    let commissionTiers: any[] = [];
    let currency = '';
    if (data.groupId) {
      const groupSnap = await adminDb.collection('groups').doc(data.groupId).get();
      if (groupSnap.exists) {
        const groupData = groupSnap.data() as any;
        groupName = groupData?.name || '';
        currency = groupData?.currency || '';
        commissionTiers = Array.isArray(groupData?.commissionAgreement?.tiers) ? groupData.commissionAgreement.tiers : [];
        // Groups created before commission tiers existed have none saved on
        // the group itself - fall back to the organizer's current default
        // tiers so every new member still sees real tiers to sign.
        if (commissionTiers.length === 0) {
          const organizerId = groupData?.organizerId || groupData?.adminId;
          if (organizerId) {
            try {
              const orgSnap = await adminDb.collection('users').doc(organizerId).get();
              const orgTiers = orgSnap.exists ? (orgSnap.data() as any)?.commissionTiers : null;
              if (Array.isArray(orgTiers) && orgTiers.length > 0) commissionTiers = orgTiers;
            } catch (e) { /* keep commissionTiers empty on failure */ }
          }
        }
      }
    }

    // Members already sign the commission agreement once, at join-confirm -
    // if this member already has one on file, do not ask them to sign again.
    const alreadySignedCommission = !!data.commissionAgreement?.member?.signedAt;

    return NextResponse.json({
      found: true,
      memberId: memberDoc.id,
      fullName: data.fullName || data.name || '',
      email: data.email || '',
      groupId: data.groupId || null,
      groupName,
      tynId: data.tynId || '',
      position: data.position || null,
      status: data.status || 'pending',
      payoutDate: data.payoutDate || null,
      country: data.country || '',
      memberType: data.memberType || '',
      alreadyRegistered: !!data.userId,
      commissionTiers,
      currency,
      alreadySignedCommission,
    });
  } catch (err: any) {
    console.error('join-lookup error:', err);
    return NextResponse.json({ error: err?.message || 'Lookup failed' }, { status: 500 });
  }
}