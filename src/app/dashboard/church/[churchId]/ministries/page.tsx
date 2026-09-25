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
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
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

  const organizerId = auth.currentUser?.uid ?? null;

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
