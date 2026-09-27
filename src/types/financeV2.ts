// src/types/financeV2.ts
//
// Full church accounting system, built progressively.
//
// PHASE 1 (done): Funds + Transfers.
//  - funds/{fundId} — one document per fund, seeded once with the 9 fixed
//    funds below. Each keeps a CACHED balance, kept correct by updating it
//    inside the same Firestore transaction that writes a transfer, income,
//    or expense entry — never computed by summing history on every page
//    load.
//  - fundTransfers/{id} — a movement of money INTO or BETWEEN funds. Never
//    counted as income (e.g. Bank → Petty Cash, or General → Social).
//
// PHASE 2 (this update): Income.
//  - income/{id} — every income transaction, in one of 16 categories,
//    always linked to exactly one fund. Recording an income entry credits
//    that fund's balance directly, inside the same transaction that also
//    atomically generates the entry's receipt number (REC-2026-000001) —
//    two churches recording income at the same instant can never collide
//    on a receipt number or corrupt a fund balance.
//  - No permanent deletion: an income entry can be CANCELLED (status
//    becomes 'cancelled', the fund balance is reversed in the same
//    transaction, and who/when/why is recorded on the entry itself) —
//    never hard-deleted.
//  - counters/{name} — atomic sequence counters (e.g. "receipts_2026")
//    used to generate receipt numbers without ever duplicating one.
//
// Petite Caisse is deliberately just another fund here (type 'cashBox'),
// not a separate collection — it reuses the exact same balance/transfer/
// income/expense machinery as every other fund, with its own dedicated
// ledger screen built on top (Phase 4).

export type FundType =
  | 'general'
  | 'social'
  | 'missions'
  | 'evangelism'
  | 'construction'
  | 'youth'
  | 'children'
  | 'special'
  | 'cashBox';

export const FUND_TYPE_LABELS: Record<FundType, string> = {
  general: 'General Fund',
  social: 'Social Fund',
  missions: 'Missions Fund',
  evangelism: 'Evangelism Fund',
  construction: 'Construction Fund',
  youth: 'Youth Fund',
  children: 'Children Fund',
  special: 'Special Fund',
  cashBox: 'Petty Cash (Petite Caisse)',
};

// The fixed set of funds every church gets, seeded once. Order here is the
// display order everywhere.
export const FIXED_FUND_TYPES: FundType[] = [
  'general', 'social', 'missions', 'evangelism',
  'construction', 'youth', 'children', 'special', 'cashBox',
];

export interface Fund {
  id: string; // same as the FundType, e.g. "social" — one fund per type, no duplicates
  organizerId: string;
  churchId: string;
  type: FundType;
  name: string;
  balance: number;
  createdAt: number;
  updatedAt: number;
}

// "bank" is a special, untracked source — the church's real bank account,
// outside this system. A transfer FROM "bank" is money entering the funds
// system for the first time; it is still never counted as income.
export type TransferParty = FundType | 'bank';

export interface FundTransfer {
  id: string;
  organizerId: string;
  churchId: string;
  fromFund: TransferParty;
  toFund: TransferParty;
  amount: number;
  reason: string;
  recordedBy: string;
  createdAt: number;
}

export interface TransferFormValues {
  fromFund: TransferParty;
  toFund: FundType;
  amount: string;
  reason: string;
}

// --- Phase 2: Income ------------------------------------------------------

export type IncomeCategoryV2 =
  | 'tithes'
  | 'offerings'
  | 'donations'
  | 'collections'
  | 'specialContributions'
  | 'events'
  | 'conferences'
  | 'seminars'
  | 'youthActivities'
  | 'childrenActivities'
  | 'missions'
  | 'evangelism'
  | 'socialFund'
  | 'construction'
  | 'specialFund'
  | 'other';

export const INCOME_CATEGORY_V2_LABELS: Record<IncomeCategoryV2, string> = {
  tithes: 'Tithes',
  offerings: 'Offerings',
  donations: 'Donations',
  collections: 'Collections',
  specialContributions: 'Special Contributions',
  events: 'Events',
  conferences: 'Conferences',
  seminars: 'Seminars',
  youthActivities: 'Youth Activities',
  childrenActivities: 'Children Activities',
  missions: 'Missions',
  evangelism: 'Evangelism',
  socialFund: 'Social Fund Income',
  construction: 'Construction',
  specialFund: 'Special Fund Income',
  other: 'Other Income',
};

export const INCOME_CATEGORIES_V2: IncomeCategoryV2[] = [
  'tithes', 'offerings', 'donations', 'collections', 'specialContributions',
  'events', 'conferences', 'seminars', 'youthActivities', 'childrenActivities',
  'missions', 'evangelism', 'socialFund', 'construction', 'specialFund', 'other',
];

export type PaymentMethod = 'cash' | 'check' | 'card' | 'bankTransfer' | 'mobileMoney' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  card: 'Card',
  bankTransfer: 'Bank Transfer',
  mobileMoney: 'Mobile Money',
  other: 'Other',
};

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'check', 'card', 'bankTransfer', 'mobileMoney', 'other'];

export type IncomeStatus = 'active' | 'cancelled';

export interface IncomeEntryV2 {
  id: string;
  organizerId: string;
  churchId: string;

  category: IncomeCategoryV2;
  amount: number;
  date: string; // yyyy-mm-dd — the date the income actually happened
  fund: FundType;
  paymentMethod: PaymentMethod;
  description: string;
  reference: string; // e.g. check number, transaction reference
  contributorName: string; // optional — who gave it, if relevant

  receiptNumber: string; // e.g. "REC-2026-000001"

  status: IncomeStatus;
  cancelledBy: string | null;
  cancelledAt: number | null;
  cancelReason: string | null;

  recordedBy: string;
  createdAt: number;
}

export interface IncomeFormValuesV2 {
  category: IncomeCategoryV2;
  amount: string;
  date: string;
  fund: FundType;
  paymentMethod: PaymentMethod;
  description: string;
  reference: string;
  contributorName: string;
}
