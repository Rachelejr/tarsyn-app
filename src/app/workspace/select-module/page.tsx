'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const C = {
  creme: '#FAF0E6',
  dore: '#D4AF7A',
  doreDark: '#B8945F',
  texteFonce: '#3A2E1A',
  texteGris: '#8A7858',
  border: '#E8D9BC',
};

type ModuleDef = {
  icon: string;
  title: string;
  desc: string;
  version: string;
  category: string;
};

const MODULES: ModuleDef[] = [
  { icon:'🤝', title:'Tontine / Sol', desc:'Cycles, rotation, receipts, organizer commission', version:'V1', category:'Finance' },
  { icon:'🏛️', title:'Association', desc:'Members, dues, events, votes, reports', version:'V1', category:'Community' },
  { icon:'⛪', title:'Church', desc:'Tithes, offerings, members, departments, badges', version:'V1', category:'Faith' },
  { icon:'💼', title:'Investment', desc:'Projects, capital, returns, financial reports', version:'V1', category:'Finance' },
  { icon:'🌾', title:'Agriculture', desc:'Cooperatives, harvests, group purchases', version:'V2', category:'Agriculture' },
  { icon:'🤲', title:'Foundation', desc:'Donations, projects, impact reports, grants', version:'V2', category:'Charity' },
  { icon:'🏠', title:'Orphanage', desc:'Children records, sponsors, care plans, donations', version:'V2', category:'Charity' },
  { icon:'🤝', title:'Cooperative', desc:'Shared resources, member shares, collective purchases', version:'V2', category:'Community' },
  { icon:'🏢', title:'Organization', desc:'Members, structure, governance, reports', version:'V2', category:'Organization' },
  { icon:'📚', title:'Education', desc:'Schools, courses, students, grades, enrollment', version:'V2', category:'Education' },
  { icon:'🏥', title:'Health', desc:'Health mutuals, coverage, claims', version:'V3', category:'Health' },
  { icon:'🎉', title:'Youth Club', desc:'Activities, members, events, fees', version:'V3', category:'Youth' },
  { icon:'🛒', title:'Commerce', desc:'Orders, inventory, group sales, vendor payouts', version:'V3', category:'Commerce' },
  { icon:'⚽', title:'Sport', desc:'Teams, leagues, matches, registrations, fees', version:'V3', category:'Sports' },
];

