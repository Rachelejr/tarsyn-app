'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';

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
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #D9C0CC', borderRadius: '10px',
    fontSize: '15px', background: '#FBEEDD',
    outline: 'none', color: '#4A1F38', boxSizing: 'border-box',
  };
  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: '14px', top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6B2D4E', padding: '0',
  };

  // ── ÉTAPE VÉRIFICATION EMAIL ───────────────────────────────
  if (step === 'verify') {
    return (
      <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
        <Nav/>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
          <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)',textAlign:'center'}}>
            <div style={{fontSize:'64px',marginBottom:'16px'}}>📧</div>
            <h2 style={{color:'#6B2D4E',fontSize:'26px',fontWeight:'700',marginBottom:'12px'}}>Check your email!</h2>
            <p style={{color:'#6B2D4E',fontSize:'14px',lineHeight:'1.7',marginBottom:'20px'}}>
              We sent a verification link to<br/>
              <strong style={{color:'#6B2D4E'}}>{email}</strong><br/>
              Click the link in the email to activate your account.
            </p>
            <div style={{background:'#EAD9BE',borderRadius:'12px',padding:'16px',marginBottom:'24px',fontSize:'13px',color:'#6B2D4E',textAlign:'left'}}>
              <div style={{fontWeight:'700',marginBottom:'8px'}}>📋 Next steps:</div>
              <div style={{lineHeight:'1.8'}}>
                1. Open your email inbox<br/>
                2. Click the verification link from TARSYN<br/>
                3. Come back and sign in<br/>
                4. You'll receive a 2FA code for extra security
              </div>
            </div>
            <a href="/login" style={{display:'block',padding:'14px',background:'#6B2D4E',color:'#FBEEDD',borderRadius:'10px',fontSize:'15px',fontWeight:'700',textDecoration:'none',marginBottom:'12px'}}>
              Go to Sign In
            </a>
            <button onClick={async()=>{
              try {
                const user = auth.currentUser;
                if(user) await sendEmailVerification(user);
                alert('✅ New verification email sent!');
              } catch { alert('Error sending email.'); }
            }} style={{background:'none',border:'none',color:'#8B3A5E',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>
              🔄 Resend verification email
            </button>
          </div>
        </div>
        <Footer/>
      </div>
    );
  }

  // ── ÉTAPE REGISTER ─────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
      <Nav/>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#E9C77B'}}>✦</div>
            <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'700',marginBottom:'6px'}}>Create Account</h1>
            <p style={{color:'#6B2D4E',fontSize:'14px'}}>Join your <strong style={{color:'#E9C77B'}}>TARSYN</strong> community</p>
          </div>

          {/* Badge sécurité */}
          <div style={{background:'#EAD9BE',borderRadius:'10px',padding:'10px 14px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#6B2D4E'}}>
            <span style={{fontSize:'20px'}}>🔐</span>
            <div>
              <div style={{fontWeight:'700'}}>Secure account with 2FA</div>
              <div style={{fontSize:'11px',color:'#6B2D4E'}}>Email verification + 2-factor auth on every login</div>
            </div>
          </div>

          {error && (
            <div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            {/* Full Name */}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Full Name</label>
              <input type="text" required value={name} onChange={e=>setName(e.target.value)} placeholder="Marie Jean" style={inp}/>
            </div>

            {/* Email */}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Email Address</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/>
            </div>

            {/* Country */}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Country</label>
              <select required value={pays} onChange={e=>setPays(e.target.value)} style={{...inp,cursor:'pointer'}}>
                <option value="">— Select your country —</option>
                {PAYS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Language */}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Preferred Language</label>
              <select required value={langue} onChange={e=>setLangue(e.target.value)} style={{...inp,cursor:'pointer'}}>
                <option value="">— Select a language —</option>
                {LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Password */}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>
                Password <span style={{color:'#6B2D4E',fontWeight:'400',fontSize:'12px'}}>(8 characters minimum)</span>
              </label>
              <div style={{position:'relative'}}>
                <input type={showPass?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="8 characters minimum" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)} style={eyeBtn}>{showPass?'🙈':'👁️'}</button>
              </div>
              {password.length > 0 && (
                <div style={{marginTop:'6px',display:'flex',alignItems:'center',gap:'4px'}}>
                  {[...Array(4)].map((_,i)=>(
                    <div key={i} style={{flex:1,height:'4px',borderRadius:'2px',background:password.length>=(i+1)*2?password.length>=8?'#4A7C59':'#E9C77B':'#EAD9BE',transition:'background 0.3s'}}></div>
                  ))}
                  <span style={{fontSize:'11px',color:password.length>=8?'#4A7C59':'#E9C77B',marginLeft:'6px',whiteSpace:'nowrap'}}>
                    {password.length<4?'Too short':password.length<6?'Weak':password.length<8?'Almost...':'Strong ✓'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Confirm Password</label>
              <div style={{position:'relative'}}>
                <input type={showConfirm?'text':'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••"
                  style={{...inp,paddingRight:'44px',borderColor:confirm.length>0?(confirm===password?'#4A7C59':'#C0392B'):'#D9C0CC'}}/>
                <button type="button" onClick={()=>setShowConfirm(!showConfirm)} style={eyeBtn}>{showConfirm?'🙈':'👁️'}</button>
              </div>
              {confirm.length > 0 && (
                <div style={{fontSize:'12px',marginTop:'5px',color:confirm===password?'#4A7C59':'#C0392B'}}>
                  {confirm===password?'✓ Passwords match':'✗ Passwords do not match'}
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            <div style={{marginBottom:'24px',display:'flex',alignItems:'flex-start',gap:'10px'}}>
              <input type="checkbox" id="terms" checked={agreed} onChange={e=>setAgreed(e.target.checked)}
                style={{marginTop:'2px',accentColor:'#6B2D4E',width:'16px',height:'16px',cursor:'pointer'}}/>
              <label htmlFor="terms" style={{fontSize:'12px',color:'#6B2D4E',lineHeight:'1.6',cursor:'pointer'}}>
                I agree to TARSYN's <a href="#" style={{color:'#8B3A5E',fontWeight:'600'}}>Terms & Conditions</a> and <a href="#" style={{color:'#8B3A5E',fontWeight:'600'}}>Privacy Policy</a>. I understand that my data is protected and isolated from other groups.
              </label>
            </div>

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'14px',background:'#6B2D4E',color:'#FBEEDD',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'14px',opacity:loading?0.7:1}}>
              {loading ? '⏳ Creating...' : '✦ Create My Account'}
            </button>
          </form>

          <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'4px 0 14px',color:'#6B2D4E',fontSize:'12px'}}>
            <div style={{flex:1,height:'1px',background:'#EAD9BE'}}></div>or continue with<div style={{flex:1,height:'1px',background:'#EAD9BE'}}></div>
          </div>

          <button onClick={handleGoogle}
            style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #D9C0CC',borderRadius:'10px',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',color:'#4A1F38',fontWeight:'500'}}>
            <GoogleIcon/>
            Continue with Google
          </button>

          <p style={{textAlign:'center',marginTop:'28px',fontSize:'13px',color:'#6B2D4E'}}>
            Already have an account? <a href="/login" style={{color:'#8B3A5E',fontWeight:'700',textDecoration:'none'}}>Sign In</a>
          </p>
        </div>
      </div>
      <Footer/>
    </div>
  );
}

function Nav() {
  return (
    <nav style={{background:'#6B2D4E',padding:'16px 32px',display:'flex',alignItems:'center',gap:'12px'}}>
      <div style={{width:'38px',height:'38px',background:'#E9C77B',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',color:'#6B2D4E'}}>✦</div>
      <div>
        <div style={{color:'white',fontSize:'20px',fontWeight:'700',letterSpacing:'3px'}}>TARSYN</div>
        <div style={{color:'#E9C77B',fontSize:'9px',letterSpacing:'3px'}}>YOUR COMMUNITY. YOUR POWER.</div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{background:'#6B2D4E',textAlign:'center',padding:'14px',color:'rgba(251,238,221,0.6)',fontSize:'12px'}}>
      <span style={{color:'#E9C77B'}}>TARSYN</span> — © 2026 Your Community. Your Power.
    </footer>
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
