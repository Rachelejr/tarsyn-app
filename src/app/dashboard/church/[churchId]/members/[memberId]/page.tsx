'use client';

// src/app/dashboard/church/[churchId]/members/[memberId]/page.tsx
//
// Member profile (Church module). Read-only view of one existing
// churchMembers document - nothing is duplicated or recreated.
// Sections: Personal, Contact, Family, Church (role, ministry, group,
// dates), Additional (National ID masked), Notes, Account & history.
// Actions: Change status, Resend invitation (when no account yet).
// Same design language as Members / Add Member (ChurchPageHeader +
// churchUi components).

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import ChurchSidebar from '@/components/church/ChurchSidebar';
import ChurchPageHeader from '@/components/church/ChurchPageHeader';
import { useChurchBrand } from '@/components/church/useChurchBrand';
import { ChurchUiStyles, ChurchAvatar, ChurchStatusBadge, ChurchEmptyState, statusLabel } from '@/components/church/churchUi';

const STATUS_OPTIONS = ['Active', 'Inactive', 'New', 'Pending', 'Transferred', 'Visitor', 'Suspended', 'Deceased', 'Other'];

const PAGE_CSS = `
.pf-shell { display: flex; min-height: 100vh; background: linear-gradient(180deg, #FFFDF9 0%, #FBF8F1 100%); }
.pf-main { flex: 1; min-width: 0; }
.pf-inner { width: 100%; max-width: 1480px; margin: 0 auto; padding: 20px 28px 12px; box-sizing: border-box; }
.pf-top { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; padding: 20px 22px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-bottom: 18px; box-shadow: 0 1px 2px rgba(36,50,74,0.03), 0 6px 18px -14px rgba(184,145,63,0.35); }
.pf-id { flex: 1; min-width: 220px; }
.pf-name { margin: 0; font-size: 22px; font-weight: 800; color: #24324A; }
.pf-meta { margin: 6px 0 0; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; font-size: 13px; color: #68758A; }
.pf-meta strong { color: #24324A; font-style: italic; }
.pf-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.pf-btn { height: 40px; padding: 0 18px; border-radius: 999px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid rgba(216,177,90,0.5); background: #FFFFFF; color: #24324A; }
.pf-btn-gold { background: #D8B15A; border-color: #D8B15A; }
.pf-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.pf-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.pf-card { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; padding: 18px 20px; box-shadow: 0 1px 2px rgba(36,50,74,0.03); min-width: 0; }
.pf-card h2 { margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #24324A; display: flex; align-items: center; gap: 8px; }
.pf-card h2::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--dot, #D8B15A); }
.pf-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid #F5EEDF; font-size: 13px; }
.pf-row:first-of-type { border-top: none; }
.pf-row span:first-child { color: #68758A; }
.pf-row span:last-child { color: #24324A; font-weight: 700; font-style: italic; text-align: right; overflow-wrap: anywhere; }
.pf-row .pf-empty { color: #A3ABB8; font-weight: 400; font-style: normal; }
.pf-notes { font-size: 13.5px; color: #24324A; line-height: 1.6; white-space: pre-wrap; margin: 0; }
.pf-wide { grid-column: span 2; }
.pf-note { border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 700; margin-bottom: 14px; }
.pf-ok { background: #E2F0CB; color: #3F6B34; }
.pf-err { background: #FDECEC; color: #B4453E; }
.pf-footer { text-align: center; padding: 22px 0 8px; font-size: 11px; color: #8A93A3; }
.pf-modal-bg { position: fixed; inset: 0; z-index: 60; background: rgba(36,50,74,0.35); display: flex; align-items: center; justify-content: center; padding: 16px; }
.pf-modal { background: #FFFFFF; border-radius: 18px; padding: 24px; width: 100%; max-width: 420px; }
.pf-modal h3 { margin: 0 0 14px; font-size: 18px; font-weight: 800; color: #24324A; }
.pf-input { width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid #E9DFCB; font-size: 14px; color: #24324A; font-family: inherit; box-sizing: border-box; font-weight: 700; font-style: italic; }
.pf-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
@media (max-width: 1100px) { .pf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pf-wide { grid-column: span 2; } }
@media (max-width: 700px) { .pf-grid { grid-template-columns: 1fr; } .pf-wide { grid-column: auto; } .pf-inner { padding: 12px; } }
`;

