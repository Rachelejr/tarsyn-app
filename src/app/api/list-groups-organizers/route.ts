import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Read-only diagnostic: lists every group with its name and organizerId,
// so we can compare against the uid of the account that's being tested.
export async function GET() {
  try {
    const groupsSnap = await adminDb.collection('groups').get();
    const groups = groupsSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name || '(no name)',
      organizerId: d.data().organizerId || null,
      adminId: d.data().adminId || null,
    }));
    return NextResponse.json({ groups, total: groups.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to list groups' }, { status: 500 });
  }
}
