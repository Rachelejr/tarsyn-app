export type MinistryStatus = "active" | "inactive";

export interface Ministry {
  id: string;
  organizerId: string;
  churchId: string;

  name: string;
  description: string;
  category: string;
  status: MinistryStatus;

  leaderId: string | null;
  leaderName: string | null;

  memberIds: string[];
  memberCount: number;

  meetingSchedule: string | null;

  parentMinistryId: string | null;
  parentMinistryName: string | null;

  createdAt: number;
  updatedAt: number;
}

export interface MinistryFormValues {
  name: string;
  description: string;
  category: string;
  status: MinistryStatus;
  leaderId: string | null;
  meetingSchedule: string;
  parentMinistryId: string | null;
}

export const SUGGESTED_MINISTRY_CATEGORIES = [
  "Word / Teaching",
  "Prayer",
  "Worship",
  "Dance",
  "Children's Ministry",
  "Youth Ministry",
  "Family Ministry",
  "Adults / Seniors Ministry",
  "Women's / Men's Ministry",
  "Evangelism",
];
