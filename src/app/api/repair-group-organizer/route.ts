import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

async function scanGroups() {
  const groupsSnap = await adminDb.collection('groups').get();
  const broken: any[] = [];

  groupsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const hasOrganizerId = !!data.organizerId;
    const hasAdminId = !!data.adminId;

    if (!hasOrganizerId && hasAdminId) {
      broken.push({
        id: doc.id,
        name: data.name || '(no name)',
        currentOrganizerId: data.organizerId || null,
        adminId: data.adminId,
      });
    }
  });

  return { broken, total: groupsSnap.size };
}

// GET = read-only preview, lists every group that has adminId but no organizerId.
// Nothing is changed until POST is called.
export async function GET() {
  try {
    const { broken, total } = await scanGroups();
    return NextResponse.json({ broken, brokenCount: broken.length, total });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to scan groups' }, { status: 500 });
  }
}

// POST = actually backfill organizerId = adminId on every affected group.
// Safe to run more than once - it only touches groups missing organizerId.
export async function POST() {
  try {
    const { broken } = await scanGroups();
    const fixed: any[] = [];

    for (const item of broken) {
      await adminDb.collection('groups').doc(item.id).update({ organizerId: item.adminId });
      fixed.push({ id: item.id, name: item.name, organizerId: item.adminId });
    }

    return NextResponse.json({ fixed, fixedCount: fixed.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to repair groups' }, { status: 500 });
  }
}
