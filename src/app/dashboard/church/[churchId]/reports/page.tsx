"use client";

// src/app/dashboard/church/[churchId]/reports/page.tsx
//
// General reporting on top of the Finance data (churches/{churchId}/income
// and churches/{churchId}/expenses):
//  - Pick a period: This Week, This Month, or a Custom date range.
//  - Income broken down by category, Expenses broken down by category
//    across both funds, a Net figure.
//  - "Print Report" — browser print dialog (Save as PDF works from there).
//  - "Send to HR" — auto-fills a text summary of the current period's
//    figures and submits it into churches/{churchId}/departmentReports
//    (department: "Finance"), the same place every Ministry's "Monthly
//    Report" button writes to. The Human Resources page reads from there,
//    so the report shows up automatically for whoever manages HR — no
//    separate email step needed.

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import SubmitDepartmentReport from "@/components/church/SubmitDepartmentReport";
import type { IncomeEntry, ExpenseEntry, IncomeCategory, FundKey } from "@/types/finance";
import { INCOME_CATEGORIES, INCOME_CATEGORY_LABELS, FUND_LABELS } from "@/types/finance";

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
};

type Period = "week" | "month" | "custom";

function formatMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

export default function ReportsPage() {
  const params = useParams();
  const churchId = params?.churchId as string;

  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const now = Date.now();
  const [period, setPeriod] = useState<Period>("week");
  const [customStart, setCustomStart] = useState<string>(toDateInputValue(now - 7 * 24 * 60 * 60 * 1000));
  const [customEnd, setCustomEnd] = useState<string>(toDateInputValue(now));

  useEffect(() => {
    if (!churchId) return;
    const q = collection(db, "churches", churchId, "income");
    const unsub = onSnapshot(q, (snap) => {
      setIncome(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<IncomeEntry, "id">) })));
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const q = collection(db, "churches", churchId, "expenses");
    const unsub = onSnapshot(q, (snap) => {
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpenseEntry, "id">) })));
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    if (period === "week") {
      const end = now;
      const start = now - 7 * 24 * 60 * 60 * 1000;
      return { rangeStart: start, rangeEnd: end, rangeLabel: "This Week (last 7 days)" };
    }
    if (period === "month") {
      const d = new Date(now);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      return { rangeStart: start, rangeEnd: now, rangeLabel: "This Month" };
    }
    const start = new Date(customStart + "T00:00:00").getTime();
    const end = new Date(customEnd + "T23:59:59").getTime();
    return { rangeStart: start, rangeEnd: end, rangeLabel: "Custom Range" };
  }, [period, customStart, customEnd, now]);

  const incomeInRange = useMemo(
    () => income.filter((i) => i.createdAt >= rangeStart && i.createdAt <= rangeEnd),
    [income, rangeStart, rangeEnd]
  );
  const expensesInRange = useMemo(
    () => expenses.filter((e) => e.createdAt >= rangeStart && e.createdAt <= rangeEnd),
    [expenses, rangeStart, rangeEnd]
  );

  const incomeByCategory = useMemo(() => {
    const totals: Record<IncomeCategory, number> = { tithe: 0, offering: 0, donation: 0, collection: 0, seed: 0, other: 0 };
    incomeInRange.forEach((i) => { totals[i.category] = (totals[i.category] || 0) + i.amount; });
    return totals;
  }, [incomeInRange]);

  const totalIncome = useMemo(() => incomeInRange.reduce((sum, i) => sum + i.amount, 0), [incomeInRange]);

  const expensesByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    expensesInRange.forEach((e) => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expensesInRange]);

  const totalExpenses = useMemo(() => expensesInRange.reduce((sum, e) => sum + e.amount, 0), [expensesInRange]);

  const expensesByFund = useMemo(() => {
    const totals: Record<FundKey, number> = { operating: 0, social: 0 };
    expensesInRange.forEach((e) => { totals[e.fund] = (totals[e.fund] || 0) + e.amount; });
    return totals;
  }, [expensesInRange]);

  const net = totalIncome - totalExpenses;

  // Plain-text version of the report, pre-filled into the "Send to HR" modal
  // so nobody has to retype numbers that already exist on this page.
  const reportSummaryText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Financial Report — ${rangeLabel} (${formatDate(rangeStart)} to ${formatDate(rangeEnd)})`);
    lines.push("");
    lines.push("Income by category:");
    INCOME_CATEGORIES.filter((cat) => incomeByCategory[cat] > 0).forEach((cat) => {
      lines.push(`- ${INCOME_CATEGORY_LABELS[cat]}: ${formatMoney(incomeByCategory[cat])}`);
    });
    lines.push(`Total Income: ${formatMoney(totalIncome)}`);
    lines.push("");
    lines.push("Expenses by category:");
    expensesByCategory.forEach(([cat, amount]) => {
      lines.push(`- ${cat}: ${formatMoney(amount)}`);
    });
    lines.push(`Total Expenses: ${formatMoney(totalExpenses)}`);
    lines.push("");
    lines.push(`Net: ${formatMoney(net)}`);
    return lines.join("\n");
  }, [rangeLabel, rangeStart, rangeEnd, incomeByCategory, totalIncome, expensesByCategory, totalExpenses, net]);

  const btnBase: CSSProperties = { borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
  const cardStyle: CSSProperties = { borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 20, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` };
  const inputStyle: CSSProperties = { border: "1px solid #D1D5DB", borderRadius: 8, padding: "8px 10px", fontSize: 13 };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{`@media print { .no-print { display: none !important; } .print-page { background: #FFFFFF !important; padding: 0 !important; } .print-card { box-shadow: none !important; border: 1px solid #ccc !important; } }`}</style>

      <div className="no-print">
        <ChurchSidebar churchId={churchId} />
      </div>

      <div className="print-page" style={{ flex: 1, minHeight: "100vh", padding: 24, boxSizing: "border-box", background: `linear-gradient(120deg, ${COLOR.pink} 0%, ${COLOR.cream} 55%, ${COLOR.green} 100%)`, backgroundAttachment: "fixed" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="no-print">
            <ChurchPageHeader
              churchId={churchId}
              title="Reports"
              subtitle="Detailed income and expenses by category, ready for a weekly or monthly review."
              actions={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  <button onClick={() => window.print()} style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}>
                    Print Report
                  </button>
                  <SubmitDepartmentReport
                    churchId={churchId}
                    departmentName="Finance"
                    initialSummary={reportSummaryText}
                    buttonLabel="📤 Send to HR"
                  />
                </div>
              }
            />
          </div>

          {/* Period selector */}
          <div className="no-print" style={{ ...cardStyle, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.textSoft }}>Period:</span>
            <button onClick={() => setPeriod("week")} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, background: period === "week" ? COLOR.gold : "transparent", color: period === "week" ? COLOR.text : COLOR.goldText }}>
              This Week
            </button>
            <button onClick={() => setPeriod("month")} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, background: period === "month" ? COLOR.gold : "transparent", color: period === "month" ? COLOR.text : COLOR.goldText }}>
              This Month
            </button>
            <button onClick={() => setPeriod("custom")} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, background: period === "custom" ? COLOR.gold : "transparent", color: period === "custom" ? COLOR.text : COLOR.goldText }}>
              Custom Range
            </button>
            {period === "custom" && (
              <>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={inputStyle} />
                <span style={{ color: COLOR.textSoft, fontSize: 12 }}>to</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={inputStyle} />
              </>
            )}
          </div>

          {/* Report title for print */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: COLOR.text }}>Financial Report</h1>
            <p style={{ margin: 0, fontSize: 13, color: COLOR.textSoft }}>
              {rangeLabel} — {formatDate(rangeStart)} to {formatDate(rangeEnd)}
            </p>
          </div>

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading report data…
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
                <div className="print-card" style={cardStyle}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Total Income</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLOR.greenText }}>{formatMoney(totalIncome)}</p>
                </div>
                <div className="print-card" style={cardStyle}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Total Expenses</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLOR.redText }}>{formatMoney(totalExpenses)}</p>
                </div>
                <div className="print-card" style={cardStyle}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Net</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: net >= 0 ? COLOR.greenText : COLOR.redText }}>{formatMoney(net)}</p>
                </div>
              </div>

              {/* Income by category */}
              <div className="print-card" style={{ ...cardStyle, marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: COLOR.text }}>Income by Category</h2>
                {incomeInRange.length === 0 ? (
                  <p style={{ fontSize: 13, color: COLOR.textSoft, margin: 0 }}>No income recorded in this period.</p>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {INCOME_CATEGORIES.filter((cat) => incomeByCategory[cat] > 0).map((cat) => (
                        <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLOR.text, borderBottom: "1px solid #F1F2F4", paddingBottom: 6 }}>
                          <span>{INCOME_CATEGORY_LABELS[cat]}</span>
                          <span style={{ fontWeight: 700 }}>{formatMoney(incomeByCategory[cat])}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: COLOR.text }}>
                      <span>Total Income</span>
                      <span>{formatMoney(totalIncome)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Expenses by category, across all funds */}
              <div className="print-card" style={{ ...cardStyle, marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: COLOR.text }}>Expenses by Category</h2>
                <p style={{ margin: "0 0 14px", fontSize: 11, color: COLOR.textSoft }}>Combined across all domains (Operating and Social funds).</p>
                {expensesInRange.length === 0 ? (
                  <p style={{ fontSize: 13, color: COLOR.textSoft, margin: 0 }}>No expenses recorded in this period.</p>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {expensesByCategory.map(([cat, amount]) => (
                        <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLOR.text, borderBottom: "1px solid #F1F2F4", paddingBottom: 6 }}>
                          <span>{cat}</span>
                          <span style={{ fontWeight: 700 }}>{formatMoney(amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: COLOR.text, marginBottom: 16 }}>
                      <span>Total Expenses</span>
                      <span>{formatMoney(totalExpenses)}</span>
                    </div>

                    <div style={{ paddingTop: 14, borderTop: `1px solid ${COLOR.border}` }}>
                      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>By Fund</p>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLOR.text, marginBottom: 4 }}>
                        <span>{FUND_LABELS.operating}</span>
                        <span style={{ fontWeight: 700 }}>{formatMoney(expensesByFund.operating)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLOR.text }}>
                        <span>{FUND_LABELS.social}</span>
                        <span style={{ fontWeight: 700 }}>{formatMoney(expensesByFund.social)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: "#9AA5B4", marginTop: 40 }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
}
