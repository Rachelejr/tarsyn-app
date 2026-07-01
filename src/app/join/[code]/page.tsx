'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

export default function JoinPage() {
  const params = useParams();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<'profile' | 'signin' | 'done'>('profile');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!code) { setNotFound(true); setLoading(false); return; }
        const codeStr = String(code).trim().toUpperCase();
        const q = query(collection(db, 'members'), where('inviteCode', '==', codeStr));
        const snap = await getDocs(q);
        if (snap.empty) { setNotFound(true); setLoading(false); return; }
        const memberData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        setMember(memberData);
        setFullName(memberData.name || '');
        setEmail(memberData.email || '');
        if (memberData.groupId) {
          const gDoc = await getDoc(doc(db, 'groups', memberData.groupId));
          if (gDoc.exists()) setGroup({ id: gDoc.id, ...gDoc.data() });
        }
      } catch (e: any) {
        setDebugInfo('Error: ' + (e?.code || '') + ' ' + (e?.message || String(e)));
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
  }, [code]);

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setRegistering(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: fullName.trim() });
      await updateDoc(doc(db, 'members', member.id), {
        userId: result.user.uid,
        name: fullName.trim(),
        email: email.trim(),
        status: 'active',
      });
      setStep('done');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setStep('signin');
      } else {
        const msgs: any = {
          'auth/invalid-email': 'Invalid email address.',
          'auth/weak-password': 'Password is too weak.',
        };
        setError(msgs[err.code] || 'Error: ' + err.code);
      }
    }
    setRegistering(false);
  };

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setRegistering(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await updateDoc(doc(db, 'members', member.id), {
        userId: result.user.uid,
        status: 'active',
      });
      setStep('done');
    } catch (err: any) {
      const msgs: any = {
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setError(msgs[err.code] || 'Error: ' + err.code);
    }
    setRegistering(false);
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid #E8D5E0', borderRadius: '10px',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', color: '#6B2D4E',
    fontSize: '13px', fontWeight: 600, marginBottom: '6px',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B2D4E', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  if (notFound || !member) return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ color: '#6B2D4E', fontSize: '22px', fontWeight: 800, margin: 0 }}>Invitation not found</h2>
      <p style={{ color: '#7A5068', fontSize: '14px', margin: 0 }}>This link may be invalid or expired.</p>
      <p style={{ color: '#C62828', fontSize: '12px', margin: 0, fontFamily: 'monospace' }}>{debugInfo}</p>
      <button onClick={() => router.push('/')} style={{ background: '#6B2D4E', color: '#FAF0E6', padding: '12px 24px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Go Home</button>
    </div>
  );

  if (step === 'done') return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'white', borderRadius: '24px', padding: '48px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>
        <h2 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>Welcome!</h2>
        <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 24px' }}>
          You have joined <strong style={{ color: '#6B2D4E' }}>{group?.name || 'TARSYN'}</strong> successfully!
        </p>
        <button onClick={() => router.push('/member')}
          style={{ width: '100%', background: '#6B2D4E', color: '#FAF0E6', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
          Go to My Portal
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#6B2D4E', padding: '16px 24px' }}>
        <div style={{ color: '#D4AF7A', fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 16px 40px' }}>

        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)', textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#6B2D4E', fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>Welcome, {member.name}!</h1>
          <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 20px' }}>
            You are invited to join <strong style={{ color: '#6B2D4E' }}>{group?.name || 'your group'}</strong>
          </p>
          <div style={{ background: '#FAF0E6', borderRadius: '16px', padding: '16px', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'TYN-ID', value: member.tynId, mono: true },
                { label: 'Position', value: '#' + member.position },
                { label: 'Status', value: member.status || 'pending' },
                { label: 'Payout Date', value: member.payoutDate || 'Not set' },
                { label: 'Country', value: member.country },
                { label: 'Member Type', value: member.memberType },
              ].map(item => (
                <div key={item.label} style={{ background: 'white', borderRadius: '10px', padding: '10px' }}>
                  <p style={{ color: '#7A5068', fontSize: '11px', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</p>
                  <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '13px', margin: 0, fontFamily: (item as any).mono ? 'monospace' : 'inherit' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)' }}>

          {step === 'signin' ? (
            <>
              <h2 style={{ color: '#6B2D4E', fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Sign In to Join</h2>
              <p style={{ color: '#7A5068', fontSize: '13px', margin: '0 0 20px' }}>
                You already have a TARSYN account. Sign in to join <strong>{group?.name}</strong>.
              </p>

              {error && <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inp} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={lbl}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'} placeholder="Your TARSYN password"
                    style={{ ...inp, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button onClick={handleSignIn} disabled={registering}
                style={{ width: '100%', background: registering ? '#9B6B8E' : '#6B2D4E', color: '#FAF0E6', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 700, cursor: registering ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
                {registering ? 'Signing in...' : 'Sign In & Join Group'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#7A5068', margin: 0 }}>
                <span onClick={() => { setStep('profile'); setError(''); }} style={{ color: '#6B2D4E', fontWeight: 700, cursor: 'pointer' }}>
                  Back to registration
                </span>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ color: '#6B2D4E', fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Create Your Account</h2>
              <p style={{ color: '#7A5068', fontSize: '13px', margin: '0 0 20px' }}>Set up your account to access your member portal.</p>

              {error && <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" style={inp} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com" style={inp} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters"
                    style={{ ...inp, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={lbl}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    type={showConfirm ? 'text' : 'password'} placeholder="Repeat password"
                    style={{ ...inp, paddingRight: '44px', borderColor: confirmPassword && password !== confirmPassword ? '#E53935' : '#E8D5E0' }} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px' }}>
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ color: '#E53935', fontSize: '12px', margin: '4px 0 0' }}>Passwords do not match</p>
                )}
              </div>

              <button onClick={handleRegister} disabled={registering}
                style={{ width: '100%', background: registering ? '#9B6B8E' : '#6B2D4E', color: '#FAF0E6', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 700, cursor: registering ? 'not-allowed' : 'pointer', marginBottom: '12px' }}>
                {registering ? 'Creating account...' : 'Create My Account'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#7A5068', margin: 0 }}>
                Already have an account?{' '}
                <span onClick={() => { setStep('signin'); setError(''); }} style={{ color: '#6B2D4E', fontWeight: 700, cursor: 'pointer' }}>
                  Sign In
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}