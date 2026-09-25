// src/types/hr.ts
//
// Human Resources — groups everything about PEOPLE who are not yet full
// church members (or aren't members at all) into one place: New Converts,
// Visitors, and Affiliation Requests. Member Birthdays are shown here too,
// computed from churchMembers' optional dateOfBirth field, but are not a
// separate collection — Members stays the source of truth for its own
// records.
//
// Data lives at:
//   churches/{churchId}/newConverts/{id}
//   churches/{churchId}/visitors/{id}
//   churches/{churchId}/affiliationRequests/{id}

export interface NewConvert {
  id: string;
  organizerId: string;
  churchId: string;
  fullName: string;
  phone: string;
  email: string;
  convertedOn: string; // yyyy-mm-dd
  notes: string;
  createdAt: number;
}

export interface Visitor {
  id: string;
  organizerId: string;
  churchId: string;
  fullName: string;
  phone: string;
  email: string;
  visitDate: string; // yyyy-mm-dd
  invitedBy: string;
  notes: string;
  createdAt: number;
}

export type AffiliationStatus = 'pending' | 'approved' | 'declined';

export interface AffiliationRequest {
  id: string;
  organizerId: string;
  churchId: string;
  fullName: string;
  phone: string;
  email: string;
  reason: string;
  status: AffiliationStatus;
  createdAt: number;
}

export interface NewConvertFormValues {
  fullName: string;
  phone: string;
  email: string;
  convertedOn: string;
  notes: string;
}

export interface VisitorFormValues {
  fullName: string;
  phone: string;
  email: string;
  visitDate: string;
  invitedBy: string;
  notes: string;
}

export interface AffiliationRequestFormValues {
  fullName: string;
  phone: string;
  email: string;
  reason: string;
}
