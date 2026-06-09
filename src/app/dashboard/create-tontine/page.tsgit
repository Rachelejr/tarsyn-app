'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const C = {
  bordeaux:   '#6B2D4E',
  dore:       '#D4AF7A',
  creme:      '#FAF0E6',
  roseClair:  '#EDD9E5',
  roseMoyen:  '#D9C0CC',
  texteFonce: '#2C1A24',
  texteGris:  '#7A5068',
};

const REGIONS = [
  { region: 'Afrique de l\'Ouest',    flag: '🌍', name: 'Tontine' },
  { region: 'Cameroun',               flag: '🇨🇲', name: 'Njangi' },
  { region: 'Congo (RDC)',            flag: '🇨🇩', name: 'Likelemba' },
  { region: 'Ghana',                  flag: '🇬🇭', name: 'Susu' },
  { region: 'Nigeria',                flag: '🇳🇬', name: 'Ajo / Esusu' },
  { region: 'Sénégal',                flag: '🇸🇳', name: 'Tontine' },
  { region: 'Côte d\'Ivoire',         flag: '🇨🇮', name: 'Tontine' },
  { region: 'Kenya',                  flag: '🇰🇪', name: 'Chama' },
  { region: 'Éthiopie',               flag: '🇪🇹', name: 'Iqub' },
  { region: 'Haïti',                  flag: '🇭🇹', name: 'Sol' },
  { region: 'République Dominicaine', flag: '🇩🇴', name: 'San / Mutualidad' },
  { region: 'Jamaïque',               flag: '🇯🇲', name: 'Partner' },
  { region: 'Trinidad & Tobago',      flag: '🇹🇹', name: 'Sou-Sou' },
  { region: 'Barbade',                flag: '🇧🇧', name: 'Meeting Turn' },
  { region: 'Guyana',                 flag: '🇬🇾', name: 'Box Hand' },
  { region: 'Suriname',               flag: '🇸🇷', name: 'Kasmoni' },
  { region: 'Cuba',                   flag: '🇨🇺', name: 'Cundina' },
  { region: 'Puerto Rico',            flag: '🇵🇷', name: 'Cundina' },
  { region: 'Guadeloupe',             flag: '🇬🇵', name: 'Sou-Sou' },
  { region: 'Martinique',             flag: '🇲🇶', name: 'Sou-Sou' },
  { region: 'Guyane française',       flag: '🇬🇫', name: 'Sou-Sou' },
  { region: 'Sainte-Lucie',           flag: '🇱🇨', name: 'Sou-Sou' },
  { region: 'Saint-Vincent',          flag: '🇻🇨', name: 'Sou-Sou' },
  { region: 'Antigua & Barbuda',      flag: '🇦🇬', name: 'Meeting Turn' },
  { region: 'Mexique',                flag: '🇲🇽', name: 'Tanda' },
  { region: 'Guatemala',              flag: '🇬🇹', name: 'Cundina' },
  { region: 'Honduras',               flag: '🇭🇳', name: 'Cundina' },
  { region: 'El Salvador',            flag: '🇸🇻', name: 'Cundina' },
  { region: 'Colombie',               flag: '🇨🇴', name: 'Natillera' },
  { region: 'Pérou',                  flag: '🇵🇪', name: 'Pandero' },
  { region: 'Bolivie',                flag: '🇧🇴', name: 'Pasanaku' },
  { region: 'Équateur',               flag: '🇪🇨', name: 'Pandero' },
  { region: 'Inde',                   flag: '🇮🇳', name: 'Chit Fund' },
  { region: 'Philippines',            flag: '🇵🇭', name: 'Paluwagan' },
  { region: 'Vietnam',                flag: '🇻🇳', name: 'Hui' },
  { region: 'Chine',                  flag: '🇨🇳', name: 'Hui' },
  { region: 'Corée du Sud',           flag: '🇰🇷', name: 'Gye' },
  { region: 'Japon',                  flag: '🇯🇵', name: 'Ko' },
  { region: 'Général / Autre',        flag: '🌍', name: 'Rotating Savings' },
];

const CURRENCIES = [
  { code: 'USD',  label: 'USD — US Dollar' },
  { code: 'HTG',  label: 'HTG — Gourde Haïtienne' },
  { code: 'EUR',  label: 'EUR — Euro' },
  { code: 'CAD',  label: 'CAD — Dollar Canadien' },
  { code: 'GBP',  label: 'GBP — Livre Sterling' },
  { code: 'XOF',  label: 'XOF — Franc CFA' },
  { code: 'NGN',  label: 'NGN — Naira Nigérian' },
  { code: 'GHS',  label: 'GHS — Cedi Ghanéen' },
  { code: 'INR',  label: 'INR — Roupie Indienne' },
  { code: 'MXN',  label: 'MXN — Peso Mexicain' },
  { code: 'PHP',  label: 'PHP — Peso Philippin' },
  { code: 'DOP',  label: 'DOP — Peso Dominicain' },
  { code: 'TTD',  label: 'TTD — Dollar de T&T' },
  { code: 'JMD',  label: 'JMD — Dollar Jamaïcain' },
  { code: 'BTC',  label: 'BTC — Bitcoin' },
  { code: 'ETH',  label: 'ETH — Ethereum' },
  { code: 'USDT', label: 'USDT — Tether' },
  { code: 'USDC', label: 'USDC — USD Coin' },
];