function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const t = v as { toMillis?: () => number; seconds?: number };
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
}

function fmtDate(value?: string | number): string {
  if (!value) return '';
  const d = typeof value === 'number' ? new Date(value) : new Date(value + 'T00:00:00');
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="pf-row">
      <span>{label}</span>
      {value ? <span>{value}</span> : <span className="pf-empty">Not provided</span>}
    </div>
  );
}

export default function MemberProfilePage() {
  const router = useRouter();
  const params = useParams();
  const churchId = params?.churchId as string;
  const memberId = params?.memberId as string;
  const brand = useChurchBrand(churchId);

  const [m, setM] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('Active');
  const [newStatusOther, setNewStatusOther] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { if (!u) router.push('/login'); });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!memberId) return;
    const unsub = onSnapshot(doc(db, 'churchMembers', memberId), (snap) => {
      const data = snap.exists() ? snap.data() : null;
      // Only show members that belong to this church.
      setM(data && data.churchId === churchId ? data : null);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [memberId, churchId]);

  const membersHref = '/dashboard/church/' + churchId + '/members';
  const fullName = m ? ((m.fullName as string) || ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || 'Unnamed member') : '';
  const invitePending = !!m && !!m.email && !m.userId;
  const addr = (m?.address || {}) as Record<string, string>;
  const nationalId = (m?.nationalId as string) || '';
  const maskedId = nationalId ? '\u2022\u2022\u2022\u2022 ' + nationalId.slice(-4) : '';

  function openStatus() {
    const current = statusLabel(m?.status);
    setNewStatus(STATUS_OPTIONS.includes(current) ? current : 'Other');
    setNewStatusOther((m?.statusDetail as string) || (STATUS_OPTIONS.includes(current) ? '' : current));
    setStatusOpen(true);
  }

  async function saveStatus() {
    if (newStatus === 'Other' && !newStatusOther.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'churchMembers', memberId), {
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
          details: fullName + ': ' + statusLabel(m?.status) + ' -> ' + (newStatus === 'Other' ? newStatusOther.trim() : newStatus),
          createdAt: serverTimestamp(),
        });
      } catch (e) { /* audit must never block */ }
      setNote({ kind: 'ok', text: 'Status updated.' });
      setStatusOpen(false);
    } catch (e) {
      console.error(e);
      setNote({ kind: 'err', text: 'Could not update the status. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function resendInvite() {
    if (!m?.email || !m?.inviteCode) return;
    try {
      const res = await fetch('/api/send-church-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [m.email], churchName: brand.name || 'your church', inviteLink: 'https://unimunity.com/join-church/' + m.inviteCode, churchId }),
      });
      const data = await res.json();
      setNote(res.ok && data.sent > 0 ? { kind: 'ok', text: 'Invitation sent again to ' + m.email + '.' } : { kind: 'err', text: 'The invitation could not be sent. Please try again.' });
    } catch (e) {
      setNote({ kind: 'err', text: 'The invitation could not be sent. Please try again.' });
    }
  }

  return (
    <div className="pf-shell">
      <ChurchUiStyles />
      <style>{PAGE_CSS}</style>
      <ChurchSidebar churchId={churchId} />

      <div className="pf-main">
        <div className="pf-inner">
          <ChurchPageHeader
            churchId={churchId}
            title={m ? fullName : 'Member Profile'}
            subtitle="Member profile"
            breadcrumb={[{ label: 'Members', href: membersHref }, { label: m ? fullName : 'Profile' }]}
            illustration="members"
            compact
          />

          {note ? <div className={'pf-note ' + (note.kind === 'ok' ? 'pf-ok' : 'pf-err')} role="status">{note.text}</div> : null}

          {loading ? (
            <div className="pf-card" style={{ textAlign: 'center', color: '#68758A' }}>Loading member...</div>
          ) : !m ? (
            <ChurchEmptyState title="Member not found" text="This member does not exist or belongs to another church." actionLabel="Back to Members" onAction={() => router.push(membersHref)} />
          ) : (
            <>
              <div className="pf-top">
                <ChurchAvatar name={fullName} photoUrl={m.photoUrl} size={84} />
                <div className="pf-id">
                  <h2 className="pf-name">{fullName}</h2>
                  <div className="pf-meta">
                    <ChurchStatusBadge status={m.status} detail={m.statusDetail} />
                    {m.role ? <strong>{m.role}</strong> : null}
                    {m.memberCode ? <span>Member ID <strong>{m.memberCode}</strong></span> : null}
                  </div>
                </div>
                <div className="pf-actions">
                  {invitePending && m.inviteCode ? <button type="button" className="pf-btn" onClick={resendInvite}>Resend invitation</button> : null}
                  <button type="button" className="pf-btn pf-btn-gold" onClick={openStatus}>Change status</button>
                </div>
              </div>

              <div className="pf-grid">
                <section className="pf-card" style={{ ['--dot' as any]: '#F4B6BD' }}>
                  <h2>Personal Information</h2>
                  <Row label="First name" value={m.firstName} />
                  <Row label="Last name" value={m.lastName} />
                  <Row label="Date of birth" value={fmtDate(m.dateOfBirth)} />
                  <Row label="Gender" value={m.gender} />
                  <Row label="Marital status" value={m.maritalStatus} />
                </section>

                <section className="pf-card" style={{ ['--dot' as any]: '#A9CC86' }}>
                  <h2>Contact Information</h2>
                  <Row label="Email" value={m.email} />
                  <Row label="Phone" value={m.phone} />
                  <Row label="Street" value={addr.street} />
                  <Row label="City" value={[addr.city, addr.state].filter(Boolean).join(', ')} />
                  <Row label="Postal code" value={addr.zip} />
                  <Row label="Country" value={addr.country} />
                </section>

                <section className="pf-card" style={{ ['--dot' as any]: '#D8B15A' }}>
                  <h2>Family</h2>
                  <Row label="Spouse" value={m.spouseName} />
                  <Row label="Family" value={m.familyName} />
                </section>

                <section className="pf-card" style={{ ['--dot' as any]: '#F4B6BD' }}>
                  <h2>Church Information</h2>
                  <Row label="Role / Position" value={m.role} />
                  <Row label="Ministry" value={m.ministryName} />
                  <Row label="Group" value={m.groupName} />
                  <Row label="Date joined" value={fmtDate(m.dateJoined)} />
                  <Row label="Baptism date" value={fmtDate(m.baptismDate)} />
                </section>

                <section className="pf-card" style={{ ['--dot' as any]: '#A9CC86' }}>
                  <h2>Account &amp; History</h2>
                  <Row label="Status" value={statusLabel(m.status, m.statusDetail)} />
                  <Row label="Account" value={m.userId ? 'Joined UNIMUNITY' : invitePending ? 'Invitation pending' : 'No email on file'} />
                  <Row label="Added on" value={fmtDate(toMillis(m.createdAt))} />
                  <Row label="Last updated" value={fmtDate(toMillis(m.updatedAt))} />
                </section>

                <section className="pf-card" style={{ ['--dot' as any]: '#D8B15A' }}>
                  <h2>Additional Information</h2>
                  <Row label="National ID" value={maskedId} />
                </section>

                <section className="pf-card pf-wide" style={{ ['--dot' as any]: '#D8B15A' }}>
                  <h2>Notes</h2>
                  {m.notes ? <p className="pf-notes">{m.notes}</p> : <p className="pf-notes" style={{ color: '#A3ABB8' }}>No notes yet.</p>}
                </section>
              </div>
            </>
          )}

          <div className="pf-footer">
            Powered by UNIMUNITY&trade; &middot; A product of Ma Production Luxenn Zara LLC &middot; &copy; 2026 All Rights Reserved &middot; v1.0.0
          </div>
        </div>
      </div>

      {statusOpen ? (
        <div className="pf-modal-bg" onClick={() => !saving && setStatusOpen(false)}>
          <div className="pf-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Change status</h3>
            <select className="pf-input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} aria-label="Member status">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {newStatus === 'Other' ? (
              <input className="pf-input" style={{ marginTop: 8 }} placeholder="Type the status" value={newStatusOther} onChange={(e) => setNewStatusOther(e.target.value)} autoFocus />
            ) : null}
            <div className="pf-modal-actions">
              <button type="button" className="pf-btn" onClick={() => setStatusOpen(false)} disabled={saving}>Cancel</button>
              <button type="button" className="pf-btn pf-btn-gold" onClick={saveStatus} disabled={saving || (newStatus === 'Other' && !newStatusOther.trim())}>{saving ? 'Saving...' : 'Save status'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
