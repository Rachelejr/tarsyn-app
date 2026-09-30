"use client";

// src/components/church/churchUi.tsx
//
// Shared UNIMUNITY Church building blocks, so Members, Families, Groups,
// Ministries, Finance and Reports all look like the same application:
//   ChurchSummaryCard  - small horizontal stat card (real numbers only)
//   ChurchSearchBar    - search input with icon
//   ChurchFilterBar    - row of compact dropdown filters
//   ChurchAvatar       - member photo, or clean initials when no photo
//   ChurchStatusBadge  - soft pastel member status pill
//   ChurchMemberList   - wide member table on desktop, cards on mobile
//   ChurchEmptyState   - friendly empty state with an action
//
// Visual rules: white cards, thin warm borders, soft shadows, pastel
// accents (pink / cream / green / gold). No cross or religious symbols.
// Styles live in one CSS string (CHURCH_UI_CSS) injected once per page
// with <ChurchUiStyles />.

import { useEffect, useRef, useState, type ReactNode } from "react";

export const CHURCH_UI_CSS = `
.cu-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.cu-stat { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 2px rgba(36,50,74,0.03), 0 6px 18px -14px rgba(184,145,63,0.35); min-width: 0; }
.cu-stat-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #8A6D1F; }
.cu-stat-icon svg { width: 20px; height: 20px; }
.cu-stat-label { font-size: 12px; font-weight: 600; color: #68758A; margin: 0; }
.cu-stat-value { font-size: 24px; font-weight: 800; color: #24324A; margin: 2px 0 0; line-height: 1.1; }
.cu-stat-hint { font-size: 11px; color: #8A93A3; margin: 2px 0 0; }
.cu-tint-pink { background: #FDE2E4; }
.cu-tint-green { background: #E2F0CB; }
.cu-tint-cream { background: #F6EFDD; }
.cu-tint-gold { background: #F3E3B8; }

.cu-toolbar { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 16px; padding: 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(36,50,74,0.03); }
.cu-search { position: relative; flex: 1 1 300px; min-width: 220px; }
.cu-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: #A3ABB8; pointer-events: none; }
.cu-search input { width: 100%; height: 40px; padding: 0 12px 0 36px; border-radius: 10px; border: 1px solid #E9DFCB; font-size: 14px; color: #24324A; font-family: inherit; box-sizing: border-box; outline: none; background: #FFFDF9; }
.cu-search input:focus, .cu-filter select:focus { border-color: #D8B15A; box-shadow: 0 0 0 3px rgba(216,177,90,0.18); }
.cu-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.cu-filter select { height: 40px; padding: 0 30px 0 12px; border-radius: 10px; border: 1px solid #E9DFCB; font-size: 13px; color: #24324A; font-family: inherit; background: #FFFFFF; outline: none; min-width: 130px; cursor: pointer; }
.cu-filter select.is-set { font-weight: 700; font-style: italic; border-color: #D8B15A; background: #FFFBF1; }
.cu-clear { background: none; border: none; color: #8A6D1F; font-weight: 700; font-size: 12.5px; cursor: pointer; padding: 0 6px; font-family: inherit; }
.cu-count { font-size: 12.5px; color: #68758A; margin: 0 0 10px 4px; }

.cu-list { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; overflow: visible; box-shadow: 0 1px 2px rgba(36,50,74,0.03), 0 6px 18px -14px rgba(184,145,63,0.35); }
.cu-row { display: grid; grid-template-columns: minmax(220px, 2.2fr) minmax(200px, 2fr) minmax(110px, 1.1fr) minmax(120px, 1.2fr) minmax(100px, 0.9fr) 150px; gap: 14px; align-items: center; padding: 12px 18px; border-top: 1px solid #F5EEDF; }
.cu-row:first-child { border-top: none; }
.cu-head { background: #FBF7EC; border-radius: 18px 18px 0 0; font-size: 12px; font-weight: 700; color: #68758A; padding-top: 11px; padding-bottom: 11px; }
.cu-row.cu-item { cursor: pointer; transition: background 0.12s ease; }
.cu-row.cu-item:nth-child(odd) { background: #FFFDF9; }
.cu-row.cu-item:hover { background: #FBF3E2; }
.cu-row:last-child { border-radius: 0 0 18px 18px; }
.cu-member { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cu-name { font-size: 14px; font-weight: 700; color: #24324A; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cu-sub { font-size: 12px; color: #68758A; margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cu-cell { font-size: 13px; color: #24324A; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cu-muted { color: #A3ABB8; }
.cu-mlabel { display: none; }
.cu-actions { display: flex; gap: 6px; justify-content: flex-end; align-items: center; position: relative; }
.cu-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 999px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; background: #FFFFFF; border: 1px solid rgba(216,177,90,0.5); color: #24324A; }
.cu-btn:hover { border-color: #D8B15A; }
.cu-btn:focus-visible, .cu-dots:focus-visible { outline: 2px solid #B8913F; outline-offset: 2px; }
.cu-dots { width: 32px; height: 32px; border-radius: 999px; border: 1px solid #EFE4CC; background: #FFFFFF; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #68758A; }
.cu-menu { position: absolute; right: 0; top: 38px; z-index: 30; background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 12px; box-shadow: 0 12px 30px -10px rgba(36,50,74,0.25); padding: 6px; min-width: 190px; }
.cu-menu button { display: block; width: 100%; text-align: left; background: none; border: none; padding: 9px 12px; border-radius: 8px; font-size: 13px; color: #24324A; cursor: pointer; font-family: inherit; }
.cu-menu button:hover:not(:disabled) { background: #FBF3E2; }
.cu-menu button:disabled { color: #A3ABB8; cursor: default; }
.cu-menu .cu-soon { font-size: 10px; font-weight: 700; color: #8A6D1F; background: #F6EFDD; border-radius: 999px; padding: 1px 6px; margin-left: 6px; }

.cu-avatar { border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 800; color: #8A6D1F; background: linear-gradient(140deg, #FDE2E4 0%, #F6EFDD 60%, #E2F0CB 100%); border: 1.5px solid #FFFFFF; box-shadow: 0 0 0 1px #EADFC8; }
.cu-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

.cu-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
.cu-badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.7; }

.cu-empty { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 18px; padding: 44px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.cu-empty-art { width: 96px; height: 76px; }
.cu-empty h3 { margin: 6px 0 0; font-size: 18px; font-weight: 800; color: #24324A; }
.cu-empty p { margin: 0 0 8px; font-size: 14px; color: #68758A; max-width: 420px; line-height: 1.55; }
.cu-btn-gold { background: #D8B15A; border-color: #D8B15A; height: 40px; padding: 0 20px; font-size: 13.5px; }

@media (max-width: 1200px) {
  .cu-row { grid-template-columns: minmax(200px, 2fr) minmax(180px, 1.8fr) minmax(110px, 1fr) minmax(100px, 0.9fr) 120px; }
  .cu-col-ministry { display: none; }
}
@media (max-width: 1024px) {
  .cu-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 860px) {
  .cu-head { display: none; }
  .cu-list { background: transparent; border: none; box-shadow: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .cu-row, .cu-row.cu-item:nth-child(odd) { background: #FFFFFF; border: 1px solid #F0E6D2; border-radius: 16px !important; grid-template-columns: 1fr; gap: 8px; padding: 14px; }
  .cu-col-ministry { display: block; }
  .cu-mlabel { display: inline; color: #8A93A3; font-weight: 600; margin-right: 6px; }
  .cu-actions { justify-content: flex-start; }
}
@media (max-width: 560px) {
  .cu-summary { gap: 10px; }
  .cu-stat { padding: 12px; }
  .cu-stat-value { font-size: 20px; }
  .cu-list { grid-template-columns: 1fr; }
  .cu-filters { width: 100%; }
  .cu-filter { flex: 1 1 45%; }
  .cu-filter select { width: 100%; min-width: 0; }
}
`;