const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Bi-annual', 'Annual'];
const COMMISSIONS = ['0.5%', '1%', '1.5%', '2%'];

const LANGUAGES = [
  'Afrikaans','Akan','Albanais','Allemand','Amharique','Anglais','Arabe',
  'Arménien','Bengali','Birman','Bosniaque','Bulgare','Catalan','Chinois (Mandarin)',
  'Chinois (Cantonais)','Coréen','Créole Haïtien','Croate','Danois','Espagnol',
  'Estonien','Filipino / Tagalog','Finnois','Français','Géorgien','Grec',
  'Gujarati','Haoussa','Hébreu','Hindi','Hongrois','Igbo','Indonésien','Italien',
  'Japonais','Kannada','Kazakh','Khmer','Kinyarwanda','Kurde','Laotien','Letton',
  'Lituanien','Macédonien','Malaisien','Malayalam','Malgache','Maltais','Marathi',
  'Mongol','Népalais','Néerlandais','Norvégien','Ourdou','Ouzbek','Panjabi',
  'Persan (Farsi)','Polonais','Portugais (Brésil)','Portugais (Portugal)',
  'Roumain','Russe','Serbe','Shona','Slovaque','Slovène','Somali','Souahéli',
  'Suédois','Tamoul','Tchèque','Telugu','Thaï','Turc','Ukrainien','Vietnamien',
  'Wolof','Xhosa','Yoruba','Zoulou',
].sort();

