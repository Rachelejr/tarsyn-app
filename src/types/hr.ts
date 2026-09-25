// src/types/hr.ts
//
// Human Resources.
//  - New Converts, Visitors, Affiliation Requests — people not yet full
//    members, tracked directly here.
//  - Member Birthdays — read-only, computed from churchMembers' optional
//    dateOfBirth field.
//  - Monthly Department Reports — every department (Members, and any
//    Ministry such as Children, Youth, Media, Evangelism, Prison Ministry,
//    Cleaning, Kitchen) can submit a monthly report from its own page. It
//    is written here, at churches/{churchId}/departmentReports/{id}, so
//    the HR manager sees every department's report in one place without
//    each department needing to know HR exists.
//
// Data lives at:
//   churches/{churchId}/newConverts/{id}
//   churches/{churchId}/visitors/{id}
//   churches/{churchId}/affiliationRequests/{id}
//   churches/{churchId}/departmentReports/{id}

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

export interface DepartmentReport {
  id: string;
  organizerId: string;
  churchId: string;
  departmentName: string; // e.g. "Members", "Children", "Media", "Kitchen"
  month: string; // yyyy-mm
  summary: string;
  submittedBy: string;
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

export interface DepartmentReportFormValues {
  month: string;
  summary: string;
  submittedBy: string;
}
