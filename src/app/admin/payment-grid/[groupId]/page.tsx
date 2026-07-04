'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams } from 'next/navigation';

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
};

interface Slot {
  slotNumber: string;
  memberId: string;
  memberName: string;
}

interface Grid {
  organizerId: string;
  groupId: string;
  cycleId: string;
  weeks: Record<string, string>;
  slots: Record<string, Slot>;
  payments: Record<string, Record<string, boolean>>;
}

interface MemberMeta {
  status: string;
  joinedLabel: string;
}

export default function PaymentGridPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [memberMeta, setMemberMeta] = useState<Record<string, MemberMeta>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [weeklyAmount, setWeeklyAmount] = useState<number | null>(null);

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
        setGrid(loadedGrid);
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
          slots[String(slotCounter)] = {
            slotNumber: String(slotCounter),
            memberId: m.id,
            memberName: data.name || '(no name)',
          };
          slotCounter++;
        });

        const weeks: Record<string, string> = {};
        const start = new Date();
        for (let i = 0; i < 20; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i * 7);
          weeks[String(i)] = d.toISOString().split('T')[0];
        }

        loadedGrid = {
          organizerId: groupSnap.data()?.organizerId || groupSnap.data()?.adminId || '',
          groupId,
          cycleId: 'cycle-' + Date.now(),
          weeks,
          slots,
          payments: {},
        };

        await setDoc(doc(db, 'paymentGrids', gridId), loadedGrid);
        setGrid(loadedGrid);
      }

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
          // Silent fail — this is display-only metadata, never blocks the grid.
        }
      })
    );

    setMemberMeta(meta);
  }

  async function togglePayment(slotNumber: string, weekIndex: string) {
    if (!grid) return;
    const key = slotNumber + '-' + weekIndex;
    setSaving(key);

    const currentValue = grid.payments[slotNumber]?.[weekIndex] || false;
    const updatedPayments = {
      ...grid.payments,
      [slotNumber]: {
        ...grid.payments[slotNumber],
        [weekIndex]: !currentValue,
      },
    };

    setGrid({ ...grid, payments: updatedPayments });

    try {
      await setDoc(
        doc(db, 'paymentGrids', gridId),
        { payments: updatedPayments },
        { merge: true }
      );

      const slot = grid.slots[slotNumber];
      if (slot?.memberId) {
        await syncMemberView(slot.memberId);
      }
    } catch (err) {
      console.error('Error saving payment:', err);
    } finally {
      setSaving(null);
    }
  }

  async function syncMemberView(memberId: string) {
    if (!grid) return;

    const memberSlots = Object.values(grid.slots).filter(
      (s) => s.memberId === memberId
    );
    if (memberSlots.length === 0) return;

    const memberPayments: Record<string, Record<string, boolean>> = {};
    memberSlots.forEach((s) => {
      memberPayments[s.slotNumber] = grid.payments[s.slotNumber] || {};
    });

    await setDoc(
      doc(db, 'paymentGrids', gridId, 'memberViews', memberId),
      {
        memberName: memberSlots[0].memberName,
        slots: memberSlots.map((s) => s.slotNumber),
        weeks: grid.weeks,
        payments: memberPayments,
      },
      { merge: true }
    );
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

  const uniqueMemberIds = Array.from(
    new Set(allSlotEntries.map(([, s]) => s.memberId))
  );
  const totalMembers = uniqueMemberIds.length;
  const activeCount = uniqueMemberIds.filter(
    (id) => (memberMeta[id]?.status || 'active').toLowerCase() !== 'inactive'
  ).length;
  const inactiveCount = totalMembers - activeCount;

  let totalPaidCells = 0;
  let totalPossibleCells = 0;
  const today = new Date();
  let currentWeekLabel = 'W0';
  let currentWeekRange = '';

  weekEntries.forEach(([idx, dateStr]) => {
    allSlotEntries.forEach(([slotNum]) => {
      totalPossibleCells++;
      if (grid.payments[slotNum]?.[idx]) totalPaidCells++;
    });
    const weekDate = new Date(dateStr);
    if (weekDate <= today) {
      currentWeekLabel = 'W' + idx;
      const endDate = new Date(weekDate);
      endDate.setDate(endDate.getDate() + 6);
      currentWeekRange =
        weekDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) +
        ' \u2013 ' +
        endDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    }
  });

  const progressPct =
    totalPossibleCells > 0
      ? Math.round((totalPaidCells / totalPossibleCells) * 1000) / 10
      : 0;

  const totalCollectedLabel = weeklyAmount
    ? '$' + (totalPaidCells * weeklyAmount).toLocaleString()
    : totalPaidCells + ' payments';

  function btnStyle(variant: 'primary' | 'secondary') {
    if (variant === 'primary') {
      return {
        background: C.bordeaux,
        color: C.ivoire,
        border: 'none',
        borderRadius: 10,
        padding: '10px 18px',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      } as React.CSSProperties;
    }
    return {
      background: C.ivoire,
      color: C.texteFonce,
      border: '1px solid ' + C.border,
      borderRadius: 10,
      padding: '10px 16px',
      fontSize: 13.5,
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    } as React.CSSProperties;
  }

  const filterInputStyle: React.CSSProperties = {
    border: '1px solid ' + C.border,
    borderRadius: 10,
    padding: '9px 14px',
    fontSize: 13.5,
    color: C.texteFonce,
    background: C.ivoire,
    outline: 'none',
  };

  function handleExport() {
    const weekCols = weekEntries.map(([idx]) => 'W' + idx);
    const rows: string[][] = [['Member', ...weekCols]];
    slotEntries.forEach(([slotNum, slot]) => {
      const row = [slot.memberName];
      weekEntries.forEach(([weekIdx]) => {
        row.push(grid.payments[slotNum]?.[weekIdx] ? 'Paid' : '');
      });
      rows.push(row);
    });
    const csv = rows
      .map((r) => r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = groupName.replace(/\s+/g, '_') + '_payment_grid.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: '32px 24px' }}>
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

      <div style={{ maxWidth: 1700, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: C.or,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              💳
            </div>
            <div>
              <h1 style={{ color: C.bordeaux, fontSize: 26, fontWeight: 700, margin: 0 }}>
                Payment Grid — {groupName}
              </h1>
              <p style={{ color: C.texteGris, margin: '4px 0 0', fontSize: 14 }}>
                Track every member&apos;s weekly contributions.
              </p>
            </div>
          </div>
          <div className="tarsyn-no-print" style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleExport} style={btnStyle('secondary')}>
              ⬇ Export
            </button>
            <button onClick={handlePrint} style={btnStyle('secondary')}>
              🖨 Print
            </button>
            <button style={btnStyle('primary')}>👥 Add / Edit Members</button>
          </div>
        </div>

        {/* Info card */}
        <div
          style={{
            background: C.ivoire,
            border: '1px solid ' + C.border,
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: C.bordeaux,
              color: C.ivoire,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ℹ
          </div>
          <div>
            <strong style={{ color: C.bordeaux, fontSize: 14 }}>Deposit</strong>
            <p style={{ margin: '2px 0 0', color: C.texteFonce, fontSize: 13.5 }}>
              Initial contribution used to start the group. This amount is informational
              only and is not counted in weekly contributions.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div
          className="tarsyn-no-print"
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <select style={filterInputStyle} defaultValue="20">
            <option value="20">Week view (20 weeks)</option>
          </select>
          <div style={filterInputStyle}>
            {weekEntries[0]?.[1]} – {weekEntries[weekEntries.length - 1]?.[1]}
          </div>
          <input
            type="text"
            placeholder="Search member..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...filterInputStyle, flex: 1, minWidth: 200 }}
          />
          <button style={btnStyle('secondary')}>▽ Filters</button>
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
                    padding: '14px 20px',
                    textAlign: 'left',
                    zIndex: 3,
                    minWidth: 260,
                  }}
                >
                  Member
                </th>
                {weekEntries.map(([idx, date]) => (
                  <th
                    key={idx}
                    style={{
                      position: 'sticky',
                      top: 0,
                      background: C.bordeaux,
                      color: C.or,
                      padding: '10px 14px',
                      fontSize: 12,
                      minWidth: 74,
                      textAlign: 'center',
                      zIndex: 2,
                    }}
                  >
                    W{idx}
                    <div style={{ color: C.ivoire, fontWeight: 400, fontSize: 11 }}>
                      {date}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slotEntries.map(([slotNum, slot]) => {
                const meta = memberMeta[slot.memberId] || { status: 'active', joinedLabel: '' };
                return (
                  <tr key={slotNum} style={{ borderBottom: '1px solid ' + C.border }}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        background: C.ivoire,
                        padding: '14px 20px',
                        borderRight: '1px solid ' + C.border,
                        zIndex: 1,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: avatarColor(slot.memberName),
                            color: C.ivoire,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(slot.memberName)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: C.texteFonce, fontSize: 14 }}>
                            #{slotNum} · {slot.memberName}
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 20,
                                background: meta.status === 'inactive' ? C.dangerBg : C.successBg,
                                color: meta.status === 'inactive' ? C.danger : C.success,
                              }}
                            >
                              ● {meta.status === 'inactive' ? 'Inactive' : 'Active'}
                            </span>
                            {meta.joinedLabel && (
                              <span style={{ fontSize: 11.5, color: C.texteGris }}>
                                Joined {meta.joinedLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {weekEntries.map(([weekIdx]) => {
                      const isPaid = grid.payments[slotNum]?.[weekIdx] || false;
                      const key = slotNum + '-' + weekIdx;
                      const isSaving = saving === key;
                      return (
                        <td
                          key={weekIdx}
                          className="tarsyn-cell"
                          onClick={() => !isSaving && togglePayment(slotNum, weekIdx)}
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
                              opacity: isSaving ? 0.5 : 1,
                              transform: isSaving ? 'scale(0.9)' : 'scale(1)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isPaid && (
                              <span style={{ color: C.or, fontSize: 15, fontWeight: 700 }}>
                                ✓
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

        {/* Summary cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginTop: 24,
          }}
        >
          {[
            {
              icon: '👥',
              label: 'Total Members',
              value: totalMembers,
              sub: activeCount + ' active · ' + inactiveCount + ' inactive',
            },
            {
              icon: '✅',
              label: 'Total Collected',
              value: totalCollectedLabel,
              sub: progressPct + '% completion',
            },
            {
              icon: '📅',
              label: 'Current Week',
              value: currentWeekLabel,
              sub: currentWeekRange,
            },
            {
              icon: '🎯',
              label: 'Overall Progress',
              value: progressPct + '%',
              sub: totalPaidCells + ' / ' + totalPossibleCells + ' payments',
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: C.ivoire,
                border: '1px solid ' + C.border,
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: C.creme,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 12.5, color: C.texteGris }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.bordeaux }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 11.5, color: C.texteGris, marginTop: 2 }}>
                  {card.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="tarsyn-no-print"
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: '1px solid ' + C.border,
            textAlign: 'center',
            fontSize: 12.5,
            color: C.texteGris,
          }}
        >
          Powered by TARSYN™ · A product of Ma Production Luxenn Zara LLC · © 2026 All
          Rights Reserved · v1.0.0
        </div>
      </div>
    </div>
  );
}