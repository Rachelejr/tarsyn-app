'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';

export default function AdminPage() {
  const [user, setUser]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [groups, setGroups]       = useState<any[]>([]);
  const [members, setMembers]     = useState<any[]>([]);
  const [payments, setPayments]   = useState<any[]>([]);
  const [activePage, setActivePage] = useState('overview');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || u.email !== SUPER_ADMIN_EMAIL) {
        window.location.href = '/dashboard';
        return;
      }
      setUser(u);
      await loadData();
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loadData = async () => {
    try {
      // Load all groups
      const groupsSnap = await getDocs(collection(db, 'groups'));
      const groupsData: any[] = [];
      const membersData: any[] = [];
      const paymentsData: any[] = [];

      for (const groupDoc of groupsSnap.docs) {
        const group = { id: groupDoc.id, ...groupDoc.data() };
        groupsData.push(group);

        // Load members for each group
        const membersSnap = await getDocs(collection(db, `groups/${groupDoc.id}/members`));
        membersSnap.docs.forEach(m => membersData.push({ ...m.data(), groupId: groupDoc.id }));

        // Load payments for each group
        const paymentsSnap = await getDocs(collection(db, `groups/${groupDoc.id}/payments`));
        paymentsSnap.docs.forEach(p => paymentsData.push({ ...p.data(), groupId: groupDoc.id }));
      }

      setGroups(groupsData);
      setMembers(membersData);
      setPayments(paymentsData);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0) * 0.005, 0);

  if (loading) {
    return (
      <div style={{minHeight:'100vh',background:'#FBEEDD',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'16px'}}>⏳</div>
          <p style={{color:'#6B2D4E',fontSize:'16px'}}>Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'groups', label: 'Groups', icon: '👥' },
    { id: 'members', label: 'Members', icon: '👤' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#2C1020',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:'#2C1020',borderBottom:'1px solid #3A1830',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'40px',height:'40px',background:'#E9C77B',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>✦</div>
          <div>
            <div style={{color:'#E9C77B',fontSize:'18px',fontWeight:'800',letterSpacing:'2px'}}>TARSYN</div>
            <div style={{color:'rgba(233,199,123,0.6)',fontSize:'10px',letterSpacing:'2px'}}>SUPER ADMIN PANEL</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <div style={{background:'#3A1830',borderRadius:'20px',padding:'6px 14px',fontSize:'12px',color:'#E9C77B'}}>
            🔐 {user?.email}
          </div>
          <button onClick={()=>signOut(auth).then(()=>window.location.href='/login')}
            style={{background:'#6B2D4E',color:'#FBEEDD',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',cursor:'pointer'}}>
            Sign Out
          </button>
          <a href="/dashboard" style={{background:'#E9C77B',color:'#2C1020',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',cursor:'pointer',textDecoration:'none',fontWeight:'700'}}>
            → Dashboard
          </a>
        </div>
      </div>

      <div style={{display:'flex',flex:1}}>
        {/* Sidebar */}
        <div style={{width:'220px',background:'#2C1020',borderRight:'1px solid #3A1830',padding:'24px 0'}}>
          {navItems.map(item => (
            <button key={item.id} onClick={()=>setActivePage(item.id)}
              style={{width:'100%',padding:'14px 24px',background:activePage===item.id?'#6B2D4E':'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',color:activePage===item.id?'#FBEEDD':'rgba(251,238,221,0.5)',fontSize:'14px',fontWeight:activePage===item.id?'700':'400',textAlign:'left'}}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div style={{flex:1,padding:'32px',overflowY:'auto'}}>

          {/* OVERVIEW */}
          {activePage === 'overview' && (
            <div>
              <h1 style={{color:'#E9C77B',fontSize:'24px',fontWeight:'800',marginBottom:'8px'}}>Platform Overview</h1>
              <p style={{color:'rgba(251,238,221,0.5)',fontSize:'14px',marginBottom:'32px'}}>Welcome back, Super Admin.</p>

              {/* Stats Cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'20px',marginBottom:'32px'}}>
                {[
                  { label: 'Total Groups', value: groups.length, icon: '👥', color: '#6B2D4E' },
                  { label: 'Total Members', value: members.length, icon: '👤', color: '#4A7C59' },
                  { label: 'Total Payments', value: payments.length, icon: '💳', color: '#E9C77B' },
                  { label: 'TARSYN Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: '💰', color: '#8B3A5E' },
                ].map((stat, i) => (
                  <div key={i} style={{background:'#2C1020',border:`1px solid ${stat.color}`,borderRadius:'16px',padding:'24px'}}>
                    <div style={{fontSize:'32px',marginBottom:'8px'}}>{stat.icon}</div>
                    <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginBottom:'4px'}}>{stat.label}</div>
                    <div style={{color:'#FBEEDD',fontSize:'28px',fontWeight:'800'}}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Recent Groups */}
              <div style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'16px',padding:'24px'}}>
                <h2 style={{color:'#E9C77B',fontSize:'18px',fontWeight:'700',marginBottom:'16px'}}>Recent Groups</h2>
                {groups.length === 0 ? (
                  <p style={{color:'rgba(251,238,221,0.5)',fontSize:'14px'}}>No groups yet.</p>
                ) : (
                  groups.slice(0, 5).map((g, i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #3A1830'}}>
                      <span style={{color:'#FBEEDD',fontSize:'14px'}}>{g.id}</span>
                      <span style={{color:'#E9C77B',fontSize:'12px'}}>Active</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* GROUPS */}
          {activePage === 'groups' && (
            <div>
              <h1 style={{color:'#E9C77B',fontSize:'24px',fontWeight:'800',marginBottom:'24px'}}>All Groups ({groups.length})</h1>
              {groups.length === 0 ? (
                <div style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'16px',padding:'40px',textAlign:'center'}}>
                  <div style={{fontSize:'48px',marginBottom:'16px'}}>👥</div>
                  <p style={{color:'rgba(251,238,221,0.5)'}}>No groups created yet.</p>
                </div>
              ) : (
                groups.map((g, i) => (
                  <div key={i} style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'12px',padding:'20px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{color:'#FBEEDD',fontSize:'16px',fontWeight:'700'}}>{g.id}</div>
                      <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginTop:'4px'}}>Group ID</div>
                    </div>
                    <div style={{background:'#4A7C59',color:'white',borderRadius:'20px',padding:'4px 12px',fontSize:'12px'}}>Active</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MEMBERS */}
          {activePage === 'members' && (
            <div>
              <h1 style={{color:'#E9C77B',fontSize:'24px',fontWeight:'800',marginBottom:'24px'}}>All Members ({members.length})</h1>
              {members.length === 0 ? (
                <div style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'16px',padding:'40px',textAlign:'center'}}>
                  <div style={{fontSize:'48px',marginBottom:'16px'}}>👤</div>
                  <p style={{color:'rgba(251,238,221,0.5)'}}>No members yet.</p>
                </div>
              ) : (
                members.map((m, i) => (
                  <div key={i} style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'12px',padding:'20px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{color:'#FBEEDD',fontSize:'16px',fontWeight:'700'}}>{m.name || 'Unknown'}</div>
                      <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginTop:'4px'}}>Group: {m.groupId}</div>
                    </div>
                    <div style={{color:'#E9C77B',fontSize:'14px',fontWeight:'700'}}>{m.id}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PAYMENTS */}
          {activePage === 'payments' && (
            <div>
              <h1 style={{color:'#E9C77B',fontSize:'24px',fontWeight:'800',marginBottom:'24px'}}>All Payments ({payments.length})</h1>
              {payments.length === 0 ? (
                <div style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'16px',padding:'40px',textAlign:'center'}}>
                  <div style={{fontSize:'48px',marginBottom:'16px'}}>💰</div>
                  <p style={{color:'rgba(251,238,221,0.5)'}}>No payments yet.</p>
                </div>
              ) : (
                payments.map((p, i) => (
                  <div key={i} style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'12px',padding:'20px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{color:'#FBEEDD',fontSize:'16px',fontWeight:'700'}}>${p.amount || 0}</div>
                      <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginTop:'4px'}}>Group: {p.groupId}</div>
                    </div>
                    <div style={{color:'#4A7C59',fontSize:'13px',fontWeight:'700'}}>TARSYN fee: ${((p.amount||0)*0.005).toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activePage === 'settings' && (
            <div>
              <h1 style={{color:'#E9C77B',fontSize:'24px',fontWeight:'800',marginBottom:'24px'}}>Platform Settings</h1>
              <div style={{background:'#2C1020',border:'1px solid #3A1830',borderRadius:'16px',padding:'24px'}}>
                <div style={{marginBottom:'20px'}}>
                  <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginBottom:'4px'}}>Super Admin Email</div>
                  <div style={{color:'#FBEEDD',fontSize:'16px'}}>{SUPER_ADMIN_EMAIL}</div>
                </div>
                <div style={{marginBottom:'20px'}}>
                  <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginBottom:'4px'}}>Platform Fee</div>
                  <div style={{color:'#E9C77B',fontSize:'16px',fontWeight:'700'}}>0.5% per distribution</div>
                </div>
                <div style={{marginBottom:'20px'}}>
                  <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginBottom:'4px'}}>Platform Domain</div>
                  <div style={{color:'#FBEEDD',fontSize:'16px'}}>tarsyn-app.com</div>
                </div>
                <div>
                  <div style={{color:'rgba(251,238,221,0.5)',fontSize:'12px',marginBottom:'4px'}}>Version</div>
                  <div style={{color:'#FBEEDD',fontSize:'16px'}}>1.0.0</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