export default function CreateTontinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const [form, setForm] = useState({
    region:       '',
    customName:   '',
    numMembers:   '',
    contribution: '',
    currency:     'USD',
    frequency:    'Monthly',
    startDate:    '',
    commission:   '1%',
    rules:        '',
    confidential: false,
    inviteEmails: '',
    language:     'Français',
  });

  const selectedRegion = REGIONS.find(r => r.region === form.region);
  const tontineName    = form.customName || selectedRegion?.name || '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.region) return setError('Veuillez sélectionner une région.');
    if (!form.numMembers || parseInt(form.numMembers) < 2) return setError('Minimum 2 membres requis.');
    if (!form.contribution || parseFloat(form.contribution) <= 0) return setError('Montant invalide.');
    if (!form.startDate) return setError('Veuillez choisir une date de début.');

    const emails = form.inviteEmails.split(',').map(e => e.trim()).filter(Boolean);
    setSaving(true);

    try {
      const docRef = await addDoc(collection(db, 'tontines'), {
        region:       form.region,
        regionFlag:   selectedRegion?.flag || '🌍',
        regionalName: selectedRegion?.name || 'Rotating Savings',
        name:         tontineName,
        numMembers:   parseInt(form.numMembers),
        contribution: parseFloat(form.contribution),
        currency:     form.currency,
        frequency:    form.frequency,
        startDate:    form.startDate,
        commission:   form.commission,
        rules:        form.rules,
        confidential: form.confidential,
        language:     form.language,
        inviteEmails: emails,
        status:       'active',
        createdAt:    serverTimestamp(),
      });

      if (emails.length > 0) {
        await fetch('/api/send-invite', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails,
            tontineName,
            region:       form.region,
            regionFlag:   selectedRegion?.flag || '🌍',
            contribution: form.contribution,
            currency:     form.currency,
            frequency:    form.frequency,
            startDate:    form.startDate,
            tontineId:    docRef.id,
          }),
        });
      }

      setSaved(true);
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la création. Vérifiez la console.');
    } finally {
      setSaving(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: `1.5px solid ${C.roseMoyen}`,
    borderRadius: '8px', fontSize: '14px',
    color: C.texteFonce, background: C.creme,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 32px rgba(107,45,78,0.12)', padding: '40px', width: '100%', maxWidth: '700px', border: `1px solid ${C.roseMoyen}` }}>

        {/* Header */}
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.bordeaux, fontSize: '14px', fontWeight: '600', marginBottom: '12px', padding: 0, display: 'block' }}>
          ← Retour au Dashboard
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: C.texteFonce, margin: '0 0 4px' }}>✨ Créer une Tontine</h1>
        <p style={{ color: C.texteGris, margin: '0 0 8px', fontSize: '14px' }}>Lancez votre groupe d'épargne communautaire</p>
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.bordeaux}, ${C.dore})`, borderRadius: '2px', marginBottom: '28px' }} />

        {/* Région */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>🌍 Région / Pays <span style={{ color: 'red' }}>*</span></label>
          <select name="region" value={form.region} onChange={handleChange} style={inp}>
            <option value="">— Sélectionner un pays ou une région —</option>
            {REGIONS.map(r => <option key={r.region} value={r.region}>{r.flag} {r.region} — {r.name}</option>)}
          </select>
          {selectedRegion && <p style={{ marginTop: '6px', fontSize: '13px', color: C.bordeaux, background: C.roseClair, padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>{selectedRegion.flag} Nom régional : <strong>{selectedRegion.name}</strong></p>}
        </div>

        {/* Nom personnalisé */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>✏️ Nom personnalisé (optionnel)</label>
          <input type="text" name="customName" value={form.customName} onChange={handleChange} placeholder={selectedRegion?.name || 'ex: Mon Sol 2026'} style={inp} />
          {tontineName && <p style={{ marginTop: '4px', fontSize: '13px', color: C.bordeaux }}>Nom final : <strong>{tontineName}</strong></p>}
        </div>

        {/* Langue */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>🌐 Langue du groupe</label>
          <select name="language" value={form.language} onChange={handleChange} style={inp}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Nombre de membres */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>👥 Nombre de membres <span style={{ color: 'red' }}>*</span></label>
          <input type="number" name="numMembers" value={form.numMembers} onChange={handleChange} min={2} placeholder="ex: 12" style={inp} />
        </div>

        {/* Contribution + Devise */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>💰 Contribution <span style={{ color: 'red' }}>*</span></label>
            <input type="number" name="contribution" value={form.contribution} onChange={handleChange} min={1} placeholder="ex: 200" style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>Devise</label>
            <select name="currency" value={form.currency} onChange={handleChange} style={inp}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Fréquence */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>🔄 Fréquence de paiement</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {FREQUENCIES.map(f => (
              <button key={f} onClick={() => setForm(p => ({ ...p, frequency: f }))}
                style={{ padding: '8px 18px', borderRadius: '20px', border: `2px solid ${form.frequency === f ? C.bordeaux : C.roseMoyen}`, background: form.frequency === f ? C.bordeaux : '#fff', color: form.frequency === f ? '#fff' : C.texteGris, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Date de début */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>📅 Date de début <span style={{ color: 'red' }}>*</span></label>
          <input type="date" name="startDate" value={form.startDate} onChange={handleChange} style={inp} />
        </div>

        {/* Commission */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>💼 Commission organisateur</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {COMMISSIONS.map(c => (
              <button key={c} onClick={() => setForm(p => ({ ...p, commission: c }))}
                style={{ padding: '8px 18px', borderRadius: '20px', border: `2px solid ${form.commission === c ? C.bordeaux : C.roseMoyen}`, background: form.commission === c ? C.bordeaux : '#fff', color: form.commission === c ? '#fff' : C.texteGris, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Règles */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>📜 Règles du groupe</label>
          <textarea name="rules" value={form.rules} onChange={handleChange} rows={4}
            placeholder="ex: Paiement avant le 5 du mois. Pénalité de 10$ par retard..."
            style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        {/* Mode confidentiel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '14px 16px', background: C.roseClair, borderRadius: '10px', border: `1px solid ${C.roseMoyen}` }}>
          <input type="checkbox" name="confidential" id="confidential" checked={form.confidential} onChange={handleChange}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: C.bordeaux }} />
          <label htmlFor="confidential" style={{ fontSize: '14px', color: C.texteFonce, cursor: 'pointer', fontWeight: '500' }}>
            🔒 Mode confidentiel — Les membres ne voient que leur TYN-ID
          </label>
        </div>

        {/* Inviter membres */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', color: C.texteFonce, marginBottom: '6px', fontSize: '14px' }}>📧 Inviter des membres par email</label>
          <input type="text" name="inviteEmails" value={form.inviteEmails} onChange={handleChange}
            placeholder="email1@gmail.com, email2@yahoo.com, ..." style={inp} />
          <p style={{ fontSize: '12px', color: C.texteGris, margin: '4px 0 0' }}>Séparez les emails par des virgules</p>
        </div>

        {/* Erreur */}
        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', color: '#DC2626', fontSize: '14px', marginBottom: '20px' }}>⚠️ {error}</div>}

        {/* Succès */}
        {saved && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', color: '#16A34A', fontSize: '14px', marginBottom: '20px' }}>✅ Tontine créée ! Redirection...</div>}

        {/* Bouton */}
        <button onClick={handleSubmit} disabled={saving || saved}
          style={{ width: '100%', padding: '15px', background: saving || saved ? C.roseMoyen : `linear-gradient(135deg, ${C.bordeaux}, #8B3A6A)`, color: saving || saved ? C.texteGris : '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: saving || saved ? 'not-allowed' : 'pointer', boxShadow: `0 4px 16px rgba(107,45,78,0.3)` }}>
          {saving ? '⏳ Création en cours...' : saved ? '✅ Créée !' : '🚀 Créer la Tontine'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: C.texteGris, marginTop: '16px' }}>TARSYN — Your Community. Your Power. 🌍</p>
      </div>
    </div>
  );
}