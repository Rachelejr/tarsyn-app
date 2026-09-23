"use client";

// src/app/dashboard/church/[churchId]/ministries/page.tsx
//
// Ministries section of the Church module.
// Mirrors the conventions used by the existing Members/Groups pages:
//  - navy/gold palette (#172554 / #1E3A8A / #D4AF37)
//  - flat Firestore structure: churchMinistries docs keyed by organizerId + churchId
//  - English UI copy (app-facing content is kept in English per project convention)
//  - no fake/mock data — every number shown comes from Firestore

import { useEffect, useMemo, useState } from "react";
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
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Ministry, MinistryFormValues, MinistryStatus } from "@/types/ministry";
import { SUGGESTED_MINISTRY_CATEGORIES } from "@/types/ministry";

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

  const organizerId = auth.currentUser?.uid ?? null;

  // --- Live subscriptions -------------------------------------------------

  useEffect(() => {
    if (!organizerId || !churchId) return;

    const ministriesQuery = query(
      collection(db, "churchMinistries"),
      where("organizerId", "==", organizerId),
      where("churchId", "==", churchId)
    );

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
  }, [organizerId, churchId]);

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

  // Two-level tree: top-level ministries, and a lookup of sub-ministries by parent id.
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

    // Keep the hierarchy to two levels: a sub-ministry cannot itself be
    // chosen as a parent (no sub-sub-ministries), matching the org chart.
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

      if (editingId) {
        await updateDoc(doc(db, "churchMinistries", editingId), {
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
        await addDoc(collection(db, "churchMinistries"), {
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
      await deleteDoc(doc(db, "churchMinistries", ministry.id));
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
      await updateDoc(doc(db, "churchMinistries", ministry.id), {
        memberIds: nextIds,
        memberCount: nextIds.length,
        updatedAt: Date.now(),
      });
      // Keep the modal's local view in sync without waiting on the snapshot.
      setManagingMembersFor((prev) =>
        prev && prev.id === ministry.id
          ? { ...prev, memberIds: nextIds, memberCount: nextIds.length }
          : prev
      );
    } catch (err) {
      console.error("Failed to update ministry members:", err);
    }
  }

  // --- Render -------------------------------------------------

  return (
    <div className="min-h-screen bg-[#FBEEDD] p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#172554]">Ministries</h1>
            <p className="text-sm text-[#1E3A8A]">
              Organize your church's ministries, assign leaders, and track membership.
            </p>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]"
          >
            + New Ministry
          </button>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center text-[#1E3A8A]">
            Loading ministries…
          </div>
        ) : ministries.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center">
            <p className="mb-4 text-[#1E3A8A]">
              No ministries yet. Create your first one to get started.
            </p>
            <button
              onClick={() => openCreateModal()}
              className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]"
            >
              + New Ministry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {topLevelMinistries.map((ministry) => {
              const subMinistries = subMinistriesByParent.get(ministry.id) ?? [];
              return (
                <div
                  key={ministry.id}
                  className="rounded-lg border border-[#D4AF37]/30 bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h2 className="text-lg font-semibold text-[#172554]">
                      {ministry.name}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ministry.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {ministry.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {ministry.category && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#D4AF37]">
                      {ministry.category}
                    </p>
                  )}

                  {ministry.description && (
                    <p className="mb-3 text-sm text-gray-600">
                      {ministry.description}
                    </p>
                  )}

                  <dl className="mb-4 space-y-1 text-sm text-[#1E3A8A]">
                    <div className="flex justify-between">
                      <dt>Leader</dt>
                      <dd>{ministry.leaderName ?? "Not assigned"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Members</dt>
                      <dd>{ministry.memberCount}</dd>
                    </div>
                    {ministry.meetingSchedule && (
                      <div className="flex justify-between">
                        <dt>Meets</dt>
                        <dd>{ministry.meetingSchedule}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex flex-wrap gap-2 text-sm">
                    <button
                      onClick={() => setManagingMembersFor(ministry)}
                      className="rounded border border-[#1E3A8A] px-3 py-1 text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white"
                    >
                      Manage Members
                    </button>
                    <button
                      onClick={() => openEditModal(ministry)}
                      className="rounded border border-[#D4AF37] px-3 py-1 text-[#8a6d1f] hover:bg-[#D4AF37] hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ministry)}
                      className="rounded border border-red-300 px-3 py-1 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => openCreateModal(ministry.id)}
                      className="rounded border border-dashed border-[#1E3A8A] px-3 py-1 text-[#1E3A8A] hover:bg-[#FBEEDD]"
                    >
                      + Add Sub-Ministry
                    </button>
                  </div>

                  {subMinistries.length > 0 && (
                    <div className="mt-4 space-y-2 border-l-2 border-[#D4AF37]/40 pl-4">
                      {subMinistries.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-md bg-[#FBEEDD]/60 p-3"
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[#172554]">
                              {sub.name}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                sub.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {sub.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {sub.description && (
                            <p className="mb-2 text-xs text-gray-600">
                              {sub.description}
                            </p>
                          )}
                          <div className="mb-2 flex justify-between text-xs text-[#1E3A8A]">
                            <span>Leader: {sub.leaderName ?? "Not assigned"}</span>
                            <span>{sub.memberCount} members</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              onClick={() => setManagingMembersFor(sub)}
                              className="rounded border border-[#1E3A8A] px-2 py-0.5 text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white"
                            >
                              Manage Members
                            </button>
                            <button
                              onClick={() => openEditModal(sub)}
                              className="rounded border border-[#D4AF37] px-2 py-0.5 text-[#8a6d1f] hover:bg-[#D4AF37] hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(sub)}
                              className="rounded border border-red-300 px-2 py-0.5 text-red-600 hover:bg-red-50"
                            >
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

        <footer className="mt-10 text-center text-xs text-gray-400">
          Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All
          Rights Reserved · v1.0.0
        </footer>
      </div>

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-[#172554]">
              {editingId ? "Edit Ministry" : "New Ministry"}
            </h3>

            {error && (
              <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#1E3A8A]">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Worship Team"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1E3A8A]">
                  Category
                </label>
                <input
                  type="text"
                  list="ministry-category-suggestions"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Worship, Youth, Evangelism"
                />
                <datalist id="ministry-category-suggestions">
                  {SUGGESTED_MINISTRY_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1E3A8A]">
                  Parent Ministry
                </label>
                <select
                  value={form.parentMinistryId ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, parentMinistryId: e.target.value || null })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">None — top-level ministry</option>
                  {topLevelMinistries
                    .filter((m) => m.id !== editingId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  e.g. make this a sub-ministry under "Evangelism" (Prison
                  Ministry, Hospital Visitation, Street Evangelism, Missions…)
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1E3A8A]">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1E3A8A]">
                  Leader
                </label>
                <select
                  value={form.leaderId ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, leaderId: e.target.value || null })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Not assigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1E3A8A]">
                  Meeting Schedule
                </label>
                <input
                  type="text"
                  value={form.meetingSchedule}
                  onChange={(e) =>
                    setForm({ ...form, meetingSchedule: e.target.value })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Sundays 9:00 AM"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#1E3A8A]">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as MinistryStatus })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage members modal */}
      {managingMembersFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-1 text-lg font-semibold text-[#172554]">
              Members — {managingMembersFor.name}
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              {managingMembersFor.memberCount} member
              {managingMembersFor.memberCount === 1 ? "" : "s"} assigned
            </p>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No church members recorded yet.
                </p>
              ) : (
                members.map((m) => {
                  const checked = managingMembersFor.memberIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-[#FBEEDD]"
                    >
                      <span className="text-[#172554]">{m.fullName}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(managingMembersFor, m.id)}
                      />
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setManagingMembersFor(null)}
                className="rounded bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
