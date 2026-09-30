'use client';

// src/app/dashboard/church/add-member/page.tsx
//
// Add Member (Church module) - landscape desktop layout.
//
// Layout only: the member creation logic, Firestore structure, photo upload,
// family / ministry / group links, audit log and invitation email are
// unchanged from the previous version.
//
//  - Church sidebar on the left + shared ChurchPageHeader (breadcrumb row,
//    live date/time/weather chips, wide pastel banner with a botanical
//    illustration - no religious symbols).
//  - Uses the full desktop width:
//      row 1  Personal Information (photo + 4-column field grid)
//      row 2  Contact Information | Family Information
//      row 3  Church Information  | Additional Information
//  - Sticky bottom action bar: Back on the left, Save Member on the right,
//    so the save button is always reachable without scrolling.
//  - Tablet: sections stay two columns where they fit. Mobile: one column.
//  - Marital Status lives only in Personal Information, next to the
//    separate Member Status field.
//
// Sept 27 update:
//  - Ministries are read from BOTH places they can live in Firestore:
//    churches/{churchId}/ministries (current) and the older flat
//    churchMinistries collection (still written by the ministry detail
//    page). Sub-ministries are listed as "Parent > Child".
//  - Role list includes Usher (and more). Choosing "Other" for Role or for
//    Member Status opens a text field to type the value.
//  - Selected values (dropdowns, dates) show in bold italic.
//  - After saving: a printable member badge (church logo, photo, name,
//    role, Member ID, member since).
//
// Sept 29 update:
//  - When a ministry is chosen, the new member is also added to that
//    ministry's own member list, so they appear on the Ministries page.
//
// Style rules for this project: responsive styles live in one CSS string
// injected with a <style> tag; no multi-line inline style objects in JSX.

import { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, setDoc, getDoc, getDocs, query, where,
  onSnapshot, updateDoc, arrayUnion, increment, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';
import ChurchPageHeader from '@/components/church/ChurchPageHeader';
import { useChurchBrand } from '@/components/church/useChurchBrand';

const C = {
  pink: '#FDE2E4',
  cream: '#F6EFDD',
  green: '#E2F0CB',
  gold: '#D8B15A',
  goldText: '#8A6D1F',
  text: '#24324A',
  muted: '#68758A',
  white: '#FFFFFF',
  border: 'rgba(216,177,90,0.35)',
  danger: '#B4453E',
  dangerBg: '#FDECEC',
  greenBg: '#E2F0CB',
  greenText: '#3F6B34',
  amberBg: '#FEF3C7',
  amberText: '#92400E',
};

const GENDER_OPTIONS = ['', 'Male', 'Female'];
const MARITAL_OPTIONS = ['', 'Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
const MEMBER_STATUS_OPTIONS = ['Active', 'Inactive', 'New', 'Pending', 'Transferred', 'Visitor', 'Suspended', 'Deceased', 'Other'];
const ROLE_OPTIONS = [
  'Member', 'Usher', 'Usher Leader', 'Choir Member', 'Choir Director', 'Musician', 'Worship Leader',
  'Sunday School Teacher', 'Youth Leader', 'Children Leader', 'Intercessor', 'Evangelist', 'Missionary',
  'Deacon', 'Deaconess', 'Elder', 'Pastor', 'Associate Pastor', 'Secretary', 'Treasurer',
  'Administrator', 'Committee President', 'Leader', 'Other',
];

interface OptionRow { id: string; name: string; }
interface MinistryRow { id: string; name: string; parentId: string | null; }

interface SavedBadge {
  fullName: string;
  memberCode: string;
  role: string;
  photo: string;
  since: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function formatSince(value: string): string {
  const d = value ? new Date(value + 'T00:00:00') : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const PAGE_CSS = `
.am-shell { display: flex; min-height: 100vh; background: linear-gradient(180deg, #FFFDF9 0%, #FBF8F1 100%); }
.am-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.am-inner { flex: 1; width: 100%; max-width: 1480px; margin: 0 auto; padding: 20px 28px 8px; box-sizing: border-box; }

.am-card { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; padding: 20px 22px 22px; box-shadow: 0 1px 2px rgba(36,50,74,0.03), 0 6px 18px -14px rgba(184,145,63,0.35); box-sizing: border-box; min-width: 0; }
.am-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.am-card-icon { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #8A6D1F; }
.am-card-icon svg { width: 18px; height: 18px; }
.am-card-title { margin: 0; font-size: 15px; font-weight: 750; color: #24324A; letter-spacing: -0.005em; }
.am-card-sub { margin: 2px 0 0; font-size: 12.5px; color: #68758A; }
.am-tint-pink { background: #FDE2E4; }
.am-tint-green { background: #E2F0CB; }
.am-tint-cream { background: #F6EFDD; }

.am-row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; margin-top: 18px; }
.am-personal { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 26px; align-items: start; }
.am-g4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px 16px; }
.am-g6 { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px 16px; }
.am-g2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
.am-s2 { grid-column: span 2; }
.am-s3 { grid-column: span 3; }
.am-s4 { grid-column: span 4; }
.am-full { grid-column: 1 / -1; }

.am-field { display: flex; flex-direction: column; min-width: 0; }
.am-label { font-size: 12.5px; font-weight: 600; color: #4A5669; margin-bottom: 6px; }
.am-req { color: #B8913F; margin-left: 2px; }
.am-input { width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid #E9DFCB; background: #FFFFFF; font-size: 14px; color: #24324A; font-family: inherit; box-sizing: border-box; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.am-input::placeholder { color: #A3ABB8; }
.am-input:focus { border-color: #D8B15A; box-shadow: 0 0 0 3px rgba(216,177,90,0.18); }
.am-input.has-error { border-color: #D9938D; }
textarea.am-input { height: auto; min-height: 92px; padding: 10px 12px; resize: vertical; line-height: 1.45; }
select.am-input { padding-right: 30px; }
.am-error { margin: 4px 0 0; font-size: 11.5px; color: #B4453E; }
.am-hint { margin: 4px 0 0; font-size: 11.5px; color: #68758A; }

.am-photo { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 4px; }
.am-photo-btn { width: 118px; height: 118px; border-radius: 50%; border: 1.5px dashed #D8B15A; background: linear-gradient(140deg, #FDE2E4 0%, #F6EFDD 60%, #E2F0CB 100%); display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; padding: 0; color: #8A6D1F; background-size: cover; background-position: center; }
.am-photo-btn:focus-visible { outline: 2px solid #B8913F; outline-offset: 3px; }
.am-photo-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
.am-photo-link { background: none; border: none; padding: 0; font-size: 12.5px; font-weight: 700; color: #8A6D1F; cursor: pointer; font-family: inherit; }
.am-photo-note { font-size: 11px; color: #8A93A3; text-align: center; }

.am-family-new { display: flex; gap: 8px; margin-top: 10px; }
.am-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 40px; padding: 0 18px; border-radius: 999px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; box-sizing: border-box; }
.am-btn:focus-visible { outline: 2px solid #B8913F; outline-offset: 2px; }
.am-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.am-btn-gold { background: #D8B15A; border: 1px solid #D8B15A; color: #24324A; }
.am-btn-gold:hover:not(:disabled) { box-shadow: 0 4px 14px -4px rgba(184,145,63,0.6); }
.am-btn-outline { background: #FFFFFF; border: 1px solid rgba(216,177,90,0.5); color: #24324A; }
.am-btn-outline:hover { border-color: #D8B15A; }
.am-btn-ghost { background: transparent; border: 1px solid #E3E6EB; color: #68758A; padding: 0 12px; }
.am-btn-block { width: 100%; margin-top: 10px; border-style: dashed; }

.am-input.is-set { font-weight: 700; font-style: italic; }
.am-other { margin-top: 8px; }
.am-empty-link { margin-top: 6px; font-size: 12px; color: #8A6D1F; font-weight: 700; text-decoration: none; }
.am-empty-link:hover { text-decoration: underline; }

.am-done { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; background: linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%); }
.am-done-card { background: #FFFFFF; border-radius: 22px; box-shadow: 0 10px 40px -12px rgba(36,50,74,0.18); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 36px; align-items: center; padding: 40px; max-width: 860px; width: 100%; box-sizing: border-box; }
.am-done-info h2 { font-size: 22px; font-weight: 800; color: #24324A; margin: 14px 0 8px; }
.am-done-info p { font-size: 14px; color: #68758A; margin: 0 0 8px; line-height: 1.6; }
.am-done-check { width: 52px; height: 52px; border-radius: 999px; background: #E2F0CB; color: #3F6B34; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.am-note { border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 700; margin: 12px 0; }
.am-note-ok { background: #E2F0CB; color: #3F6B34; }
.am-note-warn { background: #FEF3C7; color: #92400E; }
.am-note-err { background: #FDECEC; color: #B4453E; }
.am-done-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.am-badge-col { display: flex; flex-direction: column; align-items: center; gap: 14px; }

.am-badge { width: 2.125in; height: 3.375in; border-radius: 14px; overflow: hidden; background: #FFFFFF; border: 1px solid #EADFC8; box-shadow: 0 8px 24px -10px rgba(36,50,74,0.3); display: flex; flex-direction: column; align-items: center; text-align: center; font-family: inherit; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.am-badge-top { width: 100%; background: linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%); padding: 10px 8px 26px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.am-badge-logo { height: 34px; max-width: 120px; object-fit: contain; display: block; }
.am-badge-church { font-size: 9.5px; font-weight: 700; color: #24324A; line-height: 1.25; padding: 0 4px; }
.am-badge-photo { width: 84px; height: 84px; border-radius: 50%; margin-top: -24px; border: 3px solid #FFFFFF; box-shadow: 0 0 0 1.5px #D8B15A; background: #F6EFDD; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: #8A6D1F; }
.am-badge-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.am-badge-name { font-size: 14px; font-weight: 800; color: #24324A; margin: 10px 8px 2px; line-height: 1.2; }
.am-badge-role { font-size: 11px; font-weight: 700; font-style: italic; color: #8A6D1F; }
.am-badge-id { margin-top: auto; font-size: 10px; color: #68758A; }
.am-badge-id strong { color: #24324A; letter-spacing: 0.04em; }
.am-badge-since { font-size: 9px; color: #8A93A3; margin: 2px 0 8px; }
.am-badge-foot { width: 100%; height: 8px; background: linear-gradient(90deg, #D8B15A, #E9CF8E); }

@media print {
  @page { margin: 12mm; }
  body * { visibility: hidden !important; }
  .am-badge, .am-badge * { visibility: visible !important; }
  .am-badge { position: fixed; left: 0; top: 0; box-shadow: none; }
}

.am-footer { text-align: center; padding: 18px 0 10px; font-size: 11px; color: #8A93A3; }

.am-bar { position: sticky; bottom: 0; z-index: 20; background: rgba(255,255,255,0.88); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid #F0E6D2; }
.am-bar-inner { max-width: 1480px; margin: 0 auto; padding: 12px 28px; box-sizing: border-box; display: flex; align-items: center; gap: 16px; }
.am-bar-info { flex: 1; min-width: 0; font-size: 12.5px; color: #68758A; text-align: center; }
.am-bar-info strong { color: #8A6D1F; font-weight: 700; }
.am-bar .am-btn { height: 44px; padding: 0 24px; font-size: 14px; }
.am-bar .am-btn-gold { min-width: 180px; }

@media (max-width: 1280px) {
  .am-g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .am-personal { grid-template-columns: 130px minmax(0, 1fr); }
}
@media (max-width: 1024px) {
  .am-inner { padding: 16px 18px 8px; }
  .am-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; margin-top: 14px; }
  .am-g6 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .am-g6 > .am-s2, .am-g6 > .am-s3 { grid-column: span 1; }
  .am-g6 > .am-s4 { grid-column: 1 / -1; }
  .am-bar-inner { padding: 10px 18px; }
}
@media (max-width: 820px) {
  .am-row { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 720px) {
  .am-done-card { grid-template-columns: minmax(0, 1fr); padding: 26px 20px; }
}
@media (max-width: 640px) {
  .am-inner { padding: 12px 12px 8px; }
  .am-card { padding: 16px; border-radius: 16px; }
  .am-personal { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .am-g4, .am-g6, .am-g2 { grid-template-columns: minmax(0, 1fr); }
  .am-g6 > * { grid-column: 1 / -1 !important; }
  .am-bar-inner { flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
  .am-bar-info { order: -1; flex-basis: 100%; }
  .am-bar .am-btn { flex: 1; min-width: 0; padding: 0 12px; }
}
`;

function Field({ label, required, error, hint, className, children }: {
  label: string; required?: boolean; error?: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <label className={'am-field' + (className ? ' ' + className : '')}>
      <span className="am-label">{label}{required ? <span className="am-req">*</span> : null}</span>
      {children}
      {error ? <span className="am-error">{error}</span> : hint ? <span className="am-hint">{hint}</span> : null}
    </label>
  );
}

function CardHead({ title, subtitle, tint, icon }: { title: string; subtitle: string; tint: 'pink' | 'green' | 'cream'; icon: React.ReactNode }) {
  return (
    <div className="am-card-head">
      <div className={'am-card-icon am-tint-' + tint}>{icon}</div>
      <div>
        <h2 className="am-card-title">{title}</h2>
        <p className="am-card-sub">{subtitle}</p>
      </div>
    </div>
  );
}

const ICON_PERSON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
const ICON_PIN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
const ICON_HOME = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5h4v5" /></svg>
);
const ICON_LEAF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19c3-4 6-7 10-9" /></svg>
);
const ICON_NOTE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>
);
const ICON_CAMERA = (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" /><circle cx="12" cy="12.5" r="3.5" /></svg>
);

function AddChurchMemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = searchParams.get('churchId') || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    dateOfBirth: '', gender: '', maritalStatus: '', status: 'Active',
    street: '', city: '', state: '', zip: '', country: 'United States',
    spouseName: '', familyId: '',
    dateJoined: '', baptismDate: '', ministryId: '', groupId: '', role: 'Member', roleOther: '', statusOther: '',
    nationalId: '', notes: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [families, setFamilies] = useState<OptionRow[]>([]);
  const [ministriesNew, setMinistriesNew] = useState<MinistryRow[]>([]);
  const [ministriesOld, setMinistriesOld] = useState<MinistryRow[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [badge, setBadge] = useState<SavedBadge | null>(null);
  const brand = useChurchBrand(churchId);
  const [groups, setGroups] = useState<OptionRow[]>([]);

  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'sent' | 'failed' | 'no-email' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [nextPosition, setNextPosition] = useState(1);
  const [memberCode, setMemberCode] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!churchId) return;
    getDoc(doc(db, 'churches', churchId)).then((snap) => {
      if (snap.exists()) setChurchName((snap.data().name as string) || (snap.data().churchName as string) || '');
    }).catch((err) => console.error('Failed to load church name:', err));
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'churchMembers'), where('churchId', '==', churchId)));
        setNextPosition(snap.size + 1);
      } catch (err) { console.error('Failed to count existing members:', err); }
    })();
  }, [churchId]);

  useEffect(() => {
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    if (!first && !last) { setMemberCode(''); return; }
    const firstInitial = first[0]?.toUpperCase() || '';
    const lastInitial = last[0]?.toUpperCase() || firstInitial;
    setMemberCode(firstInitial + lastInitial + '-' + String(nextPosition).padStart(3, '0'));
  }, [form.firstName, form.lastName, nextPosition]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
    });
    return () => unsub();
  }, [router]);

  // Existing Families, Ministries, and Groups - reused, never duplicated.
  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, 'churches', churchId, 'families'), (snap) => {
      setFamilies(snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || 'Family' })));
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  // Ministries can live in two places (see header note). Both are read
  // and merged, so every ministry the church created shows up here.
  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, 'churches', churchId, 'ministries'), (snap) => {
      setMinistriesNew(snap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) || 'Ministry',
        parentId: (d.data().parentMinistryId as string) || null,
      })));
    }, (err) => console.error('Ministries (church subcollection):', err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId || !uid) return;
    const q = query(collection(db, 'churchMinistries'), where('organizerId', '==', uid), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => {
      setMinistriesOld(snap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) || 'Ministry',
        parentId: (d.data().parentMinistryId as string) || null,
      })));
    }, (err) => console.error('Ministries (churchMinistries):', err));
    return () => unsub();
  }, [churchId, uid]);

  // Remember where each ministry lives, so the new member can be added to
  // that ministry's own member list when saving.
  const ministrySource = useMemo(() => {
    const src = new Map<string, 'church' | 'legacy'>();
    ministriesOld.forEach((m) => src.set(m.id, 'legacy'));
    ministriesNew.forEach((m) => src.set(m.id, 'church'));
    return src;
  }, [ministriesNew, ministriesOld]);

  const ministries = useMemo(() => {
    const byId = new Map<string, MinistryRow>();
    [...ministriesNew, ...ministriesOld].forEach((m) => { if (!byId.has(m.id)) byId.set(m.id, m); });
    const all = Array.from(byId.values());
    const label = (m: MinistryRow) => {
      const parent = m.parentId ? byId.get(m.parentId) : undefined;
      return parent ? parent.name + ' \u203A ' + m.name : m.name;
    };
    return all
      .map((m) => ({ id: m.id, name: m.name, label: label(m) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [ministriesNew, ministriesOld]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(query(collection(db, 'churchGroups'), where('churchId', '==', churchId)), (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || 'Group' })));
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleCreateFamily() {
    if (!newFamilyName.trim() || !churchId || !auth.currentUser) return;
    setCreatingFamily(true);
    try {
      const ref = await addDoc(collection(db, 'churches', churchId, 'families'), {
        organizerId: auth.currentUser.uid,
        churchId,
        name: newFamilyName.trim(),
        headOfHouseholdId: null,
        headOfHouseholdName: null,
        memberIds: [],
        memberCount: 0,
        address: '',
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setForm((f) => ({ ...f, familyId: ref.id }));
      setNewFamilyName('');
      setShowNewFamily(false);
    } catch (err) {
      console.error(err);
      alert('Could not create the family. Please try again.');
    } finally {
      setCreatingFamily(false);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!form.phone.trim()) errs.phone = 'Phone is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    if (form.role === 'Other' && !form.roleOther.trim()) errs.roleOther = 'Type the role or position.';
    if (form.status === 'Other' && !form.statusOther.trim()) errs.statusOther = 'Type the member status.';
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  }

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', phone: '', email: '',
      dateOfBirth: '', gender: '', maritalStatus: '', status: 'Active',
      street: '', city: '', state: '', zip: '', country: 'United States',
      spouseName: '', familyId: '',
      dateJoined: '', baptismDate: '', ministryId: '', groupId: '', role: 'Member', roleOther: '', statusOther: '',
      nationalId: '', notes: '',
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setFieldError({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!churchId) { alert('Missing church. Please go back to the Dashboard and try again.'); return; }
    const user = auth.currentUser;
    if (!user) return;

    const fullName = (form.firstName + ' ' + form.lastName).trim();
    setLoading(true);

    try {
      const existing = await getDocs(query(collection(db, 'churchMembers'), where('churchId', '==', churchId)));
      const members = existing.docs.map((d) => d.data());
      if (members.some((m: any) => m.email === form.email)) {
        alert('A member with this email already exists in this church.');
        setLoading(false);
        return;
      }

      const memberRef = doc(collection(db, 'churchMembers'));

      let photoUrl = '';
      if (photoFile) {
        try {
          const ext = photoFile.name.split('.').pop() || 'jpg';
          const path = 'churchMemberPhotos/' + churchId + '/' + memberRef.id + '.' + ext;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, photoFile);
          photoUrl = await getDownloadURL(fileRef);
        } catch (photoErr) {
          console.error('Photo upload failed (continuing without it):', photoErr);
        }
      }

      const ministryName = ministries.find((m) => m.id === form.ministryId)?.name || '';
      const groupName = groups.find((g) => g.id === form.groupId)?.name || '';
      const familyName = families.find((f) => f.id === form.familyId)?.name || '';
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      const finalRole = form.role === 'Other' ? form.roleOther.trim() : form.role;

      await setDoc(memberRef, {
        firstName: form.firstName,
        lastName: form.lastName,
        fullName,
        memberCode,
        photoUrl,
        phone: form.phone,
        email: form.email,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        status: form.status,
        statusDetail: form.status === 'Other' ? form.statusOther.trim() : '',
        address: { street: form.street, city: form.city, state: form.state, zip: form.zip, country: form.country },
        spouseName: form.spouseName,
        familyId: form.familyId || null,
        familyName: familyName || null,
        dateJoined: form.dateJoined,
        baptismDate: form.baptismDate,
        ministryId: form.ministryId || null,
        ministryName: ministryName || null,
        groupId: form.groupId || null,
        groupName: groupName || null,
        role: finalRole,
        nationalId: form.nationalId,
        notes: form.notes,
        churchId,
        organizerId: user.uid,
        userId: null,
        inviteCode,
        createdAt: serverTimestamp(),
      });

      // Add the new member to the chosen ministry's member list, so they
      // show up on the Ministries page.
      if (form.ministryId) {
        try {
          const ministryDoc = ministrySource.get(form.ministryId) === 'legacy'
            ? doc(db, 'churchMinistries', form.ministryId)
            : doc(db, 'churches', churchId, 'ministries', form.ministryId);
          await updateDoc(ministryDoc, {
            memberIds: arrayUnion(memberRef.id),
            memberCount: increment(1),
            updatedAt: Date.now(),
          });
        } catch (minErr) {
          console.error('Could not attach member to ministry:', minErr);
        }
      }

      if (form.familyId) {
        try {
          await updateDoc(doc(db, 'churches', churchId, 'families', form.familyId), {
            memberIds: arrayUnion(memberRef.id),
            memberCount: increment(1),
            updatedAt: Date.now(),
          });
        } catch (famErr) {
          console.error('Could not attach member to family:', famErr);
        }
      }

      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: user.uid,
          category: 'Church Member',
          action: 'Added church member',
          user: user.email || '',
          details: fullName + ' - ' + memberCode,
          createdAt: serverTimestamp(),
        });
      } catch (auditErr) { /* silent - must never block member creation */ }

      if (!form.email) {
        setInviteStatus('no-email');
      } else {
        const inviteLink = 'https://unimunity.com/join-church/' + inviteCode;
        try {
          const inviteRes = await fetch('/api/send-church-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emails: [form.email], churchName: churchName || brand.name || 'your church', inviteLink, churchId }),
          });
          const inviteData = await inviteRes.json();
          setInviteStatus(inviteRes.ok && inviteData.sent > 0 ? 'sent' : 'failed');
        } catch (inviteErr) {
          console.error('Invite send failed:', inviteErr);
          setInviteStatus('failed');
        }
      }

      setBadge({ fullName, memberCode, role: finalRole, photo: photoUrl || photoPreview, since: formatSince(form.dateJoined) });
      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Error adding member. Please try again.');
    }
    setLoading(false);
  };


  if (!mounted) return null;

  if (success) {
    return (
      <div className="am-done">
        <style>{PAGE_CSS}</style>
        <div className="am-done-card">
          <div className="am-done-info">
            <div className="am-done-check">&#10003;</div>
            <h2>Member added successfully</h2>
            <p>Member ID: <strong><em>{memberCode}</em></strong></p>
            {inviteStatus === 'sent' && <div className="am-note am-note-ok">Invitation email sent. They can now create their account.</div>}
            {inviteStatus === 'no-email' && <div className="am-note am-note-warn">No email on file, so no invitation was sent.</div>}
            {inviteStatus === 'failed' && <div className="am-note am-note-err">Member added, but the invitation email could not be sent. You can resend it from the Members page.</div>}
            <p>Their member badge is ready. Print it on card stock or badge paper (credit card size).</p>
            <div className="am-done-actions">
              <button type="button" className="am-btn am-btn-gold" onClick={() => window.print()}>Print badge</button>
              <button type="button" className="am-btn am-btn-outline" onClick={() => router.push(`/dashboard/church/${churchId}/members`)}>View Members</button>
              <button type="button" className="am-btn am-btn-outline" onClick={() => { setSuccess(false); setInviteStatus(null); setBadge(null); resetForm(); }}>Add Another</button>
            </div>
          </div>

          {badge ? (
            <div className="am-badge-col">
              <div className="am-badge" aria-label="Member badge preview">
                <div className="am-badge-top">
                  {brand.logoUrl ? <img className="am-badge-logo" src={brand.logoUrl} alt={(brand.name || 'Church') + ' logo'} /> : null}
                  <div className="am-badge-church">{brand.name || churchName}</div>
                </div>
                <div className="am-badge-photo">
                  {badge.photo ? <img src={badge.photo} alt={badge.fullName} /> : initialsOf(badge.fullName)}
                </div>
                <div className="am-badge-name">{badge.fullName}</div>
                <div className="am-badge-role">{badge.role}</div>
                <div className="am-badge-id">Member ID <strong>{badge.memberCode}</strong></div>
                <div className="am-badge-since">{badge.since ? 'Member since ' + badge.since : ''}</div>
                <div className="am-badge-foot" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const membersHref = '/dashboard/church/' + churchId + '/members';
  const inputCls = (key: string) => 'am-input' + (fieldError[key] ? ' has-error' : '');
  // Chosen values (dropdowns, dates) are shown in bold italic.
  const setCls = (value: string) => 'am-input' + (value ? ' is-set' : '');
  const groupsHref = '/dashboard/church/' + churchId + '/groups';
  const ministriesHref = '/dashboard/church/' + churchId + '/ministries';

  return (
    <div className="am-shell">
      <style>{PAGE_CSS}</style>
      <ChurchSidebar churchId={churchId} />

      <div className="am-main">
        <div className="am-inner">
          <ChurchPageHeader
            churchId={churchId}
            title="Add Member"
            subtitle="Welcome a new member to your community."
            description="They will automatically receive an email invitation to create their account."
            breadcrumb={[{ label: 'Members', href: membersHref }, { label: 'Add Member' }]}
            illustration="members"
          />

          {/* Row 1 - Personal Information */}
          <section className="am-card" aria-labelledby="am-personal">
            <CardHead title="Personal Information" subtitle="Basic information about the member." tint="pink" icon={ICON_PERSON} />
            <div className="am-personal">
              <div className="am-photo">
                <button type="button" className="am-photo-btn" onClick={() => fileInputRef.current?.click()} aria-label={photoPreview ? 'Change photo' : 'Upload photo'}>
                  {photoPreview ? <img src={photoPreview} alt="Member photo preview" /> : ICON_CAMERA}
                </button>
                <button type="button" className="am-photo-link" onClick={() => fileInputRef.current?.click()}>
                  {photoPreview ? 'Change photo' : 'Upload photo'}
                </button>
                <span className="am-photo-note">Optional. JPG or PNG.</span>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelected} hidden />
              </div>

              <div className="am-g4">
                <Field label="First Name" required error={fieldError.firstName}>
                  <input className={inputCls('firstName')} placeholder="First name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                </Field>
                <Field label="Last Name" required error={fieldError.lastName}>
                  <input className={inputCls('lastName')} placeholder="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                </Field>
                <Field label="Email" required error={fieldError.email}>
                  <input className={inputCls('email')} type="email" placeholder="email@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
                <Field label="Phone" required error={fieldError.phone}>
                  <input className={inputCls('phone')} type="tel" placeholder="+1 234 567 8900" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                <Field label="Date of Birth">
                  <input className={setCls(form.dateOfBirth)} type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                </Field>
                <Field label="Gender">
                  <select className={setCls(form.gender)} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g || 'Not specified'}</option>)}
                  </select>
                </Field>
                <Field label="Marital Status">
                  <select className={setCls(form.maritalStatus)} value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
                    {MARITAL_OPTIONS.map((m) => <option key={m} value={m}>{m || 'Not specified'}</option>)}
                  </select>
                </Field>
                <Field label="Member Status" required error={fieldError.statusOther}>
                  <select className={setCls(form.status)} value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {MEMBER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {form.status === 'Other' ? (
                    <input className={inputCls('statusOther') + ' am-other'} placeholder="Type the status" value={form.statusOther} onChange={(e) => set('statusOther', e.target.value)} autoFocus />
                  ) : null}
                </Field>
              </div>
            </div>
          </section>

          {/* Row 2 - Contact + Family */}
          <div className="am-row">
            <section className="am-card">
              <CardHead title="Contact Information" subtitle="Current address and location." tint="green" icon={ICON_PIN} />
              <div className="am-g6">
                <Field label="Street Address" className="am-s4">
                  <input className="am-input" placeholder="Street and number" value={form.street} onChange={(e) => set('street', e.target.value)} />
                </Field>
                <Field label="Postal Code" className="am-s2">
                  <input className="am-input" placeholder="Postal code" value={form.zip} onChange={(e) => set('zip', e.target.value)} />
                </Field>
                <Field label="City" className="am-s2">
                  <input className="am-input" placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
                </Field>
                <Field label="State / Province" className="am-s2">
                  <input className="am-input" placeholder="State or province" value={form.state} onChange={(e) => set('state', e.target.value)} />
                </Field>
                <Field label="Country" className="am-s2">
                  <input className="am-input" value={form.country} onChange={(e) => set('country', e.target.value)} />
                </Field>
              </div>
            </section>

            <section className="am-card">
              <CardHead title="Family Information" subtitle="Link the member to a family and spouse." tint="cream" icon={ICON_HOME} />
              <div className="am-g2">
                <Field label="Spouse" className="am-full">
                  <input className="am-input" placeholder="Spouse name, if married" value={form.spouseName} onChange={(e) => set('spouseName', e.target.value)} />
                </Field>
                <div className="am-field am-full">
                  <label className="am-label" htmlFor="am-family">Family</label>
                  <select id="am-family" className={setCls(form.familyId)} value={form.familyId} onChange={(e) => set('familyId', e.target.value)}>
                    <option value="">Select a family</option>
                    {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  {!showNewFamily ? (
                    <button type="button" className="am-btn am-btn-outline am-btn-block" onClick={() => setShowNewFamily(true)}>
                      + Create New Family
                    </button>
                  ) : (
                    <div className="am-family-new">
                      <input className="am-input" placeholder="New family name" value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)} autoFocus />
                      <button type="button" className="am-btn am-btn-gold" onClick={handleCreateFamily} disabled={creatingFamily || !newFamilyName.trim()}>
                        {creatingFamily ? 'Adding...' : 'Add'}
                      </button>
                      <button type="button" className="am-btn am-btn-ghost" onClick={() => { setShowNewFamily(false); setNewFamilyName(''); }} aria-label="Cancel new family">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Row 3 - Church + Additional */}
          <div className="am-row">
            <section className="am-card">
              <CardHead title="Church Information" subtitle="Involvement and role in the church." tint="pink" icon={ICON_LEAF} />
              <div className="am-g6">
                <Field label="Date Joined Church" className="am-s2">
                  <input className={setCls(form.dateJoined)} type="date" value={form.dateJoined} onChange={(e) => set('dateJoined', e.target.value)} />
                </Field>
                <Field label="Baptism Date" className="am-s2">
                  <input className={setCls(form.baptismDate)} type="date" value={form.baptismDate} onChange={(e) => set('baptismDate', e.target.value)} />
                </Field>
                <Field label="Role / Position" className="am-s2" error={fieldError.roleOther}>
                  <select className={setCls(form.role)} value={form.role} onChange={(e) => set('role', e.target.value)}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {form.role === 'Other' ? (
                    <input className={inputCls('roleOther') + ' am-other'} placeholder="Type the role or position" value={form.roleOther} onChange={(e) => set('roleOther', e.target.value)} autoFocus />
                  ) : null}
                </Field>
                <div className="am-field am-s3">
                  <label className="am-label" htmlFor="am-ministry">Ministry</label>
                  <select id="am-ministry" className={setCls(form.ministryId)} value={form.ministryId} onChange={(e) => set('ministryId', e.target.value)}>
                    <option value="">{ministries.length ? 'Select a ministry' : 'No ministries yet'}</option>
                    {ministries.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  {ministries.length === 0 ? <a className="am-empty-link" href={ministriesHref}>+ Create a ministry</a> : null}
                </div>
                <div className="am-field am-s3">
                  <label className="am-label" htmlFor="am-group">Group</label>
                  <select id="am-group" className={setCls(form.groupId)} value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
                    <option value="">{groups.length ? 'Select a group' : 'No groups yet'}</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  {groups.length === 0 ? <a className="am-empty-link" href={groupsHref}>+ Create a group</a> : null}
                </div>
              </div>
            </section>

            <section className="am-card">
              <CardHead title="Additional Information" subtitle="Optional details and notes." tint="green" icon={ICON_NOTE} />
              <div className="am-g2">
                <Field label="National ID Number" className="am-full" hint="Protected. Never shown to ordinary members.">
                  <input className="am-input" placeholder="Optional" value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
                </Field>
                <Field label="Notes" className="am-full">
                  <textarea className="am-input" rows={3} placeholder="Anything worth remembering about this member" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
                </Field>
              </div>
            </section>
          </div>

          <div className="am-footer">
            Powered by UNIMUNITY&trade; &middot; A product of Ma Production Luxenn Zara LLC &middot; &copy; 2026 All Rights Reserved &middot; v1.0.0
          </div>
        </div>

        <div className="am-bar">
          <div className="am-bar-inner">
            <button type="button" className="am-btn am-btn-outline" onClick={() => router.push(`/dashboard/church/${churchId}`)}>
              &larr; Back
            </button>
            <div className="am-bar-info">
              {memberCode
                ? <>Member ID will be <strong>{memberCode}</strong>. An invitation email is sent after saving.</>
                : <>Fields marked <strong>*</strong> are required. An invitation email is sent after saving.</>}
            </div>
            <button type="button" className="am-btn am-btn-gold" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving member...' : 'Save Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddChurchMemberPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#68758A' }}>Loading...</div>}>
      <AddChurchMemberContent />
    </Suspense>
  );
}
