"use client";

// src/app/dashboard/church/[churchId]/ministries/page.tsx
//
// Ministries (Church module).
//  - Shows EVERY ministry already created, wherever it is stored:
//      churches/{churchId}/ministries   (current place - all new ones go here)
//      churchMinistries                 (older flat collection)
//    Both are read and merged, and each ministry is always saved back to
//    the place it came from, so nothing is lost or duplicated.
//  - The "Church Committee" (category "Church Committee") is pinned first.
//  - Left: list of ministries (with search). Click one to open it on the
//    right.
//  - Right, for the selected ministry:
//      Leadership: President / Leader, Vice-President, Secretary
//        (leaderId/leaderName stay the President, so older data keeps
//        working; vicePresidentId/Name and secretaryId/Name are new).
//      Members: one list with checkboxes. "Add" opens a searchable list of
//        church members to add; "Remove" removes the checked members.
//        Holders of a position are listed first with their title.
//      Sub-ministries, Edit, Delete.
//  - Pastel design shared with Members / Add Member (ChurchPageHeader +
//    churchUi). No cross or religious symbols. English UI, real data only.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import ChurchSidebar from "@/components/church/ChurchSidebar";
import ChurchPageHeader from "@/components/church/ChurchPageHeader";
import { ChurchUiStyles, ChurchAvatar, ChurchSearchBar, ChurchEmptyState } from "@/components/church/churchUi";
import type { Ministry, MinistryStatus } from "@/types/ministry";
import { SUGGESTED_MINISTRY_CATEGORIES } from "@/types/ministry";

const COMMITTEE = "Church Committee";

type Source = "church" | "legacy";

interface MinistryRow extends Ministry {
  source: Source;
  vicePresidentId?: string | null;
  vicePresidentName?: string | null;
  secretaryId?: string | null;
  secretaryName?: string | null;
}

interface MemberLite {
  id: string;
  fullName: string;
  photoUrl?: string;
  role?: string;
  email?: string;
}

interface FormValues {
  name: string;
  description: string;
  category: string;
  status: MinistryStatus;
  meetingSchedule: string;
  parentMinistryId: string | null;
}

const EMPTY_FORM: FormValues = {
  name: "", description: "", category: "", status: "active", meetingSchedule: "", parentMinistryId: null,
};

const POSITIONS = [
  { key: "leader", label: "President / Leader", idField: "leaderId", nameField: "leaderName" },
  { key: "vp", label: "Vice-President", idField: "vicePresidentId", nameField: "vicePresidentName" },
  { key: "secretary", label: "Secretary", idField: "secretaryId", nameField: "secretaryName" },
] as const;

function isCommittee(m: { name?: string; category?: string }): boolean {
  return (m.category || "") === COMMITTEE || /committee|comit/i.test(m.name || "");
}

