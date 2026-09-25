"use client";

// src/app/dashboard/church/[churchId]/funds/page.tsx
//
// Phase 1 of the full accounting system: Funds + Transfers.
//  - Seeds the 9 fixed funds (General, Social, Missions, Evangelism,
//    Construction, Youth, Children, Special, Petty Cash) the first time
//    this page loads for a church, each starting at $0.00.
//  - "Transfer Funds" moves money from Bank (an external, untracked
//    source — the church's real bank account) into a fund, or between two
//    funds. This is NEVER counted as income — it's tracked separately in
//    fundTransfers, and every balance change happens inside a single
//    Firestore transaction so two transfers can never corrupt each
//    other's numbers.
//  - Petty Cash (Petite Caisse) is just fund type 'cashBox' here — same
//    balance/transfer machinery as every other fund.

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import type { Fund, FundTransfer, FundType, TransferParty, TransferFormValues } from "@/types/financeV2";
import { FIXED_FUND_TYPES, FUND_TYPE_LABELS } from "@/types/financeV2";

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

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " " + new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function FundsPage() {
  const params = useParams();
  const churchId = params?.churchId as string;
  const organizerId = auth.currentUser?.uid ?? null;

  const [funds, setFunds] = useState<Fund[]>([]);
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TransferFormValues>({ fromFund: "bank", toFund: "general", amount: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the 9 fixed funds once, if they don't already exist.
  useEffect(() => {
    if (!churchId || !organizerId) return;
    (async () => {
      setSeeding(true);
      try {
        for (const type of FIXED_FUND_TYPES) {
          const ref = doc(db, "churches", churchId, "funds", type);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, {
              organizerId,
              churchId,
              type,
              name: FUND_TYPE_LABELS[type],
              balance: 0,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }
        }
      } catch (err) {
        console.error("Failed to seed funds:", err);
      } finally {
        setSeeding(false);
      }
    })();
  }, [churchId, organizerId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "funds"), (snap) => {
      const rows: Fund[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Fund, "id">) }));
      const order = FIXED_FUND_TYPES;
      rows.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
      setFunds(rows);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "fundTransfers"), (snap) => {
      const rows: FundTransfer[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FundTransfer, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setTransfers(rows);
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  const totalBalance = useMemo(() => funds.reduce((sum, f) => sum + f.balance, 0), [funds]);

  function transfersForFund(type: FundType) {
    return transfers.filter((t) => t.fromFund === type || t.toFund === type).slice(0, 8);
  }

  function openTransferModal(toFund?: FundType) {
    setForm({ fromFund: "bank", toFund: toFund || "general", amount: "", reason: "" });
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
  }

  async function handleTransfer() {
    if (!organizerId || !churchId) return;
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0) { setError("Amount must be greater than zero."); return; }
    if (form.fromFund === form.toFund) { setError("Choose two different funds — a fund can't transfer to itself."); return; }

    setSaving(true);
    setError(null);

    try {
      await runTransaction(db, async (tx) => {
        const toRef = doc(db, "churches", churchId, "funds", form.toFund);
        const toSnap = await tx.get(toRef);
        if (!toSnap.exists()) throw new Error("Destination fund not found.");

        let fromRef = null;
        let fromSnap = null;
        if (form.fromFund !== "bank") {
          fromRef = doc(db, "churches", churchId, "funds", form.fromFund);
          fromSnap = await tx.get(fromRef);
          if (!fromSnap.exists()) throw new Error("Source fund not found.");
          const fromBalance = (fromSnap.data().balance as number) || 0;
          if (fromBalance < amountNum) throw new Error(`Insufficient balance in ${FUND_TYPE_LABELS[form.fromFund as FundType]} (available: ${formatMoney(fromBalance)}).`);
        }

        const toBalance = (toSnap.data().balance as number) || 0;

        if (fromRef && fromSnap) {
          const fromBalance = (fromSnap.data().balance as number) || 0;
          tx.update(fromRef, { balance: fromBalance - amountNum, updatedAt: Date.now() });
        }
        tx.update(toRef, { balance: toBalance + amountNum, updatedAt: Date.now() });

        const transferRef = doc(collection(db, "churches", churchId, "fundTransfers"));
        tx.set(transferRef, {
          organizerId,
          churchId,
          fromFund: form.fromFund,
          toFund: form.toFund,
          amount: amountNum,
          reason: form.reason.trim(),
          recordedBy: auth.currentUser?.email || "",
          createdAt: Date.now(),
        });
      });

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong while transferring. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const btnBase: CSSProperties = { borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "transparent" };
  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 8, padding: "9px 10px", fontSize: 13 };
  const labelStyle: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: COLOR.text, marginBottom: 4 };
  const cardStyle: CSSProperties = { borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 18, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` };

  const partyLabel = (p: TransferParty) => (p === "bank" ? "Bank" : FUND_TYPE_LABELS[p as FundType]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ChurchSidebar churchId={churchId} />
      <div style={{ flex: 1, minHeight: "100vh", padding: 24, boxSizing: "border-box", background: `linear-gradient(120deg, ${COLOR.pink} 0%, ${COLOR.cream} 55%, ${COLOR.green} 100%)`, backgroundAttachment: "fixed" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <ChurchPageHeader
            churchId={churchId}
            title="Funds"
            subtitle="Every fund kept separate, with its own balance and full transfer history."
            actions={
              <button onClick={() => openTransferModal()} style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}>
                + Transfer Funds
              </button>
            }
          />

          <div style={{ ...cardStyle, marginBottom: 20, textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: COLOR.textSoft, textTransform: "uppercase" }}>Total Across All Funds</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: COLOR.text }}>{formatMoney(totalBalance)}</p>
          </div>

          {loading || seeding ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              {seeding ? "Setting up funds…" : "Loading funds…"}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {funds.map((fund) => {
                const history = transfersForFund(fund.type);
                return (
                  <div key={fund.id} style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: COLOR.text }}>{fund.name}</h2>
                      <button onClick={() => openTransferModal(fund.type)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText, padding: "3px 9px", fontSize: 11 }}>
                        Transfer
                      </button>
                    </div>
                    <p style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: fund.balance >= 0 ? COLOR.greenText : COLOR.redText }}>
                      {formatMoney(fund.balance)}
                    </p>
                    {history.length === 0 ? (
                      <p style={{ fontSize: 11, color: COLOR.textSoft, margin: 0 }}>No transfers yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {history.map((t) => {
                          const isIn = t.toFund === fund.type;
                          return (
                            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLOR.text, borderBottom: "1px solid #F1F2F4", paddingBottom: 4 }}>
                              <span>
                                <span style={{ fontWeight: 700, color: isIn ? COLOR.greenText : COLOR.redText }}>
                                  {isIn ? "+" : "-"}{formatMoney(t.amount)}
                                </span>
                                {" "}{isIn ? "from" : "to"} {partyLabel(isIn ? t.fromFund : t.toFund)}
                              </span>
                              <span style={{ color: COLOR.textSoft, whiteSpace: "nowrap", marginLeft: 6 }}>{formatDateTime(t.createdAt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: "#9AA5B4", marginTop: 40 }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>

        {isModalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>Transfer Funds</h3>
              <p style={{ margin: "0 0 16px", fontSize: 11, color: COLOR.textSoft }}>Never counted as income — tracked separately.</p>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>From</label>
                  <select value={form.fromFund} onChange={(e) => setForm({ ...form, fromFund: e.target.value as TransferParty })} style={inputStyle}>
                    <option value="bank">Bank (external)</option>
                    {FIXED_FUND_TYPES.map((t) => <option key={t} value={t}>{FUND_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>To</label>
                  <select value={form.toFund} onChange={(e) => setForm({ ...form, toFund: e.target.value as FundType })} style={inputStyle}>
                    {FIXED_FUND_TYPES.map((t) => <option key={t} value={t}>{FUND_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Reason</label>
                  <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={inputStyle} placeholder="Optional" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>Cancel</button>
                <button onClick={handleTransfer} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Transferring…" : "Transfer"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
