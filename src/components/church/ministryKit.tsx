'use client';

// UNIMUNITY Church - Ministries UI kit
//
// Shared by the Ministries list page and the ministry detail page:
//  - useMinistriesData(): live Firestore data (same collections, same
//    queries and same fields as before - nothing changes in the backend)
//  - soft line icons, pastel illustrations, banner image asset
//
// RULE (Ministries visual direction): NO cross, NO crucifix and NO graphic
// religious symbol anywhere in the Ministries module - not in icons, not
// in illustrations, not in banners or images. Do not add one.
//  - the create / edit form, the manage-members window and the "..."
//    action menu (Edit / Delete live there, not on the cards)

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
// Plain <img> on purpose: the banner is a local asset in /public and must
// fall back to the illustration when the file is not there yet.
/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Ministry, MinistryFormValues, MinistryStatus } from '@/types/ministry';
import { SUGGESTED_MINISTRY_CATEGORIES } from '@/types/ministry';
import { CHURCH_UI as P } from '@/lib/moduleTheme';

export { P };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface ChurchMemberLite {
  id: string;
  fullName: string;
}

export function useMinistriesData(churchId: string) {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [churchName, setChurchName] = useState<string | undefined>(undefined);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [members, setMembers] = useState<ChurchMemberLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!churchId) return;
    getDoc(doc(db, 'churches', churchId))
      .then((snap) => { if (snap.exists()) setChurchName(snap.data().churchName); })
      .catch((e) => console.error(e));
  }, [churchId]);

  useEffect(() => {
    if (!uid || !churchId) return;
    const q = query(
      collection(db, 'churchMinistries'),
      where('organizerId', '==', uid),
      where('churchId', '==', churchId),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rows: Ministry[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<Ministry, 'id'>;
          return {
            ...data,
            id: d.id,
            memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
            memberCount: typeof data.memberCount === 'number' ? data.memberCount : 0,
          };
        });
        rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setMinistries(rows);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load ministries:', err);
        setError('Unable to load ministries. Please try again.');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid, churchId]);

  useEffect(() => {
    if (!uid || !churchId) return;
    const q = query(
      collection(db, 'churchMembers'),
      where('organizerId', '==', uid),
      where('churchId', '==', churchId),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const rows: ChurchMemberLite[] = snapshot.docs.map((d) => ({
        id: d.id,
        fullName: (d.data().fullName as string) || 'Unnamed member',
      }));
      rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setMembers(rows);
    });
    return () => unsub();
  }, [uid, churchId]);

  return { uid, churchName, ministries, members, loading, error };
}

