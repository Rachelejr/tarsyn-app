'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bordeaux: '#B24C72',
  creme:    '#FBEEDD',
  dore:     '#E9C77B',
  rose:     '#EAD9BE',
  texteGris:'#B24C72',
  texteFonce:'#8F3A5A',
  border:   '#F0D5DF',
};

type ModuleDef = {
  icon: string;
  title: string;
  desc: string;
  version: string;
  setupTime: string;
  category: string;
  recommended?: boolean;
  popular?: boolean;
  newest?: boolean;
  countries?: string; // short note on country support
};

const MODULES: ModuleDef[] = [
  { icon:'🤝', title:'Tontine / Sol', desc:'Cycles, rotation, receipts, organizer commission', version:'V1', setupTime:'~5 min', category:'Finance', recommended:true, popular:true, countries:'Global' },
  { icon:'🏛️', title:'Association', desc:'Members, dues, events, votes, reports', version:'V1', setupTime:'~7 min', category:'Community', popular:true, countries:'Global' },
  { icon:'⛪', title:'Church', desc:'Tithes, offerings, members, departments, badges', version:'V1', setupTime:'~10 min', category:'Faith', popular:true, countries:'Global' },
  { icon:'💼', title:'Investment', desc:'Projects, capital, returns, financial reports', version:'V1', setupTime:'~8 min', category:'Finance', countries:'Global' },
  { icon:'🌾', title:'Agriculture', desc:'Cooperatives, harvests, group purchases', version:'V2', setupTime:'~6 min', category:'Agriculture', newest:true, countries:'Select regions' },
  { icon:'🤲', title:'Foundation', desc:'Donations, projects, impact reports, grants', version:'V2', setupTime:'~6 min', category:'Charity', countries:'Global' },
  { icon:'🤝', title:'Cooperative', desc:'Shared resources, member shares, collective purchases', version:'V2', setupTime:'~6 min', category:'Community', countries:'Select regions' },
  { icon:'🏢', title:'Organization', desc:'Members, structure, governance, reports', version:'V2', setupTime:'~7 min', category:'Community', countries:'Global' },
  { icon:'🏥', title:'Health', desc:'Health mutuals, coverage, claims', version:'V3', setupTime:'~9 min', category:'Health', newest:true, countries:'Select regions' },
  { icon:'🏠', title:'Orphanage', desc:'Children records, sponsors, care plans, donations', version:'V2', setupTime:'~8 min', category:'Charity', countries:'Select regions' },
  { icon:'🎉', title:'Youth Club', desc:'Activities, members, events, fees', version:'V3', setupTime:'~5 min', category:'Community', newest:true, countries:'Global' },
  { icon:'🛒', title:'Commerce', desc:'Orders, inventory, group sales, vendor payouts', version:'V3', setupTime:'~10 min', category:'Commerce', newest:true, countries:'Select regions' },
];

const CATEGORIES = ['All', 'Finance', 'Community', 'Faith', 'Agriculture', 'Charity', 'Health', 'Commerce'];
const QUICK_FILTERS = ['Recommended', 'Popular', 'Newest'] as const;

export default function ChooseModulePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [activating, setActivating] = useState<ModuleDef | null>(null);

  const filtered = useMemo(() => {
    return MODULES.filter(m => {
      const matchesQuery = m.title.toLowerCase().includes(query.toLowerCase()) || m.desc.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All' || m.category === category;
      const matchesQuick =
        !quickFilter ||
        (quickFilter === 'Recommended' && m.recommended) ||
        (quickFilter === 'Popular' && m.popular) ||
        (quickFilter === 'Newest' && m.newest);
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
    <div style={{ minHeight: '100vh', background: C.creme, padding: '0 0 64px' }}>
      <style>{`
        .module-card { transition: all 0.2s ease; }
        .module-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(178,76,114,0.15); }
        .module-pill { transition: all 0.15s ease; cursor: pointer; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${C.bordeaux} 0%, #8F3A5A 100%)`, padding: '56px 32px 40px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '34px', fontWeight: 800, margin: '0 0 8px' }}>Choose Your Module</h1>
        <p style={{ color: 'rgba(251,238,221,0.8)', fontSize: '15px', margin: 0 }}>Start with one module and expand later.</p>
      </div>

      {/* Search + filters */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '28px 24px 0' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search modules..."
          style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: `1.5px solid ${C.border}`, fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '18px' }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {CATEGORIES.map(c => (
            <button key={c} className="module-pill" onClick={() => setCategory(c)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${category === c ? C.bordeaux : C.border}`, background: category === c ? C.bordeaux : 'white', color: category === c ? 'white' : C.texteGris, fontSize: '13px', fontWeight: 600 }}>
              {c}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {QUICK_FILTERS.map(f => (
            <button key={f} className="module-pill" onClick={() => setQuickFilter(quickFilter === f ? null : f)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: `1.5px solid ${quickFilter === f ? C.dore : C.border}`, background: quickFilter === f ? C.rose : 'white', color: C.bordeaux, fontSize: '12px', fontWeight: 700 }}>
              {f}
            </button>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '20px', border: `1.5px dashed ${C.border}`, fontSize: '12px', color: C.texteGris }}>
            🌍 Country support shown per module
          </span>
        </div>
      </div>

      {/* Module grid */}
      <div style={{ maxWidth: '960px', margin: '24px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        {filtered.map(m => (
          <div key={m.title} className="module-card" style={{ background: 'white', border: `1.5px solid ${C.border}`, borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '32px' }}>{m.icon}</div>
              <span style={{ fontSize: '11px', background: C.rose, color: C.bordeaux, padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>{m.version}</span>
            </div>
            <h3 style={{ color: C.texteFonce, fontSize: '17px', fontWeight: 700, margin: '0 0 6px' }}>{m.title}</h3>
            <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 14px', lineHeight: 1.5, flex: 1 }}>{m.desc}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {m.recommended && <span style={{ fontSize: '10px', background: '#E7F4EA', color: '#3C7A4E', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>Recommended</span>}
              {m.popular && <span style={{ fontSize: '10px', background: '#FFF3D6', color: '#9A6A00', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>Popular</span>}
              {m.newest && <span style={{ fontSize: '10px', background: '#E6EEFB', color: '#2F5BA8', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>New</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.texteGris, marginBottom: '16px' }}>
              <span>⏱ Setup: {m.setupTime}</span>
              <span>{m.countries}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setActivating(m)}
                style={{ flex: 1, padding: '11px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Activate
              </button>
              <button onClick={() => router.push(`/modules/${m.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`)}
                style={{ flex: 1, padding: '11px', background: 'white', color: C.bordeaux, border: `1.5px solid ${C.bordeaux}`, borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Learn More
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: C.texteGris }}>
            No modules match your search.
          </div>
        )}
      </div>

      {/* Activation modal */}
      {activating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(92,35,64,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{activating.icon}</div>
            <h3 style={{ color: C.texteFonce, fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>Activate {activating.title}</h3>
            <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 24px' }}>How do you want to set this up?</p>

            <button onClick={() => handleActivateChoice('new')}
              style={{ width: '100%', padding: '14px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>
              Create New Workspace
            </button>
            <button onClick={() => handleActivateChoice('existing')}
              style={{ width: '100%', padding: '14px', background: 'white', color: C.bordeaux, border: `1.5px solid ${C.bordeaux}`, borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '14px' }}>
              Connect to Existing Workspace
            </button>
            <button onClick={() => setActivating(null)}
              style={{ background: 'none', border: 'none', color: C.texteGris, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
