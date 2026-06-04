'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

// ============ CURRENCIES — 55+ devises + OTHER ============
const CURRENCIES = [
  {code:'USD',  symbol:'$',    name:'US Dollar',            flag:'🇺🇸'},
  {code:'HTG',  symbol:'G',    name:'Gourde Haïtienne',     flag:'🇭🇹'},
  {code:'EUR',  symbol:'€',    name:'Euro',                 flag:'🇪🇺'},
  {code:'CAD',  symbol:'CA$',  name:'Dollar Canadien',      flag:'🇨🇦'},
  {code:'GBP',  symbol:'£',    name:'Livre Sterling',       flag:'🇬🇧'},
  {code:'CHF',  symbol:'CHF',  name:'Franc Suisse',         flag:'🇨🇭'},
  {code:'BRL',  symbol:'R$',   name:'Real Brésilien',       flag:'🇧🇷'},
  {code:'MXN',  symbol:'MX$',  name:'Peso Mexicain',        flag:'🇲🇽'},
  {code:'COP',  symbol:'COP$', name:'Peso Colombien',       flag:'🇨🇴'},
  {code:'ARS',  symbol:'AR$',  name:'Peso Argentin',        flag:'🇦🇷'},
  {code:'DOP',  symbol:'RD$',  name:'Peso Dominicain',      flag:'🇩🇴'},
  {code:'JMD',  symbol:'J$',   name:'Dollar Jamaïcain',     flag:'🇯🇲'},
  {code:'TTD',  symbol:'TT$',  name:'Dollar T&T',           flag:'🇹🇹'},
  {code:'XOF',  symbol:'CFA',  name:'Franc CFA Ouest',      flag:'🌍'},
  {code:'XAF',  symbol:'FCFA', name:'Franc CFA Central',    flag:'🌍'},
  {code:'NGN',  symbol:'₦',    name:'Naira Nigérian',       flag:'🇳🇬'},
  {code:'GHS',  symbol:'GH₵',  name:'Cedi Ghanéen',         flag:'🇬🇭'},
  {code:'KES',  symbol:'KSh',  name:'Shilling Kényan',      flag:'🇰🇪'},
  {code:'ZAR',  symbol:'R',    name:'Rand Sud-Africain',    flag:'🇿🇦'},
  {code:'EGP',  symbol:'E£',   name:'Livre Égyptienne',     flag:'🇪🇬'},
  {code:'MAD',  symbol:'MAD',  name:'Dirham Marocain',      flag:'🇲🇦'},
  {code:'CDF',  symbol:'FC',   name:'Franc Congolais',      flag:'🇨🇩'},
  {code:'ETB',  symbol:'Br',   name:'Birr Éthiopien',       flag:'🇪🇹'},
  {code:'RWF',  symbol:'FRw',  name:'Franc Rwandais',       flag:'🇷🇼'},
  {code:'MGA',  symbol:'Ar',   name:'Ariary Malgache',      flag:'🇲🇬'},
  {code:'TZS',  symbol:'TSh',  name:'Shilling Tanzanien',   flag:'🇹🇿'},
  {code:'UGX',  symbol:'USh',  name:'Shilling Ougandais',   flag:'🇺🇬'},
  {code:'INR',  symbol:'₹',    name:'Roupie Indienne',      flag:'🇮🇳'},
  {code:'PHP',  symbol:'₱',    name:'Peso Philippin',       flag:'🇵🇭'},
  {code:'IDR',  symbol:'Rp',   name:'Roupiah Indonésienne', flag:'🇮🇩'},
  {code:'VND',  symbol:'₫',    name:'Dong Vietnamien',      flag:'🇻🇳'},
  {code:'THB',  symbol:'฿',    name:'Baht Thaïlandais',     flag:'🇹🇭'},
  {code:'MYR',  symbol:'RM',   name:'Ringgit Malaisien',    flag:'🇲🇾'},
  {code:'KRW',  symbol:'₩',    name:'Won Sud-Coréen',       flag:'🇰🇷'},
  {code:'CNY',  symbol:'¥',    name:'Yuan Chinois',         flag:'🇨🇳'},
  {code:'JPY',  symbol:'¥',    name:'Yen Japonais',         flag:'🇯🇵'},
  {code:'AUD',  symbol:'A$',   name:'Dollar Australien',    flag:'🇦🇺'},
  {code:'SGD',  symbol:'S$',   name:'Dollar Singapour',     flag:'🇸🇬'},
  {code:'HKD',  symbol:'HK$',  name:'Dollar Hong Kong',     flag:'🇭🇰'},
  {code:'AED',  symbol:'د.إ',  name:'Dirham Émirati',       flag:'🇦🇪'},
  {code:'SAR',  symbol:'﷼',   name:'Riyal Saoudien',       flag:'🇸🇦'},
  {code:'PKR',  symbol:'Rs',   name:'Roupie Pakistanaise',  flag:'🇵🇰'},
  {code:'BDT',  symbol:'৳',    name:'Taka Bangladais',      flag:'🇧🇩'},
  {code:'BTC',  symbol:'₿',    name:'Bitcoin',              flag:'₿'},
  {code:'ETH',  symbol:'Ξ',    name:'Ethereum',             flag:'Ξ'},
  {code:'USDT', symbol:'₮',    name:'Tether USDT',          flag:'💵'},
  {code:'USDC', symbol:'$c',   name:'USD Coin',             flag:'🔵'},
  {code:'OTHER',symbol:'?',    name:'Other / Autre',        flag:'➕'},
];

const PAYMENT_METHODS = ['Cash','Virement bancaire','Mobile Money','Zelle','PayPal','CashApp','Venmo','Western Union','MoneyGram','Bitcoin','Ethereum','USDT','USDC','Chèque','Autre'];

const FREQUENCIES = [
  {id:'weekly',   label:'Weekly',    desc:'Every week'},
  {id:'biweekly', label:'Bi-weekly', desc:'Every 2 weeks'},
  {id:'monthly',  label:'Monthly',   desc:'Every month'},
  {id:'quarterly',label:'Quarterly', desc:'Every 3 months'},
  {id:'biannual', label:'Bi-annual', desc:'Every 6 months'},
  {id:'annual',   label:'Annual',    desc:'Once a year'},
];

const INIT_MEMBERS = [
  {id:'TYN-000001',name:'Marie Jean',   avatar:'MJ',status:'Paid',  score:85,country:'🇭🇹',position:1,receivedDate:'May 1, 2026', hasReceived:true, email:'marie@example.com',  phone:'+1 555 0001',joined:'Apr 1, 2026'},
  {id:'TYN-000002',name:'Paul Durand',  avatar:'PD',status:'Paid',  score:90,country:'🇫🇷',position:2,receivedDate:'May 15, 2026',hasReceived:true, email:'paul@example.com',   phone:'+1 555 0002',joined:'Apr 1, 2026'},
  {id:'TYN-000003',name:'Sophie Bernard',avatar:'SB',status:'Unpaid',score:60,country:'🇨🇦',position:3,receivedDate:'Jun 1, 2026', hasReceived:false,email:'sophie@example.com', phone:'+1 555 0003',joined:'Apr 1, 2026'},
  {id:'TYN-000004',name:'Karine Morel', avatar:'KM',status:'Late',  score:45,country:'🇸🇳',position:4,receivedDate:'Jun 6, 2026', hasReceived:false,email:'karine@example.com', phone:'+1 555 0004',joined:'Apr 1, 2026'},
  {id:'TYN-000005',name:'Jacques Louis',avatar:'JL',status:'Paid',  score:78,country:'🇭🇹',position:5,receivedDate:'Jun 20, 2026',hasReceived:false,email:'jacques@example.com',phone:'+1 555 0005',joined:'Apr 1, 2026'},
  {id:'TYN-000006',name:'Rose Pierre',  avatar:'RP',status:'Paid',  score:95,country:'🇨🇦',position:6,receivedDate:'Jul 4, 2026', hasReceived:false,email:'rose@example.com',   phone:'+1 555 0006',joined:'Apr 1, 2026'},
  {id:'TYN-000007',name:'Jean Baptiste',avatar:'JB',status:'Paid',  score:72,country:'🇭🇹',position:7,receivedDate:'Jul 18, 2026',hasReceived:false,email:'jean@example.com',   phone:'+1 555 0007',joined:'Apr 1, 2026'},
  {id:'TYN-000008',name:'Claire Dupont',avatar:'CD',status:'Paid',  score:88,country:'🇫🇷',position:8,receivedDate:'Aug 1, 2026', hasReceived:false,email:'claire@example.com', phone:'+1 555 0008',joined:'Apr 1, 2026'},
];

