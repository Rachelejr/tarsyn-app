"use client";

// src/components/church/ChurchPageHeader.tsx
//
// Shared page header for every Church module page (UNIMUNITY design system).
//
// Structure:
//   1. Light top row: small breadcrumb (home icon + page) on the left,
//      live date / time / temperature chips on the right.
//   2. Rounded pastel banner, everything centered: church logo, title
//      (revealed left to right on load, with a small gold rule growing
//      under it), subtitle, optional description and optional actions.
//      No drawings or illustrations in headers.
//   Temperature is always shown (device location, else the church city,
//   else New York); date / time / temperature chips are bold italic.
//
// The church's OWN logo (churches/{churchId}.logoUrl) is shown in the
// banner next to the title on every page, and on printouts. If the church
// has no logo yet, nothing is shown (never the UNIMUNITY logo).
//
// Backward compatible: pages that still pass only { churchId, title,
// subtitle, actions } keep working and simply get the new banner.
//
// New optional props:
//   description      - one extra line under the subtitle
//   breadcrumb       - label shown after the home icon (defaults to title),
//                      or an array of { label, href } for deeper pages
//   illustration     - accepted for compatibility, ignored (no drawings)
//   primaryAction    - { label, onClick?, href?, icon? } or a ReactNode
//   secondaryAction  - same shape, rendered as a white outlined button
//   compact          - smaller banner (for "coming soon" pages)
//
// Style rules for this project: style objects are named consts defined
// OUTSIDE the JSX (Turbopack parser quirk), responsive rules live in one
// CSS string injected with a <style> tag, and the file is plain ASCII
// (special characters are built with String.fromCodePoint).

import { useEffect, useState, isValidElement, type ReactNode } from "react";
import type { CSSProperties } from "react";
import { useChurchBrand } from "@/components/church/useChurchBrand";

export type HeaderAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: string;
};

export type BreadcrumbItem = { label: string; href?: string };

export type HeaderIllustration = "finance" | "reports" | "members" | "none" | ReactNode;

interface ChurchPageHeaderProps {
  churchId: string;
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumb?: string | BreadcrumbItem[];
  illustration?: HeaderIllustration;
  primaryAction?: HeaderAction | ReactNode;
  secondaryAction?: HeaderAction | ReactNode;
  /** Legacy slot, still supported. Rendered after the other actions. */
  actions?: ReactNode;
  compact?: boolean;
}

const PALETTE = {
  pink: "#FDE2E4",
  cream: "#F6EFDD",
  green: "#E2F0CB",
  gold: "#D8B15A",
  goldDeep: "#B8913F",
  goldText: "#8A6D1F",
  text: "#24324A",
  textSoft: "#68758A",
};

