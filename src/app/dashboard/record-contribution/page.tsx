'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';

const inputStyle = { width: '100%', padding: '8px 11px', border: '1.5px solid #EAD9BE', borderRadius: '10px', fontSize: '13.5px', color: '#3A2F1F', outline: 'none', boxSizing: 'border-box' as const, background: '#FFFDF9', fontFamily: 'Inter, sans-serif' };
const labelStyle = { display: 'block', color: '#A08B7D', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px', marginBottom: '4px' };
const sectionTitle = { color: '#E9C77B', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' };

export default function RecordContribution() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [status, setStatus] = useState('confirmed');
  const [cycle, setCycle] = useState('Cycle 1');
  const [contributionType, setContributionType] = useState('Regular');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // auth.currentUser is read synchronously here, but on a fresh page
    // load Firebase Auth hasn't finished restoring the persisted session
    // yet - currentUser is still null for a brief moment even for an
    // already-logged-in admin, so this effect would silently load zero
    // members (same root cause as the AI chat idToken bug fixed earlier).
    // onAuthStateChanged waits for that restoration to actually finish.
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      const ms = await getDocs(query(collection(db, 'members'), where('organizerId', '==', user.uid)));
      setMembers(ms.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [router]);

  const effectivePaymentMethod = paymentMethod === 'Other' ? customPaymentMethod.trim() : paymentMethod;

  const validate = () => {
    if (!selectedMember) { setError('Please select a member.'); return false; }
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0.'); return false; }
    if (!paymentDate) { setError('Payment date is required.'); return false; }
    if (new Date(paymentDate) > new Date()) { setError('Payment date cannot be in the future.'); return false; }
    if (paymentMethod === 'Other' && !customPaymentMethod.trim()) { setError('Please specify the payment method.'); return false; }
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
        memberName: member?.name || member?.fullName || '(no name)',
        memberTynId: member?.tynId,
        amount: parseFloat(amount),
        currency,
        paymentDate,
        paymentMethod: effectivePaymentMethod,
        status,
        cycle,
        contributionType,
        receiptNumber,
        receiptQR: '/receipt/' + receiptNumber,
        notes: notes.trim(),
        recordedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: user.uid, category: 'Payment',
          action: 'Recorded payment',
          user: user.email || '',
          details: (member?.name || 'Unknown member') + ' - ' + amount + ' ' + currency + ' (' + effectivePaymentMethod + ', ' + receiptNumber + ')',
          createdAt: serverTimestamp(),
        });
      } catch (auditErr) { /* silent - audit logging must never block payment recording */ }

      setSuccess('Payment recorded! Receipt: ' + receiptNumber);
      setSelectedMember(''); setAmount(''); setPaymentDate(''); setNotes(''); setCustomPaymentMethod(''); setPaymentMethod('Cash');
    } catch(e) {
      console.error(e);
      setError('Error recording payment. Please try again.');
    }
    setLoading(false);
  };

  const selectedMemberData = members.find(m => m.id === selectedMember);

  return (
    <div style={{minHeight:'100vh',background:'#FBEEDD',padding:'20px',fontFamily:'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
      <div style={{
        background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap' as const,
        rowGap: '10px',
        margin: '-20px -20px 20px -20px',
      }}>
        <div>
          <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block' }} />
          <div style={{ color: '#C4748E', fontSize: '9px', letterSpacing: '2px', fontStyle: 'italic', marginTop: '2px' }}>YOUR COMMUNITY. YOUR POWER.</div>
        </div>
        <div style={{ textAlign: 'center' as const }}>
          <h1 style={{ color: '#FBEEDD', fontSize: '18px', fontWeight: 800, margin: '0 0 2px' }}>Record Payment</h1>
          <p style={{ color: 'rgba(251,238,221,0.8)', fontSize: '11.5px', margin: 0 }}>Log a payment for a member of your group.</p>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <DateTimeWeather textColor="rgba(251,238,221,0.85)" />
        </div>
      </div>
      <style>{`
        .tn-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 900px) { .tn-grid3 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .tn-grid3 { grid-template-columns: 1fr; } }
        .rp-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
        @media (max-width: 900px) { .rp-grid { grid-template-columns: 1fr; } }
        .am-card { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 18px; box-shadow: 0 2px 14px rgba(107,45,78,0.06); padding: 16px 20px; transition: box-shadow 0.25s ease; }
        .am-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10); }
        .am-head { display: flex; align-items: center; gap: 11px; margin: 0 0 11px; padding-bottom: 9px; border-bottom: 1px solid #F3E6D8; }
        .am-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.15); }
        .am-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .am-form input, .am-form select, .am-form textarea { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .am-form input:focus, .am-form select:focus, .am-form textarea:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .am-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); display: inline-block; }
        .am-back:hover { background: #FBEEDD; }
        .am-submit { transition: transform 0.15s ease, filter 0.15s ease; }
        .am-submit:hover { filter: brightness(1.06); transform: translateY(-1px); }
      `}</style>

      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}}>
          <div style={{background:'white',borderRadius:'16px',padding:'24px',maxWidth:'380px',width:'90%'}}>
            <h3 style={{color:'#6B2D4E',fontSize:'18px',fontWeight:'800',margin:'0 0 12px'}}>Confirm Payment</h3>
            <div style={{background:'#FBEEDD',borderRadius:'10px',padding:'12px',marginBottom:'18px'}}>
              <p style={{margin:'0 0 6px',color:'#4A1F38',fontWeight:'600'}}>{selectedMemberData?.name}</p>
              <p style={{margin:'0 0 6px',color:'#6B2D4E',fontSize:'13px'}}>{amount} {currency} — {effectivePaymentMethod}</p>
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

      <div className="am-form" style={{ maxWidth: '1220px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '12px' }}>
          <span onClick={() => router.push('/dashboard')} className="am-back">Back to Dashboard</span>
        </div>

        {error && <p style={{color:'#C62828',fontSize:'12.5px',margin:'0 0 12px',background:'#FFEBEE',padding:'9px 14px',borderRadius:'10px',border:'1px solid #F5C6CB'}}>{error}</p>}
        {success && (
          <div style={{color:'#2E7D32',fontSize:'12.5px',margin:'0 0 12px',background:'#E8F5E9',padding:'9px 14px',borderRadius:'10px',border:'1px solid #C8E6C9'}}>
            <p style={{margin:'0',fontWeight:'700'}}>{success}</p>
          </div>
        )}

        <div className="rp-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div className="am-card">
              <div className="am-head">
                <span className="am-ico" style={{ background: 'linear-gradient(135deg,#FCE4EC,#F4B6C7)' }}>{'\ud83d\udc64'}</span>
                <h2 className="am-title">Member &amp; Amount</h2>
              </div>
              <div className="tn-grid3">
                <div>
                  <label style={labelStyle}>Select Member *</label>
                  <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} style={inputStyle}>
                    <option value="">Select a member...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name || m.fullName} {'\u2014'} {m.tynId}</option>
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
                    <option>NGN</option><option>GHS</option><option>KES</option><option>MXN</option>
                    <option>DOP</option><option>JMD</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="am-card">
              <div className="am-head">
                <span className="am-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\ud83d\udcb3'}</span>
                <h2 className="am-title">Payment Details</h2>
              </div>
              <div className="tn-grid3">
                <div>
                  <label style={labelStyle}>Payment Date *</label>
                  <input value={paymentDate} onChange={e => setPaymentDate(e.target.value)} type="date"
                    max={new Date().toISOString().split('T')[0]} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle}>
                    <option>Cash</option>
                    <option>Hand to Hand</option>
                    <option>Bank Transfer</option>
                    <option>Bank Deposit</option>
                    <option>Mobile Money</option>
                    <option>MonCash</option>
                    <option>NatCash</option>
                    <option>CashApp</option>
                    <option>Zelle</option>
                    <option>Venmo</option>
                    <option>PayPal</option>
                    <option>Western Union</option>
                    <option>MoneyGram</option>
                    <option>Other</option>
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
              {paymentMethod === 'Other' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={labelStyle}>Specify Payment Method *</label>
                  <input value={customPaymentMethod} onChange={e => setCustomPaymentMethod(e.target.value)}
                    placeholder="e.g. Sogebank transfer, Digicel Mobile Money, local agent..." style={inputStyle} />
                </div>
              )}
            </div>

            <div className="am-card">
              <div className="am-head">
                <span className="am-ico" style={{ background: 'linear-gradient(135deg,#C8E6C9,#81C784)' }}>{'\ud83d\udd04'}</span>
                <h2 className="am-title">Cycle &amp; Notes</h2>
              </div>
              <div className="tn-grid3">
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
            </div>

            <button onClick={handleSubmit} disabled={loading} className="am-submit"
              style={{width:'100%',background:loading?'#C4748E':'linear-gradient(135deg,#6B2D4E,#4A1F38)',color:'#FFFFFF',padding:'12px',borderRadius:'14px',border:'none',fontSize:'15px',fontWeight:800,cursor:loading?'not-allowed':'pointer',boxShadow:'0 8px 22px rgba(107,45,78,0.28)'}}>
              {loading ? 'Recording...' : '\ud83d\udcb0  Record Payment'}
            </button>
          </div>

          <div className="am-card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: '20px' }}>
            <div style={{ textAlign: 'center', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderBottom: '1px solid #F0E4D6' }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#3A1F2E' }}>{selectedMemberData?.name || selectedMemberData?.fullName || 'No member selected'}</p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 700, color: '#C9974D', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Payment Summary</p>
            </div>
            <div style={{ padding: '10px 20px 16px' }}>
              {[
                { label: 'TYN-ID', value: selectedMemberData?.tynId || '-' },
                { label: 'Amount', value: amount ? currency + ' ' + (parseFloat(amount) || 0).toFixed(2) : '-' },
                { label: 'Method', value: effectivePaymentMethod || '-' },
                { label: 'Date', value: paymentDate || '-' },
                { label: 'Status', value: status.charAt(0).toUpperCase() + status.slice(1) },
                { label: 'Cycle', value: cycle },
                { label: 'Type', value: contributionType },
                { label: 'Notes', value: notes.trim() || '-' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '6px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                  <span style={{ fontSize: '12px', color: '#8A7B6C' }}>{item.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#3A2F1F', maxWidth: '150px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'linear-gradient(135deg,#FBEEDD,#F6E3C4)', borderRadius: '12px', border: '1px solid #F0DCA8', textAlign: 'center' }}>
                <p style={{ fontSize: '10.5px', color: '#A08B7D', margin: 0, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Total</p>
                <p style={{ fontSize: '18px', color: '#4A1F38', margin: '2px 0 0', fontWeight: 800 }}>{currency} {(parseFloat(amount) || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>
      <Footer />
    </div>
  );
}
