"use client";

// src/app/dashboard/church/[churchId]/income/page.tsx
//
// Phase 2 of the full accounting system: Income.
//  - "Record Income" — category (16 options), amount, date, fund,
//    payment method, description, reference, contributor. On save:
//      1. Atomically reads/increments churches/{churchId}/counters/
//         receipts_{year} to generate a collision-proof receipt number
//         (REC-2026-000001).
//      2. Atomically credits the chosen fund's balance.
//      3. Writes the income entry.
//    All three happen inside a single Firestore transaction.
//  - Every entry has a printable receipt (church name, receipt number,
//    date, category, amount, fund, payment method, description).
//  - No permanent deletion — "Cancel" sets status to 'cancelled', reverses
//    the fund's balance in the same transaction, and records who/when/why.

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import type {
  IncomeEntryV2,
  IncomeFormValuesV2,
  IncomeCategoryV2,
  PaymentMethod,
  FundType,
} from "@/types/financeV2";
import {
  INCOME_CATEGORIES_V2,
  INCOME_CATEGORY_V2_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  FIXED_FUND_TYPES,
  FUND_TYPE_LABELS,
} from "@/types/financeV2";

const COLOR = {
  pink: "#FDE2E4",
  cream: "#F6EFDD",
  green: "#E2F0CB",
  gold: "#D8B15A",
  goldText: "#8A6D1F",
  text: "#24324A",
  textSoft: "#68758A",
  border: "rgba(216,177,90,0.35)",
  greenText: "#3F6B34",
  redText: "#B4453E",
  redBg: "#FDECEC",
};

function formatMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayValue(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const EMPTY_FORM: IncomeFormValuesV2 = {
  category: "tithes",
  amount: "",
  date: todayValue(),
  fund: "general",
  paymentMethod: "cash",
  description: "",
  reference: "",
  contributorName: "",
};

export default function IncomePage() {
  const params = useParams();
  const churchId = params?.churchId as string;
  const organizerId = auth.currentUser?.uid ?? null;

  const [entries, setEntries] = useState<IncomeEntryV2[]>([]);
  const [churchName, setChurchName] = useState("");
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<IncomeFormValuesV2>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receiptEntry, setReceiptEntry] = useState<IncomeEntryV2 | null>(null);

  const [cancelTarget, setCancelTarget] = useState<IncomeEntryV2 | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!churchId) return;
    getDoc(doc(db, "churches", churchId)).then((snap) => {
      if (snap.exists()) setChurchName((snap.data().name as string) || "");
    });
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "income"), (snap) => {
      const rows: IncomeEntryV2[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IncomeEntryV2, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setEntries(rows);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [churchId]);

  const grandTotal = useMemo(
    () => entries.filter((e) => e.status === "active").reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const totalsByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.filter((e) => e.status === "active").forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [entries]);

  function openModal() {
    setForm({ ...EMPTY_FORM, date: todayValue() });
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
  }

  async function handleSave() {
    if (!organizerId || !churchId) return;
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0) { setError("Amount must be greater than zero."); return; }
    if (!form.date) { setError("Date is required."); return; }

    setSaving(true);
    setError(null);

    try {
      const year = new Date(form.date).getFullYear();
      const counterRef = doc(db, "churches", churchId, "counters", "receipts_" + year);
      const fundRef = doc(db, "churches", churchId, "funds", form.fund);
      const incomeRef = doc(collection(db, "churches", churchId, "income"));

      await runTransaction(db, async (tx) => {
        const counterSnap = await tx.get(counterRef);
        const fundSnap = await tx.get(fundRef);
        if (!fundSnap.exists()) throw new Error("That fund doesn't exist yet — visit the Funds page first.");

        const lastNumber = counterSnap.exists() ? (counterSnap.data().lastNumber as number) || 0 : 0;
        const nextNumber = lastNumber + 1;
        const receiptNumber = "REC-" + year + "-" + String(nextNumber).padStart(6, "0");

        const fundBalance = (fundSnap.data().balance as number) || 0;

        tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
        tx.update(fundRef, { balance: fundBalance + amountNum, updatedAt: Date.now() });
        tx.set(incomeRef, {
          organizerId,
          churchId,
          category: form.category,
          amount: amountNum,
          date: form.date,
          fund: form.fund,
          paymentMethod: form.paymentMethod,
          description: form.description.trim(),
          reference: form.reference.trim(),
          contributorName: form.contributorName.trim(),
          receiptNumber,
          status: "active",
          cancelledBy: null,
          cancelledAt: null,
          cancelReason: null,
          recordedBy: auth.currentUser?.email || "",
          createdAt: Date.now(),
        });
      });

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function openCancelModal(entry: IncomeEntryV2) {
    setCancelTarget(entry);
    setCancelReason("");
  }

  async function handleCancel() {
    if (!cancelTarget || !churchId) return;
    if (!cancelReason.trim()) { alert("Please explain why this entry is being cancelled."); return; }

    setCancelling(true);
    try {
      const fundRef = doc(db, "churches", churchId, "funds", cancelTarget.fund);
      const incomeRef = doc(db, "churches", churchId, "income", cancelTarget.id);

      await runTransaction(db, async (tx) => {
        const fundSnap = await tx.get(fundRef);
        if (!fundSnap.exists()) throw new Error("Fund not found.");
        const fundBalance = (fundSnap.data().balance as number) || 0;

        tx.update(fundRef, { balance: fundBalance - cancelTarget.amount, updatedAt: Date.now() });
        tx.update(incomeRef, {
          status: "cancelled",
          cancelledBy: auth.currentUser?.email || "",
          cancelledAt: Date.now(),
          cancelReason: cancelReason.trim(),
        });
      });

      setCancelTarget(null);
      setCancelReason("");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Unable to cancel this entry. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const btnBase: CSSProperties = { borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 8, padding: "9px 10px", fontSize: 13 };
  const labelStyle: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: COLOR.text, marginBottom: 4 };
  const cardStyle: CSSProperties = { borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 20, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="no-print">
        <ChurchSidebar churchId={churchId} />
      </div>

      <div style={{ flex: 1, minHeight: "100vh", padding: 24, boxSizing: "border-box", background: `linear-gradient(120deg, ${COLOR.pink} 0%, ${COLOR.cream} 55%, ${COLOR.green} 100%)`, backgroundAttachment: "fixed" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div className="no-print">
            <ChurchPageHeader
              churchId={churchId}
              title="Income"
              subtitle="Every income entry, tied to a category and a fund, with an automatic receipt."
              actions={
                <button onClick={openModal} style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}>
                  + Record Income
                </button>
              }
            />
          </div>

          <div className="no-print" style={{ ...cardStyle, marginBottom: 20, textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Grand Total Income</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: COLOR.text }}>{formatMoney(grandTotal)}</p>
          </div>

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading income…
            </div>
          ) : (
            <>
              <div className="no-print" style={{ ...cardStyle, marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: COLOR.text }}>By Category</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {INCOME_CATEGORIES_V2.filter((c) => totalsByCategory[c] > 0).map((c) => (
                    <div key={c} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLOR.text, borderBottom: "1px solid #F1F2F4", paddingBottom: 4 }}>
                      <span>{INCOME_CATEGORY_V2_LABELS[c]}</span>
                      <span style={{ fontWeight: 700 }}>{formatMoney(totalsByCategory[c])}</span>
                    </div>
                  ))}
                  {Object.keys(totalsByCategory).length === 0 && (
                    <p style={{ fontSize: 12, color: COLOR.textSoft, margin: 0 }}>No income recorded yet.</p>
                  )}
                </div>
              </div>

              <div className="no-print" style={cardStyle}>
                <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: COLOR.text }}>Recent Entries</h2>
                {entries.length === 0 ? (
                  <p style={{ fontSize: 13, color: COLOR.textSoft, margin: 0 }}>No income entries yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {entries.slice(0, 30).map((entry) => (
                      <div key={entry.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #F1F2F4", paddingBottom: 10, opacity: entry.status === "cancelled" ? 0.55 : 1 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.text }}>
                            {INCOME_CATEGORY_V2_LABELS[entry.category]} — {formatMoney(entry.amount)}
                            {entry.status === "cancelled" && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: COLOR.redText, background: COLOR.redBg, padding: "2px 8px", borderRadius: 999 }}>CANCELLED</span>}
                          </div>
                          <div style={{ fontSize: 11, color: COLOR.textSoft }}>
                            {entry.receiptNumber} · {FUND_TYPE_LABELS[entry.fund]} · {entry.date} · {PAYMENT_METHOD_LABELS[entry.paymentMethod]}
                            {entry.contributorName ? " · " + entry.contributorName : ""}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setReceiptEntry(entry)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText, background: "transparent" }}>
                            Receipt
                          </button>
                          {entry.status === "active" && (
                            <button onClick={() => openCancelModal(entry)} style={{ ...btnBase, border: `1px solid ${COLOR.redText}`, color: COLOR.redText, background: "transparent" }}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="no-print" style={{ textAlign: "center", fontSize: 11, color: "#9AA5B4", marginTop: 40 }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>

        {/* Record Income modal */}
        {isModalOpen && (
          <div className="no-print" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>Record Income</h3>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as IncomeCategoryV2 })} style={inputStyle}>
                    {INCOME_CATEGORIES_V2.map((c) => <option key={c} value={c}>{INCOME_CATEGORY_V2_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fund</label>
                  <select value={form.fund} onChange={(e) => setForm({ ...form, fund: e.target.value as FundType })} style={inputStyle}>
                    {FIXED_FUND_TYPES.map((f) => <option key={f} value={f}>{FUND_TYPE_LABELS[f]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })} style={inputStyle}>
                    {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{PAYMENT_METHOD_LABELS[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Contributor (optional)</label>
                  <input type="text" value={form.contributorName} onChange={(e) => setForm({ ...form, contributorName: e.target.value })} style={inputStyle} placeholder="Optional" />
                </div>
                <div>
                  <label style={labelStyle}>Reference (optional)</label>
                  <input type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} style={inputStyle} placeholder="e.g. check number" />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563", background: "transparent" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel entry modal */}
        {cancelTarget && (
          <div className="no-print" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>Cancel Income Entry</h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: COLOR.textSoft }}>
                {cancelTarget.receiptNumber} · {formatMoney(cancelTarget.amount)} · {FUND_TYPE_LABELS[cancelTarget.fund]}
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: COLOR.redText, background: COLOR.redBg, padding: "8px 12px", borderRadius: 8 }}>
                This never deletes the record — it stays visible as "cancelled" and the fund balance is reversed, for full traceability.
              </p>
              <div>
                <label style={labelStyle}>Reason for cancellation</label>
                <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ ...inputStyle, resize: "vertical" }} rows={3} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={() => setCancelTarget(null)} disabled={cancelling} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563", background: "transparent" }}>Back</button>
                <button onClick={handleCancel} disabled={cancelling} style={{ ...btnBase, border: "none", background: COLOR.redText, color: "#FFFFFF", opacity: cancelling ? 0.5 : 1 }}>{cancelling ? "Cancelling…" : "Confirm Cancellation"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Printable receipt */}
        {receiptEntry && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 28 }}>
              <div style={{ textAlign: "center", marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${COLOR.gold}` }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: COLOR.text }}>{churchName || "Church"}</h2>
                <p style={{ margin: 0, fontSize: 12, color: COLOR.textSoft }}>Official Receipt</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: COLOR.text, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Receipt No.</span><strong>{receiptEntry.receiptNumber}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Date</span><strong>{receiptEntry.date}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Category</span><strong>{INCOME_CATEGORY_V2_LABELS[receiptEntry.category]}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Fund</span><strong>{FUND_TYPE_LABELS[receiptEntry.fund]}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment Method</span><strong>{PAYMENT_METHOD_LABELS[receiptEntry.paymentMethod]}</strong></div>
                {receiptEntry.contributorName && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Contributor</span><strong>{receiptEntry.contributorName}</strong></div>}
                {receiptEntry.description && <div><span style={{ display: "block", marginBottom: 4 }}>Description</span><span>{receiptEntry.description}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLOR.border}` }}>
                  <span>Amount</span><span>{formatMoney(receiptEntry.amount)}</span>
                </div>
              </div>
              <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setReceiptEntry(null)} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563", background: "transparent" }}>Close</button>
                <button onClick={() => window.print()} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text }}>Print</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
