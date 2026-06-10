'use client';
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc,
  query, where, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

//  CONSTANTS 

const CURRENCIES = [
  {code:'USD',symbol:'$',name:'US Dollar'},
  {code:'HTG',symbol:'G',name:'Gourde Hatienne'},
  {code:'EUR',symbol:'',name:'Euro'},
  {code:'CAD',symbol:'CA$',name:'Dollar Canadien'},
  {code:'XOF',symbol:'CFA',name:'Franc CFA'},
  {code:'GBP',symbol:'',name:'Livre Sterling'},
  {code:'BRL',symbol:'R$',name:'Real Brsilien'},
  {code:'MXN',symbol:'MX$',name:'Peso Mexicain'},
  {code:'CDF',symbol:'FC',name:'Franc Congolais'},
  {code:'INR',symbol:'',name:'Roupie Indienne'},
  {code:'PHP',symbol:'',name:'Peso Philippin'},
  {code:'BTC',symbol:'',name:'Bitcoin'},
  {code:'ETH',symbol:'',name:'Ethereum'},
  {code:'USDT',symbol:'USDT',name:'Tether USDT'},
  {code:'USDC',symbol:'USDC',name:'USD Coin'},
];

const FREQUENCIES = [
  {id:'weekly',label:'Weekly',desc:'Every week'},
  {id:'biweekly',label:'Bi-weekly',desc:'Every 2 weeks'},
  {id:'monthly',label:'Monthly',desc:'Every month'},
  {id:'quarterly',label:'Quarterly',desc:'Every 3 months'},
  {id:'biannual',label:'Bi-annual',desc:'Every 6 months'},
  {id:'annual',label:'Annual',desc:'Once a year'},
];

const NAV_ITEMS = [
  {id:'dashboard',label:'Dashboard'},
  {id:'members',label:'Members'},
  {id:'cycles',label:'Cycles'},
  {id:'documents',label:'Documents'},
  {id:'reports',label:'Reports'},
  {id:'alerts',label:'Alerts'},
  {id:'settings',label:'Settings'},
];

const S = {
  bordeaux: '#6B2D4E',
  gold: '#D4AF7A',
  cream: '#FAF0E6',
  rose: '#EDD9E5',
  border: '#D9C0CC',
  text: '#2C1A24',
  muted: '#7A5068',
  green: '#4A7C59',
  lightGreen: '#d4edda',
  darkGreen: '#155724',
};

//  TYPES 

interface Group {
  id: string;
  name: string;
  adminId: string;
  adminName: string;
  currency: string;
  currencySymbol: string;
  frequency: string;
  contributionAmount: number;
  maxMembers: number;
  reservePercent: number;
  commissionRate: number;
  confidentialMode: boolean;
  createdAt: any;
}

interface Member {
  id: string;
  tynId: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  position: number;
  status: 'Paid' | 'Unpaid' | 'Late';
  score: number;
  groupId: string;
  joinedAt: any;
}

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  text: string;
  createdAt: any;
  read: boolean;
}

interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  tynId: string;
  amount: number;
  method: string;
  cycleNumber: number;
  note?: string;
  groupId: string;
  createdAt: any;
}

