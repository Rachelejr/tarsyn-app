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
