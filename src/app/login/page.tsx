'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  const handleLogin=async(e:React.FormEvent)=>{
    e.preventDefault();
    setLoading(true);
    setError('');
    try{
      await signInWithEmailAndPassword(auth,email,password);
      window.location.href='/dashboard';
    }catch{
      setError('Invalid email or password.');
    }finally{setLoading(false);}
  };

  const handleGoogle=async()=>{
    try{
      const provider=new GoogleAuthProvider();
      await signInWithPopup(auth,provider);
      window.location.href='/dashboard';
    }catch{setError('Google error. Please try again.');}
  };

  const inp:React.CSSProperties={width:'100%',padding:'13px 16px',border:'1.5px solid #D9C0CC',borderRadius:'10px',fontSize:'15px',background:'#FAF0E6',outline:'none',color:'#2C1A24'};

  return(
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',flexDirection:'column'}}>
      <nav style={{background:'#6B2D4E',padding:'16px 32px',display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{width:'38px',height:'38px',background:'#D4AF7A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>✦</div>
        <div>
          <div style={{color:'white',fontSize:'20px',fontWeight:'700',letterSpacing:'3px'}}>TARSYN</div>
          <div style={{color:'#D4AF7A',fontSize:'9px',letterSpacing:'3px'}}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
      </nav>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(107,45,78,0.10)'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px'}}>✦</div>
            <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'700',marginBottom:'6px'}}>Welcome Back</h1>
            <p style={{color:'#7A5068',fontSize:'14px'}}>Sign in to your <strong style={{color:'#D4AF7A'}}>TARSYN</strong> account</p>
          </div>
          {error&&<div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>⚠️ {error}</div>}
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:'18px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Email Address</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={inp}/>
            </div>
            <div style={{marginBottom:'8px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#2C1A24',marginBottom:'7px'}}>Password</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={inp}/>
            </div>
            <div style={{textAlign:'right',marginBottom:'24px'}}>
              <a href="#" style={{fontSize:'12px',color:'#C4748E',textDecoration:'none'}}>Forgot password?</a>
            </div>
            <button type="submit" disabled={loading} style={{width:'100%',padding:'14px',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'14px',opacity:loading?0.7:1}}>
              {loading?'Signing in...':'Sign In'}
            </button>
          </form>
          <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'4px 0 14px',color:'#7A5068',fontSize:'12px'}}>
            <div style={{flex:1,height:'1px',background:'#EDD9E5'}}></div>or continue with<div style={{flex:1,height:'1px',background:'#EDD9E5'}}></div>
          </div>
          <button onClick={handleGoogle} style={{width:'100%',padding:'13px',background:'white',border:'1.5px solid #D9C0CC',borderRadius:'10px',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',color:'#2C1A24',fontWeight:'500'}}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
          <p style={{textAlign:'center',marginTop:'28px',fontSize:'13px',color:'#7A5068'}}>
            No account? <a href="/register" style={{color:'#C4748E',fontWeight:'700',textDecoration:'none'}}>Create one free</a>
          </p>
        </div>
      </div>
      <footer style={{background:'#6B2D4E',textAlign:'center',padding:'14px',color:'rgba(250,240,230,0.6)',fontSize:'12px'}}>
        <span style={{color:'#D4AF7A'}}>TARSYN</span> — © 2026 Your Community. Your Power.
      </footer>
    </div>
  );
}