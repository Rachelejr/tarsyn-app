"use client";

// src/app/dashboard/church/[churchId]/ministries/page.tsx
//
// Ministries section of the Church module.
//  - Data lives at churches/{churchId}/ministries/{ministryId} — a per-church
//    subcollection, not a shared flat collection filtered by churchId.
//  - Styled entirely with inline styles (matching ChurchSidebar/Dashboard/
//    Groups), not Tailwind utility classes — Tailwind classes were not
//    rendering on this page, so this avoids that entirely.
//  - Pastel palette (Sept 2026 direction): baby pink #FDE2E4, cream #F6EFDD,
//    baby green #E2F0CB, discreet gold #D8B15A, text #24324A / #68758A.
//  - No cross, no crucifix, no graphic religious symbol anywhere in this module.
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
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import type { Ministry, MinistryFormValues, MinistryStatus } from "@/types/ministry";
import { SUGGESTED_MINISTRY_CATEGORIES } from "@/types/ministry";

const COLOR = {
  pink: "#FDE2E4",
  cream: "#F6EFDD",
  green: "#E2F0CB",
  gold: "#D8B15A",
  goldText: "#8A6D1F",
  text: "#24324A",
  textSoft: "#68758A",
  greenBadgeBg: "#E2F0CB",
  greenBadgeText: "#3F6B34",
  grayBadgeBg: "#F1F2F4",
  grayBadgeText: "#68758A",
  redBorder: "#E7A9A9",
  redText: "#B4453E",
  redBg: "#FDECEC",
  border: "rgba(216,177,90,0.35)",
};

interface ChurchMemberLite {
  id: string;
  fullName: string;
}

const EMPTY_FORM: MinistryFormValues = {
  name: "",
  description: "",
  category: "",
  status: "active",
  leaderId: null,
  meetingSchedule: "",
  parentMinistryId: null,
};

