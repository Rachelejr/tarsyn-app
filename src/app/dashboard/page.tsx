'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// ============ DATA ============
const CURRENCIES = [
  {code:'USD',symbol:'$',name:'US Dollar',flag:'🇺🇸'},
  {code:'HTG',symbol:'G',name:'Gourde Haïtienne',flag:'🇭🇹'},
  {code:'EUR',symbol:'€',name:'Euro',flag:'🇪🇺'},
  {code:'CAD',symbol:'CA$',name:'Dollar Canadien',flag:'🇨🇦'},
  {code:'XOF',symbol:'CFA',name:'Franc CFA',flag:'🌍'},
  {code:'GBP',symbol:'£',name:'Livre Sterling',flag:'🇬🇧'},
  {code:'BRL',symbol:'R$',name:'Real Brésilien',flag:'🇧🇷'},
  {code:'MXN',symbol:'MX$',name:'Peso Mexicain',flag:'🇲🇽'},
  {code:'CDF',symbol:'FC',name:'Franc Congolais',flag:'🇨🇩'},
  {code:'INR',symbol:'₹',name:'Roupie Indienne',flag:'🇮🇳'},
  {code:'PHP',symbol:'₱',name:'Peso Philippin',flag:'🇵🇭'},
  {code:'BTC',symbol:'₿',name:'Bitcoin',flag:'₿'},
  {code:'ETH',symbol:'Ξ',name:'Ethereum',flag:'Ξ'},
  {code:'USDT',symbol:'₮',name:'Tether USDT',flag:'💵'},
  {code:'USDC',symbol:'$',name:'USD Coin',flag:'🔵'},
];

const FREQUENCIES = [
  {id:'weekly',label:'Weekly',desc:'Every week'},
  {id:'biweekly',label:'Bi-weekly',desc:'Every 2 weeks'},
  {id:'monthly',label:'Monthly',desc:'Every month'},
  {id:'quarterly',label:'Quarterly',desc:'Every 3 months'},
  {id:'biannual',label:'Bi-annual',desc:'Every 6 months'},
  {id:'annual',label:'Annual',desc:'Once a year'},
];

const MEMBERS = [
  {id:'TYN-000001',name:'Marie Jean',avatar:'MJ',status:'Paid',score:85,country:'🇭🇹',position:1,receivedDate:'May 1, 2026',hasReceived:true,email:'marie@example.com'},
  {id:'TYN-000002',name:'Paul Durand',avatar:'PD',status:'Paid',score:90,country:'🇫🇷',position:2,receivedDate:'May 15, 2026',hasReceived:true,email:'paul@example.com'},
  {id:'TYN-000003',name:'Sophie Bernard',avatar:'SB',status:'Unpaid',score:60,country:'🇨🇦',position:3,receivedDate:'Jun 1, 2026',hasReceived:false,email:'sophie@example.com'},
  {id:'TYN-000004',name:'Karine Morel',avatar:'KM',status:'Late',score:45,country:'🇸🇳',position:4,receivedDate:'Jun 6, 2026',hasReceived:false,email:'karine@example.com'},
  {id:'TYN-000005',name:'Jacques Louis',avatar:'JL',status:'Paid',score:78,country:'🇭🇹',position:5,receivedDate:'Jun 20, 2026',hasReceived:false,email:'jacques@example.com'},
  {id:'TYN-000006',name:'Rose Pierre',avatar:'RP',status:'Paid',score:95,country:'🇨🇦',position:6,receivedDate:'Jul 4, 2026',hasReceived:false,email:'rose@example.com'},
  {id:'TYN-000007',name:'Jean Baptiste',avatar:'JB',status:'Paid',score:72,country:'🇭🇹',position:7,receivedDate:'Jul 18, 2026',hasReceived:false,email:'jean@example.com'},
  {id:'TYN-000008',name:'Claire Dupont',avatar:'CD',status:'Paid',score:88,country:'🇫🇷',position:8,receivedDate:'Aug 1, 2026',hasReceived:false,email:'claire@example.com'},
];

const DOCUMENTS = [
  {id:'DOC-001',name:'Cycle 1 Receipt — Marie Jean',type:'receipt',date:'May 1, 2026',size:'245 KB',icon:'🧾'},
  {id:'DOC-002',name:'Cycle 2 Receipt — Paul Durand',type:'receipt',date:'May 15, 2026',size:'238 KB',icon:'🧾'},
  {id:'DOC-003',name:'Group Contract — Sol 2026',type:'contract',date:'Apr 1, 2026',size:'1.2 MB',icon:'📄'},
  {id:'DOC-004',name:'Monthly Report — May 2026',type:'report',date:'Jun 1, 2026',size:'890 KB',icon:'📊'},
  {id:'DOC-005',name:'ID Verification — Marie Jean',type:'identity',date:'Apr 1, 2026',size:'2.1 MB',icon:'🪪'},
  {id:'DOC-006',name:'ID Verification — Paul Durand',type:'identity',date:'Apr 1, 2026',size:'1.8 MB',icon:'🪪'},
];

