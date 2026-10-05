'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDoc, doc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import { authHeaders } from '@/lib/authFetch';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#3A2F1F',
  muted: '#8A7B6C',
  border: '#F0E4D6',
  success: '#3F7D5C',
  successBg: '#E4F0E9',
  danger: '#B0525F',
  dangerBg: '#F5E4E6',
  warning: '#9C7A2E',
  warningBg: '#FBF0D9',
};

const inputStyle = {
  width: '100%', padding: '7px 11px', borderRadius: 10, border: '1.5px solid #EAD9BE',
  fontSize: 13.5, color: C.text, background: '#FFFDF9', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
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
  const [showCount, setShowCount] = useState('10');

  useEffect(() => { setMounted(true); }, []);

  // --- Load the groups this admin organizes (handles organizerId or adminId) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setGroupsLoading(false); router.push('/login'); return; }
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
          headers: { 'Content-Type': 'application/json' , ...(await authHeaders('admin')) },
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

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const visible = showCount === 'all' ? filtered : filtered.slice(0, parseInt(showCount));
  const sumBy = (list: OverdueMember[]) => {
    const totals: Record<string, number> = {};
    list.forEach(m => { totals[m.currency] = (totals[m.currency] || 0) + m.amountOwed; });
    const parts = Object.entries(totals).map(([cur, v]) => cur + ' ' + v.toFixed(2));
    return parts.length ? parts.join(' + ') : '-';
  };
  const selectedMembers = overdue.filter(m => selected[m.memberId]);
  const sentCount = Object.values(sendResults).filter(r => r.status === 'sent').length;
  const failedCount = Object.values(sendResults).filter(r => r.status === 'error').length;
  const noEmailCount = overdue.filter(m => !m.email).length;

  const cardStyle = { background: C.blanc, borderRadius: 16, border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 900px) {
          .rm-grid { grid-template-columns: 1fr !important; }
          .rm-row { flex-wrap: wrap; }
        }
        .rm-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .rm-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .rm-head { display: flex; align-items: center; gap: 11px; }
        .rm-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .rm-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .rm-form input, .rm-form select { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .rm-form input[type="text"]:focus, .rm-form select:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .rm-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .rm-back:hover { background: #FBEEDD; }
        .rm-row:hover { background: #FFFBF5; }
        .rm-submit { transition: transform 0.15s ease, filter 0.15s ease; }
        .rm-submit:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
      `}</style>
      <div style={{ flex: 1 }}>

      <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Send Reminders</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Members below have missed at least one payment on the current grid.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="rm-form" style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="rm-back">Back to Dashboard</button>
        </div>

        <div className="rm-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

            {/* Group selector - compact horizontal card */}
            <div className="rm-card" style={{ ...cardStyle, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 18 }}>
              <div className="rm-head" style={{ flexShrink: 0 }}>
                <span className="rm-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\ud83c\udfd8\ufe0f'}</span>
                <h2 className="rm-title">Group</h2>
              </div>
              <div style={{ flex: 1 }}>
                {groupsLoading ? (
                  <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Loading your groups...</p>
                ) : groups.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                    You have no groups yet.{' '}
                    <span onClick={() => router.push('/dashboard/create-tontine')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Create a group first</span>
                  </p>
                ) : (
                  <select style={inputStyle} value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            {selectedGroupId && !dataLoading && !gridExists && (
              <div style={{ background: C.warningBg, color: C.warning, borderRadius: 14, padding: '14px 18px', fontSize: 13, fontWeight: 600, border: '1px solid #EBD9A8' }}>
                No payment grid has been created yet for this group, so there is nothing to check for overdue members. Open the Payment Grid page for this group first.
              </div>
            )}

            {selectedGroupId && dataLoading && (
              <div className="rm-card" style={{ ...cardStyle, padding: '40px 20px', textAlign: 'center' as const, color: C.muted, fontSize: 14 }}>Checking payment grid...</div>
            )}

            {selectedGroupId && !dataLoading && gridExists && (
              <div className="rm-card" style={{ ...cardStyle, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
                  <div className="rm-head" style={{ flexShrink: 0 }}>
                    <span className="rm-ico" style={{ background: 'linear-gradient(135deg,#F4B6C7,#B0525F)' }}>{'\u23f0'}</span>
                    <h2 className="rm-title">Overdue Members <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>({overdue.length})</span></h2>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Show:</span>
                    <select value={showCount} onChange={e => setShowCount(e.target.value)}
                      style={{ ...inputStyle, width: 'auto', padding: '5px 9px', fontSize: 12.5 }}>
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                </div>

                <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3E6D8', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const, background: '#FFFCF7' }}>
                  <input type="text" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 180, width: 'auto', padding: '8px 12px', fontSize: 13 }} />
                  <button onClick={toggleAll} disabled={filtered.length === 0}
                    style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer' }}>
                    {allFilteredSelected ? 'Unselect All' : 'Select All'}
                  </button>
                </div>

                {filtered.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center' as const, color: overdue.length === 0 ? C.success : C.muted, fontSize: 14, fontWeight: 600 }}>
                    {overdue.length === 0 ? '\u2705 Nobody is overdue right now. Everyone is caught up.' : 'No members match your search.'}
                  </div>
                ) : (
                  <div>
                    {visible.map((m, i) => {
                      const result = sendResults[m.memberId];
                      const initial = (m.fullName || '?').trim().charAt(0).toUpperCase();
                      return (
                        <label key={m.memberId} className="rm-row"
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: '1px solid #F7EEE3', cursor: 'pointer', background: i % 2 === 1 ? '#FFFDF9' : C.blanc }}>
                          <input type="checkbox" checked={!!selected[m.memberId]}
                            onChange={e => setSelected(prev => ({ ...prev, [m.memberId]: e.target.checked }))}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.bordeaux }} />
                          <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#F6E3C4', color: C.bordeauxDark, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initial}</span>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: C.text, margin: 0 }}>{m.fullName}</p>
                            <p style={{ fontSize: 11.5, color: m.email ? C.muted : C.danger, margin: '2px 0 0' }}>{m.email || 'No email on file'}{m.phone ? ' \u00b7 ' + m.phone : ''}</p>
                          </div>
                          <div style={{ textAlign: 'right' as const, minWidth: 110 }}>
                            <span style={{ fontSize: 11, color: C.danger, fontWeight: 700, background: C.dangerBg, padding: '2px 8px', borderRadius: 8 }}>{m.missingWeeksCount} week{m.missingWeeksCount > 1 ? 's' : ''} missed</span>
                            <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: '4px 0 0' }}>{m.currency} {m.amountOwed.toFixed(2)}</p>
                          </div>
                          <div style={{ minWidth: 70, textAlign: 'right' as const }}>
                            {result?.status === 'sending' && <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 700 }}>Sending...</span>}
                            {result?.status === 'sent' && <span style={{ fontSize: 11.5, color: C.success, fontWeight: 700, background: C.successBg, padding: '4px 10px', borderRadius: 8 }}>Sent</span>}
                            {result?.status === 'error' && <span style={{ fontSize: 11.5, color: C.danger, fontWeight: 700, background: C.dangerBg, padding: '4px 10px', borderRadius: 8 }} title={result.message}>Failed</span>}
                          </div>
                        </label>
                      );
                    })}
                    {visible.length < filtered.length && (
                      <div style={{ padding: '10px 20px', textAlign: 'center' as const, fontSize: 12, color: C.muted }}>
                        Showing {visible.length} of {filtered.length}.{' '}
                        <span onClick={() => setShowCount('all')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Show all</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column - summary + send */}
          <div className="rm-card" style={{ ...cardStyle, padding: '22px', position: 'sticky' as const, top: 24 }}>
            <div style={{ textAlign: 'center' as const, margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '16px 16px 0 0', borderBottom: '1px solid ' + C.border }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>{selectedGroup?.name || groupName || 'No group'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase' as const, letterSpacing: 1.2 }}>Reminder Summary</p>
            </div>
            {[
              { label: 'Overdue members', value: String(overdue.length), color: overdue.length ? C.danger : C.success },
              { label: 'Total overdue', value: sumBy(overdue) },
              { label: 'No email on file', value: String(noEmailCount), color: noEmailCount ? C.warning : undefined },
              { label: 'Selected', value: String(selectedIds.length), color: C.bordeaux },
              { label: 'Selected amount', value: sumBy(selectedMembers) },
              { label: 'Sent', value: String(sentCount), color: sentCount ? C.success : undefined },
              { label: 'Failed', value: String(failedCount), color: failedCount ? C.danger : undefined },
              { label: 'Signed as', value: adminName || '-' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color || C.text, maxWidth: 150, textAlign: 'right' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.value}</span>
              </div>
            ))}

            <div style={{ marginTop: 14, padding: '10px 12px', background: C.creme, borderRadius: 10, border: '1px solid ' + C.orLight }}>
              <p style={{ fontSize: 11.5, color: C.text, margin: 0, lineHeight: 1.55 }}>
                Each selected member receives an email with the amount owed and the earliest missed date. Members without an email will be marked as failed.
              </p>
            </div>

            <button onClick={handleSend} disabled={selectedIds.length === 0 || sending} className="rm-submit"
              style={{ width: '100%', marginTop: 14, padding: '11px', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: C.blanc, border: 'none', borderRadius: 14, fontSize: 14.5, fontWeight: 800, letterSpacing: 0.3, cursor: (selectedIds.length === 0 || sending) ? 'not-allowed' : 'pointer', opacity: (selectedIds.length === 0 || sending) ? 0.55 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
              {sending ? 'Sending...' : '\ud83d\udce8  Send Email Reminder (' + selectedIds.length + ')'}
            </button>
            <div style={{ textAlign: 'center' as const, marginTop: 8 }}>
              <button onClick={() => router.push('/dashboard/contribution-log?groupId=' + selectedGroupId)} disabled={!selectedGroupId}
                style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}>
                View Register
              </button>
            </div>
          </div>
        </div>

      </div>

      </div>
      <Footer />
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