const INIT_DOCS = [
  {id:'DOC-001',name:'Cycle 1 Receipt — TYN-000001',type:'receipt', date:'May 1, 2026', size:'245 KB',icon:'🧾',tynId:'TYN-000001'},
  {id:'DOC-002',name:'Cycle 2 Receipt — TYN-000002',type:'receipt', date:'May 15, 2026',size:'238 KB',icon:'🧾',tynId:'TYN-000002'},
  {id:'DOC-003',name:'Group Contract — Sol 2026',    type:'contract',date:'Apr 1, 2026', size:'1.2 MB',icon:'📄',tynId:'ALL'},
  {id:'DOC-004',name:'Monthly Report — May 2026',    type:'report',  date:'Jun 1, 2026', size:'890 KB',icon:'📊',tynId:'ADMIN'},
  {id:'DOC-005',name:'ID Verification — TYN-000001', type:'identity',date:'Apr 1, 2026', size:'2.1 MB',icon:'🪪',tynId:'TYN-000001'},
  {id:'DOC-006',name:'ID Verification — TYN-000002', type:'identity',date:'Apr 1, 2026', size:'1.8 MB',icon:'🪪',tynId:'TYN-000002'},
];

const CYCLES_DATA = [
  {cycle:1,tynId:'TYN-000001',date:'May 1, 2026', amount:2400,status:'Completed',paid:8},
  {cycle:2,tynId:'TYN-000002',date:'May 15, 2026',amount:2400,status:'Completed',paid:8},
  {cycle:3,tynId:'TYN-000003',date:'Jun 1, 2026', amount:2400,status:'Completed',paid:8},
  {cycle:4,tynId:'TYN-000004',date:'Jun 6, 2026', amount:2400,status:'Active',   paid:6},
  {cycle:5,tynId:'CONFIDENTIAL',date:'Jun 20, 2026',amount:2400,status:'Upcoming',paid:0},
  {cycle:6,tynId:'CONFIDENTIAL',date:'Jul 4, 2026', amount:2400,status:'Upcoming',paid:0},
  {cycle:7,tynId:'CONFIDENTIAL',date:'Jul 18, 2026',amount:2400,status:'Upcoming',paid:0},
  {cycle:8,tynId:'CONFIDENTIAL',date:'Aug 1, 2026', amount:2400,status:'Upcoming',paid:0},
];

function genReceiptNo() {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const r = Math.random().toString(36).substring(2,6).toUpperCase();
  return `REC-${d}-${r}`;
}

