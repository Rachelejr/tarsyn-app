// src/types/financeV2.ts
//
// Phase 1 of the full church accounting system: Funds + Transfers.
//
//  - funds/{fundId} — one document per fund, seeded once with the 9 fixed
//    funds below. Each keeps a CACHED balance, kept correct by updating it
//    inside the same Firestore transaction that writes a transfer, income,
//    or expense entry — never computed by summing history on every page
//    load (that would get slow and is prone to drift once expenses/income
//    are wired to funds in later phases).
//  - fundTransfers/{id} — a movement of money INTO or BETWEEN funds. A
//    transfer is never counted as income: money arriving in a fund from
//    "Bank" (an external, untracked source — the church's own bank account,
//    outside this system) or from another fund is tracked here, completely
//    separate from churches/{churchId}/income.
//
// Petite Caisse is deliberately just another fund here (type 'cashBox'),
// not a separate collection — it reuses the exact same balance/transfer/
// expense machinery as every other fund, with its own dedicated screen
// built on top in a later phase.

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
// system for the first time (e.g. moving cash from the bank into Petty
// Cash); it is still never counted as income.
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
