'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function JoinPage() {
  const { code } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'members'), where('inviteCode', '==', code));
        const snap = await getDocs(q);
        if (snap.empty) { setNotFound(true); setLoading(false); return; }
        const memberData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        setMember(memberData);
        if (memberData.groupId) {
          const gDoc = await getDoc(doc(db, 'groups', memberData.groupId));
          if (gDoc.exists()) setGroup({ id: gDoc.id, ...gDoc.data() });
        }
      } catch (e) { setNotFound(true); }
      setLoading(false);
    };
    load();
  }, [code]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B2D4E', fontWeight: 600 }}>Loading...</p>
    </div>
  );

  if (notFound || !member) return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>❌</div>
      <h2 style={{ color: '#6B2D4E', fontSize: '22px', fontWeight: 800, margin: 0 }}>Invitation not found</h2>
      <p style={{ color: '#7A5068', fontSize: '14px', margin: 0 }}>This link may be invalid or expired.</p>
      <button onClick={() => router.push('/')} style={{ background: '#6B2D4E', color: '#FAF0E6', padding: '12px 24px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Go Home</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAF0E6', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#6B2D4E', padding: '16px 24px' }}>
        <div style={{ color: '#D4AF7A', fontWeight: 800, fontSize: '18px' }}>TARSYN</div>
      </nav>

      <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 16px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 8px 32px rgba(107,45,78,0.12)', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ color: '#6B2D4E', fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>Welcome, {member.name}!</h1>
          <p style={{ color: '#7A5068', fontSize: '14px', margin: '0 0 24px' }}>You are a member of <strong style={{ color: '#6B2D4E' }}>{group?.name || 'your group'}</strong></p>

          <div style={{ background: '#FAF0E6', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'TYN-ID', value: member.tynId, mono: true },
                { label: 'Position', value: `#${member.position}` },
                { label: 'Status', value: member.status || 'pending' },
                { label: 'Payout Date', value: member.payoutDate || 'Not set' },
                { label: 'Country', value: member.country },
                { label: 'Member Type', value: member.memberType },
              ].map(item => (
                <div key={item.label} style={{ background: 'white', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ color: '#7A5068', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.label}</p>
                  <p style={{ color: '#6B2D4E', fontWeight: 700, fontSize: '13px', margin: 0, fontFamily: (item as any).mono ? 'monospace' : 'inherit' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => router.push('/')}
            style={{ width: '100%', background: '#6B2D4E', color: '#FAF0E6', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
            Go to TARSYN
          </button>
        </div>
      </div>
    </div>
  );
}