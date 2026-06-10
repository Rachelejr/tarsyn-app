'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function LoginPage() {
  const [step, setStep]           = useState<'login'|'2fa'>('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [code, setCode]           = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const redirectByRole = async (uid: string) => {
    const snap = await getDoc(doc(db, 'users', uid));
    const role = snap.data()?.role;
    if (role === 'superadmin' || role === 'organizer') {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/member';
    }
  };

  const generate2FACode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const sendCode = async (toEmail: string, otp: string) => {
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: toEmail, code: otp }),
      });
      if (!res.ok) throw new Error('Failed to send');
    } catch (e) {
      console.error('Send error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
        setError('Please verify your email first. A new verification email has been sent.');
        setLoading(false);
        return;
      }
      const otp = generate2FACode();
      setGeneratedCode(otp);
      await sendCode(email, otp);
      setStep('2fa');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        setCode('');
        return;
      }
      await redirectByRole(auth.currentUser!.uid);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const otp = generate2FACode();
    setGeneratedCode(otp);
    await sendCode(email, otp);
    setResendMsg('New code sent to your email!');
    setTimeout(() => setResendMsg(''), 4000);
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await redirectByRole(result.user.uid);
    } catch {
      setError('Google error. Please try again.');
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #D9C0CC', borderRadius: '10px',
    fontSize: '15px', background: '#FAF0E6',
    outline: 'none', color: '#2C1A24', boxSizing: 'border-box',
  };

  if (step === '2fa') {
    return (
      <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',flexDirection:'column'}}>
        <Nav/>
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
          <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
            <div style={{textAlign:'center',marginBottom:'28px'}}>
              <div style={{fontSize:'48px',marginBottom:'12px'}}></div>
              <h2 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'700',marginBottom:'8px'}}>Check your email!</h2>
              <p style={{color:'#7A5068',fontSize:'14px',lineHeight:'1.6'}}>
                {sending ? ' Sending code...' : 'A 6-digit code was sent to'}<br/>
                <strong style={{color:'#6B2D4E'}}>{email}</strong>
              </p>
            </div>
            {error && (
              <div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
                 {error}
              </div>
            )}
            {resendMsg && (
              <div style={{background:'#d4edda',border:'1px solid #c3e6cb',color:'#155724',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
                 {resendMsg}
              </div>
            )}
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'12px',textAlign:'center'}}>
                Enter your 6-digit code
              </label>
              <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                {[...Array(6)].map((_, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength={1}
                    value={code[i] || ''}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      const arr = code.split('');
                      arr[i] = val;
                      const newCode = arr.join('').slice(0, 6);
                      setCode(newCode);
                      if (val && i < 5) {
                        document.getElementById(`otp-${i+1}`)?.focus();
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !code[i] && i > 0) {
                        document.getElementById(`otp-${i-1}`)?.focus();
                        const arr = code.split('');
                        arr[i-1] = '';
                        setCode(arr.join(''));
                      }
                    }}
                    style={{
                      width:'48px', height:'56px',
                      border:`2px solid ${code[i]?'#6B2D4E':'#D9C0CC'}`,
                      borderRadius:'10px', fontSize:'22px',
                      fontWeight:'700', textAlign:'center',
                      background:code[i]?'#EDD9E5':'#FAF0E6',
                      color:'#6B2D4E', outline:'none',
                      transition:'all 0.2s',
                    }}
                  />
                ))}
              </div>
            </div>
            <button onClick={handleVerify2FA} disabled={code.length !== 6}
              style={{width:'100%',padding:'14px',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'14px',opacity:code.length!==6?0.6:1}}>
               Verify & Sign In
            </button>
            <div style={{textAlign:'center',display:'flex',flexDirection:'column',gap:'10px'}}>
              <button onClick={handleResend} disabled={sending}
                style={{background:'none',border:'none',color:'#C4748E',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>
                 Resend code
              </button>
              <button onClick={()=>{setStep('login');setCode('');setError('');}}
                style={{background:'none',border:'none',color:'#7A5068',fontSize:'13px',cursor:'pointer'}}>
                 Back to login
              </button>
            </div>
          </div>
        </div>
        <Footer/>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',flexDirection:'column'}}>
      <Nav/>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#D4AF7A'}}></div>
            <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'700',marginBottom:'6px'}}>Welcome Back</h1>
            <p style={{color:'#7A5068',fontSize:'14px'}}>Sign in to your <strong style={{color:'#D4AF7A'}}>TARSYN</strong> account</p>
          </div>
          <div style={{background:'#EDD9E5',borderRadius:'10px',padding:'10px 14px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#6B2D4E'}}>
            <span style={{fontSize:'20px'}}></span>
            <div>
              <div style={{fontWeight:'700'}}>2-Factor Authentication enabled</div>
              <div style={{fontSize:'11px',color:'#7A5068'}}>A verification code will be sent to your email</div>
            </div>
          </div>
          {error && (
            <div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
               {error}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:'18px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Email Address</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/>
            </div>
            <div style={{marginBottom:'8px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Password</label>
              <div style={{position:'relative'}}>
                <input type={showPass?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="" style={{...inp,paddingRight:'44px'}}/>
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{position:'absolute',right:'14px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:'#7A5068'}}>
                  {showPass?'':''}
                </button>
              </div>
            </div>
            <div style={{textAlign:'right',marginBottom:'24px'}}>
              <a href="/forgot-password" style={{fontSize:'12px',color:'#C4748E',textDecoration:'none'}}>Forgot password?</a>
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'14px',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'14px',opacity:loading?0.7:1}}>
              {loading ? ' Signing in...' : ' Sign In & Get Code'}
            </button>
          </form>
          <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'4px 0 14px',color:'#7A5068',fontSize:'12px'}}>
            <div style={{flex:1,height:'1px',background:'#EDD9E5'}}></div>or continue with<div style={{flex:1,height:'1px',background:'#EDD9E5'}}></div>
          </div>
          <button onClick={handleGoogle}
            style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #D9C0CC',borderRadius:'10px',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',color:'#2C1A24',fontWeight:'500'}}>
            <GoogleIcon/>
            Continue with Google
          </button>
          <p style={{textAlign:'center',marginTop:'28px',fontSize:'13px',color:'#7A5068'}}>
            No account? <a href="/register" style={{color:'#C4748E',fontWeight:'700',textDecoration:'none'}}>Create one free</a>
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
      <div style={{width:'38px',height:'38px',background:'#D4AF7A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',color:'#6B2D4E'}}></div>
      <div>
        <div style={{color:'white',fontSize:'20px',fontWeight:'700',letterSpacing:'3px'}}>TARSYN</div>
        <div style={{color:'#D4AF7A',fontSize:'9px',letterSpacing:'3px'}}>YOUR COMMUNITY. YOUR POWER.</div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{background:'#6B2D4E',textAlign:'center',padding:'14px',color:'rgba(250,240,230,0.6)',fontSize:'12px'}}>
      <span style={{color:'#D4AF7A'}}>TARSYN</span>   2026 Your Community. Your Power.
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
