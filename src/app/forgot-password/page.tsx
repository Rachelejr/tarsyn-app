'use client';
import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      const msgs: any = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/invalid-email':  'Invalid email address.',
      };
      setError(msgs[err.code] || 'Error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #F0D5DF', borderRadius: '10px',
    fontSize: '15px', background: '#FBEEDD',
    outline: 'none', color: '#8F3A5A', boxSizing: 'border-box',
  };

  return (
    <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',flexDirection:'column'}}>
      <nav style={{background:'#B24C72',padding:'16px 32px',display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{width:'38px',height:'38px',background:'#E9C77B',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',color:'#B24C72'}}>✦</div>
        <div>
          <div style={{color:'white',fontSize:'20px',fontWeight:'700',letterSpacing:'3px'}}>TARSYN</div>
          <div style={{color:'#E9C77B',fontSize:'9px',letterSpacing:'3px'}}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
      </nav>

      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 16px'}}>
        <div style={{background:'white',border:'1px solid #F0D5DF',borderRadius:'20px',padding:'52px 44px',width:'100%',maxWidth:'440px',boxShadow:'0 8px 40px rgba(178,76,114,0.10)'}}>

          {sent ? (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'64px',marginBottom:'16px'}}>📧</div>
              <h2 style={{color:'#B24C72',fontSize:'24px',fontWeight:'700',marginBottom:'12px'}}>Check your email!</h2>
              <p style={{color:'#B24C72',fontSize:'14px',lineHeight:'1.7',marginBottom:'24px'}}>
                We sent a password reset link to<br/>
                <strong style={{color:'#B24C72'}}>{email}</strong><br/>
                Click the link to reset your password.
              </p>
              <div style={{background:'#EAD9BE',borderRadius:'12px',padding:'16px',marginBottom:'24px',fontSize:'13px',color:'#B24C72',textAlign:'left'}}>
                <div style={{fontWeight:'700',marginBottom:'8px'}}>📋 Next steps:</div>
                <div style={{lineHeight:'1.8'}}>
                  1. Open your email inbox<br/>
                  2. Click the reset link from TARSYN<br/>
                  3. Create a new password<br/>
                  4. Come back and sign in
                </div>
              </div>
              <a href="/login" style={{display:'block',padding:'14px',background:'#B24C72',color:'#FBEEDD',borderRadius:'10px',fontSize:'15px',fontWeight:'700',textDecoration:'none',marginBottom:'12px'}}>
                Back to Sign In
              </a>
              <button onClick={async()=>{
                try {
                  await sendPasswordResetEmail(auth, email);
                  alert('✅ New reset email sent!');
                } catch { alert('Error sending email.'); }
              }} style={{background:'none',border:'none',color:'#A13F63',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>
                🔄 Resend reset email
              </button>
            </div>
          ) : (
            <>
              <div style={{textAlign:'center',marginBottom:'32px'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>🔑</div>
                <h1 style={{color:'#B24C72',fontSize:'26px',fontWeight:'700',marginBottom:'8px'}}>Forgot Password?</h1>
                <p style={{color:'#B24C72',fontSize:'14px',lineHeight:'1.6'}}>
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div style={{background:'#fdecea',border:'1px solid #f5c6cb',color:'#C0392B',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'20px'}}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleReset}>
                <div style={{marginBottom:'20px'}}>
                  <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#8F3A5A',marginBottom:'7px'}}>Email Address</label>
                  <input
                    type="email" required
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={inp}
                  />
                </div>
                <button type="submit" disabled={loading}
                  style={{width:'100%',padding:'14px',background:'#B24C72',color:'#FBEEDD',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer',marginBottom:'16px',opacity:loading?0.7:1}}>
                  {loading ? '⏳ Sending...' : '📧 Send Reset Link'}
                </button>
              </form>

              <a href="/login" style={{display:'block',textAlign:'center',color:'#B24C72',fontSize:'13px',textDecoration:'none'}}>
                ← Back to Sign In
              </a>
            </>
          )}
        </div>
      </div>

      <footer style={{background:'#B24C72',textAlign:'center',padding:'14px',color:'rgba(251,238,221,0.6)',fontSize:'12px'}}>
        <span style={{color:'#E9C77B'}}>TARSYN</span> — © 2026 Your Community. Your Power.
      </footer>
    </div>
  );
}