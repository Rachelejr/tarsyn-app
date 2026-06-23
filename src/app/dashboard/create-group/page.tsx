'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import {
  Sun, Handshake, Landmark, Church, Building2, Gem, Wheat,
  ArrowRight, ArrowLeft, Check, CheckCircle2, Copy as CopyIcon,
} from 'lucide-react';

const COUNTRIES = [
  'United States', 'Haiti', 'Canada',
  'Senegal', 'Ivory Coast', 'Cameroon', 'Congo (DRC)', 'Congo (Republic)',
  'Mali', 'Guinea', 'Togo', 'Benin', 'Burkina Faso', 'Madagascar',
  'Nigeria', 'Ghana', 'Kenya', 'Ethiopia', 'Rwanda', 'Tanzania', 'Uganda',
  'South Africa', 'Zambia', 'Zimbabwe', 'Niger', 'Chad', 'Gabon',
  'Sierra Leone', 'Liberia', 'Gambia', 'Mauritania', 'Morocco', 'Tunisia', 'Algeria', 'Egypt',
  'France', 'Belgium', 'Switzerland', 'United Kingdom', 'Germany', 'Italy', 'Spain', 'Portugal',
  'Martinique', 'Guadeloupe', 'Dominican Republic', 'Jamaica', 'Trinidad',
  'Brazil', 'Mexico', 'Colombia',
  'Other',
];

