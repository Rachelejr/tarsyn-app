"use client";

// src/components/church/useChurchBrand.tsx
//
// One place to read a church's own identity (name + logo) from
// churches/{churchId}. Every Church screen, printed report and receipt
// shows the CHURCH's logo, not UNIMUNITY's: UNIMUNITY is only the tool the
// institution uses to manage its community.
//
// The logo is the same `logoUrl` field the Church sidebar already reads.
// Live (onSnapshot), so a logo changed in settings appears everywhere
// without a reload.

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ChurchBrand {
  name: string;
  logoUrl: string;
  city: string;
  country: string;
  loaded: boolean;
}

export function useChurchBrand(churchId: string | undefined | null): ChurchBrand {
  const [brand, setBrand] = useState<ChurchBrand>({ name: "", logoUrl: "", city: "", country: "", loaded: false });

  useEffect(() => {
    if (!churchId) return;
    const unsub = onSnapshot(
      doc(db, "churches", churchId),
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setBrand({
          name: ((data as any).name as string) || ((data as any).churchName as string) || "",
          logoUrl: ((data as any).logoUrl as string) || "",
          city: ((data as any).city as string) || "",
          country: ((data as any).country as string) || "",
          loaded: true,
        });
      },
      (err) => {
        console.error("Could not load church brand:", err);
        setBrand((b) => ({ ...b, loaded: true }));
      }
    );
    return () => unsub();
  }, [churchId]);

  return brand;
}

const imgBase: CSSProperties = { display: "block", objectFit: "contain", maxWidth: "100%" };

// Church logo image. Renders nothing when the church has no logo yet, so a
// page never falls back to the UNIMUNITY logo in the church's own space.
export function ChurchLogo({ logoUrl, name, height = 56, style }: {
  logoUrl: string;
  name?: string;
  height?: number;
  style?: CSSProperties;
}) {
  if (!logoUrl) return null;
  const s: CSSProperties = { ...imgBase, height, width: "auto", ...style };
  return <img src={logoUrl} alt={name ? name + " logo" : "Church logo"} style={s} />;
}
