'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { authHeaders } from '@/lib/authFetch';
import AppPage from '@/components/assistants/AppPage';
import { ALWAYS_ALLOWED, ASSISTANT_LANGS, ASSISTANT_TITLES, INVITE_VALID_DAYS, NEVER_ALLOWED, OPTIONAL_RIGHTS, type AssistantRights, type OrganizerGroup } from '@/lib/assistants';
import GroupPicker from '@/components/assistants/GroupPicker';
import { MEMBER_COUNTRIES } from '@/lib/memberOptions';

type Form = {
  firstName: string; lastName: string; gender: string; email: string; phone: string; country: string;
  title: string; titleOther: string; lang: string;
  groupIds: string[];
  rights: AssistantRights; durationMode: 'none' | 'until'; accessUntil: string;
  message: string; confirmed: boolean;
};
const EMPTY: Form = {
  firstName: '', lastName: '', gender: '', email: '', phone: '', country: '',
  title: 'Assistant', titleOther: '', lang: 'en',
  groupIds: [],
  rights: { manageMembers: false, referrals: false }, durationMode: 'none', accessUntil: '',
  message: '', confirmed: false,
};
const FIELD_LABEL: Record<string, string> = {
  firstName: 'First name', lastName: 'Last name', gender: 'Sex', email: 'Email', phone: 'Phone', country: 'Country',
  title: 'Title', groups: 'Groups', accessUntil: 'End date', confirmed: 'Confirmation',
};

