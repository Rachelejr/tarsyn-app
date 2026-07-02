'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const inputStyle = { width: '100%', padding: '8px 11px', border: '1.5px solid #EAD9BE', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const, background: 'white' };
const labelStyle = { display: 'block', color: '#6B2D4E', fontSize: '12px', fontWeight: 600, marginBottom: '3px' };
const sectionTitle = { color: '#E9C77B', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' };

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
      const ms = await getDocs(query(collection(db, 'members'), where('organizerId', '==', user.uid)));
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
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }
      const member = members.find(m => m.id === selectedMember);
      const receiptNumber = 'REC-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
      await addDoc(collection(db, 'payments'), {
        organizerId: user.uid,
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
    <div style={{minHeight:'100vh',background:'#FBEEDD',padding:'20px',fontFamily:'Inter, sans-serif'}}>
      <style>{`
        .tn-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 900px) { .tn-grid3 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .tn-grid3 { grid-template-columns: 1fr; } }
      `}</style>

      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}}>
          <div style={{background:'white',borderRadius:'16px',padding:'24px',maxWidth:'380px',width:'90%'}}>
            <h3 style={{color:'#6B2D4E',fontSize:'18px',fontWeight:'800',margin:'0 0 12px'}}>Confirm Payment</h3>
            <div style={{background:'#FBEEDD',borderRadius:'10px',padding:'12px',marginBottom:'18px'}}>
              <p style={{margin:'0 0 6px',color:'#4A1F38',fontWeight:'600'}}>{selectedMemberData?.name}</p>
              <p style={{margin:'0 0 6px',color:'#6B2D4E',fontSize:'13px'}}>{amount} {currency} — {paymentMethod}</p>
              <p style={{margin:'0 0 6px',color:'#6B2D4E',fontSize:'13px'}}>{cycle} — {contributionType}</p>
              <p style={{margin:'0',color:'#6B2D4E',fontSize:'13px'}}>{paymentDate}</p>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={() => setShowModal(false)}
                style={{flex:1,background:'#FBEEDD',color:'#6B2D4E',padding:'10px',borderRadius:'9px',border:'none',fontSize:'13.5px',fontWeight:'600',cursor:'pointer'}}>
                Cancel
              </button>
              <button onClick={handleConfirm}
                style={{flex:1,background:'#6B2D4E',color:'#FBEEDD',padding:'10px',borderRadius:'9px',border:'none',fontSize:'13.5px',fontWeight:'700',cursor:'pointer'}}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:'880px',margin:'0 auto'}}>
        <div onClick={() => router.push('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6B2D4E', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '14px' }}>
          ← Back to Dashboard
        </div>

        <div style={{background:'white',borderRadius:'18px',padding:'24px 28px',boxShadow:'0 8px 32px rgba(107,45,78,0.12)'}}>

          <h1 style={{color:'#6B2D4E',fontSize:'20px',fontWeight:'800',margin:'0 0 2px'}}>Record Contribution</h1>
          <p style={{color:'#6B2D4E',fontSize:'12px',margin:'0 0 16px'}}>Log a payment for a member of your group.</p>

          {error && <p style={{color:'#E53935',fontSize:'12px',marginBottom:'12px',background:'#FFEBEE',padding:'8px 12px',borderRadius:'8px'}}>{error}</p>}
          {success && (
            <div style={{color:'#2E7D32',fontSize:'12px',marginBottom:'12px',background:'#E8F5E9',padding:'9px 12px',borderRadius:'8px'}}>
              <p style={{margin:'0',fontWeight:'700'}}>{success}</p>
            </div>
          )}

          <p style={sectionTitle}>👤 Member & Amount</p>
          <div className="tn-grid3" style={{ marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Select Member *</label>
              <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} style={inputStyle}>
                <option value="">Select a member...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.tynId}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Amount *</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="0" placeholder="0.00" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                <option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option>
                <option>HTG</option><option>XOF</option><option>XAF</option><option>BRL</option>
              </select>
            </div>
          </div>

          <div style={{ height: '1px', background: '#F4E8D8', margin: '14px 0' }} />

          <p style={sectionTitle}>💳 Payment Details</p>
          <div className="tn-grid3" style={{ marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Payment Date *</label>
              <input value={paymentDate} onChange={e => setPaymentDate(e.target.value)} type="date"
                max={new Date().toISOString().split('T')[0]} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle}>
                <option>Cash</option><option>Bank Transfer</option><option>Mobile Money</option>
                <option>Zelle</option><option>PayPal</option><option>Western Union</option>
                <option>MoneyGram</option><option>Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="late">Late</option>
                <option value="partial">Partial</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div style={{ height: '1px', background: '#F4E8D8', margin: '14px 0' }} />

          <p style={sectionTitle}>🔄 Cycle & Notes</p>
          <div className="tn-grid3" style={{ marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Cycle</label>
              <select value={cycle} onChange={e => setCycle(e.target.value)} style={inputStyle}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <option key={n}>Cycle {n}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={contributionType} onChange={e => setContributionType(e.target.value)} style={inputStyle}>
                <option>Regular</option><option>Advance</option><option>Partial</option>
                <option>Late</option><option>Bonus</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." style={inputStyle} />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            style={{width:'100%',background:loading?'#C4748E':'#6B2D4E',color:'#FBEEDD',padding:'11px',borderRadius:'10px',border:'none',fontSize:'14px',fontWeight:'700',cursor:loading?'not-allowed':'pointer',marginTop:'4px'}}>
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
