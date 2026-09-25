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
//
// All style objects are plain named consts defined OUTSIDE the JSX (not
// inline multi-line objects inside tags) to avoid a Turbopack parser quirk
// seen in this project with certain inline style-object patterns.

import { useEffect, useState, type ReactNode } from "react";
import type { CSSProperties } from "react";

interface ChurchPageHeaderProps {
  churchId: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const topRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  flexWrap: "wrap",
  gap: 10,
};

const backLinkStyle: CSSProperties = {
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
};

const chipsRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const dateChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11.5,
  fontWeight: 600,
  color: "#B4577A",
  background: "#FDE2E4",
  padding: "5px 12px",
  borderRadius: 999,
};

const timeChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11.5,
  fontWeight: 600,
  color: "#5A8A5F",
  background: "#E2F0CB",
  padding: "5px 12px",
  borderRadius: 999,
};

const weatherChipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11.5,
  fontWeight: 600,
  color: "#8A6D1F",
  background: "#F6EFDD",
  padding: "5px 12px",
  borderRadius: 999,
};

const titleBlockBaseStyle: CSSProperties = {
  textAlign: "center",
  transition: "opacity 0.5s ease, transform 0.5s ease",
};

const h1Style: CSSProperties = {
  margin: "0 0 6px",
  fontSize: 26,
  fontWeight: 800,
  color: "#24324A",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#68758A",
};

const actionsRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: 16,
};

const wrapperStyle: CSSProperties = { marginBottom: 24 };

const BACK_LABEL = String.fromCharCode(0x2190) + " Dashboard";
const CALENDAR_ICON = String.fromCodePoint(0x1f4c6);
const CLOCK_ICON = String.fromCodePoint(0x1f550);
const WEATHER_ICON = String.fromCodePoint(0x1f324) + String.fromCodePoint(0xfe0f);
const DEGREE = String.fromCharCode(0xb0) + "C";

export default function ChurchPageHeader({ churchId, title, subtitle, actions }: ChurchPageHeaderProps) {
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [temp, setTemp] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          const url = "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude + "&current=temperature_2m";
          const res = await fetch(url);
          const data = await res.json();
          if (data && data.current && data.current.temperature_2m != null) {
            setTemp(Math.round(data.current.temperature_2m));
          }
        } catch (err) {
          // Weather is a nice-to-have — silently skip on any failure.
        }
      },
      () => {
        // Permission denied or unavailable — silently skip.
      },
      { timeout: 5000 }
    );
  }, []);

  const dateStr = now ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";
  const timeStr = now ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";

  const titleBlockStyle: CSSProperties = {
    ...titleBlockBaseStyle,
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(-10px)",
  };

  const backHref = "/dashboard/church/" + churchId;

  return (
    <div style={wrapperStyle}>
      <div style={topRowStyle}>
        <a href={backHref} style={backLinkStyle}>{BACK_LABEL}</a>

        <div style={chipsRowStyle}>
          {dateStr ? <span style={dateChipStyle}>{CALENDAR_ICON + " " + dateStr}</span> : null}
          {timeStr ? <span style={timeChipStyle}>{CLOCK_ICON + " " + timeStr}</span> : null}
          {temp !== null ? <span style={weatherChipStyle}>{WEATHER_ICON + " " + temp + DEGREE}</span> : null}
        </div>
      </div>

      <div style={titleBlockStyle}>
        <h1 style={h1Style}>{title}</h1>
        {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
      </div>

      {actions ? <div style={actionsRowStyle}>{actions}</div> : null}
    </div>
  );
}
