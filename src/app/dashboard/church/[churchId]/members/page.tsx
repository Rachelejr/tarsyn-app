'use client';

// src/app/dashboard/church/[churchId]/members/page.tsx
//
// Members (Church module) - wide landscape layout, same design language as
// Add Member (shared ChurchPageHeader + components from churchUi.tsx).
//
// Data: the existing churchMembers collection (where churchId == this
// church). Nothing is created, duplicated or deleted here.
//  - Summary cards use real numbers only:
//      Total members, Active (status "active"), New members (added in the
//      last 30 days), Pending invitations (has an email, no account yet).
//  - Search by name, email or phone. Filters by Status, Role, Ministry,
//    Group, Family - their options come from the members themselves.
//  - Row click / View opens the member profile page.
//  - Three-dot menu: View profile, Change status (writes member.status,
//    and statusDetail for "Other"), Resend invitation (same
//    /api/send-church-invite route and invite link as Add Member), Edit
//    (not built yet - marked Soon).
//  - Export CSV of the members currently shown.
//  - Desktop: wide list. Tablet: fewer columns. Mobile: member cards.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';
import ChurchPageHeader from '@/components/church/ChurchPageHeader';
import { useChurchBrand } from '@/components/church/useChurchBrand';
import {
  ChurchUiStyles, ChurchSummaryCard, ChurchSearchBar, ChurchFilterBar, ChurchMemberList,
  ChurchEmptyState, statusLabel, type MemberRowData, type MemberMenuItem,
} from '@/components/church/churchUi';

interface ChurchMemberDoc extends MemberRowData {
  firstName?: string;
  lastName?: string;
  familyName?: string;
  userId?: string | null;
  inviteCode?: string;
  createdAtMs: number;
}

const STATUS_OPTIONS = ['Active', 'Inactive', 'New', 'Pending', 'Transferred', 'Visitor', 'Suspended', 'Deceased', 'Other'];
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const PAGE_CSS = `
.mp-shell { display: flex; min-height: 100vh; background: linear-gradient(180deg, #FFFDF9 0%, #FBF8F1 100%); }
.mp-main { flex: 1; min-width: 0; }
.mp-inner { width: 100%; max-width: 1480px; margin: 0 auto; padding: 20px 28px 12px; box-sizing: border-box; }
.mp-note { border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 700; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 10px; align-items: center; }
.mp-note button { background: none; border: none; cursor: pointer; font-weight: 700; color: inherit; font-family: inherit; }
.mp-ok { background: #E2F0CB; color: #3F6B34; }
.mp-err { background: #FDECEC; color: #B4453E; }
.mp-loading { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; padding: 40px; text-align: center; color: #68758A; font-size: 14px; }
.mp-footer { text-align: center; padding: 22px 0 8px; font-size: 11px; color: #8A93A3; }

.mp-modal-bg { position: fixed; inset: 0; z-index: 60; background: rgba(36,50,74,0.35); display: flex; align-items: center; justify-content: center; padding: 16px; }
.mp-modal { background: #FFFFFF; border-radius: 18px; padding: 24px; width: 100%; max-width: 420px; box-shadow: 0 20px 50px -20px rgba(36,50,74,0.4); }
.mp-modal h3 { margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #24324A; }
.mp-modal p { margin: 0 0 16px; font-size: 13px; color: #68758A; }
.mp-modal label { display: block; font-size: 12.5px; font-weight: 600; color: #4A5669; margin-bottom: 6px; }
.mp-input { width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid #E9DFCB; font-size: 14px; color: #24324A; font-family: inherit; box-sizing: border-box; outline: none; background: #FFFFFF; }
.mp-input:focus { border-color: #D8B15A; box-shadow: 0 0 0 3px rgba(216,177,90,0.18); }
.mp-input.is-set { font-weight: 700; font-style: italic; }
.mp-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.mp-btn { height: 40px; padding: 0 18px; border-radius: 999px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid rgba(216,177,90,0.5); background: #FFFFFF; color: #24324A; }
.mp-btn-gold { background: #D8B15A; border-color: #D8B15A; }
.mp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 1024px) { .mp-inner { padding: 16px 18px 12px; } }
@media (max-width: 640px) { .mp-inner { padding: 12px 12px 12px; } }
`;

function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const t = v as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
}

const ICON_PEOPLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.6 0 4.6 1.8 5.5 4.9" /></svg>
);
const ICON_LEAF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19c3-4 6-7 10-9" /></svg>
);
const ICON_SPARK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
);
const ICON_MAIL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
);