//  MAIN COMPONENT 

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');

  // Group state
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [hasGroup, setHasGroup] = useState(false);

  // UI state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showSendAlert, setShowSendAlert] = useState(false);
  const [settingsTab, setSettingsTab] = useState('group');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string|null>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  // Form state
  const [groupForm, setGroupForm] = useState({
    name: '', currency: 'USD', currencySymbol: '$', frequency: 'monthly',
    contributionAmount: '', maxMembers: '', reservePercent: '5', commissionRate: '1',
  });
  const [memberForm, setMemberForm] = useState({name:'',email:'',phone:'',country:''});
  const [paymentForm, setPaymentForm] = useState({memberId:'',amount:'',method:'Cash',note:'',cycleNumber:'1'});
  const [alertForm, setAlertForm] = useState({type:'info',text:''});
  const [settingsForm, setSettingsForm] = useState<Partial<Group>>({});

  //  AUTH 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { window.location.href = '/login'; return; }
      setUser(u);
      await loadGroup(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Close currency dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setShowCurrencyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  //  FIREBASE LOADERS 

  const loadGroup = async (uid: string) => {
    try {
      const q = query(collection(db, 'groups'), where('adminId', '==', uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const groupDoc = snap.docs[0];
        const g = { id: groupDoc.id, ...groupDoc.data() } as Group;
        setGroup(g);
        setHasGroup(true);
        setSettingsForm(g);
        await loadMembers(groupDoc.id);
        await loadAlerts(groupDoc.id);
        await loadPayments(groupDoc.id);
      } else {
        setHasGroup(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMembers = async (groupId: string) => {
    const q = query(collection(db, 'members'), where('groupId', '==', groupId), orderBy('position'));
    const snap = await getDocs(q);
    setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Member));
  };

  const loadAlerts = async (groupId: string) => {
    const q = query(collection(db, 'alerts'), where('groupId', '==', groupId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Alert));
  };

  const loadPayments = async (groupId: string) => {
    const q = query(collection(db, 'payments'), where('groupId', '==', groupId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Payment));
  };

  //  ACTIONS 

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const createGroup = async () => {
    if (!groupForm.name || !groupForm.contributionAmount || !groupForm.maxMembers) {
      showToast('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      const cur = CURRENCIES.find(c => c.code === groupForm.currency) || CURRENCIES[0];
      const docRef = await addDoc(collection(db, 'groups'), {
        name: groupForm.name,
        adminId: user.uid,
        adminName: user.displayName || user.email?.split('@')[0] || 'Admin',
        currency: groupForm.currency,
        currencySymbol: cur.symbol,
        frequency: groupForm.frequency,
        contributionAmount: Number(groupForm.contributionAmount),
        maxMembers: Number(groupForm.maxMembers),
        reservePercent: Number(groupForm.reservePercent),
        commissionRate: Number(groupForm.commissionRate),
        confidentialMode: true,
        createdAt: serverTimestamp(),
      });
      await loadGroup(user.uid);
      setShowCreateGroup(false);
      showToast('Group created successfully!');
    } catch (e) {
      showToast('Error creating group'); console.error(e);
    }
    setSaving(false);
  };

  const addMember = async () => {
    if (!memberForm.name || !memberForm.email || !group) {
      showToast('Name and email are required'); return;
    }
    setSaving(true);
    try {
      const nextPosition = members.length + 1;
      const tynId = `TYN-${String(nextPosition).padStart(6, '0')}`;
      await addDoc(collection(db, 'members'), {
        tynId,
        name: memberForm.name,
        email: memberForm.email,
        phone: memberForm.phone || '',
        country: memberForm.country || '',
        position: nextPosition,
        status: 'Unpaid',
        score: 100,
        groupId: group.id,
        joinedAt: serverTimestamp(),
      });
      // Auto alert
      await addDoc(collection(db, 'alerts'), {
        groupId: group.id,
        type: 'info',
        text: `New member added  ${tynId} assigned. Invitation sent to ${memberForm.email}.`,
        createdAt: serverTimestamp(),
        read: false,
      });
      await loadMembers(group.id);
      await loadAlerts(group.id);
      setShowAddMember(false);
      setMemberForm({name:'',email:'',phone:'',country:''});
      showToast(`Member added  ID: ${tynId}`);
    } catch (e) {
      showToast('Error adding member'); console.error(e);
    }
    setSaving(false);
  };

  const recordPayment = async () => {
    if (!paymentForm.memberId || !paymentForm.amount || !group) {
      showToast('Select a member and enter amount'); return;
    }
    setSaving(true);
    try {
      const member = members.find(m => m.id === paymentForm.memberId);
      if (!member) return;
      await addDoc(collection(db, 'payments'), {
        memberId: member.id,
        memberName: member.name,
        tynId: member.tynId,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        cycleNumber: Number(paymentForm.cycleNumber),
        note: paymentForm.note || '',
        groupId: group.id,
        createdAt: serverTimestamp(),
      });
      // Update member status
      await updateDoc(doc(db, 'members', member.id), { status: 'Paid', score: Math.min(member.score + 5, 100) });
      // Auto alert
      await addDoc(collection(db, 'alerts'), {
        groupId: group.id,
        type: 'success',
        text: `Payment of ${group.currencySymbol}${paymentForm.amount} recorded for ${member.tynId}.`,
        createdAt: serverTimestamp(),
        read: false,
      });
      await loadMembers(group.id);
      await loadAlerts(group.id);
      await loadPayments(group.id);
      setShowRecordPayment(false);
      setPaymentForm({memberId:'',amount:'',method:'Cash',note:'',cycleNumber:'1'});
      showToast('Payment recorded!');
    } catch (e) {
      showToast('Error recording payment'); console.error(e);
    }
    setSaving(false);
  };

  const sendAlert = async () => {
    if (!alertForm.text || !group) { showToast('Enter alert message'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        groupId: group.id,
        type: alertForm.type,
        text: alertForm.text,
        createdAt: serverTimestamp(),
        read: false,
      });
      await loadAlerts(group.id);
      setShowSendAlert(false);
      setAlertForm({type:'info',text:''});
      showToast('Alert sent!');
    } catch (e) {
      showToast('Error sending alert'); console.error(e);
    }
    setSaving(false);
  };

  const saveSettings = async () => {
    if (!group) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'groups', group.id), settingsForm);
      await loadGroup(user.uid);
      showToast('Settings saved!');
    } catch (e) {
      showToast('Error saving settings');
    }
    setSaving(false);
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'alerts', alertId), { read: true });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) {}
  };

  //  DERIVED 

  const adminName = user?.displayName || user?.email?.split('@')[0] || 'Admin';
  const adminInitials = adminName.slice(0, 2).toUpperCase();
  const sym = group?.currencySymbol || '$';
  const paidCount = members.filter(m => m.status === 'Paid').length;
  const totalTreasury = payments.reduce((sum, p) => sum + p.amount, 0);
  const commissionEarned = totalTreasury * (group?.commissionRate || 1) / 100;
  const reserveFund = totalTreasury * (group?.reservePercent || 5) / 100;
  const unreadAlerts = alerts.filter(a => !a.read);

  //  SHARED UI 

  const Modal = ({ title, onClose, children, wide = false }: any) => (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'32px',maxWidth:wide?'700px':'480px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <h3 style={{color:S.bordeaux,fontSize:'20px',fontWeight:'700',margin:0}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer',color:S.muted,lineHeight:1}}></button>
        </div>
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value, onChange, type = 'text', placeholder = '', required = false }: any) => (
    <div style={{marginBottom:'14px'}}>
      <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>{label}{required && ' *'}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box',color:S.text}} />
    </div>
  );

  const Btn = ({ onClick, children, variant = 'primary', disabled = false, style = {} }: any) => (
    <button onClick={onClick} disabled={disabled}
      style={{padding:'10px 20px',background:variant==='primary'?S.bordeaux:variant==='danger'?'#C4748E':'white',color:variant==='ghost'?S.bordeaux:'white',border:variant==='ghost'?`1.5px solid ${S.border}`:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.6:1,...style}}>
      {children}
    </button>
  );

  const StatCard = ({ label, value, sub }: any) => (
    <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',padding:'16px 18px'}}>
      <div style={{fontSize:'11px',color:S.muted,marginBottom:'6px',letterSpacing:'0.5px',fontWeight:'600'}}>{label}</div>
      <div style={{fontSize:'22px',fontWeight:'800',color:S.bordeaux}}>{value}</div>
      {sub && <div style={{fontSize:'11px',color:'#C4748E',marginTop:'4px',fontWeight:'600'}}>{sub}</div>}
    </div>
  );

  //  LOADING 

  if (loading) return (
    <div style={{minHeight:'100vh',background:S.cream,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'56px',height:'56px',background:S.bordeaux,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:S.gold,fontWeight:'700'}}>T</div>
        <p style={{color:S.bordeaux,fontWeight:'600'}}>Loading TARSYN...</p>
      </div>
    </div>
  );

  //  NO GROUP YET 

  if (!hasGroup) return (
    <div style={{minHeight:'100vh',background:S.cream,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      {showCreateGroup && (
        <Modal title="Create Your Group" onClose={() => setShowCreateGroup(false)}>
          <Field label="Group Name" value={groupForm.name} onChange={(e:any) => setGroupForm({...groupForm,name:e.target.value})} placeholder="Sol Group 2026" required />
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Currency *</label>
            <select value={groupForm.currency} onChange={(e:any) => {
              const cur = CURRENCIES.find(c => c.code === e.target.value)!;
              setGroupForm({...groupForm, currency: cur.code, currencySymbol: cur.symbol});
            }} style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',color:S.text}}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}  {c.name}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Payment Frequency *</label>
            <select value={groupForm.frequency} onChange={(e:any) => setGroupForm({...groupForm,frequency:e.target.value})}
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',color:S.text}}>
              {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}  {f.desc}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <Field label="Contribution Amount" value={groupForm.contributionAmount} onChange={(e:any) => setGroupForm({...groupForm,contributionAmount:e.target.value})} type="number" placeholder="200" required />
            <Field label="Max Members" value={groupForm.maxMembers} onChange={(e:any) => setGroupForm({...groupForm,maxMembers:e.target.value})} type="number" placeholder="8" required />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <Field label="Reserve Fund %" value={groupForm.reservePercent} onChange={(e:any) => setGroupForm({...groupForm,reservePercent:e.target.value})} type="number" placeholder="5" />
            <Field label="Commission Rate %" value={groupForm.commissionRate} onChange={(e:any) => setGroupForm({...groupForm,commissionRate:e.target.value})} type="number" placeholder="1" />
          </div>
          <div style={{background:S.rose,borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:S.bordeaux}}>
            Member IDs (TYN-000001, TYN-000002...) are assigned automatically when you add members.
          </div>
          <Btn onClick={createGroup} disabled={saving} style={{width:'100%',padding:'12px',fontSize:'15px'}}>
            {saving ? 'Creating...' : 'Create Group'}
          </Btn>
        </Modal>
      )}

      <div style={{textAlign:'center',maxWidth:'480px'}}>
        <div style={{width:'72px',height:'72px',background:S.bordeaux,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'32px',color:S.gold,fontWeight:'700'}}>T</div>
        <h1 style={{color:S.bordeaux,fontSize:'28px',fontWeight:'800',marginBottom:'8px'}}>Welcome to TARSYN</h1>
        <p style={{color:S.muted,fontSize:'15px',marginBottom:'8px'}}>Hello, <strong>{adminName}</strong></p>
        <p style={{color:S.muted,fontSize:'14px',marginBottom:'32px',lineHeight:'1.6'}}>
          You don't have a group yet. Create your savings group to start managing contributions, members, and cycles.
        </p>
        <Btn onClick={() => setShowCreateGroup(true)} style={{padding:'14px 32px',fontSize:'16px'}}>
          Create My Group
        </Btn>
        <p style={{marginTop:'16px',fontSize:'12px',color:S.muted}}>
          <button onClick={() => signOut(auth).then(() => window.location.href='/login')}
            style={{background:'none',border:'none',color:S.muted,cursor:'pointer',textDecoration:'underline',fontSize:'12px'}}>
            Sign out
          </button>
        </p>
      </div>
    </div>
  );

  //  PAGE CONTENTS 

  const PageDashboard = () => (
    <>
      {/* Welcome */}
      <div style={{background:`linear-gradient(135deg,${S.bordeaux},#8B3D62)`,borderRadius:'14px',padding:'24px 28px',marginBottom:'24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h2 style={{color:S.cream,fontSize:'20px',marginBottom:'4px',fontWeight:'700'}}>
            Welcome back, <span style={{color:S.gold}}>{adminName}</span>
          </h2>
          <p style={{color:'rgba(250,240,230,0.7)',fontSize:'13px',margin:0}}>
            {group?.name}  {members.length}/{group?.maxMembers} members  {group?.frequency}  {group?.currency}
          </p>
        </div>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
          <div style={{background:'rgba(212,175,122,0.2)',border:'1px solid rgba(212,175,122,0.4)',borderRadius:'10px',padding:'10px 16px',textAlign:'center'}}>
            <div style={{color:S.gold,fontSize:'12px',fontWeight:'600'}}>{members.length} Members</div>
            <div style={{color:'rgba(250,240,230,0.7)',fontSize:'11px',marginTop:'2px'}}>{group?.maxMembers! - members.length} spots left</div>
          </div>
          <div style={{background:'rgba(74,124,89,0.3)',border:'1px solid rgba(74,124,89,0.5)',borderRadius:'10px',padding:'10px 16px',textAlign:'center'}}>
            <div style={{color:'#90EE90',fontSize:'12px',fontWeight:'600'}}>{paidCount}/{members.length} Paid</div>
            <div style={{color:'rgba(250,240,230,0.7)',fontSize:'11px',marginTop:'2px'}}>{members.length - paidCount} pending</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'14px',marginBottom:'24px'}}>
        <StatCard label="MEMBERS" value={`${members.length}/${group?.maxMembers}`} sub="Active participants" />
        <StatCard label="TREASURY" value={`${sym}${totalTreasury.toLocaleString()}`} sub="Total collected" />
        <StatCard label="COMMISSION" value={`${sym}${commissionEarned.toFixed(2)}`} sub={`${group?.commissionRate}% rate`} />
        <StatCard label="RESERVE FUND" value={`${sym}${reserveFund.toFixed(2)}`} sub={`${group?.reservePercent}% per cycle`} />
        <StatCard label="PAYMENTS" value={payments.length.toString()} sub="Total recorded" />
        <StatCard label="ALERTS" value={unreadAlerts.length.toString()} sub="Unread notifications" />
      </div>

      {/* Recent payments */}
      <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',marginBottom:'24px'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${S.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'14px',fontWeight:'700',color:S.bordeaux}}>Recent Payments</span>
          <Btn variant="ghost" onClick={() => setActivePage('members')} style={{padding:'6px 12px',fontSize:'12px'}}>View Members</Btn>
        </div>
        {payments.length === 0 ? (
          <div style={{padding:'32px',textAlign:'center',color:S.muted,fontSize:'14px'}}>
            No payments recorded yet. <button onClick={() => setShowRecordPayment(true)} style={{background:'none',border:'none',color:S.bordeaux,cursor:'pointer',fontWeight:'700',textDecoration:'underline'}}>Record first payment</button>
          </div>
        ) : payments.slice(0, 5).map(p => (
          <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',borderBottom:`1px solid #F5EAF0`}}>
            <div>
              <div style={{fontSize:'13px',fontWeight:'600',color:S.text}}>{p.tynId}  {group?.confidentialMode ? '***' : p.memberName}</div>
              <div style={{fontSize:'11px',color:S.muted,marginTop:'2px'}}>Cycle {p.cycleNumber}  {p.method}</div>
            </div>
            <div style={{fontSize:'14px',fontWeight:'700',color:S.green}}>{sym}{p.amount.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',padding:'20px'}}>
        <div style={{fontSize:'14px',fontWeight:'700',color:S.bordeaux,marginBottom:'16px'}}>Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px'}}>
          {[
            {label:'Add Member', action: () => setShowAddMember(true)},
            {label:'Record Payment', action: () => setShowRecordPayment(true)},
            {label:'Generate Receipt', action: () => setShowReceipt(true)},
            {label:'Send Alert', action: () => setShowSendAlert(true)},
            {label:'Export Report', action: () => setShowExport(true)},
            {label:'Settings', action: () => setActivePage('settings')},
          ].map(a => (
            <button key={a.label} onClick={a.action}
              style={{background:S.cream,border:`1.5px solid ${S.border}`,borderRadius:'12px',padding:'16px 12px',cursor:'pointer',textAlign:'center'}}
              onMouseEnter={e => { e.currentTarget.style.borderColor = S.bordeaux; e.currentTarget.style.background = S.rose; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = S.cream; }}>
              <div style={{fontSize:'11px',fontWeight:'600',color:S.bordeaux}}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const PageMembers = () => (
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <h3 style={{color:S.bordeaux,fontSize:'18px',fontWeight:'700',margin:'0 0 4px'}}>{group?.name}  Members</h3>
          <p style={{color:S.muted,fontSize:'13px',margin:0}}>{members.length}/{group?.maxMembers} members  Confidential mode {group?.confidentialMode ? 'ON' : 'OFF'}</p>
        </div>
        <Btn onClick={() => setShowAddMember(true)}>+ Add Member</Btn>
      </div>

      {members.length === 0 ? (
        <div style={{background:'white',border:`2px dashed ${S.border}`,borderRadius:'12px',padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}></div>
          <div style={{fontSize:'16px',fontWeight:'700',color:S.bordeaux,marginBottom:'8px'}}>No members yet</div>
          <div style={{fontSize:'14px',color:S.muted,marginBottom:'20px'}}>Add your first member to get started. Each member gets a unique TYN-ID automatically.</div>
          <Btn onClick={() => setShowAddMember(true)}>Add First Member</Btn>
        </div>
      ) : (
        <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:S.cream}}>
                {['TYN-ID','Name','Country','Position','Status','Score','Action'].map(h => (
                  <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:S.muted,letterSpacing:'0.5px'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{borderBottom:`1px solid #F5EAF0`}}>
                  <td style={{padding:'12px 16px',fontSize:'12px',fontWeight:'600',color:S.bordeaux}}>{m.tynId}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:'600',color:S.text}}>
                    {group?.confidentialMode ? '' : m.name}
                  </td>
                  <td style={{padding:'12px 16px',fontSize:'13px',color:S.muted}}>{m.country || ''}</td>
                  <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:'600',color:S.bordeaux}}>#{m.position}</td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{fontSize:'11px',fontWeight:'700',padding:'3px 9px',borderRadius:'20px',
                      background:m.status==='Paid'?S.lightGreen:m.status==='Late'?'#fff3cd':'#f8d7da',
                      color:m.status==='Paid'?S.darkGreen:m.status==='Late'?'#856404':'#721c24'}}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <div style={{width:'50px',height:'4px',background:S.rose,borderRadius:'2px'}}>
                        <div style={{width:`${m.score/100*50}px`,height:'4px',background:m.score>=80?S.green:m.score>=60?S.gold:'#C4748E',borderRadius:'2px'}}></div>
                      </div>
                      <span style={{fontSize:'11px',color:S.muted}}>{m.score}</span>
                    </div>
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <button onClick={async () => {
                      await addDoc(collection(db,'alerts'),{groupId:group!.id,type:'warning',text:`Reminder sent to ${m.tynId}  payment due.`,createdAt:serverTimestamp(),read:false});
                      await loadAlerts(group!.id);
                      showToast(`Reminder sent to ${m.tynId}`);
                    }} style={{padding:'4px 10px',border:`1px solid ${S.border}`,borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'11px',color:S.bordeaux,fontWeight:'600'}}>
                      Remind
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const PageCycles = () => {
    const cycles = members.map((m, i) => ({
      number: i + 1,
      member: m,
      amount: group?.contributionAmount! * members.length,
      paid: payments.filter(p => p.cycleNumber === i+1).length,
    }));
    return (
      <>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <div>
            <h3 style={{color:S.bordeaux,fontSize:'18px',fontWeight:'700',margin:'0 0 4px'}}>Cycles</h3>
            <p style={{color:S.muted,fontSize:'13px',margin:0}}>{members.length} rotation cycles planned</p>
          </div>
          <Btn onClick={() => setShowRecordPayment(true)}>Record Payment</Btn>
        </div>
        {cycles.length === 0 ? (
          <div style={{background:'white',border:`2px dashed ${S.border}`,borderRadius:'12px',padding:'48px',textAlign:'center'}}>
            <div style={{fontSize:'14px',color:S.muted}}>Add members first to generate cycles.</div>
          </div>
        ) : (
          <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:S.cream}}>
                  {['Cycle','Recipient TYN-ID','Pot Amount','Payments In','Status'].map(h => (
                    <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:S.muted}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cycles.map(c => (
                  <tr key={c.number} style={{borderBottom:`1px solid #F5EAF0`}}>
                    <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:'700',color:S.bordeaux}}>Cycle {c.number}</td>
                    <td style={{padding:'12px 16px',fontSize:'13px',color:S.text}}>{c.member.tynId}</td>
                    <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:'600',color:S.bordeaux}}>{sym}{c.amount.toLocaleString()}</td>
                    <td style={{padding:'12px 16px',fontSize:'13px',color:S.muted}}>{c.paid}/{members.length}</td>
                    <td style={{padding:'12px 16px'}}>
                      <span style={{fontSize:'11px',fontWeight:'700',padding:'3px 9px',borderRadius:'20px',
                        background:c.paid===members.length?S.lightGreen:c.paid>0?'#fff3cd':S.rose,
                        color:c.paid===members.length?S.darkGreen:c.paid>0?'#856404':S.muted}}>
                        {c.paid===members.length?'Complete':c.paid>0?'In Progress':'Upcoming'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  const PageDocuments = () => (
    <>
      <div style={{marginBottom:'20px'}}>
        <h3 style={{color:S.bordeaux,fontSize:'18px',fontWeight:'700',margin:'0 0 4px'}}>Documents</h3>
        <p style={{color:S.muted,fontSize:'13px',margin:0}}>Receipts, contracts, reports</p>
      </div>
      <div style={{background:'white',border:`2px dashed ${S.border}`,borderRadius:'12px',padding:'48px',textAlign:'center'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}></div>
        <div style={{fontSize:'16px',fontWeight:'700',color:S.bordeaux,marginBottom:'8px'}}>Document storage</div>
        <div style={{fontSize:'14px',color:S.muted,marginBottom:'20px'}}>Receipts are generated automatically when you record payments. Contracts and reports coming soon.</div>
        <Btn onClick={() => setShowRecordPayment(true)}>Record a Payment</Btn>
      </div>
    </>
  );

  const PageReports = () => (
    <>
      <div style={{marginBottom:'20px'}}>
        <h3 style={{color:S.bordeaux,fontSize:'18px',fontWeight:'700',margin:'0 0 4px'}}>Reports</h3>
        <p style={{color:S.muted,fontSize:'13px',margin:0}}>Export and download official group reports</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'14px',marginBottom:'24px'}}>
        <StatCard label="TREASURY" value={`${sym}${totalTreasury.toLocaleString()}`} sub="Total collected" />
        <StatCard label="COMMISSION" value={`${sym}${commissionEarned.toFixed(2)}`} sub={`${group?.commissionRate}% rate`} />
        <StatCard label="PAID" value={`${paidCount}/${members.length}`} sub="Members current" />
        <StatCard label="RESERVE" value={`${sym}${reserveFund.toFixed(2)}`} sub={`${group?.reservePercent}% per cycle`} />
      </div>
      <div style={{display:'grid',gap:'10px'}}>
        {[
          {label:'PDF Report',desc:'Official cycle report with all payments & stamps'},
          {label:'Excel Export',desc:'Full data spreadsheet for analysis'},
          {label:'CSV Export',desc:'Raw data, compatible with all tools'},
        ].map(r => (
          <div key={r.label} onClick={() => showToast(`${r.label}  coming soon`)}
            style={{display:'flex',alignItems:'center',gap:'16px',padding:'16px 20px',border:`1.5px solid ${S.border}`,borderRadius:'12px',cursor:'pointer',background:'white'}}
            onMouseEnter={e => e.currentTarget.style.borderColor = S.bordeaux}
            onMouseLeave={e => e.currentTarget.style.borderColor = S.border}>
            <div>
              <div style={{fontWeight:'600',color:S.text,fontSize:'14px'}}>{r.label}</div>
              <div style={{fontSize:'12px',color:S.muted,marginTop:'2px'}}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const PageAlerts = () => (
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
        <div>
          <h3 style={{color:S.bordeaux,fontSize:'18px',fontWeight:'700',margin:'0 0 4px'}}>Alerts</h3>
          <p style={{color:S.muted,fontSize:'13px',margin:0}}>{unreadAlerts.length} unread alerts</p>
        </div>
        <Btn onClick={() => setShowSendAlert(true)}>Send Alert</Btn>
      </div>
      {alerts.length === 0 ? (
        <div style={{background:'white',border:`2px dashed ${S.border}`,borderRadius:'12px',padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:'14px',color:S.muted}}>No alerts yet. Alerts are generated automatically when payments are recorded, or you can send manual alerts.</div>
        </div>
      ) : (
        <div style={{display:'grid',gap:'10px'}}>
          {alerts.map(a => (
            <div key={a.id} style={{background:a.type==='danger'?'#f8d7da':a.type==='warning'?'#fff3cd':a.type==='success'?S.lightGreen:'#d1ecf1',borderRadius:'12px',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'13px',color:a.type==='danger'?'#721c24':a.type==='warning'?'#856404':a.type==='success'?S.darkGreen:'#0c5460',opacity:a.read?0.5:1}}>
              <span>{a.text}</span>
              {!a.read && <button onClick={() => dismissAlert(a.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'inherit',opacity:0.6,marginLeft:'12px'}}></button>}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const PageSettings = () => (
    <>
      <div style={{marginBottom:'20px'}}>
        <h3 style={{color:S.bordeaux,fontSize:'18px',fontWeight:'700',margin:'0 0 4px'}}>Settings</h3>
        <p style={{color:S.muted,fontSize:'13px',margin:0}}>Group configuration</p>
      </div>
      <div style={{display:'flex',gap:'8px',marginBottom:'24px',flexWrap:'wrap'}}>
        {['group','payment','security'].map(t => (
          <button key={t} onClick={() => setSettingsTab(t)}
            style={{padding:'8px 18px',borderRadius:'20px',border:`2px solid ${settingsTab===t?S.bordeaux:S.border}`,background:settingsTab===t?S.bordeaux:'white',color:settingsTab===t?'white':S.bordeaux,fontSize:'13px',fontWeight:'600',cursor:'pointer',textTransform:'capitalize'}}>
            {t}
          </button>
        ))}
      </div>
      {settingsTab === 'group' && (
        <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',padding:'24px'}}>
          <Field label="Group Name" value={settingsForm.name||''} onChange={(e:any) => setSettingsForm({...settingsForm,name:e.target.value})} />
          <Field label="Max Members" value={settingsForm.maxMembers||''} onChange={(e:any) => setSettingsForm({...settingsForm,maxMembers:Number(e.target.value)})} type="number" />
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Payment Frequency</label>
            <select value={settingsForm.frequency||'monthly'} onChange={(e:any) => setSettingsForm({...settingsForm,frequency:e.target.value})}
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',color:S.text}}>
              {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}  {f.desc}</option>)}
            </select>
          </div>
          <Btn onClick={saveSettings} disabled={saving}>{saving?'Saving...':'Save Changes'}</Btn>
        </div>
      )}
      {settingsTab === 'payment' && (
        <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',padding:'24px'}}>
          <Field label="Contribution Amount" value={settingsForm.contributionAmount||''} onChange={(e:any) => setSettingsForm({...settingsForm,contributionAmount:Number(e.target.value)})} type="number" />
          <Field label="Reserve Fund %" value={settingsForm.reservePercent||''} onChange={(e:any) => setSettingsForm({...settingsForm,reservePercent:Number(e.target.value)})} type="number" />
          <Field label="Commission Rate %" value={settingsForm.commissionRate||''} onChange={(e:any) => setSettingsForm({...settingsForm,commissionRate:Number(e.target.value)})} type="number" />
          <Btn onClick={saveSettings} disabled={saving}>{saving?'Saving...':'Save Changes'}</Btn>
        </div>
      )}
      {settingsTab === 'security' && (
        <div style={{background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',padding:'24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:`1px solid #F5EAF0`}}>
            <div>
              <div style={{fontSize:'14px',fontWeight:'600',color:S.text}}>Confidential Mode</div>
              <div style={{fontSize:'12px',color:S.muted,marginTop:'2px'}}>Hide member names  show TYN-IDs only</div>
            </div>
            <button onClick={() => setSettingsForm({...settingsForm,confidentialMode:!settingsForm.confidentialMode})}
              style={{background:settingsForm.confidentialMode?S.bordeaux:S.border,border:'none',borderRadius:'20px',padding:'6px 16px',fontSize:'12px',fontWeight:'600',cursor:'pointer',color:'white'}}>
              {settingsForm.confidentialMode?'ON':'OFF'}
            </button>
          </div>
          <div style={{marginTop:'16px'}}>
            <Btn onClick={saveSettings} disabled={saving}>{saving?'Saving...':'Save Changes'}</Btn>
          </div>
        </div>
      )}
    </>
  );

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <PageDashboard />;
      case 'members':   return <PageMembers />;
      case 'cycles':    return <PageCycles />;
      case 'documents': return <PageDocuments />;
      case 'reports':   return <PageReports />;
      case 'alerts':    return <PageAlerts />;
      case 'settings':  return <PageSettings />;
      default:          return <PageDashboard />;
    }
  };

  //  MODALS 

  const renderModals = () => (
    <>
      {showAddMember && (
        <Modal title="Add New Member" onClose={() => setShowAddMember(false)}>
          <Field label="Full Name" value={memberForm.name} onChange={(e:any) => setMemberForm({...memberForm,name:e.target.value})} placeholder="Marie Jean" required />
          <Field label="Email Address" value={memberForm.email} onChange={(e:any) => setMemberForm({...memberForm,email:e.target.value})} type="email" placeholder="marie@example.com" required />
          <Field label="Phone Number" value={memberForm.phone} onChange={(e:any) => setMemberForm({...memberForm,phone:e.target.value})} placeholder="+1 555 000 0000" />
          <Field label="Country" value={memberForm.country} onChange={(e:any) => setMemberForm({...memberForm,country:e.target.value})} placeholder="Haiti" />
          <div style={{background:S.rose,borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:S.bordeaux}}>
            TYN-ID assigned automatically: <strong>TYN-{String(members.length+1).padStart(6,'0')}</strong>
          </div>
          <div style={{background:'#fff3cd',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#856404'}}>
            Member identity is strictly confidential. Other members will not see personal information.
          </div>
          <Btn onClick={addMember} disabled={saving} style={{width:'100%',padding:'12px',fontSize:'15px'}}>
            {saving ? 'Adding...' : 'Add Member & Send Invitation'}
          </Btn>
        </Modal>
      )}

      {showRecordPayment && (
        <Modal title="Record Payment" onClose={() => setShowRecordPayment(false)}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Select Member *</label>
            <select value={paymentForm.memberId} onChange={(e:any) => setPaymentForm({...paymentForm,memberId:e.target.value})}
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',color:S.text}}>
              <option value=""> Select by TYN-ID </option>
              {members.map(m => <option key={m.id} value={m.id}>{m.tynId} {group?.confidentialMode?'':`  ${m.name}`}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <Field label={`Amount (${sym})`} value={paymentForm.amount} onChange={(e:any) => setPaymentForm({...paymentForm,amount:e.target.value})} type="number" placeholder={group?.contributionAmount?.toString()} required />
            <Field label="Cycle Number" value={paymentForm.cycleNumber} onChange={(e:any) => setPaymentForm({...paymentForm,cycleNumber:e.target.value})} type="number" placeholder="1" />
          </div>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Payment Method</label>
            <select value={paymentForm.method} onChange={(e:any) => setPaymentForm({...paymentForm,method:e.target.value})}
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',color:S.text}}>
              {['Cash','Bank Transfer','Mobile Money','Zelle','PayPal','Bitcoin','USDT','USDC'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <Field label="Note (optional)" value={paymentForm.note} onChange={(e:any) => setPaymentForm({...paymentForm,note:e.target.value})} placeholder="Cash  confirmed in person" />
          <Btn onClick={recordPayment} disabled={saving} style={{width:'100%',padding:'12px',fontSize:'15px'}}>
            {saving ? 'Recording...' : 'Confirm Payment'}
          </Btn>
        </Modal>
      )}

      {showReceipt && (
        <Modal title="Generate Receipt" onClose={() => setShowReceipt(false)}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Select Member</label>
            <select style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',color:S.text}}>
              <option value=""> Select by TYN-ID </option>
              {members.map(m => <option key={m.id} value={m.id}>{m.tynId}</option>)}
            </select>
          </div>
          <div style={{background:S.rose,borderRadius:'8px',padding:'16px',marginBottom:'16px'}}>
            {['TYN-ID (not full name)','Payment amount & date','Cycle number','QR Code verifiable online','TARSYN official stamp'].map(i => (
              <div key={i} style={{fontSize:'12px',color:S.muted,padding:'3px 0'}}> {i}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {['Print Receipt','Download PDF','Send by Email','Send by WhatsApp'].map(a => (
              <button key={a} onClick={() => showToast(`${a}  coming soon`)}
                style={{padding:'10px',border:`1.5px solid ${S.border}`,borderRadius:'8px',background:S.cream,color:S.bordeaux,fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
                {a}
              </button>
            ))}
          </div>
          <Btn onClick={() => { showToast('Receipt generated!'); setShowReceipt(false); }} style={{width:'100%',padding:'12px',fontSize:'15px'}}>
            Generate Receipt
          </Btn>
        </Modal>
      )}

      {showSendAlert && (
        <Modal title="Send Alert" onClose={() => setShowSendAlert(false)}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Alert Type</label>
            <select value={alertForm.type} onChange={(e:any) => setAlertForm({...alertForm,type:e.target.value})}
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',color:S.text}}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="danger">Urgent</option>
              <option value="success">Success</option>
            </select>
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:S.bordeaux,marginBottom:'5px'}}>Message *</label>
            <textarea value={alertForm.text} onChange={(e:any) => setAlertForm({...alertForm,text:e.target.value})}
              placeholder="Enter your alert message..."
              style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${S.border}`,borderRadius:'8px',fontSize:'14px',outline:'none',minHeight:'80px',resize:'vertical',boxSizing:'border-box',color:S.text}} />
          </div>
          <Btn onClick={sendAlert} disabled={saving} style={{width:'100%',padding:'12px',fontSize:'15px'}}>
            {saving ? 'Sending...' : 'Send Alert'}
          </Btn>
        </Modal>
      )}

      {showExport && (
        <Modal title="Export Report" onClose={() => setShowExport(false)}>
          {[
            {label:'PDF Report',desc:'Official cycle report with all payments'},
            {label:'Excel Export',desc:'Full data spreadsheet'},
            {label:'CSV Export',desc:'Raw data for any tool'},
          ].map(r => (
            <div key={r.label} onClick={() => showToast(`${r.label}  coming soon`)}
              style={{display:'flex',gap:'14px',padding:'14px',border:`1.5px solid ${S.border}`,borderRadius:'10px',cursor:'pointer',background:'white',marginBottom:'8px'}}
              onMouseEnter={e => e.currentTarget.style.borderColor = S.bordeaux}
              onMouseLeave={e => e.currentTarget.style.borderColor = S.border}>
              <div>
                <div style={{fontWeight:'600',color:S.text,fontSize:'14px'}}>{r.label}</div>
                <div style={{fontSize:'12px',color:S.muted}}>{r.desc}</div>
              </div>
            </div>
          ))}
        </Modal>
      )}
    </>
  );

  //  MAIN RENDER 

  return (
    <div style={{minHeight:'100vh',background:S.cream,display:'flex'}}>

      {renderModals()}

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:'24px',right:'24px',background:S.bordeaux,color:'white',padding:'12px 20px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',zIndex:2000,boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>
          {toast}
        </div>
      )}

      {/* SIDEBAR */}
      <aside style={{width:'220px',background:S.bordeaux,display:'flex',flexDirection:'column',position:'fixed',top:0,bottom:0,left:0,zIndex:50,overflowY:'auto'}}>
        <a href="/" style={{padding:'20px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)',textDecoration:'none',display:'block'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'38px',height:'38px',borderRadius:'50%',background:S.gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700',color:S.bordeaux}}>T</div>
            <div>
              <div style={{color:S.cream,fontSize:'16px',fontWeight:'700',letterSpacing:'2px'}}>TARSYN</div>
              <div style={{color:S.gold,fontSize:'8px',letterSpacing:'2px'}}>YOUR COMMUNITY. YOUR POWER.</div>
            </div>
          </div>
        </a>

        <div style={{padding:'14px 12px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:S.gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'700',color:S.bordeaux}}>{adminInitials}</div>
            <div>
              <div style={{color:S.cream,fontSize:'12px',fontWeight:'600'}}>{adminName}</div>
              <div style={{color:S.gold,fontSize:'9px',letterSpacing:'1px'}}>ADMIN / ORGANIZER</div>
            </div>
          </div>
        </div>

        <nav style={{flex:1,padding:'12px 0'}}>
          {NAV_ITEMS.map(item => (
            <div key={item.id} onClick={() => setActivePage(item.id)}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 20px',cursor:'pointer',
                background:activePage===item.id?'rgba(212,175,122,0.2)':'transparent',
                borderLeft:activePage===item.id?`3px solid ${S.gold}`:'3px solid transparent',
                transition:'all 0.2s'}}>
              <span style={{fontSize:'13px',fontWeight:activePage===item.id?'700':'400',color:activePage===item.id?S.gold:'rgba(250,240,230,0.8)'}}>{item.label}</span>
              {item.id==='alerts' && unreadAlerts.length > 0 && (
                <span style={{background:'#C4748E',color:'white',fontSize:'10px',fontWeight:'700',padding:'2px 7px',borderRadius:'20px'}}>{unreadAlerts.length}</span>
              )}
            </div>
          ))}
        </nav>

        <div style={{padding:'16px 12px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={() => signOut(auth).then(() => window.location.href='/login')}
            style={{width:'100%',padding:'9px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',color:S.cream,fontSize:'13px',cursor:'pointer'}}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{marginLeft:'220px',flex:1,display:'flex',flexDirection:'column',minHeight:'100vh'}}>
        {/* TOPBAR */}
        <div style={{background:'white',borderBottom:`1px solid ${S.border}`,padding:'0 28px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
          <div style={{fontSize:'17px',fontWeight:'700',color:S.bordeaux,textTransform:'capitalize'}}>{activePage}</div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>

            {/* Currency dropdown */}
            <div ref={currencyRef} style={{position:'relative'}}>
              <button onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                style={{padding:'6px 14px',background:S.rose,border:`1px solid ${S.border}`,borderRadius:'20px',fontSize:'12px',fontWeight:'600',color:S.bordeaux,cursor:'pointer'}}>
                {group?.currency || 'USD'} 
              </button>
              {showCurrencyDropdown && (
                <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'white',border:`1px solid ${S.border}`,borderRadius:'12px',boxShadow:'0 8px 24px rgba(0,0,0,0.12)',zIndex:100,maxHeight:'280px',overflowY:'auto',minWidth:'220px'}}>
                  {CURRENCIES.map(c => (
                    <div key={c.code} onClick={async () => {
                      if (group) {
                        await updateDoc(doc(db,'groups',group.id),{currency:c.code,currencySymbol:c.symbol});
                        await loadGroup(user.uid);
                      }
                      setShowCurrencyDropdown(false);
                    }} style={{padding:'10px 16px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',background:group?.currency===c.code?S.rose:'white',fontSize:'13px',color:S.text}}
                    onMouseEnter={e => e.currentTarget.style.background = S.rose}
                    onMouseLeave={e => e.currentTarget.style.background = group?.currency===c.code?S.rose:'white'}>
                      <span><strong>{c.code}</strong>  {c.name}</span>
                      <span style={{color:S.muted,fontSize:'12px'}}>{c.symbol}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span style={{fontSize:'11px',fontWeight:'700',background:S.bordeaux,color:S.gold,padding:'4px 12px',borderRadius:'20px'}}>ADMIN</span>
          </div>
        </div>

        <div style={{padding:'24px',flex:1}}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

