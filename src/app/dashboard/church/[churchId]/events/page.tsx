"use client";

// src/app/dashboard/church/[churchId]/events/page.tsx
//
// Events & Calendar section of the Church module.
//  - Data lives at churches/{churchId}/events/{eventId} — a per-church
//    subcollection, same pattern as Ministries/Families.
//  - Styled entirely with inline styles (matching ChurchSidebar/Dashboard/
//    Groups/Ministries/Families) — no Tailwind utility classes.
//  - Pastel palette: baby pink #FDE2E4, cream #F6EFDD, baby green #E2F0CB,
//    discreet gold #D8B15A, text #24324A / #68758A.
//  - English UI copy. No fake/mock data — every event comes from Firestore.

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import type { ChurchEvent, EventFormValues } from "@/types/event";
import { SUGGESTED_EVENT_CATEGORIES } from "@/types/event";

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

const EMPTY_FORM: EventFormValues = {
  title: "",
  description: "",
  category: "",
  date: "",
  time: "",
  location: "",
};

function computeStartAt(date: string, time: string): number {
  if (!date) return 0;
  const iso = time ? `${date}T${time}` : `${date}T00:00`;
  const parsed = new Date(iso).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatEventDate(date: string, time: string): string {
  if (!date) return "";
  const d = new Date(time ? `${date}T${time}` : `${date}T00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  if (!time) return dateStr;
  const timeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateStr} · ${timeStr}`;
}

export default function EventsPage() {
  const params = useParams();
  const churchId = params?.churchId as string;

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!churchId) return;

    const eventsQuery = collection(db, "churches", churchId, "events");

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const rows: ChurchEvent[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChurchEvent, "id">),
        }));
        rows.sort((a, b) => a.startAt - b.startAt);
        setEvents(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load events:", err);
        setError("Unable to load events. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [churchId]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: events.filter((e) => e.startAt >= now),
      past: events.filter((e) => e.startAt < now).sort((a, b) => b.startAt - a.startAt),
    };
  }, [events]);

  // --- Modal handling -------------------------------------------------

  function openCreateModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(event: ChurchEvent) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      time: event.time,
      location: event.location ?? "",
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

    if (!form.title.trim()) {
      setError("Event title is required.");
      return;
    }
    if (!form.date) {
      setError("Event date is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const startAt = computeStartAt(form.date, form.time);
      const eventsRef = collection(db, "churches", churchId, "events");

      if (editingId) {
        await updateDoc(doc(eventsRef, editingId), {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          date: form.date,
          time: form.time,
          location: form.location.trim() || null,
          startAt,
          updatedAt: Date.now(),
        });
      } else {
        await addDoc(eventsRef, {
          organizerId,
          churchId,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          date: form.date,
          time: form.time,
          location: form.location.trim() || null,
          startAt,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save event:", err);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event: ChurchEvent) {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "churches", churchId, "events", event.id));
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Unable to delete this event. Please try again.");
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

  function EventCard({ event, isPast }: { event: ChurchEvent; isPast: boolean }) {
    return (
      <div
        style={{
          borderRadius: 12,
          background: isPast ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.92)",
          padding: 18,
          boxShadow: "0 1px 3px rgba(23,37,84,0.06)",
          border: `1px solid ${COLOR.border}`,
          opacity: isPast ? 0.75 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLOR.text }}>{event.title}</h2>
        </div>

        {event.category && (
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLOR.goldText }}>
            {event.category}
          </p>
        )}

        <p style={{ margin: "0 0 6px", fontSize: 13, color: COLOR.text, fontWeight: 600 }}>
          📅 {formatEventDate(event.date, event.time)}
        </p>
        {event.location && (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.textSoft }}>📍 {event.location}</p>
        )}
        {event.description && (
          <p style={{ margin: "0 0 14px", fontSize: 13, color: COLOR.textSoft, lineHeight: 1.5 }}>{event.description}</p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => openEditModal(event)} style={{ ...btnBase, border: `1px solid ${COLOR.gold}`, color: COLOR.goldText }}>
            Edit
          </button>
          <button onClick={() => handleDelete(event)} style={{ ...btnBase, border: `1px solid ${COLOR.redBorder}`, color: COLOR.redText }}>
            Delete
          </button>
        </div>
      </div>
    );
  }

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
              <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800, color: COLOR.text }}>Events & Calendar</h1>
              <p style={{ margin: 0, fontSize: 14, color: COLOR.textSoft }}>
                Plan services, meetings and gatherings for your church.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
            >
              + New Event
            </button>
          </div>

          {loading ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 32, textAlign: "center", color: COLOR.textSoft }}>
              Loading events…
            </div>
          ) : events.length === 0 ? (
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.85)", padding: 40, textAlign: "center" }}>
              <p style={{ marginBottom: 16, color: COLOR.textSoft }}>
                No events yet. Create your first one to get started.
              </p>
              <button
                onClick={openCreateModal}
                style={{ ...btnBase, background: COLOR.gold, color: COLOR.text, border: "none", padding: "10px 18px", fontSize: 13 }}
              >
                + New Event
              </button>
            </div>
          ) : (
            <>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: COLOR.text }}>
                Upcoming ({upcoming.length})
              </h3>
              {upcoming.length === 0 ? (
                <p style={{ fontSize: 13, color: COLOR.textSoft, marginBottom: 24 }}>No upcoming events.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 28 }}>
                  {upcoming.map((event) => (
                    <EventCard key={event.id} event={event} isPast={false} />
                  ))}
                </div>
              )}

              {past.length > 0 && (
                <>
                  <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: COLOR.text }}>
                    Past ({past.length})
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                    {past.map((event) => (
                      <EventCard key={event.id} event={event} isPast={true} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <div style={{ textAlign: "center", fontSize: 11, color: "#9AA5B4", marginTop: 40 }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved · v1.0.0
          </div>
        </div>

        {isModalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#FFFFFF", padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: COLOR.text }}>
                {editingId ? "Edit Event" : "New Event"}
              </h3>

              {error && (
                <p style={{ marginBottom: 12, borderRadius: 6, background: COLOR.redBg, color: COLOR.redText, padding: "8px 12px", fontSize: 13 }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="e.g. Sunday Service" />
                </div>

                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    list="event-category-suggestions"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={inputStyle}
                    placeholder="e.g. Service, Meeting, Conference"
                  />
                  <datalist id="event-category-suggestions">
                    {SUGGESTED_EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Time</label>
                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="e.g. Main Sanctuary" />
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, resize: "vertical" }} rows={3} placeholder="Optional" />
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
      </div>
    </div>
  );
}