export default function ChurchMembersPage() {
  const router = useRouter();
  const params = useParams();
  const churchId = params?.churchId as string;
  const brand = useChurchBrand(churchId);

  const [members, setMembers] = useState<ChurchMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({ status: '', role: '', ministry: '', group: '', family: '' });
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [statusTarget, setStatusTarget] = useState<ChurchMemberDoc | null>(null);
  const [newStatus, setNewStatus] = useState('Active');
  const [newStatusOther, setNewStatusOther] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (!u) router.push('/login'); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, 'churchMembers'), where('churchId', '==', churchId));
    const unsub = onSnapshot(q, (snap) => {
      const rows: ChurchMemberDoc[] = snap.docs.map((d) => {
        const x = d.data() as Record<string, any>;
        const fullName = (x.fullName as string) || ((x.firstName || '') + ' ' + (x.lastName || '')).trim();
        return {
          id: d.id,
          fullName,
          firstName: x.firstName,
          lastName: x.lastName,
          email: x.email || '',
          phone: x.phone || '',
          photoUrl: x.photoUrl || '',
          role: x.role || '',
          ministryName: x.ministryName || '',
          groupName: x.groupName || '',
          familyName: x.familyName || '',
          status: x.status || 'pending',
          statusDetail: x.statusDetail || '',
          memberCode: x.memberCode || '',
          userId: x.userId ?? null,
          inviteCode: x.inviteCode || '',
          invitePending: !!x.email && !x.userId,
          createdAtMs: toMillis(x.createdAt),
        };
      });
      rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setMembers(rows);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [churchId]);

  // Real counts, straight from the member documents.
  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: members.length,
      active: members.filter((m) => (m.status || '').toLowerCase() === 'active').length,
      recent: members.filter((m) => m.createdAtMs && now - m.createdAtMs <= THIRTY_DAYS).length,
      pending: members.filter((m) => m.invitePending).length,
    };
  }, [members]);

  const distinct = (pick: (m: ChurchMemberDoc) => string | undefined) =>
    Array.from(new Set(members.map(pick).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b));

  const filterDefs = useMemo(() => [
    { key: 'status', label: 'All statuses', options: distinct((m) => statusLabel(m.status, m.statusDetail)) },
    { key: 'role', label: 'All roles', options: distinct((m) => m.role) },
    { key: 'ministry', label: 'All ministries', options: distinct((m) => m.ministryName) },
    { key: 'group', label: 'All groups', options: distinct((m) => m.groupName) },
    { key: 'family', label: 'All families', options: distinct((m) => m.familyName) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [members]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return members.filter((m) => {
      if (q) {
        const hit = m.fullName.toLowerCase().includes(q)
          || (m.email || '').toLowerCase().includes(q)
          || (m.memberCode || '').toLowerCase().includes(q)
          || (digits.length >= 3 && (m.phone || '').replace(/\D/g, '').includes(digits));
        if (!hit) return false;
      }
      if (filters.status && statusLabel(m.status, m.statusDetail) !== filters.status) return false;
      if (filters.role && m.role !== filters.role) return false;
      if (filters.ministry && m.ministryName !== filters.ministry) return false;
      if (filters.group && m.groupName !== filters.group) return false;
      if (filters.family && m.familyName !== filters.family) return false;
      return true;
    });
  }, [members, search, filters]);

  const addMemberHref = '/dashboard/church/add-member?churchId=' + churchId;
  const profileHref = (m: MemberRowData) => '/dashboard/church/' + churchId + '/members/' + m.id;

  function openStatus(m: ChurchMemberDoc) {
    const current = statusLabel(m.status);
    setNewStatus(STATUS_OPTIONS.includes(current) ? current : 'Other');
    setNewStatusOther(m.statusDetail || (STATUS_OPTIONS.includes(current) ? '' : current));
    setStatusTarget(m);
  }

  async function saveStatus() {
    if (!statusTarget) return;
    if (newStatus === 'Other' && !newStatusOther.trim()) return;
    setSavingStatus(true);
    try {
      await updateDoc(doc(db, 'churchMembers', statusTarget.id), {
        status: newStatus,
        statusDetail: newStatus === 'Other' ? newStatusOther.trim() : '',
        updatedAt: Date.now(),
      });
      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: auth.currentUser?.uid || '',
          category: 'Church Member',
          action: 'Changed member status',
          user: auth.currentUser?.email || '',
          details: statusTarget.fullName + ': ' + statusLabel(statusTarget.status) + ' -> ' + (newStatus === 'Other' ? newStatusOther.trim() : newStatus),
          createdAt: serverTimestamp(),
        });
      } catch (e) { /* audit must never block */ }
      setNote({ kind: 'ok', text: 'Status updated for ' + statusTarget.fullName + '.' });
      setStatusTarget(null);
    } catch (e) {
      console.error(e);
      setNote({ kind: 'err', text: 'Could not update the status. Please try again.' });
    } finally {
      setSavingStatus(false);
    }
  }

  async function resendInvite(m: ChurchMemberDoc) {
    if (!m.email || !m.inviteCode) return;
    try {
      const res = await fetch('/api/send-church-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [m.email], churchName: brand.name || 'your church', inviteLink: 'https://unimunity.com/join-church/' + m.inviteCode, churchId }),
      });
      const data = await res.json();
      if (res.ok && data.sent > 0) setNote({ kind: 'ok', text: 'Invitation sent again to ' + m.email + '.' });
      else setNote({ kind: 'err', text: 'The invitation could not be sent. Please try again.' });
    } catch (e) {
      setNote({ kind: 'err', text: 'The invitation could not be sent. Please try again.' });
    }
  }

  function menuFor(row: MemberRowData): MemberMenuItem[] {
    const m = row as ChurchMemberDoc;
    const items: MemberMenuItem[] = [
      { label: 'View profile', onClick: () => router.push(profileHref(m)) },
      { label: 'Change status', onClick: () => openStatus(m) },
    ];
    if (m.invitePending && m.inviteCode) items.push({ label: 'Resend invitation', onClick: () => resendInvite(m) });
    items.push({ label: 'Edit', soon: true });
    return items;
  }

  function exportCsv() {
    const esc = (v: string) => '"' + (v || '').replace(/"/g, '""') + '"';
    const head = ['Member ID', 'Name', 'Email', 'Phone', 'Role', 'Ministry', 'Group', 'Family', 'Status', 'Account'];
    const rows = shown.map((m) => [
      m.memberCode || '', m.fullName, m.email || '', m.phone || '', m.role || '', m.ministryName || '',
      m.groupName || '', m.familyName || '', statusLabel(m.status, m.statusDetail), m.invitePending ? 'Invitation pending' : (m.userId ? 'Joined' : 'No email'),
    ]);
    const csv = [head, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const clearFilters = () => { setFilters({ status: '', role: '', ministry: '', group: '', family: '' }); setSearch(''); };

  return (
    <div className="mp-shell">
      <ChurchUiStyles />
      <style>{PAGE_CSS}</style>
      <ChurchSidebar churchId={churchId} />

      <div className="mp-main">
        <div className="mp-inner">
          <ChurchPageHeader
            churchId={churchId}
            title="Members"
            subtitle="Manage and care for your church community."
            description="View, search, organize and manage all church members in one place."
            breadcrumb="Members"
            illustration="members"
            primaryAction={{ label: 'Add Member', icon: '+', href: addMemberHref }}
            secondaryAction={members.length ? { label: 'Export CSV', onClick: exportCsv } : undefined}
          />

          {note ? (
            <div className={'mp-note ' + (note.kind === 'ok' ? 'mp-ok' : 'mp-err')} role="status">
              <span>{note.text}</span>
              <button type="button" onClick={() => setNote(null)} aria-label="Dismiss">&times;</button>
            </div>
          ) : null}

          <div className="cu-summary">
            <ChurchSummaryCard label="Total members" value={stats.total} tint="cream" icon={ICON_PEOPLE} />
            <ChurchSummaryCard label="Active" value={stats.active} tint="green" icon={ICON_LEAF} />
            <ChurchSummaryCard label="New members" value={stats.recent} hint="Added in the last 30 days" tint="pink" icon={ICON_SPARK} />
            <ChurchSummaryCard label="Pending invitations" value={stats.pending} hint="No account created yet" tint="gold" icon={ICON_MAIL} />
          </div>

          {loading ? (
            <div className="mp-loading">Loading members...</div>
          ) : members.length === 0 ? (
            <ChurchEmptyState
              title="No members yet"
              text="Start building your church community by adding your first member."
              actionLabel="+ Add Member"
              onAction={() => router.push(addMemberHref)}
            />
          ) : (
            <>
              <div className="cu-toolbar">
                <ChurchSearchBar value={search} onChange={setSearch} placeholder="Search members by name, email or phone..." />
                <ChurchFilterBar
                  filters={filterDefs}
                  values={filters}
                  onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
                  onClear={clearFilters}
                />
              </div>
              <p className="cu-count">
                Showing <strong>{shown.length}</strong> of {members.length} member{members.length === 1 ? '' : 's'}
              </p>
              {shown.length === 0 ? (
                <ChurchEmptyState
                  title="No member matches"
                  text="Try another name, email or phone number, or clear the filters."
                  actionLabel="Clear filters"
                  onAction={clearFilters}
                />
              ) : (
                <ChurchMemberList members={shown} onOpen={(m) => router.push(profileHref(m))} menuFor={menuFor} />
              )}
            </>
          )}

          <div className="mp-footer">
            Powered by UNIMUNITY&trade; &middot; A product of Ma Production Luxenn Zara LLC &middot; &copy; 2026 All Rights Reserved &middot; v1.0.0
          </div>
        </div>
      </div>

      {statusTarget ? (
        <div className="mp-modal-bg" onClick={() => !savingStatus && setStatusTarget(null)}>
          <div className="mp-modal" role="dialog" aria-modal="true" aria-labelledby="mp-status-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="mp-status-title">Change status</h3>
            <p>{statusTarget.fullName}</p>
            <label htmlFor="mp-status">Member status</label>
            <select id="mp-status" className="mp-input is-set" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {newStatus === 'Other' ? (
              <input className="mp-input" style={{ marginTop: 8 }} placeholder="Type the status" value={newStatusOther} onChange={(e) => setNewStatusOther(e.target.value)} autoFocus />
            ) : null}
            <div className="mp-modal-actions">
              <button type="button" className="mp-btn" onClick={() => setStatusTarget(null)} disabled={savingStatus}>Cancel</button>
              <button type="button" className="mp-btn mp-btn-gold" onClick={saveStatus} disabled={savingStatus || (newStatus === 'Other' && !newStatusOther.trim())}>
                {savingStatus ? 'Saving...' : 'Save status'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
