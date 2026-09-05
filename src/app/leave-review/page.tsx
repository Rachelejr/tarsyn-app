'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, memberAuth, db, memberDb } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Footer from '@/components/Footer';

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

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' , display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
      <div style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <img onClick={() => router.push('/dashboard')} src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', cursor: 'pointer' }} />
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ color: C.creme, fontSize: '18px', fontWeight: 700, margin: 0 }}>Share Your Experience</h1>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 24px' }}>
        {submitted ? (
          <div style={{ background: C.greenBg, borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <p style={{ color: C.green, fontWeight: 800, fontSize: '17px', margin: '0 0 8px' }}>Thank you!</p>
            <p style={{ color: C.green, fontSize: '13px', margin: 0 }}>Your review has been submitted and will appear on our homepage once approved.</p>
          </div>
        ) : (
          <div style={{ background: C.blanc, borderRadius: '16px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p style={{ color: C.bordeaux, fontSize: '14px', margin: '0 0 22px', lineHeight: 1.6 }}>
              Tell other communities what you think of UNIMUNITY. Approved reviews may be shown on our homepage to help others discover us.
            </p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.bordeaux, marginBottom: '6px' }}>Your name</label>
            <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="e.g. Marie D."
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '18px' }} />

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.bordeaux, marginBottom: '6px' }}>I am a...</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <button onClick={() => setAuthorRole('organizer')}
                style={{ flex: 1, padding: '9px', borderRadius: '10px', border: '1.5px solid ' + (authorRole === 'organizer' ? C.bordeaux : C.orLight), background: authorRole === 'organizer' ? C.bordeaux : 'white', color: authorRole === 'organizer' ? 'white' : C.bordeaux, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                Organizer
              </button>
              <button onClick={() => setAuthorRole('member')}
                style={{ flex: 1, padding: '9px', borderRadius: '10px', border: '1.5px solid ' + (authorRole === 'member' ? C.bordeaux : C.orLight), background: authorRole === 'member' ? C.bordeaux : 'white', color: authorRole === 'member' ? 'white' : C.bordeaux, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                Member
              </button>
            </div>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.bordeaux, marginBottom: '6px' }}>Rating</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} onClick={() => setRating(n)} style={{ fontSize: '28px', cursor: 'pointer', color: n <= rating ? C.or : C.orLight }}>*</span>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.bordeaux, marginBottom: '6px' }}>Your review</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="What do you like about UNIMUNITY? How has it helped your community?"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '20px', resize: 'vertical', fontFamily: 'inherit' }} />

            <button onClick={handleSubmit} disabled={submitting}
              style={{ width: '100%', padding: '13px', background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        )}
      </div>

      </div>
      <Footer />
    </div>
  );
}
