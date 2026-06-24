'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  primary:   '#123E63',
  primaryHover: '#0E5E86',
  turquoise: '#14B8B0',
  gold:      '#D4A857',
  bg:        '#FAF7F0',
  surface:   '#FFFFFF',
  border:    '#E8ECEF',
  textDark:  '#1A2B49',
  textGris:  '#6B7280',
};

type ModuleStatus = 'available' | 'coming-soon' | 'active' | 'unavailable';

type ModuleDef = {
  icon: string;
  title: string;
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
  availability: 'Global' | 'Region Limited';
  status: ModuleStatus;
  compatibleWith: string[];
};

const MODULES: ModuleDef[] = [
  { icon:'🤝', title:'Tontine / Sol', desc:'Cycles, rotation, receipts, organizer commission', version:'V1', setupTime:'~5 min', category:'Finance', countries:'150+ countries', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, availability:'Global', status:'available', compatibleWith:['Organization'] },
  { icon:'🏛️', title:'Association', desc:'Members, dues, events, votes, reports', version:'V1', setupTime:'~7 min', category:'Community', countries:'Global', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:false, availability:'Global', status:'available', compatibleWith:['Investment'] },
  { icon:'⛪', title:'Church', desc:'Tithes, offerings, members, departments, badges', version:'V1', setupTime:'~10 min', category:'Faith', countries:'150+ countries', languages:'120+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:true, availability:'Global', status:'available', compatibleWith:['Foundation'] },
  { icon:'💼', title:'Investment', desc:'Projects, capital, returns, financial reports', version:'V1', setupTime:'~8 min', category:'Investment', countries:'Global', languages:'25+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, availability:'Global', status:'available', compatibleWith:['Association'] },
  { icon:'🌾', title:'Agriculture', desc:'Cooperatives, harvests, group purchases', version:'V2', setupTime:'~6 min', category:'Agriculture', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:true, availability:'Region Limited', status:'available', compatibleWith:['Cooperative'] },
  { icon:'🤲', title:'Foundation', desc:'Donations, projects, impact reports, grants', version:'V2', setupTime:'~6 min', category:'Foundation', countries:'Global', languages:'25+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, availability:'Global', status:'available', compatibleWith:['Church'] },
  { icon:'🏠', title:'Orphanage', desc:'Children records, sponsors, care plans, donations', version:'V2', setupTime:'~8 min', category:'Foundation', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:true, availability:'Region Limited', status:'available', compatibleWith:['Foundation'] },
  { icon:'🤝', title:'Cooperative', desc:'Shared resources, member shares, collective purchases', version:'V2', setupTime:'~6 min', category:'Cooperative', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Starter', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, availability:'Region Limited', status:'available', compatibleWith:['Agriculture'] },
  { icon:'🏢', title:'Organization', desc:'Members, structure, governance, reports', version:'V2', setupTime:'~7 min', category:'Organization', countries:'Global', languages:'25+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:false, availability:'Global', status:'available', compatibleWith:['Tontine / Sol'] },
  { icon:'🎓', title:'Education', desc:'Schools, courses, students, grades, enrollment', version:'V2', setupTime:'~9 min', category:'Education', countries:'Select regions', languages:'25+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:true, offlineSupport:true, availability:'Region Limited', status:'coming-soon', compatibleWith:['Organization'] },
  { icon:'🏥', title:'Health', desc:'Health mutuals, coverage, claims', version:'V3', setupTime:'~9 min', category:'Health', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Enterprise', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, availability:'Region Limited', status:'coming-soon', compatibleWith:['Foundation'] },
  { icon:'🎉', title:'Youth Club', desc:'Activities, members, events, fees', version:'V3', setupTime:'~5 min', category:'Youth', countries:'Global', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:false, offlineSupport:false, availability:'Global', status:'available', compatibleWith:['Sport'] },
  { icon:'🛒', title:'Commerce', desc:'Orders, inventory, group sales, vendor payouts', version:'V3', setupTime:'~10 min', category:'Commerce', countries:'Select regions', languages:'15+ languages', subscriptionLevel:'Pro', memberLimit:'Unlimited', badgeSupport:false, reportsSupport:true, offlineSupport:false, availability:'Region Limited', status:'coming-soon', compatibleWith:['Cooperative'] },
  { icon:'⚽', title:'Sport', desc:'Teams, leagues, matches, registrations, fees', version:'V3', setupTime:'~6 min', category:'Sports', countries:'Global', languages:'25+ languages', subscriptionLevel:'Free', memberLimit:'Unlimited', badgeSupport:true, reportsSupport:false, offlineSupport:false, availability:'Global', status:'available', compatibleWith:['Youth Club'] },
];

const CATEGORIES = ['All', 'Finance', 'Community', 'Faith', 'Agriculture', 'Foundation', 'Health', 'Commerce', 'Organization', 'Education', 'Youth', 'Sports', 'Investment', 'Cooperative'];

const STATUS_LABEL: Record<ModuleStatus, string> = {
  available: 'Activate',
  'coming-soon': 'Coming Soon',
  active: 'Already Active',
  unavailable: 'Unavailable',
};

export default function ChooseModulePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [activating, setActivating] = useState<ModuleDef | null>(null);
  const [learnMore, setLearnMore] = useState<ModuleDef | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return MODULES.filter(m => {
      const haystack = [m.title, m.desc, m.category, m.countries, m.languages, m.subscriptionLevel].join(' ').toLowerCase();
      const matchesQuery = haystack.includes(q);
      const matchesCategory = category === 'All' || m.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  const handleActivateChoice = (mode: 'new' | 'existing') => {
    if (!activating) return;
    const slug = activating.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    router.push(mode === 'new' ? `/dashboard/create-workspace?module=${slug}` : `/dashboard/connect-workspace?module=${slug}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '0 0 32px' }}>
      <style>{`
        .module-card { transition: all 0.15s ease; border-top: 2px solid ${C.turquoise}; height: 190px; overflow: hidden; }
        .module-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(18,62,99,0.13); }
        .module-pill { transition: all 0.15s ease; cursor: pointer; }
        .modules-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: start; }
        .modules-sidebar { position: sticky; top: 14px; }
        .modules-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .btn-primary { background: ${C.primary}; color: white; transition: background 0.15s ease; }
        .btn-primary:hover { background: ${C.primaryHover}; }
        .btn-primary:disabled { background: ${C.border}; color: ${C.textGris}; cursor: not-allowed; }
        .btn-secondary { background: white; color: ${C.primary}; border: 1.5px solid ${C.turquoise}; transition: background 0.15s ease, color 0.15s ease; }
        .btn-secondary:hover { background: ${C.turquoise}; color: white; }
        @media (max-width: 1300px) { .modules-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 1024px) {
          .modules-layout { grid-template-columns: 1fr !important; }
          .modules-sidebar { position: relative !important; top: 0 !important; }
          .modules-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 700px) { .modules-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 420px) { .modules-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ background: `linear-gradient(135deg, ${C.primary} 0%, ${C.turquoise} 100%)`, padding: '22px 32px 16px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 800, margin: '0 0 3px' }}>Choose Your Module</h1>
        <p style={{ color: C.gold, fontSize: '12px', margin: 0, fontWeight: 500 }}>Start with one module and expand later.</p>
      </div>

      <div style={{ maxWidth: '1500px', margin: '14px auto 0', padding: '0 18px' }}>
        <div className="modules-layout">

          <div className="modules-sidebar">
            <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '11px' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                style={{ width: '100%', padding: '7px 9px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '11px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', color: C.textDark }}
              />
              <button onClick={() => setFiltersOpen(o => !o)}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '2px 0', fontSize: '10px', fontWeight: 700, color: C.textGris, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', marginBottom: '4px' }}>
                Category {filtersOpen ? '▾' : '▸'}
              </button>
              {filtersOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '300px', overflowY: 'auto' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} className="module-pill" onClick={() => setCategory(c)}
                      style={{ textAlign: 'left', padding: '6px 9px', borderRadius: '6px', border: 'none', background: category === c ? C.turquoise : 'transparent', color: category === c ? 'white' : C.textDark, fontSize: '11.5px', fontWeight: category === c ? 700 : 500 }}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modules-grid">
            {filtered.map(m => (
              <div key={m.title} className="module-card" style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontSize: '25px' }}>{m.icon}</div>
                  <span style={{ fontSize: '9px', background: C.bg, color: C.primary, padding: '2px 7px', borderRadius: '14px', fontWeight: 700 }}>{m.version}</span>
                </div>
                <h3 style={{ color: C.textDark, fontSize: '13.5px', fontWeight: 800, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</h3>
                <p style={{ color: C.textGris, fontSize: '11px', margin: '0 0 7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.desc}</p>

                <span style={{
                  fontSize: '9px', fontWeight: 700, marginBottom: '10px',
                  color: m.availability === 'Global' ? '#2E7D5C' : '#9A6A00',
                  background: m.availability === 'Global' ? '#EFF6F2' : '#FFF3E0',
                  padding: '3px 7px', borderRadius: '8px', display: 'inline-block', width: 'fit-content',
                }}>
                  {m.availability}
                </span>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button className="btn-primary" disabled={m.status !== 'available'} onClick={() => m.status === 'available' && setActivating(m)}
                    style={{ flex: 1, minHeight: '44px', padding: '8px', border: 'none', borderRadius: '8px', fontSize: '10.5px', fontWeight: 700, cursor: m.status === 'available' ? 'pointer' : 'not-allowed' }}>
                    {STATUS_LABEL[m.status]}
                  </button>
                  <button className="btn-secondary" onClick={() => setLearnMore(m)}
                    style={{ flex: 1, minHeight: '44px', padding: '8px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 600, cursor: 'pointer' }}>
                    Learn More
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 0', color: C.textGris }}>
                No modules match your search.
              </div>
            )}
          </div>

        </div>
      </div>

      {learnMore && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,43,73,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setLearnMore(null)}>
          <div style={{ background: 'white', borderRadius: '18px', padding: '28px', maxWidth: '420px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '34px', marginBottom: '8px' }}>{learnMore.icon}</div>
            <h3 style={{ color: C.textDark, fontSize: '19px', fontWeight: 800, margin: '0 0 4px' }}>{learnMore.title}</h3>
            <p style={{ color: C.textGris, fontSize: '13px', margin: '0 0 16px', lineHeight: 1.5 }}>{learnMore.desc}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: C.textGris, background: C.bg, borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
              <div>Setup time: <strong style={{ color: C.textDark }}>{learnMore.setupTime}</strong></div>
              <div>Coverage: <strong style={{ color: C.textDark }}>{learnMore.countries}</strong></div>
              <div>Languages: <strong style={{ color: C.textDark }}>{learnMore.languages}</strong></div>
              <div>Tier: <strong style={{ color: C.textDark }}>{learnMore.subscriptionLevel}</strong></div>
              <div>Members: <strong style={{ color: C.textDark }}>{learnMore.memberLimit}</strong></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {learnMore.badgeSupport && <span title="Badge support">🪪</span>}
                {learnMore.reportsSupport && <span title="Reports">📊</span>}
                {learnMore.offlineSupport && <span title="Offline support">📶</span>}
              </div>
            </div>

            <p style={{ fontSize: '12px', color: C.textGris, margin: '0 0 18px' }}>
              Works well with: <strong style={{ color: C.primary }}>{learnMore.compatibleWith.join(', ')}</strong>
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" disabled={learnMore.status !== 'available'}
                onClick={() => { if (learnMore.status === 'available') { setActivating(learnMore); setLearnMore(null); } }}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: learnMore.status === 'available' ? 'pointer' : 'not-allowed' }}>
                {STATUS_LABEL[learnMore.status]}
              </button>
              <button onClick={() => setLearnMore(null)}
                style={{ flex: 1, padding: '12px', background: 'none', border: `1.5px solid ${C.border}`, borderRadius: '10px', fontSize: '13px', color: C.textGris, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