export async function deleteMinistry(ministry: Ministry, ministries: Ministry[]): Promise<boolean> {
  const childCount = ministries.filter((m) => m.parentMinistryId === ministry.id).length;
  const warning =
    childCount > 0
      ? `"${ministry.name}" has ${childCount} sub-ministr${childCount === 1 ? 'y' : 'ies'}. Deleting it will NOT delete those sub-ministries, but they will become unassigned. Continue?`
      : `Delete "${ministry.name}"? This cannot be undone.`;
  if (!confirm(warning)) return false;
  try {
    await deleteDoc(doc(db, 'churchMinistries', ministry.id));
    return true;
  } catch (err) {
    console.error('Failed to delete ministry:', err);
    alert('Unable to delete this ministry. Please try again.');
    return false;
  }
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// ---------------------------------------------------------------------------
// Visual language
// ---------------------------------------------------------------------------

export const TINTS = [
  { bg: P.pink, deep: '#F6C6CC' },
  { bg: P.green, deep: '#CFE6B0' },
  { bg: P.cream, deep: '#E9D9B6' },
  { bg: P.lavender, deep: '#D9CCF1' },
];

export type IconKind =
  | 'music' | 'megaphone' | 'users' | 'child' | 'book' | 'heart' | 'key' | 'globe'
  | 'pulse' | 'ball' | 'palette' | 'camera' | 'star' | 'sunrise' | 'home' | 'sprout'
  | 'chart' | 'calendar' | 'check' | 'handshake';

export function iconKindFor(name = '', category = ''): IconKind {
  const s = `${name} ${category}`.toLowerCase();
  if (/music|musique|worship|louange|choir|chorale|praise/.test(s)) return 'music';
  if (/evangel|évangél|outreach/.test(s)) return 'megaphone';
  if (/prison/.test(s)) return 'key';
  if (/sick|malade|hospital|hôpital|visit/.test(s)) return 'heart';
  if (/child|enfant|kid/.test(s)) return 'child';
  if (/youth|jeun|teen/.test(s)) return 'users';
  if (/teach|word|bible|disciple|enseign|parole|school|école/.test(s)) return 'book';
  if (/mission/.test(s)) return 'globe';
  if (/health|santé|sante|medical|médical/.test(s)) return 'pulse';
  if (/social|charity|entraide/.test(s)) return 'handshake';
  if (/sport/.test(s)) return 'ball';
  if (/culture|art|theat|théât/.test(s)) return 'palette';
  if (/media|média|video|vidéo|communication|photo/.test(s)) return 'camera';
  if (/danc|danse/.test(s)) return 'star';
  if (/pray|prière|priere|intercess/.test(s)) return 'sunrise';
  if (/famil|women|men|femme|homme|couple|senior|adult/.test(s)) return 'home';
  return 'sprout';
}

const ICON_PATHS: Record<IconKind, ReactNode> = {
  music: (<><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>),
  megaphone: (<><path d="M3 11v2a1 1 0 0 0 1 1h2l6 4V6L6 10H4a1 1 0 0 0-1 1z" /><path d="M16 9a3 3 0 0 1 0 6" /><path d="M19 6a7 7 0 0 1 0 12" /></>),
  users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  child: (<><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2" /><circle cx="9" cy="10" r=".6" /><circle cx="15" cy="10" r=".6" /></>),
  book: (<><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" /></>),
  heart: (<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />),
  key: (<><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2" /><path d="m16 7 3 3" /><path d="m19 4 2 2" /></>),
  globe: (<><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" /></>),
  pulse: (<path d="M22 12h-4l-3 8-6-16-3 8H2" />),
  ball: (<><circle cx="12" cy="12" r="10" /><path d="M4.9 4.9c4 3 10.2 3 14.2 0" /><path d="M4.9 19.1c4-3 10.2-3 14.2 0" /></>),
  palette: (<><path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22z" /><circle cx="7.5" cy="10.5" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16.5" cy="10.5" r="1" /></>),
  camera: (<><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>),
  star: (<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />),
  sunrise: (<><path d="M17 18a5 5 0 0 0-10 0" /><path d="M12 9V2" /><path d="m4.2 10.2 1.4 1.4" /><path d="M1 18h2" /><path d="M21 18h2" /><path d="m18.4 11.6 1.4-1.4" /><path d="M23 22H1" /><path d="m8 6 4-4 4 4" /></>),
  home: (<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>),
  sprout: (<><path d="M7 20h10" /><path d="M12 20V10" /><path d="M12 10C12 6 9 4 5 4c0 4 3 6 7 6z" /><path d="M12 13c0-3 2.5-5 6.5-5 0 3.5-2.5 5-6.5 5z" /></>),
  chart: (<><path d="M3 3v18h18" /><path d="M7 15v2" /><path d="M11 11v6" /><path d="M15 7v10" /><path d="M19 12v5" /></>),
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></>),
  check: (<><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m8 12 3 3 5-6" /></>),
  handshake: (<><path d="m11 17 2 2a1.4 1.4 0 0 0 2-2" /><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3.9-3.9a2 2 0 0 0-2.8 0l-.9.9a1.4 1.4 0 0 1-2-2l2.8-2.8a5 5 0 0 1 6.2-.6L21 6" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1.4 1.4 0 0 0 2-2" /><path d="M3 4h8" /></>),
};

export function MinistryIcon({ kind, size = 20, color = P.text }: { kind: IconKind; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[kind]}
    </svg>
  );
}

// Soft pastel "photo" area of a card: sun, hills, leaves and the icon.
export function CardArt({ kind, tintIndex, height = 120, children }: { kind: IconKind; tintIndex: number; height?: number; children?: ReactNode }) {
  const t = TINTS[tintIndex % TINTS.length];
  const next = TINTS[(tintIndex + 1) % TINTS.length];
  return (
    <div style={{ position: 'relative', height, overflow: 'hidden', background: `linear-gradient(135deg, ${t.bg} 0%, ${P.white} 60%, ${next.bg} 100%)` }}>
      <svg width="100%" height="100%" viewBox="0 0 240 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="190" cy="34" r="22" fill="#FBE9B7" opacity="0.7" />
        <ellipse cx="60" cy="128" rx="120" ry="38" fill={t.deep} opacity="0.55" />
        <ellipse cx="200" cy="132" rx="110" ry="36" fill={next.deep} opacity="0.5" />
        <ellipse cx="28" cy="40" rx="9" ry="4" fill={next.deep} opacity="0.6" transform="rotate(-30 28 40)" />
        <ellipse cx="44" cy="28" rx="7" ry="3" fill={t.deep} opacity="0.7" transform="rotate(20 44 28)" />
      </svg>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(36,50,74,0.08)' }}>
        <MinistryIcon kind={kind} size={26} />
      </div>
      {children}
    </div>
  );
}

// Banner illustration: several generations standing together under a soft
// sun, holding hands. No cross, no religious symbol.
export function CommunityArt() {
  const ground = 170;
  const people = [
    { x: 58, h: 70, body: '#D9CCF1', skin: '#E8C4A0', hair: '#D8D2CC' },
    { x: 104, h: 84, body: '#CFE6B0', skin: '#8D5B3E', hair: '#3B2A22' },
    { x: 150, h: 76, body: '#F6C6CC', skin: '#C68E63', hair: '#4A3426' },
    { x: 190, h: 46, body: '#E9D9B6', skin: '#F1D2B6', hair: '#7A5236' },
    { x: 232, h: 62, body: '#CFE6B0', skin: '#A56B45', hair: '#2E211B' },
  ];
  return (
    <svg width="100%" height="100%" viewBox="0 0 300 180" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <circle cx="210" cy="58" r="44" fill="#FBE9B7" opacity="0.65" />
      <circle cx="210" cy="58" r="28" fill="#FCEFC9" opacity="0.8" />
      <ellipse cx="80" cy="186" rx="150" ry="34" fill="#E2F0CB" />
      <ellipse cx="250" cy="190" rx="120" ry="32" fill="#F9D9DC" />
      <ellipse cx="270" cy="110" rx="12" ry="5" fill="#CFE6B0" transform="rotate(-35 270 110)" />
      <ellipse cx="282" cy="96" rx="9" ry="4" fill="#F6C6CC" transform="rotate(25 282 96)" />
      <ellipse cx="22" cy="104" rx="11" ry="4.5" fill="#F6C6CC" transform="rotate(30 22 104)" />
      <ellipse cx="34" cy="90" rx="8" ry="3.5" fill="#CFE6B0" transform="rotate(-20 34 90)" />
      {people.map((p, i) => {
        const top = ground - p.h * 0.62;
        const w = p.h * 0.17;
        const r = p.h * 0.12;
        const next = people[i + 1];
        return (
          <g key={i}>
            {next && (
              <path
                d={`M ${p.x + w - 2} ${top + 10} Q ${(p.x + next.x) / 2} ${Math.max(top, ground - next.h * 0.62) + 26} ${next.x - next.h * 0.17 + 2} ${ground - next.h * 0.62 + 10}`}
                stroke={p.skin} strokeWidth="3.2" fill="none" strokeLinecap="round"
              />
            )}
            <path d={`M ${p.x - w} ${ground} L ${p.x - w} ${top + w} Q ${p.x - w} ${top} ${p.x} ${top} Q ${p.x + w} ${top} ${p.x + w} ${top + w} L ${p.x + w} ${ground} Z`} fill={p.body} />
            <circle cx={p.x} cy={top - r - 2} r={r} fill={p.skin} />
            <path d={`M ${p.x - r} ${top - r - 3} Q ${p.x} ${top - 2.3 * r - 3} ${p.x + r} ${top - r - 3}`} fill={p.hair} />
          </g>
        );
      })}
    </svg>
  );
}

// Banner image asset. The reference artwork is ONLY an art-direction
// reference: the interface (text, buttons, cards, colors) is built in code,
// and the photo is placed as a banner asset on the right side of the
// banner. Put the photo at: public/images/ministries-banner.jpg
// (landscape, bright, community / several generations, NO cross, NO
// religious symbol). Until that file exists, the pastel illustration
// below is shown instead.
export const MINISTRIES_BANNER_IMAGE = '/images/ministries-banner.jpg';

export function BannerVisual({ src = MINISTRIES_BANNER_IMAGE }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end' }}>
        <CommunityArt />
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
      />
      {/* Soft fade into the banner gradient so the photo stays a visual
          element, never the dominant one, and the text side stays clear. */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--um-cream) 0%, rgba(246,239,221,0.55) 28%, rgba(246,239,221,0) 60%)' }} />
    </div>
  );
}

export function taglineFor(name = '', category = ''): string {
  const s = `${name} ${category}`.toLowerCase();
  if (/evangel|évangél|outreach/.test(s)) return 'Win • Disciple • Send';
  if (/prison/.test(s)) return 'Visit • Restore • Hope';
  if (/sick|malade|hospital|visit/.test(s)) return 'Visit • Comfort • Pray';
  if (/music|musique|worship|louange|choir|praise/.test(s)) return 'Praise • Worship • Glorify';
  if (/child|enfant|kid/.test(s)) return 'Learn • Play • Grow';
  if (/youth|jeun|teen/.test(s)) return 'Grow • Belong • Lead';
  if (/teach|word|bible|disciple|enseign|parole/.test(s)) return 'Learn • Grow • Teach';
  if (/mission/.test(s)) return 'Go • Serve • Share';
  if (/pray|prière|priere|intercess/.test(s)) return 'Seek • Intercede • Believe';
  if (/danc|danse/.test(s)) return 'Move • Celebrate • Worship';
  return 'Serve • Grow • Impact';
}

export interface ToolDef { label: string; icon: IconKind; match?: RegExp }

export function toolsFor(name = '', category = ''): ToolDef[] {
  const s = `${name} ${category}`.toLowerCase();
  if (/evangel|évangél|outreach/.test(s)) {
    return [
      { label: 'Contacts', icon: 'users' },
      { label: 'Outreach & Trips', icon: 'globe' },
      { label: 'Visits', icon: 'home' },
      { label: 'Prison', icon: 'key', match: /prison/ },
      { label: 'Visiting the Sick', icon: 'heart', match: /sick|malade|hospital/ },
      { label: 'New Converts', icon: 'sprout' },
      { label: 'Campaigns', icon: 'megaphone' },
      { label: 'Reports', icon: 'chart' },
    ];
  }
  return [
    { label: 'Planning', icon: 'calendar' },
    { label: 'Tasks', icon: 'check' },
    { label: 'Events', icon: 'sunrise' },
    { label: 'Reports', icon: 'chart' },
  ];
}

// ---------------------------------------------------------------------------
// Small UI pieces
// ---------------------------------------------------------------------------

export const btnPrimary: CSSProperties = {
  border: '1px solid rgba(216,177,90,0.45)', background: P.white, color: P.text,
  borderRadius: 999, padding: '11px 20px', fontSize: 13.5, fontWeight: 700,
  cursor: 'pointer', boxShadow: '0 6px 18px rgba(36,50,74,0.08)', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
};

export const btnGradient: CSSProperties = {
  ...btnPrimary,
  background: P.activeGradient,
  border: '1px solid rgba(216,177,90,0.35)',
};

export const btnSoft: CSSProperties = {
  border: `1px solid ${P.border}`, background: P.white, color: P.text,
  borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
};

export function StatusPill({ status }: { status: MinistryStatus | string }) {
  const active = status === 'active';
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      background: active ? 'rgba(226,240,203,0.95)' : 'rgba(246,239,221,0.95)',
      color: active ? '#3E6B2F' : P.goldText,
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export interface MenuItem { label: string; onClick: () => void; danger?: boolean }

export function ActionMenu({ items, label = 'Ministry actions' }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        aria-label={label}
        aria-expanded={open}
        style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.92)', color: P.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(36,50,74,0.08)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div role="menu" style={{ position: 'absolute', right: 0, top: 42, zIndex: 61, minWidth: 190, background: P.white, borderRadius: 14, boxShadow: '0 14px 36px rgba(36,50,74,0.16)', border: `1px solid ${P.border}`, padding: 6 }}>
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); it.onClick(); }}
                className="um-menu-item"
                style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: it.danger ? '#B4474F' : P.text, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Page-wide CSS: hover effects and responsive rules that inline styles
