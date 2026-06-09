'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const REGIONS = [
  { region: 'Haiti', flag: '🇭🇹', name: 'Sol' },
  { region: 'Afrique de l\'Ouest', flag: '🌍', name: 'Tontine' },
  { region: 'Cameroun', flag: '🇨🇲', name: 'Njangi' },
  { region: 'Congo', flag: '🇨🇩', name: 'Likelemba' },
  { region: 'Ghana', flag: '🇬🇭', name: 'Susu' },
  { region: 'Nigeria', flag: '🇳🇬', name: 'Ajo / Esusu' },
  { region: 'Jamaïque', flag: '🇯🇲', name: 'Partner' },
  { region: 'Guyana', flag: '🇬🇾', name: 'Box Hand' },
  { region: 'Inde', flag: '🇮🇳', name: 'Chit Fund' },
  { region: 'Mexique', flag: '🇲🇽', name: 'Tanda' },
  { region: 'Philippines', flag: '🇵🇭', name: 'Paluwagan' },
  { region: 'General', flag: '🌍', name: 'Rotating Savings' },
];

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'HTG', label: 'HTG — Gourde Haïtienne' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Dollar Canadien' },
  { code: 'GBP', label: 'GBP — Livre Sterling' },
  { code: 'XOF', label: 'XOF — Franc CFA' },
  { code: 'NGN', label: 'NGN — Naira Nigérian' },
  { code: 'GHS', label: 'GHS — Cedi Ghanéen' },
  { code: 'INR', label: 'INR — Roupie Indienne' },
  { code: 'MXN', label: 'MXN — Peso Mexicain' },
  { code: 'PHP', label: 'PHP — Peso Philippin' },
  { code: 'BTC', label: 'BTC — Bitcoin' },
  { code: 'ETH', label: 'ETH — Ethereum' },
  { code: 'USDT', label: 'USDT — Tether' },
  { code: 'USDC', label: 'USDC — USD Coin' },
];

const FREQUENCIES = [
  'Weekly',
  'Bi-weekly',
  'Monthly',
  'Quarterly',
  'Bi-annual',
  'Annual',
];

const COMMISSIONS = ['0.5%', '1%', '1.5%', '2%'];

