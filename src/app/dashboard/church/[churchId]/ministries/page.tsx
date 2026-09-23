'use client';

// src/app/dashboard/church/[churchId]/ministries/page.tsx
//
// Ministries - list page (new visual direction).
// Same data as before (churchMinistries / churchMembers, organizerId +
// churchId), same create / edit / delete / member-assignment logic - only
// the experience changes: pastel banner, stat cards, a modern grid of
// ministry cards, and Edit / Delete moved into each card's "..." menu.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ChurchSidebar from '@/components/church/ChurchSidebar';
import type { Ministry } from '@/types/ministry';
import {
  P, useMinistriesData, deleteMinistry, iconKindFor, MinistryIcon, CardArt, CommunityArt,
  StatusPill, ActionMenu, BannerVisual, ChurchPageStyles, MinistryFormModal, ManageMembersModal,
  btnPrimary, TINTS,
} from '@/components/church/ministryKit';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function MinistriesPage() {
  const params = useParams();
  const router = useRouter();
  const churchId = params?.churchId as string;
  const { uid, churchName, ministries, members, loading, error } = useMinistriesData(churchId);

  const [formState, setFormState] = useState<{ editing: Ministry | null; parentId: string | null } | null>(null);
  const [managing, setManaging] = useState<Ministry | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<string>('');

  const topLevel = useMemo(() => ministries.filter((m) => !m.parentMinistryId), [ministries]);
  const subCount = useMemo(() => {
    const map = new Map<string, number>();
    ministries.forEach((m) => { if (m.parentMinistryId) map.set(m.parentMinistryId, (map.get(m.parentMinistryId) ?? 0) + 1); });
    return map;
  }, [ministries]);

  const stats = useMemo(() => {
    const uniqueMembers = new Set<string>();
    ministries.forEach((m) => m.memberIds.forEach((id) => uniqueMembers.add(id)));
    return {
      total: topLevel.length,
      active: topLevel.filter((m) => m.status === 'active').length,
      members: uniqueMembers.size,
      subs: ministries.length - topLevel.length,
    };
  }, [ministries, topLevel]);

  const categories = useMemo(
    () => Array.from(new Set(topLevel.map((m) => (m.category || '').trim()).filter(Boolean))).sort(),
    [topLevel],
  );

  const visible = topLevel.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (category && (m.category || '').trim() !== category) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${m.name} ${m.leaderName ?? ''} ${m.category ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const openCreate = (parentId: string | null = null) => setFormState({ editing: null, parentId });
  const openEdit = (m: Ministry) => setFormState({ editing: m, parentId: m.parentMinistryId });
  const detailHref = (m: Ministry) => `/dashboard/church/${churchId}/ministries/${m.id}`;

  const statCards = [
    { label: 'Ministries', value: stats.total, bg: P.pink, icon: 'sprout' as const },
    { label: 'Active ministries', value: stats.active, bg: P.green, icon: 'check' as const },
    { label: 'Members', value: stats.members, bg: P.cream, icon: 'users' as const },
    { label: 'Sub-ministries', value: stats.subs, bg: P.lavender, icon: 'handshake' as const },
  ];

  const chip = (active: boolean) => ({
    border: `1px solid ${active ? 'rgba(216,177,90,0.5)' : P.border}`,
    background: active ? P.activeGradient : P.white,
    color: P.text, borderRadius: 999, padding: '8px 16px', fontSize: 12.5,
    fontWeight: active ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ minHeight: '100vh', background: P.page, display: 'flex', fontFamily: P.font, color: P.text }}>
      <ChurchPageStyles />
      <ChurchSidebar churchId={churchId} churchName={churchName} />

      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="um-wrap" style={{ maxWidth: 1320, boxSizing: 'border-box' }}>

          <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: P.textSoft, marginBottom: 16 }}>
            <Link href={`/dashboard/church/${churchId}`} className="um-link" style={{ color: P.textSoft, textDecoration: 'none' }}>Home</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span style={{ color: P.text, fontWeight: 600 }}>Ministries</span>
          </nav>

          {/* Banner */}
          <section className="um-banner um-gradient" style={{ borderRadius: 28, overflow: 'hidden', marginBottom: 26, minHeight: 230, boxShadow: P.shadow }}>
            <div className="um-banner-text" style={{ flex: 1, padding: '38px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: P.goldText, marginBottom: 10 }}>SERVE · ORGANIZE · GROW</div>
              <h1 className="um-banner-title" style={{ margin: '0 0 10px', fontSize: 34, fontWeight: 800, letterSpacing: -0.5, color: P.text }}>Ministries</h1>
              <p style={{ margin: '0 0 22px', fontSize: 15.5, lineHeight: 1.55, color: P.textSoft, maxWidth: 480 }}>
                Different gifts, one calling: to serve God and impact lives.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => openCreate()} style={btnPrimary}>
                  <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Ministry
                </button>
              </div>
            </div>
            <div className="um-banner-art" aria-hidden="true">
              <BannerVisual />
            </div>
          </section>

          {/* Stats */}
          <section aria-label="Ministry statistics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
            {statCards.map((s) => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 16, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MinistryIcon kind={s.icon} size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.05 }}>{loading ? '–' : s.value}</div>
                  <div style={{ fontSize: 12.5, color: P.textSoft, fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </section>

          {/* Toolbar */}
          <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="um-chip" onClick={() => { setStatusFilter('all'); setCategory(''); }} style={chip(statusFilter === 'all' && !category)}>All</button>
              <button className="um-chip" onClick={() => setStatusFilter('active')} style={chip(statusFilter === 'active')}>Active</button>
              <button className="um-chip" onClick={() => setStatusFilter('inactive')} style={chip(statusFilter === 'inactive')}>Inactive</button>
              {categories.map((c) => (
                <button key={c} className="um-chip" onClick={() => setCategory(category === c ? '' : c)} style={chip(category === c)}>{c}</button>
              ))}
            </div>
            <div style={{ position: 'relative', flex: '0 1 280px', minWidth: 200 }}>
              <label htmlFor="ministry-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search ministries</label>
              <span aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.textSoft} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </span>
              <input
                id="ministry-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a ministry or leader…"
                style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${P.border}`, borderRadius: 999, padding: '10px 14px 10px 38px', fontSize: 13.5, background: P.white, color: P.text, fontFamily: 'inherit' }}
              />
            </div>
          </section>

          {error && <p style={{ background: '#FDECEE', color: '#B4474F', borderRadius: 14, padding: '12px 16px', fontSize: 13.5 }}>{error}</p>}

          {/* Grid */}
          {loading ? (
            <div style={{ background: P.white, borderRadius: 22, padding: 40, textAlign: 'center', color: P.textSoft, boxShadow: P.shadow }}>Loading ministries…</div>
          ) : topLevel.length === 0 ? (
            <div style={{ background: P.white, borderRadius: 26, overflow: 'hidden', boxShadow: P.shadow, textAlign: 'center' }}>
              <div style={{ height: 160, background: P.gradient }}><CommunityArt /></div>
              <div style={{ padding: '26px 24px 32px' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 800 }}>No ministries yet</h2>
                <p style={{ margin: '0 0 18px', fontSize: 14, color: P.textSoft }}>Create your first ministry to start organizing your teams.</p>
                <button onClick={() => openCreate()} style={btnPrimary}>+ New Ministry</button>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ background: P.white, borderRadius: 22, padding: 36, textAlign: 'center', color: P.textSoft, boxShadow: P.shadow }}>No ministry matches these filters.</div>
          ) : (
            <section aria-label="Ministries" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
              {visible.map((m, i) => {
                const kind = iconKindFor(m.name, m.category);
                const subs = subCount.get(m.id) ?? 0;
                return (
                  <article key={m.id} className="um-card" style={{ background: P.white, borderRadius: 22, overflow: 'hidden', boxShadow: P.shadow, border: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column' }}>
                    <CardArt kind={kind} tintIndex={i}>
                      <div style={{ position: 'absolute', top: 12, left: 12 }}><StatusPill status={m.status} /></div>
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <ActionMenu
                          label={`Actions for ${m.name}`}
                          items={[
                            { label: 'View ministry', onClick: () => router.push(detailHref(m)) },
                            { label: 'Manage members', onClick: () => setManaging(m) },
                            { label: 'Add sub-ministry', onClick: () => openCreate(m.id) },
                            { label: 'Edit', onClick: () => openEdit(m) },
                            { label: 'Delete', onClick: () => { deleteMinistry(m, ministries); }, danger: true },
                          ]}
                        />
                      </div>
                    </CardArt>
                    <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {m.category && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: P.goldText, textTransform: 'uppercase', marginBottom: 4 }}>{m.category}</div>}
                      <h2 style={{ margin: '0 0 8px', fontSize: 16.5, fontWeight: 800, lineHeight: 1.25 }}>{m.name}</h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12.5, color: P.textSoft, marginBottom: 10 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MinistryIcon kind="users" size={14} color={P.textSoft} />{m.memberCount} member{m.memberCount === 1 ? '' : 's'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MinistryIcon kind="star" size={14} color={P.textSoft} />{m.leaderName ?? 'No leader yet'}</span>
                      </div>
                      <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: P.textSoft, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {m.description || 'No description yet.'}
                      </p>
                      {subs > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, background: TINTS[(i + 3) % TINTS.length].bg, borderRadius: 999, padding: '4px 10px' }}>
                            {subs} sub-ministr{subs === 1 ? 'y' : 'ies'}
                          </span>
                        </div>
                      )}
                      <Link
                        href={detailHref(m)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', background: '#FBF7EC', border: `1px solid ${P.border}`, color: P.text, borderRadius: 999, padding: '10px 14px', fontSize: 13, fontWeight: 700 }}
                      >
                        View ministry <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          <footer style={{ marginTop: 44, textAlign: 'center', fontSize: 11.5, color: P.textSoft }}>
            Powered by UNIMUNITY™ · A product of Ma Production Luxenn Zara LLC · © 2026 All Rights Reserved
          </footer>
        </div>
      </main>

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
      {managing && <ManageMembersModal ministry={managing} members={members} onClose={() => setManaging(null)} />}
    </div>
  );
}