// cannot express. Rendered once per page.
export function ChurchPageStyles() {
  return (
    <style>{`
      :root {
        --um-pink: #FDE2E4;
        --um-cream: #F6EFDD;
        --um-green: #E2F0CB;
        --um-lavender: #EEE8F8;
        --um-gold: #D8B15A;
        --um-white: #FFFFFF;
        --um-text: #24324A;
        --um-text-soft: #68758A;
        --um-gradient: linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%);
        --um-active: linear-gradient(120deg, #FDE2E4, #E2F0CB);
      }
      .um-gradient { background: linear-gradient(120deg, #FDE2E4 0%, #F6EFDD 55%, #E2F0CB 100%); }
      .um-card { transition: transform .18s ease, box-shadow .18s ease; }
      .um-card:hover { transform: translateY(-3px); box-shadow: ${P.shadowHover}; }
      .um-menu-item:hover { background: ${P.cream} !important; }
      .um-chip:hover { background: ${P.cream} !important; }
      .um-link:hover { text-decoration: underline; }
      .um-wrap { padding: 28px 36px 56px; }
      .um-banner { display: flex; align-items: stretch; }
      .um-banner-art { flex: 0 0 42%; max-width: 460px; position: relative; min-height: 220px; }
      @media (max-width: 900px) {
        .um-banner-art { display: none; }
      }
      @media (max-width: 767px) {
        .um-wrap { padding: 68px 16px 40px; }
        .um-banner-text { padding: 26px 22px !important; }
        .um-banner-title { font-size: 26px !important; }
      }
    `}</style>
  );
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

const fieldLabel: CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, color: P.text, marginBottom: 6 };
const fieldInput: CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: `1px solid ${P.border}`, borderRadius: 12,
  padding: '10px 12px', fontSize: 13.5, color: P.text, background: '#FFFEFB', fontFamily: 'inherit',
};

