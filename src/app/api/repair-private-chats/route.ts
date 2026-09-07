import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// One-time (safe to re-run) repair: a private chat's participantIds are
// captured once, when the organizer first starts the conversation with a
// member. If that member's Firebase Auth account is ever recreated (they
// redo account setup via a new invite, for example), /api/join-confirm
// stamps a NEW uid onto their `members/{id}.userId` field - but any chat
// created before that keeps the OLD uid forever. Firestore's security
// rules then silently deny that member's read/write on the chat, so their
// chat list stays stuck on "No conversations yet." even though the
// conversation still exists and the organizer can see it fine.
//
// This scans every private chat, matches it back to its member record
// (via a stored memberId when present, or by name + organizer for older
// chats), and fixes participantIds to the member's CURRENT uid. It also
// stamps memberId onto every chat it touches so the app's own code can
// self-heal automatically from now on (see getOrCreatePrivateChat and
// healPrivateChatIfNeeded in src/lib/chat.ts). Idempotent - chats that are
// already correct are skipped, so visiting this URL more than once never
// causes harm.
export async function GET(req: NextRequest) {
  try {
    const chatsSnap = await adminDb.collection('chats').where('type', '==', 'private').get();
    const membersSnap = await adminDb.collection('members').get();
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    const results: any[] = [];

    for (const chatDoc of chatsSnap.docs) {
      const data = chatDoc.data() as any;
      const ids: string[] = Array.isArray(data.participantIds) ? data.participantIds : [];

      try {
        let member: any = null;

        if (data.memberId) {
          member = members.find((m) => m.id === data.memberId) || null;
        }

        if (!member) {
          // Legacy chat with no memberId stamped on it yet: find it by
          // matching one participant as the organizer and the chat's saved
          // name against that organizer's member list.
          const candidates = members.filter(
            (m) => m.organizerId && ids.includes(m.organizerId) && (m.name === data.name || m.fullName === data.name)
          );
          if (candidates.length === 1) member = candidates[0];
        }

        if (!member || !member.userId || !member.organizerId) {
          results.push({ chat: chatDoc.id, status: 'skipped (no matching member found)' });
          continue;
        }

        const correctIds = [member.organizerId, member.userId];
        const alreadyCorrect =
          ids.length === 2 &&
          ids.includes(member.organizerId) &&
          ids.includes(member.userId) &&
          data.memberId === member.id;

        if (alreadyCorrect) {
          results.push({ chat: chatDoc.id, status: 'already correct' });
          continue;
        }

        await chatDoc.ref.update({ participantIds: correctIds, memberId: member.id });
        results.push({
          chat: chatDoc.id,
          status: 'repaired',
          member: member.name || member.fullName || member.id,
          before: ids,
          after: correctIds,
        });
      } catch (e: any) {
        results.push({ chat: chatDoc.id, status: 'error', error: e?.message || String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      totalPrivateChats: chatsSnap.size,
      repaired: results.filter((r) => r.status === 'repaired').length,
      skipped: results.filter((r) => r.status.startsWith('skipped')).length,
      alreadyCorrect: results.filter((r) => r.status === 'already correct').length,
      results,
    });
  } catch (e: any) {
    console.error('repair-private-chats error:', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
