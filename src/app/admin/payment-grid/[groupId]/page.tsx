'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams } from 'next/navigation';

const C = {
  bleu: '#6E93AC', bleuFonce: '#4A6B85', or: '#E9C77B',
  creme: '#FBEEDD', ivoire: '#FFFDF7', border: '#EAD9BE',
  texteGris: '#7A9490', texteFonce: '#3A2F1F',
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38',
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

export default function PaymentGridPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [grid, setGrid] = useState<Grid | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');

  const gridId = groupId + '_current';

  useEffect(() => {
    loadGrid();
  }, [groupId]);

  async function loadGrid() {
    setLoading(true);
    try {
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      if (groupSnap.exists()) {
        setGroupName(groupSnap.data().name || 'Group');
      }

      const gridSnap = await getDoc(doc(db, 'paymentGrids', gridId));
      if (gridSnap.exists()) {
        setGrid(gridSnap.data() as Grid);
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

        const newGrid: Grid = {
          organizerId: groupSnap.data()?.organizerId || '',
          groupId,
          cycleId: 'cycle-' + Date.now(),
          weeks,
          slots,
          payments: {},
        };

        await setDoc(doc(db, 'paymentGrids', gridId), newGrid);
        setGrid(newGrid);
      }
    } catch (err) {
      console.error('Error loading grid:', err);
    } finally {
      setLoading(false);
    }
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
  const slotEntries = Object.entries(grid.slots).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );

  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: '32px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ color: C.bordeaux, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
          Payment Grid — {groupName}
        </h1>
        <p style={{ color: C.texteGris, marginBottom: 24 }}>
          Click a cell to mark a payment as received.
        </p>

        <div
          style={{
            background: C.ivoire,
            border: '1px solid ' + C.border,
            borderRadius: 10,
            padding: '12px 20px',
            marginBottom: 20,
            color: C.texteFonce,
            fontSize: 14,
          }}
        >
          <strong style={{ color: C.bordeaux }}>Deposit</strong> — initial group fund
          reference (informational only, no weekly tracking).
        </div>

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
                    left: 0,
                    background: C.bordeaux,
                    color: C.ivoire,
                    padding: '14px 20px',
                    textAlign: 'left',
                    zIndex: 2,
                    minWidth: 220,
                  }}
                >
                  Member
                </th>
                {weekEntries.map(([idx, date]) => (
                  <th
                    key={idx}
                    style={{
                      background: C.bordeaux,
                      color: C.or,
                      padding: '10px 14px',
                      fontSize: 12,
                      minWidth: 70,
                      textAlign: 'center',
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
              {slotEntries.map(([slotNum, slot]) => (
                <tr key={slotNum} style={{ borderBottom: '1px solid ' + C.border }}>
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: C.ivoire,
                      padding: '12px 20px',
                      fontWeight: 600,
                      color: C.texteFonce,
                    }}
                  >
                    #{slotNum} · {slot.memberName}
                  </td>
                  {weekEntries.map(([weekIdx]) => {
                    const isPaid = grid.payments[slotNum]?.[weekIdx] || false;
                    const key = slotNum + '-' + weekIdx;
                    const isSaving = saving === key;
                    return (
                      <td
                        key={weekIdx}
                        onClick={() => !isSaving && togglePayment(slotNum, weekIdx)}
                        style={{
                          textAlign: 'center',
                          cursor: 'pointer',
                          padding: 8,
                          transition: 'background 0.15s',
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            margin: '0 auto',
                            borderRadius: 7,
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
                            <span style={{ color: C.or, fontSize: 14, fontWeight: 700 }}>
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
