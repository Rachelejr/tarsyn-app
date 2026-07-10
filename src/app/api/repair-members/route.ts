import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

function computeNewTynId(fullName: string, sequence: number): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.[0]?.toUpperCase() || 'X';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() || firstInitial : firstInitial;
  const seq = String(sequence).padStart(3, '0');
  return firstInitial + lastInitial + '-' + seq;
}

function isOldFormatTynId(tynId: string): boolean {
  if (!tynId) return true;
  return !/^[A-Z]{2}-\d{3}$/.test(tynId);
}

async function scanMembers() {
  const membersSnap = await adminDb.collection('members').get();
  const byGroup: Record<string, any[]> = {};

  for (const doc of membersSnap.docs) {
    const data = doc.data();
    const groupId = data.groupId || 'no-group';
    if (!byGroup[groupId]) byGroup[groupId] = [];
    byGroup[groupId].push({ id: doc.id, ...data });
  }

  const broken: any[] = [];

  for (const groupId in byGroup) {
    const members = byGroup[groupId].sort((a, b) => (a.position || 0) - (b.position || 0));
    let seq = 1;
    for (const m of members) {
      const needsOrganizerFix = !m.organizerId;
      const needsTynIdFix = isOldFormatTynId(m.tynId);

      if (needsOrganizerFix || needsTynIdFix) {
        const displayName = m.name || m.fullName || '(no name)';
        broken.push({
          id: m.id,
          fullName: displayName,
          groupId: m.groupId || null,
          currentTynId: m.tynId || null,
          newTynId: needsTynIdFix ? computeNewTynId(displayName, seq) : (m.tynId || null),
          needsOrganizerFix,
          needsTynIdFix,
        });
      }
      seq++;
    }
  }

  return { broken, total: membersSnap.size };
}

export async function GET() {
  try {
    const { broken, total } = await scanMembers();
    return NextResponse.json({ broken, total });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to scan members' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { broken } = await scanMembers();
    const fixed: any[] = [];
    const stillBroken: any[] = [];
    const groupCache: Record<string, string | null> = {};

    for (const item of broken) {
      const updates: Record<string, any> = {};
      let organizerId: string | null = null;

      if (item.needsOrganizerFix) {
        const groupId = item.groupId;
        if (!groupId) {
          stillBroken.push({ id: item.id, fullName: item.fullName, reason: 'No groupId on this member either' });
          continue;
        }

        if (!(groupId in groupCache)) {
          const groupDoc = await adminDb.collection('groups').doc(groupId).get();
          const groupData = groupDoc.exists ? groupDoc.data() : null;
          groupCache[groupId] = groupData?.organizerId || groupData?.adminId || null;
        }

        organizerId = groupCache[groupId];
        if (!organizerId) {
          stillBroken.push({ id: item.id, fullName: item.fullName, reason: "Linked group has no organizerId either" });
          continue;
        }
        updates.organizerId = organizerId;
      }

      if (item.needsTynIdFix) {
        updates.tynId = item.newTynId;
      }

      if (Object.keys(updates).length > 0) {
        await adminDb.collection('members').doc(item.id).update(updates);
      }

      fixed.push({
        id: item.id,
        fullName: item.fullName,
        organizerId: organizerId || undefined,
        tynId: item.needsTynIdFix ? item.newTynId : undefined,
      });
    }

    return NextResponse.json({
      fixed,
      stillBroken,
      fixedCount: fixed.length,
      stillBrokenCount: stillBroken.length,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to repair members' }, { status: 500 });
  }
}