const HEADER_CSS = `
.cph { margin-bottom: 24px; }
.cph-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.cph-crumbs { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: ${PALETTE.textSoft}; min-width: 0; }
.cph-crumbs a { color: ${PALETTE.textSoft}; text-decoration: none; display: inline-flex; align-items: center; border-radius: 6px; }
.cph-crumbs a:hover { color: ${PALETTE.text}; }
.cph-crumbs a:focus-visible { outline: 2px solid ${PALETTE.gold}; outline-offset: 2px; }
.cph-crumb { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.cph-crumb-current { color: ${PALETTE.text}; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cph-sep { color: #C5CBD5; }
.cph-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.cph-chip { font-size: 11.5px; font-weight: 700; font-style: italic; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.75); border: 1px solid rgba(216,177,90,0.25); color: ${PALETTE.textSoft}; white-space: nowrap; }

.cph-banner {
  position: relative; overflow: hidden;
  display: block; text-align: center;
  padding: 30px 40px; border-radius: 22px;
  background: linear-gradient(120deg, ${PALETTE.pink} 0%, ${PALETTE.cream} 55%, ${PALETTE.green} 100%);
  border: 1px solid rgba(255,255,255,0.9);
  box-shadow: 0 1px 2px rgba(36,50,74,0.04), 0 8px 24px -12px rgba(184,145,63,0.25);
  opacity: 0; transform: translateY(6px);
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.cph-banner.is-in { opacity: 1; transform: none; }
.cph-banner::after {
  content: ""; position: absolute; right: -60px; top: -80px; width: 260px; height: 260px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%); pointer-events: none;
}
.cph-banner.is-compact { padding: 20px 32px; }
.cph-text { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.cph-text-body { min-width: 0; display: flex; flex-direction: column; align-items: center; }
.cph-logo { flex-shrink: 0; width: 72px; height: 72px; border-radius: 18px; background: #FFFFFF; border: 1px solid rgba(216,177,90,0.3); box-shadow: 0 2px 8px -4px rgba(36,50,74,0.15); display: flex; align-items: center; justify-content: center; padding: 8px; box-sizing: border-box; overflow: hidden; }
.cph-logo img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.cph-banner.is-compact .cph-logo { width: 52px; height: 52px; border-radius: 14px; padding: 6px; }
.cph-title { margin: 0; font-size: clamp(24px, 2.6vw, 34px); line-height: 1.15; font-weight: 800; letter-spacing: -0.015em; color: ${PALETTE.text}; }
.cph-banner.is-in .cph-title { animation: cph-wipe 1s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.cph-rule { display: block; width: 64px; height: 3px; border-radius: 3px; margin: 10px auto 0; background: linear-gradient(90deg, ${PALETTE.gold}, rgba(216,177,90,0)); transform-origin: left center; transform: scaleX(0); }
.cph-banner.is-in .cph-rule { animation: cph-grow 0.8s 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
@keyframes cph-wipe {
  from { clip-path: inset(0 100% 0 0); transform: translateX(-18px); opacity: 0.3; }
  to { clip-path: inset(0 0 0 0); transform: none; opacity: 1; }
}
@keyframes cph-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.cph-banner.is-compact .cph-title { font-size: 22px; }
.cph-subtitle { margin: 10px 0 0; font-size: 15px; font-weight: 600; color: ${PALETTE.text}; opacity: 0.85; }
.cph-desc { margin: 4px 0 0; font-size: 13.5px; line-height: 1.5; color: ${PALETTE.textSoft}; max-width: 620px; }
.cph-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: center; margin-top: 18px; }
.cph-btn {
  display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 10px 18px;
  font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: none; line-height: 1;
  transition: box-shadow 0.15s ease, transform 0.15s ease; font-family: inherit;
}
.cph-btn:focus-visible { outline: 2px solid ${PALETTE.goldDeep}; outline-offset: 2px; }
.cph-btn-primary { background: ${PALETTE.gold}; color: ${PALETTE.text}; border: 1px solid ${PALETTE.gold}; }
.cph-btn-primary:hover { box-shadow: 0 4px 12px -4px rgba(184,145,63,0.6); }
.cph-btn-secondary { background: #FFFFFF; color: ${PALETTE.text}; border: 1px solid rgba(216,177,90,0.45); }
.cph-btn-secondary:hover { border-color: ${PALETTE.gold}; }
.cph-art { position: absolute; z-index: 1; right: 26px; top: 50%; transform: translateY(-50%); width: 150px; height: 120px; }
.cph-art svg { width: 100%; height: 100%; display: block; }

@media (max-width: 640px) {
  .cph-top { flex-direction: column; align-items: flex-start; }
  .cph-banner, .cph-banner.is-compact { padding: 22px 16px; border-radius: 18px; }
  .cph-art { display: none; }
  .cph-logo { width: 56px; height: 56px; border-radius: 14px; padding: 6px; }
  .cph-actions { flex-direction: column; align-items: stretch; width: 100%; }
  .cph-actions > * { width: 100%; }
  .cph-btn { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .cph-banner { transition: none; opacity: 1; transform: none; }
  .cph-banner.is-in .cph-title, .cph-banner.is-in .cph-rule { animation: none; transform: none; clip-path: none; }
}
@media print {
  .cph-top, .cph-actions, .cph-art { display: none !important; }
  .cph-logo { box-shadow: none !important; }
  .cph-banner { background: #FFFFFF !important; box-shadow: none !important; border: 1px solid #ccc !important; opacity: 1 !important; transform: none !important; }
}
`;

const CALENDAR_ICON = String.fromCodePoint(0x1f4c5);
const CLOCK_ICON = String.fromCodePoint(0x1f550);
const WEATHER_ICON = String.fromCodePoint(0x2600) + String.fromCodePoint(0xfe0f);
const DEGREE = String.fromCharCode(0xb0);

const homeIconStyle: CSSProperties = { display: "block" };

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={homeIconStyle}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function isActionConfig(a: unknown): a is HeaderAction {
  return !!a && typeof a === "object" && !isValidElement(a) && "label" in (a as Record<string, unknown>);
}

function ActionButton({ action, kind }: { action: HeaderAction | ReactNode; kind: "primary" | "secondary" }) {
  if (!isActionConfig(action)) return <>{action}</>;
  const cls = "cph-btn " + (kind === "primary" ? "cph-btn-primary" : "cph-btn-secondary");
  const content = (
    <>
      {action.icon ? <span aria-hidden="true">{action.icon}</span> : null}
      <span>{action.label}</span>
    </>
  );
  if (action.href) {
    return <a href={action.href} className={cls} onClick={action.onClick}>{content}</a>;
  }
  return <button type="button" className={cls} onClick={action.onClick}>{content}</button>;
}

// Headers carry no drawings (decision of Sept 29): the banner shows only
// the church logo, title, subtitle, description and actions. The
// `illustration` prop is still accepted so existing pages keep compiling,
// but it is ignored.
function renderIllustration(_illustration: HeaderIllustration | undefined): ReactNode {
  return null;
}

