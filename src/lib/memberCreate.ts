/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { adminDb } from '@/lib/firebase-admin';
import { getPlanTierFromPriceId, getPlanLimits, type PlanTier } from '@/lib/planLimits';

// Server-side equivalents of the rules Add Member applies in the browser,
// so a member created from an accepted join request is identical to one
// created with Add Member (same TYN-ID format, position rule, invite code
// and plan limit).

/** Same lookup order as Add Member's getGroupContributionAmount. */
export function groupContributionAmount(group: Record<string, unknown> | undefined | null): number | null {
  if (!group) return null;
  const g = group as Record<string, any>;
  const amount = g?.contributionSettings?.amount ?? g?.contribution ?? g?.amountPerMember ?? g?.weeklyAmount ?? null;
  if (typeof amount === 'number') return amount;
  const parsed = amount ? parseFloat(String(amount)) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/** Highest position in the group + 1 (same rule as Add Member). */
export async function nextPositionForGroup(groupId: string): Promise<number> {
  const snap = await adminDb.collection('members').where('groupId', '==', groupId).get();
  let highest = 0;
  snap.forEach(d => {
    const pos = Number(d.data().position) || 0;
    if (pos > highest) highest = pos;
  });
  return highest + 1;
}

/** TYN-ID = first-name initial + last-name initial + '-' + 3-digit position, e.g. JD-001. */
export function buildTynId(firstName: string, lastName: string, position: number): string {
  const first = firstName.trim();
  const last = lastName.trim();
  const fi = first[0]?.toUpperCase() || '';
  const li = last[0]?.toUpperCase() || fi;
  return fi + li + '-' + String(position).padStart(3, '0');
}

/** 8-character upper-case code, unique across members.inviteCode. */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    if (code.length < 8) continue;
    const clash = await adminDb.collection('members').where('inviteCode', '==', code).limit(1).get();
    if (clash.empty) return code;
  }
  throw new Error('Could not generate a unique invite code');
}

/** Organizer's plan tier, same rule as getOrganizerPlanTier in planLimits.ts. */
export async function organizerPlanTier(uid: string): Promise<PlanTier> {
  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    const subscription = snap.exists ? (snap.data() as Record<string, any>)?.subscription : null;
    if (subscription?.status !== 'active' && subscription?.status !== 'trialing') return 'free';
    return getPlanTierFromPriceId(subscription?.plan);
  } catch {
    return 'free';
  }
}

/** null when the organizer may add one more member, otherwise the message to show. */
export async function memberLimitError(organizerId: string): Promise<string | null> {
  const tier = await organizerPlanTier(organizerId);
  const limits = getPlanLimits(tier);
  if (limits.maxMembers === null) return null;
  const count = (await adminDb.collection('members').where('organizerId', '==', organizerId).get()).size;
  if (count < limits.maxMembers) return null;
  return `You've reached the ${limits.maxMembers} members limit for your ${limits.displayName} plan. Please upgrade your plan to add more.`;
}
