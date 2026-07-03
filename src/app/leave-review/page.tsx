'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState<'organizer' | 'member'>('organizer');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/login'); return; }
      setUid(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSubmit = async () => {
    if (!text.trim() || !authorName.trim()) {
      alert('Please fill in your name and your review.');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'testimonials'), {
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
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: C.bordeauxDark, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: C.or, cursor: 'pointer', fontSize: '20px' }}>&larr;</button>
        <h1 style={{ color: C.orLight, fontSize: '18px', fontWeight: 700, margin: 0 }}>Share Your Experience</h1>
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
              Tell other communities what you think of TARSYN. Approved reviews may be shown on our homepage to help others discover us.
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
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="What do you like about TARSYN? How has it helped your community?"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.orLight, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '20px', resize: 'vertical', fontFamily: 'inherit' }} />

            <button onClick={handleSubmit} disabled={submitting}
              style={{ width: '100%', padding: '13px', background: C.bordeaux, color: C.creme, border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
