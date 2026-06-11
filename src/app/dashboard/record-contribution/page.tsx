'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export default function RecordContribution() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [status, setStatus] = useState('confirmed');
  const [cycle, setCycle] = useState('Cycle 1');
  const [contributionType, setContributionType] = useState('Regular');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'groups'), where('adminId', '==', user.uid));
      const snap = await getDocs(q);
      if (snap.empty) return;
      const groupId = snap.docs[0].id;
      const mq = query(collection(db, 'members'), where('groupId', '==', groupId));
      const ms = await getDocs(mq);
      setMembers(ms.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadMembers();
  }, []);

  const validate = () => {
    if (!selectedMember) { setError('Please select a member.'); return false; }
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0.'); return false; }
    if (!paymentDate) { setError('Payment date is required.'); return false; }
    if (new Date(paymentDate) > new Date()) { setError('Payment date cannot be in the future.'); return false; }
    return true;
  };

  const handleSubmit = () => {
    setError('');
    if (!validate()) return;
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setShowModal(false);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }
      const q = query(collection(db, 'groups'), where('adminId', '==', user.uid));
      const snap = await getDocs(q);
      const groupId = snap.docs[0].id;
      const member = members.find(m => m.id === selectedMember);
      const receiptNumber = 'REC-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
      await addDoc(collection(db, 'payments'), {
        groupId,
        memberId: selectedMember,
        memberName: member?.name,
        memberTynId: member?.tynId,
        amount: parseFloat(amount),
        currency,
        paymentDate,
        paymentMethod,
        status,
        cycle,
        contributionType,
        receiptNumber,
        receiptQR: '/receipt/' + receiptNumber,
        notes: notes.trim(),
        recordedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setSuccess('Payment recorded! Receipt: ' + receiptNumber);
      setSelectedMember(''); setAmount(''); setPaymentDate(''); setNotes('');
    } catch(e) {
      console.error(e);
      setError('Error recording payment. Please try again.');
    }
    setLoading(false);
  };

  const selectedMemberData = members.find(m => m.id === selectedMember);

  return (
    <div style={{minHeight:'100vh',background:'#FAF0E6',padding:'24px'}}>

      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}}>
          <div style={{background:'white',borderRadius:'20px',padding:'32px',maxWidth:'400px',width:'90%'}}>
            <h3 style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'800',margin:'0 0 16px'}}>Confirm Payment</h3>
            <div style={{background:'#FAF0E6',borderRadius:'12px',padding:'16px',marginBottom:'24px'}}>
              <p style={{margin:'0 0 8px',color:'#2C1A3E',fontWeight:'600'}}>{selectedMemberData?.name}</p>
              <p style={{margin:'0 0 8px',color:'#7A5068',fontSize:'14px'}}>{amount} {currency} — {paymentMethod}</p>
              <p style={{margin:'0 0 8px',color:'#7A5068',fontSize:'14px'}}>{cycle} — {contributionType}</p>
              <p style={{margin:'0',color:'#7A5068',fontSize:'14px'}}>{paymentDate}</p>
            </div>
            <div style={{display:'flex',gap:'12px'}}>
              <button onClick={() => setShowModal(false)}
                style={{flex:1,background:'#FAF0E6',color:'#6B2D4E',padding:'12px',borderRadius:'10px',border:'none',fontSize:'14px',fontWeight:'600',cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={handleConfirm}
                style={{flex:1,background:'#6B2D4E',color:'#FAF0E6',padding:'12px',borderRadius:'10px',border:'none',fontSize:'14px',fontWeight:'700',cursor:'pointer'}}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:'540px',margin:'0 auto'}}>
        <div style={{background:'white',borderRadius:'24px',padding:'40px',boxShadow:'0 8px 32px rgba(107,45,78,0.12)'}}>

          <div onClick={() => router.push('/dashboard')} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:'8px',marginBottom:'32px'}}>
            <div style={{width:'32px',height:'32px',background:'#6B2D4E',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#D4AF7A',fontWeight:'800',fontSize:'13px'}}>T</div>
            <span style={{color:'#6B2D4E',fontWeight:'800',fontSize:'16px'}}>TARSYN</span>
          </div>

          <h1 style={{color:'#6B2D4E',fontSize:'28px',fontWeight:'800',margin:'0 0 8px'}}>Record Contribution</h1>
          <p style={{color:'#7A5068',fontSize:'14px',margin:'0 0 32px'}}>Log a payment for a member of your group.</p>

          {error && <p style={{color:'#E53935',fontSize:'13px',marginBottom:'16px',background:'#FFEBEE',padding:'10px 14px',borderRadius:'8px'}}>{error}</p>}
          {success && (
            <div style={{color:'#2E7D32',fontSize:'13px',marginBottom:'16px',background:'#E8F5E9',padding:'14px',borderRadius:'8px'}}>
              <p style={{margin:'0 0 4px',fontWeight:'700'}}>{success}</p>
            </div>
          )}

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Select Member *</label>
            <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
              <option value="">Select a member...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} — {m.tynId}</option>
              ))}
            </select>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
            <div>
              <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Amount *</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0"
                placeholder="0.00"
                style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div>
              <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
                <option>USD</option>
                <option>CAD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>HTG</option>
                <option>XOF</option>
                <option>XAF</option>
                <option>BRL</option>
              </select>
            </div>
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Payment Date *</label>
            <input value={paymentDate} onChange={e => setPaymentDate(e.target.value)} type="date"
              max={new Date().toISOString().split('T')[0]}
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Mobile Money</option>
              <option>Zelle</option>
              <option>PayPal</option>
              <option>Western Union</option>
              <option>MoneyGram</option>
              <option>Other</option>
            </select>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
            <div>
              <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Cycle</label>
              <select value={cycle} onChange={e => setCycle(e.target.value)}
                style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <option key={n}>Cycle {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Type</label>
              <select value={contributionType} onChange={e => setContributionType(e.target.value)}
                style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
                <option>Regular</option>
                <option>Advance</option>
                <option>Partial</option>
                <option>Late</option>
                <option>Bonus</option>
              </select>
            </div>
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="late">Late</option>
              <option value="partial">Partial</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div style={{marginBottom:'32px'}}>
            <label style={{display:'block',color:'#6B2D4E',fontSize:'13px',fontWeight:'600',marginBottom:'6px'}}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8D5E0',borderRadius:'10px',fontSize:'14px',outline:'none',resize:'none',boxSizing:'border-box'}}/>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{width:'100%',background:loading?'#9B6B8E':'#6B2D4E',color:'#FAF0E6',padding:'14px',borderRadius:'12px',border:'none',fontSize:'16px',fontWeight:'700',cursor:loading?'not-allowed':'pointer'}}>
            {loading ? 'Recording...' : 'Record Payment'}
          </button>

          <button onClick={() => router.push('/dashboard')}
            style={{width:'100%',background:'transparent',color:'#7A5068',padding:'12px',borderRadius:'12px',border:'none',fontSize:'14px',cursor:'pointer',marginTop:'12px'}}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
