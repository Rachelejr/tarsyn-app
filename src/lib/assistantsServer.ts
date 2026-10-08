// Server-only helpers for organizer assistants (Firebase Admin SDK).
/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { createHash, randomBytes } from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { effectiveStatus, type AssistantPublic, type AssistantRights } from '@/lib/assistants';

export const ORGANIZER_ROLES = ['admin', 'superadmin', 'organizer'];

export function newInviteToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashToken(token) };
}
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Organizer's display name and email, from their user doc / auth record. */
export async function organizerIdentity(uid: string): Promise<{ name: string; email: string; role: string }> {
  const snap = await adminDb.collection('users').doc(uid).get();
  const d = snap.exists ? (snap.data() as any) : {};
  let email = String(d.email || '');
  let name = String(d.name || '');
  if (!name || !email) {
    try {
      const u = await adminAuth.getUser(uid);
      name = name || u.displayName || '';
      email = email || u.email || '';
    } catch { /* keep what we have */ }
  }
  return { name: name || email || 'Your organizer', email, role: String(d.role || '') };
}

export function cleanRights(v: any): AssistantRights {
  return { manageMembers: v?.manageMembers === true, referrals: v?.referrals === true };
}

export function toPublic(id: string, d: any): AssistantPublic {
  const ms = (t: any) => (t?.toMillis ? t.toMillis() : typeof t === 'number' ? t : null);
  const base = {
    id,
    firstName: d.firstName || '', lastName: d.lastName || '', gender: d.gender || '',
    email: d.email || '', phone: d.phone || '', country: d.country || '',
    title: d.title || 'Assistant', lang: d.lang || 'en',
    rights: cleanRights(d.rights),
    groupIds: Array.isArray(d.groupIds) ? d.groupIds.filter((x: unknown) => typeof x === 'string') : [],
    accessUntil: d.accessUntil || null,
    status: d.status || 'invited',
    invitedAt: ms(d.invitedAt), acceptedAt: ms(d.acceptedAt), inviteExpiresAt: ms(d.inviteExpiresAt),
  } as AssistantPublic;
  return { ...base, status: effectiveStatus(base) };
}

/** The organizer's assistants that still take a place (not removed). */
export async function listAssistants(organizerId: string) {
  const snap = await adminDb.collection('assistants').where('organizerId', '==', organizerId).get();
  return snap.docs.filter(d => d.data().status !== 'removed');
}

/** The organizer's groups, each with the assistant it is assigned to (if any). */
export async function organizerGroups(organizerId: string, assistants?: FirebaseFirestore.QueryDocumentSnapshot[]) {
  const [gSnap, aDocs] = await Promise.all([
    adminDb.collection('groups').where('organizerId', '==', organizerId).get(),
    assistants ? Promise.resolve(assistants) : listAssistants(organizerId),
  ]);
  const owner: Record<string, { id: string; name: string }> = {};
  aDocs.forEach(d => {
    const a = d.data() as any;
    (Array.isArray(a.groupIds) ? a.groupIds : []).forEach((g: string) => { owner[g] = { id: d.id, name: `${a.firstName || ''} ${a.lastName || ''}`.trim() }; });
  });
  return gSnap.docs
    .map(g => ({ id: g.id, name: String((g.data() as any).name || 'Group'), assistantId: owner[g.id]?.id || null, assistantName: owner[g.id]?.name || null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Checks a list of group ids for an assistant: every group must belong to the
 * organizer and must not already be assigned to ANOTHER assistant.
 * Returns the cleaned list, or an error message.
 */
export async function checkGroupIds(organizerId: string, raw: unknown, forAssistantId: string | null): Promise<{ ids: string[] } | { error: string }> {
  const ids = Array.from(new Set((Array.isArray(raw) ? raw : []).filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 200))).slice(0, 200);
  if (ids.length === 0) return { error: 'Choose at least one group for this assistant.' };
  const groups = await organizerGroups(organizerId);
  const byId = new Map(groups.map(g => [g.id, g]));
  for (const id of ids) {
    const g = byId.get(id);
    if (!g) return { error: 'One of the selected groups is not yours.' };
    if (g.assistantId && g.assistantId !== forAssistantId) return { error: `${g.name} is already managed by ${g.assistantName}. A group can have only one assistant.` };
  }
  return { ids };
}
