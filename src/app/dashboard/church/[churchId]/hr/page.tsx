"use client";

// src/app/dashboard/church/[churchId]/hr/page.tsx
//
// Human Resources hub — every department that consists of people that
// isn't yet a full member record lives here, in one controlled place:
//  - New Converts
//  - Visitors
//  - Affiliation Requests (people asking to join/affiliate)
//  - Birthdays — read-only, computed from churchMembers' optional
//    dateOfBirth field (added in Add Member), sorted by the next upcoming
//    birthday date, not a separate collection.
//
// Data lives at churches/{churchId}/newConverts, /visitors,
// /affiliationRequests — same per-church subcollection pattern as every
// other Church module section.

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import type {
  NewConvert,
  Visitor,
  AffiliationRequest,
  AffiliationStatus,
  NewConvertFormValues,
  VisitorFormValues,
  AffiliationRequestFormValues,
} from "@/types/hr";

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
  greenBg: "#E2F0CB",
  greenText: "#3F6B34",
};

type Tab = "converts" | "visitors" | "affiliation" | "birthdays";

interface MemberBirthdayRow {
  id: string;
  fullName: string;
  dateOfBirth: string; // yyyy-mm-dd
  daysUntil: number;
}

function daysUntilNextBirthday(dob: string): number {
  const [, mm, dd] = dob.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), mm - 1, dd);
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