export function ChurchUiStyles() {
  return <style>{CHURCH_UI_CSS}</style>;
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

export type Tint = "pink" | "green" | "cream" | "gold";

export function ChurchSummaryCard({ label, value, hint, tint = "cream", icon }: {
  label: string; value: number | string; hint?: string; tint?: Tint; icon?: ReactNode;
}) {
  return (
    <div className="cu-stat">
      <div className={"cu-stat-icon cu-tint-" + tint}>{icon}</div>
      <div>
        <p className="cu-stat-label">{label}</p>
        <p className="cu-stat-value">{value}</p>
        {hint ? <p className="cu-stat-hint">{hint}</p> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search + filters
// ---------------------------------------------------------------------------

export function ChurchSearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="cu-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export interface FilterDef {
  key: string;
  label: string;          // e.g. "All statuses"
  options: string[];
}

export function ChurchFilterBar({ filters, values, onChange, onClear }: {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
}) {
  const anySet = Object.values(values).some(Boolean);
  return (
    <div className="cu-filters">
      {filters.filter((f) => f.options.length > 0).map((f) => (
        <label key={f.key} className="cu-filter">
          <select className={values[f.key] ? "is-set" : ""} value={values[f.key] || ""} onChange={(e) => onChange(f.key, e.target.value)} aria-label={f.label}>
            <option value="">{f.label}</option>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      ))}
      {anySet && onClear ? <button type="button" className="cu-clear" onClick={onClear}>Clear filters</button> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar + status badge
// ---------------------------------------------------------------------------

export function initialsOf(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function ChurchAvatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const s = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  return (
    <div className="cu-avatar" style={s}>
      {photoUrl && !broken
        ? <img src={photoUrl} alt={name} onError={() => setBroken(true)} />
        : <span aria-label={name}>{initialsOf(name)}</span>}
    </div>
  );
}

// Soft pastel colors per status. Unknown values get the neutral cream style.
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  active: { bg: "#E2F0CB", fg: "#3F6B34" },
  new: { bg: "#FDE2E4", fg: "#9C4A5E" },
  pending: { bg: "#F6EFDD", fg: "#8A6D1F" },
  inactive: { bg: "#EEF0F3", fg: "#5E6878" },
  transferred: { bg: "#E6EEF7", fg: "#4A6480" },
  visitor: { bg: "#F3E8F6", fg: "#7A5A86" },
  suspended: { bg: "#FBE9E4", fg: "#9A5A48" },
  deceased: { bg: "#ECEAE6", fg: "#6A645B" },
  other: { bg: "#F6EFDD", fg: "#8A6D1F" },
};

export function statusLabel(status?: string, detail?: string): string {
  const s = (status || "pending").trim();
  if (s.toLowerCase() === "other" && detail) return detail;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function ChurchStatusBadge({ status, detail }: { status?: string; detail?: string }) {
  const key = (status || "pending").toLowerCase();
  const st = STATUS_STYLE[key] || STATUS_STYLE.other;
  const style = { background: st.bg, color: st.fg };
  return <span className="cu-badge" style={style}>{statusLabel(status, detail)}</span>;
}

// ---------------------------------------------------------------------------
// Member list
// ---------------------------------------------------------------------------

export interface MemberRowData {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  role?: string;
  ministryName?: string;
  groupName?: string;
  status?: string;
  statusDetail?: string;
  memberCode?: string;
  invitePending?: boolean;
}

export interface MemberMenuItem { label: string; onClick?: () => void; soon?: boolean }

function RowMenu({ items }: { items: MemberMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="cu-dots" aria-label="More actions" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
      {open ? (
        <div className="cu-menu" role="menu" onClick={(e) => e.stopPropagation()}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.soon} onClick={() => { setOpen(false); it.onClick?.(); }}>
              {it.label}{it.soon ? <span className="cu-soon">Soon</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ChurchMemberList({ members, onOpen, menuFor }: {
  members: MemberRowData[];
  onOpen: (m: MemberRowData) => void;
  menuFor: (m: MemberRowData) => MemberMenuItem[];
}) {
  return (
    <div className="cu-list" role="table" aria-label="Members">
      <div className="cu-row cu-head" role="row">
        <span role="columnheader">Member</span>
        <span role="columnheader">Contact</span>
        <span role="columnheader">Role</span>
        <span role="columnheader" className="cu-col-ministry">Ministry</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Actions</span>
      </div>
      {members.map((m) => (
        <div key={m.id} className="cu-row cu-item" role="row" tabIndex={0} onClick={() => onOpen(m)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(m); }}>
          <div className="cu-member" role="cell">
            <ChurchAvatar name={m.fullName} photoUrl={m.photoUrl} />
            <div style={{ minWidth: 0 }}>
              <p className="cu-name">{m.fullName || "Unnamed member"}</p>
              <p className="cu-sub">{m.memberCode ? "ID " + m.memberCode : ""}{m.groupName ? (m.memberCode ? " \u00B7 " : "") + m.groupName : ""}</p>
            </div>
          </div>
          <div role="cell" style={{ minWidth: 0 }}>
            <p className="cu-cell" style={{ margin: 0 }}>{m.email || <span className="cu-muted">No email</span>}</p>
            <p className="cu-sub">{m.phone || ""}</p>
          </div>
          <div className="cu-cell" role="cell"><span className="cu-mlabel">Role</span>{m.role || <span className="cu-muted">-</span>}</div>
          <div className="cu-cell cu-col-ministry" role="cell"><span className="cu-mlabel">Ministry</span>{m.ministryName || <span className="cu-muted">-</span>}</div>
          <div role="cell"><ChurchStatusBadge status={m.status} detail={m.statusDetail} /></div>
          <div className="cu-actions" role="cell">
            <button type="button" className="cu-btn" onClick={(e) => { e.stopPropagation(); onOpen(m); }}>View</button>
            <RowMenu items={menuFor(m)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

export function ChurchEmptyState({ title, text, actionLabel, onAction }: { title: string; text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="cu-empty">
      <svg className="cu-empty-art" viewBox="0 0 120 96" fill="none" aria-hidden="true">
        <circle cx="60" cy="50" r="40" fill="#FBF7EC" />
        <circle cx="48" cy="54" r="14" fill="#FDE2E4" stroke="#B8913F" strokeWidth="1.4" />
        <circle cx="72" cy="54" r="14" fill="#E2F0CB" stroke="#B8913F" strokeWidth="1.4" />
        <circle cx="60" cy="38" r="12" fill="#F6EFDD" stroke="#B8913F" strokeWidth="1.4" />
        <path d="M18 84c14 4 36 3 52-2s28-14 34-26" stroke="#6E9A5B" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M36 85c-1-7 2-12 8-14 1 7-2 12-8 14Z" fill="#E2F0CB" stroke="#6E9A5B" strokeWidth="1.2" />
        <path d="M88 70c2-7 7-10 13-8-2 6-7 9-13 8Z" fill="#E2F0CB" stroke="#6E9A5B" strokeWidth="1.2" />
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
      {actionLabel && onAction ? <button type="button" className="cu-btn cu-btn-gold" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  );
}
