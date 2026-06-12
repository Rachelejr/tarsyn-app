$file = "src\app\member\page.tsx"
$content = @'
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function MemberDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', country: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      try {
        const mq = query(collection(db, 'members'), where('userId', '==', u.uid));
        const ms = await getDocs(mq);
        if (!ms.empty) {
          const memberData = { id: ms.docs[0].id, ...ms.docs[0].data() };
          setMember(memberData);
          setEditForm({ name: (memberData as any).name || '', phone: (memberData as any).phone || '', email: (memberData as any).email || '', country: (memberData as any).country || '' });
          const gs = await getDocs(collection(db, 'groups'));
          const groupDoc = gs.docs.find(d => d.id === (memberData as any).groupId);
          if (groupDoc) setGroup({ id: groupDoc.id, ...groupDoc.data() });
          const pq = query(collection(db, 'payments'), where('memberId', '==', ms.docs[0].id));
          const ps = await getDocs(pq);
          setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!member?.id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'members', member.id), { name: editForm.name, phone: editForm.phone, email: editForm.email, country: editForm.country });
      setMember({ ...member, ...editForm });
      setEditMode(false);
      setSaveMsg('Profile updated successfully');
      setTimeout(() => setSaveMsg(''), 4000);
    } catch(e) { console.error(e); } finally { setSaving(false); }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FAF0E6'}}><p style={{color:'#6B2D4E',fontSize:'18px',fontWeight:'600'}}>Loading your account...</p></div>;
  if (!member) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#FAF0E6',flexDirection:'column',gap:'16px'}}><div style={{fontSize:'48px'}}>🔍</div><h2 style={{color:'#6B2D4E',fontSize:'22px',fontWeight:'800',margin:'0'}}>No membership found</h2><p style={{color:'#7A5068',fontSize:'14px',margin:'0'}}>You are not registered as a member in any group.</p><button onClick={() => router.push('/')} style={{background:'#6B2D4E',color:'#FAF0E6',padding:'12px 24px',borderRadius:'12px',border:'none',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Go Home</button></div>;

  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const expectedAmount = group?.contributionSettings?.amount || member?.expectedAmount || 0;
  const remaining = Math.max(0, expectedAmount - totalPaid);
  const cycleProgress = group?.numMembers > 0 ? Math.round((member?.position / group?.numMembers) * 100) : 0;
  const isConfidential = group?.confidential;
  const val = (v: any) => v && v !== '' ? v : 'Not provided';

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'contributions', label: 'Contributions', icon: '💰' },
    { id: 'rotation', label: 'Rotation', icon: '🔄' },
    { id: 'group', label: 'Group', icon: '🏘️' },
    { id: 'notifications', label: 'Alerts', icon: '🔔' },
  ];

  const statusColor = (status: string) => {
    if (status === 'active') return { bg: '#E8F5E9', color: '#2E7D32' };
    if (status === 'pending') return { bg: '#FFF3E0', color: '#E65100' };
    if (status === 'completed') return { bg: '#E3F2FD', color: '#1565C0' };
    return { bg: '#FAF0E6', color: '#7A5068' };
  };

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6'}}>
      <nav style={{background:'#6B2D4E',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 12px rgba(0,0,0,0.15)'}}>
        <div onClick={() => router.push('/')} style={{cursor:'pointer'}}>
          <div style={{color:'#D4AF7A',fontWeight:'800',fontSize:'18px',lineHeight:'1'}}>TARSYN</div>
          <div style={{color:'rgba(250,240,230,0.6)',fontSize:'10px',letterSpacing:'2px'}}>MEMBER PORTAL</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{background:'rgba(212,175,122,0.2)',borderRadius:'20px',padding:'6px 14px'}}>
            <span style={{color:'#D4AF7A',fontSize:'12px',fontWeight:'600',fontFamily:'monospace'}}>{member?.tynId}</span>
          </div>
          <button onClick={() => auth.signOut().then(() => router.push('/'))} style={{background:'transparent',border:'1px solid rgba(212,175,122,0.5)',color:'#D4AF7A',padding:'6px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'12px'}}>Sign Out</button>
        </div>
      </nav>

      <div style={{background:'linear-gradient(135deg,#6B2D4E,#4A1A3A)',padding:'32px 24px'}}>
        <div style={{maxWidth:'800px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'16px'}}>
          <div>
            <p style={{color:'rgba(250,240,230,0.6)',fontSize:'13px',margin:'0 0 4px'}}>Welcome back</p>
            <h1 style={{color:'white',fontSize:'24px',fontWeight:'800',margin:'0 0 8px'}}>{member?.name}</h1>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <span style={{...statusColor(member?.status),padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'}}>{member?.status || 'active'}</span>
              <span style={{background:'rgba(212,175,122,0.2)',color:'#D4AF7A',padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'600'}}>Position #{member?.position}</span>
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.1)',borderRadius:'16px',padding:'20px 24px',textAlign:'center',minWidth:'140px'}}>
            <p style={{color:'rgba(250,240,230,0.6)',fontSize:'11px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>TYN-ID</p>
            <p style={{color:'#D4AF7A',fontSize:'16px',fontWeight:'800',margin:'0',fontFamily:'monospace'}}>{member?.tynId}</p>
          </div>
        </div>
      </div>

      <div style={{maxWidth:'800px',margin:'0 auto',padding:'16px 16px 0'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
          {[
            { label: 'Total Paid', value: `${totalPaid} ${group?.contributionSettings?.currency || ''}`, icon: '✅', color: '#2E7D32', bg: '#E8F5E9' },
            { label: 'Next Payment', value: member?.payoutDate || 'Not set', icon: '📅', color: '#1565C0', bg: '#E3F2FD' },
            { label: 'Payout Date', value: member?.payoutDate || 'Not set', icon: '🎯', color: '#6B2D4E', bg: '#FAF0E6' },
          ].map((s, i) => (
            <div key={i} style={{background:s.bg,borderRadius:'14px',padding:'14px 16px'}}>
              <span style={{fontSize:'20px',display:'block',marginBottom:'4px'}}>{s.icon}</span>
              <p style={{color:'#7A5068',fontSize:'10px',margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'1px'}}>{s.label}</p>
              <p style={{color:s.color,fontSize:'14px',fontWeight:'800',margin:'0'}}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:'white',borderBottom:'1px solid #E8D5E0',position:'sticky',top:0,zIndex:50,marginTop:'16px'}}>
        <div style={{maxWidth:'800px',margin:'0 auto',display:'flex',overflowX:'auto'}}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{padding:'14px 20px',border:'none',background:'transparent',cursor:'pointer',fontSize:'13px',fontWeight:'600',color:activeTab===tab.id?'#6B2D4E':'#7A5068',borderBottom:activeTab===tab.id?'3px solid #6B2D4E':'3px solid transparent',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'6px'}}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:'800px',margin:'0 auto',padding:'24px 16px'}}>
        {saveMsg && <div style={{background:'#E8F5E9',color:'#2E7D32',borderRadius:'10px',padding:'12px 16px',marginBottom:'16px',fontWeight:'600',fontSize:'14px'}}>✅ {saveMsg}</div>}

        {activeTab === 'profile' && (
          <div>
            <div style={{background:'white',borderRadius:'20px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',marginBottom:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                <h3 style={{color:'#6B2D4E',fontSize:'16px',fontWeight:'700',margin:'0'}}>👤 My Profile</h3>
                {!editMode && <button onClick={() => setEditMode(true)} style={{background:'#FAF0E6',color:'#6B2D4E',border:'1px solid #D4AF7A',borderRadius:'8px',padding:'6px 14px',fontSize:'12px',fontWeight:'700',cursor:'pointer'}}>Edit Profile</button>}
              </div>
              {!editMode ? (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                  {[
                    { label: 'Full Name', value: val(member?.name) },
                    { label: 'TYN-ID', value: val(member?.tynId), mono: true },
                    { label: 'Country', value: val(member?.country) },
                    { label: 'Phone', value: val(member?.phone) },
                    { label: 'Email', value: val(member?.email) },
                    { label: 'Position', value: `#${member?.position}` },
                    { label: 'Role', value: val(member?.role) },
                    { label: 'Member Type', value: val(member?.memberType) },
                    { label: 'Status', value: val(member?.status) },
                  ].map(item => (
                    <div key={item.label} style={{background:'#FAF0E6',borderRadius:'12px',padding:'14px 16px'}}>
                      <p style={{color:'#7A5068',fontSize:'11px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{item.label}</p>
                      <p style={{color:'#6B2D4E',fontWeight:'700',fontSize:'14px',margin:'0',fontFamily:(item as any).mono?'monospace':'inherit'}}>{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{background:'#FFF8E7',border:'1px solid #D4AF7A',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'#7A5068'}}>
                    TYN-ID, Position, Role, Status and Member Type cannot be changed.
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
                    {[{label:'Full Name',key:'name'},{label:'Phone',key:'phone'},{label:'Email',key:'email'},{label:'Country',key:'country'}].map(field => (
                      <div key={field.key}>
                        <label style={{display:'block',color:'#7A5068',fontSize:'11px',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'1px'}}>{field.label}</label>
                        <input value={(editForm as any)[field.key]} onChange={e => setEditForm({...editForm,[field.key]:e.target.value})} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #D4AF7A',borderRadius:'10px',fontSize:'14px',color:'#333',background:'#FAF0E6',outline:'none',boxSizing:'border-box'}} />
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
                    {[{label:'TYN-ID',value:member?.tynId},{label:'Position',value:`#${member?.position}`},{label:'Role',value:member?.role},{label:'Status',value:member?.status}].map(item => (
                      <div key={item.label} style={{background:'#F0F0F0',borderRadius:'12px',padding:'14px 16px',opacity:0.7}}>
                        <p style={{color:'#7A5068',fontSize:'11px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{item.label} (locked)</p>
                        <p style={{color:'#999',fontWeight:'700',fontSize:'14px',margin:'0'}}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={() => setEditMode(false)} style={{flex:1,padding:'10px',background:'transparent',color:'#6B2D4E',border:'2px solid #6B2D4E',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>Cancel</button>
                    <button onClick={handleSaveProfile} disabled={saving} style={{flex:1,padding:'10px',background:'#6B2D4E',color:'#FAF0E6',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer',opacity:saving?0.7:1}}>{saving?'Saving...':'Save Changes'}</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{background:'linear-gradient(135deg,#6B2D4E,#D4AF7A)',borderRadius:'20px',padding:'28px',boxShadow:'0 4px 20px rgba(107,45,78,0.25)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
                <div>
                  <p style={{color:'rgba(250,240,230,0.7)',fontSize:'11px',margin:'0 0 4px',letterSpacing:'2px'}}>TARSYN MEMBER</p>
                  <p style={{color:'white',fontSize:'20px',fontWeight:'800',margin:'0'}}>{member?.name}</p>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                <div>
                  <p style={{color:'rgba(250,240,230,0.7)',fontSize:'11px',margin:'0 0 4px'}}>TYN-ID</p>
                  <p style={{color:'white',fontSize:'16px',fontWeight:'800',margin:'0',fontFamily:'monospace',letterSpacing:'2px'}}>{member?.tynId}</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{color:'rgba(250,240,230,0.7)',fontSize:'11px',margin:'0 0 4px'}}>POSITION</p>
                  <p style={{color:'white',fontSize:'20px',fontWeight:'800',margin:'0'}}>#{member?.position}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contributions' && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px',marginBottom:'20px'}}>
              {[
                { label: 'Total Paid', value: `${totalPaid}`, icon: '✅', color: '#2E7D32', bg: '#E8F5E9' },
                { label: 'Remaining', value: `${remaining}`, icon: '⏳', color: '#E65100', bg: '#FFF3E0' },
                { label: 'Payments', value: payments.length, icon: '📋', color: '#6B2D4E', bg: '#FAF0E6' },
                { label: 'Next Payment', value: member?.payoutDate || 'Not set', icon: '📅', color: '#1565C0', bg: '#E3F2FD' },
              ].map((s, i) => (
                <div key={i} style={{background:s.bg,borderRadius:'16px',padding:'20px'}}>
                  <span style={{fontSize:'24px',marginBottom:'8px',display:'block'}}>{s.icon}</span>
                  <p style={{color:'#7A5068',fontSize:'11px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{s.label}</p>
                  <p style={{color:s.color,fontSize:'20px',fontWeight:'800',margin:'0'}}>{s.value}</p>
                </div>
              ))}
            </div>
            {expectedAmount > 0 && (
              <div style={{background:'white',borderRadius:'16px',padding:'20px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                  <span style={{color:'#6B2D4E',fontWeight:'600',fontSize:'14px'}}>Payment Progress</span>
                  <span style={{color:'#6B2D4E',fontWeight:'800',fontSize:'14px'}}>{Math.round((totalPaid/expectedAmount)*100)}%</span>
                </div>
                <div style={{background:'#FAF0E6',borderRadius:'8px',height:'10px',overflow:'hidden'}}>
                  <div style={{width:`${Math.min((totalPaid/expectedAmount)*100,100)}%`,height:'100%',background:'linear-gradient(90deg,#6B2D4E,#D4AF7A)',borderRadius:'8px'}}/>
                </div>
              </div>
            )}
            <div style={{background:'white',borderRadius:'20px',padding:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
              <h3 style={{color:'#6B2D4E',fontSize:'16px',fontWeight:'700',margin:'0 0 20px'}}>💳 Payment History</h3>
              {payments.length === 0 ? (
                <div style={{textAlign:'center',padding:'32px',color:'#7A5068'}}>
                  <p style={{fontSize:'32px',margin:'0 0 8px'}}>💸</p>
                  <p style={{fontSize:'14px',margin:'0'}}>No payments recorded yet.</p>
                </div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #FAF0E6'}}>
                      {['Receipt','Amount','Method','Date','Status'].map(h => (
                        <th key={h} style={{textAlign:'left',padding:'8px 10px',color:'#7A5068',fontSize:'11px',textTransform:'uppercase',letterSpacing:'1px'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.id} style={{borderBottom:'1px solid #FAF0E6',background:i%2===0?'transparent':'#FDFAF7'}}>
                        <td style={{padding:'10px',color:'#6B2D4E',fontFamily:'monospace',fontSize:'11px'}}>{p.receiptNumber || 'Not provided'}</td>
                        <td style={{padding:'10px',color:'#2E7D32',fontWeight:'700',fontSize:'13px'}}>{p.amount} {p.currency}</td>
                        <td style={{padding:'10px',color:'#7A5068',fontSize:'12px'}}>{p.paymentMethod || 'Not provided'}</td>
                        <td style={{padding:'10px',color:'#7A5068',fontSize:'12px'}}>{p.paymentDate || 'Not provided'}</td>
                        <td style={{padding:'10px'}}>
                          <span style={{background:p.status==='confirmed'?'#E8F5E9':'#FFF3E0',color:p.status==='confirmed'?'#2E7D32':'#E65100',padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'600'}}>{p.status||'confirmed'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rotation' && (
          <div>
            <div style={{background:'linear-gradient(135deg,#6B2D4E,#8B3D6E)',borderRadius:'20px',padding:'28px',marginBottom:'16px',color:'white'}}>
              <h3 style={{color:'#D4AF7A',fontSize:'14px',fontWeight:'600',margin:'0 0 16px',textTransform:'uppercase',letterSpacing:'1px'}}>My Rotation</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                <div><p style={{color:'rgba(250,240,230,0.6)',fontSize:'12px',margin:'0 0 4px'}}>My Position</p><p style={{color:'white',fontSize:'32px',fontWeight:'800',margin:'0'}}>#{member?.position}</p></div>
                <div><p style={{color:'rgba(250,240,230,0.6)',fontSize:'12px',margin:'0 0 4px'}}>Payout Date</p><p style={{color:'#D4AF7A',fontSize:'18px',fontWeight:'800',margin:'0'}}>{member?.payoutDate||'Not set'}</p></div>
                <div><p style={{color:'rgba(250,240,230,0.6)',fontSize:'12px',margin:'0 0 4px'}}>Expected Payout</p><p style={{color:'white',fontSize:'18px',fontWeight:'800',margin:'0'}}>{member?.expectedAmount?`${member.expectedAmount} ${group?.contributionSettings?.currency||''}`:'Not provided'}</p></div>
                <div><p style={{color:'rgba(250,240,230,0.6)',fontSize:'12px',margin:'0 0 4px'}}>Group Members</p><p style={{color:'white',fontSize:'18px',fontWeight:'800',margin:'0'}}>{group?.numMembers||group?.memberCount||'Not provided'}</p></div>
              </div>
            </div>
            <div style={{background:'white',borderRadius:'20px',padding:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
              <h3 style={{color:'#6B2D4E',fontSize:'16px',fontWeight:'700',margin:'0 0 16px'}}>📊 Cycle Progress</h3>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <span style={{color:'#7A5068',fontSize:'13px'}}>Your turn in rotation</span>
                <span style={{color:'#6B2D4E',fontWeight:'800',fontSize:'13px'}}>Position {member?.position} of {group?.numMembers||'?'}</span>
              </div>
              <div style={{background:'#FAF0E6',borderRadius:'8px',height:'12px',overflow:'hidden',marginBottom:'8px'}}>
                <div style={{width:`${cycleProgress}%`,height:'100%',background:'linear-gradient(90deg,#6B2D4E,#D4AF7A)',borderRadius:'8px'}}/>
              </div>
              <p style={{color:'#7A5068',fontSize:'12px',margin:'0'}}>Contribution streak: {payments.filter(p=>p.status==='confirmed').length} confirmed payments</p>
            </div>
          </div>
        )}

        {activeTab === 'group' && (
          <div style={{background:'white',borderRadius:'20px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <h3 style={{color:'#6B2D4E',fontSize:'16px',fontWeight:'700',margin:'0 0 20px'}}>🏘️ Group Information</h3>
            {group ? (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
                  {[
                    {label:'Group Name',value:val(group?.name)},
                    {label:'Module',value:val(group?.module||group?.regionalName)},
                    {label:'Total Members',value:val(group?.numMembers||group?.memberCount)},
                    {label:'Frequency',value:val(group?.frequency||group?.contributionSettings?.frequency)},
                    {label:'Contribution',value:group?.contributionSettings?.amount?`${group.contributionSettings.amount} ${group.contributionSettings.currency}`:'Not provided'},
                    {label:'Privacy',value:val(group?.privacy||group?.privacyMode)},
                    {label:'Status',value:val(group?.status)},
                    {label:'Start Date',value:val(group?.startDate||group?.rotationSettings?.startDate)},
                  ].map(item => (
                    <div key={item.label} style={{background:'#FAF0E6',borderRadius:'12px',padding:'14px 16px'}}>
                      <p style={{color:'#7A5068',fontSize:'11px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{item.label}</p>
                      <p style={{color:'#6B2D4E',fontWeight:'700',fontSize:'14px',margin:'0'}}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {isConfidential && (
                  <div style={{background:'#2C1A3E',borderRadius:'12px',padding:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
                    <span style={{fontSize:'20px'}}>🔒</span>
                    <div>
                      <p style={{color:'#D4AF7A',fontWeight:'700',fontSize:'13px',margin:'0 0 4px'}}>Confidential Mode Active</p>
                      <p style={{color:'rgba(250,240,230,0.6)',fontSize:'12px',margin:'0'}}>Member identities are protected.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : <p style={{color:'#7A5068',fontSize:'14px'}}>Group information not available.</p>}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{background:'white',borderRadius:'20px',padding:'28px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <h3 style={{color:'#6B2D4E',fontSize:'16px',fontWeight:'700',margin:'0 0 20px'}}>🔔 My Alerts</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {member?.payoutDate && <div style={{background:'#E8F5E9',borderRadius:'12px',padding:'16px',display:'flex',gap:'12px'}}><span style={{fontSize:'24px'}}>🎉</span><div><p style={{color:'#2E7D32',fontWeight:'700',fontSize:'14px',margin:'0 0 4px'}}>Your Payout is Scheduled</p><p style={{color:'#388E3C',fontSize:'13px',margin:'0'}}>Your turn is on <strong>{member.payoutDate}</strong> - Position #{member.position}</p></div></div>}
              {remaining > 0 && <div style={{background:'#FFF3E0',borderRadius:'12px',padding:'16px',display:'flex',gap:'12px'}}><span style={{fontSize:'24px'}}>⏰</span><div><p style={{color:'#E65100',fontWeight:'700',fontSize:'14px',margin:'0 0 4px'}}>Payment Reminder</p><p style={{color:'#EF6C00',fontSize:'13px',margin:'0'}}>Remaining balance: <strong>{remaining}</strong></p></div></div>}
              {payments.length === 0 && <div style={{background:'#E3F2FD',borderRadius:'12px',padding:'16px',display:'flex',gap:'12px'}}><span style={{fontSize:'24px'}}>👋</span><div><p style={{color:'#1565C0',fontWeight:'700',fontSize:'14px',margin:'0 0 4px'}}>Welcome to TARSYN!</p><p style={{color:'#1976D2',fontSize:'13px',margin:'0'}}>Your membership is active. Your organizer will record your contributions.</p></div></div>}
              {payments.filter(p=>p.status==='confirmed').length > 0 && <div style={{background:'#FAF0E6',borderRadius:'12px',padding:'16px',display:'flex',gap:'12px'}}><span style={{fontSize:'24px'}}>✅</span><div><p style={{color:'#6B2D4E',fontWeight:'700',fontSize:'14px',margin:'0 0 4px'}}>Contribution Streak</p><p style={{color:'#7A5068',fontSize:'13px',margin:'0'}}>{payments.filter(p=>p.status==='confirmed').length} confirmed payments - Keep it up!</p></div></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText("$PWD\$file", $content, [System.Text.UTF8Encoding]::new($false))
git add .
git commit -m "Improve member page - edit profile, not provided, quick summary"
git push
