// Single source of truth for what each UNIMUNITY subscription plan
// actually includes, and helpers to read an organizer's current plan
// and enforce its limits. Keep this file's price-id map in sync with
// the live Stripe price IDs set in Vercel's NEXT_PUBLIC_STRIPE_PRICE_*
// env vars whenever those are rotated.
import { collection, doc, getDoc, getDocs, query, where, Firestore } from 'firebase/firestore';

export type PlanTier = 'starter' | 'growth' | 'pro' | 'enterprise' | 'free';

// Internal plan ids: 'growth' is the tier displayed to users as "Pro",
// and 'pro' is the tier displayed as "Business" (legacy naming kept to
// avoid breaking the existing Stripe price mapping).
export const PRICE_ID_TO_PLAN: Record<string, PlanTier> = {
  // Live prices (current, added Sept 2026)
  'price_1UBpHJJBtj4UALaP0ixJH76K': 'starter',
  'price_1UBpIDJBtj4UALaPA4jGuCnE': 'starter',
  'price_1UBpIJJBtj4UALaPO30XzzPZ': 'growth',
  'price_1UBpIPJBtj4UALaPflRhiEHF': 'growth',
  'price_1UBpIXJBtj4UALaPHgymTLFb': 'pro',
  'price_1UBpIdJBtj4UALaPbeDdwED6': 'pro',
  // Older/legacy prices kept so existing subscribers on them still
  // resolve to the right tier instead of falling back to 'free'.
  'price_1TipthJk3DYYTrgp7LEDrLgE': 'starter',
  'price_1Tiq1IJk3DYYTrgp2VmhXb6J': 'growth',
  'price_1Tiq3AJk3DYYTrgpuElHGRxd': 'pro',
  'price_1TjVjQJk3DYYTrgpEDu8Ofyl': 'starter',
  'price_1TjVjQJk3DYYTrgpEDu8OfyI': 'starter',
  'price_1TjVjQJk3DYYTrgpOaG0DWjU': 'starter',
  'price_1TjX5gJk3DYYTrgpw5ngPx4P': 'growth',
  'price_1TjX5gJk3DYYTrgp6xy976sv': 'growth',
  'price_1TjXA0Jk3DYYTrgpL0cf12Mw': 'pro',
  'price_1TjXA0Jk3DYYTrgp6shxK6SC': 'pro',
  'price_1TkzC7JBtj4UALaPm0ZOEB1T': 'starter',
  'price_1TkzC7JBtj4UALaPhySF1Nb1': 'starter',
  'price_1TkzC9JBtj4UALaPZZIBDCV3': 'growth',
  'price_1TkzC8JBtj4UALaPtELbrfO9': 'growth',
  'price_1TkzC3JBtj4UALaPFseCERie': 'pro',
  'price_1TkzC2JBtj4UALaPBvORrRyy': 'pro',
};

export interface PlanLimitConfig {
  displayName: string;
  maxMembers: number | null; // null = unlimited
  maxGroups: number | null;  // null = unlimited
  whiteLabel: boolean;
  exportTools: boolean;
}

// Limits applied to an organizer who has no active paid subscription yet
// (still on the 10-day trial, or trial expired) mirror the Starter tier,
// since Starter is the lowest paid tier and there is no more "Free" plan.
export const PLAN_LIMITS: Record<PlanTier, PlanLimitConfig> = {
  free:       { displayName: 'Free Trial', maxMembers: 150,  maxGroups: 2,  whiteLabel: false, exportTools: false },
  starter:    { displayName: 'Starter',    maxMembers: 150,  maxGroups: 2,  whiteLabel: false, exportTools: false },
  growth:     { displayName: 'Pro',        maxMembers: 500,  maxGroups: 10, whiteLabel: true,  exportTools: true },
  pro:        { displayName: 'Business',   maxMembers: 2000, maxGroups: 50, whiteLabel: true,  exportTools: true },
  enterprise: { displayName: 'Enterprise', maxMembers: null, maxGroups: null, whiteLabel: true, exportTools: true },
};

export function getPlanTierFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'free';
  return PRICE_ID_TO_PLAN[priceId] || 'free';
}

export function getPlanLimits(tier: PlanTier): PlanLimitConfig {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
}

// Reads the organizer's current plan tier from their user doc. Treats
// anything other than an active or trialing subscription as 'free'
// (Starter-level limits), matching TrialGuard's own active/trialing check.
export async function getOrganizerPlanTier(db: Firestore, uid: string): Promise<PlanTier> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    const subscription = userSnap.exists() ? (userSnap.data() as any)?.subscription : null;
    if (subscription?.status !== 'active' && subscription?.status !== 'trialing') return 'free';
    return getPlanTierFromPriceId(subscription?.plan);
  } catch (e) {
    console.error('getOrganizerPlanTier failed, defaulting to free:', e);
    return 'free';
  }
}

export async function countOrganizerGroups(db: Firestore, uid: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'groups'), where('organizerId', '==', uid)));
  return snap.size;
}

export async function countOrganizerMembers(db: Firestore, uid: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'members'), where('organizerId', '==', uid)));
  return snap.size;
}

export function planLimitMessage(kind: 'members' | 'groups', tier: PlanTier, limit: number): string {
  const name = getPlanLimits(tier).displayName;
  const noun = kind === 'members' ? 'members' : 'groups';
  return `You've reached the ${limit} ${noun} limit for your ${name} plan. Please upgrade your plan to add more.`;
}
