"use client";

// src/components/church/ChurchPageHeader.tsx
//
// Shared header for every Church module page (Ministries, Families, Events,
// and every future section). Built once so new pages just import this
// instead of re-implementing a header each time.
//
//  - Centered title with a gentle fade/slide-in animation on mount.
//  - Live date + time (browser clock, no API needed).
//  - Live temperature via Open-Meteo (free, no API key) using the visitor's
//    browser geolocation. If location is denied or unavailable, the
//    temperature is simply omitted — never blocks or errors the page.
//  - A "Back to Dashboard" link.
//  - Optional `actions` slot (e.g. the "+ New X" button), centered below
//    the subtitle.

import { useEffect, useState, type ReactNode } from "react";

interface ChurchPageHeaderProps {
  churchId: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function ChurchPageHeader({ churchId, title, subtitle, actions }: ChurchPageHeaderProps) {
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [temp, setTemp] = useState<number | null>(null);

  // Animation: fade/slide the title in shortly after mount.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Live clock.
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Weather — best-effort only, never blocks the page.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`
          );
          const data = await res.json();
          if (data?.current?.temperature_2m != null) {
            setTemp(Math.round(data.current.temperature_2m));
          }
        } catch {
          // Weather is a nice-to-have — silently skip on any failure.
        }
      },
      () => {
        // Permission denied or unavailable — silently skip.
      },
      { timeout: 5000 }
    );
  }, []);

  const dateStr = now
    ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "";
  const timeStr = now
    ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}>
        
          href={`/dashboard/church/${churchId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 700,
            color: "#8A6D1F",
            textDecoration: "none",
            background: "rgba(216,177,90,0.14)",
            padding: "6px 12px",
            borderRadius: 999,
          }}>
          {"\u2190 Dashboard"}
        </a>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {dateStr && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                color: "#B4577A",
                background: "#FDE2E4",
                padding: "5px 12px",
                borderRadius: 999,
              }}>
              {"\u{1F4C6} "}{dateStr}
            </span>
          )}
          {timeStr && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                color: "#5A8A5F",
                background: "#E2F0CB",
                padding: "5px 12px",
                borderRadius: 999,
              }}>
              {"\u{1F550} "}{timeStr}
            </span>
          )}
          {temp !== null && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 600,
                color: "#8A6D1F",
                background: "#F6EFDD",
                padding: "5px 12px",
                borderRadius: 999,
              }}>
              {"\u{1F324}\uFE0F "}{temp}{"\u00B0C"}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "#24324A" }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: 14, color: "#68758A" }}>{subtitle}</p>}
      </div>

      {actions && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>{actions}</div>
      )}
    </div>
  );
}
