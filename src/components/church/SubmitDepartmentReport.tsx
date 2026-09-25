"use client";

// src/components/church/SubmitDepartmentReport.tsx
//
// A small, reusable "+ Monthly Report" button + modal that any department
// page can drop in — the Members page, any Ministry card (Children, Youth,
// Media, Evangelism, Prison Ministry, Cleaning, Kitchen, or any other
// ministry name the admin creates), or the Finance/Reports page. Submitting
// writes to churches/{churchId}/departmentReports, which the Human
// Resources page reads from directly — no department needs to know HR
// exists, and no separate "send to HR" step is needed.
//
// initialSummary (optional) pre-fills the report text — used by the
// Finance/Reports page to auto-fill the period's income/expenses figures
// so the person doesn't have to retype numbers that already exist.

import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

const COLOR = {
  gold: "#D8B15A",
  goldText: "#8A6D1F",
  text: "#24324A",
  textSoft: "#68758A",
  redBg: "#FDECEC",
  redText: "#B4453E",
  border: "rgba(216,177,90,0.35)",
};

function currentMonthValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return yyyy + "-" + mm;
}

export default function SubmitDepartmentReport({
  churchId,
  departmentName,
  initialSummary,
  buttonLabel,
}: {
  churchId: string;
  departmentName: string;
  initialSummary?: string;
  buttonLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(currentMonthValue());
  const [summary, setSummary] = useState(initialSummary || "");
  const [submittedBy, setSubmittedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const organizerId = auth.currentUser?.uid ?? null;

  const btnBase: CSSProperties = { borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 8, padding: "9px 10px", fontSize: 13 };
  const labelStyle: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: COLOR.text, marginBottom: 4 };

  function openModal() {
    setMonth(currentMonthValue());
    setSummary(initialSummary || "");
    setSubmittedBy("");
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsOpen(false);
  }

  async function handleSubmit() {
    if (!organizerId || !churchId) return;
    if (!summary.trim()) { setError("Please write a short summary."); return; }
    setSaving(true);
    setError(null);
    try {
      await addDoc(collection(db, "churches", churchId, "departmentReports"), {
        organizerId,
        churchId,
        departmentName,
        month,
        summary: summary.trim(),
        submittedBy: submittedBy.trim(),
        createdAt: Date.now(),
      });
      setSuccess(true);
      setTimeout(() => setIsOpen(false), 1200);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while submitting. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={openModal} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText, background: "transparent" }}>
        {buttonLabel || "📋 Monthly Report"}
      </button>

      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 460, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>Send Report to Human Resources</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: COLOR.textSoft }}>{departmentName} department — the HR manager will see this in their Monthly Reports.</p>

            {success ? (
              <p style={{ borderRadius: 6, background: "#E2F0CB", color: "#3F6B34", padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
                Report sent to Human Resources!
              </p>
            ) : (
              <>
                {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Month</label>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Summary</label>
                    <textarea value={summary} onChange={(e) => setSummary(e.target.value)} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} rows={7} placeholder="What happened in this department this month?" />
                  </div>
                  <div>
                    <label style={labelStyle}>Submitted By</label>
                    <input type="text" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} style={inputStyle} placeholder="Optional" />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                  <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563", background: "transparent" }}>Cancel</button>
                  <button onClick={handleSubmit} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Sending…" : "Send to HR"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