export default function CreateTontinePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    region: '',
    customName: '',
    numMembers: '',
    contribution: '',
    currency: 'USD',
    frequency: 'Monthly',
    startDate: '',
    commission: '1%',
    rules: '',
    confidential: false,
    inviteEmails: '',
  });

  const selectedRegion = REGIONS.find(r => r.region === form.region);
  const tontineName = form.customName || selectedRegion?.name || '';

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
    if (!form.contribution || parseFloat(form.contribution) <= 0) return setError('Montant de contribution invalide.');
    if (!form.startDate) return setError('Veuillez choisir une date de début.');

    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'tontines'), {
        region: form.region,
        regionFlag: selectedRegion?.flag || '🌍',
        regionalName: selectedRegion?.name || 'Rotating Savings',
        name: tontineName,
        numMembers: parseInt(form.numMembers),
        contribution: parseFloat(form.contribution),
        currency: form.currency,
        frequency: form.frequency,
        startDate: form.startDate,
        commission: form.commission,
        rules: form.rules,
        confidential: form.confidential,
        inviteEmails: form.inviteEmails
          .split(',')
          .map(e => e.trim())
          .filter(Boolean),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      console.log('Tontine créée avec ID:', docRef.id);
      setSaved(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la création. Vérifiez la console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF8F5',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '40px',
        width: '100%',
        maxWidth: '680px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B21A8', fontSize: '14px', marginBottom: '12px' }}
          >
            ← Retour au Dashboard
          </button>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>
            ✨ Créer une Tontine
          </h1>
          <p style={{ color: '#888', marginTop: '6px', fontSize: '14px' }}>
            Remplissez les informations pour lancer votre groupe d'épargne
          </p>
        </div>

        {/* Région */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Région / Pays <span style={{ color: 'red' }}>*</span></label>
          <select name="region" value={form.region} onChange={handleChange} style={inputStyle}>
            <option value="">— Sélectionner une région —</option>
            {REGIONS.map(r => (
              <option key={r.region} value={r.region}>
                {r.flag} {r.region} — {r.name}
              </option>
            ))}
          </select>
          {selectedRegion && (
            <p style={{ marginTop: '6px', fontSize: '13px', color: '#6B21A8' }}>
              Nom régional : <strong>{selectedRegion.flag} {selectedRegion.name}</strong>
            </p>
          )}
        </div>

        {/* Nom personnalisé */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Nom personnalisé (optionnel)</label>
          <input
            type="text"
            name="customName"
            value={form.customName}
            onChange={handleChange}
            placeholder={selectedRegion?.name || 'ex: Mon Sol 2026'}
            style={inputStyle}
          />
          {tontineName && (
            <p style={{ marginTop: '6px', fontSize: '13px', color: '#555' }}>
              Nom final : <strong>{tontineName}</strong>
            </p>
          )}
        </div>

        {/* Nombre de membres */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Nombre de membres <span style={{ color: 'red' }}>*</span></label>
          <input
            type="number"
            name="numMembers"
            value={form.numMembers}
            onChange={handleChange}
            min={2}
            placeholder="ex: 12"
            style={inputStyle}
          />
        </div>

        {/* Contribution + Devise */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Contribution <span style={{ color: 'red' }}>*</span></label>
            <input
              type="number"
              name="contribution"
              value={form.contribution}
              onChange={handleChange}
              min={1}
              placeholder="ex: 200"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Devise</label>
            <select name="currency" value={form.currency} onChange={handleChange} style={inputStyle}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fréquence */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Fréquence de paiement</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {FREQUENCIES.map(f => (
              <button
                key={f}
                onClick={() => setForm(p => ({ ...p, frequency: f }))}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '2px solid',
                  borderColor: form.frequency === f ? '#6B21A8' : '#ddd',
                  background: form.frequency === f ? '#6B21A8' : '#fff',
                  color: form.frequency === f ? '#fff' : '#555',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Date de début */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Date de début <span style={{ color: 'red' }}>*</span></label>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Commission */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Commission organisateur</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {COMMISSIONS.map(c => (
              <button
                key={c}
                onClick={() => setForm(p => ({ ...p, commission: c }))}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: '2px solid',
                  borderColor: form.commission === c ? '#6B21A8' : '#ddd',
                  background: form.commission === c ? '#6B21A8' : '#fff',
                  color: form.commission === c ? '#fff' : '#555',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Règles */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Règles du groupe</label>
          <textarea
            name="rules"
            value={form.rules}
            onChange={handleChange}
            rows={4}
            placeholder="ex: Paiement avant le 5 du mois. Pénalité de 10$ par retard..."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Mode confidentiel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <input
            type="checkbox"
            name="confidential"
            id="confidential"
            checked={form.confidential}
            onChange={handleChange}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="confidential" style={{ fontSize: '14px', color: '#333', cursor: 'pointer' }}>
            🔒 Mode confidentiel — Les membres ne voient que leur TYN-ID
          </label>
        </div>

        {/* Inviter membres */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Inviter des membres par email</label>
          <input
            type="text"
            name="inviteEmails"
            value={form.inviteEmails}
            onChange={handleChange}
            placeholder="email1@gmail.com, email2@yahoo.com, ..."
            style={inputStyle}
          />
          <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            Séparez les emails par des virgules
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#DC2626',
            fontSize: '14px',
            marginBottom: '20px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Succès */}
        {saved && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#16A34A',
            fontSize: '14px',
            marginBottom: '20px',
          }}>
            ✅ Tontine créée avec succès ! Redirection vers le dashboard...
          </div>
        )}

        {/* Bouton */}
        <button
          onClick={handleSubmit}
          disabled={saving || saved}
          style={{
            width: '100%',
            padding: '14px',
            background: saving || saved ? '#9CA3AF' : '#6B21A8',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: saving || saved ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? '⏳ Création en cours...' : saved ? '✅ Créée !' : '🚀 Créer la Tontine'}
        </button>
      </div>
    </div>
  );
}

// Styles helpers
const fieldStyle: React.CSSProperties = { marginBottom: '20px' };

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#333',
  background: '#FAFAFA',
  boxSizing: 'border-box',
  outline: 'none',
};
