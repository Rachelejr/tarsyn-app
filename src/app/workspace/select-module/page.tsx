'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ── PREMIUM PALETTE — Royal Ocean Blue + Turquoise + Soft Gold ──
const C = {
  primary:   '#123E63', // Royal Ocean Blue
  primaryHover: '#0E5E86',
  turquoise: '#14B8B0', // Premium Turquoise
  gold:      '#D4A857', // Soft Gold
  bg:        '#FAF7F0', // Warm Ivory
  surface:   '#FFFFFF',
  border:    '#E8ECEF',
  textDark:  '#1A2B49',
  textGris:  '#6B7280',
};

type ModuleDef = {
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
  version: string;
  setupTime: string;
  category: string;
  countries: string;
  languages: string;
  subscriptionLevel: string;
  memberLimit: string;
  badgeSupport: boolean;
  reportsSupport: boolean;
  offlineSupport: boolean;
  tags: string[];
  compatibleWith: string[];
};

const MODULES: ModuleDef[] = [
  { icon:'🤝', title:'Tontine / Sol', subtitle:'Rotating community savings', desc:'Cycles, rotation, receipts, organizer commission', version:'V1', setupTime:'~5 min', category:'Finance', countries:'150+ countries', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, tags:['Recommended','Popular','Global'], compatibleWith:['Organization'] },
  { icon:'🏛️', title:'Association', subtitle:'Members, dues & governance', desc:'Members, dues, events, votes, reports', version:'V1', setupTime:'~7 min', category:'Community', countries:'Global', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:false, tags:['Popular','Global'], compatibleWith:['Investment'] },
  { icon:'⛪', title:'Church', subtitle:'Faith community management', desc:'Tithes, offerings, members, departments, badges', version:'V1', setupTime:'~10 min', category:'Faith', countries:'150+ countries', languages:'120+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:true, tags:['Popular','Global'], compatibleWith:['Foundation'] },
  { icon:'💼', title:'Investment', subtitle:'Capital & returns tracking', desc:'Projects, capital, returns, financial reports', version:'V1', setupTime:'~8 min', category:'Investment', countries:'Global', languages:'25+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, tags:['Global'], compatibleWith:['Association'] },
  { icon:'🌾', title:'Agriculture', subtitle:'Cooperative farming tools', desc:'Cooperatives, harvests, group purchases', version:'V2', setupTime:'~6 min', category:'Agriculture', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:true, tags:['New','Regional'], compatibleWith:['Cooperative'] },
  { icon:'🤲', title:'Foundation', subtitle:'Donations & impact reports', desc:'Donations, projects, impact reports, grants', version:'V2', setupTime:'~6 min', category:'Foundation', countries:'Global', languages:'25+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, tags:['Global'], compatibleWith:['Church'] },
  { icon:'🏠', title:'Orphanage', subtitle:'Care & sponsorship records', desc:'Children records, sponsors, care plans, donations', version:'V2', setupTime:'~8 min', category:'Foundation', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:true, tags:['Regional'], compatibleWith:['Foundation'] },
  { icon:'🤝', title:'Cooperative', subtitle:'Shared resources & shares', desc:'Shared resources, member shares, collective purchases', version:'V2', setupTime:'~6 min', category:'Cooperative', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, tags:['Regional'], compatibleWith:['Agriculture','Commerce'] },
  { icon:'🏢', title:'Organization', subtitle:'Structure & governance', desc:'Members, structure, governance, reports', version:'V2', setupTime:'~7 min', category:'Organization', countries:'Global', languages:'25+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:false, tags:['Global'], compatibleWith:['Tontine / Sol'] },
  { icon:'🎓', title:'Education', subtitle:'Schools & student management', desc:'Schools, courses, students, grades, enrollment', version:'V2', setupTime:'~9 min', category:'Education', countries:'Select regions', languages:'25+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:true, tags:['New','Regional'], compatibleWith:['Organization'] },
  { icon:'🏥', title:'Health', subtitle:'Health mutuals & coverage', desc:'Health mutuals, coverage, claims', version:'V3', setupTime:'~9 min', category:'Health', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Enterprise', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, tags:['New','Regional','Enterprise'], compatibleWith:['Foundation'] },
  { icon:'🎉', title:'Youth Club', subtitle:'Activities & member fees', desc:'Activities, members, events, fees', version:'V3', setupTime:'~5 min', category:'Youth', countries:'Global', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:false, offlineSupport:false, tags:['New','Global'], compatibleWith:['Sport'] },
  { icon:'🛒', title:'Commerce', subtitle:'Orders & vendor payouts', desc:'Orders, inventory, group sales, vendor payouts', version:'V3', setupTime:'~10 min', category:'Commerce', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, tags:['New','Regional'], compatibleWith:['Cooperative'] },
  { icon:'⚽', title:'Sport', subtitle:'Teams, leagues & matches', desc:'Teams, leagues, matches, registrations, fees', version:'V3', setupTime:'~6 min', category:'Sports', countries:'Global', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:false, offlineSupport:false, tags:['New','Global'], compatibleWith:['Youth Club'] },
];

const CATEGORIES = ['All', 'Finance', 'Community', 'Faith', 'Agriculture', 'Foundation', 'Health', 'Commerce', 'Organization', 'Education', 'Youth', 'Sports', 'Investment', 'Cooperative', 'More'];
const QUICK_FILTERS = ['Recommended', 'Popular', 'New'] as const;

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  Recommended: { bg: 'rgba(20,184,176,0.15)', color: C.turquoise },
  Popular:     { bg: 'rgba(212,168,87,0.18)', color: C.gold },
  New:         { bg: 'rgba(18,62,99,0.10)', color: C.primary },
  Global:      { bg: '#EFF6F2', color: '#2E7D5C' },
  Regional:    { bg: '#FFF3E0', color: '#9A6A00' },
  'Coming Soon': { bg: '#F1F1F1', color: C.textGris },
  Enterprise:  { bg: C.primary, color: 'white' },
  Beta:        { bg: 'rgba(20,184,176,0.10)', color: C.turquoise },
};

export default function ChooseModulePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [activating, setActivating] = useState<ModuleDef | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return MODULES.filter(m => {
      const haystack = [
        m.title, m.desc, m.subtitle, m.category, m.countries, m.languages, m.subscriptionLevel,
      ].join(' ').toLowerCase();
      const matchesQuery = haystack.includes(q);
      const matchesCategory = category === 'All' || m.category === category;
      const matchesQuick =
        !quickFilter ||
        (quickFilter === 'Recommended' && m.tags.includes('Recommended')) ||
        (quickFilter === 'Popular' && m.tags.includes('Popular')) ||
        (quickFilter === 'New' && m.tags.includes('New'));
      return matchesQuery && matchesCategory && matchesQuick;
    });
  }, [query, category, quickFilter]);

  const handleActivateChoice = (mode: 'new' | 'existing') => {
    if (!activating) return;
    const slug = activating.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (mode === 'new') {
      router.push(`/dashboard/create-workspace?module=${slug}`);
    } else {
      router.push(`/dashboard/connect-workspace?module=${slug}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '0 0 64px' }}>
      <style>{`
        .module-card { transition: all 0.2s ease; border-top: 3px solid ${C.turquoise}; }
        .module-card:hover { transform: translateY(-5px); box-shadow: 0 12px 40px rgba(18,62,99,0.10); }
        .module-pill { transition: all 0.15s ease; cursor: pointer; }
        .modules-landscape { display: grid; grid-template-columns: 250px 1fr; gap: 24px; align-items: start; }
        .modules-sidebar { position: sticky; top: 24px; }
        .btn-primary { background: ${C.primary}; color: white; transition: background 0.15s ease; }
        .btn-primary:hover { background: ${C.primaryHover}; }
        .btn-secondary { background: white; color: ${C.primary}; border: 1.5px solid ${C.turquoise}; transition: background 0.15s ease, color 0.15s ease; }
        .btn-secondary:hover { background: ${C.turquoise}; color: white; }
        @media (max-width: 900px) {
          .modules-landscape { grid-template-columns: 1fr !important; }
          .modules-sidebar { position: relative !important; top: 0 !important; }
        }
      `}</style>

      {/* HERO */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.turquoise} 100%)`, padding: '52px 32px 36px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 800, margin: '0 0 8px' }}>Choose Your Module</h1>
        <p style={{ color: C.gold, fontSize: '15px', margin: 0, fontWeight: 500 }}>Start with one module and expand later.</p>
      </div>

      <div style={{ maxWidth: '1360px', margin: '24px auto 0', padding: '0 24px' }}>
        <div className="modules-landscape">

          {/* SIDEBAR */}
          <div className="modules-sidebar">
            <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '18px' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search modules, features, countries..."
                style={{ width: '100%', padding: '11px 13px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', color: C.textDark }}
              />

              <p style={{ fontSize: '11px', fontWeight: 700, color: C.textGris, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Category</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px', maxHeight: '320px', overflowY: 'auto' }}>
                {CATEGORIES.map(c => (
                  <button key={c} className="module-pill" onClick={() => setCategory(c)}
                    style={{ textAlign: 'left', padding: '8px 11px', borderRadius: '8px', border: 'none', background: category === c ? C.turquoise : 'transparent', color: category === c ? 'white' : C.textDark, fontSize: '13px', fontWeight: category === c ? 700 : 500 }}
                    onMouseEnter={e => { if (category !== c) (e.currentTarget as HTMLElement).style.background = '#EAF2F8'; }}
                    onMouseLeave={e => { if (category !== c) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    {c}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '11px', fontWeight: 700, color: C.textGris, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>Quick Filters</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                {QUICK_FILTERS.map(f => (
                  <button key={f} className="module-pill" onClick={() => setQuickFilter(quickFilter === f ? null : f)}
                    style={{ textAlign: 'left', padding: '8px 11px', borderRadius: '8px', border: `1.5px solid ${quickFilter === f ? C.gold : C.border}`, background: quickFilter === f ? 'rgba(212,168,87,0.12)' : 'white', color: C.primary, fontSize: '13px', fontWeight: 700 }}>
                    {f}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: C.textGris, margin: 0, lineHeight: 1.5 }}>
                Coverage, languages, and subscription level shown on each card.
              </p>
            </div>
          </div>

          {/* MODULE GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {filtered.map(m => (
              <div key={m.title} className="module-card" style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '38px' }}>{m.icon}</div>
                  <span style={{ fontSize: '11px', background: C.bg, color: C.primary, padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>{m.version}</span>
                </div>
                <h3 style={{ color: C.textDark, fontSize: '17px', fontWeight: 800, margin: '0 0 2px' }}>{m.title}</h3>
                <p style={{ color: C.turquoise, fontSize: '12px', fontWeight: 600, margin: '0 0 8px' }}>{m.subtitle}</p>
                <p style={{ color: C.textGris, fontSize: '13px', margin: '0 0 12px', lineHeight: 1.5, flex: 1 }}>{m.desc}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {m.tags.map(tag => (
                    <span key={tag} style={{ fontSize: '10px', background: TAG_STYLES[tag]?.bg || '#F1F1F1', color: TAG_STYLES[tag]?.color || C.textGris, padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', color: C.textGris, marginBottom: '10px', background: C.bg, borderRadius: '10px', padding: '10px' }}>
                  <div><strong style={{ color: C.textDark }}>{m.setupTime}</strong> setup</div>
                  <div><strong style={{ color: C.textDark }}>{m.countries}</strong></div>
                  <div><strong style={{ color: C.textDark }}>{m.languages}</strong></div>
                  <div><strong style={{ color: C.textDark }}>{m.subscriptionLevel}</strong> tier</div>
                  <div><strong style={{ color: C.textDark }}>{m.memberLimit}</strong> members</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {m.badgeSupport && <span title="Badge support">🪪</span>}
                    {m.reportsSupport && <span title="Reports">📊</span>}
                    {m.offlineSupport && <span title="Offline support">📶</span>}
                  </div>
                </div>

                <p style={{ fontSize: '10px', color: C.textGris, margin: '0 0 14px' }}>
                  Works well with: <strong style={{ color: C.primary }}>{m.compatibleWith.join(', ')}</strong>
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary" onClick={() => setActivating(m)}
                    style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Activate
                  </button>
                  <button className="btn-secondary" onClick={() => router.push(`/modules/${m.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`)}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Learn More
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: C.textGris }}>
                No modules match your search.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ACTIVATION MODAL */}
      {activating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,43,73,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{activating.icon}</div>
            <h3 style={{ color: C.textDark, fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>Activate {activating.title}</h3>
            <p style={{ color: C.textGris, fontSize: '13px', margin: '0 0 24px' }}>How do you want to set this up?</p>

            <button className="btn-primary" onClick={() => handleActivateChoice('new')}
              style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>
              Create New Workspace
            </button>
            <button className="btn-secondary" onClick={() => handleActivateChoice('existing')}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '14px' }}>
              Connect to Existing Workspace
            </button>
            <button onClick={() => setActivating(null)}
              style={{ background: 'none', border: 'none', color: C.textGris, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
