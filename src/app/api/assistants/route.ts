import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUid, forbidden } from '@/lib/apiAuth';
import { MAX_ASSISTANTS } from '@/lib/assistants';
import { listAssistants, organizerGroups, organizerIdentity, ORGANIZER_ROLES, toPublic } from '@/lib/assistantsServer';

// GET - the signed-in organizer's assistants (0, 1 or 2).
export async function GET(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;
    const me = await organizerIdentity(uid);
    if (!ORGANIZER_ROLES.includes(me.role)) return forbidden('Only an organizer can manage assistants.');
    const docs = await listAssistants(uid);
    const assistants = docs
      .map(d => toPublic(d.id, d.data()))
      .sort((a, b) => (a.invitedAt || 0) - (b.invitedAt || 0));
    const groups = await organizerGroups(uid, docs);
    return NextResponse.json({ assistants, groups, max: MAX_ASSISTANTS, organizerName: me.name });
  } catch (err) {
    console.error('assistants list error:', err);
    return NextResponse.json({ error: 'Could not load your assistants.' }, { status: 500 });
  }
}
