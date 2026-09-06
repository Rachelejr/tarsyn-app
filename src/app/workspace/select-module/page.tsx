'use client';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import DateTimeWeather from '@/components/DateTimeWeather';
const C = {
  bordeaux: '#6B2D4E',
  creme:    '#FBEEDD',
  dore:     '#E9C77B',
  rose:     '#EAD9BE',
  texteGris:'#6B2D4E',
  texteFonce:'#4A1F38',
  border:   '#D9C0CC',
};
type ModuleDef = {
  icon: string;
  title: string;
  desc: string;
  version: string;
  setupTime: string;
  category: string;
  countries?: string;
  // Whether this module is shown to admins on the module-selection screen.
  // Tontine and Church are the only ones actually built and functional
  // today, so only those two are visible=true. The rest of the catalog
  // stays defined here (not deleted) so it's a one-line flip to bring a
  // module back once it's really built, but it won't show as a clickable
  // card in the meantime.
  visible: boolean;
};
const MODULES: ModuleDef[] = [
  { icon:'🤝', title:'Tontine / Sol', desc:'Cycles, rotation, receipts, organizer commission', version:'V1', setupTime:'~5 min', category:'Finance', countries:'Global', visible:true },
  { icon:'⛪', title:'Church', desc:'Tithes, offerings, members, departments, badges', version:'V1', setupTime:'~10 min', category:'Faith', countries:'Global', visible:true },
  { icon:'🏛️', title:'Association', desc:'Members, dues, events, votes, reports', version:'V1', setupTime:'~7 min', category:'Community', countries:'Global', visible:false },
  { icon:'💼', title:'Investment', desc:'Projects, capital, returns, financial reports', version:'V1', setupTime:'~8 min', category:'Finance', countries:'Global', visible:false },
  { icon:'🌾', title:'Agriculture', desc:'Cooperatives, harvests, group purchases', version:'V2', setupTime:'~6 min', category:'Agriculture', countries:'Select regions', visible:false },
  { icon:'🤲', title:'Foundation', desc:'Donations, projects, impact reports, grants', version:'V2', setupTime:'~6 min', category:'Charity', countries:'Global', visible:false },
  { icon:'🤝', title:'Cooperative', desc:'Shared resources, member shares, collective purchases', version:'V2', setupTime:'~6 min', category:'Community', countries:'Select regions', visible:false },
  { icon:'🏢', title:'Organization', desc:'Members, structure, governance, reports', version:'V2', setupTime:'~7 min', category:'Community', countries:'Global', visible:false },
  { icon:'🏥', title:'Health', desc:'Health mutuals, coverage, claims', version:'V3', setupTime:'~9 min', category:'Health', countries:'Select regions', visible:false },
  { icon:'🏠', title:'Orphanage', desc:'Children records, sponsors, care plans, donations', version:'V2', setupTime:'~8 min', category:'Charity', countries:'Select regions', visible:false },
  { icon:'🎉', title:'Youth Club', desc:'Activities, members, events, fees', version:'V3', setupTime:'~5 min', category:'Community', countries:'Global', visible:false },
  { icon:'🛒', title:'Commerce', desc:'Orders, inventory, group sales, vendor payouts', version:'V3', setupTime:'~10 min', category:'Commerce', countries:'Select regions', visible:false },
];

// Each module goes straight to its own creation form. Tontine and Church
// are fully independent from each other and from any shared "workspace"
// concept — no popup, no list of existing organizations to choose from.
// Add a module's own creation route here as it gets built.
const MODULE_ROUTES: Record<string, string> = {
  'Tontine / Sol': '/dashboard/create-tontine',
  'Church': '/dashboard/create-church',
};

export default function ChooseModulePage() {
  const router = useRouter();
  const visibleModules = MODULES.filter(m => m.visible);
  const handleActivate = (m: ModuleDef) => {
    const target = MODULE_ROUTES[m.title];
    if (target) {
      router.push(target);
      return;
    }
    // Fallback for a future module that doesn't have its own route yet.
    const slug = m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    router.push(`/dashboard/create-workspace?module=${slug}`);
  };
  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
      <style>{`
        .module-card { transition: all 0.2s ease; }
        .module-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(107,45,78,0.15); }
        .module-title-slide {
          display: inline-block;
          animation: UNIMUNITY-title-slide 3s ease-in-out infinite;
        }
        @keyframes UNIMUNITY-title-slide {
          0% { transform: translateX(-14px); }
          50% { transform: translateX(14px); }
          100% { transform: translateX(-14px); }
        }
      `}</style>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', cursor: 'pointer' }} />
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ color: C.creme, fontSize: '20px', fontWeight: 800, margin: 0 }}>Choose Your Module</h1>
          <p style={{ color: 'rgba(251,238,221,0.75)', fontSize: '12px', margin: '2px 0 0' }}>Start with one module and expand later.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, justifyContent: 'flex-end' }}>
          <DateTimeWeather textColor="rgba(251,238,221,0.85)" />
        </div>
      </div>
      {/* Module grid — only visible:true modules are rendered */}
      <div style={{ maxWidth: '660px', margin: '40px auto 0', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {visibleModules.map(m => (
          <div key={m.title} className="module-card" style={{ background: 'white', border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(107,45,78,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `linear-gradient(145deg, ${C.dore}33, ${C.dore}11)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
              }}>{m.icon}</div>
              <span style={{ fontSize: '10px', background: C.rose, color: C.bordeaux, padding: '3px 9px', borderRadius: '20px', fontWeight: 700 }}>{m.version}</span>
            </div>
            <h3 style={{ color: C.texteFonce, fontSize: '15.5px', fontWeight: 700, margin: '0 0 5px' }}>{m.title}</h3>
            <p style={{ color: C.texteGris, fontSize: '12px', margin: '0 0 12px', lineHeight: 1.5, flex: 1 }}>{m.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: C.texteGris, marginBottom: '14px' }}>
              <span>⏱ Setup: {m.setupTime}</span>
              <span>{m.countries}</span>
            </div>
            <button onClick={() => handleActivate(m)}
              style={{ width: '100%', padding: '10px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '9px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
              Activate
            </button>
          </div>
        ))}
      </div>
      </div>
      <Footer />
    </div>
  );
}