export default function DashboardPage() {
  const [user, setUser]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [isAdmin]                 = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [currency, setCurrency]   = useState(CURRENCIES[0]);
  const [frequency, setFrequency] = useState(FREQUENCIES[2]);
  const [confidentialMode, setConfidentialMode] = useState(true);
  const [commissionRate, setCommissionRate]     = useState(1);
  const [members, setMembers]     = useState(INIT_MEMBERS);
  const [documents, setDocuments] = useState(INIT_DOCS);
  const [docFilter, setDocFilter] = useState('All');
  const [memberSearch, setMemberSearch] = useState('');
  const [alertSettings, setAlertSettings] = useState({daily:true,weekly:true,biweekly:true,monthly:true,days14:true,days7:true,days3:true,sms:false});
  const [groupName, setGroupName]   = useState('Sol Group 2026');
  const [groupDesc, setGroupDesc]   = useState('Haitian Sol group — Monthly contributions');
  const [contributionAmount, setContributionAmount] = useState('200');
  const [maxMembers, setMaxMembers] = useState('12');

  // Modals
  const [showAddMember, setShowAddMember]       = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showReceipt, setShowReceipt]           = useState(false);
  const [showExport, setShowExport]             = useState(false);
  const [showEmergency, setShowEmergency]       = useState(false);
  const [showMemberDetail, setShowMemberDetail] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);

  // Form states
  const [newMember, setNewMember] = useState({name:'',email:'',phone:'',country:'',idNumber:''});
  const [receiptTynId, setReceiptTynId] = useState('');
  const [emergencyMsg, setEmergencyMsg] = useState('');
  const [reportType, setReportType]     = useState('');

  // ── Payment state (complet) ──
  const [payMember,    setPayMember]    = useState('');
  const [payAmount,    setPayAmount]    = useState('');   // ✅ string vide
  const [payCurrency,  setPayCurrency]  = useState(CURRENCIES[0].code);
  const [payCustomCur, setPayCustomCur] = useState('');
  const [payCustomSym, setPayCustomSym] = useState('');
  const [payMethod,    setPayMethod]    = useState('Cash');
  const [payNote,      setPayNote]      = useState('Confirmed by organizer');
  const [payLoading,   setPayLoading]   = useState(false);
  const [payReceipt,   setPayReceipt]   = useState<any>(null);

  // Computed payment values
  const payCurObj   = CURRENCIES.find(c=>c.code===payCurrency);
  const paySymbol   = payCurrency==='OTHER'?(payCustomSym||'?'):(payCurObj?.symbol||payCurrency);
  const payCode     = payCurrency==='OTHER'?(payCustomCur||'?'):payCurrency;
  const payAmt      = parseFloat(payAmount)||0;
  const tarsynFee   = (payAmt*0.005).toFixed(2);
  const orgFee      = (payAmt*commissionRate/100).toFixed(2);
  const netAmt      = (payAmt-parseFloat(tarsynFee)-parseFloat(orgFee)).toFixed(2);
  const selMember   = members.find(m=>m.id===payMember);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth,(u)=>{
      if(!u){window.location.href='/login';return;}
      setUser(u); setLoading(false);
    });
    return()=>unsub();
  },[]);

  if(loading) return(
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#D4AF7A'}}>✦</div>
        <p style={{color:'#6B2D4E',fontWeight:'600'}}>Loading TARSYN...</p>
      </div>
    </div>
  );

  const name     = user?.displayName||user?.email?.split('@')[0]||'Admin';
  const initials = name.slice(0,2).toUpperCase();
  const sym      = currency.symbol;
  const paidCount = members.filter(m=>m.status==='Paid').length;
  const filteredDocs    = docFilter==='All'?documents:documents.filter(d=>d.type===docFilter);
  const filteredMembers = members.filter(m=>m.name.toLowerCase().includes(memberSearch.toLowerCase())||m.id.toLowerCase().includes(memberSearch.toLowerCase()));

  // ── Confirm payment → Firestore ──
  const handleConfirmPayment = async () => {
    if(!payMember)           {alert('Sélectionne un membre.');return;}
    if(!payAmt||payAmt<=0)   {alert('Entre un montant valide.');return;}
    if(payCurrency==='OTHER'&&!payCustomCur){alert('Précise le nom de ta monnaie.');return;}
    setPayLoading(true);
    try {
      const receiptNumber = genReceiptNo();
      const groupId = 'SOL-GROUP-2026';
      const data = {
        receiptNumber, memberId:payMember,
        memberName:selMember?.name||'—', memberTynId:selMember?.id||'—',
        amount:payAmt, currency:payCode, currencySymbol:paySymbol,
        paymentMethod:payMethod, note:payNote,
        tarsynFee:parseFloat(tarsynFee), organizerFee:parseFloat(orgFee), netAmount:parseFloat(netAmt),
        recordedBy:name, groupId, status:'confirmed', createdAt:serverTimestamp(),
      };
      await addDoc(collection(db,'groups',groupId,'payments'),data);
      await updateDoc(doc(db,'groups',groupId,'members',payMember),{
        totalPaid:increment(payAmt), paymentsCount:increment(1),
        lastPaymentAt:serverTimestamp(), lastPaymentAmount:payAmt,
      });
      setMembers(prev=>prev.map(m=>m.id===payMember?{...m,status:'Paid'}:m));
      setPayReceipt({...data,createdAt:new Date().toLocaleString()});
    } catch(e:any){
      alert('Erreur Firebase:\n'+(e.message||'Erreur inconnue'));
    } finally { setPayLoading(false); }
  };

  const resetPayment = () => {
    setPayMember('');setPayAmount('');setPayCurrency(CURRENCIES[0].code);
    setPayCustomCur('');setPayCustomSym('');setPayMethod('Cash');
    setPayNote('Confirmed by organizer');setPayReceipt(null);setShowRecordPayment(false);
  };

  // ── Delete document ──
  const handleDeleteDoc = (docId:string) => {
    setDocuments(prev=>prev.filter(d=>d.id!==docId));
    setShowDeleteConfirm(null);
    alert('✅ Document supprimé.');
  };

  // ============ SUB-COMPONENTS ============
  const Modal = ({title,onClose,children,wide=false}:any) => (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'28px',maxWidth:wide?'700px':'480px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
          <h3 style={{color:'#6B2D4E',fontSize:'17px',fontWeight:'700'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:'#7A5068',padding:'4px'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );

  const FInput = ({label,val,setVal,type='text',placeholder=''}:{label:string,val:string,setVal:(v:string)=>void,type?:string,placeholder?:string}) => (
    <div style={{marginBottom:'12px'}}>
      <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>{label}</label>
      <input type={type} value={val}
        onChange={e=>setVal(e.target.value)}
        onFocus={(e:any)=>type==='number'&&e.target.select()}
        placeholder={placeholder}
        style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box' as any,color:'#2C1A24',background:'white'}}/>
    </div>
  );

  const Toggle = ({label,value,onChange}:any) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F5EAF0'}}>
      <span style={{fontSize:'13px',color:'#2C1A24'}}>{label}</span>
      <button onClick={()=>onChange(!value)} style={{background:value?'#6B2D4E':'#ccc',border:'none',borderRadius:'20px',padding:'4px 14px',fontSize:'11px',fontWeight:'600',cursor:'pointer',color:'white'}}>
        {value?'ON':'OFF'}
      </button>
    </div>
  );

  const PrimaryBtn = ({label,onClick,loading=false}:any) => (
    <button onClick={onClick} disabled={loading}
      style={{width:'100%',padding:'12px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:'700',cursor:'pointer',marginTop:'10px',opacity:loading?0.7:1}}>
      {loading?'⏳ En cours...':label}
    </button>
  );

  const StatusBadge = ({status}:any) => (
    <span style={{fontSize:'11px',fontWeight:'700',padding:'3px 9px',borderRadius:'20px',
      background:status==='Paid'?'#d4edda':status==='Late'?'#fff3cd':status==='Completed'?'#d1ecf1':status==='Active'?'#EDD9E5':'#f8d7da',
      color:status==='Paid'?'#155724':status==='Late'?'#856404':status==='Completed'?'#0c5460':status==='Active'?'#6B2D4E':'#721c24'}}>
      {status}
    </span>
  );

  const ReceiptRow = ({label,value,bold=false}:any) => (
    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f0e8f5'}}>
      <span style={{color:'#888',fontSize:'12px'}}>{label}</span>
      <span style={{fontWeight:bold?700:400,fontSize:'12px',color:'#2d1b4e'}}>{value}</span>
    </div>
  );

  const SectionHeader = ({title,action,actionLabel}:any) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
      <h2 style={{fontSize:'20px',fontWeight:'800',color:'#6B2D4E'}}>{title}</h2>
      {action&&<button onClick={action} style={{padding:'8px 18px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>{actionLabel}</button>}
    </div>
  );

  const navItems = [
    {id:'dashboard',icon:'🏠',label:'Dashboard'},
    {id:'members',  icon:'👥',label:'Members'},
    {id:'cycles',   icon:'🔄',label:'Cycles'},
    {id:'documents',icon:'📁',label:'Documents'},
    {id:'reports',  icon:'📊',label:'Reports'},
    {id:'alerts',   icon:'🔔',label:'Alerts'},
    {id:'settings', icon:'⚙️',label:'Settings'},
  ];

  // ============ PAGE CONTENTS ============

  const DashboardContent = () => (
    <>
      <div style={{marginBottom:'16px',display:'flex',flexDirection:'column',gap:'6px'}}>
        {[
          {t:'danger', text:'TYN-000004 is late — penalty applied automatically',icon:'🚨'},
          {t:'warning',text:'TYN-000003 has not paid — 3 days overdue',icon:'⚠️'},
          {t:'info',   text:'Next payment cycle in 5 days — reminders sent',icon:'📅'},
          {t:'success',text:'Cycle 3 completed — distribution confirmed',icon:'✅'},
        ].map((a,i)=>(
          <div key={i} style={{background:a.t==='danger'?'#f8d7da':a.t==='warning'?'#fff3cd':a.t==='success'?'#d4edda':'#d1ecf1',borderRadius:'8px',padding:'9px 14px',display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:a.t==='danger'?'#721c24':a.t==='warning'?'#856404':a.t==='success'?'#155724':'#0c5460'}}>
            <span>{a.icon}</span>{a.text}
          </div>
        ))}
      </div>
      <div style={{background:'linear-gradient(135deg,#6B2D4E,#8B3D62)',borderRadius:'14px',padding:'22px 26px',marginBottom:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as any,gap:'12px'}}>
        <div>
          <h2 style={{color:'#FAF0E6',fontSize:'19px',marginBottom:'4px'}}>Welcome back, <span style={{color:'#D4AF7A'}}>{name}</span> 👋</h2>
          <p style={{color:'rgba(250,240,230,0.7)',fontSize:'12px'}}>{groupName} — {members.length} participants — {frequency.label} — {currency.flag} {currency.code}</p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap' as any}}>
          <div style={{background:'rgba(212,175,122,0.2)',border:'1px solid rgba(212,175,122,0.4)',borderRadius:'10px',padding:'8px 14px',textAlign:'center' as any}}>
            <div style={{color:'#D4AF7A',fontSize:'11px',fontWeight:'600'}}>🔄 Cycle 4 Active</div>
            <div style={{color:'rgba(250,240,230,0.7)',fontSize:'10px',marginTop:'2px'}}>Next payment in 5 days</div>
          </div>
          <div style={{background:'rgba(74,124,89,0.3)',border:'1px solid rgba(74,124,89,0.5)',borderRadius:'10px',padding:'8px 14px',textAlign:'center' as any}}>
            <div style={{color:'#90EE90',fontSize:'11px',fontWeight:'600'}}>✅ {paidCount}/{members.length} Paid</div>
            <div style={{color:'rgba(250,240,230,0.7)',fontSize:'10px',marginTop:'2px'}}>{members.length-paidCount} pending</div>
          </div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}}>
        {[
          {label:'PARTICIPANTS',value:String(members.length),sub:'Total members',icon:'👥'},
          {label:'CONTRIBUTIONS',value:`${sym}${parseInt(contributionAmount)*members.length}`,sub:`${paidCount}/${members.length} paid`,icon:'💰'},
          {label:'TREASURY',value:`${sym}${parseInt(contributionAmount)*members.length*3}`,sub:'Cycles 1–3',icon:'🏦'},
          {label:'COMMISSION',value:`${sym}${(parseInt(contributionAmount)*members.length*commissionRate/100).toFixed(0)}`,sub:`${commissionRate}% organizer`,icon:'💼'},
          {label:'TARSYN FEE',value:`${sym}${(parseInt(contributionAmount)*members.length*0.005).toFixed(0)}`,sub:'0.5% platform',icon:'⚙️'},
          {label:'RESERVE FUND',value:`${sym}${(parseInt(contributionAmount)*members.length*0.05).toFixed(0)}`,sub:'5% per cycle',icon:'🛡️'},
        ].map(s=>(
          <div key={s.label} style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'10px',padding:'12px 14px'}}>
            <div style={{fontSize:'10px',color:'#7A5068',marginBottom:'4px',fontWeight:'600'}}>{s.icon} {s.label}</div>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#6B2D4E'}}>{s.value}</div>
            <div style={{fontSize:'10px',color:'#C4748E',marginTop:'3px',fontWeight:'600'}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{background:'white',border:'2px solid #D4AF7A',borderRadius:'12px',marginBottom:'20px'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #EDD9E5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E'}}>👤 Member View — What Members See</span>
          <span style={{fontSize:'10px',color:'#4A7C59',fontWeight:'600',background:'#d4edda',padding:'3px 8px',borderRadius:'20px'}}>🔒 No Names Shown</span>
        </div>
        <div style={{padding:'14px 18px'}}>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'8px 12px',marginBottom:'12px',fontSize:'11px',color:'#6B2D4E'}}>
            ℹ️ Members see ONLY position, date, and status. No names. No other member info.
          </div>
          <div style={{display:'grid',gap:'6px'}}>
            {members.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',border:'1px solid #EDD9E5',borderRadius:'8px',background:'#FAF0E6'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{fontSize:'12px',fontWeight:'700',color:'#6B2D4E',minWidth:'24px'}}>#{m.position}</span>
                  <span style={{fontSize:'12px',color:'#7A5068'}}>{m.receivedDate}</span>
                </div>
                <span style={{fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'20px',background:m.hasReceived?'#d4edda':'#EDD9E5',color:m.hasReceived?'#155724':'#7A5068'}}>
                  {m.hasReceived?'✅ Received':'⏳ Upcoming'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px'}}>
          <div style={{padding:'12px 18px',borderBottom:'1px solid #D9C0CC',fontSize:'13px',fontWeight:'700',color:'#6B2D4E'}}>⚡ Recent Activity</div>
          {[
            {dot:'#4A7C59',text:'TYN-000001 paid — '+sym+'200',time:'2 hours ago'},
            {dot:'#D4AF7A',text:'Receipt generated for TYN-000001',time:'5 hours ago'},
            {dot:'#C4748E',text:'Reminder sent to 3 members',time:'Yesterday'},
            {dot:'#4A7C59',text:'Cycle 4 started',time:'June 1, 2026'},
          ].map((a,i)=>(
            <div key={i} style={{display:'flex',gap:'10px',padding:'10px 18px',borderBottom:'1px solid #F5EAF0'}}>
              <div style={{width:'7px',height:'7px',borderRadius:'50%',background:a.dot,marginTop:'4px',flexShrink:0}}></div>
              <div>
                <div style={{fontSize:'12px',color:'#2C1A24'}}>{a.text}</div>
                <div style={{fontSize:'10px',color:'#7A5068',marginTop:'2px'}}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px'}}>
          <div style={{padding:'12px 18px',borderBottom:'1px solid #D9C0CC',fontSize:'13px',fontWeight:'700',color:'#6B2D4E'}}>⭐ Reputation (by TYN-ID)</div>
          {members.map(m=>(
            <div key={m.id} style={{padding:'8px 18px',borderBottom:'1px solid #F5EAF0'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                <span style={{fontSize:'11px',fontWeight:'600',color:'#2C1A24'}}>{m.id}</span>
                <span style={{fontSize:'11px',fontWeight:'700',color:m.score>=80?'#4A7C59':m.score>=60?'#856404':'#721c24'}}>
                  {m.score>=90?'🏆':m.score>=80?'🥇':m.score>=60?'🥈':'⚠️'} {m.score}
                </span>
              </div>
              <div style={{background:'#EDD9E5',borderRadius:'3px',height:'4px'}}>
                <div style={{background:m.score>=80?'#4A7C59':m.score>=60?'#D4AF7A':'#C4748E',borderRadius:'3px',height:'4px',width:`${m.score}%`}}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px'}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'14px'}}>🚀 Quick Actions</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'8px'}}>
          {[
            {icon:'➕',label:'Add Member',    action:()=>setShowAddMember(true)},
            {icon:'💳',label:'Record Payment',action:()=>setShowRecordPayment(true)},
            {icon:'🧾',label:'Receipt',       action:()=>setShowReceipt(true)},
            {icon:'📁',label:'Documents',     action:()=>setActivePage('documents')},
            {icon:'📤',label:'Export',        action:()=>setShowExport(true)},
            {icon:'🔔',label:'Alerts',        action:()=>setActivePage('alerts')},
            {icon:'⚙️',label:'Settings',      action:()=>setActivePage('settings')},
            {icon:'🚨',label:'Emergency',     action:()=>setShowEmergency(true)},
          ].map(a=>(
            <button key={a.label} onClick={a.action}
              style={{background:'#FAF0E6',border:'1.5px solid #D9C0CC',borderRadius:'10px',padding:'14px 8px',cursor:'pointer',textAlign:'center' as any}}
              onMouseEnter={e=>{(e.currentTarget as any).style.borderColor='#6B2D4E';(e.currentTarget as any).style.background='#EDD9E5';}}
              onMouseLeave={e=>{(e.currentTarget as any).style.borderColor='#D9C0CC';(e.currentTarget as any).style.background='#FAF0E6';}}>
              <div style={{fontSize:'20px',marginBottom:'4px'}}>{a.icon}</div>
              <div style={{fontSize:'10px',fontWeight:'600',color:'#6B2D4E'}}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const MembersContent = () => (
    <>
      <SectionHeader title="👥 Members" action={()=>setShowAddMember(true)} actionLabel="+ Add Member"/>
      <input value={memberSearch} onChange={e=>setMemberSearch(e.target.value)} placeholder="Search by name or TYN-ID..."
        style={{width:'100%',padding:'10px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box' as any,color:'#2C1A24',background:'white',marginBottom:'16px'}}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'20px'}}>
        {[
          {label:'Total',  value:members.length,                               color:'#6B2D4E'},
          {label:'Paid',   value:members.filter(m=>m.status==='Paid').length,  color:'#4A7C59'},
          {label:'Unpaid', value:members.filter(m=>m.status==='Unpaid').length,color:'#721c24'},
          {label:'Late',   value:members.filter(m=>m.status==='Late').length,  color:'#856404'},
        ].map(s=>(
          <div key={s.label} style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'10px',padding:'12px',textAlign:'center' as any}}>
            <div style={{fontSize:'22px',fontWeight:'800',color:s.color}}>{s.value}</div>
            <div style={{fontSize:'11px',color:'#7A5068',fontWeight:'600'}}>{s.label}</div>
          </div>
        ))}
      </div>
      {isAdmin&&(
        <div style={{background:'white',border:'2px solid #6B2D4E',borderRadius:'12px',marginBottom:'20px'}}>
          <div style={{padding:'12px 18px',background:'#6B2D4E',borderRadius:'10px 10px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'#FAF0E6',fontSize:'13px',fontWeight:'700'}}>👑 Admin View — All Member Details</span>
            <span style={{color:'#D4AF7A',fontSize:'10px',background:'rgba(212,175,122,0.2)',padding:'3px 8px',borderRadius:'20px'}}>🔒 Admin Only</span>
          </div>
          <div style={{overflowX:'auto' as any}}>
            <table style={{width:'100%',borderCollapse:'collapse' as any}}>
              <thead>
                <tr style={{background:'#FAF0E6'}}>
                  {['TYN-ID','Name','Email','Country','Position','Payment Date','Status','Score','Actions'].map(h=>(
                    <th key={h} style={{padding:'8px 14px',textAlign:'left' as any,fontSize:'10px',fontWeight:'700',color:'#7A5068',whiteSpace:'nowrap' as any}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m=>(
                  <tr key={m.id} style={{borderBottom:'1px solid #F5EAF0'}}>
                    <td style={{padding:'10px 14px',fontSize:'11px',fontWeight:'600',color:'#6B2D4E',whiteSpace:'nowrap' as any}}>{m.id}</td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'7px'}}>
                        <div style={{width:'26px',height:'26px',borderRadius:'50%',background:'#EDD9E5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:'700',color:'#6B2D4E',flexShrink:0}}>{m.avatar}</div>
                        <span style={{fontSize:'12px',fontWeight:'600',color:'#2C1A24',whiteSpace:'nowrap' as any}}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:'11px',color:'#7A5068',whiteSpace:'nowrap' as any}}>{m.email}</td>
                    <td style={{padding:'10px 14px',fontSize:'13px'}}>{m.country}</td>
                    <td style={{padding:'10px 14px',fontSize:'12px',fontWeight:'600',color:'#6B2D4E'}}>#{m.position}</td>
                    <td style={{padding:'10px 14px',fontSize:'11px',color:'#7A5068',whiteSpace:'nowrap' as any}}>{m.receivedDate}</td>
                    <td style={{padding:'10px 14px'}}><StatusBadge status={m.status}/></td>
                    <td style={{padding:'10px 14px',fontSize:'11px',color:m.score>=80?'#4A7C59':m.score>=60?'#856404':'#721c24',fontWeight:'700'}}>{m.score}</td>
                    <td style={{padding:'10px 14px'}}>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button onClick={()=>setShowMemberDetail(m)} style={{padding:'3px 8px',border:'1px solid #D9C0CC',borderRadius:'5px',background:'white',cursor:'pointer',fontSize:'10px',color:'#6B2D4E',fontWeight:'600'}}>View</button>
                        <button onClick={()=>alert(`✅ Reminder sent to ${m.id}`)} style={{padding:'3px 8px',border:'1px solid #D9C0CC',borderRadius:'5px',background:'white',cursor:'pointer',fontSize:'10px',color:'#6B2D4E',fontWeight:'600'}}>Remind</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'16px 18px'}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'10px'}}>📋 Abandonment Policy</div>
        <div style={{fontSize:'12px',color:'#7A5068',lineHeight:'1.7'}}>
          If a member leaves before the cycle ends:<br/>
          ✅ Contributions kept safe in the system<br/>
          ✅ Returned after cycle ends minus penalties<br/>
          ✅ Minus organizer commission ({commissionRate}%) and TARSYN fee (0.5%)<br/>
          ✅ Position cancelled or transferred to replacement<br/>
          ✅ Official document generated for the transaction<br/>
          🔒 All history locked for 3 years — admin access only
        </div>
      </div>
    </>
  );

  const CyclesContent = () => (
    <>
      <SectionHeader title="🔄 Cycles & Rotation"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
        {[
          {label:'Total Cycles',value:members.length,icon:'🔄'},
          {label:'Completed',value:CYCLES_DATA.filter(c=>c.status==='Completed').length,icon:'✅'},
          {label:'Active',value:CYCLES_DATA.filter(c=>c.status==='Active').length,icon:'🟡'},
          {label:'Upcoming',value:CYCLES_DATA.filter(c=>c.status==='Upcoming').length,icon:'⏳'},
        ].map(s=>(
          <div key={s.label} style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'10px',padding:'14px',textAlign:'center' as any}}>
            <div style={{fontSize:'24px',marginBottom:'4px'}}>{s.icon}</div>
            <div style={{fontSize:'22px',fontWeight:'800',color:'#6B2D4E'}}>{s.value}</div>
            <div style={{fontSize:'11px',color:'#7A5068',fontWeight:'600'}}>{s.label}</div>
          </div>
        ))}
      </div>
      {isAdmin&&(
        <div style={{background:'white',border:'2px solid #6B2D4E',borderRadius:'12px',marginBottom:'20px'}}>
          <div style={{padding:'12px 18px',background:'#6B2D4E',borderRadius:'10px 10px 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'#FAF0E6',fontSize:'13px',fontWeight:'700'}}>👑 Admin View — Full Rotation Details</span>
            <span style={{color:'#D4AF7A',fontSize:'10px'}}>🔒 Admin Only</span>
          </div>
          {CYCLES_DATA.map(c=>{
            const member = members.find(m=>m.id===c.tynId);
            return(
              <div key={c.cycle} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 18px',borderBottom:'1px solid #F5EAF0',flexWrap:'wrap' as any,gap:'8px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:c.status==='Active'?'#6B2D4E':c.status==='Completed'?'#4A7C59':'#EDD9E5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:c.status==='Upcoming'?'#7A5068':'white'}}>
                    {c.cycle}
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'600',color:'#2C1A24'}}>{member?member.name:c.tynId}</div>
                    <div style={{fontSize:'11px',color:'#7A5068'}}>{c.tynId} — {c.date}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'12px',fontWeight:'700',color:'#6B2D4E'}}>{sym}{c.amount.toLocaleString()}</span>
                  <span style={{fontSize:'11px',color:'#7A5068'}}>{c.paid}/{members.length} paid</span>
                  <StatusBadge status={c.status}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{background:'white',border:'2px solid #D4AF7A',borderRadius:'12px'}}>
        <div style={{padding:'12px 18px',borderBottom:'1px solid #EDD9E5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E'}}>👤 Member View — Confidential</span>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <span style={{fontSize:'10px',color:'#7A5068'}}>Confidential:</span>
            <button onClick={()=>setConfidentialMode(!confidentialMode)}
              style={{background:confidentialMode?'#6B2D4E':'#ccc',border:'none',borderRadius:'20px',padding:'3px 12px',fontSize:'11px',fontWeight:'600',cursor:'pointer',color:'white'}}>
              {confidentialMode?'ON':'OFF'}
            </button>
          </div>
        </div>
        <div style={{padding:'14px 18px'}}>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'8px 12px',marginBottom:'12px',fontSize:'11px',color:'#6B2D4E'}}>
            ℹ️ Members see only: position, scheduled date, and received status. Names are hidden.
          </div>
          {CYCLES_DATA.map(c=>(
            <div key={c.cycle} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1px solid #EDD9E5',borderRadius:'8px',marginBottom:'6px',background:'#FAF0E6'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'12px',fontWeight:'700',color:'#6B2D4E',minWidth:'24px'}}>#{c.cycle}</span>
                <span style={{fontSize:'12px',color:'#7A5068'}}>{c.date}</span>
                {!confidentialMode&&<span style={{fontSize:'11px',color:'#6B2D4E',fontWeight:'600'}}>{c.tynId}</span>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontSize:'11px',color:'#7A5068'}}>{c.paid}/{members.length} paid</span>
                <StatusBadge status={c.status}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const DocumentsContent = () => (
    <>
      <SectionHeader title="📁 Documents"/>
      <label style={{display:'block',cursor:'pointer',marginBottom:'16px'}}>
        <input type="file" style={{display:'none'}} onChange={e=>{
          if(e.target.files?.[0]){
            const f=e.target.files[0];
            const newDoc={id:`DOC-00${documents.length+1}`,name:f.name,type:'document',date:new Date().toLocaleDateString(),size:`${(f.size/1024).toFixed(0)} KB`,icon:'📎',tynId:'ADMIN'};
            setDocuments(prev=>[...prev,newDoc]);
            alert(`✅ "${f.name}" uploaded successfully!`);
          }
        }}/>
        <div style={{border:'2px dashed #D9C0CC',borderRadius:'10px',padding:'20px',textAlign:'center' as any,background:'white',cursor:'pointer'}}>
          <div style={{fontSize:'28px',marginBottom:'6px'}}>📎</div>
          <div style={{color:'#6B2D4E',fontWeight:'600',fontSize:'13px'}}>Click to Upload Document</div>
          <div style={{color:'#7A5068',fontSize:'11px'}}>PDF, Word, Excel, JPG, PNG — max 10MB</div>
        </div>
      </label>
      <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap' as any}}>
        {['All','receipt','contract','report','identity'].map(f=>(
          <button key={f} onClick={()=>setDocFilter(f)}
            style={{padding:'5px 12px',borderRadius:'20px',border:'1.5px solid',borderColor:docFilter===f?'#6B2D4E':'#D9C0CC',background:docFilter===f?'#6B2D4E':'white',color:docFilter===f?'white':'#6B2D4E',fontSize:'11px',fontWeight:'600',cursor:'pointer'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}{f!=='All'?'s':''}
          </button>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {filteredDocs.map(d=>(
          <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',border:'1px solid #D9C0CC',borderRadius:'10px',background:'white',gap:'8px',flexWrap:'wrap' as any}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',flex:1}}>
              <span style={{fontSize:'22px'}}>{d.icon}</span>
              <div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#2C1A24'}}>{d.name}</div>
                <div style={{fontSize:'10px',color:'#7A5068'}}>{d.id} • {d.date} • {d.size} • {d.tynId}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:'5px'}}>
              <button onClick={()=>alert(`📥 Downloading: ${d.name}`)} style={{padding:'5px 8px',border:'1px solid #D9C0CC',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'11px',color:'#6B2D4E',fontWeight:'600'}}>📥 Download</button>
              <button onClick={()=>alert(`🖨️ Printing: ${d.name}`)}    style={{padding:'5px 8px',border:'1px solid #D9C0CC',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'11px',color:'#6B2D4E',fontWeight:'600'}}>🖨️ Print</button>
              <button onClick={()=>alert(`📧 Sending: ${d.name}`)}     style={{padding:'5px 8px',border:'1px solid #D9C0CC',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'11px',color:'#6B2D4E',fontWeight:'600'}}>📧 Email</button>
              <button onClick={()=>setShowDeleteConfirm(d)}             style={{padding:'5px 8px',border:'1px solid #f8d7da',borderRadius:'6px',background:'#fff5f5',cursor:'pointer',fontSize:'11px',color:'#c0392b',fontWeight:'600'}}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const ReportsContent = () => (
    <>
      <SectionHeader title="📊 Reports & Exports"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
        {[
          {icon:'📄',label:'PDF Report',    desc:'Official cycle report with stamps and QR Code'},
          {icon:'📊',label:'Excel Export',  desc:'Full data spreadsheet for financial analysis'},
          {icon:'📋',label:'CSV Export',    desc:'Raw data compatible with all tools'},
          {icon:'📅',label:'Monthly Report',desc:'Complete monthly summary for records'},
          {icon:'🖨️',label:'Print Report',  desc:'Print-ready formatted document'},
          {icon:'📧',label:'Email Report',  desc:'Send report directly to recipients'},
          {icon:'📈',label:'Annual Report', desc:'Full year summary for taxes and banks'},
          {icon:'🔗',label:'Google Sheets', desc:'Export to Google Sheets in real time'},
        ].map(r=>(
          <div key={r.label} onClick={()=>alert(`✅ ${r.label} generated!`)}
            style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px',border:'1.5px solid #D9C0CC',borderRadius:'10px',cursor:'pointer',background:'white'}}
            onMouseEnter={e=>(e.currentTarget as any).style.borderColor='#6B2D4E'}
            onMouseLeave={e=>(e.currentTarget as any).style.borderColor='#D9C0CC'}>
            <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#EDD9E5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>{r.icon}</div>
            <div>
              <div style={{fontWeight:'700',color:'#2C1A24',fontSize:'13px'}}>{r.label}</div>
              <div style={{fontSize:'11px',color:'#7A5068'}}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px'}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'14px'}}>📋 Cycle Summary</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
          {[
            {label:'Total Collected',value:`${sym}${parseInt(contributionAmount)*members.length*3}`},
            {label:'Distributed',    value:`${sym}${parseInt(contributionAmount)*members.length*3}`},
            {label:'Commission',     value:`${sym}${(parseInt(contributionAmount)*members.length*3*commissionRate/100).toFixed(0)}`},
            {label:'TARSYN Fee',     value:`${sym}${(parseInt(contributionAmount)*members.length*3*0.005).toFixed(0)}`},
            {label:'Reserve Fund',   value:`${sym}${(parseInt(contributionAmount)*members.length*3*0.05).toFixed(0)}`},
            {label:'Members Served', value:`${CYCLES_DATA.filter(c=>c.status==='Completed').length}/${members.length}`},
          ].map(s=>(
            <div key={s.label} style={{background:'#FAF0E6',borderRadius:'8px',padding:'12px',textAlign:'center' as any}}>
              <div style={{fontSize:'16px',fontWeight:'800',color:'#6B2D4E'}}>{s.value}</div>
              <div style={{fontSize:'10px',color:'#7A5068',marginTop:'3px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const AlertsContent = () => (
    <>
      <SectionHeader title="🔔 Alerts & Reminders"/>
      <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px',marginBottom:'16px'}}>
        <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'10px',marginBottom:'16px',fontSize:'12px',color:'#6B2D4E'}}>
          All alerts sent via App + Email. SMS requires Growth plan. Members receive reminders automatically.
        </div>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'10px'}}>📅 Recurring Reminders</div>
        <Toggle label="📆 Daily task reminder — sent every morning" value={alertSettings.daily}    onChange={(v:boolean)=>setAlertSettings(p=>({...p,daily:v}))}/>
        <Toggle label="📅 Weekly summary — every Monday"           value={alertSettings.weekly}   onChange={(v:boolean)=>setAlertSettings(p=>({...p,weekly:v}))}/>
        <Toggle label="📅 Bi-weekly cycle update"                  value={alertSettings.biweekly} onChange={(v:boolean)=>setAlertSettings(p=>({...p,biweekly:v}))}/>
        <Toggle label="📊 Monthly full report — 1st of month"      value={alertSettings.monthly}  onChange={(v:boolean)=>setAlertSettings(p=>({...p,monthly:v}))}/>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',margin:'16px 0 10px'}}>⏰ Payment Due Alerts</div>
        <Toggle label="14 days before payment — Email + App"       value={alertSettings.days14}   onChange={(v:boolean)=>setAlertSettings(p=>({...p,days14:v}))}/>
        <Toggle label="7 days before payment — Email + App"        value={alertSettings.days7}    onChange={(v:boolean)=>setAlertSettings(p=>({...p,days7:v}))}/>
        <Toggle label="3 days before payment — Email + App + SMS"  value={alertSettings.days3}    onChange={(v:boolean)=>setAlertSettings(p=>({...p,days3:v}))}/>
        <Toggle label="📱 SMS alerts (Growth plan required)"        value={alertSettings.sms}      onChange={(v:boolean)=>setAlertSettings(p=>({...p,sms:v}))}/>
        <PrimaryBtn label="✅ Save Alert Settings" onClick={()=>alert('✅ Alert settings saved!')}/>
      </div>
      <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px'}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'14px'}}>📤 Send Alerts Now</div>
        <div style={{display:'grid',gap:'8px'}}>
          {[
            {icon:'📅',label:'Send Payment Reminder to All Members',  color:'#6B2D4E'},
            {icon:'📊',label:'Send Monthly Report to Admin',          color:'#4A7C59'},
            {icon:'⚠️',label:'Send Late Payment Warning to Overdue',  color:'#856404'},
            {icon:'🚨',label:'Send Emergency Alert to All',           color:'#721c24'},
          ].map(a=>(
            <button key={a.label} onClick={()=>alert(`✅ "${a.label}" sent!`)}
              style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',border:`1.5px solid ${a.color}`,borderRadius:'8px',background:'white',cursor:'pointer',color:a.color,fontWeight:'600',fontSize:'12px',textAlign:'left' as any}}>
              <span style={{fontSize:'18px'}}>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const SettingsContent = () => (
    <>
      <SectionHeader title="⚙️ Settings"/>
      <div style={{display:'grid',gap:'16px'}}>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'14px'}}>👥 Group Information</div>
          <FInput label="Group Name"                val={groupName}           setVal={setGroupName}           placeholder="Sol Group 2026"/>
          <FInput label="Description"               val={groupDesc}           setVal={setGroupDesc}           placeholder="Description..."/>
          <FInput label="Contribution Amount"        val={contributionAmount}  setVal={setContributionAmount}  type="number" placeholder="200"/>
          <FInput label="Maximum Members"            val={maxMembers}          setVal={setMaxMembers}          type="number" placeholder="12"/>
          <PrimaryBtn label="💾 Save Group Settings" onClick={()=>alert('✅ Group settings saved!')}/>
        </div>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'14px'}}>📅 Payment Frequency</div>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {FREQUENCIES.map(f=>(
              <button key={f.id} onClick={()=>setFrequency(f)}
                style={{padding:'10px 14px',borderRadius:'8px',border:`2px solid ${frequency.id===f.id?'#6B2D4E':'#D9C0CC'}`,background:frequency.id===f.id?'#6B2D4E':'white',color:frequency.id===f.id?'white':'#6B2D4E',fontWeight:'600',fontSize:'12px',cursor:'pointer',textAlign:'left' as any}}>
                {f.label} — <span style={{opacity:0.8,fontWeight:'400'}}>{f.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'4px'}}>💼 Organizer Commission</div>
          <div style={{fontSize:'11px',color:'#7A5068',marginBottom:'14px'}}>Set your rate. Approved by all members in the signed contract.</div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'14px'}}>
            {[0.5,1,1.5,2].map(r=>(
              <button key={r} onClick={()=>setCommissionRate(r)}
                style={{padding:'10px 16px',borderRadius:'8px',border:`2px solid ${commissionRate===r?'#6B2D4E':'#D9C0CC'}`,background:commissionRate===r?'#6B2D4E':'white',color:commissionRate===r?'white':'#6B2D4E',fontWeight:'600',fontSize:'13px',cursor:'pointer',display:'flex',justifyContent:'space-between' as any}}>
                <span>{r}% — Organizer Commission</span>
                <span>{sym}{(parseInt(contributionAmount)*members.length*r/100).toFixed(2)} per cycle</span>
              </button>
            ))}
          </div>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'10px',fontSize:'12px',color:'#6B2D4E'}}>
            ⚙️ TARSYN Platform Fee: 0.5% = {sym}{(parseInt(contributionAmount)*members.length*0.005).toFixed(2)} per cycle (fixed)
          </div>
        </div>
        <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'18px'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'14px'}}>🔒 Privacy & Currency</div>
          <Toggle label="🔒 Confidential Mode — Hide beneficiary names" value={confidentialMode} onChange={setConfidentialMode}/>
          <div style={{padding:'10px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:'13px',color:'#2C1A24'}}>Currency</span>
            <select value={currency.code} onChange={e=>{const c=CURRENCIES.find(x=>x.code===e.target.value);if(c)setCurrency(c);}}
              style={{padding:'5px 10px',border:'1.5px solid #D9C0CC',borderRadius:'6px',fontSize:'12px',outline:'none',color:'#2C1A24',background:'white',maxWidth:'200px'}}>
              {CURRENCIES.filter(c=>c.code!=='OTHER').map(c=><option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </>
  );

  const renderPage = () => {
    switch(activePage){
      case 'members':   return <MembersContent/>;
      case 'cycles':    return <CyclesContent/>;
      case 'documents': return <DocumentsContent/>;
      case 'reports':   return <ReportsContent/>;
      case 'alerts':    return <AlertsContent/>;
      case 'settings':  return <SettingsContent/>;
      default:          return <DashboardContent/>;
    }
  };

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex'}}>

      {/* ===== MODALS ===== */}

      {/* ADD MEMBER — Admin only */}
      {showAddMember&&(
        <Modal title="➕ Add New Member" onClose={()=>setShowAddMember(false)}>
          <div style={{background:'#fff3cd',borderRadius:'8px',padding:'8px 12px',marginBottom:'14px',fontSize:'12px',color:'#856404'}}>
            🔒 Admin Only — Only administrators can add members to the group.
          </div>
          <FInput label="Full Name *"                   val={newMember.name}     setVal={v=>setNewMember(p=>({...p,name:v}))}     placeholder="Marie Jean"/>
          <FInput label="Email Address *"               val={newMember.email}    setVal={v=>setNewMember(p=>({...p,email:v}))}    type="email" placeholder="marie@example.com"/>
          <FInput label="Phone Number"                  val={newMember.phone}    setVal={v=>setNewMember(p=>({...p,phone:v}))}    placeholder="+1 (555) 000-0000"/>
          <FInput label="Country"                       val={newMember.country}  setVal={v=>setNewMember(p=>({...p,country:v}))}  placeholder="Haiti"/>
          <FInput label="National ID / Passport Number" val={newMember.idNumber} setVal={v=>setNewMember(p=>({...p,idNumber:v}))} placeholder="A12345678"/>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'10px',marginBottom:'10px',fontSize:'12px',color:'#6B2D4E'}}>
            🪪 TYN-ID auto-generated: <strong>TYN-00000{members.length+1}</strong>
          </div>
          <div style={{background:'#fff3cd',borderRadius:'8px',padding:'10px',marginBottom:'10px',fontSize:'12px',color:'#856404'}}>
            🔒 Identity strictly confidential. Other members will NEVER see this information.
          </div>
          <PrimaryBtn label="Add Member & Send Invitation" onClick={()=>{
            if(!newMember.name||!newMember.email){alert('Please fill required fields.');return;}
            const tynId=`TYN-00000${members.length+1}`;
            const m={id:tynId,name:newMember.name,avatar:newMember.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase(),status:'Unpaid',score:100,country:'🌍',position:members.length+1,receivedDate:'TBD',hasReceived:false,email:newMember.email,phone:newMember.phone,joined:new Date().toLocaleDateString()};
            setMembers(prev=>[...prev,m]);
            alert(`✅ ${newMember.name} added!\nTYN-ID: ${tynId}\nInvitation sent to ${newMember.email}`);
            setShowAddMember(false);
            setNewMember({name:'',email:'',phone:'',country:'',idNumber:''});
          }}/>
        </Modal>
      )}

      {/* RECORD PAYMENT ✅ branché Firebase + reçu */}
      {showRecordPayment&&(
        <Modal title="💰 Record Payment" onClose={resetPayment}>
          {payReceipt?(
            <>
              <div style={{textAlign:'center',paddingBottom:'14px',borderBottom:'2px solid #f0e8f5',marginBottom:'14px'}}>
                <div style={{fontSize:'36px'}}>✅</div>
                <h3 style={{color:'#2d1b4e',margin:'8px 0 4px',fontSize:'16px'}}>Payment Confirmed!</h3>
                <p style={{color:'#888',fontSize:'12px',margin:0}}>Receipt generated automatically</p>
              </div>
              <ReceiptRow label="Receipt #"             value={payReceipt.receiptNumber} bold/>
              <ReceiptRow label="Member"                value={`${payReceipt.memberTynId} — ${payReceipt.memberName}`}/>
              <ReceiptRow label="Amount"                value={`${payReceipt.currencySymbol}${payReceipt.amount} ${payReceipt.currency}`} bold/>
              <ReceiptRow label="Method"                value={payReceipt.paymentMethod}/>
              <ReceiptRow label="TARSYN Fee (0.5%)"     value={`${payReceipt.currencySymbol}${payReceipt.tarsynFee}`}/>
              <ReceiptRow label="Organizer Fee"         value={`${payReceipt.currencySymbol}${payReceipt.organizerFee}`}/>
              <ReceiptRow label="Net Amount"            value={`${payReceipt.currencySymbol}${payReceipt.netAmount}`} bold/>
              <ReceiptRow label="Recorded by"          value={payReceipt.recordedBy}/>
              <ReceiptRow label="Date"                  value={payReceipt.createdAt}/>
              {payReceipt.note&&<ReceiptRow label="Note" value={payReceipt.note}/>}
              <div style={{background:'#f8f4ff',borderRadius:'8px',padding:'10px',textAlign:'center' as any,fontSize:'12px',color:'#6b21a8',fontWeight:'500',margin:'12px 0'}}>
                🔲 QR Code — {payReceipt.receiptNumber}
              </div>
              <PrimaryBtn label="Close" onClick={resetPayment}/>
            </>
          ):(
            <>
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Select Member (TYN-ID)</label>
                <select value={payMember} onChange={e=>setPayMember(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',color:'#2C1A24',background:'white'}}>
                  <option value="">— Select TYN-ID —</option>
                  {members.map(m=><option key={m.id} value={m.id}>{m.id} — {m.name}</option>)}
                </select>
              </div>
              {/* Amount ✅ input normal */}
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Amount ({paySymbol})</label>
                <input type="number" min="0" step="any" placeholder="Ex: 300"
                  value={payAmount}
                  onChange={e=>setPayAmount(e.target.value)}
                  onFocus={(e:any)=>e.target.select()}
                  style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box' as any,color:'#2C1A24',background:'white'}}/>
              </div>
              {/* Devise ✅ liste complète + OTHER */}
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Currency</label>
                <select value={payCurrency} onChange={e=>setPayCurrency(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',color:'#2C1A24',background:'white'}}>
                  {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                </select>
              </div>
              {payCurrency==='OTHER'&&(
                <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
                  <div style={{flex:2}}>
                    <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Currency Name</label>
                    <input type="text" placeholder="Ex: Gourde, Franc..." value={payCustomCur}
                      onChange={e=>setPayCustomCur(e.target.value.toUpperCase())}
                      style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box' as any}}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Symbol</label>
                    <input type="text" placeholder="Ex: G" value={payCustomSym}
                      onChange={e=>setPayCustomSym(e.target.value)}
                      style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box' as any}}/>
                  </div>
                </div>
              )}
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Payment Method</label>
                <select value={payMethod} onChange={e=>setPayMethod(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',color:'#2C1A24',background:'white'}}>
                  {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <FInput label="Note (optional)" val={payNote} setVal={setPayNote} placeholder="Confirmed by organizer"/>
              {payAmt>0&&(
                <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'10px',marginBottom:'10px',fontSize:'12px',color:'#6B2D4E'}}>
                  💼 TARSYN 0.5%: {paySymbol}{tarsynFee} | Organizer {commissionRate}%: {paySymbol}{orgFee} | <strong>Net: {paySymbol}{netAmt}</strong>
                </div>
              )}
              <div style={{background:'#d4edda',borderRadius:'8px',padding:'8px',marginBottom:'8px',fontSize:'11px',color:'#155724'}}>
                ✅ Receipt with QR Code generated automatically after confirmation.
              </div>
              <PrimaryBtn label="Confirm Payment & Generate Receipt" onClick={handleConfirmPayment} loading={payLoading}/>
            </>
          )}
        </Modal>
      )}

      {/* RECEIPT */}
      {showReceipt&&(
        <Modal title="🧾 Generate Receipt" onClose={()=>setShowReceipt(false)}>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'10px',marginBottom:'14px',fontSize:'12px',color:'#6B2D4E'}}>
            🔒 Each member uses ONLY their TYN-ID. No names shown on receipts.
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Select Member (TYN-ID)</label>
            <select value={receiptTynId} onChange={e=>setReceiptTynId(e.target.value)}
              style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',color:'#2C1A24',background:'white'}}>
              <option value="">— Select by TYN-ID —</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
          </div>
          {receiptTynId&&<div style={{background:'#d4edda',borderRadius:'8px',padding:'8px',marginBottom:'12px',fontSize:'12px',color:'#155724'}}>✅ TYN-ID verified. Ready to generate receipt.</div>}
          <div style={{background:'#FAF0E6',borderRadius:'8px',padding:'10px',marginBottom:'12px'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#6B2D4E',marginBottom:'6px'}}>Receipt includes:</div>
            {['TYN-ID only (no full name visible to others)','Payment amount & date','Cycle number & position','QR Code verifiable online','TARSYN official stamp'].map(i=>(
              <div key={i} style={{fontSize:'11px',color:'#7A5068',padding:'1px 0'}}>✓ {i}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'10px'}}>
            {['🖨️ Print','📥 Download PDF','📧 Email','💬 WhatsApp'].map(a=>(
              <button key={a} onClick={()=>{if(!receiptTynId){alert('Select TYN-ID first.');return;}alert(`${a} for ${receiptTynId}!`);}}
                style={{padding:'8px',border:'1px solid #D9C0CC',borderRadius:'7px',background:'white',color:'#6B2D4E',fontSize:'11px',fontWeight:'600',cursor:'pointer'}}>{a}</button>
            ))}
          </div>
          <PrimaryBtn label="Generate Official Receipt" onClick={()=>{
            if(!receiptTynId){alert('Select TYN-ID.');return;}
            alert(`✅ Official receipt generated for ${receiptTynId}!\n🔒 QR Code included.\n📧 Sent automatically.`);
            setShowReceipt(false);setReceiptTynId('');
          }}/>
        </Modal>
      )}

      {/* EXPORT */}
      {showExport&&(
        <Modal title="📤 Export Report" onClose={()=>setShowExport(false)}>
          {['📄 PDF Report','📊 Excel Export','📋 CSV Export','📅 Monthly Report','🖨️ Print Report','📧 Email Report'].map(r=>(
            <div key={r} onClick={()=>setReportType(r)}
              style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',border:`1.5px solid ${reportType===r?'#6B2D4E':'#D9C0CC'}`,borderRadius:'8px',cursor:'pointer',background:reportType===r?'#EDD9E5':'white',marginBottom:'7px'}}>
              <span style={{fontSize:'18px'}}>{r.split(' ')[0]}</span>
              <span style={{fontWeight:'600',color:'#2C1A24',fontSize:'13px'}}>{r.substring(3)}</span>
              {reportType===r&&<span style={{marginLeft:'auto',color:'#6B2D4E',fontWeight:'700'}}>✓</span>}
            </div>
          ))}
          <PrimaryBtn label={`Generate ${reportType||'Report'}`} onClick={()=>{
            if(!reportType){alert('Select a report type.');return;}
            alert(`✅ ${reportType} generated!`);setShowExport(false);setReportType('');
          }}/>
        </Modal>
      )}

      {/* EMERGENCY */}
      {showEmergency&&(
        <Modal title="🚨 Emergency Alert" onClose={()=>setShowEmergency(false)}>
          <div style={{background:'#f8d7da',borderRadius:'8px',padding:'10px',marginBottom:'14px',fontSize:'12px',color:'#721c24'}}>
            ⚠️ Sends IMMEDIATE alert to ALL {members.length} members via App + Email.
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={{display:'block',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',marginBottom:'4px'}}>Emergency Message</label>
            <textarea value={emergencyMsg} onChange={e=>setEmergencyMsg(e.target.value)} placeholder="Write emergency message..." rows={4}
              style={{width:'100%',padding:'9px 12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'13px',outline:'none',boxSizing:'border-box' as any,color:'#2C1A24',background:'white',resize:'vertical' as any}}/>
          </div>
          <PrimaryBtn label={`🚨 Send to ALL ${members.length} Members`} onClick={()=>{
            if(!emergencyMsg.trim()){alert('Write a message.');return;}
            alert(`🚨 Emergency sent to ${members.length} members!\n\n"${emergencyMsg}"`);
            setShowEmergency(false);setEmergencyMsg('');
          }}/>
        </Modal>
      )}

      {/* MEMBER DETAIL */}
      {showMemberDetail&&(
        <Modal title={`👤 ${showMemberDetail.name}`} onClose={()=>setShowMemberDetail(null)}>
          <div style={{display:'grid',gap:'6px'}}>
            {[
              {label:'TYN-ID',       value:showMemberDetail.id},
              {label:'Email',        value:showMemberDetail.email},
              {label:'Phone',        value:showMemberDetail.phone},
              {label:'Country',      value:showMemberDetail.country},
              {label:'Position',     value:`#${showMemberDetail.position}`},
              {label:'Payment Date', value:showMemberDetail.receivedDate},
              {label:'Status',       value:showMemberDetail.status},
              {label:'Score',        value:`${showMemberDetail.score} pts`},
              {label:'Joined',       value:showMemberDetail.joined},
            ].map(f=>(
              <div key={f.label} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F5EAF0'}}>
                <span style={{fontSize:'12px',color:'#7A5068',fontWeight:'600'}}>{f.label}</span>
                <span style={{fontSize:'12px',color:'#2C1A24',fontWeight:'500'}}>{f.value}</span>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'14px'}}>
            <button onClick={()=>alert(`✅ Reminder sent to ${showMemberDetail.id}`)} style={{padding:'10px',border:'1.5px solid #6B2D4E',borderRadius:'8px',background:'white',color:'#6B2D4E',fontWeight:'600',fontSize:'12px',cursor:'pointer'}}>📅 Send Reminder</button>
            <button onClick={()=>{setReceiptTynId(showMemberDetail.id);setShowMemberDetail(null);setShowReceipt(true);}} style={{padding:'10px',border:'none',borderRadius:'8px',background:'#6B2D4E',color:'white',fontWeight:'600',fontSize:'12px',cursor:'pointer'}}>🧾 Generate Receipt</button>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM ✅ nouveau */}
      {showDeleteConfirm&&(
        <Modal title="🗑️ Delete Document" onClose={()=>setShowDeleteConfirm(null)}>
          <div style={{background:'#f8d7da',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#721c24'}}>
            ⚠️ This action is irreversible. The document will be permanently deleted.
          </div>
          <div style={{fontWeight:'600',color:'#2C1A24',fontSize:'14px',marginBottom:'16px'}}>
            "{showDeleteConfirm.name}"
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <button onClick={()=>setShowDeleteConfirm(null)} style={{padding:'12px',border:'1.5px solid #D9C0CC',borderRadius:'8px',background:'white',color:'#6B2D4E',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>Cancel</button>
            <button onClick={()=>handleDeleteDoc(showDeleteConfirm.id)} style={{padding:'12px',border:'none',borderRadius:'8px',background:'#c0392b',color:'white',fontWeight:'700',fontSize:'13px',cursor:'pointer'}}>🗑️ Delete</button>
          </div>
        </Modal>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside style={{width:'220px',background:'#6B2D4E',display:'flex',flexDirection:'column',position:'fixed',top:0,bottom:0,left:0,zIndex:50,overflowY:'auto'}}>
        <div style={{padding:'18px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#D4AF7A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',fontWeight:'700',color:'#6B2D4E'}}>✦</div>
            <div>
              <div style={{color:'#FAF0E6',fontSize:'15px',fontWeight:'700',letterSpacing:'2px'}}>TARSYN</div>
              <div style={{color:'#D4AF7A',fontSize:'8px',letterSpacing:'2px'}}>YOUR COMMUNITY. YOUR POWER.</div>
            </div>
          </div>
        </div>
        <div style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'34px',height:'34px',borderRadius:'50%',background:'#D4AF7A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:'#6B2D4E'}}>{initials}</div>
            <div>
              <div style={{color:'#FAF0E6',fontSize:'12px',fontWeight:'600'}}>{name}</div>
              <div style={{color:'#D4AF7A',fontSize:'9px',letterSpacing:'1px'}}>{isAdmin?'ADMIN / ORGANIZER':'MEMBER'}</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:'10px 0'}}>
          {navItems.map(item=>(
            <div key={item.id} onClick={()=>setActivePage(item.id)}
              style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 18px',cursor:'pointer',
                background:activePage===item.id?'rgba(212,175,122,0.2)':'transparent',
                borderLeft:activePage===item.id?'3px solid #D4AF7A':'3px solid transparent',transition:'all 0.2s'}}>
              <span style={{fontSize:'15px'}}>{item.icon}</span>
              <span style={{fontSize:'12px',fontWeight:activePage===item.id?'700':'400',color:activePage===item.id?'#D4AF7A':'rgba(250,240,230,0.8)'}}>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={{padding:'12px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={()=>signOut(auth).then(()=>window.location.href='/login')}
            style={{width:'100%',padding:'8px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',color:'#FAF0E6',fontSize:'12px',cursor:'pointer'}}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={{marginLeft:'220px',flex:1,display:'flex',flexDirection:'column',minHeight:'100vh'}}>
        <div style={{background:'white',borderBottom:'1px solid #D9C0CC',padding:'0 24px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
          <div style={{fontSize:'16px',fontWeight:'700',color:'#6B2D4E',textTransform:'capitalize'}}>{activePage}</div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <select value={currency.code} onChange={e=>{const c=CURRENCIES.find(x=>x.code===e.target.value);if(c)setCurrency(c);}}
              style={{padding:'5px 10px',background:'#EDD9E5',border:'1px solid #D9C0CC',borderRadius:'20px',fontSize:'11px',fontWeight:'600',color:'#6B2D4E',cursor:'pointer',outline:'none'}}>
              {CURRENCIES.filter(c=>c.code!=='OTHER').map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <button onClick={()=>setShowEmergency(true)} style={{width:'32px',height:'32px',borderRadius:'50%',background:'#f8d7da',border:'none',fontSize:'14px',cursor:'pointer'}} title="Emergency Alert">🚨</button>
            <button onClick={()=>setActivePage('alerts')} style={{width:'32px',height:'32px',borderRadius:'50%',background:'#EDD9E5',border:'none',fontSize:'14px',cursor:'pointer'}} title="Alerts">🔔</button>
            {isAdmin&&<button onClick={()=>alert('⚙️ Admin Panel — coming soon in next update!')} style={{fontSize:'10px',fontWeight:'700',background:'#6B2D4E',color:'#D4AF7A',padding:'4px 10px',borderRadius:'20px',border:'none',cursor:'pointer'}}>ADMIN</button>}
          </div>
        </div>
        <div style={{padding:'20px',flex:1}}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
