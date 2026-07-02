'use client';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';

const C = {
  bordeaux: '#6B2D4E', bordeauxDark: '#4A1F38',
  or: '#E9C77B', orLight: '#F0DCA8',
  creme: '#FBEEDD', blanc: '#FFFFFF',
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
  editedAt?: { seconds: number };
}

interface Props {
  documentId: string;
  currentUserName: string;
  currentUserRole: string;
}

const REACTIONS = ['👍', '❤️', '👏', '✅', '🙏'];

const Avatar = ({ name, size = 32 }: { name: string; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: C.creme, border: '1.5px solid ' + C.orLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, color: C.bordeaux, flexShrink: 0 }}>
    {name?.charAt(0)?.toUpperCase() || '?'}
  </div>
);

export default function DocumentComments({ documentId, currentUserName, currentUserRole }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const user = auth.currentUser;

  useEffect(() => {
    if (!documentId) return;
    const fetchComments = async () => {
      try {
        const q = query(collection(db, 'comments'), where('documentId', '==', documentId), orderBy('createdAt', 'asc'));
        const snap = await getDocs(q);
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchComments();
  }, [documentId]);

  const handleSubmit = async () => {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      const data = { content: text.trim(), authorName: currentUserName, authorRole: currentUserRole, authorId: user.uid, documentId, deleted: false, pinned: false, reactions: {}, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'comments'), data);
      setComments(prev => [...prev, { id: ref.id, ...data, createdAt: { seconds: Date.now() / 1000 } }]);
      setText('');
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  const handleEdit = async (id: string) => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, 'comments', id), { content: editText.trim(), editedAt: serverTimestamp() });
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

  const formatDate = (ts?: { seconds: number }) => {
    if (!ts) return '';
    return new Date(ts.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const pinned = comments.filter(c => c.pinned && !c.deleted);
  const regular = comments.filter(c => !c.pinned);
  const total = comments.filter(c => !c.deleted).length;

  return (
    <div style={{ marginTop: 24, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.or, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Comments & Reviews</h3>
        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: C.creme, color: C.bordeaux, border: '1px solid ' + C.orLight }}>{total}</span>
      </div>

      {pinned.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.or, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 8px' }}>Pinned</p>
          {pinned.map(c => (
            <CommentCard key={c.id} c={c} user={user} currentUserRole={currentUserRole} editId={editId} editText={editText} setEditId={setEditId} setEditText={setEditText} handleEdit={handleEdit} handleDelete={handleDelete} handlePin={handlePin} handleReaction={handleReaction} formatDate={formatDate} pinned={true} />
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading comments...</p>
      ) : regular.length === 0 && pinned.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', background: C.creme, borderRadius: 12, border: '1px dashed ' + C.orLight }}>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>No comments yet. Be the first to comment.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {regular.map(c => (
            <CommentCard key={c.id} c={c} user={user} currentUserRole={currentUserRole} editId={editId} editText={editText} setEditId={setEditId} setEditText={setEditText} handleEdit={handleEdit} handleDelete={handleDelete} handlePin={handlePin} handleReaction={handleReaction} formatDate={formatDate} pinned={false} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, background: C.blanc, borderRadius: 14, border: '1px solid ' + C.border, padding: '16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar name={currentUserName} />
          <div style={{ flex: 1 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..."
              style={{ width: '100%', minHeight: 80, padding: '10px 12px', borderRadius: 10, border: '1.5px solid ' + C.border, fontSize: 13, color: C.text, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={handleSubmit} disabled={submitting || !text.trim()}
                style={{ background: C.bordeaux, color: C.blanc, border: 'none', borderRadius: 9, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: submitting || !text.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !text.trim() ? 0.6 : 1 }}>
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentCard({ c, user, currentUserRole, editId, editText, setEditId, setEditText, handleEdit, handleDelete, handlePin, handleReaction, formatDate, pinned }: any) {
  const C = { bordeaux: '#6B2D4E', or: '#E9C77B', orLight: '#F0DCA8', creme: '#FBEEDD', blanc: '#FFFFFF', text: '#1a1a1a', muted: '#6b7280', border: '#e5e7eb' };
  const isAuthor = user?.uid === c.authorId;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  return (
    <div style={{ background: pinned ? '#fffbeb' : C.blanc, borderRadius: 12, border: '1px solid ' + (pinned ? C.orLight : C.border), padding: '14px 16px', position: 'relative' }}>
      {pinned && <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10, fontWeight: 700, color: C.or, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pinned</span>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.creme, border: '1.5px solid ' + C.orLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: C.bordeaux, flexShrink: 0 }}>
          {c.authorName?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.authorName}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.authorRole === 'admin' ? C.creme : '#f3f4f6', color: c.authorRole === 'admin' ? C.bordeaux : C.muted, border: '1px solid ' + (c.authorRole === 'admin' ? C.orLight : '#e5e7eb'), textTransform: 'capitalize' }}>{c.authorRole}</span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{formatDate(c.createdAt)}</span>
          </div>
          {editId === c.id ? (
            <div>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 8, border: '1.5px solid ' + C.border, fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => handleEdit(c.id)} style={{ background: C.or, color: C.bordeaux, border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditId(null)} style={{ background: '#f3f4f6', color: C.muted, border: 'none', borderRadius: 7, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: c.deleted ? C.muted : C.text, margin: 0, lineHeight: 1.6, fontStyle: c.deleted ? 'italic' : 'normal' }}>{c.content}</p>
          )}
          {!c.deleted && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {['👍','❤️','👏','✅','🙏'].map(emoji => {
                const count = c.reactions?.[emoji]?.length || 0;
                const reacted = c.reactions?.[emoji]?.includes(user?.uid);
                return count > 0 || true ? (
                  <button key={emoji} onClick={() => handleReaction(c.id, emoji)}
                    style={{ background: reacted ? C.creme : 'transparent', border: '1px solid ' + (reacted ? C.orLight : C.border), borderRadius: 20, padding: '3px 9px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {emoji}{count > 0 && <span style={{ fontSize: 11, color: C.muted }}>{count}</span>}
                  </button>
                ) : null;
              })}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {isAuthor && !c.deleted && <button onClick={() => { setEditId(c.id); setEditText(c.content); }} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>}
                {(isAuthor || isAdmin) && !c.deleted && <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>Delete</button>}
                {isAdmin && <button onClick={() => handlePin(c.id, c.pinned)} style={{ background: 'none', border: 'none', color: C.or, fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>{c.pinned ? 'Unpin' : 'Pin'}</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
