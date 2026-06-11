'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = async (uid: string, userEmail: string) => {
    const mq = query(collection(db, 'members'), where('email', '==', userEmail));
    const ms = await getDocs(mq);
    const role = ms.empty ? null : ms.docs[0].data()?.role;
    if (role === 'admin' || role === 'superadmin' || role === 'organizer') {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/member';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await redirectByRole(result.user.uid, result.user.email!);
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'Aucun compte trouvé.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-email': 'Email invalide.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      };
      setError(msg[err.code] || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await redirectByRole(result.user.uid, result.user.email!);
    } catch {
      setError('Erreur Google. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

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
        <p style={{color:'#888',margin:'0 0 1.5rem',fontSize:'0.9rem'}}>Accédez à votre espace TARSYN</p>
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
            <button type="button" style={{background:'none',border:'none',color:'#D4AF7A',fontSize:'0.83rem',fontWeight:600,cursor:'pointer'}} onClick={()=>router.push('/forgot-password')}>Mot de passe oublié ?</button>
          </div>
          <button type="submit" disabled={loading} style={{width:'100%',padding:'0.85rem',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'1rem',fontWeight:700,cursor:'pointer',opacity:loading?0.7:1}}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div style={{textAlign:'center',margin:'1.25rem 0',color:'#aaa',fontSize:'0.85rem'}}>ou</div>
        <button onClick={handleGoogle} disabled={loading} style={{width:'100%',padding:'0.85rem',background:'#fff',color:'#333',border:'2px solid #E0D0C0',borderRadius:'10px',fontSize:'1rem',fontWeight:600,cursor:'pointer'}}>
          ?? Continuer avec Google
        </button>
        <div style={{textAlign:'center',margin:'1.25rem 0',color:'#aaa',fontSize:'0.85rem'}}>pas de compte ?</div>
        <button onClick={()=>router.push('/register')} style={{width:'100%',padding:'0.85rem',background:'transparent',color:'#6B2D4E',border:'2px solid #6B2D4E',borderRadius:'10px',fontSize:'1rem',fontWeight:700,cursor:'pointer'}}>
          Créer un compte
        </button>
      </div>
    </div>
  );
}
