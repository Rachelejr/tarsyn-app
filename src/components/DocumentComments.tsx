'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#3F1732',
  or: '#C8A24B', orLight: '#E7D29A',
  creme: '#FAF0E6', blanc: '#FFFFFF',
  text: '#1a1a1a', muted: '#6b7280', border: '#e5e7eb',
};

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorId: string;
  documentId: string;
  deleted?: boolean;
  pinned?: boolean;
  reactions?: Record<string, string[]>;
  createdAt?: { seconds: number };
}

interface Review {
  id: string;
  rating: number;
  status: string;
  resolution: string;
  authorName: string;
  authorId: string;
  documentId: string;
  createdAt?: { seconds: number };
}

interface Props {
  documentId: string;
  currentUserName: string;
  currentUserRole: string;
}

const REACTIONS = ['👍', '❤️', '👏', '✅', '🙏'];

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved', bg: '#d1fae5', color: '#065f46' },
  { value: 'to_correct', label: 'To Correct', bg: '#fef3c7', color: '#92400e' },
  { value: 'rejected', label: 'Rejected', bg: '#fee2e2', color: '#991b1b' },
];

const RESOLUTION_OPTIONS = [
  { value: 'pending', label: 'Pending', bg: '#fef3c7', color: '#92400e' },
  { value: 'resolved', label: 'Resolved', bg: '#d1fae5', color: '#065f46' },
];

const Avatar = ({ name, size = 34 }: { name: string; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: C.creme, border: '1.5px solid ' + C.orLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, color: C.bordeaux, flexShrink: 0 }}>
    {name?.charAt(0)?.toUpperCase() || '?'}
  </div>
);

const StarRating = ({ rating, onChange, readonly }: { rating: number; onChange?: (r: number) => void; readonly?: boolean }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} onClick={() => !readonly && onChange?.(i)}
        style={{ fontSize: 18, cursor: readonly ? 'default' : 'pointer', color: i <= rating ? '#C8A24B' : '#d1d5db' }}>
        {i <= rating ? '★' : '☆'}
      </span>
    ))}
  </div>
);

