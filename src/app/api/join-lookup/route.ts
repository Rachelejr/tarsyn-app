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
    if (data.groupId) {
      const groupSnap = await adminDb.collection('groups').doc(data.groupId).get();
      if (groupSnap.exists) groupName = groupSnap.data()?.name || '';
    }

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
    });
  } catch (err: any) {
    console.error('join-lookup error:', err);
    return NextResponse.json({ error: err?.message || 'Lookup failed' }, { status: 500 });
  }
}