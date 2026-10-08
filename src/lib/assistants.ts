// Organizer assistants - shared rules (used by the API and the pages).
//
// An organizer may invite 0, 1 or 2 assistants. An assistant has their own
// account and works ONLY in the groups the organizer assigns to them. A group
// belongs to one assistant at most, so two assistants never share a group
// (Sara never sees Josianne's groups). Two rights are optional.

export const MAX_ASSISTANTS = 2;
export const INVITE_VALID_DAYS = 7;

export const ASSISTANT_TITLES = ['Assistant', 'Treasurer', 'Secretary', 'Co-organizer', 'Other'] as const;
export const ASSISTANT_LANGS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'ht', label: 'Kreyòl' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
] as const;

/** Always included - shown to the organizer, cannot be turned off. */
export const ALWAYS_ALLOWED = [
  'View the dashboard, members, payment grids, documents and receipts of their groups',
  'Tick payments in the grid and use Record Payment',
  'Send reminders',
  'Comment on documents',
  'Reply to members\u2019 messages',
  'Leave a review under their own name',
];

/** Optional - the organizer decides. */
export const OPTIONAL_RIGHTS = [
  { key: 'manageMembers', label: 'Add and edit members', help: 'Add Member, Edit (name, position, payout date...). Never delete.' },
  { key: 'referrals', label: 'Accept or decline join requests', help: 'Join requests proposed by members (referrals).' },
] as const;
export type OptionalRight = (typeof OPTIONAL_RIGHTS)[number]['key'];
export type AssistantRights = Record<OptionalRight, boolean>;

/** Never allowed to an assistant. */
export const NEVER_ALLOWED = [
  'Delete a member, a group, a payment or a document',
  'Stripe (Connect Payments), subscription and commission settings',
  'White Label, Security and the receipt signature',
  'Change the cycle end date or renew a cycle',
  'Repair Members (platform tool)',
];

export type OrganizerGroup = { id: string; name: string; assistantId: string | null; assistantName: string | null };

export type AssistantStatus = 'invited' | 'active' | 'suspended' | 'expired' | 'removed';

export type AssistantPublic = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
  country: string;
  title: string;
  lang: string;
  rights: AssistantRights;
  groupIds: string[];           // the only groups this assistant can work in
  accessUntil: string | null;   // YYYY-MM-DD or null (no end)
  status: AssistantStatus;
  invitedAt: number | null;
  acceptedAt: number | null;
  inviteExpiresAt: number | null;
};

export const STATUS_LABEL: Record<AssistantStatus, string> = {
  invited: 'Invitation sent',
  active: 'Active',
  suspended: 'Suspended',
  expired: 'Access ended',
  removed: 'Removed',
};

/** Effective status, taking the end date and invitation expiry into account. */
export function effectiveStatus(a: { status: AssistantStatus; accessUntil?: string | null; inviteExpiresAt?: number | null }, now = new Date()): AssistantStatus {
  if (a.status === 'removed' || a.status === 'suspended') return a.status;
  const today = now.toISOString().slice(0, 10);
  if (a.accessUntil && a.accessUntil < today) return 'expired';
  if (a.status === 'invited' && a.inviteExpiresAt && a.inviteExpiresAt < now.getTime()) return 'expired';
  return a.status;
}
