"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Member {
  id: string;
  tynId: string;
  name: string;
  email?: string;
  position: number;
  status: "active" | "inactive" | "pending";
  hasReceived: boolean;
  score: number;
}

interface Payment {
  id: string;
  memberId: string;
  tynId: string;
  memberName: string;
  amount: number;
  currency: string;
  method: string;
  cycleNumber: number;
  date: string;
}

interface Props {
  groupId: string;
  groupName: string;
  currency: string;
  contributionAmount: number;
  cycleNumber: number;
  cycleDueDate: string;
}

type Tab = "rotation" | "reminders" | "reports";

export default function TarsynHandlesRest({ groupId, groupName, currency, contributionAmount, cycleNumber, cycleDueDate }: Props) {
  const [tab, setTab] = useState<Tab>("rotation");
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({});

  const daysLeft = Math.ceil((new Date(cycleDueDate).getTime() - Date.now()) / 86400000);

  useEffect(() => {
    async function load() {
      const mSnap = await getDocs(query(collection(db, "groups", groupId, "members"), orderBy("position")));
      const pSnap = await getDocs(query(collection(db, "payments"), where("groupId", "==", groupId)));
      setMembers(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Member[]);
      setPayments(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]);
      setLoading(false);
    }
    load();
  }, [groupId]);

  const cyclePayments = payments.filter((p) => p.cycleNumber === cycleNumber);
  const totalCollected = cyclePayments.reduce((s, p) => s + p.amount, 0);
  const activeMembers = members.filter((m) => m.status === "active");
  const expected = activeMembers.length * contributionAmount;
  const pct = expected > 0 ? Math.min(100, Math.round((totalCollected / expected) * 100)) : 0;
  const nextRecipient = members.filter((m) => !m.hasReceived && m.status === "active").sort((a, b) => a.position - b.position)[0];
  const unpaid = activeMembers.filter((m) => !cyclePayments.find((p) => p.memberId === m.id));

  async function markPaid(memberId: string) {
    await updateDoc(doc(db, "groups", groupId, "members", memberId), { hasReceived: true });
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, hasReceived: true } : m));
  }

  async function sendReminder(memberId: string, name: string, tynId: string, email?: string) {
    if (!email) return;
    setReminderStatus((s) => ({ ...s, [memberId]: "sending" }));
    const res = await fetch("/api/send-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: email, memberName: name, tynId, groupName, amount: contributionAmount, currency, cycleNumber, daysLeft }),
    });
    setReminderStatus((s) => ({ ...s, [memberId]: res.ok ? "sent" : "error" }));
  }

  function exportCSV() {
    const rows = [["Receipt", "TYN-ID", "Name", "Amount", "Currency", "Method", "Cycle", "Date"],
      ...payments.map((p) => [p.tynId, p.memberName, p.amount, p.currency, p.method, p.cycleNumber, p.date])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `tarsyn-cycle${cycleNumber}.csv`; a.click();
  }

  if (loading) return <div className="text-center py-20 text-[#6B2D4E]/40">Loading...</div>;

  return (
    <div className="bg-[#FAF0E6] rounded-2xl border border-[#D9C0CC] shadow-lg overflow-hidden max-w-2xl mx-auto">
      <div className="bg-[#6B2D4E] px-8 py-5 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white">TARSYN Handles the Rest</h2>
          <p className="text-sm text-white/50 mt-0.5">{groupName} · Cycle #{cycleNumber}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${daysLeft <= 3 ? "bg-red-500 text-white" : daysLeft <= 7 ? "bg-yellow-400 text-yellow-900" : "bg-[#D4AF7A]/30 text-[#D4AF7A]"}`}>
          {daysLeft > 0 ? `D-${daysLeft}` : "Due Today"}
        </span>
      </div>

      <div className="px-8 py-4 bg-white border-b border-[#EDD9E5]">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#6B2D4E]/60">Cycle #{cycleNumber} collection</span>
          <span className="font-bold text-[#6B2D4E]">{totalCollected.toLocaleString()} / {expected.toLocaleString()} {currency}</span>
        </div>
        <div className="h-2.5 rounded-full bg-[#EDD9E5]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#6B2D4E] to-[#D4AF7A] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-right mt-1 text-[#6B2D4E]/40">{pct}% · {unpaid.length} pending</p>
      </div>

      <div className="flex bg-white border-b border-[#EDD9E5]">
        {(["rotation", "reminders", "reports"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-semibold capitalize transition ${tab === t ? "text-[#6B2D4E] border-b-2 border-[#6B2D4E]" : "text-[#6B2D4E]/40 hover:text-[#6B2D4E]/70"}`}>
            {t === "rotation" ? "🔄 Rotation" : t === "reminders" ? `🔔 Reminders${unpaid.length > 0 ? ` (${unpaid.length})` : ""}` : "📊 Reports"}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "rotation" && (
          <div className="space-y-4">
            {nextRecipient && (
              <div className="rounded-xl bg-[#6B2D4E]/5 border border-[#6B2D4E]/15 p-5">
                <p className="text-xs text-[#6B2D4E]/50 uppercase tracking-wider font-bold mb-3">Next Recipient</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#6B2D4E] flex items-center justify-center text-white font-bold text-lg">{nextRecipient.position}</div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-[#6B2D4E]">{nextRecipient.name}</p>
                    <p className="text-sm text-[#6B2D4E]/50">{nextRecipient.tynId}</p>
                  </div>
                  <p className="text-xl font-bold text-[#D4AF7A]">{expected.toLocaleString()} {currency}</p>
                </div>
                <button onClick={() => markPaid(nextRecipient.id)} className="mt-4 w-full py-2.5 rounded-xl bg-[#6B2D4E] text-white font-bold text-sm hover:bg-[#5a2540] transition">
                  ✓ Confirm Payout
                </button>
              </div>
            )}
            <div className="space-y-2">
              {members.filter((m) => m.status === "active").sort((a, b) => a.position - b.position).map((m) => {
                const paid = !!cyclePayments.find((p) => p.memberId === m.id);
                const isNext = nextRecipient?.id === m.id;
                return (
                  <div key={m.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${m.hasReceived ? "opacity-50 bg-[#EDD9E5]/40 border-[#D9C0CC]/40" : isNext ? "bg-[#6B2D4E]/5 border-[#6B2D4E]/20" : "bg-white border-[#D9C0CC]/60"}`}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isNext ? "bg-[#6B2D4E] text-white" : m.hasReceived ? "bg-[#D4AF7A] text-white" : "bg-[#EDD9E5] text-[#6B2D4E]"}`}>{m.position}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-[#6B2D4E] text-sm">{m.name}</p>
                      <p className="text-xs text-[#6B2D4E]/40">{m.tynId}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${m.score >= 80 ? "bg-green-50 text-green-600" : m.score >= 60 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-600"}`}>{m.score}</span>
                    {m.hasReceived ? <span className="text-xs text-[#D4AF7A] font-bold">✓ Received</span> : paid ? <span className="text-xs text-green-600 font-bold">✓ Paid</span> : isNext ? <span className="text-xs bg-[#6B2D4E] text-white px-2 py-0.5 rounded-full font-bold">Next</span> : <span className="text-xs text-[#6B2D4E]/30">Pending</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "reminders" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-bold text-[#6B2D4E]">{unpaid.length} member{unpaid.length !== 1 ? "s" : ""} haven't paid</p>
              {unpaid.length > 0 && <button onClick={() => unpaid.forEach((m) => m.email && sendReminder(m.id, m.name, m.tynId, m.email))} className="px-4 py-2 rounded-lg bg-[#D4AF7A] text-[#6B2D4E] font-bold text-sm">Send All</button>}
            </div>
            {unpaid.length === 0 ? (
              <div className="text-center py-10"><p className="text-4xl mb-3">🎉</p><p className="font-bold text-[#6B2D4E]">All members paid this cycle!</p></div>
            ) : unpaid.map((m) => {
              const st = reminderStatus[m.id] ?? "idle";
              return (
                <div key={m.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#D9C0CC]">
                  <div className="flex-1">
                    <p className="font-semibold text-[#6B2D4E] text-sm">{m.name}</p>
                    <p className="text-xs text-[#6B2D4E]/40">{m.tynId} · {m.email ?? "No email"}</p>
                  </div>
                  <button disabled={!m.email || st === "sending" || st === "sent"} onClick={() => sendReminder(m.id, m.name, m.tynId, m.email)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${st === "sent" ? "bg-green-100 text-green-700" : st === "error" ? "bg-red-100 text-red-600" : m.email ? "bg-[#6B2D4E] text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                    {st === "sent" ? "✓ Sent" : st === "error" ? "Error" : st === "sending" ? "..." : "Remind"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[["Collected", `${totalCollected.toLocaleString()} ${currency}`], ["Members", `${activeMembers.length}`], ["Payments", `${cyclePayments.length}`]].map(([l, v]) => (
                <div key={l} className="bg-white rounded-xl p-4 text-center border border-[#D9C0CC]">
                  <p className="text-lg font-bold text-[#6B2D4E]">{v}</p>
                  <p className="text-xs text-[#6B2D4E]/50 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#D9C0CC]">
              <table className="w-full text-sm">
                <thead><tr className="bg-[#6B2D4E] text-white"><th className="text-left px-4 py-2.5">TYN-ID</th><th className="text-left px-4 py-2.5">Name</th><th className="text-right px-4 py-2.5">Score</th><th className="text-right px-4 py-2.5">Paid</th></tr></thead>
                <tbody>
                  {members.sort((a, b) => b.score - a.score).map((m, i) => {
                    const paid = cyclePayments.filter((p) => p.memberId === m.id).reduce((s, p) => s + p.amount, 0);
                    return (
                      <tr key={m.id} className={`border-t border-[#EDD9E5] ${i % 2 === 0 ? "bg-white" : "bg-[#FAF0E6]/40"}`}>
                        <td className="px-4 py-2.5 font-mono text-xs text-[#6B2D4E]/60">{m.tynId}</td>
                        <td className="px-4 py-2.5 text-[#6B2D4E] font-medium">{m.name}</td>
                        <td className="px-4 py-2.5 text-right"><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${m.score >= 80 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{m.score}/100</span></td>
                        <td className="px-4 py-2.5 text-right text-[#6B2D4E] font-semibold">{paid.toLocaleString()} {currency}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={exportCSV} className="w-full py-2.5 rounded-xl bg-[#6B2D4E] text-white font-bold text-sm hover:bg-[#5a2540] transition">⬇ Export CSV</button>
          </div>
        )}
      </div>
    </div>
  );
}