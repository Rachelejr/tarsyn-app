"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export interface GroupMember {
  id: string;
  tynId: string;
  name: string;
  email?: string;
  position: number;
  status: "active" | "inactive" | "pending";
}

interface Props {
  groupId: string;
  groupName: string;
  currency: string;
  contributionAmount: number;
  cycleNumber: number;
  members: GroupMember[];
  confidentialMode?: boolean;
}

type PaymentMethod = "cash" | "orange_money" | "mtn_momo" | "wave" | "bank_transfer" | "other";

export default function RecordContribution({
  groupId, groupName, currency, contributionAmount, cycleNumber, members, confidentialMode = false,
}: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState(String(contributionAmount));
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMember = members.find((m) => m.id === memberId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) { setError("Please select a member."); return; }
    setError(null);
    setLoading(true);
    try {
      const rand = Math.floor(Math.random() * 9000 + 1000);
      const receiptNumber = `TYN-C${String(cycleNumber).padStart(2, "0")}-${date.replace(/-/g, "")}-${rand}`;
      await addDoc(collection(db, "payments"), {
        groupId, memberId,
        tynId: selectedMember?.tynId,
        memberName: confidentialMode ? selectedMember?.tynId : selectedMember?.name,
        amount: parseFloat(amount),
        currency, method, cycleNumber, date, note, receiptNumber,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      setError("Firebase error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (saved) {
    return (
      <div className="bg-[#FAF0E6] rounded-2xl p-8 max-w-lg mx-auto border border-[#D9C0CC] text-center">
        <div className="w-14 h-14 rounded-full bg-[#6B2D4E]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#6B2D4E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#6B2D4E] mb-2">Payment Recorded!</h2>
        <p className="text-[#6B2D4E]/60 mb-6">
          {selectedMember?.tynId} — {parseFloat(amount).toLocaleString()} {currency}
        </p>
        <button
          onClick={() => { setSaved(false); setMemberId(""); setAmount(String(contributionAmount)); setNote(""); }}
          className="w-full py-3 rounded-xl bg-[#6B2D4E] text-white font-bold hover:bg-[#5a2540] transition"
        >
          + Record Another Payment
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF0E6] rounded-2xl p-8 max-w-lg mx-auto border border-[#D9C0CC]">
      <h2 className="text-2xl font-bold text-[#6B2D4E] mb-1">Record Contribution</h2>
      <p className="text-sm text-[#6B2D4E]/50 mb-6">Cycle #{cycleNumber} · {groupName}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#6B2D4E]/80">Member *</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-[#D9C0CC] bg-white text-[#6B2D4E] text-sm focus:outline-none focus:ring-2 focus:ring-[#6B2D4E]/30">
            <option value="">— Select a member —</option>
            {members.filter((m) => m.status === "active").sort((a, b) => a.position - b.position).map((m) => (
              <option key={m.id} value={m.id}>{m.tynId}{!confidentialMode && ` — ${m.name}`}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#6B2D4E]/80">Amount ({currency}) *</label>
          <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-[#D9C0CC] bg-white text-[#6B2D4E] text-sm focus:outline-none focus:ring-2 focus:ring-[#6B2D4E]/30" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#6B2D4E]/80">Payment Date *</label>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-[#D9C0CC] bg-white text-[#6B2D4E] text-sm focus:outline-none focus:ring-2 focus:ring-[#6B2D4E]/30" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#6B2D4E]/80">Payment Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="w-full px-4 py-2.5 rounded-xl border border-[#D9C0CC] bg-white text-[#6B2D4E] text-sm focus:outline-none focus:ring-2 focus:ring-[#6B2D4E]/30">
            <option value="cash">Cash</option>
            <option value="orange_money">Orange Money</option>
            <option value="mtn_momo">MTN MoMo</option>
            <option value="wave">Wave</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#6B2D4E]/80">Note (optional)</label>
          <input type="text" placeholder="e.g. Early payment for next cycle" value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[#D9C0CC] bg-white text-[#6B2D4E] text-sm focus:outline-none focus:ring-2 focus:ring-[#6B2D4E]/30" />
        </div>
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-[#6B2D4E] text-white font-bold hover:bg-[#5a2540] transition disabled:opacity-50">
          {loading ? "Saving..." : "Record Payment"}
        </button>
      </form>
    </div>
  );
}