const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  'United States': ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'],
  'Canada': ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario','Prince Edward Island','Quebec','Saskatchewan','Northwest Territories','Nunavut','Yukon'],
  'Haiti': ["Artibonite","Centre","Grand'Anse","Nippes","Nord","Nord-Est","Nord-Ouest","Ouest","Sud","Sud-Est"],
  'France': ['Auvergne-Rhône-Alpes','Bourgogne-Franche-Comté','Bretagne','Centre-Val de Loire','Corse','Grand Est','Hauts-de-France','Île-de-France','Normandie','Nouvelle-Aquitaine','Occitanie','Pays de la Loire',"Provence-Alpes-Côte d'Azur"],
  'United Kingdom': ['England','Scotland','Wales','Northern Ireland'],
  'Belgium': ['Antwerp','East Flanders','Flemish Brabant','Hainaut','Liège','Limburg','Luxembourg','Namur','Walloon Brabant','West Flanders','Brussels-Capital'],
  'Switzerland': ['Zurich','Bern','Lucerne','Geneva','Vaud','Valais','Basel-Stadt','Ticino','Fribourg','Neuchâtel'],
  'Senegal': ['Dakar','Thiès','Saint-Louis','Diourbel','Kaolack','Ziguinchor','Fatick','Louga','Matam','Tambacounda'],
  'Ivory Coast': ['Abidjan','Bas-Sassandra','Comoé','Denguélé','Goh-Djiboua','Lacs','Lagunes','Montagnes','Sassandra-Marahoué','Savanes','Vallée du Bandama','Woroba','Yamoussoukro','Zanzan'],
  'Cameroon': ['Adamawa','Centre','East','Far North','Littoral','North','Northwest','South','Southwest','West'],
  'Congo (DRC)': ['Kinshasa','Kongo Central','Kwango','Kwilu','Mai-Ndombe','Équateur','Tshuapa','Haut-Katanga','Lualaba'],
  'Congo (Republic)': ['Brazzaville','Pointe-Noire','Bouenza','Cuvette','Kouilou','Niari','Plateaux','Sangha'],
  'Nigeria': ['Lagos','Abuja (FCT)','Kano','Rivers','Oyo','Kaduna','Ogun','Enugu','Anambra','Delta','Edo','Imo','Plateau'],
  'Ghana': ['Greater Accra','Ashanti','Western','Central','Eastern','Northern','Volta','Upper East','Upper West','Bono'],
  'Kenya': ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Kiambu','Machakos','Kakamega'],
  'Ethiopia': ['Addis Ababa','Oromia','Amhara','Tigray','Sidama','SNNPR','Somali','Afar'],
  'Rwanda': ['Kigali','Eastern Province','Northern Province','Southern Province','Western Province'],
  'Tanzania': ['Dar es Salaam','Dodoma','Arusha','Mwanza','Zanzibar','Mbeya','Morogoro'],
  'Uganda': ['Kampala','Wakiso','Mbarara','Gulu','Jinja','Mukono'],
  'South Africa': ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape','Limpopo','Mpumalanga','North West','Free State','Northern Cape'],
  'Zambia': ['Lusaka','Copperbelt','Central','Eastern','Southern','Northern'],
  'Zimbabwe': ['Harare','Bulawayo','Manicaland','Mashonaland Central','Matabeleland North'],
  'Niger': ['Niamey','Agadez','Dosso','Maradi','Tahoua','Tillabéri','Zinder'],
  'Chad': ["N'Djamena",'Logone Occidental','Moyen-Chari','Ouaddaï'],
  'Gabon': ['Libreville','Estuaire','Haut-Ogooué','Moyen-Ogooué','Ngounié'],
  'Sierra Leone': ['Freetown','Bo','Kenema','Makeni'],
  'Liberia': ['Monrovia','Bong','Nimba','Lofa'],
  'Gambia': ['Banjul','Kanifing','Brikama','Mansakonko'],
  'Mauritania': ['Nouakchott','Nouadhibou','Trarza','Adrar'],
  'Morocco': ['Casablanca-Settat','Rabat-Salé-Kénitra','Marrakech-Safi','Fès-Meknès','Tanger-Tétouan-Al Hoceïma'],
  'Tunisia': ['Tunis','Sfax','Sousse','Nabeul'],
  'Algeria': ['Algiers','Oran','Constantine','Annaba'],
  'Egypt': ['Cairo','Alexandria','Giza','Luxor','Aswan'],
  'Dominican Republic': ['Santo Domingo','Santiago','La Vega','Puerto Plata'],
  'Mali': ['Bamako','Kayes','Koulikoro','Sikasso','Ségou','Mopti','Tombouctou','Gao','Kidal'],
  'Guinea': ['Conakry','Boké','Faranah','Kankan','Kindia','Labé','Mamou','Nzérékoré'],
  'Togo': ['Maritime','Plateaux','Centrale','Kara','Savanes'],
  'Benin': ['Alibori','Atacora','Atlantique','Borgou','Collines','Couffo','Donga','Littoral','Mono','Ouémé','Plateau','Zou'],
  'Burkina Faso': ['Boucle du Mouhoun','Cascades','Centre','Centre-Est','Centre-Nord','Centre-Ouest','Centre-Sud','Est','Hauts-Bassins','Nord','Plateau-Central','Sahel','Sud-Ouest'],
  'Madagascar': ['Antananarivo','Antsiranana','Fianarantsoa','Mahajanga','Toamasina','Toliara'],
  'Martinique': ['Fort-de-France','Le Lamentin','Le Robert','Saint-Joseph','Schœlcher'],
  'Guadeloupe': ['Basse-Terre','Grande-Terre','Marie-Galante','Les Saintes','La Désirade'],
  'Germany': ['Baden-Württemberg','Bavaria','Berlin','Brandenburg','Bremen','Hamburg','Hesse','Lower Saxony','Mecklenburg-Vorpommern','North Rhine-Westphalia','Rhineland-Palatinate','Saarland','Saxony','Saxony-Anhalt','Schleswig-Holstein','Thuringia'],
  'Italy': ['Lombardy','Lazio','Campania','Sicily','Veneto','Emilia-Romagna','Piedmont','Puglia','Tuscany','Calabria'],
  'Spain': ['Andalusia','Catalonia','Madrid','Valencia','Galicia','Castile and León','Basque Country','Canary Islands','Castilla-La Mancha','Murcia'],
  'Portugal': ['Lisbon','Porto','Braga','Setúbal','Aveiro','Coimbra','Faro','Leiria'],
  'Brazil': ['São Paulo','Rio de Janeiro','Minas Gerais','Bahia','Paraná','Rio Grande do Sul','Pernambuco','Ceará','Pará','Santa Catarina'],
  'Mexico': ['Mexico City','Jalisco','Nuevo León','Puebla','Guanajuato','Veracruz','Chihuahua','Yucatán','Oaxaca','Baja California'],
  'Colombia': ['Bogotá','Antioquia','Valle del Cauca','Cundinamarca','Atlántico','Santander','Bolívar','Nariño'],
  'Jamaica': ['Kingston','St. Andrew','St. Catherine','Clarendon','Manchester','St. James','Trelawny','Westmoreland'],
  'Trinidad': ['Port of Spain','San Fernando','Arima','Chaguanas','Point Fortin','Tunapuna-Piarco','Diego Martin'],
};

