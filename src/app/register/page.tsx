'use client';
import { useState } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #D9C0CC', borderRadius: '10px',
    fontSize: '15px', background: '#FAF0E6',
    outline: 'none', color: '#2C1A24', boxSizing: 'border-box',
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        name, email, role: 'admin', createdAt: new Date().toISOString(),
      });
      // Redirect to dashboard where admin creates their group
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('email-already-in-use')) {
          setError('This email is already registered.');
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, 'users', result.user.uid), {
        name: result.user.displayName || '',
        email: result.user.email || '',
        role: 'admin',
        createdAt: new Date().toISOString(),
      }, { merge: true });
      // Redirect to dashboard where admin creates their group
      window.location.href = '/dashboard';
    } catch {
      setError('Google sign-up failed. Please try again.');
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',flexDirection:'column'}}>
      <Nav/>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#D4AF7A',fontWeight:'700'}}>T</div>
            <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'700',marginBottom:'6px'}}>Create Account</h1>
            <p style={{color:'#7A5068',fontSize:'14px'}}>Join the <strong style={{color:'#D4AF7A'}}>TARSYN</strong> community</p>
          </div>

          {error && (
            <div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Full Name</label>
              <input type="text" required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Email Address</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Password</label>
              <div style={{position:'relative'}}>
                <input type={showPass?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 characters" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:'#7A5068',fontWeight:'600'}}>
                  {showPass?'Hide':'Show'}
                </button>
              </div>
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Confirm Password</label>
              <div style={{position:'relative'}}>
                <input type={showConfirm?'text':'password'} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowConfirm(!showConfirm)}
                  style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'14px',color:'#7A5068',fontWeight:'600'}}>
                  {showConfirm?'Hide':'Show'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'14px',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'14px',opacity:loading?0.7:1}}>
              {loading ? 'Creating account...' : 'Create Free Account'}
            </button>
          </form>

          <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'4px 0 14px',color:'#7A5068',fontSize:'12px'}}>
            <div style={{flex:1,height:'1px',background:'#EDD9E5'}}></div>
            or continue with
            <div style={{flex:1,height:'1px',background:'#EDD9E5'}}></div>
          </div>

          <button onClick={handleGoogle}
            style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #D9C0CC',borderRadius:'10px',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',color:'#2C1A24',fontWeight:'500'}}>
            <GoogleIcon/>
            Continue with Google
          </button>

          <p style={{textAlign:'center',marginTop:'28px',fontSize:'13px',color:'#7A5068'}}>
            Already have an account? <a href="/login" style={{color:'#C4748E',fontWeight:'700',textDecoration:'none'}}>Sign in</a>
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
      <a href="/" style={{display:'flex',alignItems:'center',gap:'12px',textDecoration:'none'}}>
        <div style={{width:'38px',height:'38px',background:'#D4AF7A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700',color:'#6B2D4E'}}>T</div>
        <div>
          <div style={{color:'white',fontSize:'20px',fontWeight:'700',letterSpacing:'3px'}}>TARSYN</div>
          <div style={{color:'#D4AF7A',fontSize:'9px',letterSpacing:'3px'}}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
      </a>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{background:'#6B2D4E',textAlign:'center',padding:'14px',color:'rgba(250,240,230,0.6)',fontSize:'12px'}}>
      <span style={{color:'#D4AF7A'}}>TARSYN</span> — 2026 Your Community. Your Power.
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