export default function MinistriesPage() {
  const params = useParams();
  const churchId = params?.churchId as string;

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [members, setMembers] = useState<ChurchMemberLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MinistryFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [managingMembersFor, setManagingMembersFor] = useState<Ministry | null>(null);
  const [churchName, setChurchName] = useState<string | undefined>(undefined);

  const organizerId = auth.currentUser?.uid ?? null;

  useEffect(() => {
    if (!churchId) return;
    getDoc(doc(db, "churches", churchId))
      .then((snap) => {
        if (snap.exists()) {
          setChurchName((snap.data().name as string) || undefined);
        }
      })
      .catch((err) => console.error("Failed to load church name:", err));
  }, [churchId]);

  // --- Live subscriptions -------------------------------------------------

  useEffect(() => {
    if (!churchId) return;

    const ministriesQuery = collection(db, "churches", churchId, "ministries");

    const unsubscribe = onSnapshot(
      ministriesQuery,
      (snapshot) => {
        const rows: Ministry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Ministry, "id">),
        }));
        rows.sort((a, b) => a.name.localeCompare(b.name));
        setMinistries(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load ministries:", err);
        setError("Unable to load ministries. Please try again.");
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

  const topLevelMinistries = useMemo(
    () => ministries.filter((m) => !m.parentMinistryId),
    [ministries]
  );

  const subMinistriesByParent = useMemo(() => {
    const map = new Map<string, Ministry[]>();
    ministries
      .filter((m) => m.parentMinistryId)
      .forEach((m) => {
        const list = map.get(m.parentMinistryId as string) ?? [];
        list.push(m);
        map.set(m.parentMinistryId as string, list);
      });
    return map;
  }, [ministries]);

  // --- Modal handling -------------------------------------------------

  function openCreateModal(parentMinistryId: string | null = null) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, parentMinistryId });
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(ministry: Ministry) {
    setEditingId(ministry.id);
    setForm({
      name: ministry.name,
      description: ministry.description,
      category: ministry.category,
      status: ministry.status,
      leaderId: ministry.leaderId,
      meetingSchedule: ministry.meetingSchedule ?? "",
      parentMinistryId: ministry.parentMinistryId,
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
      setError("Ministry name is required.");
      return;
    }

    if (editingId && form.parentMinistryId === editingId) {
      setError("A ministry cannot be its own parent.");
      return;
    }

    if (form.parentMinistryId) {
      const parent = ministries.find((m) => m.id === form.parentMinistryId);
      if (parent?.parentMinistryId) {
        setError("Sub-ministries can't have their own sub-ministries.");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const leaderName = form.leaderId
        ? memberById.get(form.leaderId)?.fullName ?? null
        : null;
      const parentMinistryName = form.parentMinistryId
        ? ministries.find((m) => m.id === form.parentMinistryId)?.name ?? null
        : null;

      const ministriesRef = collection(db, "churches", churchId, "ministries");

      if (editingId) {
        await updateDoc(doc(ministriesRef, editingId), {
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          status: form.status,
          leaderId: form.leaderId,
          leaderName,
          meetingSchedule: form.meetingSchedule.trim() || null,
          parentMinistryId: form.parentMinistryId,
          parentMinistryName,
          updatedAt: Date.now(),
        });
      } else {
        await addDoc(ministriesRef, {
          organizerId,
          churchId,
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          status: form.status,
          leaderId: form.leaderId,
          leaderName,
          memberIds: [],
          memberCount: 0,
          meetingSchedule: form.meetingSchedule.trim() || null,
          parentMinistryId: form.parentMinistryId,
          parentMinistryName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save ministry:", err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ministry: Ministry) {
    const childCount = subMinistriesByParent.get(ministry.id)?.length ?? 0;
    const warning =
      childCount > 0
        ? `"${ministry.name}" has ${childCount} sub-ministry${
            childCount === 1 ? "" : "ies"
          }. Deleting it will NOT delete those sub-ministries, but they will become unassigned. Continue?`
        : `Delete "${ministry.name}"? This cannot be undone.`;
    if (!confirm(warning)) return;
    try {
      await deleteDoc(doc(db, "churches", churchId, "ministries", ministry.id));
    } catch (err) {
      console.error("Failed to delete ministry:", err);
      alert("Unable to delete this ministry. Please try again.");
    }
  }

  // --- Member assignment -------------------------------------------------

  async function toggleMember(ministry: Ministry, memberId: string) {
    const isMember = ministry.memberIds.includes(memberId);
    const nextIds = isMember
      ? ministry.memberIds.filter((id) => id !== memberId)
      : [...ministry.memberIds, memberId];

    try {
      await updateDoc(doc(db, "churches", churchId, "ministries", ministry.id), {
        memberIds: nextIds,
        memberCount: nextIds.length,
        updatedAt: Date.now(),
      });
      setManagingMembersFor((prev) =>
        prev && prev.id === ministry.id
          ? { ...prev, memberIds: nextIds, memberCount: nextIds.length }
          : prev
      );
    } catch (err) {
      console.error("Failed to update ministry members:", err);
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
      <ChurchSidebar churchId={churchId} churchName={churchName} />
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
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: COLOR.text }}>Ministries</h1>
              <p style={{ margin: 0, fontSize: 14, color: COLOR.textSoft }}>
                Organize your church's ministries, assign leaders, and track membership.
              </p>
            </div>
            <button
              onClick={() => openCreateModal()}
              style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
            >
              + New Ministry
            </button>
          </div>

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading ministries…
            </div>
          ) : ministries.length === 0 ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 40, textAlign: "center" }}>
              <p style={{ marginBottom: 16, color: COLOR.textSoft }}>
                No ministries yet. Create your first one to get started.
              </p>
              <button
                onClick={() => openCreateModal()}
                style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
              >
                + New Ministry
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topLevelMinistries.map((ministry) => {
                const subMinistries = subMinistriesByParent.get(ministry.id) ?? [];
                return (
                  <div
                    key={ministry.id}
                    style={{ borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 20, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLOR.text }}>{ministry.name}</h2>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "2px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          background: ministry.status === "active" ? COLOR.greenBadgeBg : COLOR.grayBadgeBg,
                          color: ministry.status === "active" ? COLOR.greenBadgeText : COLOR.grayBadgeText,
                        }}
                      >
                        {ministry.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {ministry.category && (
                      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLOR.goldText }}>
                        {ministry.category}
                      </p>
                    )}

                    {ministry.description && (
                      <p style={{ margin: "0 0 14px", fontSize: 13, color: COLOR.textSoft, lineHeight: 1.5 }}>{ministry.description}</p>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16, fontSize: 13, color: COLOR.text }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Leader</span>
                        <span>{ministry.leaderName ?? "Not assigned"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Members</span>
                        <span>{ministry.memberCount}</span>
                      </div>
                      {ministry.meetingSchedule && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Meets</span>
                          <span>{ministry.meetingSchedule}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button onClick={() => setManagingMembersFor(ministry)} style={{ ...btnBase, border: `1px solid ${COLOR.text}`, color: COLOR.text }}>
                        Manage Members
                      </button>
                      <button onClick={() => openEditModal(ministry)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(ministry)} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>
                        Delete
                      </button>
                      <button onClick={() => openCreateModal(ministry.id)} style={{ ...btnBase, border: `1px dashed ${COLOR.text}`, color: COLOR.text }}>
                        + Add Sub-Ministry
                      </button>
                    </div>

                    {subMinistries.length > 0 && (
                      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, borderLeft: "2px solid rgba(216,177,90,0.5)", paddingLeft: 16 }}>
                        {subMinistries.map((sub) => (
                          <div key={sub.id} style={{ borderRadius: 8, background: "rgba(253,226,228,0.5)", padding: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLOR.text }}>{sub.name}</h3>
                              <span
                                style={{
                                  borderRadius: 999,
                                  padding: "2px 9px",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: sub.status === "active" ? COLOR.greenBadgeBg : COLOR.grayBadgeBg,
                                  color: sub.status === "active" ? COLOR.greenBadgeText : COLOR.grayBadgeText,
                                }}
                              >
                                {sub.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </div>
                            {sub.description && <p style={{ margin: "0 0 8px", fontSize: 11, color: COLOR.textSoft }}>{sub.description}</p>}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLOR.text, marginBottom: 8 }}>
                              <span>Leader: {sub.leaderName ?? "Not assigned"}</span>
                              <span>{sub.memberCount} members</span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              <button onClick={() => setManagingMembersFor(sub)} style={{ ...btnBase, padding: "4px 9px", fontSize: 11, border: `1px solid ${COLOR.text}`, color: COLOR.text }}>
                                Manage Members
                              </button>
                              <button onClick={() => openEditModal(sub)} style={{ ...btnBase, padding: "4px 9px", fontSize: 11, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>
                                Edit
                              </button>
                              <button onClick={() => handleDelete(sub)} style={{ ...btnBase, padding: "4px 9px", fontSize: 11, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
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
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>
                {editingId ? "Edit Ministry" : "New Ministry"}
              </h3>

              {error && (
                <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Worship Team" />
                </div>

                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    list="ministry-category-suggestions"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. Worship, Youth, Evangelism"
                  />
                  <datalist id="ministry-category-suggestions">
                    {SUGGESTED_MINISTRY_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label style={labelStyle}>Parent Ministry</label>
                  <select
                    value={form.parentMinistryId ?? ""}
                    onChange={(e) => setForm({ ...form, parentMinistryId: e.target.value || null })}
                    style={inputStyle}
                  >
                    <option value="">None — top-level ministry</option>
                    {topLevelMinistries
                      .filter((m) => m.id !== editingId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                  </select>
                  <p style={{ marginTop: 4, fontSize: 11, color: "#9CA3AF" }}>
                    e.g. make this a sub-ministry under "Evangelism" (Prison Ministry, Hospital Visitation, Street Evangelism, Missions…)
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={3} />
                </div>

                <div>
                  <label style={labelStyle}>Leader</label>
                  <select value={form.leaderId ?? ""} onChange={(e) => setForm({ ...form, leaderId: e.target.value || null })} style={inputStyle}>
                    <option value="">Not assigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Meeting Schedule</label>
                  <input type="text" value={form.meetingSchedule} onChange={(e) => setForm({ ...form, meetingSchedule: e.target.value })} style={inputStyle} placeholder="e.g. Sundays 9:00 AM" />
                </div>

                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MinistryStatus })} style={inputStyle}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                {managingMembersFor.memberCount} member{managingMembersFor.memberCount === 1 ? "" : "s"} assigned
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
