'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CreateGroup() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [module, setModule] = useState('Sol');
  const [position, setPosition] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!groupName.trim()) { setError('Group name is required.'); return; }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        module,
        adminId: user.uid,
        adminPosition: parseInt(position),
        memberCount: 1,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'members'), {
        groupId: groupRef.id,
        name: 'Admin',
        tynId: 'TYN-' + Math.random().toString(36).substr(2,6).toUpperCase(),
        position: parseInt(position),
        role: 'admin',
        status: 'active',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      router.push('/dashboard');
    } catch(e) {
      console.error(e);
      setError('Error creating group. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{background:'white',borderRadius:'24px',padding:'48px',maxWidth:'480px',width:'100%',boxShadow:'0 8px 32px rgba(107,45,78,0.12)'}}>
        
        <div onClick={() => router.push('/')} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'8px',marginBottom:'32px'}}>
          <div style={{width:'32px',height:'32px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#D4AF7A',fontWeight:'800',fontSize:'13px'}}>T</div>
          <span style={{color:'#6B2D4E',fontWeight:'800',fontSize:'16px'}}>TARSYN</span>
        </div>

        <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'800',margin:'0 0 8px'}}>Create Your Group</h1>
        <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 32px'}}>You will be added as a participating member.</p>

        {error && <p style={{color:'#E53935',fontSize:'13px',marginBottom:'16px',background:'#FFEBEE',padding:'10px 14px',borderRadius:'8px'}}>{error}</p>}

        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Group Name *</label>
          <input value={groupName} onChange={e => setGroupName(e.target.value)}
            placeholder="Ex: Family Sol, Community Tontine..."
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Module</label>
          <select value={module} onChange={e => setModule(e.target.value)}
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
            <option value="Sol">Sol</option>
            <option value="Tontine">Tontine</option>
            <option value="Syndicate">Syndicate</option>
            <option value="Mutual Aid">Mutual Aid</option>
          </select>
        </div>

        <div style={{marginBottom:'32px'}}>
          <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Your Position in the Group</label>
          <input value={position} onChange={e => setPosition(e.target.value)} type="number" min="1"
            placeholder="1"
            style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
          <p style={{color:'#7A5068',fontSize:'12px',margin:'6px 0 0'}}>As admin, you are also a participating member.</p>
        </div>

        <button onClick={handleCreate} disabled={loading}
          style={{width:'100%',background:loading?'#9B6B8E':'#6B2D4E',color:'#FAF0E6',padding:'14px',borderRadius:'12px',border:'none',fontSize:'16px',fontWeight:'700',cursor:loading?'not-allowed':'pointer',transition:'all 0.2s'}}>
          {loading ? 'Creating...' : 'Create Group'}
        </button>

        <button onClick={() => router.push('/dashboard')}
          style={{width:'100%',background:'transparent',color:'#7A5068',padding:'12px',borderRadius:'12px',border:'none',fontSize:'14px',cursor:'pointer',marginTop:'12px'}}>
          Cancel
        </button>
      </div>
    </div>
  );
}