export default function DocumentComments({ documentId, currentUserName, currentUserRole }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myStatus, setMyStatus] = useState('approved');
  const [myResolution, setMyResolution] = useState('pending');
  const [submittingReview, setSubmittingReview] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!documentId) return;
    const fetchAll = async () => {
      try {
        const q = query(collection(db, 'comments'), where('documentId', '==', documentId), orderBy('createdAt', 'asc'));
        const snap = await getDocs(q);
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));

        const rq = query(collection(db, 'reviews'), where('documentId', '==', documentId));
        const rsnap = await getDocs(rq);
        if (!rsnap.empty) setReview({ id: rsnap.docs[0].id, ...rsnap.docs[0].data() } as Review);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAll();
  }, [documentId]);

  const handleSubmitComment = async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      const data = { content: text.trim(), authorName: currentUserName, authorRole: currentUserRole, authorId: user.uid, documentId, deleted: false, pinned: false, reactions: {}, createdAt: serverTimestamp() };
      const ref2 = await addDoc(collection(db, 'comments'), data);
      setComments(prev => [...prev, { id: ref2.id, ...data, createdAt: { seconds: Date.now() / 1000 } }]);
      setText('');
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleEdit = async (id: string) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, 'comments', id), { content: editText.trim() });
    setComments(prev => prev.map(c => c.id === id ? { ...c, content: editText.trim() } : c));
    setEditId(null); setEditText('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    await updateDoc(doc(db, 'comments', id), { deleted: true, content: 'This comment was deleted.' });
    setComments(prev => prev.map(c => c.id === id ? { ...c, deleted: true, content: 'This comment was deleted.' } : c));
  };

  const handlePin = async (id: string, pinned: boolean) => {
    await updateDoc(doc(db, 'comments', id), { pinned: !pinned });
    setComments(prev => prev.map(c => c.id === id ? { ...c, pinned: !pinned } : c));
  };

  const handleReaction = async (id: string, emoji: string) => {
    if (!user) return;
    const comment = comments.find(c => c.id === id);
    if (!comment) return;
    const reactions = { ...comment.reactions };
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(user.uid);
    if (idx > -1) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(user.uid);
    await updateDoc(doc(db, 'comments', id), { reactions });
    setComments(prev => prev.map(c => c.id === id ? { ...c, reactions } : c));
  };

  const handleSubmitReview = async () => {
    if (!user || myRating === 0) return;
    setSubmittingReview(true);
    try {
      const data = { rating: myRating, status: myStatus, resolution: myResolution, authorName: currentUserName, authorId: user.uid, documentId, createdAt: serverTimestamp() };
      if (review) {
        await updateDoc(doc(db, 'reviews', review.id), data);
        setReview({ ...review, ...data });
      } else {
        const ref2 = await addDoc(collection(db, 'reviews'), data);
        setReview({ id: ref2.id, ...data, createdAt: { seconds: Date.now() / 1000 } });
      }
      setShowReviewForm(false);
    } catch (e) { console.error(e); }
    setSubmittingReview(false);
  };

  const formatDate = (ts?: { seconds: number }) => {
    if (!ts) return '';
    return new Date(ts.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const pinned = comments.filter(c => c.pinned && !c.deleted);
  const regular = comments.filter(c => !c.pinned);
  const total = comments.filter(c => !c.deleted).length;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin';
  const avgRating = review?.rating || 0;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>

      <div style={{ background: C.blanc, borderRadius: 14, border: '1px solid ' + C.border, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: review ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.or, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Review</h3>
            {review && <StarRating rating={avgRating} readonly />}
            {review && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: STATUS_OPTIONS.find(s => s.value === review.status)?.bg || '#f3f4f6', color: STATUS_OPTIONS.find(s => s.value === review.status)?.color || C.muted }}>
                {STATUS_OPTIONS.find(s => s.value === review.status)?.label || review.status}
              </span>
            )}
            {review && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: RESOLUTION_OPTIONS.find(r => r.value === review.resolution)?.bg || '#f3f4f6', color: RESOLUTION_OPTIONS.find(r => r.value === review.resolution)?.color || C.muted }}>
                {RESOLUTION_OPTIONS.find(r => r.value === review.resolution)?.label || review.resolution}
              </span>
            )}
          </div>
          <button onClick={() => setShowReviewForm(!showReviewForm)}
            style={{ background: showReviewForm ? C.creme : C.or, color: showReviewForm ? C.bordeaux : C.bordeauxDark, border: '1px solid ' + C.orLight, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {review ? 'Update Review' : 'Add Review'}
          </button>
        </div>

        {!review && !showReviewForm && (
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No review yet.</p>
        )}

        {showReviewForm && (
          <div style={{ marginTop: 14, padding: '16px', background: C.creme, borderRadius: 12, border: '1px solid ' + C.orLight }}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Rating</p>
              <StarRating rating={myRating} onChange={setMyRating} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Validation Status</p>
                <select value={myStatus} onChange={e => setMyStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, outline: 'none' }}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>Resolution</p>
                <select value={myResolution} onChange={e => setMyResolution(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, outline: 'none' }}>
                  {RESOLUTION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmitReview} disabled={submittingReview || myRating === 0}
                style={{ background: C.bordeaux, color: C.blanc, border: 'none', borderRadius: 9, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: myRating === 0 ? 0.5 : 1 }}>
                {submittingReview ? 'Saving...' : 'Save Review'}
              </button>
              <button onClick={() => setShowReviewForm(false)}
                style={{ background: C.blanc, color: C.muted, border: '1px solid ' + C.border, borderRadius: 9, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.or, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Comments & Reviews</h3>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: C.creme, color: C.bordeaux, border: '1px solid ' + C.orLight }}>{total}</span>
      </div>

      {pinned.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.or, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 8px' }}>Pinned</p>
          {pinned.map(c => <CommentCard key={c.id} c={c} user={user} isAdmin={isAdmin} editId={editId} editText={editText} setEditId={setEditId} setEditText={setEditText} handleEdit={handleEdit} handleDelete={handleDelete} handlePin={handlePin} handleReaction={handleReaction} formatDate={formatDate} isPinned={true} />)}
        </div>
      )}

      {loading ? (
        <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading...</p>
      ) : regular.length === 0 && pinned.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', background: C.creme, borderRadius: 12, border: '1px dashed ' + C.orLight }}>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>No comments yet. Be the first to comment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {regular.map(c => <CommentCard key={c.id} c={c} user={user} isAdmin={isAdmin} editId={editId} editText={editText} setEditId={setEditId} setEditText={setEditText} handleEdit={handleEdit} handleDelete={handleDelete} handlePin={handlePin} handleReaction={handleReaction} formatDate={formatDate} isPinned={false} />)}
        </div>
      )}

      <div style={{ marginTop: 16, background: C.blanc, borderRadius: 14, border: '1px solid ' + C.border, padding: '16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar name={currentUserName} />
          <div style={{ flex: 1 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..."
              style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 10, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={handleSubmitComment} disabled={submitting || !text.trim()}
                style={{ background: C.bordeaux, color: C.blanc, border: 'none', borderRadius: 9, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submitting || !text.trim() ? 0.6 : 1 }}>
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentCard({ c, user, isAdmin, editId, editText, setEditId, setEditText, handleEdit, handleDelete, handlePin, handleReaction, formatDate, isPinned }: any) {
  const C2 = { bordeaux: '#6B2D4E', or: '#C8A24B', orLight: '#E7D29A', creme: '#FAF0E6', blanc: '#FFFFFF', text: '#1a1a1a', muted: '#6b7280', border: '#e5e7eb' };
  const isAuthor = user?.uid === c.authorId;

  return (
    <div style={{ background: isPinned ? '#fffbeb' : C2.blanc, borderRadius: 12, border: '1px solid ' + (isPinned ? C2.orLight : C2.border), padding: '14px 16px', marginBottom: 8, position: 'relative' }}>
      {isPinned && <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, fontWeight: 700, color: C2.or, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pinned</span>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: C2.creme, border: '1.5px solid ' + C2.orLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: C2.bordeaux, flexShrink: 0 }}>
          {c.authorName?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C2.text }}>{c.authorName}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.authorRole === 'admin' ? C2.creme : '#f3f4f6', color: c.authorRole === 'admin' ? C2.bordeaux : C2.muted, border: '1px solid ' + (c.authorRole === 'admin' ? C2.orLight : '#e5e7eb'), textTransform: 'capitalize' }}>{c.authorRole}</span>
            <span style={{ fontSize: 11, color: C2.muted, marginLeft: 'auto' }}>{formatDate(c.createdAt)}</span>
          </div>
          {editId === c.id ? (
            <div>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 8, border: '1.5px solid ' + C2.border, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => handleEdit(c.id)} style={{ background: C2.or, color: C2.bordeaux, border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditId(null)} style={{ background: '#f3f4f6', color: C2.muted, border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: c.deleted ? C2.muted : C2.text, margin: 0, lineHeight: 1.6, fontStyle: c.deleted ? 'italic' : 'normal' }}>{c.content}</p>
          )}
          {!c.deleted && (
            <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {['👍','❤️','👏','✅','🙏'].map(emoji => {
                const count = c.reactions?.[emoji]?.length || 0;
                const reacted = c.reactions?.[emoji]?.includes(user?.uid);
                return (
                  <button key={emoji} onClick={() => handleReaction(c.id, emoji)}
                    style={{ background: reacted ? C2.creme : 'transparent', border: '1px solid ' + (reacted ? C2.orLight : C2.border), borderRadius: 20, padding: '3px 9px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {emoji}{count > 0 && <span style={{ fontSize: 11, color: C2.muted }}>{count}</span>}
                  </button>
                );
              })}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {isAuthor && <button onClick={() => { setEditId(c.id); setEditText(c.content); }} style={{ background: 'none', border: 'none', color: C2.muted, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>}
                {(isAuthor || isAdmin) && <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>}
                {isAdmin && <button onClick={() => handlePin(c.id, c.pinned)} style={{ background: 'none', border: 'none', color: C2.or, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>{c.pinned ? 'Unpin' : 'Pin'}</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
