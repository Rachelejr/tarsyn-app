import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const membersSnap = await adminDb.collection('members').get();
    const broken: any[] = [];

    for (const doc of membersSnap.docs) {
      const data = doc.data();
      if (!data.organizerId) {
        broken.push({ id: doc.id, fullName: data.fullName || '(no name)', groupId: data.groupId || null });
      }
    }

    return NextResponse.json({ broken, total: membersSnap.size });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to scan members' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const membersSnap = await adminDb.collection('members').get();
    const fixed: any[] = [];
    const stillBroken: any[] = [];
    const groupCache: Record<string, string | null> = {};

    for (const doc of membersSnap.docs) {
      const data = doc.data();
      if (data.organizerId) continue;

      const groupId = data.groupId;
      if (!groupId) {
        stillBroken.push({ id: doc.id, fullName: data.fullName || '(no name)', reason: 'No groupId on this member either' });
        continue;
      }

      if (!(groupId in groupCache)) {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();
        const groupData = groupDoc.exists ? groupDoc.data() : null;
        groupCache[groupId] = groupData?.organizerId || groupData?.adminId || null;
      }

      const organizerId = groupCache[groupId];
      if (!organizerId) {
        stillBroken.push({ id: doc.id, fullName: data.fullName || '(no name)', reason: 'Linked group has no organizerId either' });
        continue;
      }

      await adminDb.collection('members').doc(doc.id).update({ organizerId });
      fixed.push({ id: doc.id, fullName: data.fullName || '(no name)', organizerId });
    }

    return NextResponse.json({ fixed, stillBroken, fixedCount: fixed.length, stillBrokenCount: stillBroken.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to repair members' }, { status: 500 });
  }
}