function ModalShell({ title, subtitle, onClose, children, footer }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(36,50,74,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', background: P.white, borderRadius: 22, boxShadow: '0 24px 60px rgba(36,50,74,0.22)' }}>
        <div style={{ background: P.gradient, padding: '20px 24px' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.text }}>{title}</h3>
          {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: P.textSoft }}>{subtitle}</p>}
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
        <div style={{ padding: '0 24px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>{footer}</div>
      </div>
    </div>
  );
}

const EMPTY_FORM: MinistryFormValues = {
  name: '', description: '', category: '', status: 'active',
  leaderId: null, meetingSchedule: '', parentMinistryId: null,
};

// Render this only while it is open , so the form starts
// fresh each time from `editing` / `initialParentId`.
export function MinistryFormModal({
  organizerId, churchId, ministries, members, editing, initialParentId, onClose,
}: {
  organizerId: string | null;
  churchId: string;
  ministries: Ministry[];
  members: ChurchMemberLite[];
  editing: Ministry | null;
  initialParentId: string | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MinistryFormValues>(() =>
    editing
      ? {
          name: editing.name,
          description: editing.description || '',
          category: editing.category || '',
          status: editing.status,
          leaderId: editing.leaderId,
          meetingSchedule: editing.meetingSchedule ?? '',
          parentMinistryId: editing.parentMinistryId,
        }
      : { ...EMPTY_FORM, parentMinistryId: initialParentId },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editingId = editing?.id ?? null;

  const topLevel = useMemo(() => ministries.filter((m) => !m.parentMinistryId && m.id !== editingId), [ministries, editingId]);

  function close() { if (!saving) onClose(); }

  async function handleSave() {
    if (!organizerId || !churchId) return;
    if (!form.name.trim()) { setError('Ministry name is required.'); return; }
    if (editingId && form.parentMinistryId === editingId) { setError('A ministry cannot be its own parent.'); return; }
    // Two levels only: a sub-ministry cannot be a parent.
    if (form.parentMinistryId) {
      const parent = ministries.find((m) => m.id === form.parentMinistryId);
      if (parent?.parentMinistryId) { setError("Sub-ministries can't have their own sub-ministries."); return; }
    }
    setSaving(true);
    setError(null);
    try {
      const leaderName = form.leaderId ? members.find((m) => m.id === form.leaderId)?.fullName ?? null : null;
      const parentMinistryName = form.parentMinistryId ? ministries.find((m) => m.id === form.parentMinistryId)?.name ?? null : null;
      if (editingId) {
        await updateDoc(doc(db, 'churchMinistries', editingId), {
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
        await addDoc(collection(db, 'churchMinistries'), {
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
      onClose();
    } catch (err) {
      console.error('Failed to save ministry:', err);
      setError('Something went wrong while saving. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={editingId ? 'Edit Ministry' : form.parentMinistryId ? 'New Sub-Ministry' : 'New Ministry'}
      subtitle="Different gifts, one calling."
      onClose={close}
      footer={
        <>
          <button onClick={close} disabled={saving} style={btnSoft}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...btnGradient, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      {error && <p style={{ margin: '0 0 14px', background: '#FDECEE', color: '#B4474F', borderRadius: 10, padding: '9px 12px', fontSize: 13 }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label htmlFor="mf-name" style={fieldLabel}>Name</label>
          <input id="mf-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={fieldInput} placeholder="e.g. Music Ministry" />
        </div>
        <div>
          <label htmlFor="mf-category" style={fieldLabel}>Category</label>
          <input id="mf-category" type="text" list="mf-category-suggestions" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={fieldInput} placeholder="e.g. Worship, Youth, Evangelism" />
          <datalist id="mf-category-suggestions">
            {SUGGESTED_MINISTRY_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="mf-parent" style={fieldLabel}>Parent Ministry</label>
          <select id="mf-parent" value={form.parentMinistryId ?? ''} onChange={(e) => setForm({ ...form, parentMinistryId: e.target.value || null })} style={fieldInput}>
            <option value="">None — top-level ministry</option>
            {topLevel.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mf-description" style={fieldLabel}>Description</label>
          <textarea id="mf-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...fieldInput, resize: 'vertical' }} rows={3} />
        </div>
        <div>
          <label htmlFor="mf-leader" style={fieldLabel}>Leader</label>
          <select id="mf-leader" value={form.leaderId ?? ''} onChange={(e) => setForm({ ...form, leaderId: e.target.value || null })} style={fieldInput}>
            <option value="">Not assigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          <div>
            <label htmlFor="mf-schedule" style={fieldLabel}>Meeting Schedule</label>
            <input id="mf-schedule" type="text" value={form.meetingSchedule} onChange={(e) => setForm({ ...form, meetingSchedule: e.target.value })} style={fieldInput} placeholder="e.g. Sundays 9:00 AM" />
          </div>
          <div>
            <label htmlFor="mf-status" style={fieldLabel}>Status</label>
            <select id="mf-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MinistryStatus })} style={fieldInput}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export function ManageMembersModal({ ministry, members, onClose }: { ministry: Ministry; members: ChurchMemberLite[]; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [ids, setIds] = useState<string[]>(ministry.memberIds);

  async function toggle(memberId: string) {
    const next = ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId];
    setIds(next);
    try {
      await updateDoc(doc(db, 'churchMinistries', ministry.id), {
        memberIds: next,
        memberCount: next.length,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to update ministry members:', err);
      setIds(ids);
    }
  }

  const visible = members.filter((m) => m.fullName.toLowerCase().includes(search.toLowerCase()));

  return (
    <ModalShell
      title={`Members — ${ministry.name}`}
      subtitle={`${ids.length} member${ids.length === 1 ? '' : 's'} assigned`}
      onClose={onClose}
      footer={<button onClick={onClose} style={btnGradient}>Done</button>}
    >
      <label htmlFor="mm-search" style={{ ...fieldLabel, position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search members</label>
      <input id="mm-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a member…" style={{ ...fieldInput, marginBottom: 12 }} />
      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {members.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: P.textSoft }}>No church members recorded yet.</p>
        ) : visible.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: P.textSoft }}>No member matches this search.</p>
        ) : (
          visible.map((m, i) => {
            const checked = ids.includes(m.id);
            return (
              <label key={m.id} className="um-chip" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, cursor: 'pointer', background: checked ? '#FBF7EC' : 'transparent' }}>
                <span style={{ width: 30, height: 30, borderRadius: 999, background: TINTS[i % TINTS.length].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: P.text, flexShrink: 0 }}>{initialsOf(m.fullName)}</span>
                <span style={{ flex: 1, fontSize: 13.5, color: P.text }}>{m.fullName}</span>
                <input type="checkbox" checked={checked} onChange={() => toggle(m.id)} style={{ width: 18, height: 18, accentColor: P.gold }} />
              </label>
            );
          })
        )}
      </div>
    </ModalShell>
  );
}
