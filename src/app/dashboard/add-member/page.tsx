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

export default function AddMember() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [position, setPosition] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!position) { setError('Position is required.'); return; }
    if (!payoutDate) { setError('Payout date is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }
      const q = query(collection(db, 'groups'), where('adminId', '==', user.uid));
      const snap = await getDocs(q);
      if (snap.empty) { setError('No group found.'); setLoading(false); return; }
      const groupId = snap.docs[0].id;
      const tynId = 'TYN-' + Math.random().toString(36).substr(2,6).toUpperCase();
      await addDoc(collection(db, 'members'), {
        groupId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        country,
        position: parseInt(position),
        payoutDate,
        tynId,
        role: 'member',
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setSuccess('Member added! TYN-ID: ' + tynId);
      setName(''); setPhone(''); setEmail(''); setCountry(''); setPosition(''); setPayoutDate('');
    } catch(e) {
      console.error(e);
      setError('Error adding member. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{background:'white',borderRadius:'24px',padding:'48px',maxWidth:'480px',width:'100%',boxShadow:'0 8px 32px rgba(107,45,78,0.12)'}}>

        <div onClick={() => router.push('/dashboard')} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'8px',marginBottom:'32px'}}>
          <div style={{width:'32px',height:'32px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#D4AF7A',fontWeight:'800',fontSize:'13px'}}>T</div>
          <span style={{color:'#6B2D4E',fontWeight:'800',fontSize:'16px'}}>TARSYN</span>
        </div>

        <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'800',margin:'0 0 8px'}}>Add Member</h1>
        <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 32px'}}>A TYN-ID will be generated automatically.</p>

        {error && <p style={{color:'#E53935',fontSize:'13px',marginBottom:'16px',background:'#FFEBEE',padding:'10px 14px',borderRadius:'8px'}}>{error}</p>}
        {success && <p style={{color:'#2E7D32',fontSize:'13px',marginBottom:'16px',background:'#E8F5E9',padding:'10px 14px',borderRadius:'8px',fontWeight:'600'}}>{success}</p>}

        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Member full name"
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Phone Number</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Country</label>
          <select value={country} onChange={e => setCountry(e.target.value)}
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
            <option value="">Select country...</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Email (optional)</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="member@email.com"
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Position in Group *</label>
          <input value={position} onChange={e => setPosition(e.target.value)} type="number" min="1"
            placeholder="Ex: 1, 2, 3..."
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{marginBottom:'32px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Payout Date *</label>
          <input value={payoutDate} onChange={e => setPayoutDate(e.target.value)} type="date"
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
          <p style={{color:'#7A5068',fontSize:'12px',margin:'6px 0 0'}}>Date this member is scheduled to receive the funds.</p>
        </div>

        <button onClick={handleAdd} disabled={loading}
          style={{width:'100%',background:loading?'#9B6B8E':'#6B2D4E',color:'#FAF0E6',padding:'14px',borderRadius:'12px',border:'none',fontSize:'16px',fontWeight:'700',cursor:loading?'not-allowed':'pointer'}}>
          {loading ? 'Adding...' : 'Add Member'}
        </button>

        <button onClick={() => router.push('/dashboard')}
          style={{width:'100%',background:'transparent',color:'#7A5068',padding:'12px',borderRadius:'12px',border:'none',fontSize:'14px',cursor:'pointer',marginTop:'12px'}}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
