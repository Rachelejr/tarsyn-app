'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const C = {
  bordeaux: '#6A2955',
  bordeauxDark: '#4A1F38',
  dore: '#D4AF7A',
  creme: '#FAF0E6',
  texteGris: '#7A5068',
  texteFonce: '#2C1A24',
  border: '#D9C0CC',
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
  countries?: string;
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
  { icon:'🎉', title:'Youth Club', desc:'Activities, members, events, fees', version:'V3', setupTime:'~5 min', category:'Youth', newest:true, countries:'Global' },
  { icon:'🛒', title:'Commerce', desc:'Orders, inventory, group sales, vendor payouts', version:'V3', setupTime:'~10 min', category:'Commerce', newest:true, countries:'Select regions' },
  { icon:'📚', title:'Education', desc:'Schools, courses, students, grades, enrollment', version:'V2', setupTime:'~7 min', category:'Education', countries:'Select regions' },
  { icon:'⚽', title:'Sport', desc:'Teams, leagues, matches, registrations, fees', version:'V3', setupTime:'~6 min', category:'Sports', countries:'Global' },
];

const CATEGORIES = ['All', 'Finance', 'Community', 'Faith', 'Agriculture', 'Charity', 'Health', 'Commerce', 'Organization', 'Education', 'Youth', 'Sports'];

const MODULE_ROUTES: Record<string, string> = {
  'tontine-sol': '/dashboard/create-tontine',
  'church': '/dashboard/create-church',
};

function ChooseModuleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspaceId') || '';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [activating, setActivating] = useState<ModuleDef | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');

  const filtered = useMemo(() => {
    return MODULES.filter(m => {
      const matchesQuery = m.title.toLowerCase().includes(query.toLowerCase()) || m.desc.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All' || m.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  const slugify = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const goToModulePage = (slug: string, wsId: string) => {
    const target = MODULE_ROUTES[slug];
    if (target) {
      router.push(`${target}?workspaceId=${wsId}`);
    } else {
      router.push(`/dashboard/coming-soon?module=${slug}&workspaceId=${wsId}`);
    }
  };

  const handleActivateDirect = async (m: ModuleDef) => {
    const slug = slugify(m.title);
    setAttaching(true);
    setAttachError('');
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        activeModules: arrayUnion(slug),
      });
      goToModulePage(slug, workspaceId);
    } catch (err) {
      setAttachError('Could not activate this module. Please try again.');
      setAttaching(false);
    }
  };

  const handleActivateChoice = (mode: 'new' | 'existing') => {
    if (!activating) return;
    const slug = slugify(activating.title);
    if (mode === 'new') {
      router.push(`/dashboard/create-workspace?module=${slug}`);
    } else {
      router.push(`/dashboard/connect-workspace?module=${slug}`);
    }
  };

  const handleActivateClick = (m: ModuleDef) => {
    const isComingSoon = m.title === 'Education' || m.title === 'Health';
    if (isComingSoon) return;
    if (workspaceId) {
      handleActivateDirect(m);
    } else {
      setActivating(m);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.creme }}>
      <style>{`
        .module-card { transition: all 0.2s ease; }
        .module-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(106,41,85,0.14); }
      `}</style>

      <div style={{ background: `linear-gradient(135deg, ${C.bordeaux} 0%, ${C.bordeauxDark} 100%)`, padding: '40px 32px 32px', textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '30px', fontWeight: 800, margin: '0 0 6px' }}>Choose Your Module</h1>
        <p style={{ color: C.dore, fontSize: '14px', margin: 0, fontWeight: 600 }}>
          {workspaceId ? 'Activating a module for your new workspace.' : 'Start with one module and expand later.'}
        </p>
      </div>

      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '28px 24px 64px' }}>

        {/* Search + dropdown filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search modules..."
            style={{ flex: 1, minWidth: '220px', padding: '12px 16px', borderRadius: '12px', border: `1.5px solid ${C.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: '12px', border: `1.5px solid ${C.border}`, fontSize: '14px', outline: 'none', background: 'white', color: C.texteFonce, fontWeight: 600, cursor: 'pointer' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {attachError && (
          <div style={{ background: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', marginBottom: '16px' }}>
            {attachError}
          </div>
        )}

        {/* Module grid - paysage */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '18px' }}>
          {filtered.map(m => {
            const isComingSoon = m.title === 'Education' || m.title === 'Health';
            return (
              <div key={m.title} className="module-card" style={{ background: 'white', border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '28px' }}>{m.icon}</div>
                  <span style={{ fontSize: '10px', background: '#F3E4DC', color: C.bordeaux, padding: '3px 9px', borderRadius: '20px', fontWeight: 700 }}>{m.version}</span>
                </div>
                <h3 style={{ color: C.texteFonce, fontSize: '16px', fontWeight: 700, margin: '0 0 5px' }}>{m.title}</h3>
                <p style={{ color: C.texteGris, fontSize: '12.5px', margin: '0 0 12px', lineHeight: 1.5, flex: 1 }}>{m.desc}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                  {m.recommended && <span style={{ fontSize: '10px', background: C.dore, color: 'white', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>Recommended</span>}
                  {m.popular && <span style={{ fontSize: '10px', background: C.bordeaux, color: 'white', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>Popular</span>}
                  {m.newest && <span style={{ fontSize: '10px', border: `1px solid ${C.bordeaux}`, color: C.bordeaux, padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}>New</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.texteGris, marginBottom: '14px' }}>
                  <span>Setup: {m.setupTime}</span>
                  <span>{m.countries}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleActivateClick(m)} disabled={attaching || isComingSoon}
                    style={{
                      flex: 1, padding: '10px', border: 'none', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700,
                      background: isComingSoon ? C.border : C.bordeaux,
                      color: isComingSoon ? C.texteGris : 'white',
                      cursor: isComingSoon ? 'not-allowed' : (attaching ? 'wait' : 'pointer'),
                    }}>
                    {isComingSoon ? 'Coming Soon' : (attaching ? 'Activating...' : 'Activate')}
                  </button>
                  <button onClick={() => router.push(`/modules/${slugify(m.title)}`)}
                    style={{ flex: 1, padding: '10px', background: 'white', color: C.bordeaux, border: `1.5px solid ${C.bordeaux}`, borderRadius: '9px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
                    Learn More
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: C.texteGris }}>
              No modules match your search.
            </div>
          )}
        </div>
      </div>

      {activating && !workspaceId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,26,36,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
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

export default function ChooseModulePage() {
  return (
    <Suspense fallback={null}>
      <ChooseModuleInner />
    </Suspense>
  );
}
