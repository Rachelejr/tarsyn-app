"use client";

// src/app/dashboard/church/[churchId]/announcements/page.tsx
//
// Announcements section of the Church module (admin side). Whatever the
// admin posts here shows up automatically in the member portal — there is
// no separate "publish to members" step.
//  - Data lives at churches/{churchId}/announcements/{announcementId} — a
//    per-church subcollection, same pattern as Ministries/Families/Events.
//  - Styled entirely with inline styles, single-line style objects only
//    (avoids the Turbopack parsing bug seen with multi-line style objects
//    directly inside JSX tags).
//  - English UI copy. No fake/mock data — every announcement comes from
//    Firestore.

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
import type { Announcement, AnnouncementFormValues } from "@/types/announcement";

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

const EMPTY_FORM: AnnouncementFormValues = { title: "", body: "" };

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function AnnouncementsPage() {
  const params = useParams();
  const churchId = params?.churchId as string;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizerId = auth.currentUser?.uid ?? null;

  useEffect(() => {
    if (!churchId) return;

    const q = collection(db, "churches", churchId, "announcements");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: Announcement[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Announcement, "id">),
        }));
        rows.sort((a, b) => b.createdAt - a.createdAt);
        setAnnouncements(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load announcements:", err);
        setError("Unable to load announcements. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [churchId]);

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(a: Announcement) {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body });
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
  }

  async function handleSave() {
    if (!organizerId || !churchId) return;

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.body.trim()) {
      setError("Message is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const ref = collection(db, "churches", churchId, "announcements");

      if (editingId) {
        await updateDoc(doc(ref, editingId), {
          title: form.title.trim(),
          body: form.body.trim(),
          updatedAt: Date.now(),
        });
      } else {
        await addDoc(ref, {
          organizerId,
          churchId,
          title: form.title.trim(),
          body: form.body.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save announcement:", err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Announcement) {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "churches", churchId, "announcements", a.id));
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      alert("Unable to delete this announcement. Please try again.");
    }
  }

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
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <ChurchPageHeader
            churchId={churchId}
            title="Announcements"
            subtitle="Post an update and it will appear automatically in every member's portal."
            actions={
              <button
                onClick={openCreateModal}
                style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
              >
                + New Announcement
              </button>
            }
          />

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading announcements…
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 40, textAlign: "center" }}>
              <p style={{ marginBottom: 16, color: COLOR.textSoft }}>
                No announcements yet. Post your first one to get started.
              </p>
              <button
                onClick={openCreateModal}
                style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
              >
                + New Announcement
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  style={{ borderRadius: 12, background: "rgba(255,255,255,0.92)", padding: 20, boxShadow: "0 1px 3px rgba(23,37,84,0.06)", border: `1px solid ${COLOR.border}` }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLOR.text }}>{a.title}</h2>
                    <span style={{ fontSize: 11, color: COLOR.textSoft, whiteSpace: "nowrap", marginLeft: 12 }}>{formatDate(a.createdAt)}</span>
                  </div>
                  <p style={{ margin: "0 0 14px", fontSize: 13, color: COLOR.textSoft, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.body}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openEditModal(a)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(a)} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>
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
            <div style={{ width: "100%", maxWidth: 460, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>
                {editingId ? "Edit Announcement" : "New Announcement"}
              </h3>

              {error && (
                <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="e.g. Sunday Service Time Change" />
                </div>

                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={5} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
                <button onClick={closeModal} disabled={saving} style={{ ...btnBase, border: "1px solid #D1D5DB", color: "#4B5563" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{ ...btnBase, border: "none", background: COLOR.gold, color: COLOR.text, opacity: saving ? 0.5 : 1 }}>
                  {saving ? "Saving…" : "Post"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