function formatBirthdayDisplay(dob: string): string {
  const [, mm, dd] = dob.split("-").map(Number);
  const d = new Date(2000, mm - 1, dd);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function HumanResourcesPage() {
  const params = useParams();
  const churchId = params?.churchId as string;
  const organizerId = auth.currentUser?.uid ?? null;

  const [tab, setTab] = useState<Tab>("converts");

  const [converts, setConverts] = useState<NewConvert[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [affiliations, setAffiliations] = useState<AffiliationRequest[]>([]);
  const [memberBirthdays, setMemberBirthdays] = useState<MemberBirthdayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState<NewConvertFormValues>({ fullName: "", phone: "", email: "", convertedOn: "", notes: "" });
  const [visitorForm, setVisitorForm] = useState<VisitorFormValues>({ fullName: "", phone: "", email: "", visitDate: "", invitedBy: "", notes: "" });
  const [affiliationForm, setAffiliationForm] = useState<AffiliationRequestFormValues>({ fullName: "", phone: "", email: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "newConverts"), (snap) => {
      const rows: NewConvert[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NewConvert, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setConverts(rows);
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "visitors"), (snap) => {
      const rows: Visitor[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Visitor, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setVisitors(rows);
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "affiliationRequests"), (snap) => {
      const rows: AffiliationRequest[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AffiliationRequest, "id">) }));
      rows.sort((a, b) => b.createdAt - a.createdAt);
      setAffiliations(rows);
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churchMembers"), (snap) => {
      const rows: MemberBirthdayRow[] = [];
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.churchId !== churchId) return;
        if (!data.dateOfBirth) return;
        rows.push({
          id: d.id,
          fullName: data.fullName || "Member",
          dateOfBirth: data.dateOfBirth,
          daysUntil: daysUntilNextBirthday(data.dateOfBirth),
        });
      });
      rows.sort((a, b) => a.daysUntil - b.daysUntil);
      setMemberBirthdays(rows);
    }, (err) => console.error(err));
    return () => unsub();
  }, [churchId]);

  function openCreateModal() {
    setEditingId(null);
    setConvertForm({ fullName: "", phone: "", email: "", convertedOn: "", notes: "" });
    setVisitorForm({ fullName: "", phone: "", email: "", visitDate: "", invitedBy: "", notes: "" });
    setAffiliationForm({ fullName: "", phone: "", email: "", reason: "" });
    setError(null);
    setIsModalOpen(true);
  }

  function openEditConvert(c: NewConvert) {
    setEditingId(c.id);
    setConvertForm({ fullName: c.fullName, phone: c.phone, email: c.email, convertedOn: c.convertedOn, notes: c.notes });
    setError(null);
    setIsModalOpen(true);
  }

  function openEditVisitor(v: Visitor) {
    setEditingId(v.id);
    setVisitorForm({ fullName: v.fullName, phone: v.phone, email: v.email, visitDate: v.visitDate, invitedBy: v.invitedBy, notes: v.notes });
    setError(null);
    setIsModalOpen(true);
  }

  function openEditAffiliation(a: AffiliationRequest) {
    setEditingId(a.id);
    setAffiliationForm({ fullName: a.fullName, phone: a.phone, email: a.email, reason: a.reason });
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
  }

  async function handleSaveConvert() {
    if (!organizerId || !churchId) return;
    if (!convertForm.fullName.trim()) { setError("Full name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const ref = collection(db, "churches", churchId, "newConverts");
      if (editingId) {
        await updateDoc(doc(ref, editingId), { ...convertForm, fullName: convertForm.fullName.trim() });
      } else {
        await addDoc(ref, { organizerId, churchId, ...convertForm, fullName: convertForm.fullName.trim(), createdAt: Date.now() });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVisitor() {
    if (!organizerId || !churchId) return;
    if (!visitorForm.fullName.trim()) { setError("Full name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const ref = collection(db, "churches", churchId, "visitors");
      if (editingId) {
        await updateDoc(doc(ref, editingId), { ...visitorForm, fullName: visitorForm.fullName.trim() });
      } else {
        await addDoc(ref, { organizerId, churchId, ...visitorForm, fullName: visitorForm.fullName.trim(), createdAt: Date.now() });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAffiliation() {
    if (!organizerId || !churchId) return;
    if (!affiliationForm.fullName.trim()) { setError("Full name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const ref = collection(db, "churches", churchId, "affiliationRequests");
      if (editingId) {
        await updateDoc(doc(ref, editingId), { ...affiliationForm, fullName: affiliationForm.fullName.trim() });
      } else {
        await addDoc(ref, { organizerId, churchId, ...affiliationForm, fullName: affiliationForm.fullName.trim(), status: "pending" as AffiliationStatus, createdAt: Date.now() });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetAffiliationStatus(a: AffiliationRequest, status: AffiliationStatus) {
    try {
      await updateDoc(doc(db, "churches", churchId, "affiliationRequests", a.id), { status });
    } catch (err) {
      console.error(err);
      alert("Unable to update status. Please try again.");
    }
  }

  async function handleDelete(kind: Tab, id: string, label: string) {
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    const collectionName = kind === "converts" ? "newConverts" : kind === "visitors" ? "visitors" : "affiliationRequests";
    try {
      await deleteDoc(doc(db, "churches", churchId, collectionName, id));
    } catch (err) {
      console.error(err);
      alert("Unable to delete. Please try again.");
    }
  }

  const btnBase: CSSProperties = { borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "transparent" };
  const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #D1D5DB", borderRadius: 8, padding: "9px 10px", fontSize: 13 };
  const labelStyle: CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: COLOR.text, marginBottom: 4 };
  const cardStyle: CSSProperties = { borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 20, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` };
  const tabBtn = (active: boolean): CSSProperties => ({ ...btnBase, border: `1px solid ${COLOR.gold}`, background: active ? COLOR.gold : "transparent", color: active ? COLOR.text : COLOR.goldText });

  const tabLabels: Record<Tab, string> = {
    converts: "New Converts",
    visitors: "Visitors",
    affiliation: "Affiliation Requests",
    birthdays: "Birthdays",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ChurchSidebar churchId={churchId} />
      <div style={{ flex: 1, minHeight: "100vh", padding: 24, boxSizing: "border-box", background: `linear-gradient(120deg, ${COLOR.pink} 0%, ${COLOR.cream} 55%, ${COLOR.green} 100%)`, backgroundAttachment: "fixed" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <ChurchPageHeader
            churchId={churchId}
            title="Human Resources"
            subtitle="New converts, visitors, affiliation requests, and member birthdays — all in one place."
            actions={
              tab !== "birthdays" ? (
                <button onClick={openCreateModal} style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}>
                  + New {tabLabels[tab].replace(/s$/, "").replace("Requests", "Request")}
                </button>
              ) : undefined
            }
          />

          <div style={{ ...cardStyle, marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(Object.keys(tabLabels) as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>{tabLabels[t]}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading…
            </div>
          ) : tab === "converts" ? (
            converts.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                <p style={{ color: COLOR.textSoft }}>No new converts recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {converts.map((c) => (
                  <div key={c.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLOR.text }}>{c.fullName}</h3>
                      {c.convertedOn && <span style={{ fontSize: 11, color: COLOR.textSoft }}>Converted {c.convertedOn}</span>}
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.textSoft }}>{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                    {c.notes && <p style={{ margin: "0 0 10px", fontSize: 13, color: COLOR.text }}>{c.notes}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEditConvert(c)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>Edit</button>
                      <button onClick={() => handleDelete("converts", c.id, c.fullName)} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === "visitors" ? (
            visitors.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                <p style={{ color: COLOR.textSoft }}>No visitors recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {visitors.map((v) => (
                  <div key={v.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLOR.text }}>{v.fullName}</h3>
                      {v.visitDate && <span style={{ fontSize: 11, color: COLOR.textSoft }}>Visited {v.visitDate}</span>}
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.textSoft }}>{[v.phone, v.email].filter(Boolean).join(" · ")}</p>
                    {v.invitedBy && <p style={{ margin: "0 0 6px", fontSize: 12, color: COLOR.text }}>Invited by: {v.invitedBy}</p>}
                    {v.notes && <p style={{ margin: "0 0 10px", fontSize: 13, color: COLOR.text }}>{v.notes}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEditVisitor(v)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>Edit</button>
                      <button onClick={() => handleDelete("visitors", v.id, v.fullName)} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === "affiliation" ? (
            affiliations.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                <p style={{ color: COLOR.textSoft }}>No affiliation requests yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {affiliations.map((a) => (
                  <div key={a.id} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: COLOR.text }}>{a.fullName}</h3>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, background: a.status === "approved" ? COLOR.greenBg : a.status === "declined" ? COLOR.redBg : COLOR.cream, color: a.status === "approved" ? COLOR.greenText : a.status === "declined" ? COLOR.redText : COLOR.goldText }}>
                        {a.status}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.textSoft }}>{[a.phone, a.email].filter(Boolean).join(" · ")}</p>
                    {a.reason && <p style={{ margin: "0 0 10px", fontSize: 13, color: COLOR.text }}>{a.reason}</p>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {a.status !== "approved" && <button onClick={() => handleSetAffiliationStatus(a, "approved")} style={{ ...btnBase, border: `1px solid ${COLOR.greenText}`, color: COLOR.greenText }}>Approve</button>}
                      {a.status !== "declined" && <button onClick={() => handleSetAffiliationStatus(a, "declined")} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>Decline</button>}
                      <button onClick={() => openEditAffiliation(a)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>Edit</button>
                      <button onClick={() => handleDelete("affiliation", a.id, a.fullName)} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={cardStyle}>
              <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: COLOR.text }}>Upcoming Birthdays</h2>
              <p style={{ margin: "0 0 16px", fontSize: 11, color: COLOR.textSoft }}>
                Computed from each member's Date of Birth. Add one from the Members page for it to show up here.
              </p>
              {memberBirthdays.length === 0 ? (
                <p style={{ fontSize: 13, color: COLOR.textSoft, margin: 0 }}>No member birthdays on file yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {memberBirthdays.map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: COLOR.text, borderBottom: "1px solid #F1F2F4", paddingBottom: 6 }}>
                      <span>{m.fullName}</span>
                      <span style={{ color: COLOR.textSoft }}>
                        {formatBirthdayDisplay(m.dateOfBirth)} {m.daysUntil === 0 ? "— Today!" : `(in ${m.daysUntil} day${m.daysUntil === 1 ? "" : "s"})`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: "#9AA5B4", marginTop: 40 }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>

        {isModalOpen && tab === "converts" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>{editingId ? "Edit New Convert" : "New Convert"}</h3>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label style={labelStyle}>Full Name</label><input type="text" value={convertForm.fullName} onChange={(e) => setConvertForm({ ...convertForm, fullName: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Phone</label><input type="text" value={convertForm.phone} onChange={(e) => setConvertForm({ ...convertForm, phone: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={convertForm.email} onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Date of Conversion</label><input type="date" value={convertForm.convertedOn} onChange={(e) => setConvertForm({ ...convertForm, convertedOn: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Notes</label><textarea value={convertForm.notes} onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={3} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>Cancel</button>
                <button onClick={handleSaveConvert} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && tab === "visitors" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>{editingId ? "Edit Visitor" : "New Visitor"}</h3>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label style={labelStyle}>Full Name</label><input type="text" value={visitorForm.fullName} onChange={(e) => setVisitorForm({ ...visitorForm, fullName: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Phone</label><input type="text" value={visitorForm.phone} onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={visitorForm.email} onChange={(e) => setVisitorForm({ ...visitorForm, email: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Visit Date</label><input type="date" value={visitorForm.visitDate} onChange={(e) => setVisitorForm({ ...visitorForm, visitDate: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Invited By</label><input type="text" value={visitorForm.invitedBy} onChange={(e) => setVisitorForm({ ...visitorForm, invitedBy: e.target.value })} style={inputStyle} placeholder="Optional" /></div>
                <div><label style={labelStyle}>Notes</label><textarea value={visitorForm.notes} onChange={(e) => setVisitorForm({ ...visitorForm, notes: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={3} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>Cancel</button>
                <button onClick={handleSaveVisitor} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && tab === "affiliation" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>{editingId ? "Edit Affiliation Request" : "New Affiliation Request"}</h3>
              {error && <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label style={labelStyle}>Full Name</label><input type="text" value={affiliationForm.fullName} onChange={(e) => setAffiliationForm({ ...affiliationForm, fullName: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Phone</label><input type="text" value={affiliationForm.phone} onChange={(e) => setAffiliationForm({ ...affiliationForm, phone: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Email</label><input type="email" value={affiliationForm.email} onChange={(e) => setAffiliationForm({ ...affiliationForm, email: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Reason</label><textarea value={affiliationForm.reason} onChange={(e) => setAffiliationForm({ ...affiliationForm, reason: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="Why they want to affiliate" /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>Cancel</button>
                <button onClick={handleSaveAffiliation} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