const PAGE_CSS = `
.mn-shell { display: flex; min-height: 100vh; background: linear-gradient(180deg, #FFFDF9 0%, #FBF8F1 100%); }
.mn-main { flex: 1; min-width: 0; }
.mn-inner { width: 100%; max-width: 1480px; margin: 0 auto; padding: 20px 28px 12px; box-sizing: border-box; }
.mn-layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 18px; align-items: start; }
.mn-card { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(36,50,74,0.03), 0 6px 18px -14px rgba(184,145,63,0.35); min-width: 0; }
.mn-card + .mn-card { margin-top: 16px; }
.mn-card h2 { margin: 0; font-size: 15px; font-weight: 800; color: #24324A; }
.mn-card-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.mn-sub { margin: 2px 0 0; font-size: 12.5px; color: #68758A; }

.mn-list { display: flex; flex-direction: column; gap: 4px; max-height: 64vh; overflow-y: auto; margin-top: 10px; padding-right: 2px; }
.mn-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: none; border: 1px solid transparent; border-radius: 12px; padding: 9px 10px; cursor: pointer; font-family: inherit; color: #24324A; }
.mn-item:hover { background: #FBF3E2; }
.mn-item.is-active { background: linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%); border-color: #EADFC8; font-weight: 700; }
.mn-item.is-sub { padding-left: 30px; }
.mn-dot { width: 30px; height: 30px; border-radius: 10px; background: #F6EFDD; color: #8A6D1F; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
.mn-item.is-sub .mn-dot { width: 24px; height: 24px; font-size: 11px; background: #E2F0CB; }
.mn-committee .mn-dot { background: #FDE2E4; }
.mn-name { flex: 1; min-width: 0; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mn-count { font-size: 11.5px; color: #68758A; font-weight: 600; }
.mn-pin { font-size: 10px; font-weight: 700; color: #9C4A5E; background: #FDE2E4; border-radius: 999px; padding: 2px 7px; margin-left: 6px; }

.mn-title { margin: 0; font-size: 22px; font-weight: 800; color: #24324A; }
.mn-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 6px; font-size: 12.5px; color: #68758A; }
.mn-pill { font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
.mn-desc { margin: 10px 0 0; font-size: 13.5px; color: #4A5669; line-height: 1.55; }

.mn-positions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.mn-pos { border: 1px solid #F0E6D2; border-radius: 14px; padding: 12px; background: #FFFDF9; }
.mn-pos label { display: block; font-size: 12px; font-weight: 700; color: #8A6D1F; margin-bottom: 8px; }
.mn-pos-who { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; min-height: 40px; }
.mn-pos-name { font-size: 14px; font-weight: 700; font-style: italic; color: #24324A; }
.mn-pos-empty { font-size: 13px; color: #A3ABB8; }

.mn-input { width: 100%; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid #E9DFCB; font-size: 14px; color: #24324A; font-family: inherit; box-sizing: border-box; outline: none; background: #FFFFFF; }
.mn-input:focus { border-color: #D8B15A; box-shadow: 0 0 0 3px rgba(216,177,90,0.18); }
.mn-input.is-set { font-weight: 700; font-style: italic; }
textarea.mn-input { height: auto; min-height: 80px; padding: 10px 12px; resize: vertical; }

.mn-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 16px; border-radius: 999px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid rgba(216,177,90,0.5); background: #FFFFFF; color: #24324A; white-space: nowrap; }
.mn-btn:hover:not(:disabled) { border-color: #D8B15A; }
.mn-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mn-btn:focus-visible { outline: 2px solid #B8913F; outline-offset: 2px; }
.mn-btn-gold { background: #D8B15A; border-color: #D8B15A; }
.mn-btn-danger { border-color: #E7A9A9; color: #B4453E; }
.mn-btn-danger:not(:disabled) { background: #FDECEC; }
.mn-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.mn-mtools { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
.mn-mtools .cu-search { flex: 1 1 220px; }
.mn-rows { border: 1px solid #F5EEDF; border-radius: 14px; overflow: hidden; max-height: 460px; overflow-y: auto; }
.mn-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 14px; border-top: 1px solid #F5EEDF; cursor: pointer; }
.mn-row:first-child { border-top: none; }
.mn-row:hover { background: #FBF3E2; }
.mn-row.is-checked { background: #FFF6F6; }
.mn-row-head { background: #FBF7EC; font-size: 12px; font-weight: 700; color: #68758A; cursor: default; }
.mn-row-head:hover { background: #FBF7EC; }
.mn-check { width: 18px; height: 18px; accent-color: #B8913F; cursor: pointer; }
.mn-who { display: flex; align-items: center; gap: 10px; min-width: 0; }
.mn-who-name { font-size: 13.5px; font-weight: 700; color: #24324A; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mn-who-sub { font-size: 12px; color: #68758A; margin: 1px 0 0; }
.mn-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: #F6EFDD; color: #8A6D1F; white-space: nowrap; }
.mn-badge.is-pos { background: #FDE2E4; color: #9C4A5E; }
.mn-subs { display: flex; gap: 8px; flex-wrap: wrap; }

.mn-note { border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 700; margin-bottom: 14px; display: flex; justify-content: space-between; gap: 10px; }
.mn-note button { background: none; border: none; cursor: pointer; font-weight: 700; color: inherit; font-family: inherit; }
.mn-ok { background: #E2F0CB; color: #3F6B34; }
.mn-err { background: #FDECEC; color: #B4453E; }

.mn-modal-bg { position: fixed; inset: 0; z-index: 60; background: rgba(36,50,74,0.35); display: flex; align-items: center; justify-content: center; padding: 16px; }
.mn-modal { background: #FFFFFF; border-radius: 18px; padding: 22px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 50px -20px rgba(36,50,74,0.4); box-sizing: border-box; }
.mn-modal h3 { margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #24324A; }
.mn-modal p { margin: 0 0 14px; font-size: 13px; color: #68758A; }
.mn-field { margin-bottom: 12px; }
.mn-field > span { display: block; font-size: 12.5px; font-weight: 600; color: #4A5669; margin-bottom: 6px; }
.mn-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.mn-pick { max-height: 50vh; overflow-y: auto; border: 1px solid #F5EEDF; border-radius: 12px; margin-top: 10px; }
.mn-footer { text-align: center; padding: 22px 0 8px; font-size: 11px; color: #8A93A3; }

@media (max-width: 1100px) { .mn-positions { grid-template-columns: 1fr; } }
@media (max-width: 900px) {
  .mn-layout { grid-template-columns: 1fr; }
  .mn-list { max-height: 260px; }
  .mn-inner { padding: 14px; }
}
`;

