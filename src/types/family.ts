// src/types/family.ts
// Stored at churches/{churchId}/families/{familyId} (per-church subcollection,
// same pattern as ministries).

export interface Family {
  id: string;
  organizerId: string;
  churchId: string;

  name: string; // e.g. "The Joseph Family"
  headOfHouseholdId: string | null; // references churchMembers doc id
  headOfHouseholdName: string | null; // denormalized for display

  memberIds: string[]; // references churchMembers doc ids (includes head of household)
  memberCount: number; // denormalized, kept in sync

  address: string | null;
  notes: string | null;

  createdAt: number;
  updatedAt: number;
}

export interface FamilyFormValues {
  name: string;
  headOfHouseholdId: string | null;
  address: string;
  notes: string;
}
