'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const C = {
  bordeaux: '#6B2D4E',
  dore: '#D4AF7A',
  creme: '#FAF0E6',
  texteGris: '#7A5068',
  texteFonce: '#2C1A3E',
  border: '#E8D5E0',
};

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const receiptNumber = params.receiptNumber as string;

  const [payment, setPayment] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const q = query(collection(db, 'payments'), where('receiptNumber', '==', receiptNumber));
        const snap = await getDocs(q);
        if (snap.empty) {
          setError('Receipt not found.');
          setLoading(false);
          return;
        }
        const data = snap.docs[0].data();
        setPayment(data);

        if (data.organizerId) {
          const gq = query(collection(db, 'groups'), where('organizerId', '==', data.organizerId));
          const gsnap = await getDocs(gq);
          if (!gsnap.empty) setGroupName(gsnap.docs[0].data().name || '');
        }
      } catch (e) {
        console.error(e);
        setError('Could not load this receipt.');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [receiptNumber]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme }}>
        <p style={{ color: C.bordeaux, fontSize: '16px', fontWeight: 600 }}>Loading receipt...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.creme, flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: C.texteGris, fontSize: '15px' }}>{error || 'Receipt not found.'}</p>
        <button onClick={() => router.push('/dashboard/overview')}
          style={{ padding: '10px 20px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.creme, padding: '32px 16px', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: '500px', margin: '0 auto 16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={() => router.back()}
          style={{ padding: '10px 18px', background: 'white', color: C.bordeaux, border: `1.5px solid ${C.bordeaux}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
          ← Back
        </button>
        <button onClick={() => window.print()}
          style={{ padding: '10px 18px', background: C.bordeaux, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
          Print / Save as PDF
        </button>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 8px 32px rgba(107,45,78,0.10)', border: `1px solid ${C.border}` }}>

        <div style={{ textAlign: 'center', marginBottom: '28px', borderBottom: `2px dashed ${C.border}`, paddingBottom: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: C.bordeaux, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontWeight: 800, color: C.dore, fontSize: '20px' }}>T</div>
          <p style={{ margin: 0, color: C.bordeaux, fontWeight: 800, fontSize: '18px', letterSpacing: '1px' }}>TARSYN</p>
          {groupName && <p style={{ margin: '4px 0 0', color: C.texteGris, fontSize: '13px' }}>{groupName}</p>}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 4px', color: C.texteGris, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Receipt</p>
          <p style={{ margin: 0, color: C.bordeaux, fontWeight: 800, fontSize: '20px', fontFamily: 'monospace' }}>{payment.receiptNumber}</p>
        </div>

        <div style={{ background: C.creme, borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 4px', color: C.texteGris, fontSize: '11px', textTransform: 'uppercase' }}>Amount Paid</p>
          <p style={{ margin: 0, color: C.bordeaux, fontWeight: 800, fontSize: '32px' }}>{payment.amount} {payment.currency}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Member', value: payment.memberName },
            { label: 'TYN-ID', value: payment.memberTynId },
            { label: 'Payment Date', value: formatDate(payment.paymentDate) },
            { label: 'Payment Method', value: payment.paymentMethod },
            { label: 'Cycle', value: payment.cycle },
            { label: 'Type', value: payment.contributionType },
            { label: 'Status', value: payment.status },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
              <span style={{ color: C.texteGris, fontSize: '13px' }}>{row.label}</span>
              <span style={{ color: C.texteFonce, fontSize: '13px', fontWeight: 700, textTransform: row.label === 'Status' ? 'capitalize' : 'none' }}>{row.value || '—'}</span>
            </div>
          ))}
          {payment.notes && (
            <div style={{ marginTop: '6px' }}>
              <p style={{ color: C.texteGris, fontSize: '12px', margin: '0 0 4px' }}>Notes</p>
              <p style={{ color: C.texteFonce, fontSize: '13px', margin: 0 }}>{payment.notes}</p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', borderTop: `2px dashed ${C.border}`, paddingTop: '16px' }}>
          <p style={{ margin: 0, color: C.texteGris, fontSize: '11px' }}>Thank you for your contribution.</p>
          <p style={{ margin: '4px 0 0', color: C.texteGris, fontSize: '11px' }}>Generated by TARSYN</p>
        </div>
      </div>
    </div>
  );
}