export default function ChurchPageHeader({
  churchId,
  title,
  subtitle,
  description,
  breadcrumb,
  illustration,
  primaryAction,
  secondaryAction,
  actions,
  compact,
}: ChurchPageHeaderProps) {
  const brand = useChurchBrand(churchId);
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F");

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Temperature is always shown. Source, in order: the device location
  // (if the browser allows it), else the church's own city (from its
  // profile), else New York. Cached 30 min for the whole session.
  // Fahrenheit for US churches, Celsius elsewhere.
  useEffect(() => {
    if (!brand.loaded) return;
    const country = (brand.country || "").toLowerCase();
    const useF = !country || /united states|^usa?$|u\.s\./.test(country);
    const unitParam = useF ? "fahrenheit" : "celsius";
    const cacheKey = "UNIMUNITY_church_weather_" + unitParam;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Date.now() - parsed.ts < 30 * 60 * 1000) {
          setTemp(parsed.temp);
          setTempUnit(useF ? "F" : "C");
          return;
        }
      }
    } catch (e) {
      // ignore cache problems
    }

    let cancelled = false;
    const fetchAt = async (lat: number, lon: number) => {
      try {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current=temperature_2m&temperature_unit=" + unitParam;
        const res = await fetch(url);
        const data = await res.json();
        const t = Math.round(data && data.current ? data.current.temperature_2m : NaN);
        if (!cancelled && !isNaN(t)) {
          setTemp(t);
          setTempUnit(useF ? "F" : "C");
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ temp: t, ts: Date.now() })); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        // Weather is a nice-to-have: never block the page.
      }
    };
    const fallback = async () => {
      if (brand.city) {
        try {
          const g = await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(brand.city));
          const gd = await g.json();
          const hit = gd && gd.results && gd.results[0];
          if (hit) { fetchAt(hit.latitude, hit.longitude); return; }
        } catch (e) {
          // fall through to the default city
        }
      }
      fetchAt(40.7128, -74.006);
    };

    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchAt(pos.coords.latitude, pos.coords.longitude),
        () => { fallback(); },
        { timeout: 5000 }
      );
    } else {
      fallback();
    }
    return () => { cancelled = true; };
  }, [brand.loaded, brand.city, brand.country]);

  const dateStr = now ? now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "";
  const timeStr = now ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";

  const homeHref = "/dashboard/church/" + churchId;
  const crumbs: BreadcrumbItem[] = Array.isArray(breadcrumb)
    ? breadcrumb
    : [{ label: breadcrumb || title }];

  const art = renderIllustration(illustration);
  const hasActions = !!primaryAction || !!secondaryAction || !!actions;
  const bannerClass = "cph-banner" + (visible ? " is-in" : "") + (compact ? " is-compact" : "");

  return (
    <header className="cph">
      <style>{HEADER_CSS}</style>

      <div className="cph-top">
        <nav className="cph-crumbs" aria-label="Breadcrumb">
          <a href={homeHref} aria-label="Church dashboard"><HomeIcon /></a>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={c.label + i} className="cph-crumb">
                <span className="cph-sep" aria-hidden="true">/</span>
                {c.href && !last
                  ? <a href={c.href}>{c.label}</a>
                  : <span className="cph-crumb-current" aria-current={last ? "page" : undefined}>{c.label}</span>}
              </span>
            );
          })}
        </nav>

        <div className="cph-chips">
          {dateStr ? <span className="cph-chip">{CALENDAR_ICON + " " + dateStr}</span> : null}
          {timeStr ? <span className="cph-chip">{CLOCK_ICON + " " + timeStr}</span> : null}
          {temp !== null ? <span className="cph-chip">{WEATHER_ICON + " " + temp + DEGREE + tempUnit}</span> : null}
        </div>
      </div>

      <div className={bannerClass}>
        <div className="cph-text">
          {brand.logoUrl ? (
            <div className="cph-logo">
              <img src={brand.logoUrl} alt={(brand.name || "Church") + " logo"} />
            </div>
          ) : null}
          <div className="cph-text-body">
            <h1 className="cph-title">{title}</h1>
            <span className="cph-rule" aria-hidden="true" />
            {subtitle ? <p className="cph-subtitle">{subtitle}</p> : null}
            {description ? <p className="cph-desc">{description}</p> : null}
            {hasActions ? (
              <div className="cph-actions">
                {primaryAction ? <ActionButton action={primaryAction} kind="primary" /> : null}
                {secondaryAction ? <ActionButton action={secondaryAction} kind="secondary" /> : null}
                {actions}
              </div>
            ) : null}
          </div>
        </div>
        {art ? <div className="cph-art">{art}</div> : null}
      </div>
    </header>
  );
}
