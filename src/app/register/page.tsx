'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #D9C0CC', borderRadius: '10px',
    fontSize: '15px', background: '#FBEEDD',
    outline: 'none', color: '#4A1F38', boxSizing: 'border-box',
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (name.trim().length < 2) { setError('Please enter your full name.'); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name.trim() });
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      await setDoc(doc(db, 'users', result.user.uid), {
        name: name.trim(),
        email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
      });
      setSuccess(true);
      setTimeout(() => { window.location.href = '/dashboard/create-workspace'; }, 1800);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);
      await setDoc(doc(db, 'users', result.user.uid), {
        name: result.user.displayName || '',
        email: result.user.email || '',
        role: 'admin',
        createdAt: new Date().toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
      }, { merge: true });
      window.location.href = '/dashboard/create-workspace';
    } catch {
      setError('Google sign-up failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
        <Nav/>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
          <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',textAlign:'center',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
            <div style={{fontSize:'64px',marginBottom:'16px'}}>🎉</div>
            <h2 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'700',marginBottom:'12px'}}>Account Created!</h2>
            <p style={{color:'#6B2D4E',fontSize:'14px',lineHeight:'1.6',marginBottom:'24px'}}>
              Welcome to TARSYN, <strong style={{color:'#6B2D4E'}}>{name}</strong>!<br/>
              Setting up your workspace...
            </p>
            <div style={{display:'flex',justifyContent:'center'}}>
              <div style={{width:'28px',height:'28px',border:'3px solid #EAD9BE',borderTopColor:'#6B2D4E',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <a href="/dashboard/create-workspace" style={{display:'block',marginTop:'20px',fontSize:'13px',color:'#8B3A5E',textDecoration:'underline'}}>
              Continue now →
            </a>
          </div>
        </div>
        <Footer/>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
      <Nav/>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#E9C77B'}}>✦</div>
            <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'700',marginBottom:'6px'}}>Create Account</h1>
            <p style={{color:'#6B2D4E',fontSize:'14px'}}>Join the <strong style={{color:'#E9C77B'}}>TARSYN</strong> community</p>
          </div>

          {error && (
            <div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Full Name *</label>
              <input type="text" required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={inp}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Email Address *</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Password *</label>
              <div style={{position:'relative'}}>
                <input type={showPass?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="********" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'#6B2D4E',fontWeight:600}}>
                  {showPass?'Hide':'Show'}
                </button>
              </div>
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#4A1F38',marginBottom:'7px'}}>Confirm Password *</label>
              <div style={{position:'relative'}}>
                <input type={showConfirm?'text':'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="********" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowConfirm(!showConfirm)}
                  style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'#6B2D4E',fontWeight:600}}>
                  {showConfirm?'Hide':'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'14px',background:'#6B2D4E',color:'#FBEEDD',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'14px',opacity:loading?0.7:1}}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'4px 0 14px',color:'#6B2D4E',fontSize:'12px'}}>
            <div style={{flex:1,height:'1px',background:'#EAD9BE'}}></div>or<div style={{flex:1,height:'1px',background:'#EAD9BE'}}></div>
          </div>

          <button onClick={handleGoogle}
            style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #D9C0CC',borderRadius:'10px',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',color:'#4A1F38',fontWeight:'500'}}>
            <GoogleIcon/>
            Continue with Google
          </button>

          <p style={{textAlign:'center',marginTop:'28px',fontSize:'13px',color:'#6B2D4E'}}>
            Already have an account? <a href="/login" style={{color:'#8B3A5E',fontWeight:'700',textDecoration:'none'}}>Sign in</a>
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
      <div>
        <div style={{color:'white',fontSize:'20px',fontWeight:'700',letterSpacing:'3px',display:'none'}}>TARSYN</div><a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}><img src="/tarsyn-logo-white.svg" alt="Tarsyn" style={{height:'24px'}}/></a>
        <div style={{color:'#E9C77B',fontSize:'9px',letterSpacing:'3px',fontStyle:'italic'}}>YOUR COMMUNITY. YOUR POWER.</div>
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