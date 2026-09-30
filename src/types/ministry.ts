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

// Suggested ministry categories (a church can still type its own).
// "Church Committee" is handled separately and pinned first on the
// Ministries page.
export const SUGGESTED_MINISTRY_CATEGORIES = [
  "Word / Teaching",
  "Sunday School",
  "Discipleship",
  "Prayer",
  "Intercession",
  "Worship",
  "Choir",
  "Music / Musicians",
  "Dance",
  "Ushers",
  "Protocol / Security",
  "Hospitality / Welcome",
  "Men's Ministry",
  "Women's Ministry",
  "Couples / Marriage",
  "Family Ministry",
  "Children's Ministry",
  "Youth Ministry",
  "Young Adults",
  "Adults / Seniors Ministry",
  "Evangelism",
  "Missions",
  "Prison Ministry",
  "Hospital Visitation",
  "Counseling / Pastoral Care",
  "Social / Charity",
  "Deacons / Deaconesses",
  "Cleaning / Maintenance",
  "Media / Sound",
  "Transportation",
];
