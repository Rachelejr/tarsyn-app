"use client";

// src/components/church/useChurchMinistries.ts
//
// One place to read every ministry of a church, wherever it is stored:
//   churches/{churchId}/ministries   (current place)
//   churchMinistries                 (older flat collection)
// and to answer "which ministries is this member in, and with which
// position?" (President / Vice-President / Secretary / Member).
// Used by the Dashboard, the Members list (ministry filter) and the
// member profile.

import { useEffect, useMemo, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

export interface ChurchMinistryLite {
  id: string;
  name: string;
  category: string;
  parentMinistryId: string | null;
  memberIds: string[];
  leaderId: string | null;
  vicePresidentId: string | null;
  secretaryId: string | null;
  source: "church" | "legacy";
}

export interface MemberMinistry {
  ministryId: string;
  name: string;
  position: "President" | "Vice-President" | "Secretary" | "Member";
}

function toLite(id: string, x: Record<string, any>, source: "church" | "legacy"): ChurchMinistryLite {
  return {
    id,
    name: x.name || "Ministry",
    category: x.category || "",
    parentMinistryId: x.parentMinistryId ?? null,
    memberIds: Array.isArray(x.memberIds) ? x.memberIds : [],
    leaderId: x.leaderId ?? null,
    vicePresidentId: x.vicePresidentId ?? null,
    secretaryId: x.secretaryId ?? null,
    source,
  };
}

export function useChurchMinistries(churchId: string | undefined | null) {
  const [uid, setUid] = useState<string | null>(null);
  const [fromChurch, setFromChurch] = useState<ChurchMinistryLite[]>([]);
  const [fromLegacy, setFromLegacy] = useState<ChurchMinistryLite[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(collection(db, "churches", churchId, "ministries"), (snap) => {
      setFromChurch(snap.docs.map((d) => toLite(d.id, d.data(), "church")));
    }, (err) => console.error("Ministries:", err));
    return () => unsub();
  }, [churchId]);

  useEffect(() => {
    if (!churchId || !uid) return;
    const q = query(collection(db, "churchMinistries"), where("organizerId", "==", uid), where("churchId", "==", churchId));
    const unsub = onSnapshot(q, (snap) => {
      setFromLegacy(snap.docs.map((d) => toLite(d.id, d.data(), "legacy")));
    }, (err) => console.error("Ministries (older collection):", err));
    return () => unsub();
  }, [churchId, uid]);

  const ministries = useMemo(() => {
    const byId = new Map<string, ChurchMinistryLite>();
    [...fromChurch, ...fromLegacy].forEach((m) => { if (!byId.has(m.id)) byId.set(m.id, m); });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fromChurch, fromLegacy]);

  // memberId -> ministries (with position), positions listed first.
  const byMember = useMemo(() => {
    const map = new Map<string, MemberMinistry[]>();
    const add = (memberId: string, entry: MemberMinistry) => {
      const list = map.get(memberId) || [];
      if (!list.some((e) => e.ministryId === entry.ministryId)) list.push(entry);
      map.set(memberId, list);
    };
    ministries.forEach((m) => {
      const pos = (id: string): MemberMinistry["position"] =>
        id === m.leaderId ? "President" : id === m.vicePresidentId ? "Vice-President" : id === m.secretaryId ? "Secretary" : "Member";
      const ids = new Set<string>(m.memberIds);
      [m.leaderId, m.vicePresidentId, m.secretaryId].forEach((id) => { if (id) ids.add(id); });
      ids.forEach((id) => add(id, { ministryId: m.id, name: m.name, position: pos(id) }));
    });
    const rank = { President: 0, "Vice-President": 1, Secretary: 2, Member: 3 } as const;
    map.forEach((list) => list.sort((a, b) => rank[a.position] - rank[b.position] || a.name.localeCompare(b.name)));
    return map;
  }, [ministries]);

  return { ministries, byMember };
}

export function describeMinistry(e: MemberMinistry): string {
  return e.position === "Member" ? e.name : e.position + " \u2013 " + e.name;
}