const inputBase: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  border: '1.5px solid #E8D5E0', borderRadius: '12px',
  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
};

function RegionSelect({
  options, value, onChange, customValue, onCustomChange, disabled,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const fullList = [...options, 'Other'];
  const filtered = fullList.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)} className="tarsyn-input"
          style={{ ...inputBase, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#F5EEE9' : 'white', color: value ? '#2C1A24' : '#9B8A95' }}>
          <span>{disabled ? 'Select a country first' : (value || 'Select region...')}</span>
          <span style={{ color: '#7A5068', fontSize: '11px' }}>▾</span>
        </button>
        {open && !disabled && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1.5px solid #D9C0CC', borderRadius: '12px', boxShadow: '0 8px 24px rgba(107,45,78,0.18)', zIndex: 20, maxHeight: '240px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search region..."
              style={{ border: 'none', borderBottom: '1px solid #EDD9E5', padding: '10px 12px', fontSize: '13px', outline: 'none' }} />
            <div style={{ overflowY: 'auto' }}>
              {filtered.length === 0 && <div style={{ padding: '10px 12px', fontSize: '13px', color: '#7A5068' }}>No match</div>}
              {filtered.map(o => (
                <div key={o} onClick={() => { onChange(o); setOpen(false); setQuery(''); }}
                  style={{ padding: '9px 12px', fontSize: '13px', cursor: 'pointer', background: o === value ? '#EDD9E5' : 'white', color: o === 'Other' ? '#6B2D4E' : '#2C1A24', fontWeight: o === 'Other' ? 600 : 400, borderTop: o === 'Other' ? '1px solid #EDD9E5' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAF0E6')}
                  onMouseLeave={e => (e.currentTarget.style.background = o === value ? '#EDD9E5' : 'white')}>
                  {o === 'Other' ? 'Other (+ Add manually)' : o}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {value === 'Other' && (
        <input className="tarsyn-input" value={customValue} onChange={e => onCustomChange(e.target.value)}
          placeholder="Region not found: enter region name..."
          style={{ ...inputBase, marginTop: '8px' }} />
      )}
    </div>
  );
}

export default function CreateGroup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('Sol');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [customRegion, setCustomRegion] = useState('');
  const [module, setModule] = useState('Sol');
  const [contributionAmount, setContributionAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [frequency, setFrequency] = useState('Monthly');
  const [rotationMode, setRotationMode] = useState('Manual');
  const [startDate, setStartDate] = useState('');
  const [privacy, setPrivacy] = useState('Private');
  const [memberLimit, setMemberLimit] = useState('20');
  const [adminPosition, setAdminPosition] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedGroup, setSavedGroup] = useState<any>(null);

  const generateCode = (prefix: string, countryCode: string) => {
    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-6);
    return `${prefix}-${countryCode}-${year}-${seq}`;
  };

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (groupName.trim().length < 3) { setError('Group name must be at least 3 characters.'); return false; }
      if (!country) { setError('Country is required.'); return false; }
    }
    if (step === 3) {
      if (contributionAmount && parseFloat(contributionAmount) <= 0) { setError('Amount must be greater than 0.'); return false; }
    }
    return true;
  };

  const handleNext = () => { if (!validateStep()) return; setStep(s => s + 1); };

  const handleCreate = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }

      const q = query(collection(db, 'groups'), where('organizerId', '==', user.uid), where('name', '==', groupName.trim()));
      const existing = await getDocs(q);
      if (!existing.empty) { setError('You already have a group with this name.'); setLoading(false); return; }

      const countryCode = country.substring(0, 2).toUpperCase();
      const groupCode = generateCode('TGR', countryCode);
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      const finalRegionName = region === 'Other' ? customRegion.trim() : region;
      const regionCode = region === 'Other' ? 'CUSTOM' : (region ? region.substring(0, 2).toUpperCase() : '');

      const groupRef = await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        groupCode,
        groupType,
        module,
        description: description.trim(),
        country,
        countryCode,
        regionCode,
        regionName: finalRegionName,
        customRegion: region === 'Other' ? customRegion.trim() : null,
        region: finalRegionName,
        privacy,
        memberLimit: parseInt(memberLimit),
        contributionSettings: { amount: contributionAmount ? parseFloat(contributionAmount) : 0, currency, frequency },
        rotationSettings: { mode: rotationMode, startDate },
        adminId: user.uid,
        organizerId: user.uid,
        adminPosition: parseInt(adminPosition),
        status: 'active',
        inviteCode,
        inviteLink: `/join/${inviteCode}`,
        memberCount: 1,
        createdAt: serverTimestamp(),
      });

      const memberCode = generateCode('TYN', countryCode);
      await addDoc(collection(db, 'members'), {
        groupId: groupRef.id,
        organizerId: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Admin',
        email: user.email,
        tynId: memberCode,
        memberCode,
        position: parseInt(adminPosition),
        role: 'admin',
        status: 'active',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      setSavedGroup({ name: groupName, groupCode, inviteCode, inviteLink: `https://tarsyn-app.com/join/${inviteCode}` });
    } catch (e) {
      console.error(e);
      setError('Error creating group. Please try again.');
    }
    setLoading(false);
  };

  if (savedGroup) return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <style jsx global>{`
        .tarsyn-btn-gold, .tarsyn-btn-dark { transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease; }
        .tarsyn-btn-gold:hover, .tarsyn-btn-dark:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(107,45,78,0.18); filter: brightness(1.03); }
        .tarsyn-btn-gold:active, .tarsyn-btn-dark:active { transform: translateY(0); }
      `}</style>
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '480px', width: '100%', boxShadow: '0 12px 48px rgba(107,45,78,0.10), 0 2px 8px rgba(107,45,78,0.06)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={32} color="#6B2D4E" strokeWidth={2} />
        </div>
        <h2 style={{ color: '#6B2D4E', fontSize: '26px', fontWeight: 800, margin: '0 0 8px' }}>Group Created</h2>
        <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 24px' }}>{savedGroup.name}</p>
        <div style={{ background: '#FAF0E6', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
          {[
            { label: 'Group Code', value: savedGroup.groupCode },
            { label: 'Invite Code', value: savedGroup.inviteCode },
            { label: 'Invite Link', value: savedGroup.inviteLink },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 4px', color: '#7A5068', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</p>
              <p style={{ margin: 0, color: '#6B2D4E', fontWeight: 800, fontSize: '14px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{item.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button className="tarsyn-btn-gold" onClick={() => navigator.clipboard.writeText(savedGroup.inviteLink)}
            style={{ background: '#D4AF7A', color: '#6B2D4E', padding: '12px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CopyIcon size={14} /> Copy Link
          </button>
          <button className="tarsyn-btn-dark" onClick={() => router.push('/dashboard')}
            style={{ background: '#6B2D4E', color: '#FAF0E6', padding: '12px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            Dashboard <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <style jsx global>{`
        .tarsyn-input, .tarsyn-select, .tarsyn-textarea {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .tarsyn-input:focus, .tarsyn-select:focus, .tarsyn-textarea:focus {
          border-color: #D4AF7A !important;
          box-shadow: 0 0 0 3px rgba(212,175,122,0.18);
        }
        .tarsyn-btn-primary, .tarsyn-btn-secondary {
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }
        .tarsyn-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(107,45,78,0.28);
          filter: brightness(1.04);
        }
        .tarsyn-btn-secondary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(107,45,78,0.10);
        }
        .tarsyn-btn-primary:active, .tarsyn-btn-secondary:active { transform: translateY(0); }
        .tarsyn-step-fill { transition: background 0.4s ease, box-shadow 0.4s ease; }
        .tarsyn-step-active { box-shadow: 0 0 8px rgba(107,45,78,0.45); }
        .tarsyn-module-card { transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease; }
        .tarsyn-module-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(107,45,78,0.10); }
        .tarsyn-pill { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.15s ease; }
        .tarsyn-pill:hover { transform: translateY(-1px); }
      `}</style>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          <div style={{ width: '32px', height: '32px', background: '#6B2D4E', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF7A', fontWeight: 800, fontSize: '13px' }}>T</div>
          <span style={{ color: '#6B2D4E', fontWeight: 800, fontSize: '16px' }}>TARSYN</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`tarsyn-step-fill ${i === step - 1 ? 'tarsyn-step-active' : ''}`}
              style={{ flex: 1, height: '4px', borderRadius: '4px', background: i < step ? '#6B2D4E' : '#E8D5E0' }}
            />
          ))}
        </div>

        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 12px 48px rgba(107,45,78,0.09), 0 2px 8px rgba(107,45,78,0.05)' }}>

          {error && <p style={{ color: '#E53935', fontSize: '13px', marginBottom: '16px', background: '#FFEBEE', padding: '10px 14px', borderRadius: '10px' }}>{error}</p>}

          {step === 1 && (
            <>
              <h1 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.2px' }}>Group Identity</h1>
              <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 28px' }}>Step 1 of {totalSteps}</p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Group Name *</label>
                <input className="tarsyn-input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Family Sol, Community Tontine..."
                  style={inputBase} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Group Type</label>
                <select className="tarsyn-select" value={groupType} onChange={e => setGroupType(e.target.value)}
                  style={{ ...inputBase, background: 'white' }}>
                  {['Sol', 'Tontine', 'Family', 'Friends', 'Community', 'Professional', 'Church', 'Association', 'Organization', 'Foundation', 'Agriculture', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Description</label>
                <textarea className="tarsyn-textarea" value={description} onChange={e => setDescription(e.target.value.slice(0, 300))} placeholder="Brief description..." rows={3}
                  style={{ ...inputBase, resize: 'none' }} />
                <p style={{ color: '#7A5068', fontSize: '11px', margin: '4px 0 0', textAlign: 'right' }}>{description.length}/300</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Country *</label>
                  <select className="tarsyn-select" value={country} onChange={e => { setCountry(e.target.value); setRegion(''); setCustomRegion(''); }}
                    style={{ ...inputBase, background: 'white' }}>
                    <option value="">Select...</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Region / State</label>
                  <RegionSelect
                    options={REGIONS_BY_COUNTRY[country] || []}
                    value={region}
                    onChange={setRegion}
                    customValue={customRegion}
                    onCustomChange={setCustomRegion}
                    disabled={!country}
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.2px' }}>Choose Module</h1>
              <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 28px' }}>Step 2 of {totalSteps}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { name: 'Sol', icon: Sun, desc: 'Rotating savings' },
                  { name: 'Tontine', icon: Handshake, desc: 'Community fund' },
                  { name: 'Association', icon: Landmark, desc: 'Formal group' },
                  { name: 'Church', icon: Church, desc: 'Faith community' },
                  { name: 'Organization', icon: Building2, desc: 'Professional org' },
                  { name: 'Foundation', icon: Gem, desc: 'Non-profit' },
                  { name: 'Agriculture', icon: Wheat, desc: 'Farming group' },
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.name} className="tarsyn-module-card" onClick={() => setModule(m.name)}
                      style={{ border: `2px solid ${module === m.name ? '#6B2D4E' : '#E8D5E0'}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', background: module === m.name ? '#FAF0E6' : 'white' }}>
                      <Icon size={26} color="#6B2D4E" strokeWidth={1.75} style={{ marginBottom: '10px' }} />
                      <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>{m.name}</p>
                      <p style={{ color: '#7A5068', fontSize: '12px', margin: 0 }}>{m.desc}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.2px' }}>Contribution Settings</h1>
              <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 28px' }}>Step 3 of {totalSteps}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Amount per Member</label>
                  <input className="tarsyn-input" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} type="number" min="0" placeholder="0.00"
                    style={inputBase} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Currency</label>
                  <select className="tarsyn-select" value={currency} onChange={e => setCurrency(e.target.value)}
                    style={{ ...inputBase, background: 'white' }}>
                    {['USD', 'CAD', 'EUR', 'GBP', 'HTG', 'XOF', 'XAF', 'BRL'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Frequency</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Weekly', 'Biweekly', 'Monthly'].map(f => (
                    <button key={f} className="tarsyn-pill" onClick={() => setFrequency(f)}
                      style={{ flex: 1, padding: '10px', border: `2px solid ${frequency === f ? '#6B2D4E' : '#E8D5E0'}`, borderRadius: '12px', background: frequency === f ? '#6B2D4E' : 'white', color: frequency === f ? 'white' : '#6B2D4E', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Rotation Mode</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Manual', 'Automatic'].map(r => (
                    <button key={r} className="tarsyn-pill" onClick={() => setRotationMode(r)}
                      style={{ flex: 1, padding: '10px', border: `2px solid ${rotationMode === r ? '#6B2D4E' : '#E8D5E0'}`, borderRadius: '12px', background: rotationMode === r ? '#6B2D4E' : 'white', color: rotationMode === r ? 'white' : '#6B2D4E', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Start Date</label>
                <input className="tarsyn-input" value={startDate} onChange={e => setStartDate(e.target.value)} type="date"
                  style={inputBase} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.2px' }}>Privacy & Settings</h1>
              <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 28px' }}>Step 4 of {totalSteps}</p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Privacy</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Private', 'Invite Only', 'Public'].map(p => (
                    <button key={p} className="tarsyn-pill" onClick={() => setPrivacy(p)}
                      style={{ flex: 1, padding: '10px', border: `2px solid ${privacy === p ? '#6B2D4E' : '#E8D5E0'}`, borderRadius: '12px', background: privacy === p ? '#6B2D4E' : 'white', color: privacy === p ? 'white' : '#6B2D4E', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Max Members</label>
                  <input className="tarsyn-input" value={memberLimit} onChange={e => setMemberLimit(e.target.value)} type="number" min="2"
                    style={inputBase} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#6B2D4E', fontSize: '13px', fontWeight: 600, marginBottom: '7px', letterSpacing: '0.1px' }}>Your Position</label>
                  <input className="tarsyn-input" value={adminPosition} onChange={e => setAdminPosition(e.target.value)} type="number" min="1"
                    style={inputBase} />
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.2px' }}>Review & Create</h1>
              <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 28px' }}>Step 5 of {totalSteps}</p>
              <div style={{ background: '#FAF0E6', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                {[
                  { label: 'Group Name', value: groupName },
                  { label: 'Type', value: groupType },
                  { label: 'Module', value: module },
                  { label: 'Country', value: country },
                  { label: 'Contribution', value: contributionAmount ? `${contributionAmount} ${currency} / ${frequency}` : 'Not set' },
                  { label: 'Rotation', value: rotationMode },
                  { label: 'Privacy', value: privacy },
                  { label: 'Max Members', value: memberLimit },
                  { label: 'Your Position', value: adminPosition },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #E8D5E0' }}>
                    <span style={{ color: '#7A5068', fontSize: '13px' }}>{item.label}</span>
                    <span style={{ color: '#6B2D4E', fontSize: '13px', fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            {step > 1 && (
              <button className="tarsyn-btn-secondary" onClick={() => setStep(s => s - 1)}
                style={{ flex: 1, background: '#FAF0E6', color: '#6B2D4E', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <ArrowLeft size={15} /> Back
              </button>
            )}
            {step < totalSteps ? (
              <button className="tarsyn-btn-primary" onClick={handleNext}
                style={{ flex: 2, background: '#6B2D4E', color: '#FAF0E6', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button className="tarsyn-btn-primary" onClick={handleCreate} disabled={loading}
                style={{ flex: 2, background: loading ? '#9B6B8E' : '#6B2D4E', color: '#FAF0E6', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading ? 'Creating...' : <>Create Group <Check size={16} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
