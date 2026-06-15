'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setAdminName(u.displayName || u.email.split('@')[0]);
      try {
        const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
        const gsnap = await getDocs(gq);
        if (!gsnap.empty) {
          const g = { id: gsnap.docs[0].id, ...gsnap.docs[0].data() };
          setGroup(g);
          const mq = query(collection(db, 'members'), where('organizerId', '==', u.uid));
          const ms = await getDocs(mq);
          setMembers(ms.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) return React.createElement('div', null, 'Loading...');

  return React.createElement('div', null, 'Dashboard - ' + adminName);
}
