"use client";

// src/app/dashboard/church/[churchId]/families/page.tsx
//
// Families section of the Church module.
//  - Data lives at churches/{churchId}/families/{familyId} — a per-church
//    subcollection, same pattern as Ministries.
//  - Styled entirely with inline styles (matching ChurchSidebar/Dashboard/
//    Groups/Ministries) — no Tailwind utility classes.
//  - Pastel palette: baby pink #FDE2E4, cream #F6EFDD, baby green #E2F0CB,
//    discreet gold #D8B15A, text #24324A / #68758A.
//  - English UI copy. No fake/mock data — every number comes from Firestore.

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import type { Family, FamilyFormValues } from "@/types/family";

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
};

interface ChurchMemberLite {
  id: string;
  fullName: string;
}

const EMPTY_FORM: FamilyFormValues = {
  name: "",
  headOfHouseholdId: null,
  address: "",
  notes: "",
};

export default function FamiliesPage() {
  const params = useParams();
  const churchId = params?.churchId as string;

  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<ChurchMemberLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FamilyFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [managingMembersFor, setManagingMembersFor] = useState<Family | null>(null);

  const organizerId = auth.currentUser?.uid ?? null;

  // --- Live subscriptions -------------------------------------------------

  useEffect(() => {
    if (!churchId) return;

    const familiesQuery = collection(db, "churches", churchId, "families");

    const unsubscribe = onSnapshot(
      familiesQuery,
      (snapshot) => {
        const rows: Family[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Family, "id">),
        }));
        rows.sort((a, b) => a.name.localeCompare(b.name));
        setFamilies(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load families:", err);
        setError("Unable to load families. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [churchId]);

  useEffect(() => {
    if (!organizerId || !churchId) return;

    const membersQuery = query(
      collection(db, "churchMembers"),
      where("organizerId", "==", organizerId),
      where("churchId", "==", churchId)
    );

    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const rows: ChurchMemberLite[] = snapshot.docs.map((d) => ({
        id: d.id,
        fullName: (d.data().fullName as string) || "Unnamed member",
      }));
      rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setMembers(rows);
    });

    return () => unsubscribe();
  }, [organizerId, churchId]);

  const memberById = useMemo(() => {
    const map = new Map<string, ChurchMemberLite>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  // --- Modal handling -------------------------------------------------

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(family: Family) {
    setEditingId(family.id);
    setForm({
      name: family.name,
      headOfHouseholdId: family.headOfHouseholdId,
      address: family.address ?? "",
      notes: family.notes ?? "",
    });
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
  }

  async function handleSave() {
    if (!organizerId || !churchId) return;

    if (!form.name.trim()) {
      setError("Family name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const headOfHouseholdName = form.headOfHouseholdId
        ? memberById.get(form.headOfHouseholdId)?.fullName ?? null
        : null;

      const familiesRef = collection(db, "churches", churchId, "families");

      if (editingId) {
        await updateDoc(doc(familiesRef, editingId), {
          name: form.name.trim(),
          headOfHouseholdId: form.headOfHouseholdId,
          headOfHouseholdName,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          updatedAt: Date.now(),
        });
      } else {
        // A new family automatically includes its head of household as a member.
        const initialMemberIds = form.headOfHouseholdId ? [form.headOfHouseholdId] : [];
        await addDoc(familiesRef, {
          organizerId,
          churchId,
          name: form.name.trim(),
          headOfHouseholdId: form.headOfHouseholdId,
          headOfHouseholdName,
          memberIds: initialMemberIds,
          memberCount: initialMemberIds.length,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save family:", err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(family: Family) {
    if (!confirm(`Delete "${family.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "churches", churchId, "families", family.id));
    } catch (err) {
      console.error("Failed to delete family:", err);
      alert("Unable to delete this family. Please try again.");
    }
  }

  // --- Member assignment -------------------------------------------------

  async function toggleMember(family: Family, memberId: string) {
    const isMember = family.memberIds.includes(memberId);
    const nextIds = isMember
      ? family.memberIds.filter((id) => id !== memberId)
      : [...family.memberIds, memberId];

    try {
      await updateDoc(doc(db, "churches", churchId, "families", family.id), {
        memberIds: nextIds,
        memberCount: nextIds.length,
        updatedAt: Date.now(),
      });
      setManagingMembersFor((prev) =>
        prev && prev.id === family.id
          ? { ...prev, memberIds: nextIds, memberCount: nextIds.length }
          : prev
      );
    } catch (err) {
      console.error("Failed to update family members:", err);
    }
  }

  // --- Small style helpers -------------------------------------------------

  const btnBase: CSSProperties = {
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    background: "transparent",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 13,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: COLOR.text,
    marginBottom: 4,
  };

  // --- Render -------------------------------------------------

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ChurchSidebar churchId={churchId} />
      <div
        style={{
          flex: 1,
          minHeight: "100vh",
          padding: 24,
          boxSizing: "border-box",
          background: `linear-gradient(120deg, ${COLOR.pink} 0%, ${COLOR.cream} 55%, ${COLOR.green} 100%)`,
          backgroundAttachment: "fixed",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          <ChurchPageHeader
            churchId={churchId}
            title="Families"
            subtitle="Group church members into households and keep track of each family."
            actions={
              <button
                onClick={openCreateModal}
                style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
              >
                + New Family
              </button>
            }
          />

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading families…
            </div>
          ) : families.length === 0 ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 40, textAlign: "center" }}>
              <p style={{ marginBottom: 16, color: COLOR.textSoft }}>
                No families yet. Create your first one to get started.
              </p>
              <button
                onClick={openCreateModal}
                style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
              >
                + New Family
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {families.map((family) => (
                <div
                  key={family.id}
                  style={{ borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 20, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` }}
                >
                  <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: COLOR.text }}>{family.name}</h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, fontSize: 13, color: COLOR.text }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Head of household</span>
                      <span>{family.headOfHouseholdName ?? "Not assigned"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Members</span>
                      <span>{family.memberCount}</span>
                    </div>
                  </div>

                  {family.address && (
                    <p style={{ margin: "0 0 6px", fontSize: 12, color: COLOR.textSoft }}>📍 {family.address}</p>
                  )}
                  {family.notes && (
                    <p style={{ margin: "0 0 14px", fontSize: 12, color: COLOR.textSoft, lineHeight: 1.5 }}>{family.notes}</p>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button onClick={() => setManagingMembersFor(family)} style={{ ...btnBase, border: `1px solid ${COLOR.text}`, color: COLOR.text }}>
                      Manage Members
                    </button>
                    <button onClick={() => openEditModal(family)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(family)} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: "#9AA5B4", marginTop: 40 }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>

        {isModalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>
                {editingId ? "Edit Family" : "New Family"}
              </h3>

              {error && (
                <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Family Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. The Joseph Family" />
                </div>

                <div>
                  <label style={labelStyle}>Head of Household</label>
                  <select
                    value={form.headOfHouseholdId ?? ""}
                    onChange={(e) => setForm({ ...form, headOfHouseholdId: e.target.value || null })}
                    style={inputStyle}
                  >
                    <option value="">Not assigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Address</label>
                  <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={inputStyle} placeholder="Optional" />
                </div>

                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="Optional" />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {managingMembersFor && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>
                Members — {managingMembersFor.name}
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 11, color: COLOR.textSoft }}>
                {managingMembersFor.memberCount} member{managingMembersFor.memberCount === 1 ? "" : "s"} in this family
              </p>

              <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                {members.length === 0 ? (
                  <p style={{ fontSize: 13, color: COLOR.textSoft }}>No church members recorded yet.</p>
                ) : (
                  members.map((m) => {
                    const checked = managingMembersFor.memberIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        style={{ display: "flex", cursor: "pointer", alignItems: "center", justifyContent: "space-between", borderRadius: 6, padding: "6px 8px", fontSize: 13, background: checked ? "rgba(226,240,203,0.4)" : "transparent" }}
                      >
                        <span style={{ color: COLOR.text }}>{m.fullName}</span>
                        <input type="checkbox" checked={checked} onChange={() => toggleMember(managingMembersFor, m.id)} />
                      </label>
                    );
                  })
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button onClick={() => setManagingMembersFor(null)} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, padding: "10px 18px" }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
