'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, memberAuth, db, memberDb } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '@/components/Footer';
import DateTimeWeather from '@/components/DateTimeWeather';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  muted: '#6b7280',
  green: '#2E7D32',
  greenBg: '#E8F5E9',
};

export default function LeaveReviewPage() {
  const router = useRouter();
  const [uid, setUid] = useState('');
  // Tracks which of the two separate Firebase apps actually authenticated
  // this person, so the write below goes through the matching Firestore
  // instance — writing through the wrong one carries no valid auth token
  // for that instance and Firestore silently rejects it as unauthenticated.
  const [activeDb, setActiveDb] = useState(db);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState<'organizer' | 'member'>('organizer');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  useEffect(() => {
    // This page is reached from both the organizer dashboard and the member
    // portal, which run on two fully separate Firebase Auth instances. It
    // must accept whichever one is actually signed in, and wait for BOTH to
    // report their state before deciding no one is signed in — checking
    // only one (as before) meant a signed-in member was never recognized
    // here and got bounced straight back to /login, then back to /member.
    let orgUser: any = null;
    let memberUser: any = null;
    let orgChecked = false;
    let memberChecked = false;

    const resolve = () => {
      if (!orgChecked || !memberChecked) return;
      if (orgUser) {
        setActiveDb(db);
        setUid(orgUser.uid);
        setLoading(false);
      } else if (memberUser) {
        setActiveDb(memberDb);
        setIsMember(true);
        setUid(memberUser.uid);
        setLoading(false);
      } else {
        router.push('/login');
      }
    };

    const unsubOrg = onAuthStateChanged(auth, (u) => { orgUser = u; orgChecked = true; resolve(); });
    const unsubMember = onAuthStateChanged(memberAuth, (u) => { memberUser = u; memberChecked = true; resolve(); });
    return () => { unsubOrg(); unsubMember(); };
  }, [router]);

  const handleSubmit = async () => {
    if (!text.trim() || !authorName.trim()) {
      alert('Please fill in your name and your review.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(activeDb, 'testimonials'), {
        authorId: uid,
        authorName: authorName.trim(),
        authorRole,
        rating,
        text: text.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Testimonial submit failed:', e);
      alert('Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.creme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.bordeaux, fontFamily: 'Inter, sans-serif' }}>Loading...</p>
    </div>
  );

  const backPath = isMember ? '/member' : '/dashboard';
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 700, color: '#A08B7D', marginBottom: '4px', letterSpacing: '0.8px', textTransform: 'uppercase' as const };
  const fieldStyle = { width: '100%', padding: '8px 11px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' as const, background: '#FFFDF9', color: '#3A2F1F', fontFamily: 'Inter, sans-serif' };

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 860px) { .lr-grid { grid-template-columns: 1fr !important; } }
        .lr-card { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 18px; box-shadow: 0 2px 14px rgba(107,45,78,0.06); }
        .lr-card input:focus, .lr-card textarea:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .lr-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .lr-back:hover { background: #FBEEDD; }
        .lr-star { cursor: pointer; transition: transform .1s ease; display: inline-block; }
        .lr-star:hover { transform: scale(1.18); }
        .lr-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .lr-btn:not(:disabled):hover { filter: brightness(1.06); transform: translateY(-1px); }
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
        <img onClick={() => router.push(backPath)} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start', cursor: 'pointer' }} />
        <div style={{ textAlign: 'center', justifySelf: 'center', whiteSpace: 'nowrap' }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Share Your Experience</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Your review helps other communities discover UNIMUNITY.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '14px 24px 20px' }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push(backPath)} className="lr-back">{isMember ? 'Back to My Space' : 'Back to Dashboard'}</button>
        </div>

        {submitted ? (
          <div className="lr-card" style={{ maxWidth: 520, margin: '20px auto', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#66BB6A,#2E7D32)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26, color: '#fff', boxShadow: '0 6px 16px rgba(46,125,50,0.3)' }}>{'\u2713'}</div>
            <p style={{ color: '#4A1F38', fontWeight: 800, fontSize: 19, margin: '0 0 8px' }}>Thank you!</p>
            <p style={{ color: '#8A7B6C', fontSize: 13.5, margin: '0 0 20px', lineHeight: 1.6 }}>Your review has been submitted and will appear on our homepage once approved.</p>
            <button onClick={() => router.push(backPath)} className="lr-btn"
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
              {isMember ? 'Back to My Space' : 'Back to Dashboard'}
            </button>
          </div>
        ) : (
          <div className="lr-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

            <div className="lr-card" style={{ padding: '16px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12, paddingBottom: 9, borderBottom: '1px solid #F3E6D8' }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, background: 'linear-gradient(135deg,#E9C77B,#C9974D)', boxShadow: '0 4px 10px rgba(74,31,56,0.18)' }}>{'\u2B50'}</span>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4A1F38' }}>Your Review</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Your name</label>
                  <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="e.g. Marie D." style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>I am a...</label>
                  <div style={{ display: 'flex', background: '#FBEEDD', borderRadius: 10, padding: 3, border: '1px solid #F0DCA8' }}>
                    {(['organizer', 'member'] as const).map(r => (
                      <button key={r} onClick={() => setAuthorRole(r)}
                        style={{ flex: 1, border: 'none', borderRadius: 8, padding: '6px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', textTransform: 'capitalize', background: authorRole === r ? '#FFFFFF' : 'transparent', color: authorRole === r ? C.bordeaux : '#8A7B6C', boxShadow: authorRole === r ? '0 1px 4px rgba(74,31,56,0.12)' : 'none' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label style={labelStyle}>Rating</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className="lr-star" onClick={() => setRating(n)} style={{ fontSize: 28, color: n <= rating ? C.or : '#EAD9BE' }}>{'\u2605'}</span>
                ))}
                <span style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: C.bordeaux }}>{ratingLabels[rating]}</span>
              </div>

              <label style={labelStyle}>Your review</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={6} maxLength={1000} placeholder="What do you like about UNIMUNITY? How has it helped your community?"
                style={{ ...fieldStyle, resize: 'vertical' }} />
              <p style={{ fontSize: 11, color: '#A08B7D', margin: '4px 0 16px', textAlign: 'right' }}>{text.length} / 1000</p>

              <button onClick={handleSubmit} disabled={submitting} className="lr-btn"
                style={{ width: '100%', padding: 11, background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: '#FFFFFF', border: 'none', borderRadius: 12, fontSize: 14.5, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>

            <div className="lr-card" style={{ padding: 22, position: 'sticky', top: 24 }}>
              <div style={{ textAlign: 'center', margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '18px 18px 0 0', borderBottom: '1px solid #F0E4D6' }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>Live Preview</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: 1.2 }}>As shown on the homepage</p>
              </div>
              <div style={{ background: '#FFFDF9', border: '1px solid #F0E4D6', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 16, letterSpacing: 2, color: C.or, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map(n => <span key={n} style={{ color: n <= rating ? C.or : '#EAD9BE' }}>{'\u2605'}</span>)}
                </div>
                <p style={{ fontSize: 13, color: '#3A2F1F', fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 12px', wordBreak: 'break-word' }}>
                  {text.trim() ? '\u201C' + text.trim() + '\u201D' : 'Your review will appear here.'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#F6E3C4', color: C.bordeauxDark, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{(authorName.trim() || '?').charAt(0).toUpperCase()}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: '#4A1F38' }}>{authorName.trim() || 'Your name'}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#8A7B6C', textTransform: 'capitalize' }}>{authorRole}</p>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#8A7B6C', margin: '12px 0 0', lineHeight: 1.5 }}>Reviews are checked by the UNIMUNITY team before they are published.</p>
            </div>
          </div>
        )}
      </div>

      </div>
      <Footer />
    </div>
  );
}
