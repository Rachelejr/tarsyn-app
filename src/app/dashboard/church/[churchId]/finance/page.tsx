"use client";

// src/app/dashboard/church/[churchId]/finance/page.tsx
//
// Church accounting system.
//  - Income recorded per category (Tithe, Offering, Donation, Collection,
//    Seed, Other) — each with its own running total, plus a Grand Total.
//  - Two separate funds, each with its own balance:
//      - Operating Fund ("Petite Caisse") — covers day-to-day church
//        activity expenses.
//      - Social Fund — dedicated to social/benevolence work, kept
//        completely separate from the operating fund.
//  - A fund's balance = money allocated to it (from the general income
//    pool) minus its own expenses. The "Unallocated" balance is whatever
//    hasn't yet been moved into either fund.
//  - Every number here is real Firestore data — no fake/mock figures.
//  - Styled with the same pastel palette and single-line inline style
//    objects as the rest of the Church module (avoids the Turbopack
//    parsing issue seen earlier with multi-line style objects).

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import type {
  IncomeEntry,
  FundAllocation,
  ExpenseEntry,
  IncomeCategory,
  FundKey,
  IncomeFormValues,
  AllocationFormValues,
  ExpenseFormValues,
} from "@/types/finance";
import { INCOME_CATEGORIES, INCOME_CATEGORY_LABELS, FUND_LABELS } from "@/types/finance";

const COLOR = {
  pink: "#FDE2E4",
  cream: "#F6EFDD",
  green: "#E2F0CB",
  gold: "#D8B15A",
  goldText: "#8A6D1F",
  text: "#24324A",
  textSoft: "#68758A",
  redBorder: "#E7A9A9",
  redText: "#B4453E",
  redBg: "#FDECEC",
  border: "rgba(216,177,90,0.35)",
  greenText: "#3F6B34",
};

function formatMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type ModalMode = null | "income" | "allocate-operating" | "allocate-social" | "expense-operating" | "expense-social";

