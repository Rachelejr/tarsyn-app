'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      try {
        const q = query(collection(db, 'groups'), where('adminId', '==', u.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          setGroup({ id: doc.id, ...doc.data() });
          const mq = query(collection(db, 'members'), where('groupId', '==', doc.id));
          const ms = await getDocs(mq);
          setMembers(ms.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FAF0E6'}}>
      <p style={{color:'#6B2D4E',fontSize:'18px',fontWeight:'600'}}>Loading...</p>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6'}}>
      <style>{`.card:hover{transform:translateY(-4px)!important}`}</style>

      <nav style={{background:'#6B2D4E',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 12px rgba(0,0,0,0.15)'}}>
        <div onClick={() => router.push('/')} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'36px',height:'36px',background:'#D4AF7A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:'#6B2D4E',fontSize:'14px'}}>T</div>
          <div>
            <div style={{color:'#D4AF7A',fontWeight:'800',fontSize:'18px',lineHeight:'1'}}>TARSYN</div>
            <div style={{color:'rgba(250,240,230,0.6)',fontSize:'10px',letterSpacing:'2px'}}>YOUR COMMUNITY</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <span style={{color:'rgba(250,240,230,0.7)',fontSize:'13px'}}>{user?.email}</span>
          <button onClick={() => auth.signOut().then(() => router.push('/'))}
            style={{background:'transparent',border:'1px solid rgba(212,175,122,0.5)',color:'#D4AF7A',padding:'6px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'40px 24px'}}>
        {!group ? (
          <div style={{textAlign:'center',marginTop:'100px'}}>
            <div style={{fontSize:'64px',marginBottom:'24px'}}>🏘️</div>
            <h2 style={{color:'#6B2D4E',fontSize:'32px',fontWeight:'800',marginBottom:'12px'}}>Welcome to TARSYN</h2>
            <p style={{color:'#7A5068',fontSize:'16px',marginBottom:'40px'}}>Create your group to start managing contributions.</p>
            <button onClick={() => router.push('/dashboard/create-group')}
              style={{background:'#6B2D4E',color:'#FAF0E6',padding:'16px 40px',borderRadius:'14px',border:'none',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>
              + Create My Group
            </button>
          </div>
        ) : (
          <>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'40px',flexWrap:'wrap',gap:'16px'}}>
              <div>
                <h1 style={{color:'#6B2D4E',fontSize:'32px',fontWeight:'800',margin:'0 0 6px'}}>{group.name}</h1>
                <p style={{color:'#7A5068',fontSize:'15px',margin:'0'}}>{group.module} &nbsp;•&nbsp; {members.length} members &nbsp;•&nbsp; <span style={{color:'#2E7D32',fontWeight:'600'}}>Active</span></p>
              </div>
              <button onClick={() => router.push('/dashboard/add-member')}
                style={{background:'#D4AF7A',color:'#6B2D4E',padding:'12px 28px',borderRadius:'12px',border:'none',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
                + Add Member
              </button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'20px',marginBottom:'40px'}}>

              <div className="card" onClick={() => router.push('/dashboard/record-contribution')}
                style={{background:'linear-gradient(135deg,#6B2D4E,#8B3D6E)',borderRadius:'20px',padding:'32px',cursor:'pointer',transition:'transform 0.2s',boxShadow:'0 4px 20px rgba(107,45,78,0.25)'}}>
                <div style={{fontSize:'40px',marginBottom:'16px'}}>💰</div>
                <h3 style={{color:'#D4AF7A',fontSize:'20px',fontWeight:'800',margin:'0 0 8px'}}>Record Contribution</h3>
                <p style={{color:'rgba(250,240,230,0.75)',fontSize:'14px',margin:'0 0 20px',lineHeight:'1.5'}}>Log a payment for any member. Receipt generated automatically.</p>
                <span style={{color:'#D4AF7A',fontSize:'13px',fontWeight:'600'}}>Record now →</span>
              </div>

              <div className="card" onClick={() => router.push('/dashboard/add-member')}
                style={{background:'linear-gradient(135deg,#4A2D5E,#6B3D8E)',borderRadius:'20px',padding:'32px',cursor:'pointer',transition:'transform 0.2s',boxShadow:'0 4px 20px rgba(74,45,94,0.25)'}}>
                <div style={{fontSize:'40px',marginBottom:'16px'}}>👤</div>
                <h3 style={{color:'#D4AF7A',fontSize:'20px',fontWeight:'800',margin:'0 0 8px'}}>Add Member</h3>
                <p style={{color:'rgba(250,240,230,0.75)',fontSize:'14px',margin:'0 0 20px',lineHeight:'1.5'}}>Add a new member. Assign position, generate TYN-ID automatically.</p>
                <span style={{color:'#D4AF7A',fontSize:'13px',fontWeight:'600'}}>Add member →</span>
              </div>

              <div className="card" onClick={() => router.push('/dashboard/overview')}
                style={{background:'linear-gradient(135deg,#2C1A3E,#4A2D5E)',borderRadius:'20px',padding:'32px',cursor:'pointer',transition:'transform 0.2s',boxShadow:'0 4px 20px rgba(44,26,62,0.25)'}}>
                <div style={{fontSize:'40px',marginBottom:'16px'}}>⚡</div>
                <h3 style={{color:'#D4AF7A',fontSize:'20px',fontWeight:'800',margin:'0 0 8px'}}>TARSYN Handles the Rest</h3>
                <p style={{color:'rgba(250,240,230,0.75)',fontSize:'14px',margin:'0 0 20px',lineHeight:'1.5'}}>Rotation, reminders, reports — all automatic.</p>
                <span style={{color:'#D4AF7A',fontSize:'13px',fontWeight:'600'}}>View activity →</span>
              </div>

            </div>

            {members.length > 0 && (
              <div style={{background:'white',borderRadius:'20px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
                <h3 style={{color:'#6B2D4E',fontSize:'18px',fontWeight:'700',margin:'0 0 20px'}}>Members</h3>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #FAF0E6'}}>
                      {['#','TYN-ID','Name','Status'].map(h => (
                        <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#7A5068',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.sort((a,b) => a.position - b.position).map((m,i) => (
                      <tr key={m.id} style={{borderBottom:'1px solid #FAF0E6'}}>
                        <td style={{padding:'12px',color:'#6B2D4E',fontWeight:'700'}}>{m.position}</td>
                        <td style={{padding:'12px',color:'#7A5068',fontFamily:'monospace',fontSize:'13px'}}>{m.tynId}</td>
                        <td style={{padding:'12px',color:'#2C1A3E',fontWeight:'600'}}>{m.name}</td>
                        <td style={{padding:'12px'}}>
                          <span style={{background:m.status==='active'?'#E8F5E9':'#FFF3E0',color:m.status==='active'?'#2E7D32':'#E65100',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'600'}}>
                            {m.status || 'active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
