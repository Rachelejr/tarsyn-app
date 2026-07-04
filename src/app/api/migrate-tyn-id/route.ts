import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

function computeNewTynId(fullName: string, sequence: number): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.[0]?.toUpperCase() || 'X';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() || firstInitial : firstInitial;
  const seq = String(sequence).padStart(3, '0');
  return firstInitial + lastInitial + '-' + seq;
}

function isOldFormat(tynId: string): boolean {
  if (!tynId) return true;
  return !/^[A-Z]{2}-\d{3}$/.test(tynId);
}

async function buildMigrationPlan() {
  const membersSnap = await adminDb.collection('members').get();
  const byGroup: Record<string, any[]> = {};
  for (const doc of membersSnap.docs) {
    const data = doc.data();
    const groupId = data.groupId || 'no-group';
    if (!byGroup[groupId]) byGroup[groupId] = [];
    byGroup[groupId].push({ id: doc.id, ...data });
  }

  const plan: any[] = [];
  for (const groupId in byGroup) {
    const members = byGroup[groupId].sort((a, b) => (a.position || 0) - (b.position || 0));
    let seq = 1;
    for (const m of members) {
      if (isOldFormat(m.tynId)) {
        plan.push({
          docId: m.id,
          fullName: m.fullName || '(no name)',
          oldId: m.tynId || '(none)',
          newId: computeNewTynId(m.fullName, seq),
        });
      }
      seq++;
    }
  }
  return plan;
}
export async function GET() {
  try {
    const plan = await buildMigrationPlan();
    return NextResponse.json({ preview: plan });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to scan members' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const plan = await buildMigrationPlan();
    const migrated: any[] = [];
    for (const item of plan) {
      await adminDb.collection('members').doc(item.docId).update({ tynId: item.newId });
      migrated.push({ fullName: item.fullName, oldId: item.oldId, newId: item.newId });
    }
    return NextResponse.json({ migrated, migratedCount: migrated.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to migrate TYN-IDs' }, { status: 500 });
  }
}