const CATEGORIES = ['All', 'Finance', 'Community', 'Faith', 'Agriculture', 'Charity', 'Organization', 'Education', 'Health', 'Youth', 'Commerce', 'Sports'];
const COMING_SOON_TITLES = ['Education', 'Health'];

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
  const [attachingSlug, setAttachingSlug] = useState<string | null>(null);
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
    setAttachingSlug(slug);
    setAttachError('');
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        activeModules: arrayUnion(slug),
      });
      goToModulePage(slug, workspaceId);
    } catch (err) {
      setAttachError('Could not activate this module. Please try again.');
      setAttachingSlug(null);
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
    if (COMING_SOON_TITLES.includes(m.title)) return;
    const slug = slugify(m.title);
    if (attachingSlug === slug) return;
    if (workspaceId) {
      handleActivateDirect(m);
    } else {
      setActivating(m);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      handleActivateClick(filtered[0]);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.creme }}>
      <style>{`
        .module-card { transition: all 0.15s ease; }
        .module-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(184,148,95,0.20); }
        .cat-item { transition: all 0.12s ease; cursor: pointer; }
      `}</style>

      <div style={{ background: `linear-gradient(135deg, ${C.dore} 0%, ${C.doreDark} 100%)`, padding: '20px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: C.doreDark, fontWeight: 800, flexShrink: 0 }}>✦</div>
            <div>
              <div style={{ color: C.creme, fontSize: '17px', fontWeight: 800, letterSpacing: '2px' }}>TARSYN</div>
              <div style={{ color: 'rgba(250,240,230,0.75)', fontSize: '8px', letterSpacing: '2px' }}>YOUR COMMUNITY. YOUR POWER.</div>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ color: C.creme, fontSize: '20px', fontWeight: 800, margin: '0 0 2px' }}>Choose Your Module</h1>
            <p style={{ color: 'rgba(250,240,230,0.9)', fontSize: '11.5px', margin: 0, fontWeight: 600 }}>
              {workspaceId ? 'Activating a module for your new workspace.' : 'Start with one module and expand later.'}
            </p>
          </div>
          <div style={{ width: '120px', flexShrink: 0 }} />
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '18px 20px', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>

        <div style={{ width: '180px', flexShrink: 0, background: 'white', borderRadius: '14px', border: `1.5px solid ${C.border}`, padding: '14px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search modules..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
          />
          <div style={{ fontSize: '10px', fontWeight: 800, color: C.texteGris, letterSpacing: '0.06em', marginBottom: '6px' }}>CATEGORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '320px', overflowY: 'auto' }}>
            {CATEGORIES.map(c => (
              <div key={c} className="cat-item" onClick={() => setCategory(c)}
                style={{
                  padding: '6px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
                  background: category === c ? C.dore : 'transparent',
                  color: category === c ? 'white' : C.texteFonce,
                }}>
                {c}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {attachError && (
            <div style={{ background: '#F8D7DA', color: '#721C24', border: '1px solid #F5C6CB', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', marginBottom: '12px' }}>
              {attachError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {filtered.map(m => {
              const slug = slugify(m.title);
              const isComingSoon = COMING_SOON_TITLES.includes(m.title);
              const isThisAttaching = attachingSlug === slug;
              return (
                <div key={m.title} className="module-card" style={{ background: 'white', border: `1.5px solid ${C.border}`, borderRadius: '12px', padding: '13px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '20px' }}>{m.icon}</div>
                    <span style={{ fontSize: '9px', background: C.creme, color: C.doreDark, padding: '2px 7px', borderRadius: '20px', fontWeight: 700 }}>{m.version}</span>
                  </div>
                  <h3 style={{ color: C.texteFonce, fontSize: '13px', fontWeight: 700, margin: '0 0 3px' }}>{m.title}</h3>
                  <p style={{ color: C.texteGris, fontSize: '10.5px', margin: '0 0 10px', lineHeight: 1.35, flex: 1 }}>{m.desc}</p>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleActivateClick(m)} disabled={isThisAttaching || isComingSoon}
                      style={{
                        flex: 1, padding: '7px', border: 'none', borderRadius: '7px', fontSize: '10.5px', fontWeight: 700,
                        background: isComingSoon ? C.border : C.doreDark,
                        color: isComingSoon ? C.texteGris : 'white',
                        cursor: isComingSoon ? 'not-allowed' : (isThisAttaching ? 'wait' : 'pointer'),
                      }}>
                      {isComingSoon ? 'Soon' : (isThisAttaching ? '...' : 'Activate')}
                    </button>
                    <button onClick={() => router.push(`/modules/${slug}`)}
                      style={{ flex: 1, padding: '7px', background: C.creme, color: C.doreDark, border: `1.5px solid ${C.doreDark}`, borderRadius: '7px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}>
                      Learn More
                    </button>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: C.texteGris }}>
                No modules match your search.
              </div>
            )}
          </div>
        </div>
      </div>

      {activating && !workspaceId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(58,46,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{activating.icon}</div>
            <h3 style={{ color: C.texteFonce, fontSize: '18px', fontWeight: 800, margin: '0 0 6px' }}>Activate {activating.title}</h3>
            <p style={{ color: C.texteGris, fontSize: '13px', margin: '0 0 24px' }}>How do you want to set this up?</p>

            <button onClick={() => handleActivateChoice('new')}
              style={{ width: '100%', padding: '14px', background: C.doreDark, color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}>
              Create New Workspace
            </button>
            <button onClick={() => handleActivateChoice('existing')}
              style={{ width: '100%', padding: '14px', background: 'white', color: C.doreDark, border: `1.5px solid ${C.doreDark}`, borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '14px' }}>
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
