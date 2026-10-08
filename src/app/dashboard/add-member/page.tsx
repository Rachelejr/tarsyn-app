'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import DateTimeWeather from '@/components/DateTimeWeather';
import Footer from '@/components/Footer';
import QRCodeInvitation from '@/components/qr/QRCodeInvitation';
import { getOrganizerPlanTier, getPlanLimits, countOrganizerMembers, planLimitMessage } from '@/lib/planLimits';
import { authHeaders } from '@/lib/authFetch';

const C = {
  bordeaux: '#6B2D4E',
  bordeauxDark: '#4A1F38',
  or: '#E9C77B',
  orLight: '#F0DCA8',
  creme: '#FBEEDD',
  blanc: '#FFFFFF',
  text: '#3A2F1F',
  muted: '#8A7B6C',
  border: '#F0E4D6',
};

const inputStyle = {
  width: '100%', padding: '11px 13px', borderRadius: 10, border: '1.5px solid #EAD9BE',
  fontSize: 14, color: C.text, background: '#FFFDF9', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
};

const labelStyle = { fontSize: 11, fontWeight: 700, color: '#A08B7D', textTransform: 'uppercase' as const, letterSpacing: 0.8, display: 'block', marginBottom: 6 };

// Reads a group's normal per-share contribution amount from whichever field
// it happens to be stored under (this mirrors the fallback chain used by
// /api/audit-all-groups, so "normal amount" means the same thing everywhere
// in the app).
function getGroupContributionAmount(group: any): number | null {
  if (!group) return null;
  const amount =
    group?.contributionSettings?.amount ??
    group?.contribution ??
    group?.amountPerMember ??
    group?.weeklyAmount ??
    null;
  return typeof amount === 'number' ? amount : (amount ? parseFloat(amount) : null);
}

function AddMemberContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get('groupId') || '';

  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(urlGroupId);

  const [form, setForm] = useState({
    firstName: '', lastName: '', address: '', phone: '', email: '', country: '', nationality: '', memberType: 'Regular',
    gender: '', colorTag: '',
    role: 'member', position: '', payoutDate: '', expectedAmount: '0',
    currency: 'USD', status: 'pending', notes: '', shares: '1',
  });
  // Tracks whether the admin has manually edited Expected Amount, so we
  // stop overwriting it with the group's default once they've typed
  // their own value (e.g. for a member with a special/reduced amount).
  const [expectedAmountTouched, setExpectedAmountTouched] = useState(false);
  const [payoutDates, setPayoutDates] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [addedInvite, setAddedInvite] = useState<{ code: string; name: string; groupName: string } | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'sent' | 'failed' | 'no-email' | null>(null);
  const [tynId, setTynId] = useState('');
  const [nextPosition, setNextPosition] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [groupMemberCount, setGroupMemberCount] = useState(0);
  const [groupMembersList, setGroupMembersList] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the payoutDates array in sync with the number of parts, without
  // wiping out dates the user already typed in when the count changes.
  useEffect(() => {
    const n = Math.max(1, parseInt(form.shares) || 1);
    setPayoutDates(prev => {
      const next = prev.slice(0, n);
      while (next.length < n) next.push('');
      return next;
    });
  }, [form.shares]);

  const setPayoutDateAt = (idx: number, value: string) => {
    setPayoutDates(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setGroupsLoading(false); router.push('/login'); return; }
      try {
        const gq = query(collection(db, 'groups'), where('organizerId', '==', u.uid));
        const gsnap = await getDocs(gq);
        const groupList = gsnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGroups(groupList);
        if (!urlGroupId && groupList.length === 1) {
          setSelectedGroupId(groupList[0].id);
        }
      } catch (e) { console.error(e); }
      setGroupsLoading(false);
    });
    return () => unsub();
  }, [urlGroupId]);

  useEffect(() => {
    if (!selectedGroupId) { setGroupMembersList([]); return; }
    const fetchCount = async () => {
      const q = query(collection(db, 'members'), where('groupId', '==', selectedGroupId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroupMembersList(list);
      // Base the next position on the highest position currently in use, not
      // just the member count - counting alone produces duplicate position
      // numbers whenever a member has been deleted (leaving a gap) or when
      // two members get added in close succession.
      const highestPosition = list.reduce((max, m: any) => {
        const pos = Number(m.position) || 0;
        return pos > max ? pos : max;
      }, 0);
      const computedNext = highestPosition + 1;
      setNextPosition(computedNext);
      setGroupMemberCount(list.length);
      setForm(f => ({ ...f, position: String(computedNext) }));
    };
    fetchCount();
  }, [selectedGroupId]);

  // Auto-fill Expected Amount from the selected group's normal contribution
  // amount, so admins aren't left to type it in freehand every time (that
  // free-text field was the source of the corrupted expectedAmount bug —
  // typos/blank defaults with no reference value to check against).
  // Only auto-fills if the admin hasn't already typed their own value.
  useEffect(() => {
    if (!selectedGroupId || expectedAmountTouched) return;
    const group = groups.find(g => g.id === selectedGroupId);
    const amount = getGroupContributionAmount(group);
    if (amount != null) {
      setForm(f => ({ ...f, expectedAmount: String(amount) }));
    }
  }, [selectedGroupId, groups, expectedAmountTouched]);

  // TYN-ID = [Initiale prenom][Initiale nom]-[numero sequentiel 3 chiffres], ex: JD-001
  useEffect(() => {
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    if (!first && !last) { setTynId(''); return; }
    const firstInitial = first[0]?.toUpperCase() || '';
    const lastInitial = last[0]?.toUpperCase() || firstInitial;
    const seq = String(nextPosition).padStart(3, '0');
    setTynId(firstInitial + lastInitial + '-' + seq);
  }, [form.firstName, form.lastName, nextPosition]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.country || !form.email || !form.phone) return alert('First name, last name, country, email and phone number are required.');
    if (!selectedGroupId) return alert('Please select a group before adding a member.');
    const user = auth.currentUser;
    if (!user) return;
    const fullName = (form.firstName + ' ' + form.lastName).trim();
    setLoading(true);
    try {
      const tier = await getOrganizerPlanTier(db, user.uid);
      const limits = getPlanLimits(tier);
      if (limits.maxMembers !== null) {
        const totalMembers = await countOrganizerMembers(db, user.uid);
        if (totalMembers >= limits.maxMembers) {
          alert(planLimitMessage('members', tier, limits.maxMembers));
          setLoading(false);
          return;
        }
      }
      const existing = await getDocs(query(collection(db, 'members'), where('groupId', '==', selectedGroupId)));
      const members = existing.docs.map(d => d.data());
      if (form.email && members.some((m: any) => m.email === form.email && m.groupId === selectedGroupId)) {
        alert('A member with this email already exists in this group.');
        setLoading(false); return;
      }
      const memberInviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      await addDoc(collection(db, 'members'), {
        // fullName kept for backward compatibility with every other page that
        // already reads member.fullName (payment grid, reports, receipts...).
        // referredBy/referredByName are set separately from the Referrals
        // page, not here - who referred a member is tracked independently
        // of the basic member info form.
        ...form, fullName, tynId, groupId: selectedGroupId, organizerId: user.uid,
        position: parseInt(form.position) || nextPosition,
        expectedAmount: parseFloat(form.expectedAmount) || 0,
        shares: Math.max(1, parseInt(form.shares) || 1),
        payoutDate: payoutDates[0] || '',
        payoutDates: payoutDates,
        inviteCode: memberInviteCode,
        referredBy: '',
        referredByName: '',
        createdAt: serverTimestamp(),
      });
      try {
        await addDoc(collection(db, 'audit_logs'), {
          organizerId: user.uid, category: 'Member',
          action: 'Added member',
          user: user.email || '', details: fullName + ' - ' + tynId,
          createdAt: serverTimestamp(),
        });
      } catch (auditErr) { /* silent - audit logging must never block member creation */ }

      // Send the join invitation email now, since Add Member is the normal
      // day-to-day path for adding members (not just at group creation) and
      // previously nobody added this way ever received an invite at all.
      if (!form.email) {
        setInviteStatus('no-email');
      } else {
        const selectedGroup = groups.find(g => g.id === selectedGroupId);
        const memberInviteLink = 'https://unimunity.com/join/' + memberInviteCode;
        try {
          const inviteRes = await fetch('/api/send-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' , ...(await authHeaders('admin')) },
            body: JSON.stringify({
              emails: [form.email],
              tontineName: selectedGroup?.name,
              region: selectedGroup?.region,
              contribution: selectedGroup?.contribution || selectedGroup?.amountPerMember,
              currency: selectedGroup?.currency,
              frequency: selectedGroup?.frequency,
              startDate: selectedGroup?.startDate,
              inviteLink: memberInviteLink,
            }),
          });
          const inviteData = await inviteRes.json();
          setInviteStatus(inviteRes.ok && inviteData.sent > 0 ? 'sent' : 'failed');
        } catch (inviteErr) {
          console.error('Invite send failed:', inviteErr);
          setInviteStatus('failed');
        }
      }

      setAddedInvite({ code: memberInviteCode, name: fullName, groupName: groups.find(g => g.id === selectedGroupId)?.name || '' });
      setSuccess(true);
    } catch (e) { console.error(e); alert('Error adding member.'); }
    setLoading(false);
  };

  if (!mounted) return null;

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
        <div style={{ background: C.blanc, borderRadius: 18, padding: '36px 32px', textAlign: 'center', maxWidth: 480, width: '90%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>+</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>Member added successfully</h2>
          <p style={{ fontSize: 14, color: C.muted, margin: '0 0 16px', lineHeight: 1.6 }}>The member is now part of the active cycle.</p>

          {inviteStatus === 'sent' && (
            <div style={{ background: '#d1fae5', color: '#166534', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, margin: '0 0 20px' }}>
              Invitation email sent - they can now create their account.
            </div>
          )}
          {inviteStatus === 'no-email' && (
            <div style={{ background: '#FBF0D9', color: '#9C7A2E', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, margin: '0 0 20px' }}>
              No email on file - no invitation was sent. Add one to invite this member.
            </div>
          )}
          {inviteStatus === 'failed' && (
            <div style={{ background: '#FFEBEE', color: '#C62828', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600, margin: '0 0 20px' }}>
              Member added, but the invitation email could not be sent. Try resending it from the group's member list.
            </div>
          )}
          {addedInvite && (
            <div style={{ background: '#FFFCF7', border: '1px solid #F0E4D6', borderRadius: 16, padding: '16px 14px', margin: '0 0 20px', textAlign: 'left' }}>
              <QRCodeInvitation
                invitationUrl={'https://unimunity.com/join/' + addedInvite.code}
                groupName={addedInvite.groupName || 'UNIMUNITY'}
                groupType="tontine"
                personName={addedInvite.name}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard/contribution-log?groupId=' + selectedGroupId)}
              style={{ background: C.or, color: C.bordeauxDark, border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              View Register
            </button>
            <button onClick={() => { setSuccess(false); setAddedInvite(null); setInviteStatus(null); setExpectedAmountTouched(false); setForm({ firstName: '', lastName: '', address: '', phone: '', email: '', country: '', nationality: '', memberType: 'Regular', gender: '', colorTag: '', role: 'member', position: String(nextPosition + 1), payoutDate: '', expectedAmount: '0', currency: 'USD', status: 'pending', notes: '', shares: '1' }); setPayoutDates(['']); }}
              style={{ background: C.creme, color: C.bordeaux, border: '1.5px solid ' + C.orLight, borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupContributionAmount = getGroupContributionAmount(selectedGroup);
  // Total payout the member will receive at their turn = the group's normal
  // per-share contribution amount x the number of members currently in the
  // group (everyone contributes each cycle, one member collects the pot).
  // This is display-only (not stored on the member doc) so it always
  // reflects the group's live member count rather than going stale.
  const totalPayoutAmount = groupContributionAmount != null
    ? groupContributionAmount * Math.max(groupMemberCount, 1)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: C.creme, fontFamily: 'Inter, sans-serif' , display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @media (max-width: 900px) {
          .UNIMUNITY-addmember-grid {
            grid-template-columns: 1fr !important;
          }
          .am-two { grid-template-columns: 1fr !important; }
        }
        .am-card { border: 1px solid #F0E4D6 !important; border-radius: 18px !important; box-shadow: 0 2px 14px rgba(107,45,78,0.06) !important; transition: box-shadow 0.25s ease; }
        .am-card:hover { box-shadow: 0 6px 22px rgba(107,45,78,0.10) !important; }
        .am-head { display: flex; align-items: center; gap: 11px; margin: 0 0 18px; padding-bottom: 13px; border-bottom: 1px solid #F3E6D8; }
        .am-ico { width: 36px; height: 36px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(74,31,56,0.18); }
        .am-title { margin: 0; font-size: 15px; font-weight: 800; color: #4A1F38; }
        .am-form input, .am-form select, .am-form textarea { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .am-form input:focus, .am-form select:focus, .am-form textarea:focus { border-color: #E9C77B !important; box-shadow: 0 0 0 3px rgba(233,199,123,0.25); background: #FFFFFF !important; }
        .am-back { background: #FFFFFF; border: 1px solid #F0E4D6; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 800; color: #6B2D4E; cursor: pointer; box-shadow: 0 1px 4px rgba(74,31,56,0.05); }
        .am-back:hover { background: #FBEEDD; }
        /* compact layout: the whole page fits on one screen */
        .am-card { padding: 16px 20px !important; }
        .am-head { margin-bottom: 11px !important; padding-bottom: 9px !important; }
        .am-ico { width: 30px; height: 30px; font-size: 15px; border-radius: 9px; }
        .am-form label { margin-bottom: 4px !important; }
        .am-form input, .am-form select, .am-form textarea { padding: 7px 11px !important; font-size: 13.5px !important; }
        .am-group { display: flex; align-items: center; gap: 18px; padding: 12px 20px !important; }
        .am-group .am-head { margin: 0 !important; padding: 0 !important; border: none; flex-shrink: 0; }
        .am-group > div:last-child { flex: 1; }
        .am-group label { display: none !important; }
        .am-submit { transition: transform 0.15s ease, filter 0.15s ease; }
        .am-submit:hover { filter: brightness(1.06); transform: translateY(-1px); }
        .UNIMUNITY-hdr-shimmer-title{
          background: linear-gradient(90deg, #FBEEDD 0%, #FFFFFF 20%, #FBEEDD 40%, #FBEEDD 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        .UNIMUNITY-hdr-shimmer-sub{
          background: linear-gradient(90deg, rgba(251,238,221,0.65) 0%, rgba(251,238,221,1) 20%, rgba(251,238,221,0.65) 40%, rgba(251,238,221,0.65) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: block;
          animation: UNIMUNITY-hdr-shimmer 4s linear infinite;
        }
        @keyframes UNIMUNITY-hdr-shimmer {
          0% { background-position: 0% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
      <div style={{ flex: 1 }}>

      <div style={{ background: 'linear-gradient(115deg, #FBEEDD 0%, #FBEEDD 16%, #6B2D4E 40%, #4A1F38 100%)', boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: '14px 32px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 16 }}>
        <img src="/unimunity-logo-color.png" alt="UNIMUNITY" style={{ height: '48px', width: 'auto', display: 'block', justifySelf: 'start' }} />
        <div style={{ textAlign: 'center' as const, justifySelf: 'center', whiteSpace: 'nowrap' as const }}>
          <h1 className="UNIMUNITY-hdr-shimmer-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.3px' }}>Add Member</h1>
          <p className="UNIMUNITY-hdr-shimmer-sub" style={{ fontSize: '11.5px', fontWeight: 500, margin: 0 }}>Add a new member to your organization. They will be integrated into the active cycle.</p>
        </div>
        <div style={{ justifySelf: 'end' }}><DateTimeWeather textColor="rgba(251,238,221,0.85)" /></div>
      </div>

      <div className="am-form" style={{ maxWidth: 1220, margin: '0 auto', padding: '14px 24px 20px' }}>

        <div style={{ marginBottom: 12 }}>
          <button onClick={() => router.push('/dashboard')} className="am-back">
            Back to Dashboard
          </button>
        </div>

        <div className="UNIMUNITY-addmember-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

            <div className="am-card am-group" style={{ background: C.blanc, borderRadius: 16, padding: '24px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div className="am-head">
                <span className="am-ico" style={{ background: 'linear-gradient(135deg,#E9C77B,#C9974D)' }}>{'\ud83c\udfd8\ufe0f'}</span>
                <h2 className="am-title">Group</h2>
              </div>
              {groupsLoading ? (
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Loading your groups...</p>
              ) : groups.length === 0 ? (
                <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                  You have no groups yet.{' '}
                  <span onClick={() => router.push('/dashboard/create-tontine')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                    Create a group first
                  </span>
                </p>
              ) : (
                <div>
                  <label style={labelStyle}>Select Group *</label>
                  <select style={inputStyle} value={selectedGroupId} onChange={e => { setSelectedGroupId(e.target.value); setExpectedAmountTouched(false); }}>
                    <option value="">Choose a group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="am-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'stretch' }}>
            <div className="am-card" style={{ background: C.blanc, borderRadius: 16, padding: '24px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' as const }}>
              <div className="am-head">
                <span className="am-ico" style={{ background: 'linear-gradient(135deg,#FCE4EC,#F4B6C7)' }}>{'\ud83d\udc64'}</span>
                <h2 className="am-title">Personal Information</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 12px' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input style={inputStyle} placeholder="First name" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input style={inputStyle} placeholder="Last name" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Phone *</label>
                  <input style={inputStyle} placeholder="+1 234 567 8900" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Address</label>
                  <input style={inputStyle} placeholder="Street, city" value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Country *</label>
                  <select style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)}>
                    <option value="">Select country...</option>
                    <option>United States</option><option>Haiti</option><option>France</option>
                    <option>Canada</option><option>United Kingdom</option><option>Nigeria</option>
                    <option>Senegal</option><option>Ivory Coast</option><option>Cameroon</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Nationality</label>
                  <input style={inputStyle} placeholder="e.g. Haitian" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Member Type</label>
                  <select style={inputStyle} value={form.memberType} onChange={e => set('memberType', e.target.value)}>
                    <option>Regular</option><option>Premium</option><option>VIP</option><option>Observer</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Color Tag</label>
                  <select style={inputStyle} value={form.colorTag} onChange={e => set('colorTag', e.target.value)}>
                    <option value="">None</option>
                    <option value="Red">Red</option>
                    <option value="Orange">Orange</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Green">Green</option>
                    <option value="Blue">Blue</option>
                    <option value="Purple">Purple</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Role</label>
                  <select style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="member">Member</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="secretary">Secretary</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: '14px 0 0', lineHeight: 1.6 }}>
                Referrals are tracked separately - once this member is added, go to{' '}
                <span onClick={() => router.push('/dashboard/referrals')} style={{ color: C.bordeaux, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                  Referrals
                </span>{' '}
                to record who referred them, if anyone.
              </p>
            </div>

            <div className="am-card" style={{ background: C.blanc, borderRadius: 16, padding: '24px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' as const }}>
              <div className="am-head">
                <span className="am-ico" style={{ background: 'linear-gradient(135deg,#66BB6A,#2E7D32)' }}>{'\ud83d\udcb0'}</span>
                <h2 className="am-title">Contribution & Rotation</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px 12px' }}>
                <div>
                  <label style={labelStyle}>Position *</label>
                  <input style={inputStyle} type="number" min="1" value={form.position} onChange={e => set('position', e.target.value)} />
                  {(() => {
                    const takenBy = groupMembersList.find(m => String(m.position) === String(form.position) && form.position !== '');
                    if (!takenBy) return null;
                    const takenByName = takenBy.fullName || ((takenBy.firstName || '') + ' ' + (takenBy.lastName || '')).trim();
                    return (
                      <p style={{ fontSize: 11, color: '#C62828', margin: '6px 0 0' }}>
                        Position {form.position} is already occupied by {takenByName || 'another member'}.
                      </p>
                    );
                  })()}
                </div>
                {parseInt(form.shares) <= 1 ? (
                  <div>
                    <label style={labelStyle}>Payout Date</label>
                    <input style={inputStyle} type="date" value={payoutDates[0] || ''} onChange={e => setPayoutDateAt(0, e.target.value)} />
                  </div>
                ) : (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Payout Date - Per Part</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                      {payoutDates.map((d, i) => (
                        <div key={i}>
                          <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Part {i + 1}/{form.shares}</label>
                          <input style={inputStyle} type="date" value={d} onChange={e => setPayoutDateAt(i, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Number of Parts</label>
                  <input style={inputStyle} type="number" min="1" step="1" value={form.shares} onChange={e => set('shares', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>
                    Expected Amount (per part)
                    {groupContributionAmount != null && !expectedAmountTouched && (
                      <span style={{ color: C.or, fontWeight: 700, textTransform: 'none' as const, letterSpacing: 0, marginLeft: 6 }}>
                        (auto-filled from group)
                      </span>
                    )}
                  </label>
                  <input
                    style={inputStyle}
                    type="number" min="0" step="0.01"
                    value={form.expectedAmount}
                    onChange={e => { set('expectedAmount', e.target.value); setExpectedAmountTouched(true); }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select style={inputStyle} value={form.currency} onChange={e => set('currency', e.target.value)}>
                    <option>USD</option><option>EUR</option><option>GBP</option>
                    <option>CAD</option><option>HTG</option><option>XOF</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Notes</label>
                  <input style={inputStyle} placeholder="Optional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
              {parseInt(form.shares) > 1 && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: C.creme, borderRadius: 10, border: '1px solid ' + C.orLight }}>
                  <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.6 }}>
                    This member will occupy <strong>{form.shares} slots</strong> in the payment grid and rotation
                    (shown as &quot;part 1/{form.shares}&quot;, &quot;part 2/{form.shares}&quot;, etc.), and will need
                    to pay {form.shares}x the expected amount each week. Each part can have its own payout date above.
                  </p>
                </div>
              )}
              {totalPayoutAmount != null && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: '#F0F9F0', borderRadius: 10, border: '1px solid #C8E6C8' }}>
                  <p style={{ fontSize: 12, color: C.text, margin: 0, lineHeight: 1.6 }}>
                    At their payout turn, this member is expected to receive approximately{' '}
                    <strong>{form.currency} {totalPayoutAmount.toFixed(2)}</strong> ({groupMemberCount || 1} member{groupMemberCount === 1 ? '' : 's'} x {form.currency} {groupContributionAmount?.toFixed(2)} contribution). This is calculated automatically and not stored - it will update if the group's member count changes.
                  </p>
                </div>
              )}
            </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <button onClick={handleSubmit} disabled={loading}
                className="am-submit"
                style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#6B2D4E,#4A1F38)', color: C.blanc, border: 'none', borderRadius: 14, fontSize: 15.5, fontWeight: 800, letterSpacing: 0.3, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 8px 22px rgba(107,45,78,0.28)' }}>
                {loading ? 'Adding member...' : '\u2795  Add Member'}
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
                <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>Back to Dashboard</button>
              </div>
            </div>

          </div>

          <div className="am-card" style={{ background: C.blanc, borderRadius: 16, padding: '22px', border: '1px solid ' + C.border, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', position: 'sticky' as const, top: 24 }}>
            <div style={{ textAlign: 'center' as const, margin: '-22px -22px 14px', padding: '14px 16px 12px', background: 'linear-gradient(160deg,#FBE3E8 0%,#FDF6EC 55%,#EAF3E3 100%)', borderRadius: '16px 16px 0 0', borderBottom: '1px solid ' + C.border }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#3A1F2E' }}>{(form.firstName + ' ' + form.lastName).trim() || 'New member'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#C9974D', textTransform: 'uppercase' as const, letterSpacing: 1.2 }}>Member Summary</p>
            </div>
            {[
              { label: 'Group', value: groups.find(g => g.id === selectedGroupId)?.name || '-' },
              { label: 'Name', value: (form.firstName + ' ' + form.lastName).trim() || '-' },
              { label: 'Address', value: form.address || '-' },
              { label: 'Country', value: form.country || '-' },
              { label: 'Nationality', value: form.nationality || '-' },
              { label: 'Gender', value: form.gender || '-' },
              { label: 'Member Type', value: form.memberType },
              { label: 'Color Tag', value: form.colorTag || 'None' },
              { label: 'Currency', value: form.currency },
              { label: 'Amount / Part', value: form.currency + ' ' + (parseFloat(form.expectedAmount) || 0).toFixed(2) },
              { label: 'Parts', value: form.shares || '1' },
              { label: 'Total / week', value: form.currency + ' ' + ((parseFloat(form.expectedAmount) || 0) * (parseInt(form.shares) || 1)).toFixed(2) },
              { label: 'Est. Payout Amount', value: totalPayoutAmount != null ? form.currency + ' ' + totalPayoutAmount.toFixed(2) : '-' },
              { label: parseInt(form.shares) > 1 ? 'Payout Dates' : 'Payout Date', value: payoutDates.filter(Boolean).join(', ') || '-' },
              { label: 'Position', value: '#' + (form.position || nextPosition) },
              { label: 'Status', value: form.status.charAt(0).toUpperCase() + form.status.slice(1) },
              { label: 'Role', value: form.role.charAt(0).toUpperCase() + form.role.slice(1) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 2px', borderBottom: '1px dashed #F3E6D8' }}>
                <span style={{ fontSize: 12, color: C.muted }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, maxWidth: 140, textAlign: 'right' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'linear-gradient(135deg,#FBEEDD,#F6E3C4)', borderRadius: 12, border: '1px solid ' + C.orLight, textAlign: 'center' as const }}>
              <p style={{ fontSize: 10.5, color: '#A08B7D', margin: 0, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const }}>TYN-ID</p>
              <p style={{ fontSize: 15, color: '#4A1F38', margin: '2px 0 0', fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1 }}>{tynId || '-'}</p>
            </div>
          </div>
        </div>

      </div>

      </div>
      <Footer />
    </div>
  );
}

export default function AddMemberPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>}>
      <AddMemberContent />
    </Suspense>
  );
}