export default function FinancePage() {
  const params = useParams();
  const churchId = params?.churchId as string;

  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [allocations, setAllocations] = useState<FundAllocation[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [incomeForm, setIncomeForm] = useState<IncomeFormValues>({ category: "tithe", amount: "", note: "" });
  const [allocationForm, setAllocationForm] = useState<AllocationFormValues>({ fund: "operating", amount: "", note: "" });
  const [expenseForm, setExpenseForm] = useState<ExpenseFormValues>({ fund: "operating", category: "", amount: "", description: "" });

  const organizerId = auth.currentUser?.uid ?? null;

  useEffect(() => {
    if (!churchId) return;
    const q = collection(db, "churches", churchId, "income");
    const unsub = onSnapshot(q, (snap) => {
      const rows: IncomeEntry[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IncomeEntry, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setIncome(rows);
      setLoading(false);
    }, (err) => { console.error(err); setError("Unable to load income data."); setLoading(false); });
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = collection(db, "churches", churchId, "fundAllocations");
    const unsub = onSnapshot(q, (snap) => {
      const rows: FundAllocation[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FundAllocation, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setAllocations(rows);
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = collection(db, "churches", churchId, "expenses");
    const unsub = onSnapshot(q, (snap) => {
      const rows: ExpenseEntry[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpenseEntry, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setExpenses(rows);
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  const totalsByCategory = useMemo(() => {
    const totals: Record<IncomeCategory, number> = { tithe: 0, offering: 0, donation: 0, collection: 0, seed: 0, other: 0 };
    income.forEach((i) => { totals[i.category] = (totals[i.category] || 0) + i.amount; });
    return totals;
  }, [income]);

  const grandTotalIncome = useMemo(() => income.reduce((sum, i) => sum + i.amount, 0), [income]);
  const totalAllocated = useMemo(() => allocations.reduce((sum, a) => sum + a.amount, 0), [allocations]);
  const unallocated = grandTotalIncome - totalAllocated;

  function fundBalance(fund: FundKey): number {
    const allocated = allocations.filter((a) => a.fund === fund).reduce((sum, a) => sum + a.amount, 0);
    const spent = expenses.filter((e) => e.fund === fund).reduce((sum, e) => sum + e.amount, 0);
    return allocated - spent;
  }

  function fundTransactions(fund: FundKey) {
    const allocRows = allocations.filter((a) => a.fund === fund).map((a) => ({ id: a.id, kind: "allocation" as const, amount: a.amount, note: a.note, createdAt: a.createdAt }));
    const expRows = expenses.filter((e) => e.fund === fund).map((e) => ({ id: e.id, kind: "expense" as const, amount: e.amount, note: e.category + (e.description ? " — " + e.description : ""), createdAt: e.createdAt }));
    return [...allocRows, ...expRows].sort((a, b) => b.createdAt - a.createdAt);
  }

  function closeModal() {
    if (saving) return;
    setModalMode(null);
    setError(null);
  }

  async function handleAddIncome() {
    if (!organizerId || !churchId) return;
    const amountNum = parseFloat(incomeForm.amount);
    if (!amountNum || amountNum <= 0) { setError("Amount must be greater than zero."); return; }
    setSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, "churches", churchId, "income"), {
        organizerId, churchId,
        category: incomeForm.category,
        amount: amountNum,
        note: incomeForm.note.trim(),
        createdAt: Date.now(),
      });
      setIncomeForm({ category: "tithe", amount: "", note: "" });
      setModalMode(null);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAllocate(fund: FundKey) {
    if (!organizerId || !churchId) return;
    const amountNum = parseFloat(allocationForm.amount);
    if (!amountNum || amountNum <= 0) { setError("Amount must be greater than zero."); return; }
    if (amountNum > unallocated) { setError(`Only ${formatMoney(unallocated)} is unallocated right now.`); return; }
    setSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, "churches", churchId, "fundAllocations"), {
        organizerId, churchId, fund,
        amount: amountNum,
        note: allocationForm.note.trim(),
        createdAt: Date.now(),
      });
      setAllocationForm({ fund: "operating", amount: "", note: "" });
      setModalMode(null);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddExpense(fund: FundKey) {
    if (!organizerId || !churchId) return;
    const amountNum = parseFloat(expenseForm.amount);
    if (!amountNum || amountNum <= 0) { setError("Amount must be greater than zero."); return; }
    if (!expenseForm.category.trim()) { setError("Category is required."); return; }
    const balance = fundBalance(fund);
    if (amountNum > balance) { setError(`This fund only has ${formatMoney(balance)} available.`); return; }
    setSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, "churches", churchId, "expenses"), {
        organizerId, churchId, fund,
        category: expenseForm.category.trim(),
        amount: amountNum,
        description: expenseForm.description.trim(),
        createdAt: Date.now(),
      });
      setExpenseForm({ fund: "operating", category: "", amount: "", description: "" });
      setModalMode(null);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const btnBase: CSSProperties = { borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "transparent" };
  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 8, padding: "9px 10px", fontSize: 13 };
  const labelStyle: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: COLOR.text, marginBottom: 4 };
  const cardStyle: CSSProperties = { borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 20, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` };

  function FundCard({ fund }: { fund: FundKey }) {
    const balance = fundBalance(fund);
    const txns = fundTransactions(fund);
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLOR.text }}>{FUND_LABELS[fund]}</h2>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 24, fontWeight: 800, color: balance >= 0 ? COLOR.greenText : COLOR.redText }}>{formatMoney(balance)}</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setModalMode(fund === "operating" ? "allocate-operating" : "allocate-social")} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>
            + Allocate Funds
          </button>
          <button onClick={() => setModalMode(fund === "operating" ? "expense-operating" : "expense-social")} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>
            + Record Expense
          </button>
        </div>
        {txns.length === 0 ? (
          <p style={{ fontSize: 12, color: COLOR.textSoft, margin: 0 }}>No transactions yet for this fund.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {txns.map((t) => (
              <div key={t.kind + t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLOR.text, borderBottom: "1px solid #F1F2F4", paddingBottom: 6 }}>
                <span>
                  <span style={{ fontWeight: 700, color: t.kind === "allocation" ? COLOR.greenText : COLOR.redText }}>
                    {t.kind === "allocation" ? "+" : "-"}{formatMoney(t.amount)}
                  </span>
                  {" — "}{t.note || (t.kind === "allocation" ? "Allocation" : "Expense")}
                </span>
                <span style={{ color: COLOR.textSoft, whiteSpace: "nowrap", marginLeft: 8 }}>{formatDate(t.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ChurchSidebar churchId={churchId} />
      <div style={{ flex: 1, minHeight: "100vh", padding: 24, boxSizing: "border-box", background: `linear-gradient(120deg, ${COLOR.pink} 0%, ${COLOR.cream} 55%, ${COLOR.green} 100%)`, backgroundAttachment: "fixed" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <ChurchPageHeader
            churchId={churchId}
            title="Finance"
            subtitle="Track every category of income, plus the Operating and Social funds, all separately."
            actions={
              <button onClick={() => setModalMode("income")} style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}>
                + Record Income
              </button>
            }
          />

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading finance data…
            </div>
          ) : (
            <>
              {/* Overview */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
                <div style={cardStyle}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Grand Total Income</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLOR.text }}>{formatMoney(grandTotalIncome)}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Unallocated</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLOR.text }}>{formatMoney(unallocated)}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Operating Fund</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLOR.text }}>{formatMoney(fundBalance("operating"))}</p>
                </div>
                <div style={cardStyle}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Social Fund</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLOR.text }}>{formatMoney(fundBalance("social"))}</p>
                </div>
              </div>

              {/* Income by category */}
              <div style={{ ...cardStyle, marginBottom: 24 }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: COLOR.text }}>Income by Category</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {INCOME_CATEGORIES.map((cat) => (
                    <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLOR.text, borderBottom: "1px solid #F1F2F4", paddingBottom: 6 }}>
                      <span>{INCOME_CATEGORY_LABELS[cat]}</span>
                      <span style={{ fontWeight: 700 }}>{formatMoney(totalsByCategory[cat] || 0)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: COLOR.text }}>
                  <span>Grand Total</span>
                  <span>{formatMoney(grandTotalIncome)}</span>
                </div>

                {income.length > 0 && (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${COLOR.border}` }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Recent Entries</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                      {income.slice(0, 12).map((i) => (
                        <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLOR.text }}>
                          <span>{INCOME_CATEGORY_LABELS[i.category]}{i.note ? " — " + i.note : ""}</span>
                          <span style={{ display: "flex", gap: 10 }}>
                            <span style={{ fontWeight: 700 }}>{formatMoney(i.amount)}</span>
                            <span style={{ color: COLOR.textSoft }}>{formatDate(i.createdAt)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Two funds */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                <FundCard fund="operating" />
                <FundCard fund="social" />
              </div>
            </>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: "#9AA5B4", marginTop: 40 }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>

        {modalMode === "income" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>Record Income</h3>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={incomeForm.category} onChange={(e) => setIncomeForm({ ...incomeForm, category: e.target.value as IncomeCategory })} style={inputStyle}>
                    {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{INCOME_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount</label>
                  <input type="number" min="0" step="0.01" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Note</label>
                  <input type="text" value={incomeForm.note} onChange={(e) => setIncomeForm({ ...incomeForm, note: e.target.value })} style={inputStyle} placeholder="e.g. Sunday service collection" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>Cancel</button>
                <button onClick={handleAddIncome} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}

        {(modalMode === "allocate-operating" || modalMode === "allocate-social") && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>
                Allocate to {FUND_LABELS[modalMode === "allocate-operating" ? "operating" : "social"]}
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: COLOR.textSoft }}>{formatMoney(unallocated)} unallocated right now.</p>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Amount</label>
                  <input type="number" min="0" step="0.01" value={allocationForm.amount} onChange={(e) => setAllocationForm({ ...allocationForm, amount: e.target.value })} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Note</label>
                  <input type="text" value={allocationForm.note} onChange={(e) => setAllocationForm({ ...allocationForm, note: e.target.value })} style={inputStyle} placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>Cancel</button>
                <button onClick={() => handleAllocate(modalMode === "allocate-operating" ? "operating" : "social")} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Allocate"}</button>
              </div>
            </div>
          </div>
        )}

        {(modalMode === "expense-operating" || modalMode === "expense-social") && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>
                Record Expense — {FUND_LABELS[modalMode === "expense-operating" ? "operating" : "social"]}
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: COLOR.textSoft }}>
                {formatMoney(fundBalance(modalMode === "expense-operating" ? "operating" : "social"))} available in this fund.
              </p>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input type="text" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} style={inputStyle} placeholder="e.g. Electricity, Food baskets" />
                </div>
                <div>
                  <label style={labelStyle}>Amount</label>
                  <input type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input type="text" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} style={inputStyle} placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>Cancel</button>
                <button onClick={() => handleAddExpense(modalMode === "expense-operating" ? "operating" : "social")} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