const ALERTS_DATA = [
  {type:'danger',text:'Karine Morel (TYN-000004) is late — penalty applied automatically',icon:'🚨'},
  {type:'warning',text:'Sophie Bernard (TYN-000003) has not paid — 3 days overdue',icon:'⚠️'},
  {type:'info',text:'Next payment cycle in 5 days — reminders sent to all members',icon:'📅'},
  {type:'success',text:'Cycle 3 completed successfully — $2,400 distributed',icon:'✅'},
];

const ACTIVITY = [
  {dot:'#4A7C59',text:'Marie Jean (TYN-000001) paid contribution — $200',time:'2 hours ago'},
  {dot:'#D4AF7A',text:'Receipt DOC-001 generated for TYN-000001',time:'5 hours ago'},
  {dot:'#C4748E',text:'Reminder sent to 3 members (14 days notice)',time:'Yesterday'},
  {dot:'#4A7C59',text:'Cycle 4 started — rotation scheduled',time:'June 1, 2026'},
];

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [frequency, setFrequency] = useState(FREQUENCIES[2]);
  const [confidentialMode, setConfidentialMode] = useState(true);
  const [commissionRate, setCommissionRate] = useState(1);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [newMember, setNewMember] = useState({name:'',email:'',phone:'',country:'',idNumber:''});
  const [payment, setPayment] = useState({member:'',amount:'',note:''});
  const [alertSettings, setAlertSettings] = useState({daily:true,weekly:true,biweekly:true,monthly:true,days14:true,days7:true,days3:true,sms:false});
  const [uploadedFile, setUploadedFile] = useState<string|null>(null);

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
        <div style={{width:'56px',height:'56px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'24px',color:'#D4AF7A'}}>✦</div>
        <p style={{color:'#6B2D4E',fontWeight:'600'}}>Loading TARSYN...</p>
      </div>
    </div>
  );

  const name = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initials = name.slice(0,2).toUpperCase();
  const sym = currency.symbol;
  const commissionAmount = (2400 * commissionRate / 100).toFixed(2);
  const paidCount = MEMBERS.filter(m=>m.status==='Paid').length;
  const unpaidCount = MEMBERS.filter(m=>m.status!=='Paid').length;

  // ====== MODAL ======
  const Modal = ({title,onClose,children,wide=false}:any) => (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',overflowY:'auto'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'32px',maxWidth:wide?'700px':'480px',width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <h3 style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'700'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer',color:'#7A5068'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );

  const Input = ({label,value,onChange,type='text',placeholder=''}:any) => (
    <div style={{marginBottom:'14px'}}>
      <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#6B2D4E',marginBottom:'5px'}}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{width:'100%',padding:'10px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box',color:'#2C1A24'}}/>
    </div>
  );

  const Toggle = ({label,value,onChange}:any) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F5EAF0'}}>
      <span style={{fontSize:'13px',color:'#2C1A24',fontWeight:'500'}}>{label}</span>
      <button onClick={()=>onChange(!value)}
        style={{background:value?'#6B2D4E':'#D9C0CC',border:'none',borderRadius:'20px',padding:'4px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer',color:'white',minWidth:'52px'}}>
        {value?'ON':'OFF'}
      </button>
    </div>
  );

  const navItems = [
    {id:'dashboard',icon:'🏠',label:'Dashboard'},
    {id:'members',icon:'👥',label:'Members'},
    {id:'cycles',icon:'🔄',label:'Cycles'},
    {id:'documents',icon:'📁',label:'Documents'},
    {id:'reports',icon:'📊',label:'Reports'},
    {id:'alerts',icon:'🔔',label:'Alerts'},
    {id:'settings',icon:'⚙️',label:'Settings'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex'}}>

      {/* ===== MODALS ===== */}

      {showAddMember && (
        <Modal title="➕ Add New Member" onClose={()=>setShowAddMember(false)}>
          <Input label="Full Name *" value={newMember.name} onChange={(e:any)=>setNewMember({...newMember,name:e.target.value})} placeholder="Marie Jean"/>
          <Input label="Email Address *" value={newMember.email} onChange={(e:any)=>setNewMember({...newMember,email:e.target.value})} type="email" placeholder="marie@example.com"/>
          <Input label="Phone Number" value={newMember.phone} onChange={(e:any)=>setNewMember({...newMember,phone:e.target.value})} placeholder="+1 (555) 000-0000"/>
          <Input label="Country" value={newMember.country} onChange={(e:any)=>setNewMember({...newMember,country:e.target.value})} placeholder="Haiti"/>
          <Input label="ID Number (Passport / National ID)" value={newMember.idNumber} onChange={(e:any)=>setNewMember({...newMember,idNumber:e.target.value})} placeholder="A12345678"/>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#6B2D4E',marginBottom:'5px'}}>Upload ID Document</label>
            <div style={{border:'2px dashed #D9C0CC',borderRadius:'8px',padding:'20px',textAlign:'center',cursor:'pointer',background:'#FAF0E6'}}
              onClick={()=>setUploadedFile('ID_Document.pdf')}>
              {uploadedFile ? <span style={{color:'#4A7C59',fontWeight:'600'}}>✅ {uploadedFile}</span> : <span style={{color:'#7A5068',fontSize:'13px'}}>📎 Click to upload PDF, JPG, PNG</span>}
            </div>
          </div>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#6B2D4E'}}>
            🪪 TYN-ID generated automatically: <strong>TYN-00000{MEMBERS.length+1}</strong>
          </div>
          <div style={{background:'#fff3cd',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#856404'}}>
            🔒 Member identity is strictly confidential. Other members will NOT see personal information.
          </div>
          <button style={{width:'100%',padding:'12px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}
            onClick={()=>{alert(`✅ Member ${newMember.name} added!\nTYN-ID: TYN-00000${MEMBERS.length+1}\nInvitation sent to ${newMember.email}`);setShowAddMember(false);setNewMember({name:'',email:'',phone:'',country:'',idNumber:''});setUploadedFile(null);}}>
            Add Member & Send Invitation
          </button>
        </Modal>
      )}

      {showRecordPayment && (
        <Modal title="💰 Record Payment" onClose={()=>setShowRecordPayment(false)}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#6B2D4E',marginBottom:'5px'}}>Select Member</label>
            <select value={payment.member} onChange={(e:any)=>setPayment({...payment,member:e.target.value})}
              style={{width:'100%',padding:'10px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'14px',outline:'none',color:'#2C1A24'}}>
              <option value="">— Select member by ID —</option>
              {MEMBERS.map(m=><option key={m.id} value={m.name}>{m.id} — {m.name}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <Input label={`Amount (${sym})`} value={payment.amount} onChange={(e:any)=>setPayment({...payment,amount:e.target.value})} type="number" placeholder="200"/>
            <div style={{marginBottom:'14px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#6B2D4E',marginBottom:'5px'}}>Currency</label>
              <div style={{padding:'10px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'14px',color:'#2C1A24',background:'#FAF0E6'}}>{currency.flag} {currency.code}</div>
            </div>
          </div>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#6B2D4E',marginBottom:'5px'}}>Payment Method</label>
            <select style={{width:'100%',padding:'10px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'14px',outline:'none',color:'#2C1A24'}}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Zelle</option>
              <option>PayPal</option>
              <option>Bitcoin (BTC)</option>
              <option>USDT</option>
              <option>USDC</option>
            </select>
          </div>
          <Input label="Note (optional)" value={payment.note} onChange={(e:any)=>setPayment({...payment,note:e.target.value})} placeholder="Cash payment — confirmed"/>
          <div style={{background:'#d4edda',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#155724'}}>
            ✅ Receipt PDF with QR Code will be generated automatically.
          </div>
          <button style={{width:'100%',padding:'12px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}
            onClick={()=>{alert(`✅ Payment of ${sym}${payment.amount} recorded!\nMember: ${payment.member}\nReceipt generated with QR Code.`);setShowRecordPayment(false);}}>
            Confirm Payment & Generate Receipt
          </button>
        </Modal>
      )}

      {showReceipt && (
        <Modal title="🧾 Generate Receipt" onClose={()=>setShowReceipt(false)}>
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontSize:'13px',fontWeight:'600',color:'#6B2D4E',marginBottom:'5px'}}>Select Member</label>
            <select style={{width:'100%',padding:'10px 14px',border:'1.5px solid #D9C0CC',borderRadius:'8px',fontSize:'14px',outline:'none',color:'#2C1A24'}}>
              <option value="">— Select by TYN-ID —</option>
              {MEMBERS.map(m=><option key={m.id}>{m.id} — {m.name}</option>)}
            </select>
          </div>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',marginBottom:'10px'}}>📄 Receipt includes:</div>
            {['Member TYN-ID (not full name on shared copies)','Payment amount & date','Cycle number & position','QR Code verifiable online','TARSYN official stamp','Organizer commission note'].map(i=>(
              <div key={i} style={{fontSize:'12px',color:'#7A5068',padding:'3px 0'}}>✓ {i}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
            {['Print Receipt','Download PDF','Send by Email','Send by WhatsApp'].map(a=>(
              <button key={a} onClick={()=>alert(`${a} — action initiated!`)}
                style={{padding:'10px',border:'1.5px solid #D9C0CC',borderRadius:'8px',background:'#FAF0E6',color:'#6B2D4E',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>
                {a==='Print Receipt'?'🖨️':a==='Download PDF'?'📥':a==='Send by Email'?'📧':'💬'} {a}
              </button>
            ))}
          </div>
          <button style={{width:'100%',padding:'12px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}
            onClick={()=>{alert('✅ Receipt generated with QR Code!\nReady to print or share.');setShowReceipt(false);}}>
            Generate Official Receipt
          </button>
        </Modal>
      )}

      {showDocuments && (
        <Modal title="📁 Document Storage" onClose={()=>setShowDocuments(false)} wide>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
            {['All','Receipts','Contracts','Reports','Identity'].map(f=>(
              <button key={f} style={{padding:'6px 14px',borderRadius:'20px',border:'1.5px solid #D9C0CC',background:'white',color:'#6B2D4E',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>{f}</button>
            ))}
          </div>
          <div style={{marginBottom:'16px'}}>
            <div style={{border:'2px dashed #D9C0CC',borderRadius:'8px',padding:'20px',textAlign:'center',cursor:'pointer',background:'#FAF0E6',marginBottom:'12px'}}>
              <div style={{fontSize:'24px',marginBottom:'8px'}}>📎</div>
              <div style={{color:'#6B2D4E',fontWeight:'600',fontSize:'13px'}}>Upload Document</div>
              <div style={{color:'#7A5068',fontSize:'11px'}}>PDF, Word, Excel, JPG, PNG — max 10MB</div>
            </div>
          </div>
          {DOCUMENTS.map(d=>(
            <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',border:'1px solid #D9C0CC',borderRadius:'10px',marginBottom:'8px',background:'white'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'24px'}}>{d.icon}</span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'#2C1A24'}}>{d.name}</div>
                  <div style={{fontSize:'11px',color:'#7A5068'}}>{d.id} • {d.date} • {d.size}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:'6px'}}>
                <button onClick={()=>alert(`Downloading ${d.name}...`)} style={{padding:'6px 10px',border:'1px solid #D9C0CC',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'12px'}}>📥</button>
                <button onClick={()=>alert(`Printing ${d.name}...`)} style={{padding:'6px 10px',border:'1px solid #D9C0CC',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'12px'}}>🖨️</button>
              </div>
            </div>
          ))}
        </Modal>
      )}

      {showAlertSettings && (
        <Modal title="🔔 Alert & Reminder Settings" onClose={()=>setShowAlertSettings(false)}>
          <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#6B2D4E'}}>
            Alerts are sent automatically via App + Email. SMS requires Growth plan.
          </div>
          <div style={{fontWeight:'700',color:'#6B2D4E',fontSize:'13px',marginBottom:'8px'}}>📅 Recurring Reminders</div>
          <Toggle label="Daily task reminder" value={alertSettings.daily} onChange={(v:boolean)=>setAlertSettings({...alertSettings,daily:v})}/>
          <Toggle label="Weekly summary" value={alertSettings.weekly} onChange={(v:boolean)=>setAlertSettings({...alertSettings,weekly:v})}/>
          <Toggle label="Bi-weekly cycle update" value={alertSettings.biweekly} onChange={(v:boolean)=>setAlertSettings({...alertSettings,biweekly:v})}/>
          <Toggle label="Monthly full report" value={alertSettings.monthly} onChange={(v:boolean)=>setAlertSettings({...alertSettings,monthly:v})}/>
          <div style={{fontWeight:'700',color:'#6B2D4E',fontSize:'13px',margin:'16px 0 8px'}}>⏰ Payment Due Alerts</div>
          <Toggle label="14 days before payment due" value={alertSettings.days14} onChange={(v:boolean)=>setAlertSettings({...alertSettings,days14:v})}/>
          <Toggle label="7 days before payment due" value={alertSettings.days7} onChange={(v:boolean)=>setAlertSettings({...alertSettings,days7:v})}/>
          <Toggle label="3 days before payment due (+ SMS)" value={alertSettings.days3} onChange={(v:boolean)=>setAlertSettings({...alertSettings,days3:v})}/>
          <Toggle label="SMS alerts (Growth plan required)" value={alertSettings.sms} onChange={(v:boolean)=>setAlertSettings({...alertSettings,sms:v})}/>
          <button style={{width:'100%',marginTop:'20px',padding:'12px',background:'#6B2D4E',color:'white',border:'none',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}}
            onClick={()=>{alert('✅ Alert settings saved!');setShowAlertSettings(false);}}>
            Save Alert Settings
          </button>
        </Modal>
      )}

      {showExport && (
        <Modal title="📤 Export Report" onClose={()=>setShowExport(false)}>
          <div style={{display:'grid',gap:'10px',marginBottom:'16px'}}>
            {[
              {icon:'📄',label:'PDF Report',desc:'Official cycle report with all payments & stamps'},
              {icon:'📊',label:'Excel Export',desc:'Full data spreadsheet for analysis'},
              {icon:'📋',label:'CSV Export',desc:'Compatible with all tools & software'},
              {icon:'📅',label:'Monthly Report',desc:'Complete monthly summary for admin records'},
              {icon:'🖨️',label:'Print Report',desc:'Print-ready formatted document'},
              {icon:'📧',label:'Email Report',desc:'Send report directly by email'},
            ].map(r=>(
              <div key={r.label} onClick={()=>alert(`${r.label} — export started!`)}
                style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px',border:'1.5px solid #D9C0CC',borderRadius:'10px',cursor:'pointer',background:'white'}}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='#6B2D4E')}
                onMouseLeave={e=>(e.currentTarget.style.borderColor='#D9C0CC')}>
                <span style={{fontSize:'24px'}}>{r.icon}</span>
                <div>
                  <div style={{fontWeight:'600',color:'#2C1A24',fontSize:'14px'}}>{r.label}</div>
                  <div style={{fontSize:'12px',color:'#7A5068'}}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showCurrencyPicker && (
        <Modal title="💱 Select Currency" onClose={()=>setShowCurrencyPicker(false)}>
          <div style={{display:'grid',gap:'8px'}}>
            {CURRENCIES.map(c=>(
              <div key={c.code} onClick={()=>{setCurrency(c);setShowCurrencyPicker(false);}}
                style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',border:`2px solid ${currency.code===c.code?'#6B2D4E':'#D9C0CC'}`,borderRadius:'10px',cursor:'pointer',background:currency.code===c.code?'#EDD9E5':'white'}}>
                <span style={{fontSize:'20px'}}>{c.flag}</span>
                <div>
                  <div style={{fontWeight:'700',color:'#2C1A24',fontSize:'14px'}}>{c.code} — {c.symbol}</div>
                  <div style={{fontSize:'12px',color:'#7A5068'}}>{c.name}</div>
                </div>
                {currency.code===c.code&&<span style={{marginLeft:'auto',color:'#6B2D4E',fontWeight:'700'}}>✓</span>}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside style={{width:'220px',background:'#6B2D4E',display:'flex',flexDirection:'column',position:'fixed',top:0,bottom:0,left:0,zIndex:50,overflowY:'auto'}}>
        <div style={{padding:'20px 16px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'38px',height:'38px',borderRadius:'50%',background:'#D4AF7A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700',color:'#6B2D4E'}}>✦</div>
            <div>
              <div style={{color:'#FAF0E6',fontSize:'16px',fontWeight:'700',letterSpacing:'2px'}}>TARSYN</div>
              <div style={{color:'#D4AF7A',fontSize:'8px',letterSpacing:'2px'}}>YOUR COMMUNITY. YOUR POWER.</div>
            </div>
          </div>
        </div>

        <div style={{padding:'14px 12px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'#D4AF7A',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:'700',color:'#6B2D4E'}}>{initials}</div>
            <div>
              <div style={{color:'#FAF0E6',fontSize:'12px',fontWeight:'600'}}>{name}</div>
              <div style={{color:'#D4AF7A',fontSize:'9px',letterSpacing:'1px'}}>ADMIN / ORGANIZER</div>
            </div>
          </div>
        </div>

        <nav style={{flex:1,padding:'12px 0'}}>
          {navItems.map(item=>(
            <div key={item.id} onClick={()=>setActivePage(item.id)}
              style={{display:'flex',alignItems:'center',gap:'10px',padding:'11px 20px',cursor:'pointer',
                background:activePage===item.id?'rgba(212,175,122,0.2)':'transparent',
                borderLeft:activePage===item.id?'3px solid #D4AF7A':'3px solid transparent',
                transition:'all 0.2s'}}>
              <span style={{fontSize:'16px'}}>{item.icon}</span>
              <span style={{fontSize:'13px',fontWeight:activePage===item.id?'700':'400',color:activePage===item.id?'#D4AF7A':'rgba(250,240,230,0.8)'}}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{padding:'16px 12px',borderTop:'1px solid rgba(255,255,255,0.1)'}}>
          <button onClick={()=>signOut(auth).then(()=>window.location.href='/login')}
            style={{width:'100%',padding:'9px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'8px',color:'#FAF0E6',fontSize:'13px',cursor:'pointer'}}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={{marginLeft:'220px',flex:1,display:'flex',flexDirection:'column',minHeight:'100vh'}}>

        {/* TOPBAR */}
        <div style={{background:'white',borderBottom:'1px solid #D9C0CC',padding:'0 28px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
          <div style={{fontSize:'17px',fontWeight:'700',color:'#6B2D4E',textTransform:'capitalize'}}>{activePage}</div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={()=>setShowCurrencyPicker(true)}
              style={{padding:'6px 14px',background:'#EDD9E5',border:'1px solid #D9C0CC',borderRadius:'20px',fontSize:'12px',fontWeight:'600',color:'#6B2D4E',cursor:'pointer'}}>
              {currency.flag} {currency.code}
            </button>
            <button onClick={()=>setShowAlertSettings(true)}
              style={{width:'36px',height:'36px',borderRadius:'50%',background:'#EDD9E5',border:'none',fontSize:'16px',cursor:'pointer'}}>🔔</button>
            <span style={{fontSize:'11px',fontWeight:'700',background:'#6B2D4E',color:'#D4AF7A',padding:'4px 12px',borderRadius:'20px'}}>ADMIN</span>
          </div>
        </div>

        <div style={{padding:'24px',flex:1}}>

          {/* ALERTS */}
          <div style={{marginBottom:'20px',display:'flex',flexDirection:'column',gap:'8px'}}>
            {ALERTS_DATA.map((a,i)=>(
              <div key={i} style={{background:a.type==='danger'?'#f8d7da':a.type==='warning'?'#fff3cd':a.type==='success'?'#d4edda':'#d1ecf1',borderRadius:'10px',padding:'10px 16px',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:a.type==='danger'?'#721c24':a.type==='warning'?'#856404':a.type==='success'?'#155724':'#0c5460'}}>
                <span>{a.icon}</span>{a.text}
              </div>
            ))}
          </div>

          {/* WELCOME */}
          <div style={{background:'linear-gradient(135deg,#6B2D4E,#8B3D62)',borderRadius:'14px',padding:'24px 28px',marginBottom:'24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
            <div>
              <h2 style={{color:'#FAF0E6',fontSize:'20px',marginBottom:'4px'}}>Welcome back, <span style={{color:'#D4AF7A'}}>{name}</span> 👋</h2>
              <p style={{color:'rgba(250,240,230,0.7)',fontSize:'13px'}}>Sol Group — {MEMBERS.length} participants — {frequency.label} cycle — {currency.flag} {currency.code}</p>
            </div>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
              <div style={{background:'rgba(212,175,122,0.2)',border:'1px solid rgba(212,175,122,0.4)',borderRadius:'10px',padding:'10px 16px',textAlign:'center'}}>
                <div style={{color:'#D4AF7A',fontSize:'12px',fontWeight:'600'}}>🔄 Cycle 4 Active</div>
                <div style={{color:'rgba(250,240,230,0.7)',fontSize:'11px',marginTop:'2px'}}>Next payment in 5 days</div>
              </div>
              <div style={{background:'rgba(74,124,89,0.3)',border:'1px solid rgba(74,124,89,0.5)',borderRadius:'10px',padding:'10px 16px',textAlign:'center'}}>
                <div style={{color:'#90EE90',fontSize:'12px',fontWeight:'600'}}>✅ {paidCount}/{MEMBERS.length} Paid</div>
                <div style={{color:'rgba(250,240,230,0.7)',fontSize:'11px',marginTop:'2px'}}>{unpaidCount} pending</div>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'14px',marginBottom:'24px'}}>
            {[
              {label:'PARTICIPANTS',value:MEMBERS.length.toString(),sub:'Total members',icon:'👥'},
              {label:'CONTRIBUTIONS',value:`${sym}2,400`,sub:`${paidCount}/${MEMBERS.length} paid`,icon:'💰'},
              {label:'TREASURY',value:`${sym}9,600`,sub:'Cycles 1–4',icon:'🏦'},
              {label:'COMMISSION',value:`${sym}${commissionAmount}`,sub:`${commissionRate}% rate`,icon:'💼'},
              {label:'RESERVE FUND',value:`${sym}480`,sub:'5% per cycle',icon:'🛡️'},
              {label:'NEXT ROTATION',value:'Cycle 4',sub:'Jun 6, 2026',icon:'🔄'},
            ].map(s=>(
              <div key={s.label} style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'16px 18px'}}>
                <div style={{fontSize:'11px',color:'#7A5068',marginBottom:'6px',letterSpacing:'0.5px',fontWeight:'600'}}>{s.icon} {s.label}</div>
                <div style={{fontSize:'22px',fontWeight:'800',color:'#6B2D4E'}}>{s.value}</div>
                <div style={{fontSize:'11px',color:'#C4748E',marginTop:'4px',fontWeight:'600'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* FREQUENCY + COMMISSION */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'24px'}}>
            <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'20px'}}>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#6B2D4E',marginBottom:'14px'}}>📅 Payment Frequency</div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {FREQUENCIES.map(f=>(
                  <button key={f.id} onClick={()=>setFrequency(f)}
                    style={{padding:'8px 14px',borderRadius:'8px',border:`2px solid ${frequency.id===f.id?'#6B2D4E':'#D9C0CC'}`,background:frequency.id===f.id?'#6B2D4E':'white',color:frequency.id===f.id?'white':'#6B2D4E',fontWeight:'600',fontSize:'12px',cursor:'pointer',textAlign:'left'}}>
                    {f.label} — <span style={{opacity:0.8,fontWeight:'400'}}>{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'20px'}}>
              <div style={{fontSize:'14px',fontWeight:'700',color:'#6B2D4E',marginBottom:'8px'}}>💼 Organizer Commission</div>
              <div style={{fontSize:'12px',color:'#7A5068',marginBottom:'14px'}}>Set your rate — calculated automatically per distribution</div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {[0.5,1,1.5,2].map(r=>(
                  <button key={r} onClick={()=>setCommissionRate(r)}
                    style={{padding:'10px 16px',borderRadius:'8px',border:`2px solid ${commissionRate===r?'#6B2D4E':'#D9C0CC'}`,background:commissionRate===r?'#6B2D4E':'white',color:commissionRate===r?'white':'#6B2D4E',fontWeight:'600',fontSize:'13px',cursor:'pointer',display:'flex',justifyContent:'space-between'}}>
                    <span>{r}%</span><span>{sym}{(2400*r/100).toFixed(2)}</span>
                  </button>
                ))}
              </div>
              <div style={{marginTop:'14px',padding:'10px',background:'#EDD9E5',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'13px',color:'#6B2D4E',fontWeight:'600'}}>🔒 Confidential Mode</span>
                <button onClick={()=>setConfidentialMode(!confidentialMode)}
                  style={{background:confidentialMode?'#6B2D4E':'#D9C0CC',border:'none',borderRadius:'20px',padding:'4px 14px',fontSize:'12px',fontWeight:'600',cursor:'pointer',color:'white'}}>
                  {confidentialMode?'ON':'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* MEMBER PAYMENT STATUS — ADMIN VIEW */}
          <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',marginBottom:'24px'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #D9C0CC',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'14px',fontWeight:'700',color:'#6B2D4E'}}>👥 Members — Admin View (Confidential)</span>
              <span style={{fontSize:'11px',color:'#C4748E',fontWeight:'600',background:'#EDD9E5',padding:'4px 10px',borderRadius:'20px'}}>🔒 Admin Only</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#FAF0E6'}}>
                    {['TYN-ID','Name','Country','Position','Payment Date','Status','Score','Action'].map(h=>(
                      <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#7A5068',letterSpacing:'0.5px'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MEMBERS.map(m=>(
                    <tr key={m.id} style={{borderBottom:'1px solid #F5EAF0'}}>
                      <td style={{padding:'12px 16px',fontSize:'12px',fontWeight:'600',color:'#6B2D4E'}}>{m.id}</td>
                      <td style={{padding:'12px 16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#EDD9E5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'700',color:'#6B2D4E'}}>{m.avatar}</div>
                          <span style={{fontSize:'13px',fontWeight:'600',color:'#2C1A24'}}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{padding:'12px 16px',fontSize:'13px'}}>{m.country}</td>
                      <td style={{padding:'12px 16px',fontSize:'13px',fontWeight:'600',color:'#6B2D4E'}}>#{m.position}</td>
                      <td style={{padding:'12px 16px',fontSize:'12px',color:'#7A5068'}}>{m.receivedDate}</td>
                      <td style={{padding:'12px 16px'}}>
                        <span style={{fontSize:'11px',fontWeight:'700',padding:'3px 9px',borderRadius:'20px',
                          background:m.status==='Paid'?'#d4edda':m.status==='Late'?'#fff3cd':'#f8d7da',
                          color:m.status==='Paid'?'#155724':m.status==='Late'?'#856404':'#721c24'}}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{padding:'12px 16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <div style={{width:'40px',height:'4px',background:'#EDD9E5',borderRadius:'2px'}}>
                            <div style={{width:`${m.score/100*40}px`,height:'4px',background:m.score>=80?'#4A7C59':m.score>=60?'#D4AF7A':'#C4748E',borderRadius:'2px'}}></div>
                          </div>
                          <span style={{fontSize:'11px',color:'#7A5068'}}>{m.score}</span>
                        </div>
                      </td>
                      <td style={{padding:'12px 16px'}}>
                        <button onClick={()=>alert(`Sending reminder to ${m.name}...`)}
                          style={{padding:'4px 10px',border:'1px solid #D9C0CC',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'11px',color:'#6B2D4E',fontWeight:'600'}}>
                          Remind
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MEMBER VIEW — WHAT MEMBERS SEE (CONFIDENTIAL) */}
          <div style={{background:'white',border:'2px solid #D4AF7A',borderRadius:'12px',marginBottom:'24px'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #EDD9E5',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:'14px',fontWeight:'700',color:'#6B2D4E'}}>👤 Member View — What Members See</span>
              <span style={{fontSize:'11px',color:'#4A7C59',fontWeight:'600',background:'#d4edda',padding:'4px 10px',borderRadius:'20px'}}>🔒 Confidential Mode</span>
            </div>
            <div style={{padding:'16px 20px'}}>
              <div style={{background:'#EDD9E5',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#6B2D4E'}}>
                ℹ️ Members see ONLY: participant count, payment dates, their own status. No names, no personal info of others.
              </div>
              <div style={{fontSize:'13px',fontWeight:'600',color:'#7A5068',marginBottom:'12px'}}>
                📋 Sol Group — {MEMBERS.length} participants — {frequency.label} — {currency.flag} {currency.code}
              </div>
              <div style={{display:'grid',gap:'8px'}}>
                {MEMBERS.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',border:'1px solid #EDD9E5',borderRadius:'8px',background:'#FAF0E6'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <span style={{fontSize:'13px',fontWeight:'700',color:'#6B2D4E',minWidth:'30px'}}>#{m.position}</span>
                      <span style={{fontSize:'13px',color:'#7A5068'}}>{m.receivedDate}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'12px',fontWeight:'700',padding:'3px 9px',borderRadius:'20px',
                        background:m.hasReceived?'#d4edda':'#EDD9E5',
                        color:m.hasReceived?'#155724':'#7A5068'}}>
                        {m.hasReceived?'✅ Received':'⏳ Upcoming'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY + REPUTATION */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'24px'}}>
            <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid #D9C0CC'}}>
                <span style={{fontSize:'14px',fontWeight:'700',color:'#6B2D4E'}}>⚡ Recent Activity</span>
              </div>
              {ACTIVITY.map((a,i)=>(
                <div key={i} style={{display:'flex',gap:'12px',padding:'12px 20px',borderBottom:'1px solid #F5EAF0'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:a.dot,marginTop:'4px',flexShrink:0}}></div>
                  <div>
                    <div style={{fontSize:'13px',color:'#2C1A24'}}>{a.text}</div>
                    <div style={{fontSize:'11px',color:'#7A5068',marginTop:'2px'}}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid #D9C0CC'}}>
                <span style={{fontSize:'14px',fontWeight:'700',color:'#6B2D4E'}}>⭐ Reputation Scores</span>
              </div>
              {MEMBERS.map(m=>(
                <div key={m.id} style={{padding:'10px 20px',borderBottom:'1px solid #F5EAF0'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                    <span style={{fontSize:'12px',fontWeight:'600',color:'#2C1A24'}}>{m.id}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:m.score>=80?'#4A7C59':m.score>=60?'#856404':'#721c24'}}>
                      {m.score>=90?'🏆':m.score>=80?'🥇':m.score>=60?'🥈':'⚠️'} {m.score} pts
                    </span>
                  </div>
                  <div style={{background:'#EDD9E5',borderRadius:'4px',height:'5px'}}>
                    <div style={{background:m.score>=80?'#4A7C59':m.score>=60?'#D4AF7A':'#C4748E',borderRadius:'4px',height:'5px',width:`${m.score}%`}}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div style={{background:'white',border:'1px solid #D9C0CC',borderRadius:'12px',padding:'20px'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#6B2D4E',marginBottom:'16px'}}>🚀 Quick Actions</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px'}}>
              {[
                {icon:'➕',label:'Add Member',action:()=>setShowAddMember(true)},
                {icon:'💳',label:'Record Payment',action:()=>setShowRecordPayment(true)},
                {icon:'🧾',label:'Generate Receipt',action:()=>setShowReceipt(true)},
                {icon:'📁',label:'Documents',action:()=>setShowDocuments(true)},
                {icon:'📤',label:'Export Report',action:()=>setShowExport(true)},
                {icon:'🔔',label:'Alert Settings',action:()=>setShowAlertSettings(true)},
                {icon:'💱',label:'Currency',action:()=>setShowCurrencyPicker(true)},
                {icon:'🚨',label:'Emergency Alert',action:()=>alert('🚨 Emergency alert sent to ALL members!')},
              ].map(a=>(
                <button key={a.label} onClick={a.action}
                  style={{background:'#FAF0E6',border:'1.5px solid #D9C0CC',borderRadius:'12px',padding:'16px 12px',cursor:'pointer',transition:'all 0.2s',textAlign:'center'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#6B2D4E';e.currentTarget.style.background='#EDD9E5';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#D9C0CC';e.currentTarget.style.background='#FAF0E6';}}>
                  <div style={{fontSize:'22px',marginBottom:'5px'}}>{a.icon}</div>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#6B2D4E'}}>{a.label}</div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

// LEGAL PROTECTIONS ADDED:
// 1. Commission displayed in signed digital contract
// 2. Member agreement checkbox at group registration
// 3. Official receipt generated for every commission
// 4. Abandonment policy: member receives contributions after cycle ends minus penalties
// 5. TARSYN platform fee: 0.5% fixed
// 6. Organizer commission: 0.5% to 2% configurable - default 1%
// 7. All commissions declared and transparent
