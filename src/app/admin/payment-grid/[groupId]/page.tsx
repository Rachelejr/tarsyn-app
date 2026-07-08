'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, addDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';

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
}

interface MemberMeta {
  status: string;
  joinedLabel: string;
}

// Genere des semaines en preservant EXACTEMENT le jour de la semaine de
// startDateStr (ex: si l'admin choisit un vendredi, TOUTES les colonnes
// resteront des vendredis). Couvre depuis cette date jusqu'a fin decembre
// de l'annee en cours, pour qu'un sol demarre en 2025 encore actif en 2026
// reste dans une seule grille continue.
function generateWeeksFromDate(startDateStr: string): Record<string, string> {
  const weeks: Record<string, string> = {};
  const start = new Date(startDateStr);
  const startYear = start.getFullYear();
  const currentYear = new Date().getFullYear();
  const endYear = Math.max(startYear, currentYear);
  const end = new Date(endYear, 11, 31);
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

// Deduit la date de depart d'une grille existante a partir de sa semaine la
// plus ancienne, pour les grilles creees avant l'ajout du champ startDate.
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
  const [memberMeta, setMemberMeta] = useState<Record<string, MemberMeta>>({});
  const [memberUserIds, setMemberUserIds] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [weeklyAmount, setWeeklyAmount] = useState<number | null>(null);
  const [showStartDateEditor, setShowStartDateEditor] = useState(false);
  const [gridStartInput, setGridStartInput] = useState('');
  const [savingStartDate, setSavingStartDate] = useState(false);

  // Pending (unsaved) payments state â€” edits live here until "Save Payments" is clicked
  const [pendingPayments, setPendingPayments] = useState<Record<string, Record<string, boolean>>>({});
  const [savingAll, setSavingAll] = useState(false);

  // Period filter (native calendar inputs)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Week window navigation
  const [pageStart, setPageStart] = useState<number | null>(null);

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
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      if (groupSnap.exists()) {
        setGroupName(groupSnap.data().name || 'Group');
        const amt = groupSnap.data().weeklyAmount || groupSnap.data().contributionAmount;
        if (typeof amt === 'number') setWeeklyAmount(amt);
      }

      const gridSnap = await getDoc(doc(db, 'paymentGrids', gridId));
      let loadedGrid: Grid;

      if (gridSnap.exists()) {
        loadedGrid = gridSnap.data() as Grid;
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

      // Auto-correction : la grille doit TOUJOURS couvrir depuis sa date de
      // depart choisie jusqu'a aujourd'hui, en preservant le jour de semaine
      // exact (ex: vendredi reste vendredi). Ca se corrige tout seul a chaque
      // chargement, sauf si l'admin a explicitement choisi une autre date via
      // le bouton "Grid Start Date" (startDate persiste alors telle quelle).
      const effectiveStartDate = loadedGrid.startDate || startOfGridDate(loadedGrid.weeks) || new Date().toISOString().split('T')[0];
      const correctedWeeks = generateWeeksFromDate(effectiveStartDate);
      const weeksChanged = JSON.stringify(correctedWeeks) !== JSON.stringify(loadedGrid.weeks);
      if (weeksChanged || !loadedGrid.startDate) {
        loadedGrid = { ...loadedGrid, startDate: effectiveStartDate, startYear: new Date(effectiveStartDate).getFullYear(), weeks: correctedWeeks };
        await setDoc(doc(db, 'paymentGrids', gridId), { startDate: effectiveStartDate, startYear: new Date(effectiveStartDate).getFullYear(), weeks: correctedWeeks }, { merge: true });
      }

      // Toujours rafraichir les noms des membres depuis leur document reel
      // (les anciennes grilles peuvent avoir un memberName fige/obsolete), en
      // respectant l etiquetage "(part i/n)" pour les membres a parts multiples.
      const slotsByMember: Record<string, string[]> = {};
      Object.entries(loadedGrid.slots).forEach(([slotNum, slot]) => {
        if (!slotsByMember[slot.memberId]) slotsByMember[slot.memberId] = [];
        slotsByMember[slot.memberId].push(slotNum);
      });

      const refreshedSlots: Record<string, Slot> = {};
      const collectedUserIds: Record<string, string> = {};
      await Promise.all(
        Object.entries(loadedGrid.slots).map(async ([slotNum, slot]) => {
          let displayName = slot.memberName;
          try {
            const memberSnap = await getDoc(doc(db, 'members', slot.memberId));
            if (memberSnap.exists()) {
              const d = memberSnap.data();
              displayName = d.fullName || d.name || '(no name)';
              if (d.userId) collectedUserIds[slot.memberId] = d.userId;
            }
          } catch {
            // Silent fail â€” keep the previously stored name.
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

      setGrid(loadedGrid);
      setPendingPayments(loadedGrid.payments || {});
      await loadMemberMeta(loadedGrid);
    } catch (err) {
      console.error('Error loading grid:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMemberMeta(loadedGrid: Grid) {
    const memberIds = Array.from(
      new Set(Object.values(loadedGrid.slots).map((s) => s.memberId))
    ).filter(Boolean);

    const meta: Record<string, MemberMeta> = {};

    await Promise.all(
      memberIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'members', id));
          if (snap.exists()) {
            const data = snap.data();
            const status = data.status || 'active';
            let joinedLabel = '';
            const rawDate = data.joinedAt || data.createdAt;
            if (rawDate?.toDate) {
              joinedLabel = rawDate.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            } else if (typeof rawDate === 'string') {
              joinedLabel = new Date(rawDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
            }
            meta[id] = { status, joinedLabel };
          }
        } catch {
          // Silent fail â€” display-only metadata, never blocks the grid.
        }
      })
    );

    setMemberMeta(meta);
  }

  // Local-only toggle â€” nothing is written to Firestore until Save Payments is clicked
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

  async function syncMemberView(
    memberId: string,
    slotsMap: Record<string, Slot>,
    paymentsMap: Record<string, Record<string, boolean>>,
    weeksMap: Record<string, string>
  ) {
    const memberSlots = Object.values(slotsMap).filter((s) => s.memberId === memberId);
    if (memberSlots.length === 0) return;

    // The member portal reads memberViews by Firebase Auth UID (currentUid),
    // not by the Firestore members/{id} document id — so we must key this
    // document the same way, or the member's own grid never finds it.
    const userId = memberUserIds[memberId];
    if (!userId) return; // Member hasn't linked an account yet — skip silently

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
          if (!userId) return; // Member hasn't linked an account yet â€” skip silently

          const amountLabel = weeklyAmount ? '\$' + weeklyAmount.toLocaleString() : 'Amount not set';
          const receiptHtml =
            '<html><body style="font-family:sans-serif;padding:32px;color:#4A1F38;">' +
            '<h2 style="color:#6B2D4E;">TARSYN Payment Receipt</h2>' +
            '<p><strong>Group:</strong> ' + groupName + '</p>' +
            '<p><strong>Member:</strong> ' + slot.memberName + '</p>' +
            '<p><strong>Week:</strong> W' + weekIdx + ' (' + weekDate + ')</p>' +
            '<p><strong>Amount:</strong> ' + amountLabel + '</p>' +
            '<p><strong>Status:</strong> Paid</p>' +
            '<hr/><p style="font-size:11px;color:#8A7B6C;">Powered by TARSYNâ„¢ Â· A product of Ma Production Luxenn Zara LLC</p>' +
            '</body></html>';
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
      'Existing payment checkmarks stay attached to their column position, not their old date â€” ' +
      'double-check this before confirming if payments were already recorded.'
    )) return;

    setSavingStartDate(true);
    try {
      const newWeeks: Record<string, string> = generateWeeksFromDate(gridStartInput);
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

  // Filter weeks by selected calendar period
  const filteredWeekEntries = weekEntries.filter(([, d]) => {
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });
  const activeWeekEntries = filteredWeekEntries.length > 0 ? filteredWeekEntries : weekEntries;

  // Default window: always start at the beginning of the year (January),
  // never centered on today â€” the admin must be able to see the whole
  // calendar year from the top without guessing where "today" landed.
  const effectivePageStart = pageStart !== null ? pageStart : 0;

  const visibleWeeks = activeWeekEntries.slice(
    effectivePageStart,
    effectivePageStart + WEEKS_PER_PAGE
  );
  const canGoPrev = effectivePageStart > 0;
  const canGoNext = effectivePageStart + WEEKS_PER_PAGE < activeWeekEntries.length;

  const focusWeekIdx = visibleWeeks[0]?.[0] ?? weekEntries[0]?.[0] ?? '0';

  // Compact summary for the focus week
  const focusSlotNums = allSlotEntries.map(([slotNum]) => slotNum);
  const focusPaid = focusSlotNums.filter(
    (slotNum) => pendingPayments[slotNum]?.[focusWeekIdx]
  ).length;
  const focusTotal = focusSlotNums.length;
  const focusMissing = focusTotal - focusPaid;
  const focusCompletion = focusTotal > 0 ? Math.round((focusPaid / focusTotal) * 100) : 0;

  const hasChanges = JSON.stringify(pendingPayments) !== JSON.stringify(grid.payments);

  const elapsedWeekEntries = weekEntries.filter(([, d]) => new Date(d) <= today);

  function contributionRateForSlot(slotNum: string) {
    if (elapsedWeekEntries.length === 0) return 0;
    let paid = 0;
    elapsedWeekEntries.forEach(([wIdx]) => {
      if (pendingPayments[slotNum]?.[wIdx]) paid++;
    });
    return Math.round((paid / elapsedWeekEntries.length) * 100);
  }

  const totalCollectedLabel = weeklyAmount
    ? '$' +
      allSlotEntries
        .reduce((sum, [slotNum]) => {
          const paidCount = weekEntries.filter(
            ([wIdx]) => pendingPayments[slotNum]?.[wIdx]
          ).length;
          return sum + paidCount * weeklyAmount;
        }, 0)
        .toLocaleString()
    : undefined;

  function btnStyle(variant: 'primary' | 'secondary' | 'ghost', disabled?: boolean) {
    const base: React.CSSProperties = {
      borderRadius: 10,
      padding: '9px 15px',
      fontSize: 13.5,
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      opacity: disabled ? 0.55 : 1,
      whiteSpace: 'nowrap',
    };
    if (variant === 'primary') {
      return { ...base, background: C.bordeaux, color: C.ivoire, border: 'none' };
    }
    if (variant === 'ghost') {
      return {
        ...base,
        background: 'transparent',
        color: C.texteFonce,
        border: '1px solid ' + C.border,
        padding: '7px 12px',
        fontSize: 12.5,
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
    border: '1px solid ' + C.border,
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    color: C.texteFonce,
    background: C.ivoire,
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
    <div style={{ minHeight: '100vh', background: C.creme, padding: '28px 20px' }}>
      <style>{`
        .tarsyn-cell { transition: all 0.15s ease; }
        .tarsyn-cell:hover .tarsyn-box {
          outline: 2px solid ${C.or};
          outline-offset: 1px;
        }
        @media print {
          .tarsyn-no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1360, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: C.or,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 21,
                flexShrink: 0,
              }}
            >
              ðŸ’³
            </div>
            <div>
              <h1 style={{ color: C.bordeaux, fontSize: 23, fontWeight: 700, margin: 0 }}>
                Payment Grid â€” {groupName}
              </h1>
              <p style={{ color: C.texteGris, margin: '3px 0 0', fontSize: 13 }}>
                Track every member&apos;s weekly contributions.
              </p>
            </div>
          </div>

          {/* Primary action bar */}
          <div className="tarsyn-no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleSaveAll}
              disabled={!hasChanges || savingAll}
              style={btnStyle('primary', !hasChanges || savingAll)}
            >
              ðŸ’¾ {savingAll ? 'Saving...' : 'Save Payments'}
            </button>
            <button onClick={handleExportAll} style={btnStyle('secondary')}>
              ðŸ“„ Export
            </button>
            <button onClick={() => router.push('/dashboard/add-member?groupId=' + groupId)} style={btnStyle('secondary')}>âž• Add / Edit Members</button>
            <button onClick={handlePrint} style={btnStyle('secondary')}>
              ðŸ–¨ Print
            </button>
          </div>
        </div>

        {/* Unsaved changes banner */}
        {hasChanges && (
          <div
            className="tarsyn-no-print"
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
              âš  You have unsaved changes.
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
            background: C.ivoire,
            border: '1px solid ' + C.border,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
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
            â„¹
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
          className="tarsyn-no-print"
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: C.texteFonce, fontWeight: 600 }}>
            ðŸ“… Period:
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
          <span style={{ color: C.texteGris }}>â†’</span>
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
            âš™ Grid Start Date
          </button>
        </div>

        {showStartDateEditor && (
          <div
            className="tarsyn-no-print"
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
              even back in 2025) â€” every column will stay on that same day of the week, through today:
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

        {/* Compact summary bar */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          {[
            { label: 'Members', value: String(totalMembers) },
            { label: 'Week', value: 'W' + focusWeekIdx },
            { label: 'Paid', value: String(focusPaid) },
            { label: 'Missing', value: String(focusMissing) },
            { label: 'Completion', value: focusCompletion + '%' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: C.ivoire,
                border: '1px solid ' + C.border,
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 12.5,
                color: C.texteGris,
                display: 'flex',
                gap: 6,
                alignItems: 'baseline',
              }}
            >
              <span>{item.label}:</span>
              <strong style={{ color: C.bordeaux, fontSize: 14 }}>{item.value}</strong>
            </div>
          ))}
        </div>

        {/* Week navigation + quick actions */}
        <div
          className="tarsyn-no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() =>
                setPageStart(Math.max(0, effectivePageStart - WEEKS_PER_PAGE))
              }
              disabled={!canGoPrev}
              style={btnStyle('ghost', !canGoPrev)}
            >
              â—€ Previous
            </button>
            <span style={{ fontSize: 12.5, color: C.texteGris }}>
              {visibleWeeks.map(([idx]) => 'W' + idx).join(' Â· ')}
            </span>
            <button
              onClick={() => setPageStart(effectivePageStart + WEEKS_PER_PAGE)}
              disabled={!canGoNext}
              style={btnStyle('ghost', !canGoNext)}
            >
              Next â–¶
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => markAllPaidForWeek(focusWeekIdx, focusSlotNums)}
              style={btnStyle('ghost')}
            >
              â˜‘ Mark All Paid (W{focusWeekIdx})
            </button>
            <button
              onClick={() => clearWeekPayments(focusWeekIdx, focusSlotNums)}
              style={btnStyle('ghost')}
            >
              â˜ Clear Week
            </button>
            <button onClick={() => handleExportWeek(focusWeekIdx)} style={btnStyle('ghost')}>
              ðŸ“„ Export Week
            </button>
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: C.ivoire,
            borderRadius: 14,
            border: '1px solid ' + C.border,
            overflow: 'auto',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
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
                            #{slotNum} Â· {slot.memberName}
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
                              â— {meta.status === 'inactive' ? 'Inactive' : 'Active'}
                            </span>
                            <span style={{ fontSize: 10.5, color: C.texteGris }}>
                              {rate}% paid
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {visibleWeeks.map(([weekIdx]) => {
                      const isPaid = pendingPayments[slotNum]?.[weekIdx] || false;
                      return (
                        <td
                          key={weekIdx}
                          className="tarsyn-cell"
                          onClick={() => toggleQueuedPayment(slotNum, weekIdx)}
                          style={{
                            textAlign: 'center',
                            cursor: 'pointer',
                            padding: 8,
                          }}
                        >
                          <div
                            className="tarsyn-box"
                            style={{
                              width: 30,
                              height: 30,
                              margin: '0 auto',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isPaid ? C.bordeaux : C.creme,
                              border: '1.5px solid ' + (isPaid ? C.bordeaux : C.border),
                              transition: 'all 0.15s',
                            }}
                          >
                            {isPaid && (
                              <span style={{ color: C.or, fontSize: 15, fontWeight: 700 }}>
                                âœ“
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
            Total collected to date: <strong style={{ color: C.bordeaux }}>{totalCollectedLabel}</strong>
          </p>
        )}

        {/* Footer */}
        <div
          className="tarsyn-no-print"
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: '1px solid ' + C.border,
            textAlign: 'center',
            fontSize: 12.5,
            color: C.texteGris,
          }}
        >
          Powered by TARSYNâ„¢ Â· A product of Ma Production Luxenn Zara LLC Â· Â© 2026 All
          Rights Reserved Â· v1.0.0
        </div>
      </div>
    </div>
  );
}