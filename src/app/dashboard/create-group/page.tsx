'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const COUNTRIES = [
  'Haiti','Canada','United States','France','Belgium','Switzerland',
  'Senegal','Ivory Coast','Cameroon','Congo','Mali','Guinea',
  'Togo','Benin','Burkina Faso','Madagascar','Martinique','Guadeloupe',
  'United Kingdom','Germany','Italy','Spain','Portugal','Brazil',
  'Mexico','Colombia','Jamaica','Trinidad','Other'
];

export default function CreateGroup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Identity
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('Family');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');

  // Module
  const [module, setModule] = useState('Sol');

  // Contribution
  const [contributionAmount, setContributionAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [frequency, setFrequency] = useState('Monthly');

  // Rotation
  const [rotationMode, setRotationMode] = useState('Manual');
  const [startDate, setStartDate] = useState('');

  // Privacy
  const [privacy, setPrivacy] = useState('Private');
  const [memberLimit, setMemberLimit] = useState('20');
  const [adminPosition, setAdminPosition] = useState('1');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedGroup, setSavedGroup] = useState<any>(null);

  const generateCode = (prefix: string, countryCode: string) => {
    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-6);
    return `${prefix}-${countryCode}-${year}-${seq}`;
  };

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (groupName.trim().length < 3) { setError('Group name must be at least 3 characters.'); return false; }
      if (!country) { setError('Country is required.'); return false; }
    }
    if (step === 3) {
      if (contributionAmount && parseFloat(contributionAmount) <= 0) { setError('Contribution amount must be greater than 0.'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
  };

  const handleCreate = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }

      const q = query(collection(db, 'groups'), where('adminId', '==', user.uid), where('name', '==', groupName.trim()));
      const existing = await getDocs(q);
      if (!existing.empty) { setError('You already have a group with this name.'); setLoading(false); return; }

      const countryCode = country.substring(0, 2).toUpperCase();
      const groupCode = generateCode('TGR', countryCode);
      const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      const inviteLink = `/join/${inviteCode}`;

      const groupRef = await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        groupCode,
        groupType,
        module,
        description: description.trim(),
        country,
        region: region.trim(),
        privacy,
        memberLimit: parseInt(memberLimit),
        contributionSettings: { amount: contributionAmount ? parseFloat(contributionAmount) : 0, currency, frequency },
        rotationSettings: { mode: rotationMode, startDate },
        adminId: user.uid,
        adminPosition: parseInt(adminPosition),
        status: 'active',
        inviteCode,
        inviteLink,
        memberCount: 1,
        createdAt: serverTimestamp(),
      });

      const memberCode = generateCode('TYN', countryCode);
      await addDoc(collection(db, 'members'), {
        groupId: groupRef.id,
        name: user.displayName || user.email?.split('@')[0] || 'Admin',
        email: user.email,
        tynId: memberCode,
        memberCode,
        position: parseInt(adminPosition),
        role: 'admin',
        status: 'active',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      setSavedGroup({ name: groupName, groupCode, inviteCode, inviteLink: `https://tarsyn-app.com/join/${inviteCode}` });
    } catch(e) {
      console.error(e);
      setError('Error creating group. Please try again.');
    }
    setLoading(false);
  };

  if (savedGroup) return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{background:'white',borderRadius:'24px',padding:'48px',maxWidth:'480px',width:'100%',boxShadow:'0 8px 32px rgba(107,45,78,0.12)',textAlign:'center'}}>
        <div style={{fontSize:'56px',marginBottom:'16px'}}>🎉</div>
        <h2 style={{color:'#6B2D4E',fontSize:'26px',fontWeight:'800',margin:'0 0 8px'}}>Group Created!</h2>
        <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 24px'}}>{savedGroup.name}</p>

        <div style={{background:'#FAF0E6',borderRadius:'16px',padding:'20px',marginBottom:'24px',textAlign:'left'}}>
          <p style={{margin:'0 0 10px',color:'#7A5068',fontSize:'13px'}}>Group Code</p>
          <p style={{margin:'0 0 16px',color:'#6B2D4E',fontWeight:'800',fontSize:'15px',fontFamily:'monospace'}}>{savedGroup.groupCode}</p>
          <p style={{margin:'0 0 10px',color:'#7A5068',fontSize:'13px'}}>Invite Code</p>
          <p style={{margin:'0 0 16px',color:'#6B2D4E',fontWeight:'800',fontSize:'15px',fontFamily:'monospace'}}>{savedGroup.inviteCode}</p>
          <p style={{margin:'0 0 10px',color:'#7A5068',fontSize:'13px'}}>Invite Link</p>
          <p style={{margin:'0',color:'#6B2D4E',fontSize:'13px',wordBreak:'break-all'}}>{savedGroup.inviteLink}</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
          <button onClick={() => navigator.clipboard.writeText(savedGroup.inviteLink)}
            style={{background:'#D4AF7A',color:'#6B2D4E',padding:'12px',borderRadius:'12px',border:'none',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            Copy Link
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{background:'#6B2D4E',color:'#FAF0E6',padding:'12px',borderRadius:'12px',border:'none',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',padding:'24px'}}>
      <div style={{maxWidth:'560px',margin:'0 auto'}}>

        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'32px',cursor:'pointer'}} onClick={() => router.push('/')}>
          <div style={{width:'32px',height:'32px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#D4AF7A',fontWeight:'800',fontSize:'13px'}}>T</div>
          <span style={{color:'#6B2D4E',fontWeight:'800',fontSize:'16px'}}>TARSYN</span>
        </div>

        <div style={{display:'flex',gap:'8px',marginBottom:'32px'}}>
          {Array.from({length:totalSteps},(_,i) => (
            <div key={i} style={{flex:1,height:'4px',borderRadius:'4px',background:i < step ? '#6B2D4E' : '#E8D5E0',transition:'background 0.3s'}}/>
          ))}
        </div>

        <div style={{background:'white',borderRadius:'24px',padding:'40px',boxShadow:'0 8px 32px rgba(107,45,78,0.12)'}}>

          {error && <p style={{color:'#E53935',fontSize:'13px',marginBottom:'16px',background:'#FFEBEE',padding:'10px 14px',borderRadius:'8px'}}>{error}</p>}

          {step === 1 && (
            <>
              <h1 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'800',margin:'0 0 4px'}}>Group Identity</h1>
              <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 28px'}}>Step 1 of {totalSteps}</p>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Group Name *</label>
                <input value={groupName} onChange={e => setGroupName(e.target.value)}
                  placeholder="Ex: Family Sol, Community Tontine..."
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Group Type</label>
                <select value={groupType} onChange={e => setGroupType(e.target.value)}
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
                  {['Family','Friends','Community','Professional','Church','Association','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value.slice(0,300))}
                  placeholder="Brief description of your group..." rows={3}
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}}/>
                <p style={{color:'#7A5068',fontSize:'11px',margin:'4px 0 0',textAlign:'right'}}>{description.length}/300</p>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div>
                  <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Country *</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
                    <option value="">Select...</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Region / State</label>
                  <input value={region} onChange={e => setRegion(e.target.value)} placeholder="Ex: Quebec, Florida..."
                    style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'800',margin:'0 0 4px'}}>Choose Module</h1>
              <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 28px'}}>Step 2 of {totalSteps}</p>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                {[
                  {name:'Sol',icon:'☀️',desc:'Rotating savings'},
                  {name:'Tontine',icon:'🤝',desc:'Community fund'},
                  {name:'Association',icon:'🏛️',desc:'Formal group'},
                  {name:'Church',icon:'⛪',desc:'Faith community'},
                ].map(m => (
                  <div key={m.name} onClick={() => setModule(m.name)}
                    style={{border:`2px solid ${module===m.name?'#6B2D4E':'#E8D5E0'}`,borderRadius:'16px',padding:'20px',cursor:'pointer',background:module===m.name?'#FAF0E6':'white',transition:'all 0.2s'}}>
                    <div style={{fontSize:'28px',marginBottom:'8px'}}>{m.icon}</div>
                    <p style={{color:'#6B2D4E',fontWeight:'700',fontSize:'15px',margin:'0 0 4px'}}>{m.name}</p>
                    <p style={{color:'#7A5068',fontSize:'12px',margin:'0'}}>{m.desc}</p>
                  </div>
                ))}
                {['Organization','Foundation','Agriculture'].map(m => (
                  <div key={m} style={{border:'2px solid #E8D5E0',borderRadius:'16px',padding:'20px',background:'#F5F5F5',opacity:0.6}}>
                    <p style={{color:'#9E9E9E',fontWeight:'700',fontSize:'15px',margin:'0 0 4px'}}>{m}</p>
                    <p style={{color:'#BDBDBD',fontSize:'12px',margin:'0'}}>Coming Soon</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'800',margin:'0 0 4px'}}>Contribution Settings</h1>
              <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 28px'}}>Step 3 of {totalSteps}</p>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                <div>
                  <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Amount per Member</label>
                  <input value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} type="number" min="0" placeholder="0.00"
                    style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
                    {['USD','CAD','EUR','GBP','HTG','XOF','XAF','BRL'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Frequency</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {['Weekly','Biweekly','Monthly'].map(f => (
                    <button key={f} onClick={() => setFrequency(f)}
                      style={{flex:1,padding:'10px',border:`2px solid ${frequency===f?'#6B2D4E':'#E8D5E0'}`,borderRadius:'10px',background:frequency===f?'#6B2D4E':'white',color:frequency===f?'white':'#6B2D4E',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Rotation Mode</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {['Manual','Automatic'].map(r => (
                    <button key={r} onClick={() => setRotationMode(r)}
                      style={{flex:1,padding:'10px',border:`2px solid ${rotationMode===r?'#6B2D4E':'#E8D5E0'}`,borderRadius:'10px',background:rotationMode===r?'#6B2D4E':'white',color:rotationMode===r?'white':'#6B2D4E',fontWeight:'600',fontSize:'13px',cursor:'pointer'}}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Start Date</label>
                <input value={startDate} onChange={e => setStartDate(e.target.value)} type="date"
                  style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'800',margin:'0 0 4px'}}>Privacy & Settings</h1>
              <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 28px'}}>Step 4 of {totalSteps}</p>

              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Privacy</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {['Private','Invite Only','Public'].map(p => (
                    <button key={p} onClick={() => setPrivacy(p)}
                      style={{flex:1,padding:'10px',border:`2px solid ${privacy===p?'#6B2D4E':'#E8D5E0'}`,borderRadius:'10px',background:privacy===p?'#6B2D4E':'white',color:privacy===p?'white':'#6B2D4E',fontWeight:'600',fontSize:'12px',cursor:'pointer'}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                <div>
                  <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Max Members</label>
                  <input value={memberLimit} onChange={e => setMemberLimit(e.target.value)} type="number" min="2"
                    style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Your Position</label>
                  <input value={adminPosition} onChange={e => setAdminPosition(e.target.value)} type="number" min="1"
                    style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1 style={{color:'#6B2D4E',fontSize:'24px',fontWeight:'800',margin:'0 0 4px'}}>Review & Create</h1>
              <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 28px'}}>Step 5 of {totalSteps}</p>

              <div style={{background:'#FAF0E6',borderRadius:'16px',padding:'20px',marginBottom:'24px'}}>
                {[
                  {label:'Group Name', value:groupName},
                  {label:'Type', value:groupType},
                  {label:'Module', value:module},
                  {label:'Country', value:country},
                  {label:'Contribution', value:contributionAmount ? `${contributionAmount} ${currency} / ${frequency}` : 'Not set'},
                  {label:'Rotation', value:rotationMode},
                  {label:'Privacy', value:privacy},
                  {label:'Max Members', value:memberLimit},
                  {label:'Your Position', value:adminPosition},
                ].map(item => (
                  <div key={item.label} style={{display:'flex',justifyContent:'space-between',marginBottom:'10px',paddingBottom:'10px',borderBottom:'1px solid #E8D5E0'}}>
                    <span style={{color:'#7A5068',fontSize:'13px'}}>{item.label}</span>
                    <span style={{color:'#6B2D4E',fontSize:'13px',fontWeight:'600'}}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{display:'flex',gap:'12px',marginTop:'32px'}}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{flex:1,background:'#FAF0E6',color:'#6B2D4E',padding:'14px',borderRadius:'12px',border:'none',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button onClick={handleNext}
                style={{flex:2,background:'#6B2D4E',color:'#FAF0E6',padding:'14px',borderRadius:'12px',border:'none',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>
                Next →
              </button>
            ) : (
              <button onClick={handleCreate} disabled={loading}
                style={{flex:2,background:loading?'#9B6B8E':'#6B2D4E',color:'#FAF0E6',padding:'14px',borderRadius:'12px',border:'none',fontSize:'16px',fontWeight:'700',cursor:loading?'not-allowed':'pointer'}}>
                {loading ? 'Creating...' : 'Create Group 🎉'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
