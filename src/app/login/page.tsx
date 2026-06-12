'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const redirectByRole = async (uid: string, uEmail: string) => {
    const mq = query(collection(db, 'members'), where('email', '==', uEmail));
    const ms = await getDocs(mq);
    const role = ms.empty ? null : ms.docs[0].data()?.role;
    if (role === 'admin' || role === 'superadmin' || role === 'organizer') {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/member';
    }
  };

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const sendOTP = async (uid: string, uEmail: string) => {
    const otp = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await setDoc(doc(db, 'otp_codes', uid), { otp, expires, email: uEmail });
    await fetch('/api/auth/send-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: uEmail, otp }),
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUserId(result.user.uid);
      setUserEmail(result.user.email!);
      await sendOTP(result.user.uid, result.user.email!);
      setStep('2fa');
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'Aucun compte trouve.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-email': 'Email invalide.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Reessayez plus tard.',
      };
      setError(msg[err.code] || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setError('');
    setLoading(true);
    try {
      const enteredCode = code.join('');
      const otpDoc = await getDoc(doc(db, 'otp_codes', userId));
      if (!otpDoc.exists()) { setError('Code expire. Demandez un nouveau code.'); setLoading(false); return; }
      const { otp, expires } = otpDoc.data();
      if (Date.now() > expires) {
        await deleteDoc(doc(db, 'otp_codes', userId));
        setError('Code expire. Demandez un nouveau code.');
        setLoading(false);
        return;
      }
      if (enteredCode !== otp) { setError('Code incorrect. Reessayez.'); setLoading(false); return; }
      await deleteDoc(doc(db, 'otp_codes', userId));
      await redirectByRole(userId, userEmail);
    } catch {
      setError('Erreur de verification. Reessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    await sendOTP(userId, userEmail);
    setResendMsg('Nouveau code envoye !');
    setTimeout(() => setResendMsg(''), 4000);
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await redirectByRole(result.user.uid, result.user.email!);
    } catch {
      setError('Erreur Google. Reessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '');
    const arr = [...code];
    arr[index] = val;
    setCode(arr);
    if (val && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      if (next) (next as HTMLInputElement).focus();
    }
  };

  if (step === '2fa') {
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#6B2D4E,#4A1F36)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',fontFamily:'Inter,sans-serif'}}>
        <div style={{background:'#FAF0E6',borderRadius:'20px',padding:'2.5rem',width:'100%',maxWidth:'420px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🔐</div>
          <h2 style={{fontSize:'1.5rem',fontWeight:800,color:'#6B2D4E',margin:'0 0 0.5rem'}}>Verifiez votre email !</h2>
          <p style={{color:'#888',fontSize:'0.9rem',margin:'0 0 0.25rem'}}>Un code a 6 chiffres a ete envoye a</p>
          <p style={{color:'#6B2D4E',fontWeight:700,margin:'0 0 1.5rem'}}>{userEmail}</p>
          {error && <div style={{background:'#F8D7DA',color:'#721C24',border:'1px solid #F5C6CB',borderRadius:'8px',padding:'0.75rem',fontSize:'0.88rem',marginBottom:'1rem'}}>{error}</div>}
          {resendMsg && <div style={{background:'#D4EDDA',color:'#155724',borderRadius:'8px',padding:'0.75rem',fontSize:'0.88rem',marginBottom:'1rem'}}>{resendMsg}</div>}
          <label style={{display:'block',fontSize:'0.83rem',fontWeight:600,color:'#555',marginBottom:'0.75rem'}}>Entrez votre code a 6 chiffres</label>
          <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'1.5rem'}}>
            {code.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeChange(i, e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) {
                    const prev = document.getElementById(`otp-${i - 1}`);
                    if (prev) (prev as HTMLInputElement).focus();
                  }
                }}
                style={{width:'46px',height:'56px',textAlign:'center',fontSize:'1.4rem',fontWeight:700,border:'2px solid #E0D0C0',borderRadius:'10px',background:'#fff',color:'#6B2D4E',outline:'none'}}
              />
            ))}
          </div>
          <button
            onClick={handleVerify2FA}
            disabled={loading || code.join('').length !== 6}
            style={{width:'100%',padding:'0.85rem',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'1rem',fontWeight:700,cursor:'pointer',opacity:(loading || code.join('').length !== 6) ? 0.7 : 1,marginBottom:'1rem'}}
          >
            {loading ? 'Verification...' : 'Verifier & Se connecter'}
          </button>
          <button onClick={handleResend} style={{background:'none',border:'none',color:'#D4AF7A',fontWeight:600,cursor:'pointer',fontSize:'0.88rem',marginBottom:'0.5rem',display:'block',width:'100%'}}>
            Renvoyer le code
          </button>
          <button onClick={() => { setStep('login'); setCode(['','','','','','']); setError(''); }} style={{background:'none',border:'none',color:'#888',cursor:'pointer',fontSize:'0.85rem'}}>
            Retour au login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#6B2D4E,#4A1F36)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',fontFamily:'Inter,sans-serif'}}>
      <div style={{background:'#FAF0E6',borderRadius:'20px',padding:'2.5rem',width:'100%',maxWidth:'420px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'2rem'}}>
          <div style={{width:'44px',height:'44px',background:'#6B2D4E',color:'#D4AF7A',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'1.4rem'}}>T</div>
          <div>
            <p style={{margin:0,fontWeight:900,fontSize:'1.1rem',color:'#6B2D4E'}}>TARSYN</p>
            <p style={{margin:0,fontSize:'0.65rem',color:'#888',letterSpacing:'0.1em'}}>YOUR COMMUNITY</p>
          </div>
        </div>
        <h1 style={{fontSize:'1.6rem',fontWeight:800,color:'#6B2D4E',margin:'0 0 0.25rem'}}>Connexion</h1>
        <p style={{color:'#888',margin:'0 0 1.5rem',fontSize:'0.9rem'}}>Accedez a votre espace TARSYN</p>
        {error && <div style={{background:'#F8D7DA',color:'#721C24',border:'1px solid #F5C6CB',borderRadius:'8px',padding:'0.75rem 1rem',fontSize:'0.88rem',marginBottom:'1rem'}}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'1rem'}}>
            <label style={{display:'block',fontSize:'0.83rem',fontWeight:600,color:'#555',marginBottom:'0.4rem'}}>Email</label>
            <input style={{width:'100%',padding:'0.75rem 1rem',border:'1.5px solid #E0D0C0',borderRadius:'10px',fontSize:'0.95rem',background:'#fff',color:'#333',outline:'none',boxSizing:'border-box'}} type="email" placeholder="votre@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={{marginBottom:'1.25rem'}}>
            <label style={{display:'block',fontSize:'0.83rem',fontWeight:600,color:'#555',marginBottom:'0.4rem'}}>Mot de passe</label>
            <input style={{width:'100%',padding:'0.75rem 1rem',border:'1.5px solid #E0D0C0',borderRadius:'10px',fontSize:'0.95rem',background:'#fff',color:'#333',outline:'none',boxSizing:'border-box'}} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <div style={{textAlign:'right',marginBottom:'1.25rem'}}>
            <button type="button" style={{background:'none',border:'none',color:'#D4AF7A',fontSize:'0.83rem',fontWeight:600,cursor:'pointer'}} onClick={()=>router.push('/forgot-password')}>Mot de passe oublie ?</button>
          </div>
          <button type="submit" disabled={loading} style={{width:'100%',padding:'0.85rem',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'1rem',fontWeight:700,cursor:'pointer',opacity:loading?0.7:1}}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div style={{textAlign:'center',margin:'1.25rem 0',color:'#aaa',fontSize:'0.85rem'}}>ou</div>
        <button onClick={handleGoogle} disabled={loading} style={{width:'100%',padding:'0.85rem',background:'#fff',color:'#333',border:'2px solid #E0D0C0',borderRadius:'10px',fontSize:'1rem',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.75rem'}}>
          <svg width="20" height="20" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Continuer avec Google
        </button>
        <div style={{textAlign:'center',margin:'1.25rem 0',color:'#aaa',fontSize:'0.85rem'}}>pas de compte ?</div>
        <button onClick={()=>router.push('/register')} style={{width:'100%',padding:'0.85rem',background:'transparent',color:'#6B2D4E',border:'2px solid #6B2D4E',borderRadius:'10px',fontSize:'1rem',fontWeight:700,cursor:'pointer'}}>
          Creer un compte
        </button>
      </div>
    </div>
  );
}