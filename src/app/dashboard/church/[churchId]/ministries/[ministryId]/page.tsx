'use client';

// src/app/dashboard/church/[churchId]/ministries/[ministryId]/page.tsx
//
// One ministry's own page (e.g. Evangelism: "Win • Disciple • Send").
// Works for sub-ministries too. Reads the same churchMinistries data as the
// list page; Edit / Delete / Add sub-ministry live in the "..." menu.
// Tools that are not built yet show a "Soon" badge - nothing is faked.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ChurchSidebar from '@/components/church/ChurchSidebar';
import type { Ministry } from '@/types/ministry';
import {
  P, TINTS, useMinistriesData, deleteMinistry, iconKindFor, MinistryIcon,
  StatusPill, ActionMenu, BannerVisual, ChurchPageStyles, MinistryFormModal, ManageMembersModal,
  btnPrimary, btnSoft, taglineFor, toolsFor, initialsOf,
} from '@/components/church/ministryKit';

export default function MinistryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const churchId = params?.churchId as string;
  const ministryId = params?.ministryId as string;
  const { uid, churchName, ministries, members, loading } = useMinistriesData(churchId);

  const [formState, setFormState] = useState<{ editing: Ministry | null; parentId: string | null } | null>(null);
  const [managing, setManaging] = useState(false);

  const ministry = ministries.find((m) => m.id === ministryId) ?? null;
  const parent = ministry?.parentMinistryId ? ministries.find((m) => m.id === ministry.parentMinistryId) ?? null : null;
  const subs = useMemo(() => ministries.filter((m) => m.parentMinistryId === ministryId), [ministries, ministryId]);
  const assigned = useMemo(
    () => (ministry ? members.filter((mb) => ministry.memberIds.includes(mb.id)) : []),
    [members, ministry],
  );

  const base = `/dashboard/church/${churchId}/ministries`;

  if (loading) {
    return (
      <Shell churchId={churchId} churchName={churchName}>
        <div style={{ background: P.white, borderRadius: 22, padding: 40, textAlign: 'center', color: P.textSoft, boxShadow: P.shadow }}>Loading ministry…</div>
      </Shell>
    );
  }

  if (!ministry) {
    return (
      <Shell churchId={churchId} churchName={churchName}>
        <div style={{ background: P.white, borderRadius: 22, padding: 40, textAlign: 'center', boxShadow: P.shadow }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Ministry not found</h1>
          <p style={{ margin: '0 0 18px', color: P.textSoft, fontSize: 14 }}>It may have been deleted.</p>
          <Link href={base} style={{ ...btnPrimary, textDecoration: 'none' }}>← All ministries</Link>
        </div>
      </Shell>
    );
  }

  const kind = iconKindFor(ministry.name, ministry.category);
  const tools = toolsFor(ministry.name, ministry.category);
  const isTopLevel = !ministry.parentMinistryId;

  const menuItems = [
    { label: 'Edit', onClick: () => setFormState({ editing: ministry, parentId: ministry.parentMinistryId }) },
    ...(isTopLevel ? [{ label: 'Add sub-ministry', onClick: () => setFormState({ editing: null, parentId: ministry.id }) }] : []),
    {
      label: 'Delete',
      danger: true,
      onClick: async () => {
        const ok = await deleteMinistry(ministry, ministries);
        if (ok) router.push(parent ? `${base}/${parent.id}` : base);
      },
    },
  ];

  const info = [
    { label: 'Leader', value: ministry.leaderName ?? 'Not assigned', bg: P.pink, icon: 'star' as const },
    { label: 'Members', value: String(ministry.memberCount), bg: P.green, icon: 'users' as const },
    { label: 'Meets', value: ministry.meetingSchedule || 'Not set', bg: P.cream, icon: 'calendar' as const },
    { label: 'Category', value: ministry.category || '—', bg: P.lavender, icon: 'sprout' as const },
  ];

  return (
    <Shell churchId={churchId} churchName={churchName}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: P.textSoft, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link href={`/dashboard/church/${churchId}`} className="um-link" style={{ color: P.textSoft, textDecoration: 'none' }}>Home</Link>
        <span>›</span>
        <Link href={base} className="um-link" style={{ color: P.textSoft, textDecoration: 'none' }}>Ministries</Link>
        {parent && (<><span>›</span><Link href={`${base}/${parent.id}`} className="um-link" style={{ color: P.textSoft, textDecoration: 'none' }}>{parent.name}</Link></>)}
        <span>›</span>
        <span style={{ color: P.text, fontWeight: 600 }}>{ministry.name}</span>
      </nav>

      {/* Banner */}
      <section className="um-banner um-gradient" style={{ borderRadius: 28, overflow: 'hidden', marginBottom: 24, minHeight: 220, boxShadow: P.shadow }}>
        <div className="um-banner-text" style={{ flex: 1, padding: '34px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ width: 58, height: 58, borderRadius: 20, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(36,50,74,0.08)', flexShrink: 0 }}>
              <MinistryIcon kind={kind} size={28} />
            </div>
            <StatusPill status={ministry.status} />
          </div>
          <h1 className="um-banner-title" style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{ministry.name}</h1>
          <div style={{ fontSize: 15, fontWeight: 700, color: P.goldText, letterSpacing: 0.4, marginBottom: 10 }}>{taglineFor(ministry.name, ministry.category)}</div>
          {parent && <div style={{ fontSize: 13, color: P.textSoft, marginBottom: 8 }}>Part of <Link href={`${base}/${parent.id}`} className="um-link" style={{ color: P.text, fontWeight: 700, textDecoration: 'none' }}>{parent.name}</Link></div>}
          {ministry.description && <p style={{ margin: '0 0 18px', fontSize: 14.5, lineHeight: 1.55, color: P.textSoft, maxWidth: 520 }}>{ministry.description}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setManaging(true)} style={btnPrimary}>
              <MinistryIcon kind="users" size={16} /> Manage members
            </button>
            <ActionMenu label={`More actions for ${ministry.name}`} items={menuItems} />
          </div>
        </div>
        <div className="um-banner-art" aria-hidden="true">
          <BannerVisual />
        </div>
      </section>

      {/* Key facts */}
      <section aria-label="Ministry details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 30 }}>
        {info.map((it) => (
          <div key={it.label} style={{ background: it.bg, borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MinistryIcon kind={it.icon} size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: P.textSoft, fontWeight: 600 }}>{it.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.value}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Sub-ministries */}
      {isTopLevel && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Sub-ministries</h2>
            <button onClick={() => setFormState({ editing: null, parentId: ministry.id })} style={btnSoft}>+ Add sub-ministry</button>
          </div>
          {subs.length === 0 ? (
            <p style={{ margin: 0, background: P.white, borderRadius: 18, padding: '18px 20px', fontSize: 13.5, color: P.textSoft, boxShadow: P.shadow }}>
              No sub-ministries yet. Add one to organize smaller teams inside {ministry.name}.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
              {subs.map((s, i) => (
                <Link key={s.id} href={`${base}/${s.id}`} className="um-card" style={{ textDecoration: 'none', color: P.text, background: TINTS[i % TINTS.length].bg, borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MinistryIcon kind={iconKindFor(s.name, s.category)} size={20} />
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: P.textSoft }}>
                    {s.memberCount} member{s.memberCount === 1 ? '' : 's'} · {s.leaderName ?? 'No leader yet'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Workspace tools */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 800 }}>Workspace</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
          {tools.map((t, i) => {
            const linked = t.match ? subs.find((s) => t.match!.test(s.name.toLowerCase())) : undefined;
            const content = (
              <>
                <div style={{ width: 40, height: 40, borderRadius: 14, background: TINTS[i % TINTS.length].bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MinistryIcon kind={t.icon} size={19} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.label}</div>
                <span style={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: linked ? P.green : P.cream, color: linked ? '#3E6B2F' : P.goldText }}>
                  {linked ? 'Open' : 'Soon'}
                </span>
              </>
            );
            const style = { background: P.white, border: `1px solid ${P.border}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 10, boxShadow: P.shadow, textDecoration: 'none', color: P.text };
            return linked ? (
              <Link key={t.label} href={`${base}/${linked.id}`} className="um-card" style={style}>{content}</Link>
            ) : (
              <div key={t.label} style={{ ...style, opacity: 0.9 }}>{content}</div>
            );
          })}
        </div>
      </section>

      {/* Members */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Members</h2>
          <button onClick={() => setManaging(true)} style={btnSoft}>Manage members</button>
        </div>
        {assigned.length === 0 ? (
          <p style={{ margin: 0, background: P.white, borderRadius: 18, padding: '18px 20px', fontSize: 13.5, color: P.textSoft, boxShadow: P.shadow }}>
            No members assigned yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {assigned.map((mb, i) => (
              <div key={mb.id} style={{ display: 'flex', alignItems: 'center', gap: 9, background: P.white, border: `1px solid ${P.border}`, borderRadius: 999, padding: '6px 14px 6px 6px', boxShadow: P.shadow }}>
                <span style={{ width: 30, height: 30, borderRadius: 999, background: TINTS[i % TINTS.length].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{initialsOf(mb.fullName)}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{mb.fullName}</span>
                {ministry.leaderId === mb.id && <span style={{ fontSize: 10.5, fontWeight: 700, color: P.goldText }}>Leader</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {formState && (
        <MinistryFormModal
          organizerId={uid}
          churchId={churchId}
          ministries={ministries}
          members={members}
          editing={formState.editing}
          initialParentId={formState.parentId}
          onClose={() => setFormState(null)}
        />
      )}
      {managing && <ManageMembersModal ministry={ministry} members={members} onClose={() => setManaging(false)} />}
    </Shell>
  );
}

function Shell({ churchId, churchName, children }: { churchId: string; churchName?: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: P.page, display: 'flex', fontFamily: P.font, color: P.text }}>
      <ChurchPageStyles />
      <ChurchSidebar churchId={churchId} churchName={churchName} />
      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="um-wrap" style={{ maxWidth: 1240, boxSizing: 'border-box' }}>
          {children}
          <footer style={{ marginTop: 44, textAlign: 'center', fontSize: 11.5, color: P.textSoft }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved
          </footer>
        </div>
      </main>
    </div>
  );
}
