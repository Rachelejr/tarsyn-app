'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, addDoc, updateDoc, writeBatch, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import DateTimeWeather from '@/components/DateTimeWeather';
import { buildReceiptHtml } from '@/lib/receiptHtml';
import { buildGridPeriods, PERIOD_STATUS_LABEL } from '@/lib/gridPeriods';
import { computeDues, contributionPerPeriod, paidPeriodsInCycle } from '@/lib/dues';
import { analyzeGrid, gridNeedsRepair } from '@/lib/gridHealth';
import { normalizeFrequency } from '@/lib/dues';
import { authHeaders } from '@/lib/authFetch';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  ivoire: '#FFFDF7',
  border: '#EAD9BE',
  texteGris: '#8A7B6C',
  texteFonce: '#3A2F1F',
  success: '#3F7D5C',
  successBg: '#E4F0E9',
  danger: '#B0525F',
  dangerBg: '#F5E4E6',
  warning: '#9C7A2E',
  warningBg: '#FBF0D9',
};

const WEEKS_PER_PAGE = 6;

// Same rotating palette as the member portal, so each week's paid color
// matches between the admin grid and what members see on their side.
const PAID_WEEK_COLORS = ['#3F7D5C', '#2F5BA8', '#9A6A00', '#7B4B94', '#1F7A8C', '#C77B3D'];
const paidWeekColor = (wIdx: string) => PAID_WEEK_COLORS[parseInt(wIdx, 10) % PAID_WEEK_COLORS.length] || PAID_WEEK_COLORS[0];

interface Slot {
  slotNumber: string;
  memberId: string;
  memberName: string;
}

interface Grid {
  organizerId: string;
  groupId: string;
  cycleId: string;
  startYear: number;
  startDate: string;
  weeks: Record<string, string>;
  slots: Record<string, Slot>;
  payments: Record<string, Record<string, boolean>>;
  // Tontine cycle (one full rotation of the sol). Missing on older grids,
  // which are treated as cycle 1, active, with no end date yet.
  cycleNumber?: number;
  cycleEndDate?: string;
  status?: 'active' | 'completed';
  currency?: string;
  cycleHistory?: CycleHistoryEntry[];
  renewalAskedFor?: number;
  renewalAskedAt?: string;
}

interface CycleHistoryEntry {
  cycleNumber: number;
  archiveId: string;
  startDate: string;
  endDate: string;
}

// Cycle details copied into every member view, so members can see which
// cycle they are in and open archived cycles (they cannot read the grids).
interface CycleInfo {
  cycleNumber: number;
  cycleStart: string;
  cycleEnd: string | null;
  cycleHistory: CycleHistoryEntry[];
}

interface RenewSlot {
  memberId: string;
  memberName: string;
  include: boolean;
}

interface MemberView extends CycleInfo {
  memberName: string;
  slots: string[];
  weeks: Record<string, string>;
  payments: Record<string, Record<string, boolean>>;
}

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

const stripPartSuffix = (name: string) => name.replace(/\s*\(part \d+\/\d+\)$/, '');

interface MemberMeta {
  status: string;
  joinedLabel: string;
}

