'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDoc, doc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#1a1a1a',
  muted: '#6b7280',
  border: '#e5e7eb',
  success: '#3F7D5C',
  successBg: '#E4F0E9',
  danger: '#B0525F',
  dangerBg: '#F5E4E6',
  warning: '#9C7A2E',
  warningBg: '#FBF0D9',
};

type OverdueMember = {
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  missingWeeksCount: number;
  amountOwed: number;
  currency: string;
  earliestMissedDate: string;
};

type SendResult = { memberId: string; status: 'sending' | 'sent' | 'error'; message?: string };

function RemindersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get('groupId') || '';

  const [adminUid, setAdminUid] = useState('');
  const [adminName, setAdminName] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(urlGroupId);
  const [groupName, setGroupName] = useState('');

  const [overdue, setOverdue] = useState<OverdueMember[]>([]);
  const [gridExists, setGridExists] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<Record<string, SendResult>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // --- Load the groups this admin organizes (handles organizerId or adminId) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setGroupsLoading(false); return; }
      setAdminUid(u.uid);
      try {
        const userSnap = await getDoc(doc(db, 'users', u.uid));
        setAdminName(userSnap.exists() ? (userSnap.data().name || userSnap.data().displayName || u.email || 'Your organizer') : (u.email || 'Your organizer'));

        const [byOrganizer, byAdmin] = await Promise.all([
          getDocs(query(collection(db, 'groups'), where('organizerId', '==', u.uid))),
          getDocs(query(collection(db, 'groups'), where('adminId', '==', u.uid))),
        ]);
        const map = new Map<string, any>();
        byOrganizer.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        byAdmin.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        const groupList = Array.from(map.values());
        setGroups(groupList);
        if (!urlGroupId && groupList.length > 0) {
          setSelectedGroupId(groupList[0].id);
        }
      } catch (e) { console.error(e); }
      setGroupsLoading(false);
    });
    return () => unsub();
  }, [urlGroupId]);

  // --- Compute real overdue members from the payment grid ---
  useEffect(() => {
    if (!selectedGroupId) { setOverdue([]); return; }
    const loadOverdue = async () => {
      setDataLoading(true);
      setSelected({});
      setSendResults({});
      try {
        const gSnap = await getDoc(doc(db, 'groups', selectedGroupId));
        setGroupName(gSnap.exists() ? (gSnap.data().name || 'Group') : 'Group');

        const gridSnap = await getDoc(doc(db, 'paymentGrids', selectedGroupId + '_current'));
        if (!gridSnap.exists()) {
          setGridExists(false);
          setOverdue([]);
          setDataLoading(false);
          return;
        }
        setGridExists(true);
        const grid = gridSnap.data() as any;
        const weeks: Record<string, string> = grid.weeks || {};
        const slots: Record<string, any> = grid.slots || {};
        const payments: Record<string, Record<string, boolean>> = grid.payments || {};

        const today = new Date();
        const elapsedWeekIdxs = Object.entries(weeks)
          .filter(([, dateStr]) => new Date(dateStr as string) <= today)
          .map(([idx]) => idx);

        const slotsByMember: Record<string, string[]> = {};
        Object.entries(slots).forEach(([slotNum, slot]: [string, any]) => {
          if (!slotsByMember[slot.memberId]) slotsByMember[slot.memberId] = [];
          slotsByMember[slot.memberId].push(slotNum);
        });

        const membersSnap = await getDocs(query(collection(db, 'members'), where('groupId', '==', selectedGroupId)));
        const membersById: Record<string, any> = {};
        membersSnap.docs.forEach(d => { membersById[d.id] = { id: d.id, ...d.data() }; });

        const results: OverdueMember[] = [];
        Object.entries(slotsByMember).forEach(([memberId, slotNums]) => {
          const member = membersById[memberId];
          if (!member) return;
          let missingSlotWeeks = 0;
          const missingWeekIdxSet = new Set<string>();
          slotNums.forEach(slotNum => {
            elapsedWeekIdxs.forEach(wIdx => {
              const paid = payments?.[slotNum]?.[wIdx];
              if (!paid) {
                missingSlotWeeks++;
                missingWeekIdxSet.add(wIdx);
              }
            });
          });
          if (missingSlotWeeks > 0) {
            const missedDates = Array.from(missingWeekIdxSet).map(idx => weeks[idx]).filter(Boolean).sort();
            results.push({
              memberId,
              fullName: member.fullName || member.name || '(no name)',
              email: member.email || '',
              phone: member.phone || '',
              missingWeeksCount: missingWeekIdxSet.size,
              amountOwed: (member.expectedAmount || 0) * missingSlotWeeks,
              currency: member.currency || 'USD',
              earliestMissedDate: missedDates[0] || '',
            });
          }
        });
        results.sort((a, b) => b.amountOwed - a.amountOwed);
        setOverdue(results);
      } catch (e) {
        console.error(e);
        setOverdue([]);
      }
      setDataLoading(false);
    };
    loadOverdue();
  }, [selectedGroupId]);

  const filtered = overdue.filter(m => m.fullName.toLowerCase().includes(search.toLowerCase()));
  const selectedIds = Object.keys(selected).filter(id => selected[id]);
  const allFilteredSelected = filtered.length > 0 && filtered.every(m => selected[m.memberId]);

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = { ...selected };
      filtered.forEach(m => { next[m.memberId] = false; });
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach(m => { next[m.memberId] = true; });
      setSelected(next);
    }
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    const initial: Record<string, SendResult> = {};
    selectedIds.forEach(id => { initial[id] = { memberId: id, status: 'sending' }; });
    setSendResults(prev => ({ ...prev, ...initial }));

    for (const memberId of selectedIds) {
      const member = overdue.find(m => m.memberId === memberId);
      if (!member) continue;
      if (!member.email) {
        setSendResults(prev => ({ ...prev, [memberId]: { memberId, status: 'error', message: 'No email on file' } }));
        continue;
      }
      try {
        const res = await fetch('/api/send-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberEmail: member.email,
            memberName: member.fullName,
            groupName: groupName,
            amount: member.amountOwed ? member.amountOwed.toFixed(2) : undefined,
            dueDate: member.earliestMissedDate || undefined,
            adminName: adminName,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Send failed');
        }
        setSendResults(prev => ({ ...prev, [memberId]: { memberId, status: 'sent' } }));
        try {
          await addDoc(collection(db, 'audit_logs'), {
            organizerId: adminUid, category: 'Payment',
            action: 'Sent payment reminder',
            user: adminName, details: member.fullName + ' - ' + member.currency + ' ' + member.amountOwed.toFixed(2),
            createdAt: serverTimestamp(),
          });
        } catch (auditErr) { /* silent - audit logging must never block sending */ }
      } catch (e: any) {
        setSendResults(prev => ({ ...prev, [memberId]: { memberId, status: 'error', message: e?.message || 'Failed to send' } }));
      }
    }
    setSending(false);
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        rowGap: '10px',
      }}>
        <div>
          <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '52px', width: 'auto', display: 'block' }} />
          <div style={{ color: '#C4748E', fontSize: '9px', letterSpacing: '2px', fontStyle: 'italic', marginTop: '2px' }}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <DateTimeWeather textColor="rgba(251,238,221,0.85)" />
        </div>
      </div>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 24px' }}>

        <div style={{ marginBottom: 20 }}>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: 0 }}>
            Back to Dashboard
          </button>
        </div>

        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', textAlign: 'center' as const }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Send Reminders</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>Members shown below have missed at least one payment on the current grid.</p>
        </div>

        <div style={{ background: C.blanc, borderRadius: 16, padding: '20px 24px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 18 }}>
          {groupsLoading ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Loading your groups...</p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>You have no groups yet.</p>
          ) : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' as const }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Group</label>
                <select
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid ' + C.border, fontSize: 14, color: C.text, background: C.blanc, outline: 'none', boxSizing: 'border-box' as const }}
                  value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Overdue</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: C.danger, margin: 0 }}>{overdue.length}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Selected</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: C.bordeaux, margin: 0 }}>{selectedIds.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedGroupId && !dataLoading && !gridExists && (
          <div style={{ background: C.warningBg, color: C.warning, borderRadius: 12, padding: '16px 20px', fontSize: 13, marginBottom: 18 }}>
            No payment grid has been created yet for this group, so there is nothing to check for overdue members. Open the Payment Grid page for this group first.
          </div>
        )}

        {selectedGroupId && !dataLoading && gridExists && (
          <div style={{ background: C.blanc, borderRadius: 16, border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid ' + C.border, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
              <input
                placeholder="Search by name..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 180, padding: '9px 12px', borderRadius: 9, border: '1.5px solid ' + C.border, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
              />
              <button onClick={toggleAll} disabled={filtered.length === 0}
                style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 9, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer' }}>
                {allFilteredSelected ? 'Unselect All' : 'Select All'}
              </button>
              <button onClick={handleSend} disabled={selectedIds.length === 0 || sending}
                style={{ background: C.bordeaux, color: C.blanc, border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 12.5, fontWeight: 700, cursor: (selectedIds.length === 0 || sending) ? 'not-allowed' : 'pointer', opacity: (selectedIds.length === 0 || sending) ? 0.6 : 1 }}>
                {sending ? 'Sending...' : `Send Email Reminder (${selectedIds.length})`}
              </button>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: C.success, fontSize: 14 }}>
                {overdue.length === 0 ? 'Nobody is overdue right now. Everyone is caught up.' : 'No members match your search.'}
              </div>
            ) : (
              <div>
                {filtered.map(m => {
                  const result = sendResults[m.memberId];
                  return (
                    <div key={m.memberId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid ' + C.border }}>
                      <input type="checkbox" checked={!!selected[m.memberId]}
                        onChange={e => setSelected(prev => ({ ...prev, [m.memberId]: e.target.checked }))}
                        style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{m.fullName}</p>
                        <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{m.email || 'No email on file'}{m.phone ? ' - ' + m.phone : ''}</p>
                      </div>
                      <div style={{ textAlign: 'right' as const, minWidth: 90 }}>
                        <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, margin: 0 }}>{m.missingWeeksCount} week{m.missingWeeksCount > 1 ? 's' : ''} missed</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '2px 0 0' }}>{m.currency} {m.amountOwed.toFixed(2)}</p>
                      </div>
                      <div style={{ minWidth: 100, textAlign: 'right' as const }}>
                        {result?.status === 'sending' && <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 700 }}>Sending...</span>}
                        {result?.status === 'sent' && <span style={{ fontSize: 11.5, color: C.success, fontWeight: 700, background: C.successBg, padding: '4px 10px', borderRadius: 8 }}>Sent</span>}
                        {result?.status === 'error' && <span style={{ fontSize: 11.5, color: C.danger, fontWeight: 700, background: C.dangerBg, padding: '4px 10px', borderRadius: 8 }} title={result.message}>Failed</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedGroupId && dataLoading && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>Checking payment grid...</div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 40, letterSpacing: 0.3 }}>
          Powered by UNIMUNITYTM - A product of Ma Production Luxenn Zara LLC - (c) 2026 All Rights Reserved - v1.0.0
        </p>
      </div>
    </div>
  );
}

export default function RemindersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <RemindersContent />
    </Suspense>
  );
}
