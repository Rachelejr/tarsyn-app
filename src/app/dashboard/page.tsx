'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { window.location.href = '/login'; return; }
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px'}}>✦</div>
        <p style={{color:'#6B2D4E',fontWeight:'600'}}>Loading TARSYN...</p>
      </div>
    </div>
  );

  const name = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = name.slice(0,2).toUpperCase();

  const navItems = [
    {id:'dashboard',icon:'📊',label:'Dashboard'},
    {id:'members',icon:'👥',label:'Members'},
    {id:'contributions',icon:'💰',label:'Contributions'},
    {id:'cycles',icon:'🔄',label:'Cycles'},
    {id:'reports',icon:'📋',label:'Reports'},
    {id:'settings',icon:'⚙️',label:'Settings'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex'}}>
      <aside style={{width:'240px',background:'#6B2D4E',display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,height:'100vh',zIndex:100}}>
        <div style={{padding:'24px 20px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{color:'white',fontSize:'18px',fontWeight:'700',letterSpacing:'2px'}}>✦ TARSYN</div>
          <div style={{color:'#D4AF7A',fontSize:'9px',letterSpacing:'2px',marginTop:'2px'}}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
        <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#D4AF7A',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',color:'#6B2D4E',fontSize:'14px',flexShrink:0}}>
            {initials}
          </div>
          <div>
            <div style={{color:'white',fontSize:'13px',fontWeight:'600'}}>{name}</div>
            <div style={{color:'#D4AF7A',fontSize:'10px',letterSpacing:'1px'}}>ADMIN</div>
          </div>
        </div>
        <nav style={{flex:1,padding:'12px 0',overflowY:'auto'}}>
          {navItems.map(item=>(
            <div key={item.id} onClick={()=>setActivePage(item.id)}
              style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 20px',cursor:'pointer',color:activePage===item.id?'#D4AF7A':'rgba(255,255,255,0.75)',background:activePage===item.id?'rgba(212,175,122,0.15)':'transparent',borderLeft:activePage===item.id?'3px solid #D4AF7A':'3px solid transparent',fontSize:'14px',transition:'all 0.15s'}}>
              <span style={{fontSize:'16px'}}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={()=>signOut(auth).then(()=>window.location.href='/login')}
            style={{width:'100%',padding:'9px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',color:'rgba(255,255,255,0.7)',fontSize:'13px',cursor:'pointer'}}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <main style={{marginLeft:'240px',flex:1,display:'flex',flexDirection:'column'}}>
        <div style={{background:'white',borderBottom:'1px solid #D9C0CC',padding:'0 28px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
          <div style={{fontSize:'17px',fontWeight:'600',color:'#6B2D4E',textTransform:'capitalize'}}>{activePage}</div>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#EDD9E5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',cursor:'pointer',position:'relative'}}>
              🔔
              <div style={{width:'8px',height:'8px',background:'#C4748E',borderRadius:'50%',position:'absolute',top:'6px',right:'6px',border:'1.5px solid white'}}></div>
            </div>
            <span style={{fontSize:'11px',fontWeight:'700',padding:'4px 12px',borderRadius:'20px',background:'#6B2D4E',color:'#FAF0E6',letterSpacing:'1px'}}>ADMIN</span>
          </div>
        </div>

        <div style={{padding:'28px',flex:1}}>
          <div style={{background:'#6B2D4E',borderRadius:'14px',padding:'24px 28px',marginBottom:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px'}}>
            <div>
              <h2 style={{color:'white',fontSize:'20px',marginBottom:'4px'}}>Welcome back, <span style={{color:'#D4AF7A'}}>{name}</span> 👋</h2>
              <p style={{color:'rgba(250,240,230,0.7)',fontSize:'13px'}}>Here's what's happening in your community today</p>
            </div>
            <div style={{background:'rgba(212,175,122,0.2)',border:'1px solid rgba(212,175,122,0.4)',color:'#D4AF7A',padding:'8px 18px',borderRadius:'8px',fontSize:'13px',fontWeight:'600',textAlign:'center'}}>
              🔄 Cycle 4 Active<br/>
              <span style={{fontSize:'11px',fontWeight:'400'}}>Next payment in 5 days</span>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'16px',marginBottom:'24px'}}>
            {[
              {label:'ACTIVE MEMBERS',value:'12',sub:'+2 this month',color:'#4A7C59'},
              {label:'CONTRIBUTIONS',value:'$2,400',sub:'9/12 paid',color:'#4A7C59'},
              {label:'NEXT ROTATION',value:'Marie J.',sub:'June 6, 2026',color:'#D4AF7A'},
              {label:'TOTAL TREASURY',value:'$9,600',sub:'Cycle 1–4',color:'#6B2D4E'},
            ].map(s=>(
              <div key={s.label} style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'20px'}}>
                <div style={{fontSize:'11px',color:'#7A5068',marginBottom:'8px',letterSpacing:'0.5px'}}>{s.label}</div>
                <div style={{fontSize:'26px',fontWeight:'700',color:'#6B2D4E',lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:'12px',color:s.color,marginTop:'6px',fontWeight:'600'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
            <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',overflow:'hidden'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid #D9C0CC'}}>
                <span style={{fontSize:'14px',fontWeight:'600',color:'#6B2D4E'}}>👥 Members — Payment Status</span>
              </div>
              {[
                {name:'Marie Jean',status:'Paid',color:'#d4edda',tc:'#155724'},
                {name:'Paul Durand',status:'Paid',color:'#d4edda',tc:'#155724'},
                {name:'Sophie Bernard',status:'Unpaid',color:'#f8d7da',tc:'#721c24'},
                {name:'Karine Morel',status:'Late',color:'#fff3cd',tc:'#856404'},
                {name:'Jacques Louis',status:'Paid',color:'#d4edda',tc:'#155724'},
              ].map(m=>(
                <div key={m.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid #EDD9E5'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#EDD9E5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:'#6B2D4E'}}>
                      {m.name.split(' ').map((n:string)=>n[0]).join('')}
                    </div>
                    <span style={{fontSize:'13px',fontWeight:'600',color:'#2C1A24'}}>{m.name}</span>
                  </div>
                  <span style={{fontSize:'11px',fontWeight:'700',padding:'3px 9px',borderRadius:'20px',background:m.color,color:m.tc}}>{m.status}</span>
                </div>
              ))}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
              <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',overflow:'hidden'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid #D9C0CC'}}>
                  <span style={{fontSize:'14px',fontWeight:'600',color:'#6B2D4E'}}>⚡ Recent Activity</span>
                </div>
                {[
                  {dot:'#4A7C59',text:'Marie Jean paid her contribution — $200',time:'2 hours ago'},
                  {dot:'#D4AF7A',text:'Receipt generated for Paul Durand',time:'5 hours ago'},
                  {dot:'#C4748E',text:'Payment reminder sent to 3 members',time:'Yesterday'},
                  {dot:'#4A7C59',text:'Cycle 4 started — rotation to Marie Jean',time:'June 1, 2026'},
                ].map((a,i)=>(
                  <div key={i} style={{display:'flex',gap:'12px',padding:'12px 20px',borderBottom:'1px solid #EDD9E5'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',background:a.dot,marginTop:'5px',flexShrink:0}}></div>
                    <div>
                      <div style={{fontSize:'13px',color:'#2C1A24'}}>{a.text}</div>
                      <div style={{fontSize:'11px',color:'#7A5068',marginTop:'2px'}}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'16px 20px'}}>
                <div style={{fontSize:'14px',fontWeight:'600',color:'#6B2D4E',marginBottom:'12px'}}>🚀 Quick Actions</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {[
                    {icon:'➕',label:'Add Member'},
                    {icon:'💳',label:'Record Payment'},
                    {icon:'🧾',label:'Generate Receipt'},
                    {icon:'📤',label:'Export Report'},
                  ].map(a=>(
                    <div key={a.label} style={{background:'#FAF0E6',border:'1px solid #D9C0CC',borderRadius:'8px',padding:'12px',textAlign:'center',cursor:'pointer'}}
                      onMouseEnter={e=>(e.currentTarget.style.borderColor='#6B2D4E')}
                      onMouseLeave={e=>(e.currentTarget.style.borderColor='#D9C0CC')}>
                      <div style={{fontSize:'20px',marginBottom:'4px'}}>{a.icon}</div>
                      <div style={{fontSize:'11px',fontWeight:'600',color:'#6B2D4E'}}>{a.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}