// Without an end date (older grids), weeks run through Dec 31 of the current
// year, as before. With a cycle end date, the grid stops at that date and no
// longer grows on its own when a new year starts.
function generateWeeksFromDate(startDateStr: string, endDateStr?: string): Record<string, string> {
  const weeks: Record<string, string> = {};
  const start = new Date(startDateStr);
  let end: Date;
  if (endDateStr) {
    // Include the whole end day: after the November time change the weekly
    // cursor sits an hour later, which would otherwise drop the last week.
    end = new Date(endDateStr);
    end.setUTCHours(23, 59, 59, 999);
  } else {
    const startYear = start.getFullYear();
    const currentYear = new Date().getFullYear();
    const endYear = Math.max(startYear, currentYear);
    end = new Date(endYear, 11, 31);
  }
  let idx = 0;
  let cursor = new Date(start);
  while (cursor <= end) {
    weeks[String(idx)] = cursor.toISOString().split('T')[0];
    idx++;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

function startOfGridDate(weeks: Record<string, string>): string | null {
  const dates = Object.values(weeks).filter(Boolean).sort();
  return dates.length > 0 ? dates[0] : null;
}

export default function PaymentGridPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [groupFrequency, setGroupFrequency] = useState('');
  const [groupCurrency, setGroupCurrency] = useState('USD');
  const [repairing, setRepairing] = useState(false);
  const [memberSince, setMemberSince] = useState<Record<string, unknown>>({});
  const [groupBrand, setGroupBrand] = useState<{ logo?: string; enabled?: boolean; showUNIMUNITYBadge?: boolean } | null>(null);
  const [memberMeta, setMemberMeta] = useState<Record<string, MemberMeta>>({});
  const [memberUserIds, setMemberUserIds] = useState<Record<string, string>>({});
  const [memberAmounts, setMemberAmounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [weeklyAmount, setWeeklyAmount] = useState<number | null>(null);
  const [showStartDateEditor, setShowStartDateEditor] = useState(false);
  const [gridStartInput, setGridStartInput] = useState('');
  const [savingStartDate, setSavingStartDate] = useState(false);
  const [showCycleEndEditor, setShowCycleEndEditor] = useState(false);
  const [cycleEndInput, setCycleEndInput] = useState('');
  const [savingCycleEnd, setSavingCycleEnd] = useState(false);
  const [suggestedCycleEnd, setSuggestedCycleEnd] = useState('');
  const [showRenew, setShowRenew] = useState(false);
  const [renewStart, setRenewStart] = useState('');
  const [renewEnd, setRenewEnd] = useState('');
  const [renewSlots, setRenewSlots] = useState<RenewSlot[]>([]);
  const [renewing, setRenewing] = useState(false);
  const [renewResponses, setRenewResponses] = useState<Record<string, 'yes' | 'pause' | 'no'>>({});
  const [askingMembers, setAskingMembers] = useState(false);
  const [renewNotes, setRenewNotes] = useState<Record<string, string>>({});

  const [pendingPayments, setPendingPayments] = useState<Record<string, Record<string, boolean>>>({});
  const [savingAll, setSavingAll] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [pageStart, setPageStart] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const gridId = groupId + '_current';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadGrid();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function loadGrid() {
    setLoading(true);
    try {
      const [groupSnap, gridSnap] = await Promise.all([
        getDoc(doc(db, 'groups', groupId)),
        getDoc(doc(db, 'paymentGrids', gridId)),
      ]);
      if (groupSnap.exists()) {
        setGroupName(groupSnap.data().name || 'Group');
        setGroupBrand(groupSnap.data().groupBrand || null);
        setGroupFrequency(groupSnap.data().frequency || groupSnap.data().paymentFrequency || '');
        setGroupCurrency(String(groupSnap.data().currency || 'USD').toUpperCase());
        // Group contribution per period (same lookup as everywhere else).
        const amt = Number(groupSnap.data().weeklyAmount || groupSnap.data().contributionAmount) || contributionPerPeriod(null, groupSnap.data());
        if (amt > 0) setWeeklyAmount(amt);
      }

      let loadedGrid: Grid;

      if (gridSnap.exists()) {
        loadedGrid = gridSnap.data() as Grid;

        // Members added to the group AFTER the grid was first created were
        // never given a row. Add a slot (one per share) for every member of
        // the group that is not in the grid yet, in position order, and save.
        // Existing slots, payments and history are never changed.
        const groupMembersSnap = await getDocs(query(collection(db, 'members'), where('groupId', '==', groupId)));
        const inGrid = new Set(Object.values(loadedGrid.slots || {}).map((sl) => sl.memberId));
        const missing = groupMembersSnap.docs
          .filter((m) => !inGrid.has(m.id))
          .sort((a, b) => (Number(a.data().position) || 9999) - (Number(b.data().position) || 9999));
        if (missing.length > 0) {
          const nextSlots: Record<string, Slot> = { ...(loadedGrid.slots || {}) };
          let slotCounter = Object.keys(nextSlots).reduce((max, k) => Math.max(max, Number(k) || 0), 0) + 1;
          const added: { userId?: string; memberName: string; slotNums: string[] }[] = [];
          missing.forEach((m) => {
            const data = m.data();
            const shares = Math.max(1, parseInt(data.shares) || 1);
            const displayName = data.fullName || data.name || '(no name)';
            const slotNums: string[] = [];
            for (let sh = 0; sh < shares; sh++) {
              const num = String(slotCounter++);
              nextSlots[num] = {
                slotNumber: num,
                memberId: m.id,
                memberName: shares > 1 ? `${displayName} (part ${sh + 1}/${shares})` : displayName,
              };
              slotNums.push(num);
            }
            added.push({ userId: data.userId, memberName: displayName, slotNums });
          });
          loadedGrid = { ...loadedGrid, slots: nextSlots };
          await setDoc(doc(db, 'paymentGrids', gridId), { slots: nextSlots }, { merge: true });
          // Registered members also get their read-only view right away, so the
          // member portal shows their grid without waiting for a payment save.
          await Promise.all(added.filter((a) => a.userId).map((a) =>
            setDoc(doc(db, 'paymentGrids', gridId, 'memberViews', a.userId as string), {
              memberName: a.memberName,
              slots: a.slotNums,
              weeks: loadedGrid.weeks || {},
              payments: {},
              cycleNumber: loadedGrid.cycleNumber || 1,
              cycleStart: loadedGrid.startDate || '',
              cycleEnd: loadedGrid.cycleEndDate || null,
              cycleHistory: loadedGrid.cycleHistory || [],
            }, { merge: true }).catch(() => undefined)
          ));
        }
      } else {
        const membersQuery = query(
          collection(db, 'members'),
          where('groupId', '==', groupId)
        );
        const membersSnap = await getDocs(membersQuery);

        const slots: Record<string, Slot> = {};
        let slotCounter = 1;
        membersSnap.forEach((m) => {
          const data = m.data();
          const memberShares = Math.max(1, parseInt(data.shares) || 1);
          const displayName = data.fullName || data.name || '(no name)';
          for (let s = 0; s < memberShares; s++) {
            slots[String(slotCounter)] = {
              slotNumber: String(slotCounter),
              memberId: m.id,
              memberName: memberShares > 1 ? `${displayName} (part ${s + 1}/${memberShares})` : displayName,
            };
            slotCounter++;
          }
        });

        const groupStart = groupSnap.data()?.startDate;
        const initialStartDate = groupStart || new Date().toISOString().split('T')[0];
        const weeks: Record<string, string> = generateWeeksFromDate(initialStartDate);

        loadedGrid = {
          organizerId: groupSnap.data()?.organizerId || groupSnap.data()?.adminId || '',
          groupId,
          cycleId: 'cycle-' + Date.now(),
          startYear: new Date(initialStartDate).getFullYear(),
          startDate: initialStartDate,
          weeks,
          slots,
          payments: {},
        };

        await setDoc(doc(db, 'paymentGrids', gridId), loadedGrid);
      }

      const effectiveStartDate = loadedGrid.startDate || startOfGridDate(loadedGrid.weeks) || new Date().toISOString().split('T')[0];
      const correctedWeeks = generateWeeksFromDate(effectiveStartDate, loadedGrid.cycleEndDate);
      const weeksChanged = JSON.stringify(correctedWeeks) !== JSON.stringify(loadedGrid.weeks);
      if (weeksChanged || !loadedGrid.startDate) {
        loadedGrid = { ...loadedGrid, startDate: effectiveStartDate, startYear: new Date(effectiveStartDate).getFullYear(), weeks: correctedWeeks };
        await setDoc(doc(db, 'paymentGrids', gridId), { startDate: effectiveStartDate, startYear: new Date(effectiveStartDate).getFullYear(), weeks: correctedWeeks }, { merge: true });
      }

      const slotsByMember: Record<string, string[]> = {};
      Object.entries(loadedGrid.slots).forEach(([slotNum, slot]) => {
        if (!slotsByMember[slot.memberId]) slotsByMember[slot.memberId] = [];
        slotsByMember[slot.memberId].push(slotNum);
      });

      const refreshedSlots: Record<string, Slot> = {};
      const collectedUserIds: Record<string, string> = {};
      const collectedAmounts: Record<string, number> = {};
      const collectedMeta: Record<string, MemberMeta> = {};
      const collectedSince: Record<string, unknown> = {};
      let latestPayout = '';
      await Promise.all(
        Object.entries(loadedGrid.slots).map(async ([slotNum, slot]) => {
          let displayName = slot.memberName;
          try {
            const memberSnap = await getDoc(doc(db, 'members', slot.memberId));
            if (memberSnap.exists()) {
              const d = memberSnap.data();
              displayName = d.fullName || d.name || '(no name)';
              if (d.userId) collectedUserIds[slot.memberId] = d.userId;
              if (typeof d.expectedAmount === 'number' && d.expectedAmount > 0) collectedAmounts[slot.memberId] = d.expectedAmount;
              // Latest payout date among members = suggested end of the cycle.
              const payoutList: string[] = [
                ...(typeof d.payoutDate === 'string' ? [d.payoutDate] : []),
                ...(Array.isArray(d.payoutDates) ? d.payoutDates.filter((x: unknown) => typeof x === 'string') : []),
              ];
              payoutList.forEach((pd) => { if (/^\d{4}-\d{2}-\d{2}$/.test(pd) && pd > latestPayout) latestPayout = pd; });

              // Merged from the former loadMemberMeta() — same member document,
              // no need for a second separate Firestore read afterward.
              const status = d.status || 'active';
              let joinedLabel = '';
              const rawDate = d.joinedAt || d.createdAt;
              if (rawDate?.toDate) {
                joinedLabel = rawDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              } else if (typeof rawDate === 'string') {
                joinedLabel = new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }
              collectedMeta[slot.memberId] = { status, joinedLabel };
              collectedSince[slot.memberId] = d.createdAt || null;
            }
          } catch {
            // Silent fail - keep the previously stored name.
          }
          const siblingSlots = slotsByMember[slot.memberId] || [slotNum];
          if (siblingSlots.length > 1) {
            const partIndex = siblingSlots.indexOf(slotNum) + 1;
            displayName = `${displayName} (part ${partIndex}/${siblingSlots.length})`;
          }
          refreshedSlots[slotNum] = { ...slot, memberName: displayName };
        })
      );
      loadedGrid = { ...loadedGrid, slots: refreshedSlots };
      setMemberUserIds(collectedUserIds);
      setMemberAmounts(collectedAmounts);
      setMemberMeta(collectedMeta);
      setMemberSince(collectedSince);
      setSuggestedCycleEnd(latestPayout);

      setGrid(loadedGrid);
      setPendingPayments(loadedGrid.payments || {});
    } catch (err) {
      console.error('Error loading grid:', err);
    } finally {
      setLoading(false);
    }
  }

  // loadMemberMeta was merged into loadGrid()'s main Promise.all above —
  // it fetched the same member documents a second time, which is now avoided.


  // Local-only toggle - nothing is written to Firestore until Save Payments is clicked
  function toggleQueuedPayment(slotNumber: string, weekIndex: string) {
    setPendingPayments((prev) => {
      const current = prev[slotNumber]?.[weekIndex] || false;
      return {
        ...prev,
        [slotNumber]: {
          ...prev[slotNumber],
          [weekIndex]: !current,
        },
      };
    });
  }

  function markAllPaidForWeek(weekIdx: string, slotNums: string[]) {
    setPendingPayments((prev) => {
      const updated = { ...prev };
      slotNums.forEach((slotNum) => {
        updated[slotNum] = { ...updated[slotNum], [weekIdx]: true };
      });
      return updated;
    });
  }

  function clearWeekPayments(weekIdx: string, slotNums: string[]) {
    setPendingPayments((prev) => {
      const updated = { ...prev };
      slotNums.forEach((slotNum) => {
        updated[slotNum] = { ...updated[slotNum], [weekIdx]: false };
      });
      return updated;
    });
  }

  // Tick or untick, for ONE member row, all the weeks currently shown.
  // Local only, like the other actions: nothing is saved until Save.
  function setRowWeeks(slotNumber: string, weekIdxs: string[], value: boolean) {
    setPendingPayments((prev) => {
      const row = { ...(prev[slotNumber] || {}) };
      weekIdxs.forEach((w) => { row[w] = value; });
      return { ...prev, [slotNumber]: row };
    });
  }

  async function syncMemberView(
    memberId: string,
    slotsMap: Record<string, Slot>,
    paymentsMap: Record<string, Record<string, boolean>>,
    weeksMap: Record<string, string>,
    cycleInfo?: Partial<CycleInfo>
  ) {
    const memberSlots = Object.values(slotsMap).filter((s) => s.memberId === memberId);
    if (memberSlots.length === 0) return;

    const userId = memberUserIds[memberId];
    if (!userId) return;

    const memberPayments: Record<string, Record<string, boolean>> = {};
    memberSlots.forEach((s) => {
      memberPayments[s.slotNumber] = paymentsMap[s.slotNumber] || {};
    });

    await setDoc(
      doc(db, 'paymentGrids', gridId, 'memberViews', userId),
      {
        memberName: memberSlots[0].memberName,
        slots: memberSlots.map((s) => s.slotNumber),
        weeks: weeksMap,
        payments: memberPayments,
        ...(grid
          ? {
              cycleNumber: grid.cycleNumber || 1,
              cycleStart: grid.startDate || '',
              cycleEnd: grid.cycleEndDate || null,
              cycleHistory: grid.cycleHistory || [],
            }
          : {}),
        ...(cycleInfo || {}),
      },
      { merge: true }
    );
  }

  async function generateReceiptsForNewlyPaid(
    previousPayments: Record<string, Record<string, boolean>>,
    newPayments: Record<string, Record<string, boolean>>
  ) {
    if (!grid) return;

    const receiptPromises: Promise<any>[] = [];

    Object.entries(grid.slots).forEach(([slotNum, slot]) => {
      const weekEntriesLocal = Object.entries(grid.weeks);
      weekEntriesLocal.forEach(([weekIdx, weekDate]) => {
        const wasPaid = previousPayments[slotNum]?.[weekIdx] || false;
        const isNowPaid = newPayments[slotNum]?.[weekIdx] || false;
        if (!wasPaid && isNowPaid) {
          const userId = memberUserIds[slot.memberId];
          if (!userId) return;

          const memberAmount = memberAmounts[slot.memberId] ?? weeklyAmount;
          const amountLabel = memberAmount ? groupCurrency + ' ' + memberAmount.toFixed(2) : 'Amount not set';
          // Receipt issued under the group's own name (UNIMUNITY is only the tool).
          const receiptHtml = buildReceiptHtml({
            groupName,
            logoUrl: groupBrand?.enabled !== false ? groupBrand?.logo : undefined,
            showBadge: !(groupBrand?.enabled !== false && groupBrand?.showUNIMUNITYBadge === false),
            rows: [
              ['Member', slot.memberName],
              ['Week', 'W' + weekIdx + ' (' + weekDate + ')'],
              ['Amount', amountLabel],
              ['Status', 'Paid'],
            ],
          });
          const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(receiptHtml);

          receiptPromises.push(
            addDoc(collection(db, 'documents'), {
              name: 'Receipt - W' + weekIdx + ' - ' + weekDate,
              type: 'text/html',
              size: receiptHtml.length,
              url: dataUrl,
              storagePath: '',
              category: 'Receipts',
              organizerId: grid.organizerId,
              uploadedBy: 'system',
              source: 'admin',
              visibleTo: [userId],
              groupId: grid.groupId,
              tontineCycleId: grid.cycleId,
              tontineCycleNumber: grid.cycleNumber || 1,
              createdAt: serverTimestamp(),
            })
          );
        }
      });
    });

    if (receiptPromises.length > 0) {
      await Promise.all(receiptPromises);
    }
  }

  async function syncRegisterCycles(
    previousPayments: Record<string, Record<string, boolean>>,
    newPayments: Record<string, Record<string, boolean>>
  ) {
    if (!grid) return;
    const syncPromises: Promise<any>[] = [];

    Object.entries(grid.slots).forEach(([slotNum, slot]) => {
      const weekEntriesLocal = Object.entries(grid.weeks);
      weekEntriesLocal.forEach(([weekIdx, weekDate]) => {
        const wasPaid = previousPayments[slotNum]?.[weekIdx] || false;
        const isNowPaid = newPayments[slotNum]?.[weekIdx] || false;
        if (!wasPaid && isNowPaid) {
          // Week index maps directly to a Register cycle number: W0 -> Cycle 1, W1 -> Cycle 2, etc.
          const cycleNumber = parseInt(weekIdx, 10) + 1;
          const memberAmount = memberAmounts[slot.memberId] ?? weeklyAmount;
          // Cycle 1 keeps its original document ids (existing receipts are
          // untouched). From cycle 2 on, the tontine cycle id is part of the
          // id, so a new cycle can never overwrite a previous cycle's record.
          const tontineCycleNumber = grid.cycleNumber || 1;
          const registerDocId = tontineCycleNumber > 1
            ? slot.memberId + '_' + grid.cycleId + '_cycle' + cycleNumber
            : slot.memberId + '_cycle' + cycleNumber;
          syncPromises.push(
            setDoc(
              doc(db, 'payments', registerDocId),
              {
                organizerId: grid.organizerId,
                memberId: slot.memberId,
                memberName: slot.memberName,
                amount: memberAmount || 0,
                currency: grid.currency || 'USD',
                paymentDate: weekDate,
                paymentMethod: 'Grid',
                status: 'confirmed',
                cycle: 'Cycle ' + cycleNumber,
                contributionType: 'Weekly Contribution',
                notes: 'Auto-synced from Payment Grid (W' + weekIdx + ')',
                recordedBy: 'system',
                groupId: grid.groupId,
                tontineCycleId: grid.cycleId,
                tontineCycleNumber,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            )
          );
        }
      });
    });

    if (syncPromises.length > 0) {
      await Promise.all(syncPromises);
    }
  }

  async function handleSaveAll() {
    if (!grid) return;
    setSavingAll(true);
    try {
      await setDoc(
        doc(db, 'paymentGrids', gridId),
        { payments: pendingPayments },
        { merge: true }
      );

      const uniqueMemberIds = Array.from(
        new Set(Object.values(grid.slots).map((s) => s.memberId))
      ).filter(Boolean);

      await Promise.all(
        uniqueMemberIds.map((id) =>
          syncMemberView(id, grid.slots, pendingPayments, grid.weeks)
        )
      );

      await generateReceiptsForNewlyPaid(grid.payments, pendingPayments);
      await syncRegisterCycles(grid.payments, pendingPayments);

      setGrid((prev) => (prev ? { ...prev, payments: pendingPayments } : prev));
    } catch (err) {
      console.error('Error saving payments:', err);
    } finally {
      setSavingAll(false);
    }
  }

  async function handleChangeGridStart() {
    if (!grid || !gridStartInput) return;
    if (!confirm(
      'Changing the grid start date will regenerate all week columns starting exactly on the ' +
      'day of the week you picked (e.g. if you pick a Friday, every column stays a Friday), ' +
      'through the end of the current year. ' +
      'Existing payment checkmarks stay attached to their column position, not their old date - ' +
      'double-check this before confirming if payments were already recorded.'
    )) return;

    setSavingStartDate(true);
    try {
      const newWeeks: Record<string, string> = generateWeeksFromDate(gridStartInput, grid.cycleEndDate);
      const newStartYear = new Date(gridStartInput).getFullYear();
      await setDoc(doc(db, 'paymentGrids', gridId), { startDate: gridStartInput, startYear: newStartYear, weeks: newWeeks }, { merge: true });
      setGrid((prev) => (prev ? { ...prev, startDate: gridStartInput, startYear: newStartYear, weeks: newWeeks } : prev));
      setPageStart(0);
      setShowStartDateEditor(false);
    } catch (err) {
      console.error(err);
    }
    setSavingStartDate(false);
  }

  async function handleSetCycleEnd() {
    if (!grid || !cycleEndInput) return;
    const start = grid.startDate || startOfGridDate(grid.weeks) || '';
    if (start && cycleEndInput < start) {
      alert('The cycle end date must be after the cycle start date (' + start + ').');
      return;
    }
    const newWeeks = generateWeeksFromDate(start, cycleEndInput);
    const keptIdx = new Set(Object.keys(newWeeks));
    const currentIdx = new Set(Object.keys(grid.weeks));
    // Never hide weeks that already have recorded payments. Old checkmarks
    // left on week numbers that no longer exist in this grid (e.g. after an
    // earlier start-date change) are ignored here and left untouched.
    const paidOutside = Object.values(grid.payments || {}).some((byWeek) =>
      Object.entries(byWeek || {}).some(([wIdx, paid]) => paid && currentIdx.has(wIdx) && !keptIdx.has(wIdx))
    );
    if (paidOutside) {
      alert('Some payments are recorded after this date. Pick a later end date (on or after the last paid week).');
      return;
    }
    if (JSON.stringify(pendingPayments) !== JSON.stringify(grid.payments)) {
      alert('Save or discard your pending payment changes first.');
      return;
    }
    if (!confirm('Set the end of cycle ' + (grid.cycleNumber || 1) + ' to ' + cycleEndInput + '? ' +
      'The grid will stop at this date (' + Object.keys(newWeeks).length + ' weeks) and will no longer extend on its own.')) return;

    setSavingCycleEnd(true);
    try {
      await setDoc(doc(db, 'paymentGrids', gridId), { cycleEndDate: cycleEndInput, weeks: newWeeks }, { merge: true });
      const updated = { ...grid, cycleEndDate: cycleEndInput, weeks: newWeeks };
      setGrid(updated);
      // Members see the same end date right away.
      const ids = Array.from(new Set(Object.values(grid.slots).map((s) => s.memberId))).filter(Boolean);
      await Promise.all(ids.map((id) => syncMemberView(id, grid.slots, grid.payments || {}, newWeeks, { cycleEnd: cycleEndInput })));
      setPageStart(0);
      setShowCycleEndEditor(false);
    } catch (err) {
      console.error(err);
      alert('Could not save the cycle end date. Please try again.');
    }
    setSavingCycleEnd(false);
  }

  // ---- Cycle renewal -------------------------------------------------------
  // Builds the per-member copies (memberViews) of a grid, keyed by Auth uid,
  // exactly like syncMemberView does for the current grid.
  function buildMemberViews(
    slotsMap: Record<string, Slot>,
    paymentsMap: Record<string, Record<string, boolean>>,
    weeksMap: Record<string, string>,
    cycleInfo: CycleInfo
  ): Record<string, MemberView> {
    const views: Record<string, MemberView> = {};
    Object.values(slotsMap)
      .sort((a, b) => Number(a.slotNumber) - Number(b.slotNumber))
      .forEach((s) => {
        const uid = memberUserIds[s.memberId];
        if (!uid) return;
        if (!views[uid]) views[uid] = { memberName: s.memberName, slots: [], weeks: weeksMap, payments: {}, ...cycleInfo };
        views[uid].slots.push(s.slotNumber);
        views[uid].payments[s.slotNumber] = paymentsMap[s.slotNumber] || {};
      });
    return views;
  }

  async function openRenew() {
    if (!grid) return;
    const sorted = Object.entries(grid.slots).sort((a, b) => Number(a[0]) - Number(b[0]));
    // Members' answers to "Join next cycle" (asked on their page before the end).
    const nextNo = (grid.cycleNumber || 1) + 1;
    const responses: Record<string, 'yes' | 'pause' | 'no'> = {};
    const notes: Record<string, string> = {};
    const ids = Array.from(new Set(sorted.map(([, s]) => s.memberId))).filter(Boolean);
    await Promise.all(ids.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'members', id));
        const d = snap.exists() ? snap.data() : null;
        if (d && d.nextCycleFor === nextNo && ['yes', 'pause', 'no'].includes(d.nextCycleResponse)) {
          responses[id] = d.nextCycleResponse;
          if (typeof d.nextCycleNote === 'string' && d.nextCycleNote.trim()) notes[id] = d.nextCycleNote.trim();
        }
      } catch { /* unreadable: no answer shown */ }
    }));
    setRenewResponses(responses);
    setRenewNotes(notes);
    setRenewSlots(sorted.map(([, s]) => ({ memberId: s.memberId, memberName: s.memberName, include: !responses[s.memberId] || responses[s.memberId] === 'yes' })));
    // No date is imposed: the organizer chooses when the new cycle starts and ends.
    setRenewStart('');
    setRenewEnd('');
    setShowRenew(true);
  }

  // Sends every member of the grid an email + an in-app question:
  // continue, pause, or leave for the next cycle.
  async function handleAskMembers() {
    if (!grid) return;
    const nextNo = (grid.cycleNumber || 1) + 1;
    const already = grid.renewalAskedFor === nextNo;
    if (!confirm(
      (already ? 'Members were already asked on ' + (grid.renewalAskedAt || '').split('T')[0] + '. Send the reminder again?\n\n' : '') +
      'Ask every member of this cycle if they continue, pause, or leave for cycle ' + nextNo + '?\n\n' +
      'They receive an email, and the question appears on their member page.'
    )) return;
    setAskingMembers(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');
      const idToken = await user.getIdToken();
      const res = await fetch('/api/cycles/ask-renewal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
        body: JSON.stringify({ groupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not send the question. Please try again.');
        return;
      }
      setGrid((prev) => (prev ? { ...prev, renewalAskedFor: nextNo, renewalAskedAt: new Date().toISOString() } : prev));
      alert('Question sent for cycle ' + nextNo + '.\n\nEmails sent: ' + (data.emailed ?? 0) +
        '\nShown on member pages: ' + (data.inApp ?? 0) +
        (data.noAccount ? '\nMembers without a member account (email only or nothing): ' + data.noAccount : ''));
    } catch (err) {
      console.error(err);
      alert('Could not send the question. Please try again.');
    } finally {
      setAskingMembers(false);
    }
  }

  function moveRenewSlot(i: number, dir: -1 | 1) {
    setRenewSlots((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const a = [...prev];
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  }

  function reorderRenew(mode: 'rotate' | 'shuffle') {
    setRenewSlots((prev) => {
      if (prev.length < 2) return prev;
      if (mode === 'rotate') return [...prev.slice(1), prev[0]];
      const a = [...prev];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    });
  }

  async function handleRenew() {
    if (!grid) return;
    if (JSON.stringify(pendingPayments) !== JSON.stringify(grid.payments)) {
      alert('Save or discard your pending payment changes first.');
      return;
    }
    const included = renewSlots.filter((s) => s.include);
    if (included.length === 0) {
      alert('Select at least one member for the new cycle.');
      return;
    }
    if (!renewStart || !renewEnd) {
      alert('Choose the start date and the end date of the new cycle.');
      return;
    }
    if (renewEnd < renewStart) {
      alert('The end date must be after the start date.');
      return;
    }
    const prevEnd = grid.cycleEndDate || '';
    if (prevEnd && renewStart <= prevEnd &&
      !confirm('The new cycle starts on ' + renewStart + ', before the current cycle ends (' + prevEnd + '). Continue anyway?')) {
      return;
    }
    const cycleNo = grid.cycleNumber || 1;
    const todayStr = new Date().toISOString().split('T')[0];
    const early = !prevEnd || todayStr <= prevEnd;
    if (!confirm(
      (early ? 'Cycle ' + cycleNo + ' has not ended yet' + (prevEnd ? ' (ends ' + prevEnd + ')' : '') + '.\n\n' : '') +
      'Archive cycle ' + cycleNo + ' and start cycle ' + (cycleNo + 1) + ' on ' + renewStart +
      ' with ' + included.length + ' slot(s)?\n\nCycle ' + cycleNo +
      ' stays saved in full (payments, receipts, positions) as read-only history. Nothing is deleted.'
    )) return;

    setRenewing(true);
    try {
      const archiveId = groupId + '_' + grid.cycleId;
      const memberIds = Array.from(new Set(Object.values(grid.slots).map((s) => s.memberId))).filter(Boolean);

      // Positions and payout dates of the ending cycle, frozen in the archive.
      const memberDocs: Record<string, Record<string, unknown>> = {};
      await Promise.all(memberIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'members', id));
          if (snap.exists()) memberDocs[id] = snap.data();
        } catch { /* member unreadable: skipped in snapshot */ }
      }));
      const memberSnapshot: Record<string, unknown> = {};
      memberIds.forEach((id) => {
        const d = memberDocs[id];
        if (!d) return;
        memberSnapshot[id] = {
          name: d.fullName || d.name || '',
          position: d.position ?? null,
          payoutDate: d.payoutDate ?? null,
          payoutDates: d.payoutDates ?? null,
          shares: d.shares ?? null,
          status: d.status ?? null,
        };
      });

      // 1) Archive document (skipped if a previous attempt already wrote it).
      const archiveRef = doc(db, 'paymentGrids', archiveId);
      const archiveSnap = await getDoc(archiveRef);
      if (!archiveSnap.exists()) {
        const plainGrid = JSON.parse(JSON.stringify(grid));
        await setDoc(archiveRef, {
          ...plainGrid,
          cycleNumber: cycleNo,
          cycleEndDate: prevEnd || (Object.values(grid.weeks).filter(Boolean).sort().pop() || ''),
          status: 'completed',
          archivedAt: serverTimestamp(),
          archivedBy: auth.currentUser?.uid || '',
          memberSnapshot,
        });
      }

      // 2) Archived member views + new current grid + new member views, all at once.
      const newWeeks = generateWeeksFromDate(renewStart, renewEnd);
      const newSlots: Record<string, Slot> = {};
      included.forEach((s, i) => {
        const n = String(i + 1);
        newSlots[n] = { slotNumber: n, memberId: s.memberId, memberName: stripPartSuffix(s.memberName) };
      });
      const newCycleId = 'cycle-' + Date.now();

      const oldEnd = prevEnd || (Object.values(grid.weeks).filter(Boolean).sort().pop() || '');
      const oldHistory = grid.cycleHistory || [];
      const newHistory: CycleHistoryEntry[] = [
        ...oldHistory,
        { cycleNumber: cycleNo, archiveId, startDate: grid.startDate || '', endDate: oldEnd },
      ];
      const oldInfo: CycleInfo = { cycleNumber: cycleNo, cycleStart: grid.startDate || '', cycleEnd: oldEnd, cycleHistory: oldHistory };
      const newInfo: CycleInfo = { cycleNumber: cycleNo + 1, cycleStart: renewStart, cycleEnd: renewEnd, cycleHistory: newHistory };

      const batch = writeBatch(db);
      const oldViews = buildMemberViews(grid.slots, grid.payments || {}, grid.weeks, oldInfo);
      Object.entries(oldViews).forEach(([uid, view]) => {
        batch.set(doc(db, 'paymentGrids', archiveId, 'memberViews', uid), view);
      });
      batch.set(doc(db, 'paymentGrids', gridId), {
        organizerId: grid.organizerId,
        groupId,
        cycleId: newCycleId,
        cycleNumber: cycleNo + 1,
        previousCycleId: grid.cycleId,
        startDate: renewStart,
        startYear: new Date(renewStart).getUTCFullYear(),
        cycleEndDate: renewEnd,
        status: 'active',
        weeks: newWeeks,
        slots: newSlots,
        payments: {},
        cycleHistory: newHistory,
        ...(grid.currency ? { currency: grid.currency } : {}),
      });
      const newViews = buildMemberViews(newSlots, {}, newWeeks, newInfo);
      Object.entries(newViews).forEach(([uid, view]) => {
        batch.set(doc(db, 'paymentGrids', gridId, 'memberViews', uid), view);
      });
      // Members who do not continue: their current view is emptied (their
      // history stays in the archive).
      Object.keys(oldViews).forEach((uid) => {
        if (!newViews[uid]) {
          batch.set(doc(db, 'paymentGrids', gridId, 'memberViews', uid), {
            memberName: oldViews[uid].memberName, slots: [], weeks: newWeeks, payments: {}, ...newInfo,
          });
        }
      });
      await batch.commit();

      // 3) New positions and payout dates on each member (old ones are in the archive).
      const weekDates = Object.entries(newWeeks).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, d]) => d);
      const plan: Record<string, { positions: number[]; dates: string[] }> = {};
      included.forEach((s, i) => {
        if (!plan[s.memberId]) plan[s.memberId] = { positions: [], dates: [] };
        plan[s.memberId].positions.push(i + 1);
        plan[s.memberId].dates.push(weekDates[i] || '');
      });
      let failed = 0;
      await Promise.all(memberIds.map(async (id) => {
        const p = plan[id];
        const data = p
          ? { position: p.positions[0], payoutDate: p.dates[0] || null, payoutDates: p.dates, shares: p.positions.length }
          : { position: null, payoutDate: null, payoutDates: [] };
        try { await updateDoc(doc(db, 'members', id), data); } catch { failed++; }
      }));

      try {
        const uid = auth.currentUser?.uid || '';
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: uid, actorId: uid, category: 'Group', action: 'Cycle renewed',
          user: auth.currentUser?.email || '',
          details: groupName + ': cycle ' + cycleNo + ' archived (' + archiveId + '), cycle ' + (cycleNo + 1) +
            ' starts ' + renewStart + ' with ' + included.length + ' slot(s)',
          createdAt: serverTimestamp(),
        });
      } catch { /* logging must never block the renewal */ }

      setShowRenew(false);
      await loadGrid();
      setPageStart(0);
      alert('Cycle ' + (cycleNo + 1) + ' started. Cycle ' + cycleNo + ' is archived.' +
        (failed > 0 ? '\n\nNote: ' + failed + ' member record(s) could not be updated with their new position. Check them in Member Management.' : ''));
    } catch (err) {
      console.error('Cycle renewal failed:', err);
      alert('The renewal could not be completed. The current cycle was not changed. Please try again.');
    } finally {
      setRenewing(false);
    }
  }

  function handleDiscardAll() {
    if (!grid) return;
    setPendingPayments(grid.payments);
  }

  function getInitials(name: string) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function avatarColor(name: string) {
    const palette = [C.bordeaux, '#8C6E4F', '#5C7A8A', '#B0525F', C.bordeauxDark];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: C.texteFonce }}>
        Loading payment grid...
      </div>
    );
  }

  if (!grid) {
    return (
      <div style={{ padding: 40, color: 'crimson' }}>
        Could not load payment grid.
      </div>
    );
  }

  const weekEntries = Object.entries(grid.weeks).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );
  const allSlotEntries = Object.entries(grid.slots).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );
  const slotEntries = searchTerm
    ? allSlotEntries.filter(([, s]) =>
        s.memberName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allSlotEntries;

  const uniqueMemberIds = Array.from(new Set(allSlotEntries.map(([, s]) => s.memberId)));
  const totalMembers = uniqueMemberIds.length;

  const today = new Date();

  const filteredWeekEntries = weekEntries.filter(([, d]) => {
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });
  const activeWeekEntries = filteredWeekEntries.length > 0 ? filteredWeekEntries : weekEntries;

  const effectivePageStart = pageStart !== null ? pageStart : 0;

  // Damaged columns (out of cycle, wrong weekday, duplicates) - see lib/gridHealth.
  const gridHealth = analyzeGrid(grid, { weekly: normalizeFrequency(groupFrequency) === 'Weekly' });
  const needsRepair = gridNeedsRepair(gridHealth);
  const repairGrid = async () => {
    const h = gridHealth;
    const msg = 'Repair this grid?\n\n' +
      '- ' + h.outOfCycle.length + ' column(s) outside the cycle dates will be removed' + (h.droppedTicks.length ? ' (with ' + h.droppedTicks.length + ' tick(s) on them)' : '') + '\n' +
      '- ' + h.offCadence.length + ' column(s) on the wrong weekday and ' + h.duplicates.length + ' duplicate column(s) will be removed\n' +
      '- ' + h.movedTicks.length + ' payment(s) ticked on those columns will be moved to the right week\n\n' +
      'A full backup of the grid is saved first. Unsaved changes on this page are discarded.';
    if (!confirm(msg)) return;
    setRepairing(true);
    try {
      const res = await fetch('/api/grid-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders('admin')) },
        body: JSON.stringify({ groupId, apply: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Repair failed');
      window.location.reload();
    } catch (e: any) {
      alert('Could not repair the grid: ' + (e?.message || 'unknown error'));
      setRepairing(false);
    }
  };

  // Half-year / year periods, to jump quickly in long tontines.
  const gridPeriods = buildGridPeriods(grid.weeks);
  const firstShownIdx = activeWeekEntries[effectivePageStart]?.[0];
  const currentPeriodKey = gridPeriods.find(p => firstShownIdx !== undefined && p.weekIdxs.includes(firstShownIdx))?.key || '';
  const jumpToPeriod = (key: string) => {
    const period = gridPeriods.find(p => p.key === key);
    if (!period) return;
    const pos = activeWeekEntries.findIndex(([idx]) => period.weekIdxs.includes(idx));
    if (pos >= 0) { setPageStart(pos); setSelectedWeek(activeWeekEntries[pos][0]); }
  };

  const visibleWeeks = activeWeekEntries.slice(
    effectivePageStart,
    effectivePageStart + WEEKS_PER_PAGE
  );
  const canGoPrev = effectivePageStart > 0;
  const canGoNext = effectivePageStart + WEEKS_PER_PAGE < activeWeekEntries.length;

  // The focus week drives the summary and the week actions. It is the week
  // the organizer clicked, as long as it is on the current page, otherwise
  // the first week shown.
  const focusWeekIdx = (selectedWeek && visibleWeeks.some(([idx]) => idx === selectedWeek))
    ? selectedWeek
    : (visibleWeeks[0]?.[0] ?? weekEntries[0]?.[0] ?? '0');

  const focusSlotNums = allSlotEntries.map(([slotNum]) => slotNum);
  const focusPaid = focusSlotNums.filter(
    (slotNum) => pendingPayments[slotNum]?.[focusWeekIdx]
  ).length;
  const focusTotal = focusSlotNums.length;
  const focusMissing = focusTotal - focusPaid;
  const focusCompletion = focusTotal > 0 ? Math.round((focusPaid / focusTotal) * 100) : 0;

  const hasChanges = JSON.stringify(pendingPayments) !== JSON.stringify(grid.payments);

  const elapsedWeekEntries = weekEntries.filter(([, d]) => new Date(d) <= today);

  // Share of the contributions actually DUE that are paid: current cycle,
  // from the member's join date, per group frequency (same rules as the
  // reminders and the member portal). Nothing due yet counts as 100%.
  function contributionRateForSlot(slotNum: string) {
    const memberId = grid?.slots?.[slotNum]?.memberId;
    const dues = computeDues({
      weeks: grid?.weeks || {},
      payments: pendingPayments,
      slotNums: [slotNum],
      frequency: groupFrequency,
      cycleStart: grid?.startDate,
      cycleEnd: grid?.cycleEndDate,
      memberSince: memberId ? memberSince[memberId] : null,
      amountPerPeriod: 1,
    });
    if (dues.dueCount === 0) return 100;
    return Math.round((dues.paidCount / dues.dueCount) * 100);
  }

  // Money received in the CURRENT cycle: each slot's paid periods (weekly
  // cadence / monthly... per group frequency) x that member's contribution.
  const totalCollected = allSlotEntries.reduce((sum, [slotNum, slot]) => {
    const perPeriod = (memberAmounts[slot.memberId] ?? weeklyAmount) || 0;
    const paidPeriods = paidPeriodsInCycle({
      weeks: grid?.weeks || {},
      payments: pendingPayments,
      slotNums: [slotNum],
      frequency: groupFrequency,
      cycleStart: grid?.startDate,
      cycleEnd: grid?.cycleEndDate,
    });
    return sum + paidPeriods * perPeriod;
  }, 0);
  const totalCollectedLabel = totalCollected > 0 || weeklyAmount
    ? groupCurrency + ' ' + totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : undefined;

  function btnStyle(variant: 'primary' | 'secondary' | 'ghost', disabled?: boolean) {
    const base: React.CSSProperties = {
      borderRadius: 10,
      padding: '7px 13px',
      fontSize: 12.5,
      fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      opacity: disabled ? 0.55 : 1,
      whiteSpace: 'nowrap',
    };
    if (variant === 'primary') {
      return { ...base, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', border: 'none', boxShadow: disabled ? 'none' : '0 4px 12px rgba(107,45,78,0.22)' };
    }
    if (variant === 'ghost') {
      return {
        ...base,
        background: '#FFFFFF',
        color: C.texteFonce,
        border: '1px solid #F0E4D6',
        padding: '6px 11px',
        fontSize: 12,
      };
    }
    return {
      ...base,
      background: C.ivoire,
      color: C.texteFonce,
      border: '1px solid ' + C.border,
    };
  }

  const dateInputStyle: React.CSSProperties = {
    border: '1.5px solid #EAD9BE',
    borderRadius: 10,
    padding: '6px 11px',
    fontSize: 13,
    color: C.texteFonce,
    background: '#FFFDF9',
    outline: 'none',
  };

  function handleExportWeek(weekIdx: string) {
    const dateForWeek = grid?.weeks[weekIdx] || '';
    const rows: string[][] = [['Member', 'W' + weekIdx + ' (' + dateForWeek + ')']];
    allSlotEntries.forEach(([slotNum, slot]) => {
      rows.push([slot.memberName, pendingPayments[slotNum]?.[weekIdx] ? 'Paid' : 'Missing']);
    });
    downloadCsv(rows, 'week_W' + weekIdx + '_' + groupName.replace(/\s+/g, '_') + '.csv');
  }

  function handleExportAll() {
    const weekCols = weekEntries.map(([idx]) => 'W' + idx);
    const rows: string[][] = [['Member', ...weekCols]];
    slotEntries.forEach(([slotNum, slot]) => {
      const row = [slot.memberName];
      weekEntries.forEach(([weekIdx]) => {
        row.push(pendingPayments[slotNum]?.[weekIdx] ? 'Paid' : '');
      });
      rows.push(row);
    });
    downloadCsv(rows, groupName.replace(/\s+/g, '_') + '_payment_grid.csv');
  }

  function downloadCsv(rows: string[][], filename: string) {
    const csv = rows
      .map((r) => r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .UNIMUNITY-cell { transition: all 0.15s ease; }
        .UNIMUNITY-cell:hover .UNIMUNITY-box {
          outline: 2px solid ${C.or};
          outline-offset: 1px;
        }
        .UNIMUNITY-group-name-admin{
          background: linear-gradient(90deg, #FBEEDD 0%, #F0DCA8 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
          animation: UNIMUNITY-shimmer-admin 4s linear infinite, UNIMUNITY-slide-admin 3s ease-in-out infinite;
        }
        @keyframes UNIMUNITY-shimmer-admin {
          0% { background-position: 0% center; }
          100% { background-position: -200% center; }
        }
        @keyframes UNIMUNITY-slide-admin {
          0%, 100% { transform: translateX(-6px); }
          50% { transform: translateX(6px); }
        }
        @media print {
          .UNIMUNITY-no-print { display: none !important; }
        }
        .pg-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .pg-back:hover { background: #FBEEDD; }
        .UNIMUNITY-hdr-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-shimmer-admin 4s linear infinite;
        }
      `}</style>

      {/* Header */}
      <div className="UNIMUNITY-no-print" style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start', cursor: 'pointer' }} />
        <div style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
          <h1 style={{ color: '#FBEEDD', fontSize: 18, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>
            Payment Grid -{' '}<span className="UNIMUNITY-group-name-admin" style={{ marginLeft: 4 }}>{groupName}</span>
          </h1>
          <p className="UNIMUNITY-hdr-sub" style={{ margin: 0, fontSize: 11.5, fontWeight: 500 }}>Track every member&apos;s weekly contributions.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div style={{ flex: 1, maxWidth: 1360, width: '100%', margin: '0 auto', padding: '14px 24px 20px', boxSizing: 'border-box' }}>
        {/* Primary action bar */}
        <div className="UNIMUNITY-no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="pg-back" style={{ marginRight: 'auto' }}>
            Back to Dashboard
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!hasChanges || savingAll}
            style={btnStyle('primary', !hasChanges || savingAll)}
          >
            💾 {savingAll ? 'Saving...' : 'Save Payments'}
          </button>
          <button onClick={handleExportAll} style={btnStyle('secondary')}>
            📄 Export
          </button>
          <button onClick={() => router.push('/dashboard/add-member?groupId=' + groupId)} style={btnStyle('secondary')}>➕ Add / Edit Members</button>
          <button onClick={handlePrint} style={btnStyle('secondary')}>
            🖨 Print
          </button>
        </div>

        {/* Unsaved changes banner */}
        {hasChanges && (
          <div
            className="UNIMUNITY-no-print"
            style={{
              background: C.warningBg,
              border: '1px solid ' + C.or,
              borderRadius: 12,
              padding: '10px 16px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <span style={{ color: C.warning, fontSize: 13.5, fontWeight: 600 }}>
              ⚠ You have unsaved changes.
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDiscardAll} style={btnStyle('ghost')}>
                Discard
              </button>
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                style={btnStyle('primary', savingAll)}
              >
                {savingAll ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Info card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #F0E4D6',
            borderRadius: 16,
            padding: '10px 16px',
            marginBottom: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: C.bordeaux,
              color: C.ivoire,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ℹ
          </div>
          <div>
            <strong style={{ color: C.bordeaux, fontSize: 13.5 }}>Deposit</strong>
            <p style={{ margin: '2px 0 0', color: C.texteFonce, fontSize: 12.5 }}>
              Initial contribution used to start the group. Informational only, not counted
              in weekly contributions.
            </p>
          </div>
        </div>

        {/* Period calendar + search */}
        <div
          className="UNIMUNITY-no-print"
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: C.texteFonce, fontWeight: 600 }}>
            📅 Period:
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPageStart(0);
            }}
            style={dateInputStyle}
          />
          <span style={{ color: C.texteGris }}>→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPageStart(0);
            }}
            style={dateInputStyle}
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setPageStart(null);
              }}
              style={btnStyle('ghost')}
            >
              Reset
            </button>
          )}
          <input
            type="text"
            placeholder="Search member..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...dateInputStyle, flex: 1, minWidth: 180 }}
          />
          <button
            onClick={() => { setShowStartDateEditor(!showStartDateEditor); setGridStartInput(grid.weeks['0'] || ''); }}
            style={btnStyle('ghost')}
          >
            ⚙ Grid Start Date
          </button>
        </div>

        {showStartDateEditor && (
          <div
            className="UNIMUNITY-no-print"
            style={{
              background: C.warningBg,
              border: '1px solid ' + C.or,
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 12,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12.5, color: C.texteFonce }}>
              Pick the exact date this sol/tontine's collections happen (e.g. the first Friday it ran,
              even back in 2025) — every column will stay on that same day of the week, through today:
            </span>
            <input
              type="date"
              value={gridStartInput}
              onChange={(e) => setGridStartInput(e.target.value)}
              style={dateInputStyle}
            />
            <button onClick={handleChangeGridStart} disabled={savingStartDate || !gridStartInput} style={btnStyle('primary', savingStartDate || !gridStartInput)}>
              {savingStartDate ? 'Applying...' : 'Apply (regenerate full year)'}
            </button>
            <button onClick={() => setShowStartDateEditor(false)} style={btnStyle('ghost')}>
              Cancel
            </button>
          </div>
        )}

        {/* Tontine cycle bar */}
        {(() => {
          const cycleNo = grid.cycleNumber || 1;
          const startLabel = grid.startDate || startOfGridDate(grid.weeks) || '-';
          const endDate = grid.cycleEndDate || '';
          const todayStr = new Date().toISOString().split('T')[0];
          const isComplete = !!endDate && todayStr > endDate;
          return (
            <div
              className="UNIMUNITY-no-print"
              style={{
                background: isComplete ? C.successBg : endDate ? C.ivoire : C.warningBg,
                border: '1px solid ' + (isComplete ? C.success : endDate ? C.border : C.or),
                borderRadius: 12,
                padding: '10px 14px',
                marginBottom: 12,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: C.bordeaux }}>
                🔄 Cycle {cycleNo}
              </span>
              <span style={{ fontSize: 12.5, color: C.texteFonce }}>
                Start: <strong>{startLabel}</strong> · End: <strong>{endDate || 'not set'}</strong>
              </span>
              {isComplete && (
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.success }}>
                  ✓ This cycle is complete.
                </span>
              )}
              {!endDate && (
                <span style={{ fontSize: 12, color: C.warning }}>
                  No end date yet: the grid keeps extending to Dec 31 each year. Set the date of the last payout.
                </span>
              )}
              <button
                onClick={() => {
                  setShowCycleEndEditor(!showCycleEndEditor);
                  setCycleEndInput(endDate || suggestedCycleEnd || (weekEntries[weekEntries.length - 1]?.[1] ?? ''));
                }}
                style={{ ...btnStyle('ghost'), marginLeft: 'auto' }}
              >
                {endDate ? '✎ Change cycle end' : '⚙ Set cycle end date'}
              </button>
              <button onClick={handleAskMembers} disabled={askingMembers} style={btnStyle('ghost', askingMembers)}
                title="Ask members: continue, pause or leave for the next cycle">
                {askingMembers ? 'Sending...' : grid.renewalAskedFor === cycleNo + 1 ? '📨 Ask again' : '📨 Ask members'}
              </button>
              {endDate && (
                <button onClick={openRenew} style={btnStyle(isComplete ? 'primary' : 'ghost')}>
                  🔁 Renew Cycle
                </button>
              )}
            </div>
          );
        })()}

        {showCycleEndEditor && (
          <div
            className="UNIMUNITY-no-print"
            style={{
              background: C.warningBg,
              border: '1px solid ' + C.or,
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 12,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12.5, color: C.texteFonce }}>
              Date of the last payout of this cycle
              {suggestedCycleEnd ? ' (latest member payout date: ' + suggestedCycleEnd + ')' : ''}:
            </span>
            <input
              type="date"
              value={cycleEndInput}
              onChange={(e) => setCycleEndInput(e.target.value)}
              style={dateInputStyle}
            />
            <button onClick={handleSetCycleEnd} disabled={savingCycleEnd || !cycleEndInput} style={btnStyle('primary', savingCycleEnd || !cycleEndInput)}>
              {savingCycleEnd ? 'Saving...' : 'Save cycle end'}
            </button>
            <button onClick={() => setShowCycleEndEditor(false)} style={btnStyle('ghost')}>
              Cancel
            </button>
          </div>
        )}

        {showRenew && (() => {
          const cycleNo = grid.cycleNumber || 1;
          const preview = renewStart && renewEnd && renewEnd >= renewStart ? generateWeeksFromDate(renewStart, renewEnd) : {};
          const previewDates = Object.entries(preview).sort((a, b) => Number(a[0]) - Number(b[0])).map(([, d]) => d);
          const includedCount = renewSlots.filter((s) => s.include).length;
          let order = 0;
          return (
            <div
              className="UNIMUNITY-no-print"
              style={{ background: C.ivoire, border: '1px solid ' + C.bordeaux, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}
            >
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: C.bordeaux }}>
                🔁 Renew: start cycle {cycleNo + 1}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12.5, color: C.texteGris }}>
                Cycle {cycleNo} will be archived in full (payments, receipts, positions) as read-only history. Nothing is deleted.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 12.5, color: C.texteFonce, fontWeight: 600 }}>New start:</span>
                <input type="date" value={renewStart} onChange={(e) => setRenewStart(e.target.value)} style={dateInputStyle} />
                <span style={{ fontSize: 12.5, color: C.texteFonce, fontWeight: 600 }}>New end:</span>
                <input type="date" value={renewEnd} onChange={(e) => setRenewEnd(e.target.value)} style={dateInputStyle} />
                <span style={{ fontSize: 12.5, color: C.texteGris }}>
                  {renewStart && renewEnd ? previewDates.length + ' weeks · ' : 'Choose the dates of the new cycle · '}{includedCount} slot(s)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, color: C.texteFonce, fontWeight: 600 }}>Payout order:</span>
                <button onClick={() => reorderRenew('rotate')} style={btnStyle('ghost')}>Rotate (first → last)</button>
                <button onClick={() => reorderRenew('shuffle')} style={btnStyle('ghost')}>Random draw</button>
                <span style={{ fontSize: 12, color: C.texteGris }}>or use ↑ ↓ to set it by hand</span>
              </div>
              <div style={{ border: '1px solid ' + C.border, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                {renewSlots.map((s, i) => {
                  const pos = s.include ? ++order : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                        borderTop: i === 0 ? 'none' : '1px solid ' + C.border,
                        background: s.include ? 'white' : C.creme, opacity: s.include ? 1 : 0.6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={s.include}
                        onChange={() => setRenewSlots((prev) => prev.map((x, k) => (k === i ? { ...x, include: !x.include } : x)))}
                        title="Continues in the new cycle"
                      />
                      <span style={{ width: 36, fontSize: 12.5, fontWeight: 700, color: C.bordeaux }}>{pos ? '#' + pos : '-'}</span>
                      <span style={{ flex: 1, fontSize: 13, color: C.texteFonce }}>
                        {s.memberName}
                        <span style={{
                          marginLeft: 8, fontSize: 11, fontWeight: 700,
                          color: renewResponses[s.memberId] === 'yes' ? C.success : renewResponses[s.memberId] === 'no' ? C.danger
                            : renewResponses[s.memberId] === 'pause' ? C.warning : C.texteGris,
                        }}>
                          {renewResponses[s.memberId] === 'yes' ? '✓ continues' : renewResponses[s.memberId] === 'no' ? '✗ leaving'
                            : renewResponses[s.memberId] === 'pause' ? '⏸ pause' : 'no answer yet'}
                        </span>
                        {renewNotes[s.memberId] && (
                          <span style={{ display: 'block', fontSize: 11.5, color: C.texteGris, fontStyle: 'italic', marginTop: 2 }}>
                            {'\u201C' + renewNotes[s.memberId] + '\u201D'}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: C.texteGris, minWidth: 110 }}>
                        {pos
                          ? (!renewStart || !renewEnd ? 'Payout date: set the dates' : previewDates[pos - 1] ? 'Payout ' + previewDates[pos - 1] : 'after end date')
                          : 'not continuing'}
                      </span>
                      <button onClick={() => moveRenewSlot(i, -1)} disabled={i === 0} style={btnStyle('ghost', i === 0)}>↑</button>
                      <button onClick={() => moveRenewSlot(i, 1)} disabled={i === renewSlots.length - 1} style={btnStyle('ghost', i === renewSlots.length - 1)}>↓</button>
                    </div>
                  );
                })}
              </div>
              {renewStart && renewEnd && includedCount > previewDates.length && (
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: C.danger }}>
                  More slots ({includedCount}) than weeks ({previewDates.length}): some payouts would fall after the end date. Move the end date later.
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={handleRenew} disabled={renewing || includedCount === 0} style={btnStyle('primary', renewing || includedCount === 0)}>
                  {renewing ? 'Renewing...' : 'Archive cycle ' + cycleNo + ' and start cycle ' + (cycleNo + 1)}
                </button>
                <button onClick={() => setShowRenew(false)} disabled={renewing} style={btnStyle('ghost', renewing)}>
                  Cancel
                </button>
              </div>
            </div>
          );
        })()}

        {needsRepair && (
          <div className="UNIMUNITY-no-print" style={{ background: '#FBF0D9', border: '1px solid #EBD9A8', borderRadius: 16, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#7A5A1E' }}>
                Grid check: {gridHealth.outOfCycle.length + gridHealth.offCadence.length + gridHealth.duplicates.length} damaged column(s) found
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#7A5A1E', lineHeight: 1.5 }}>
                {gridHealth.outOfCycle.length} outside the cycle dates · {gridHealth.offCadence.length} on the wrong weekday · {gridHealth.duplicates.length} duplicate(s).
                {' '}They are already ignored in amounts due. Repairing removes them from the grid (payments ticked on them are moved to the right week; a backup is saved).
              </p>
            </div>
            <button onClick={repairGrid} disabled={repairing} style={btnStyle('primary', repairing)}>
              {repairing ? 'Repairing...' : 'Repair grid'}
            </button>
          </div>
        )}

        {/* Week toolbar: navigation, focus-week summary, week actions */}
        <div style={{ background: '#FFFFFF', border: '1px solid #F0E4D6', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 12, overflow: 'hidden' }}>
          {/* Row 1: week navigation */}
          <div className="UNIMUNITY-no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid #F3E6D8', background: '#FFFCF7' }}>
            {gridPeriods.length > 1 && (
              <select value={currentPeriodKey} onChange={e => jumpToPeriod(e.target.value)} title="Jump to a period"
                style={{ padding: '6px 10px', borderRadius: 10, border: '1.5px solid #EAD9BE', background: '#FFFDF9', color: '#6B2D4E', fontSize: 12.5, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                {!currentPeriodKey && <option value="">Choose a period</option>}
                {gridPeriods.map(p => (
                  <option key={p.key} value={p.key}>{p.label} - {PERIOD_STATUS_LABEL[p.status]} ({p.weekIdxs.length} weeks)</option>
                ))}
              </select>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.8 }}>Weeks</span>
            <button
              onClick={() => { setPageStart(Math.max(0, effectivePageStart - WEEKS_PER_PAGE)); setSelectedWeek(null); }}
              disabled={!canGoPrev}
              style={btnStyle('ghost', !canGoPrev)}
              title="Previous weeks"
            >
              {'\u25C0'}
            </button>
            <div style={{ display: 'flex', background: C.creme, borderRadius: 10, padding: 3, border: '1px solid ' + C.orLight, gap: 2, flexWrap: 'wrap' }}>
              {visibleWeeks.map(([idx, date]) => {
                const active = idx === focusWeekIdx;
                return (
                  <button key={idx} onClick={() => setSelectedWeek(idx)} title={date}
                    style={{ border: 'none', borderRadius: 8, padding: '4px 11px', cursor: 'pointer', background: active ? '#FFFFFF' : 'transparent', boxShadow: active ? '0 1px 4px rgba(74,31,56,0.14)' : 'none', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: active ? C.bordeaux : C.texteGris }}>W{idx}</span>
                    <span style={{ display: 'block', fontSize: 9.5, color: active ? C.bordeaux : '#A08B7D' }}>{String(date).slice(5)}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setPageStart(effectivePageStart + WEEKS_PER_PAGE); setSelectedWeek(null); }}
              disabled={!canGoNext}
              style={btnStyle('ghost', !canGoNext)}
              title="Next weeks"
            >
              {'\u25B6'}
            </button>
          </div>

          {/* Row 2: focus week summary + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, borderRight: '1px solid #F3E6D8' }}>
              <span style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FBEEDD', fontSize: 12.5, fontWeight: 800, padding: '5px 11px', borderRadius: 9 }}>W{focusWeekIdx}</span>
              <span style={{ fontSize: 12, color: C.texteGris }}>{grid.weeks[focusWeekIdx] || ''}</span>
            </div>
            {[
              { label: 'Members', value: String(totalMembers), color: C.bordeauxDark },
              { label: 'Paid', value: String(focusPaid), color: C.success },
              { label: 'Missing', value: String(focusMissing), color: focusMissing > 0 ? C.danger : C.texteGris },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', minWidth: 58 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: item.color, lineHeight: 1.1 }}>{item.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.6 }}>{item.label}</div>
              </div>
            ))}
            <div style={{ minWidth: 150, flex: '0 1 200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                <span>Completion</span><span style={{ color: C.bordeaux }}>{focusCompletion}%</span>
              </div>
              <div style={{ height: 6, background: '#F0E4D6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: focusCompletion + '%', height: '100%', background: focusCompletion === 100 ? 'linear-gradient(90deg,#66BB6A,#2E7D32)' : 'linear-gradient(90deg,#E9C77B,#6B2D4E)', transition: 'width .3s' }} />
              </div>
            </div>
            <div className="UNIMUNITY-no-print" style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button onClick={() => markAllPaidForWeek(focusWeekIdx, focusSlotNums)} style={btnStyle('ghost')}>
                {'\u2611'} Mark All Paid
              </button>
              <button onClick={() => clearWeekPayments(focusWeekIdx, focusSlotNums)} style={btnStyle('ghost')}>
                {'\u2610'} Clear Week
              </button>
              <button onClick={() => handleExportWeek(focusWeekIdx)} style={btnStyle('ghost')}>
                {'\u{1F4C4}'} Export Week
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #F0E4D6',
            overflow: 'auto',
            boxShadow: '0 2px 14px rgba(107,45,78,0.06)',
          }}
        >
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th
                  style={{
                    position: 'sticky',
                    top: 0,
                    left: 0,
                    background: C.bordeaux,
                    color: C.ivoire,
                    padding: '12px 16px',
                    textAlign: 'left',
                    zIndex: 3,
                    minWidth: 240,
                  }}
                >
                  Member
                </th>
                {visibleWeeks.map(([idx, date]) => (
                  <th
                    key={idx}
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: C.bordeaux,
                      color: C.or,
                      padding: '10px 12px',
                      fontSize: 12,
                      minWidth: 90,
                      textAlign: 'center',
                      zIndex: 2,
                    }}
                  >
                    W{idx}
                    <div style={{ color: C.ivoire, fontWeight: 400, fontSize: 10.5 }}>
                      {date}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotEntries.map(([slotNum, slot]) => {
                const meta = memberMeta[slot.memberId] || { status: 'active', joinedLabel: '' };
                const rate = contributionRateForSlot(slotNum);
                return (
                  <tr key={slotNum} style={{ borderBottom: '1px solid ' + C.border }}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        background: C.ivoire,
                        padding: '12px 16px',
                        borderRight: '1px solid ' + C.border,
                        zIndex: 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: avatarColor(slot.memberName),
                            color: C.ivoire,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(slot.memberName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: C.texteFonce, fontSize: 13.5 }}>
                            #{slotNum} · {slot.memberName}
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: '1px 7px',
                                borderRadius: 20,
                                background: meta.status === 'inactive' ? C.dangerBg : C.successBg,
                                color: meta.status === 'inactive' ? C.danger : C.success,
                              }}
                            >
                              ● {meta.status === 'inactive' ? 'Inactive' : 'Active'}
                            </span>
                            <span style={{ fontSize: 10.5, color: C.texteGris }}>
                              {rate}% paid
                            </span>
                            {(() => {
                              const shownIdxs = visibleWeeks.map(([w]) => w);
                              const allTicked = shownIdxs.length > 0 && shownIdxs.every((w) => pendingPayments[slotNum]?.[w]);
                              return (
                                <button
                                  className="UNIMUNITY-no-print"
                                  onClick={() => setRowWeeks(slotNum, shownIdxs, !allTicked)}
                                  title={allTicked ? 'Untick all the weeks shown for this member' : 'Tick all the weeks shown for this member'}
                                  style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 8, cursor: 'pointer',
                                    border: '1px solid ' + C.border, background: allTicked ? '#FFEBEE' : '#E8F5E9', color: allTicked ? '#C62828' : '#2E7D32' }}>
                                  {allTicked ? '\u2717 Untick all' : '\u2713 Tick all'}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>
                    {visibleWeeks.map(([weekIdx]) => {
                      const isPaid = pendingPayments[slotNum]?.[weekIdx] || false;
                      const weekColor = paidWeekColor(weekIdx);
                      return (
                        <td
                          key={weekIdx}
                          className="UNIMUNITY-cell"
                          onClick={() => toggleQueuedPayment(slotNum, weekIdx)}
                          style={{
                            textAlign: 'center',
                            cursor: 'pointer',
                            padding: 8,
                          }}
                        >
                          <div
                            className="UNIMUNITY-box"
                            style={{
                              width: 30,
                              height: 30,
                              margin: '0 auto',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isPaid ? weekColor : C.creme,
                              border: '1.5px solid ' + (isPaid ? weekColor : C.border),
                              transition: 'all 0.15s',
                            }}
                          >
                            {isPaid && (
                              <span style={{ color: C.or, fontSize: 15, fontWeight: 700 }}>
                                {'\u2713'}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalCollectedLabel && (
          <p style={{ marginTop: 10, fontSize: 12.5, color: C.texteGris }}>
            Total collected this cycle: <strong style={{ color: C.bordeaux }}>{totalCollectedLabel}</strong>
          </p>
        )}

      </div>

      <Footer />
    </div>
  );
}