export default function InviteAssistantPage() {
  const router = useRouter();
  const [f, setF] = useState<Form>(EMPTY);
  const [bad, setBad] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ email: string; emailSent: boolean; link: string } | null>(null);
  const [placesLeft, setPlacesLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [groups, setGroups] = useState<OrganizerGroup[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login?redirect=/dashboard/assistants/invite'); return; }
      try {
        const res = await fetch('/api/assistants', { headers: await authHeaders('admin') });
        const data = await res.json();
        if (res.ok) { setPlacesLeft(Math.max(0, (data.max || 2) - (data.assistants || []).length)); setGroups(data.groups || []); }
        else setError(data.error || 'Could not load your assistants.');
      } catch { setPlacesLeft(null); }
    });
    return () => unsub();
  }, [router]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF(x => ({ ...x, [k]: v })); setBad(b => b.filter(x => x !== k)); };
  const [tomorrow] = useState(() => new Date(Date.now() + 864e5).toISOString().slice(0, 10));

  const check = (): string[] => {
    const b: string[] = [];
    if (f.firstName.trim().length < 2) b.push('firstName');
    if (f.lastName.trim().length < 2) b.push('lastName');
    if (!f.gender) b.push('gender');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) b.push('email');
    if (!/^\+?[0-9 ()-]{7,20}$/.test(f.phone.trim())) b.push('phone');
    if (!f.country) b.push('country');
    if (!f.title || (f.title === 'Other' && f.titleOther.trim().length < 2)) b.push('title');
    if (f.groupIds.length === 0) b.push('groups');
    if (f.durationMode === 'until' && (!f.accessUntil || f.accessUntil < tomorrow)) b.push('accessUntil');
    if (!f.confirmed) b.push('confirmed');
    return b;
  };

  const submit = async () => {
    setError('');
    const b = check();
    if (b.length) { setBad(b); setError('Please complete: ' + b.map(x => FIELD_LABEL[x] || x).join(', ') + '.'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/assistants/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders('admin')) },
        body: JSON.stringify({ ...f, groupIds: f.groupIds, email: f.email.trim(), phone: f.phone.trim(), accessUntil: f.durationMode === 'until' ? f.accessUntil : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === 'invalid-fields') { setBad(data.fields || []); setError('Please check: ' + (data.fields || []).map((x: string) => FIELD_LABEL[x] || x).join(', ') + '.'); }
        else { setError(data.error || 'Could not send the invitation.'); if (data.fields) setBad(data.fields); }
      } else {
        setDone({ email: f.email.trim(), emailSent: !!data.emailSent, link: data.link || '' });
      }
    } catch {
      setError('Could not send the invitation. Please try again.');
    }
    setSending(false);
  };

  const cls = (k: string) => 'ap-in' + (bad.includes(k) ? ' bad' : '');
  const titleShown = f.title === 'Other' ? (f.titleOther.trim() || 'Other') : f.title;

  if (done) {
    return (
      <AppPage title="Invite an Assistant" subtitle="Invitation sent." back={{ label: 'Back to My Assistants', href: '/dashboard/assistants' }}>
        <div className="ap-card" style={{ maxWidth: 560, margin: '20px auto', textAlign: 'center', padding: '30px 28px' }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#E9C77B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>{'\u2709'}</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#4A1F38' }}>{done.emailSent ? 'Invitation sent' : 'Invitation created'}</h2>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#8A7B6C', lineHeight: 1.6 }}>
            {done.emailSent
              ? <>An email was sent to <b style={{ color: '#4A1F38' }}>{done.email}</b>. The link is valid for {INVITE_VALID_DAYS} days.</>
              : <>The email could not be sent. Send this personal link to <b style={{ color: '#4A1F38' }}>{done.email}</b> yourself (valid {INVITE_VALID_DAYS} days):</>}
          </p>
          {!done.emailSent && done.link && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input className="ap-in" readOnly value={done.link} onFocus={e => e.currentTarget.select()} />
              <button className="ap-btn ap-soft" onClick={() => { navigator.clipboard.writeText(done.link); setCopied(true); }}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="ap-btn ap-primary" onClick={() => router.push('/dashboard/assistants')}>Go to My Assistants</button>
          </div>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage wide title="Invite an Assistant" subtitle="Someone you trust who helps you manage your groups with their own account." back={{ label: 'Back to My Assistants', href: '/dashboard/assistants' }}>
      <style>{`
        .iv-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr) 290px; gap: 14px; align-items: start; }
        .iv-grid .ap-card { padding: 14px 18px; }
        .iv-grid .ap-head { margin-bottom: 10px; padding-bottom: 8px; }
        .iv-grid .ap-ico { width: 28px; height: 28px; font-size: 14px; border-radius: 9px; }
        .iv-grid .ap-in { height: 35px; }
        .iv-grid textarea.ap-in { height: auto; }
        .iv-grid .iv-rights { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 1250px) { .iv-grid { grid-template-columns: minmax(0,1fr) 290px; } .iv-grid > div:nth-child(2) { grid-column: 1; } }
        .iv-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
        .iv-three { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 14px; }
        .iv-opt { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid #F0E4D6; border-radius: 12px; cursor: pointer; }
        .iv-radio { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1.5px solid #EAD9BE; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 700; color: #4A1F38; background: #FFFDF9; }
        .iv-radio.on { border-color: #6B2D4E; background: #F8EEF3; }
        @media (max-width: 900px) { .iv-grid { grid-template-columns: 1fr !important; } .iv-grid .iv-rights { grid-template-columns: 1fr; } }
        @media (max-width: 560px) { .iv-two, .iv-three { grid-template-columns: 1fr; } }
      `}</style>

      {placesLeft === 0 ? (
        <div className="ap-card" style={{ maxWidth: 560, margin: '20px auto', textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#4A1F38' }}>Both places are taken</p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#8A7B6C' }}>You already have 2 assistants. Remove one in My Assistants to invite someone else.</p>
          <button className="ap-btn ap-primary" onClick={() => router.push('/dashboard/assistants')}>Go to My Assistants</button>
        </div>
      ) : (
      <div className="iv-grid">
        {/* Column 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* 1. Identity */}
          <div className="ap-card">
            <div className="ap-head"><span className="ap-ico" style={{ background: 'linear-gradient(135deg,#F4B6C7,#B0525F)' }}>{'\u{1F464}'}</span><h2 className="ap-title">1. Identity</h2></div>
            <div className="iv-three">
              <div><label className="ap-label">First name *</label><input className={cls('firstName')} value={f.firstName} onChange={e => set('firstName', e.target.value)} autoComplete="off" /></div>
              <div><label className="ap-label">Last name *</label><input className={cls('lastName')} value={f.lastName} onChange={e => set('lastName', e.target.value)} autoComplete="off" /></div>
              <div><label className="ap-label">Sex *</label>
                <select className={cls('gender')} value={f.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </div>
              <div><label className="ap-label">Email *</label><input className={cls('email')} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" autoComplete="off" /></div>
              <div><label className="ap-label">Phone *</label><input className={cls('phone')} type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" /></div>
              <div><label className="ap-label">Country *</label>
                <select className={cls('country')} value={f.country} onChange={e => set('country', e.target.value)}>
                  <option value="">Select country...</option>
                  {MEMBER_COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                </select>
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#A08B7D' }}>The invitation is sent to this email. Your assistant creates their own account with it.</p>
          </div>

          {/* 2. Role */}
          <div className="ap-card">
            <div className="ap-head"><span className="ap-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\u{1F3F7}'}</span><h2 className="ap-title">2. Role</h2></div>
            <div className="iv-three">
              <div><label className="ap-label">Title shown *</label>
                <select className={cls('title')} value={f.title} onChange={e => set('title', e.target.value)}>
                  {ASSISTANT_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {f.title === 'Other' && (
                <div><label className="ap-label">Write the title *</label><input className={cls('title')} value={f.titleOther} onChange={e => set('titleOther', e.target.value)} maxLength={40} placeholder="e.g. Coordinator" /></div>
              )}
              <div><label className="ap-label">Email language</label>
                <select className="ap-in" value={f.lang} onChange={e => set('lang', e.target.value)}>
                  {ASSISTANT_LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Groups */}
          <div className="ap-card" style={{ borderColor: bad.includes('groups') ? '#C62828' : '#F0E4D6' }}>
            <div className="ap-head"><span className="ap-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#6B2D4E)' }}>{'\u{1F3D8}'}</span><h2 className="ap-title">3. Groups *</h2></div>
            <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#8A7B6C', lineHeight: 1.5 }}>
              This assistant will work <b>only</b> in the groups you select. A group can have only one assistant: groups already given to your other assistant are locked.
            </p>
            <GroupPicker groups={groups} value={f.groupIds} onChange={ids => set('groupIds', ids)} currentAssistantId={null} invalid={bad.includes('groups')} />
          </div>
        </div>

        {/* Column 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* 4. Rights */}
          <div className="ap-card">
            <div className="ap-head"><span className="ap-ico" style={{ background: 'linear-gradient(135deg,#66BB6A,#2E7D32)' }}>{'\u{1F511}'}</span><h2 className="ap-title">4. Rights</h2></div>
            <div className="iv-rights" style={{ alignItems: 'start' }}>
              <div>
                <p className="ap-label" style={{ color: '#3F7D5C' }}>Always included</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {ALWAYS_ALLOWED.map(t => <li key={t} style={{ fontSize: 12.5, color: '#3A2F1F', margin: '0 0 6px', display: 'flex', gap: 7 }}><span style={{ color: '#3F7D5C', fontWeight: 800 }}>{'\u2713'}</span>{t}</li>)}
                </ul>
              </div>
              <div>
                <p className="ap-label" style={{ color: '#6B2D4E' }}>Optional - your choice</p>
                {OPTIONAL_RIGHTS.map(r => (
                  <label key={r.key} className="iv-opt" style={{ marginBottom: 8, background: f.rights[r.key] ? '#F4F9F5' : '#FFFDF9' }}>
                    <input type="checkbox" checked={f.rights[r.key]} onChange={e => set('rights', { ...f.rights, [r.key]: e.target.checked })} style={{ width: 17, height: 17, accentColor: '#6B2D4E', marginTop: 1 }} />
                    <span><b style={{ fontSize: 13, color: '#4A1F38' }}>{r.label}</b><br /><span style={{ fontSize: 11.5, color: '#8A7B6C' }}>{r.help}</span></span>
                  </label>
                ))}
                <p className="ap-label" style={{ color: '#B0525F', marginTop: 10 }}>Never allowed</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {NEVER_ALLOWED.map(t => <li key={t} style={{ fontSize: 12, color: '#A08B7D', margin: '0 0 5px', display: 'flex', gap: 7 }}><span style={{ color: '#B0525F', fontWeight: 800 }}>{'\u2715'}</span>{t}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* 5. Duration */}
          <div className="ap-card">
            <div className="ap-head"><span className="ap-ico" style={{ background: 'linear-gradient(135deg,#64B5F6,#1565C0)' }}>{'\u{1F4C5}'}</span><h2 className="ap-title">5. Duration</h2></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className={'iv-radio' + (f.durationMode === 'none' ? ' on' : '')}><input type="radio" checked={f.durationMode === 'none'} onChange={() => set('durationMode', 'none')} style={{ accentColor: '#6B2D4E' }} /> No end date</label>
              <label className={'iv-radio' + (f.durationMode === 'until' ? ' on' : '')}><input type="radio" checked={f.durationMode === 'until'} onChange={() => set('durationMode', 'until')} style={{ accentColor: '#6B2D4E' }} /> Until a date</label>
              {f.durationMode === 'until' && (
                <input className={cls('accessUntil')} type="date" min={tomorrow} value={f.accessUntil} onChange={e => set('accessUntil', e.target.value)} style={{ width: 180 }} />
              )}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#A08B7D' }}>After the end date, access stops automatically. You can also suspend or remove an assistant at any time.</p>
          </div>

          {/* 6. Message */}
          <div className="ap-card">
            <div className="ap-head"><span className="ap-ico" style={{ background: 'linear-gradient(135deg,#B39DDB,#6B2D4E)' }}>{'\u{1F4AC}'}</span><h2 className="ap-title">6. Personal message <span style={{ fontWeight: 500, fontSize: 12, color: '#A08B7D' }}>(optional)</span></h2></div>
            <textarea className="ap-in" rows={2} maxLength={500} value={f.message} onChange={e => set('message', e.target.value)} placeholder="e.g. Thank you for helping me with the group payments." />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#A08B7D', textAlign: 'right' }}>{f.message.length}/500</p>
          </div>

          {/* 7. Confirmation */}
          <label className="ap-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', borderColor: bad.includes('confirmed') ? '#C62828' : '#F0E4D6' }}>
            <input type="checkbox" checked={f.confirmed} onChange={e => set('confirmed', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#6B2D4E', marginTop: 2 }} />
            <span style={{ fontSize: 13, color: '#3A2F1F', lineHeight: 1.55 }}>
              <b>I confirm that this person acts on my behalf</b> in the groups selected above and that I am responsible for the actions they take with this access. *
            </span>
          </label>
        </div>

        {/* Summary */}
        <div className="ap-card" style={{ position: 'sticky', top: 16 }}>
          <div className="ap-head"><span className="ap-ico" style={{ background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)' }}>{'\u{1F4CB}'}</span><h2 className="ap-title">Summary</h2></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#E9C77B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              {((f.firstName[0] || '?') + (f.lastName[0] || '')).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#4A1F38', fontSize: 14 }}>{(f.firstName + ' ' + f.lastName).trim() || 'New assistant'}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#C9974D', fontWeight: 700 }}>{titleShown}</p>
            </div>
          </div>
          {[
            ['Email', f.email || '\u2014'], ['Phone', f.phone || '\u2014'], ['Country', f.country || '\u2014'], ['Sex', f.gender || '\u2014'],
            ['Groups', f.groupIds.length ? groups.filter(g => f.groupIds.includes(g.id)).map(g => g.name).join(', ') : '\u2014'],
            ['Members', f.rights.manageMembers ? 'Can add and edit' : 'View only'],
            ['Join requests', f.rights.referrals ? 'Can accept / decline' : 'View only'],
            ['Access', f.durationMode === 'until' && f.accessUntil ? 'Until ' + f.accessUntil : 'No end date'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '6px 0', borderBottom: '1px dashed #F3E6D8' }}>
              <span style={{ color: '#A08B7D' }}>{k}</span><span style={{ color: '#3A2F1F', fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
            </div>
          ))}
          {error && <p style={{ margin: '12px 0 0', fontSize: 12.5, color: '#C62828', fontWeight: 600 }}>{error}</p>}
          <button className="ap-btn ap-primary" style={{ width: '100%', marginTop: 14 }} disabled={sending || placesLeft === 0} onClick={submit}>
            {sending ? 'Sending...' : '\u2709 Send invitation'}
          </button>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#A08B7D', textAlign: 'center' }}>{placesLeft === null ? '' : placesLeft + ' of 2 places available'}</p>
        </div>
      </div>
      )}
    </AppPage>
  );
}
