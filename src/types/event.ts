// src/types/event.ts
// Stored at churches/{churchId}/events/{eventId} (per-church subcollection,
// same pattern as ministries/families).

export interface ChurchEvent {
  id: string;
  organizerId: string;
  churchId: string;

  title: string;
  description: string;
  category: string; // e.g. "Service", "Meeting", "Conference", "Social" — free text

  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM", 24h — optional, can be ""
  location: string | null;

  startAt: number; // epoch ms, computed from date+time — used for sorting/upcoming vs past

  createdAt: number;
  updatedAt: number;
}

export interface EventFormValues {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
}

export const SUGGESTED_EVENT_CATEGORIES = [
  "Service",
  "Meeting",
  "Conference",
  "Social",
  "Training",
  "Outreach",
  "Youth Event",
  "Prayer Gathering",
];
