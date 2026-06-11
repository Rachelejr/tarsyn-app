'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function Overview() {
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      try {
        const gq = query(collection(db, 'groups'), where('adminId', '==', u.uid));
        const gsnap = await getDocs(gq);
        if (!gsnap.empty) {
          const doc = gsnap.docs[0];
          const groupData = { id: doc.id, ...doc.data() };
          setGroup(groupData);
          const mq = query(collection(db, 'members'), where('groupId', '==', doc.id));
          const ms = await getDocs(mq);
          setMembers(ms.docs.map(d => ({ id: d.id, ...d.data() })));
          const pq = query(collection(db, 'payments'), where('groupId', '==', doc.id));
          const ps = await getDocs(pq);
          setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const confirmedPayments = payments.filter(p => p.status === 'confirmed').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const activeMembers = members.filter(m => m.status === 'active').length;

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6'}}>
      <style>{`.card:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(107,45,78,0.2)!important;}`}</style>

      <nav style={{background:'#6B2D4E',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 12px rgba(0,0,0,0.15)'}}>
        <div onClick={() => router.push('/')} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'36px',height:'36px',background:'#D4AF7A',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:'#6B2D4E',fontSize:'14px'}}>T</div>
          <div>
            <div style={{color:'#D4AF7A',fontWeight:'800',fontSize:'18px',lineHeight:'1'}}>TARSYN</div>
            <div style={{color:'rgba(250,240,230,0.6)',fontSize:'10px',letterSpacing:'2px'}}>YOUR COMMUNITY</div>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{background:'transparent',border:'1px solid rgba(212,175,122,0.5)',color:'#D4AF7A',padding:'6px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>
          ← Dashboard
        </button>
      </nav>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'40px 24px'}}>

        <div style={{marginBottom:'32px'}}>
          <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'800',margin:'0 0 6px'}}>⚡ TARSYN Handles the Rest</h1>
          <p style={{color:'#7A5068',fontSize:'15px',margin:'0'}}>{group?.name} — Rotation, reminders, reports — all automatic.</p>
        </div>

        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px',marginBottom:'32px'}}>
          {[
            {label:'Total Members',value:members.length,icon:'👥',color:'#6B2D4E'},
            {label:'Active Members',value:activeMembers,icon:'✅',color:'#2E7D32'},
            {label:'Total Collected',value:`${totalPaid} ${payments[0]?.currency || ''}`,icon:'💰',color:'#C68000'},
            {label:'Confirmed Payments',value:confirmedPayments,icon:'✔️',color:'#1565C0'},
            {label:'Pending Payments',value:pendingPayments,icon:'⏳',color:'#E65100'},
          ].map((s,i) => (
            <div key={i} className="card" style={{background:'white',borderRadius:'16px',padding:'20px 24px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',transition:'all 0.2s',display:'flex',alignItems:'center',gap:'16px'}}>
              <span style={{fontSize:'28px'}}>{s.icon}</span>
              <div>
                <p style={{color:'#7A5068',fontSize:'12px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{s.label}</p>
                <p style={{color:s.color,fontSize:'22px',fontWeight:'800',margin:'0'}}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ROTATION */}
        <div style={{background:'white',borderRadius:'20px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',marginBottom:'24px'}}>
          <h3 style={{color:'#6B2D4E',fontSize:'18px',fontWeight:'700',margin:'0 0 20px'}}>🔄 Rotation Schedule</h3>
          {members.length === 0 ? (
            <p style={{color:'#7A5068',fontSize:'14px'}}>No members yet. Add members to see rotation.</p>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #FAF0E6'}}>
                    {['Position','TYN-ID','Name','Payout Date','Status'].map(h => (
                      <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#7A5068',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.sort((a,b) => a.position - b.position).map((m,i) => (
                    <tr key={m.id} style={{borderBottom:'1px solid #FAF0E6',background:i%2===0?'transparent':'#FDFAF7'}}>
                      <td style={{padding:'12px',color:'#6B2D4E',fontWeight:'700'}}>#{m.position}</td>
                      <td style={{padding:'12px',color:'#7A5068',fontFamily:'monospace',fontSize:'13px'}}>{m.tynId}</td>
                      <td style={{padding:'12px',color:'#2C1A3E',fontWeight:'600'}}>{m.name}</td>
                      <td style={{padding:'12px',color:'#7A5068',fontSize:'13px'}}>{m.payoutDate || '—'}</td>
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
        </div>

        {/* RECENT PAYMENTS */}
        <div style={{background:'white',borderRadius:'20px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',marginBottom:'24px'}}>
          <h3 style={{color:'#6B2D4E',fontSize:'18px',fontWeight:'700',margin:'0 0 20px'}}>💰 Recent Contributions</h3>
          {payments.length === 0 ? (
            <p style={{color:'#7A5068',fontSize:'14px'}}>No payments recorded yet.</p>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #FAF0E6'}}>
                    {['Receipt','Member','Amount','Method','Date','Status'].map(h => (
                      <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#7A5068',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0,10).map((p,i) => (
                    <tr key={p.id} style={{borderBottom:'1px solid #FAF0E6',background:i%2===0?'transparent':'#FDFAF7'}}>
                      <td style={{padding:'12px',color:'#6B2D4E',fontFamily:'monospace',fontSize:'12px'}}>{p.receiptNumber || '—'}</td>
                      <td style={{padding:'12px',color:'#2C1A3E',fontWeight:'600'}}>{p.memberName}</td>
                      <td style={{padding:'12px',color:'#2E7D32',fontWeight:'700'}}>{p.amount} {p.currency}</td>
                      <td style={{padding:'12px',color:'#7A5068',fontSize:'13px'}}>{p.paymentMethod}</td>
                      <td style={{padding:'12px',color:'#7A5068',fontSize:'13px'}}>{p.paymentDate}</td>
                      <td style={{padding:'12px'}}>
                        <span style={{
                          background:p.status==='confirmed'?'#E8F5E9':p.status==='pending'?'#FFF3E0':'#FFEBEE',
                          color:p.status==='confirmed'?'#2E7D32':p.status==='pending'?'#E65100':'#C62828',
                          padding:'4px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:'600'
                        }}>
                          {p.status || 'confirmed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
          {[
            {title:'Record Payment',icon:'💰',path:'/dashboard/record-contribution',color:'#6B2D4E'},
            {title:'Add Member',icon:'👤',path:'/dashboard/add-member',color:'#4A2D5E'},
            {title:'Send Reminder',icon:'🔔',path:'/dashboard/reminders',color:'#2C1A3E'},
          ].map((a,i) => (
            <div key={i} className="card" onClick={() => router.push(a.path)}
              style={{background:a.color,borderRadius:'16px',padding:'24px',cursor:'pointer',transition:'all 0.2s',boxShadow:'0 4px 16px rgba(107,45,78,0.2)'}}>
              <span style={{fontSize:'32px',marginBottom:'12px',display:'block'}}>{a.icon}</span>
              <p style={{color:'#D4AF7A',fontWeight:'700',fontSize:'15px',margin:'0'}}>{a.title}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
