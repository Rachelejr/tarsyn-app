import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Only signed-in platform admins may scan or repair member records.
// Returns null when allowed, or an error response to send back.
async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const authHeader = req.headers.get('authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  try {
    const { uid } = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const role = userDoc.exists ? userDoc.data()?.role : null;
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return null;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}

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

function initialsFor(fullName: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.[0]?.toUpperCase() || 'X';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() || firstInitial : firstInitial;
  return firstInitial + lastInitial;
}

function tynIdMismatch(tynId: string, fullName: string): boolean {
  if (isOldFormatTynId(tynId)) return false;
  const match = tynId.match(/^([A-Z]{2})-(\d{3})$/);
  if (!match) return false;
  const currentInitials = match[1];
  const expectedInitials = initialsFor(fullName);
  return currentInitials !== expectedInitials && expectedInitials !== 'XX';
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
      const displayName = m.name || m.fullName || '(no name)';
      const oldFormat = isOldFormatTynId(m.tynId);
      const mismatch = !oldFormat && tynIdMismatch(m.tynId, displayName);
      const needsTynIdFix = oldFormat || mismatch;

      if (needsOrganizerFix || needsTynIdFix) {
        let newTynId: string | null = m.tynId || null;
        if (oldFormat) {
          newTynId = computeNewTynId(displayName, seq);
        } else if (mismatch) {
          const seqPart = m.tynId.split('-')[1];
          newTynId = initialsFor(displayName) + '-' + seqPart;
        }
        broken.push({
          id: m.id,
          fullName: displayName,
          groupId: m.groupId || null,
          currentTynId: m.tynId || null,
          newTynId,
          needsOrganizerFix,
          needsTynIdFix,
          // Empty shell: no name, no account, no organizer - safe to delete.
          emptyRecord: !m.name && !m.fullName && !m.userId && !m.organizerId && !m.email,
        });
      }
      seq++;
    }
  }

  return { broken, total: membersSnap.size };
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { broken, total } = await scanMembers();
    return NextResponse.json({ broken, total });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to scan members' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { broken } = await scanMembers();
    const fixed: any[] = [];
    const stillBroken: any[] = [];
    const groupCache: Record<string, string | null> = {};

    for (const item of broken) {
      // Empty records are never "repaired" into fake members: delete them instead.
      if (item.emptyRecord) {
        stillBroken.push({ id: item.id, fullName: item.fullName, reason: 'Empty record (no name, no email): use "Delete empty records"' });
        continue;
      }
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

// Deletes EMPTY member records only (no name, no account, no organizer, no
// email). Anything else is refused. Each deleted record is copied to
// deletedMembers first, so it can be restored if ever needed.
export async function DELETE(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const { memberIds } = await req.json().catch(() => ({}));
    if (!Array.isArray(memberIds) || memberIds.length === 0 || memberIds.length > 100) {
      return NextResponse.json({ error: 'Provide 1 to 100 memberIds' }, { status: 400 });
    }
    const deleted: string[] = [];
    const refused: string[] = [];
    for (const id of memberIds) {
      if (typeof id !== 'string') continue;
      const ref = adminDb.collection('members').doc(id);
      const snap = await ref.get();
      if (!snap.exists) continue;
      const m = snap.data() || {};
      const empty = !m.name && !m.fullName && !m.userId && !m.organizerId && !m.email;
      if (!empty) { refused.push(id); continue; }
      await adminDb.collection('deletedMembers').doc(id).set({ ...m, deletedAt: new Date().toISOString(), reason: 'empty record (repair-members)' });
      await ref.delete();
      deleted.push(id);
    }
    return NextResponse.json({ deleted, refused });
  } catch (err) {
    console.error('repair-members DELETE error:', err);
    return NextResponse.json({ error: 'Could not delete records' }, { status: 500 });
  }
}
