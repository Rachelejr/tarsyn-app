'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

const PAYS = ['Canada','France','Haiti','United States','Belgium','Switzerland','Morocco','Senegal','Ivory Coast','Cameroon','Congo','Madagascar','Tunisia','Algeria','Mali','Burkina Faso','Guinea','Benin','Togo','Niger','Rwanda','Burundi','Gabon','Martinique','Guadeloupe','French Guiana','Reunion','Other'];
const LANGUAGES = ['English','Français','Kreyòl ayisyen','Kreyòl Antiyè','Español','Português','العربية','Wolof','Bambara','Lingala','Kiswahili','Other'];

export default function RegisterPage() {
  const [step, setStep]           = useState<'register'|'verify'>('register');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [pays, setPays]           = useState('');
  const [langue, setLangue]       = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [agreed, setAgreed]       = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) { setError('Please accept the Terms & Conditions.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await sendEmailVerification(result.user);
      setStep('verify');
    } catch (err: any) {
      const msgs: any = {
        'auth/email-already-in-use': 'This email is already in use.',
        'auth/invalid-email': 'Invalid email.',
        'auth/weak-password': 'Password too weak.',
      };
      setError(msgs[err.code] || 'Error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      window.location.href = '/dashboard';
    } catch {
      setError('Google error. Please try again.');
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px',
    border: '1.5px solid #EAD9BE', borderRadius: '10px',
    fontSize: '13.5px', background: '#FFFDF9',
    outline: 'none', color: '#3A2F1F', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
  };
  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: '10px', top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700, color: '#6B2D4E', padding: '0',
  };

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#A08B7D', marginBottom: '4px', letterSpacing: '0.8px', textTransform: 'uppercase' };

  // ── ÉTAPE VÉRIFICATION EMAIL ───────────────────────────────
  if (step === 'verify') {
    return (
      <Shell subtitle="One last step to activate your account.">
        <div className="rg-card" style={{ maxWidth: 480, margin: '10px auto 0', padding: '32px 30px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#E9C77B,#C9974D)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26, boxShadow: '0 6px 16px rgba(74,31,56,0.18)' }}>{'\u{1F4E7}'}</div>
          <h2 style={{ color: '#4A1F38', fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>Check your email!</h2>
          <p style={{ color: '#8A7B6C', fontSize: 13.5, lineHeight: 1.7, margin: '0 0 18px' }}>
            We sent a verification link to<br />
            <strong style={{ color: '#6B2D4E' }}>{email}</strong><br />
            Click the link in the email to activate your account.
          </p>
          <div style={{ background: '#FBF6EF', border: '1px solid #F0E4D6', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#3A2F1F', textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Next steps</div>
            {['Open your email inbox', 'Click the verification link from UNIMUNITY', 'Come back and sign in', "You'll receive a 2FA code for extra security"].map((t, i) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#6B2D4E', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <a href="/login" className="rg-btn" style={{ display: 'block', padding: 12, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', borderRadius: 12, fontSize: 14.5, fontWeight: 800, textDecoration: 'none', marginBottom: 10, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
            Go to Sign In
          </a>
          <button onClick={async () => {
            try {
              const user = auth.currentUser;
              if (user) await sendEmailVerification(user);
              alert('New verification email sent!');
            } catch { alert('Error sending email.'); }
          }} style={{ background: 'none', border: 'none', color: '#6B2D4E', fontSize: 12.5, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
            Resend verification email
          </button>
        </div>
      </Shell>
    );
  }

  // ── ÉTAPE REGISTER ─────────────────────────────────────────
  return (
    <Shell subtitle="Join your UNIMUNITY community.">
      <div className="rg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start', maxWidth: 980, margin: '0 auto' }}>

        <div className="rg-card" style={{ padding: '16px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12, paddingBottom: 9, borderBottom: '1px solid #F3E6D8' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: 'linear-gradient(135deg,#E9C77B,#C9974D)', boxShadow: '0 4px 10px rgba(74,31,56,0.18)' }}>{'\u{1F464}'}</span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4A1F38' }}>Create Account</h2>
          </div>

          {error && (
            <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', color: '#C0392B', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="rg-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px', marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Marie Jean" style={inp} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <select required value={pays} onChange={e => setPays(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Select your country</option>
                  {PAYS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Preferred Language</label>
                <select required value={langue} onChange={e => setLangue(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  <option value="">Select a language</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Password <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>(8 min)</span></label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="8 characters minimum" style={{ ...inp, paddingRight: 54 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={eyeBtn}>{showPass ? 'Hide' : 'Show'}</button>
                </div>
                {password.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: password.length >= (i + 1) * 2 ? password.length >= 8 ? '#4A7C59' : '#E9C77B' : '#EAD9BE', transition: 'background 0.3s' }} />
                    ))}
                    <span style={{ fontSize: 11, color: password.length >= 8 ? '#4A7C59' : '#B8860B', marginLeft: 6, whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {password.length < 4 ? 'Too short' : password.length < 6 ? 'Weak' : password.length < 8 ? 'Almost...' : 'Strong \u2713'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showConfirm ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    style={{ ...inp, paddingRight: 54, borderColor: confirm.length > 0 ? (confirm === password ? '#4A7C59' : '#C0392B') : '#EAD9BE' }} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={eyeBtn}>{showConfirm ? 'Hide' : 'Show'}</button>
                </div>
                {confirm.length > 0 && (
                  <div style={{ fontSize: 11.5, marginTop: 5, fontWeight: 600, color: confirm === password ? '#4A7C59' : '#C0392B' }}>
                    {confirm === password ? '\u2713 Passwords match' : '\u2717 Passwords do not match'}
                  </div>
                )}
              </div>
            </div>

            <div style={{ margin: '4px 0 16px', display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FBF6EF', border: '1px solid #F0E4D6', borderRadius: 10, padding: '10px 12px' }}>
              <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#6B2D4E', width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
              <label htmlFor="terms" style={{ fontSize: 12, color: '#3A2F1F', lineHeight: 1.6, cursor: 'pointer' }}>
                I agree to UNIMUNITY&apos;s <a href="#" style={{ color: '#6B2D4E', fontWeight: 700 }}>Terms &amp; Conditions</a> and <a href="#" style={{ color: '#6B2D4E', fontWeight: 700 }}>Privacy Policy</a>. I understand that my data is protected and isolated from other groups.
              </label>
            </div>

            <div className="rg-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button type="submit" disabled={loading} className="rg-btn"
                style={{ padding: 11, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 14.5, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
                {loading ? 'Creating...' : 'Create My Account'}
              </button>
              <button type="button" onClick={handleGoogle} className="rg-btn"
                style={{ padding: 10, background: '#FFFFFF', border: '1.5px solid #EAD9BE', borderRadius: 12, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#3A2F1F', fontWeight: 700 }}>
                <GoogleIcon />
                Continue with Google
              </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: 13, color: '#8A7B6C' }}>
            Already have an account? <a href="/login" style={{ color: '#6B2D4E', fontWeight: 800, textDecoration: 'none' }}>Sign In</a>
          </p>
        </div>

        <div className="rg-card" style={{ padding: 22 }}>
          <div style={{ textAlign: 'center', margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '18px 18px 0 0', borderBottom: '1px solid #F0E4D6' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>Why UNIMUNITY</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>Your Community. Your Power.</p>
          </div>
          {[
            { ico: '\u{1F510}', t: 'Secure account with 2FA', d: 'Email verification and a code on every sign-in.' },
            { ico: '\u{1F465}', t: 'Built for tontines & sols', d: 'Members, payment grid, cycles and reminders in one place.' },
            { ico: '\u{1F4CA}', t: 'Full transparency', d: 'Digital register, reports and audit log.' },
            { ico: '\u{1F30D}', t: 'Your language', d: 'English, Fran\u00e7ais, Krey\u00f2l, Espa\u00f1ol, Portugu\u00eas and more.' },
          ].map(b => (
            <div key={b.t} style={{ display: 'flex', gap: 10, padding: '8px 2px', borderBottom: '1px dashed #F3E6D8' }}>
              <span style={{ fontSize: 16, lineHeight: '20px' }}>{b.ico}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#4A1F38' }}>{b.t}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#8A7B6C', lineHeight: 1.5 }}>{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#FBEEDD', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 860px) { .rg-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .rg-two { grid-template-columns: 1fr !important; } }
        .rg-card { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 18px; box-shadow: 0 2px 14px rgba(107,45,78,0.06); }
        .rg-card input:focus, .rg-card select:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .rg-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .rg-btn:not(:disabled):hover { filter: brightness(1.05); transform: translateY(-1px); }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer { 0% { background-position: 0% center; } 100% { background-position: -200% center; } }
      `}</style>
      <div style={{ flex: 1 }}>
        <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
          <a href="/" style={{ justifySelf: 'start', display: 'block' }}><img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block' }} /></a>
          <div style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
            <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Create Account</h1>
            <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>{subtitle}</p>
          </div>
          <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
        </div>
        <div style={{ maxWidth: 1220, margin: '0 auto', padding: '20px 24px' }}>
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
