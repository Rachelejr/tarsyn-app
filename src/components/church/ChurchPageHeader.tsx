"use client";

// src/components/church/ChurchPageHeader.tsx
//
// Shared page header for every Church module page (UNIMUNITY design system).
//
// Structure:
//   1. Light top row: small breadcrumb (home icon + page) on the left,
//      live date / time / temperature chips on the right.
//   2. Rounded pastel banner: title, short subtitle, optional description,
//      optional primary + secondary actions, and a small line illustration
//      on the right side.
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
//   illustration     - "finance" | "reports" | "members" | "none" | any ReactNode
//                      (decorations are botanical / abstract only - never
//                      crosses or other religious symbols)
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
.cph-chip { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.75); border: 1px solid rgba(216,177,90,0.25); color: ${PALETTE.textSoft}; white-space: nowrap; }

.cph-banner {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 24px;
  padding: 26px 30px; border-radius: 22px;
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
.cph-banner.is-compact { padding: 18px 24px; }
.cph-text { position: relative; z-index: 1; max-width: 700px; display: flex; gap: 18px; align-items: flex-start; }
.cph-text-body { min-width: 0; }
.cph-logo { flex-shrink: 0; width: 72px; height: 72px; border-radius: 18px; background: #FFFFFF; border: 1px solid rgba(216,177,90,0.3); box-shadow: 0 2px 8px -4px rgba(36,50,74,0.15); display: flex; align-items: center; justify-content: center; padding: 8px; box-sizing: border-box; overflow: hidden; }
.cph-logo img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.cph-banner.is-compact .cph-logo { width: 52px; height: 52px; border-radius: 14px; padding: 6px; }
.cph-title { margin: 0; font-size: clamp(24px, 2.6vw, 32px); line-height: 1.15; font-weight: 800; letter-spacing: -0.015em; color: ${PALETTE.text}; }
.cph-banner.is-compact .cph-title { font-size: 22px; }
.cph-subtitle { margin: 8px 0 0; font-size: 15px; font-weight: 600; color: ${PALETTE.text}; opacity: 0.85; }
.cph-desc { margin: 4px 0 0; font-size: 13.5px; line-height: 1.5; color: ${PALETTE.textSoft}; }
.cph-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 18px; }
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
.cph-art { position: relative; z-index: 1; width: 150px; height: 120px; flex-shrink: 0; }
.cph-art svg { width: 100%; height: 100%; display: block; }

@media (max-width: 900px) {
  .cph-art { width: 110px; height: 90px; }
  .cph-banner { padding: 22px 22px; }
}
@media (max-width: 640px) {
  .cph-top { flex-direction: column; align-items: flex-start; }
  .cph-banner { grid-template-columns: minmax(0, 1fr) 64px; gap: 12px; align-items: start; padding: 20px 18px; border-radius: 18px; }
  .cph-art { width: 64px; height: 56px; }
  .cph-text { gap: 12px; }
  .cph-logo { width: 52px; height: 52px; border-radius: 14px; padding: 6px; }
  .cph-actions { flex-direction: column; align-items: stretch; }
  .cph-actions > * { width: 100%; }
  .cph-btn { justify-content: center; }
}
@media (prefers-reduced-motion: reduce) {
  .cph-banner { transition: none; opacity: 1; transform: none; }
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
const DEGREE = String.fromCharCode(0xb0) + "C";

const homeIconStyle: CSSProperties = { display: "block" };

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={homeIconStyle}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

// Finance: a sprout growing out of a small stack of coins.
function FinanceArt() {
  return (
    <svg viewBox="0 0 150 120" fill="none" aria-hidden="true">
      <circle cx="84" cy="62" r="50" fill="#FFFFFF" opacity="0.55" />
      <ellipse cx="72" cy="98" rx="30" ry="7" fill={PALETTE.cream} stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <path d="M42 98v-8" stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <path d="M102 98v-8" stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <ellipse cx="72" cy="90" rx="30" ry="7" fill="#FFFFFF" stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <path d="M46 90v-8" stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <path d="M98 90v-8" stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <ellipse cx="72" cy="82" rx="26" ry="6" fill={PALETTE.cream} stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <path d="M72 80V44" stroke="#6E9A5B" strokeWidth="2" strokeLinecap="round" />
      <path d="M72 60c-14 0-22-8-22-20 12 0 22 6 22 20Z" fill={PALETTE.green} stroke="#6E9A5B" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M72 52c2-14 12-22 26-22 0 14-10 22-26 22Z" fill={PALETTE.green} stroke="#6E9A5B" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="116" cy="34" r="9" fill={PALETTE.pink} stroke={PALETTE.goldDeep} strokeWidth="1.4" />
      <path d="M116 29v10M113 32h6" stroke={PALETTE.goldDeep} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="30" cy="44" r="3" fill={PALETTE.gold} opacity="0.7" />
      <circle cx="128" cy="70" r="2.2" fill={PALETTE.gold} opacity="0.6" />
    </svg>
  );
}

// Reports: a sheet with a small bar chart and a trend line.
function ReportsArt() {
  return (
    <svg viewBox="0 0 150 120" fill="none" aria-hidden="true">
      <circle cx="80" cy="60" r="50" fill="#FFFFFF" opacity="0.55" />
      <rect x="44" y="16" width="64" height="86" rx="8" fill="#FFFFFF" stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <path d="M54 30h30M54 38h20" stroke="#C9CFD8" strokeWidth="2" strokeLinecap="round" />
      <rect x="54" y="70" width="9" height="20" rx="2" fill={PALETTE.pink} stroke={PALETTE.goldDeep} strokeWidth="1.3" />
      <rect x="67" y="60" width="9" height="30" rx="2" fill={PALETTE.cream} stroke={PALETTE.goldDeep} strokeWidth="1.3" />
      <rect x="80" y="52" width="9" height="38" rx="2" fill={PALETTE.green} stroke={PALETTE.goldDeep} strokeWidth="1.3" />
      <path d="M54 62l13-8 13 4 16-14" stroke="#6E9A5B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="44" r="2.6" fill="#6E9A5B" />
      <circle cx="114" cy="84" r="14" fill={PALETTE.green} stroke={PALETTE.goldDeep} strokeWidth="1.6" />
      <path d="M114 70v14h14" stroke={PALETTE.goldDeep} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="30" cy="36" r="3" fill={PALETTE.gold} opacity="0.7" />
      <circle cx="132" cy="30" r="2.2" fill={PALETTE.gold} opacity="0.6" />
    </svg>
  );
}

// Members: a curved leafy branch around three overlapping soft circles
// (a gathered community). Botanical / abstract only.
function MembersArt() {
  return (
    <svg viewBox="0 0 150 120" fill="none" aria-hidden="true">
      <circle cx="80" cy="60" r="50" fill="#FFFFFF" opacity="0.55" />
      <circle cx="66" cy="66" r="17" fill={PALETTE.pink} stroke={PALETTE.goldDeep} strokeWidth="1.5" />
      <circle cx="92" cy="66" r="17" fill={PALETTE.green} stroke={PALETTE.goldDeep} strokeWidth="1.5" opacity="0.95" />
      <circle cx="79" cy="46" r="15" fill={PALETTE.cream} stroke={PALETTE.goldDeep} strokeWidth="1.5" opacity="0.95" />
      <path d="M24 100C40 104 64 102 84 96s38-18 46-34" stroke="#6E9A5B" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M44 101c-2-9 2-16 10-18 1 9-3 15-10 18Z" fill={PALETTE.green} stroke="#6E9A5B" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M68 99c0-9 5-15 13-15-1 9-5 14-13 15Z" fill={PALETTE.green} stroke="#6E9A5B" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M96 90c2-9 8-13 16-11-3 8-8 12-16 11Z" fill={PALETTE.green} stroke="#6E9A5B" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M117 75c4-7 10-9 17-6-4 7-10 9-17 6Z" fill={PALETTE.green} stroke="#6E9A5B" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M34 100c-8-2-13-7-13-14 8 1 12 6 13 14Z" fill={PALETTE.pink} stroke={PALETTE.goldDeep} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="120" cy="30" r="4" fill={PALETTE.gold} opacity="0.55" />
      <circle cx="34" cy="40" r="3" fill={PALETTE.gold} opacity="0.6" />
      <circle cx="132" cy="48" r="2" fill={PALETTE.gold} opacity="0.5" />
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

function renderIllustration(illustration: HeaderIllustration | undefined): ReactNode {
  if (!illustration || illustration === "none") return null;
  if (illustration === "finance") return <FinanceArt />;
  if (illustration === "reports") return <ReportsArt />;
  if (illustration === "members") return <MembersArt />;
  return illustration;
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
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const url = "https://api.open-meteo.com/v1/forecast?latitude=" + pos.coords.latitude + "&longitude=" + pos.coords.longitude + "&current=temperature_2m";
          const res = await fetch(url);
          const data = await res.json();
          if (data && data.current && data.current.temperature_2m != null) {
            setTemp(Math.round(data.current.temperature_2m));
          }
        } catch (err) {
          // Weather is a nice-to-have: silently skip on any failure.
        }
      },
      () => {
        // Permission denied or unavailable: silently skip.
      },
      { timeout: 5000 }
    );
  }, []);

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
          {temp !== null ? <span className="cph-chip">{WEATHER_ICON + " " + temp + DEGREE}</span> : null}
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
