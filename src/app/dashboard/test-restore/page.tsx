'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        const userName = userDoc.exists() ? userDoc.data()?.name : null;
        setAdminName(userName || u.displayName || u.email?.split('@')[0] || 'Admin');

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

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FBEEDD'}}>
      <p style={{color:'#6B2D4E',fontSize:'18px',fontWeight:600}}>Loading...</p>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#FBEEDD',fontFamily:'Inter, sans-serif'}}>
      <nav style={{background:'#6B2D4E',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div onClick={() => router.push('/')} style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
          <div style={{width:'36px',height:'36px',background:'#E9C77B',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#6B2D4E',fontSize:'14px'}}>T</div>
          <div>
            <div style={{color:'#E9C77B',fontWeight:800,fontSize:'18px'}}>TARSYN</div>
            <div style={{color:'rgba(251,238,221,0.6)',fontSize:'10px',letterSpacing:'2px'}}>YOUR COMMUNITY</div>
          </div>
        </div>
        <button onClick={() => auth.signOut().then(() => router.push('/login'))}
          style={{background:'transparent',border:'1px solid rgba(233,199,123,0.5)',color:'#E9C77B',padding:'6px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
          Sign Out
        </button>
      </nav>

      <div style={{maxWidth:'900px',margin:'0 auto',padding:'40px 24px'}}>
        <div style={{marginBottom:'32px'}}>
          <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:800,margin:'0 0 4px'}}>
            Welcome, {adminName} 👋
          </h1>
          <p style={{color:'#6B2D4E',fontSize:'15px',margin:0}}>
            {group ? `${group.name} · ${group.module} · ${group.status}` : 'No group yet'}
          </p>
        </div>

        {!group ? (
          <div style={{background:'white',borderRadius:'20px',padding:'48px',textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>🏠</div>
            <h2 style={{color:'#6B2D4E',fontSize:'22px',fontWeight:800,margin:'0 0 8px'}}>Create your first group</h2>
            <p style={{color:'#6B2D4E',fontSize:'14px',margin:'0 0 24px'}}>Set up your tontine or sol group to get started.</p>
            <button onClick={() => router.push('/dashboard/create-tontine')}
              style={{background:'#6B2D4E',color:'#FBEEDD',padding:'14px 32px',borderRadius:'12px',border:'none',fontSize:'16px',fontWeight:700,cursor:'pointer'}}>
              + Create Group
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'24px'}}>
              {[
                {label:'Total Members',value:members.length,icon:'👥'},
                {label:'Active Members',value:members.filter(m=>m.status==='active').length,icon:'✅'},
                {label:'Pending Members',value:members.filter(m=>m.status==='pending').length,icon:'⏳'},
              ].map((s,i) => (
                <div key={i} style={{background:'white',borderRadius:'16px',padding:'20px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:'16px'}}>
                  <span style={{fontSize:'28px'}}>{s.icon}</span>
                  <div>
                    <p style={{color:'#6B2D4E',fontSize:'12px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{s.label}</p>
                    <p style={{color:'#6B2D4E',fontSize:'22px',fontWeight:800,margin:0}}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions - Row 1 */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'16px'}}>
              {[
                {title:'Record Contribution',icon:'💰',path:'/dashboard/record-contribution',color:'#6B2D4E'},
                {title:'Add Member',icon:'👤',path:'/dashboard/add-member',color:'#4A1F38'},
                {title:'Overview',icon:'⚡',path:'/dashboard/overview',color:'#4A1F38'},
              ].map((a,i) => (
                <div key={i} onClick={() => router.push(a.path)}
                  style={{background:a.color,borderRadius:'16px',padding:'28px',cursor:'pointer',boxShadow:'0 4px 16px rgba(107,45,78,0.2)'}}>
                  <span style={{fontSize:'32px',display:'block',marginBottom:'12px'}}>{a.icon}</span>
                  <p style={{color:'#E9C77B',fontWeight:700,fontSize:'15px',margin:0}}>{a.title}</p>
                </div>
              ))}
            </div>

            {/* Actions - Row 2 */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'16px',marginBottom:'24px'}}>
              {[
                {title:'Reminders',icon:'🔔',path:'/dashboard/reminders',color:'#6B2D4E'},
                {title:'Documents',icon:'📁',path:'/dashboard/documents',color:'#3A1830'},
                {title:'Subscription',icon:'💳',path:'/dashboard/subscription',color:'#4A1F38'},
              ].map((a,i) => (
                <div key={i} onClick={() => router.push(a.path)}
                  style={{background:a.color,borderRadius:'16px',padding:'28px',cursor:'pointer',boxShadow:'0 4px 16px rgba(107,45,78,0.2)'}}>
                  <span style={{fontSize:'32px',display:'block',marginBottom:'12px'}}>{a.icon}</span>
                  <p style={{color:'#E9C77B',fontWeight:700,fontSize:'15px',margin:0}}>{a.title}</p>
                </div>
              ))}
            </div>

            {/* Members Table */}
            <div style={{background:'white',borderRadius:'20px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                <h3 style={{color:'#6B2D4E',fontSize:'18px',fontWeight:700,margin:0}}>Members</h3>
                <button onClick={() => router.push('/dashboard/add-member')}
                  style={{background:'#6B2D4E',color:'#FBEEDD',padding:'8px 16px',borderRadius:'8px',border:'none',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>
                  + Add Member
                </button>
              </div>
              {members.length === 0 ? (
                <p style={{color:'#6B2D4E',fontSize:'14px'}}>No members yet. Add your first member!</p>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #FBEEDD'}}>
                      {['#','TYN-ID','Name','Status'].map(h => (
                        <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#6B2D4E',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.sort((a,b) => a.position - b.position).map((m,i) => (
                      <tr key={m.id} style={{borderBottom:'1px solid #FBEEDD',background:i%2===0?'transparent':'#FDFAF7'}}>
                        <td style={{padding:'12px',color:'#6B2D4E',fontWeight:700}}>#{m.position}</td>
                        <td style={{padding:'12px',color:'#6B2D4E',fontFamily:'monospace',fontSize:'13px'}}>{m.tynId}</td>
                        <td style={{padding:'12px',color:'#4A1F38',fontWeight:600}}>{m.name}</td>
                        <td style={{padding:'12px'}}>
                          <span style={{background:m.status==='active'?'#E8F5E9':'#FFF3E0',color:m.status==='active'?'#2E7D32':'#E65100',padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:600}}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