export default function MinistriesPage() {
  const params = useParams();
  const router = useRouter();
  const churchId = params?.churchId as string;

  const [uid, setUid] = useState<string | null>(null);
  const [fromChurch, setFromChurch] = useState<MinistryRow[]>([]);
  const [fromLegacy, setFromLegacy] = useState<MinistryRow[]>([]);
  const [members, setMembers] = useState<MemberLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [listSearch, setListSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [checked, setChecked] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MinistryRow | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addPicked, setAddPicked] = useState<string[]>([]);

  // --- Data ---------------------------------------------------------------

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push("/login"); return; }
      setUid(u.uid);
    });
    return () => unsub();
  }, [router]);

  const toRow = (id: string, data: Record<string, any>, source: Source): MinistryRow => ({
    ...(data as Omit<Ministry, "id">),
    id,
    source,
    name: data.name || "Ministry",
    description: data.description || "",
    category: data.category || "",
    status: data.status || "active",
    leaderId: data.leaderId ?? null,
    leaderName: data.leaderName ?? null,
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    memberCount: Array.isArray(data.memberIds) ? data.memberIds.length : 0,
    parentMinistryId: data.parentMinistryId ?? null,
    parentMinistryName: data.parentMinistryName ?? null,
    meetingSchedule: data.meetingSchedule ?? null,
  });

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "ministries"), (snap) => {
      setFromChurch(snap.docs.map((d) => toRow(d.id, d.data(), "church")));
      setLoading(false);
    }, (err) => { console.error("Ministries:", err); setLoading(false); });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId]);

  useEffect(() => {
    if (!churchId || !uid) return;
    const q = query(collection(db, "churchMinistries"), where("organizerId", "==", uid), where("churchId", "==", churchId));
    const unsub = onSnapshot(q, (snap) => {
      setFromLegacy(snap.docs.map((d) => toRow(d.id, d.data(), "legacy")));
    }, (err) => console.error("Ministries (older collection):", err));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, uid]);

  useEffect(() => {
    if (!churchId) return;
    const q = query(collection(db, "churchMembers"), where("churchId", "==", churchId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const x = d.data() as Record<string, any>;
        return {
          id: d.id,
          fullName: x.fullName || ((x.firstName || "") + " " + (x.lastName || "")).trim() || "Unnamed member",
          photoUrl: x.photoUrl || "",
          role: x.role || "",
          email: x.email || "",
        };
      });
      rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setMembers(rows);
    }, (err) => console.error("Members:", err));
    return () => unsub();
  }, [churchId]);

  const ministries = useMemo(() => {
    const byId = new Map<string, MinistryRow>();
    [...fromChurch, ...fromLegacy].forEach((m) => { if (!byId.has(m.id)) byId.set(m.id, m); });
    return Array.from(byId.values());
  }, [fromChurch, fromLegacy]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Ordered list: Church Committee first, then A-Z, each parent followed by
  // its sub-ministries.
  const ordered = useMemo(() => {
    const tops = ministries.filter((m) => !m.parentMinistryId || !ministries.some((p) => p.id === m.parentMinistryId));
    tops.sort((a, b) => (isCommittee(b) ? 1 : 0) - (isCommittee(a) ? 1 : 0) || a.name.localeCompare(b.name));
    const out: { m: MinistryRow; sub: boolean }[] = [];
    tops.forEach((t) => {
      out.push({ m: t, sub: false });
      ministries.filter((s) => s.parentMinistryId === t.id).sort((a, b) => a.name.localeCompare(b.name)).forEach((s) => out.push({ m: s, sub: true }));
    });
    const q = listSearch.trim().toLowerCase();
    return q ? out.filter(({ m }) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) : out;
  }, [ministries, listSearch]);

  const hasCommittee = ministries.some(isCommittee);
  const selected = ministries.find((m) => m.id === selectedId) || ordered[0]?.m || null;

  useEffect(() => { setChecked([]); setMemberSearch(""); }, [selected?.id]);

  const ministryRef = (m: MinistryRow) =>
    m.source === "legacy" ? doc(db, "churchMinistries", m.id) : doc(db, "churches", churchId, "ministries", m.id);

  // Positions first (President, VP, Secretary), then everyone else A-Z.
  const assigned = useMemo(() => {
    if (!selected) return [];
    const posOf = (id: string) =>
      id === selected.leaderId ? 0 : id === selected.vicePresidentId ? 1 : id === selected.secretaryId ? 2 : 3;
    const rows = selected.memberIds.map((id) => memberById.get(id)).filter((m): m is MemberLite => !!m);
    rows.sort((a, b) => posOf(a.id) - posOf(b.id) || a.fullName.localeCompare(b.fullName));
    const q = memberSearch.trim().toLowerCase();
    return q ? rows.filter((m) => m.fullName.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q)) : rows;
  }, [selected, memberById, memberSearch]);

  const positionTitle = (id: string): string => {
    if (!selected) return "";
    if (id === selected.leaderId) return "President";
    if (id === selected.vicePresidentId) return "Vice-President";
    if (id === selected.secretaryId) return "Secretary";
    return "";
  };

  // --- Actions ------------------------------------------------------------

  async function setPosition(pos: typeof POSITIONS[number], memberId: string) {
    if (!selected) return;
    const name = memberId ? memberById.get(memberId)?.fullName || null : null;
    const nextIds = memberId && !selected.memberIds.includes(memberId) ? [...selected.memberIds, memberId] : selected.memberIds;
    const update: Record<string, unknown> = {
      [pos.idField]: memberId || null,
      [pos.nameField]: name,
      memberIds: nextIds,
      memberCount: nextIds.length,
      updatedAt: Date.now(),
    };
    // One person holds only one position in a ministry.
    POSITIONS.forEach((other) => {
      if (other.key !== pos.key && memberId && (selected as any)[other.idField] === memberId) {
        update[other.idField] = null;
        update[other.nameField] = null;
      }
    });
    try {
      await updateDoc(ministryRef(selected), update);
      setNote({ kind: "ok", text: pos.label + (name ? ": " + name : " cleared") + "." });
    } catch (e) {
      console.error(e);
      setNote({ kind: "err", text: "Could not save the position. Please try again." });
    }
  }

  async function addMembers() {
    if (!selected || addPicked.length === 0) return;
    const nextIds = Array.from(new Set([...selected.memberIds, ...addPicked]));
    try {
      await updateDoc(ministryRef(selected), { memberIds: nextIds, memberCount: nextIds.length, updatedAt: Date.now() });
      setNote({ kind: "ok", text: addPicked.length + " member" + (addPicked.length === 1 ? "" : "s") + " added to " + selected.name + "." });
      setAddOpen(false);
      setAddPicked([]);
      setAddSearch("");
    } catch (e) {
      console.error(e);
      setNote({ kind: "err", text: "Could not add the members. Please try again." });
    }
  }

  async function removeChecked() {
    if (!selected || checked.length === 0) return;
    const names = checked.map((id) => memberById.get(id)?.fullName || "member");
    const ok = confirm("Remove " + (names.length === 1 ? names[0] : names.length + " members") + " from " + selected.name + "?\nThey stay members of the church.");
    if (!ok) return;
    const nextIds = selected.memberIds.filter((id) => !checked.includes(id));
    const update: Record<string, unknown> = { memberIds: nextIds, memberCount: nextIds.length, updatedAt: Date.now() };
    POSITIONS.forEach((p) => {
      if (checked.includes((selected as any)[p.idField])) { update[p.idField] = null; update[p.nameField] = null; }
    });
    try {
      await updateDoc(ministryRef(selected), update);
      setNote({ kind: "ok", text: names.length + " member" + (names.length === 1 ? "" : "s") + " removed from " + selected.name + "." });
      setChecked([]);
    } catch (e) {
      console.error(e);
      setNote({ kind: "err", text: "Could not remove the members. Please try again." });
    }
  }

  function openCreate(prefill?: Partial<FormValues>) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, ...prefill });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(m: MinistryRow) {
    setEditing(m);
    setForm({
      name: m.name, description: m.description, category: m.category, status: m.status,
      meetingSchedule: m.meetingSchedule || "", parentMinistryId: m.parentMinistryId,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function saveForm() {
    if (!uid || !churchId) return;
    if (!form.name.trim()) { setFormError("Ministry name is required."); return; }
    if (editing && form.parentMinistryId === editing.id) { setFormError("A ministry cannot be its own parent."); return; }
    const parent = form.parentMinistryId ? ministries.find((m) => m.id === form.parentMinistryId) : null;
    if (parent?.parentMinistryId) { setFormError("Sub-ministries can't have their own sub-ministries."); return; }
    setSaving(true);
    setFormError(null);
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      status: form.status,
      meetingSchedule: form.meetingSchedule.trim() || null,
      parentMinistryId: form.parentMinistryId,
      parentMinistryName: parent?.name ?? null,
      updatedAt: Date.now(),
    };
    try {
      if (editing) {
        await updateDoc(ministryRef(editing), data);
      } else {
        const ref = await addDoc(collection(db, "churches", churchId, "ministries"), {
          ...data,
          organizerId: uid,
          churchId,
          leaderId: null, leaderName: null,
          vicePresidentId: null, vicePresidentName: null,
          secretaryId: null, secretaryName: null,
          memberIds: [], memberCount: 0,
          createdAt: Date.now(),
        });
        setSelectedId(ref.id);
      }
      setFormOpen(false);
    } catch (e) {
      console.error(e);
      setFormError("Something went wrong while saving. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMinistry(m: MinistryRow) {
    const subs = ministries.filter((s) => s.parentMinistryId === m.id).length;
    const warning = subs > 0
      ? '"' + m.name + '" has ' + subs + " sub-ministr" + (subs === 1 ? "y" : "ies") + ". They will not be deleted but will become unassigned. Continue?"
      : 'Delete "' + m.name + '"? The members stay in the church. This cannot be undone.';
    if (!confirm(warning)) return;
    try {
      await deleteDoc(ministryRef(m));
      setSelectedId(null);
      setNote({ kind: "ok", text: '"' + m.name + '" deleted.' });
    } catch (e) {
      console.error(e);
      setNote({ kind: "err", text: "Unable to delete this ministry. Please try again." });
    }
  }

  const addCandidates = useMemo(() => {
    if (!selected) return [];
    const q = addSearch.trim().toLowerCase();
    return members
      .filter((m) => !selected.memberIds.includes(m.id))
      .filter((m) => !q || m.fullName.toLowerCase().includes(q) || (m.email || "").toLowerCase().includes(q));
  }, [members, selected, addSearch]);

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const allChecked = assigned.length > 0 && assigned.every((m) => checked.includes(m.id));
  const initial = (name: string) => (name.trim()[0] || "M").toUpperCase();

  // --- Render -------------------------------------------------------------

  return (
    <div className="mn-shell">
      <ChurchUiStyles />
      <style>{PAGE_CSS}</style>
      <ChurchSidebar churchId={churchId} />

      <div className="mn-main">
        <div className="mn-inner">
          <ChurchPageHeader
            churchId={churchId}
            title="Ministries"
            subtitle="Organize your ministries and the people who serve in them."
            description="Assign a President, Vice-President and Secretary, and manage each ministry's members."
            breadcrumb="Ministries"
            illustration="members"
            primaryAction={{ label: "New Ministry", icon: "+", onClick: () => openCreate() }}
            secondaryAction={!hasCommittee && !loading ? { label: "Create Church Committee", onClick: () => openCreate({ name: COMMITTEE, category: COMMITTEE }) } : undefined}
          />

          {note ? (
            <div className={"mn-note " + (note.kind === "ok" ? "mn-ok" : "mn-err")} role="status">
              <span>{note.text}</span>
              <button type="button" onClick={() => setNote(null)} aria-label="Dismiss">&times;</button>
            </div>
          ) : null}

          {loading ? (
            <div className="mn-card" style={{ textAlign: "center", color: "#68758A" }}>Loading ministries...</div>
          ) : ministries.length === 0 ? (
            <ChurchEmptyState
              title="No ministries yet"
              text="Create your first ministry, or start with the Church Committee."
              actionLabel="+ New Ministry"
              onAction={() => openCreate()}
            />
          ) : (
            <div className="mn-layout">
              {/* Left: all ministries */}
              <aside className="mn-card">
                <h2>All ministries ({ministries.length})</h2>
                <div style={{ marginTop: 10 }}>
                  <ChurchSearchBar value={listSearch} onChange={setListSearch} placeholder="Search ministries..." />
                </div>
                <div className="mn-list">
                  {ordered.map(({ m, sub }) => (
                    <button
                      key={m.id}
                      type="button"
                      className={"mn-item" + (sub ? " is-sub" : "") + (selected?.id === m.id ? " is-active" : "") + (isCommittee(m) ? " mn-committee" : "")}
                      onClick={() => setSelectedId(m.id)}
                    >
                      <span className="mn-dot">{initial(m.name)}</span>
                      <span className="mn-name">
                        {m.name}
                        {isCommittee(m) ? <span className="mn-pin">Committee</span> : null}
                      </span>
                      <span className="mn-count">{m.memberIds.length}</span>
                    </button>
                  ))}
                  {ordered.length === 0 ? <p className="mn-sub">No ministry matches.</p> : null}
                </div>
              </aside>

              {/* Right: selected ministry */}
              {selected ? (
                <section>
                  <div className="mn-card">
                    <div className="mn-card-head" style={{ alignItems: "flex-start" }}>
                      <div>
                        <h2 className="mn-title">{selected.name}</h2>
                        <div className="mn-meta">
                          <span className="mn-pill" style={selected.status === "active" ? { background: "#E2F0CB", color: "#3F6B34" } : { background: "#EEF0F3", color: "#5E6878" }}>
                            {selected.status === "active" ? "Active" : "Inactive"}
                          </span>
                          {selected.category ? <span>{selected.category}</span> : null}
                          {selected.parentMinistryName ? <span>Part of <strong>{selected.parentMinistryName}</strong></span> : null}
                          {selected.meetingSchedule ? <span>Meets: {selected.meetingSchedule}</span> : null}
                          <span>{selected.memberIds.length} member{selected.memberIds.length === 1 ? "" : "s"}</span>
                        </div>
                      </div>
                      <div className="mn-actions">
                        <button type="button" className="mn-btn" onClick={() => openEdit(selected)}>Edit</button>
                        {!selected.parentMinistryId ? (
                          <button type="button" className="mn-btn" onClick={() => openCreate({ parentMinistryId: selected.id })}>+ Sub-ministry</button>
                        ) : null}
                        <button type="button" className="mn-btn mn-btn-danger" onClick={() => deleteMinistry(selected)}>Delete</button>
                      </div>
                    </div>
                    {selected.description ? <p className="mn-desc">{selected.description}</p> : null}
                  </div>

                  <div className="mn-card">
                    <div className="mn-card-head">
                      <div>
                        <h2>Leadership</h2>
                        <p className="mn-sub">Choose a member for each position. They are added to the ministry automatically.</p>
                      </div>
                    </div>
                    <div className="mn-positions">
                      {POSITIONS.map((pos) => {
                        const holderId = ((selected as any)[pos.idField] as string | null) || "";
                        const holder = holderId ? memberById.get(holderId) : undefined;
                        return (
                          <div key={pos.key} className="mn-pos">
                            <label htmlFor={"pos-" + pos.key}>{pos.label}</label>
                            <div className="mn-pos-who">
                              {holder ? (
                                <>
                                  <ChurchAvatar name={holder.fullName} photoUrl={holder.photoUrl} size={36} />
                                  <span className="mn-pos-name">{holder.fullName}</span>
                                </>
                              ) : <span className="mn-pos-empty">Not assigned</span>}
                            </div>
                            <select
                              id={"pos-" + pos.key}
                              className={"mn-input" + (holderId ? " is-set" : "")}
                              value={holderId}
                              onChange={(e) => setPosition(pos, e.target.value)}
                            >
                              <option value="">Not assigned</option>
                              {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mn-card">
                    <div className="mn-card-head">
                      <div>
                        <h2>Members</h2>
                        <p className="mn-sub">Check members, then Remove. Use Add to bring in more members.</p>
                      </div>
                    </div>
                    <div className="mn-mtools">
                      <ChurchSearchBar value={memberSearch} onChange={setMemberSearch} placeholder="Search this ministry's members..." />
                      <button type="button" className="mn-btn mn-btn-gold" onClick={() => { setAddPicked([]); setAddSearch(""); setAddOpen(true); }}>+ Add</button>
                      <button type="button" className="mn-btn mn-btn-danger" disabled={checked.length === 0} onClick={removeChecked}>
                        Remove{checked.length ? " (" + checked.length + ")" : ""}
                      </button>
                    </div>

                    {selected.memberIds.length === 0 ? (
                      <p className="mn-sub" style={{ padding: "18px 0", textAlign: "center" }}>No members in this ministry yet. Click <strong>+ Add</strong>.</p>
                    ) : (
                      <div className="mn-rows">
                        <div className="mn-row mn-row-head">
                          <input
                            type="checkbox"
                            className="mn-check"
                            aria-label="Select all"
                            checked={allChecked}
                            onChange={() => setChecked(allChecked ? [] : assigned.map((m) => m.id))}
                          />
                          <span>Member</span>
                          <span>Position</span>
                        </div>
                        {assigned.map((m) => {
                          const title = positionTitle(m.id);
                          const isChecked = checked.includes(m.id);
                          return (
                            <div key={m.id} className={"mn-row" + (isChecked ? " is-checked" : "")} onClick={() => setChecked((c) => toggle(c, m.id))}>
                              <input type="checkbox" className="mn-check" aria-label={"Select " + m.fullName} checked={isChecked} onChange={() => setChecked((c) => toggle(c, m.id))} onClick={(e) => e.stopPropagation()} />
                              <div className="mn-who">
                                <ChurchAvatar name={m.fullName} photoUrl={m.photoUrl} size={34} />
                                <div style={{ minWidth: 0 }}>
                                  <p className="mn-who-name">{m.fullName}</p>
                                  <p className="mn-who-sub">{m.role || m.email || ""}</p>
                                </div>
                              </div>
                              <span className={"mn-badge" + (title ? " is-pos" : "")}>{title || "Member"}</span>
                            </div>
                          );
                        })}
                        {assigned.length === 0 ? <p className="mn-sub" style={{ padding: 14 }}>No member matches.</p> : null}
                      </div>
                    )}
                  </div>

                  {!selected.parentMinistryId && ministries.some((s) => s.parentMinistryId === selected.id) ? (
                    <div className="mn-card">
                      <h2 style={{ marginBottom: 10 }}>Sub-ministries</h2>
                      <div className="mn-subs">
                        {ministries.filter((s) => s.parentMinistryId === selected.id).map((s) => (
                          <button key={s.id} type="button" className="mn-btn" onClick={() => setSelectedId(s.id)}>
                            {s.name} &middot; {s.memberIds.length}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}

          <div className="mn-footer">
            Powered by UNIMUNITY&trade; &middot; A product of Ma Production Luxenn Zara LLC &middot; &copy; 2026 All Rights Reserved &middot; v1.0.0
          </div>
        </div>
      </div>

      {/* Add members */}
      {addOpen && selected ? (
        <div className="mn-modal-bg" onClick={() => setAddOpen(false)}>
          <div className="mn-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Add members to {selected.name}</h3>
            <p>Check the members to add. Only church members not already in this ministry are listed.</p>
            <ChurchSearchBar value={addSearch} onChange={setAddSearch} placeholder="Search by name or email..." />
            <div className="mn-pick">
              {addCandidates.length === 0 ? (
                <p className="mn-sub" style={{ padding: 14 }}>
                  {members.length === 0 ? "No church members yet. Add members first." : "Everyone matching is already in this ministry."}
                </p>
              ) : addCandidates.map((m) => {
                const isPicked = addPicked.includes(m.id);
                return (
                  <div key={m.id} className={"mn-row" + (isPicked ? " is-checked" : "")} onClick={() => setAddPicked((p) => toggle(p, m.id))}>
                    <input type="checkbox" className="mn-check" aria-label={"Add " + m.fullName} checked={isPicked} onChange={() => setAddPicked((p) => toggle(p, m.id))} onClick={(e) => e.stopPropagation()} />
                    <div className="mn-who">
                      <ChurchAvatar name={m.fullName} photoUrl={m.photoUrl} size={32} />
                      <div style={{ minWidth: 0 }}>
                        <p className="mn-who-name">{m.fullName}</p>
                        <p className="mn-who-sub">{m.role || m.email || ""}</p>
                      </div>
                    </div>
                    <span />
                  </div>
                );
              })}
            </div>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button type="button" className="mn-btn mn-btn-gold" disabled={addPicked.length === 0} onClick={addMembers}>
                Add {addPicked.length ? addPicked.length + " " : ""}member{addPicked.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create / edit ministry */}
      {formOpen ? (
        <div className="mn-modal-bg" onClick={() => !saving && setFormOpen(false)}>
          <div className="mn-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? "Edit ministry" : form.parentMinistryId ? "New sub-ministry" : "New ministry"}</h3>
            <p>Positions and members are managed on the ministry page after saving.</p>
            {formError ? <div className="mn-note mn-err">{formError}</div> : null}
            <label className="mn-field"><span>Name *</span>
              <input className="mn-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Men's Ministry" autoFocus />
            </label>
            <label className="mn-field"><span>Category</span>
              <input className={"mn-input" + (form.category ? " is-set" : "")} list="mn-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Pick or type a category" />
              <datalist id="mn-categories">
                <option value={COMMITTEE} />
                {SUGGESTED_MINISTRY_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label className="mn-field"><span>Part of (optional)</span>
              <select className={"mn-input" + (form.parentMinistryId ? " is-set" : "")} value={form.parentMinistryId || ""} onChange={(e) => setForm({ ...form, parentMinistryId: e.target.value || null })}>
                <option value="">None - main ministry</option>
                {ministries.filter((m) => !m.parentMinistryId && m.id !== editing?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="mn-field"><span>Status</span>
              <select className="mn-input is-set" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MinistryStatus })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="mn-field"><span>Meeting schedule</span>
              <input className="mn-input" value={form.meetingSchedule} onChange={(e) => setForm({ ...form, meetingSchedule: e.target.value })} placeholder="e.g. Every Saturday, 5 PM" />
            </label>
            <label className="mn-field"><span>Description</span>
              <textarea className="mn-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
            </label>
            <div className="mn-modal-actions">
              <button type="button" className="mn-btn" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
              <button type="button" className="mn-btn mn-btn-gold" onClick={saveForm} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
