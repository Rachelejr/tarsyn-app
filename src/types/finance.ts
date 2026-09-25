// src/types/finance.ts
//
// Church accounting system.
//  - Income is recorded per category (Tithe, Offering, Donation,
//    Collection, Seed, Other) at churches/{churchId}/income/{id}.
//  - Money is then allocated FROM the general income pool INTO one of two
//    funds (Operating / "Petite Caisse" and Social) at
//    churches/{churchId}/fundAllocations/{id}.
//  - Each fund's expenses are recorded separately at
//    churches/{churchId}/expenses/{id}, tagged with which fund they came
//    from.
//  - A fund's balance = sum of its allocations - sum of its expenses.
//  - The unallocated balance = grand total income - sum of all allocations.

export type IncomeCategory = 'tithe' | 'offering' | 'donation' | 'collection' | 'seed' | 'other';

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  tithe: 'Tithe',
  offering: 'Offering',
  donation: 'Donation',
  collection: 'Collection',
  seed: 'Seed Offering',
  other: 'Other',
};

export const INCOME_CATEGORIES: IncomeCategory[] = ['tithe', 'offering', 'donation', 'collection', 'seed', 'other'];

export type FundKey = 'operating' | 'social';

export const FUND_LABELS: Record<FundKey, string> = {
  operating: 'Operating Fund (Petite Caisse)',
  social: 'Social Fund',
};

export interface IncomeEntry {
  id: string;
  organizerId: string;
  churchId: string;
  category: IncomeCategory;
  amount: number;
  note: string;
  createdAt: number;
}

export interface FundAllocation {
  id: string;
  organizerId: string;
  churchId: string;
  fund: FundKey;
  amount: number;
  note: string;
  createdAt: number;
}

export interface ExpenseEntry {
  id: string;
  organizerId: string;
  churchId: string;
  fund: FundKey;
  category: string;
  amount: number;
  description: string;
  createdAt: number;
}

export interface IncomeFormValues {
  category: IncomeCategory;
  amount: string;
  note: string;
}

export interface AllocationFormValues {
  fund: FundKey;
  amount: string;
  note: string;
}

export interface ExpenseFormValues {
  fund: FundKey;
  category: string;
  amount: string;
  description: string;
}
