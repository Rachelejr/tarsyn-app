/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore documents are untyped here. */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getAuthedUid } from '@/lib/apiAuth';

// Organizer: join requests for their own groups only (organizerId = caller).

export async function GET(req: NextRequest) {
  try {
    const uid = await getAuthedUid(req);
    if (typeof uid !== 'string') return uid;

    const snap = await adminDb.collection('joinRequests').where('organizerId', '==', uid).limit(300).get();
    const groupIds = Array.from(new Set(snap.docs.map(d => String(d.data().groupId || '')).filter(Boolean)));
    const groupNames: Record<string, string> = {};
    await Promise.all(groupIds.map(async id => {
      const g = await adminDb.collection('groups').doc(id).get();
      groupNames[id] = g.exists ? String(g.data()?.name || '') : '';
    }));

    const monthAgo = Date.now() - 30 * 864e5;
    const requests = snap.docs
      .map(d => {
        const r = d.data() as Record<string, any>;
        return {
          id: d.id,
          groupId: r.groupId || '',
          groupName: groupNames[r.groupId] || '',
          referrerName: r.referrerName || '',
          firstName: r.firstName || '',
          lastName: r.lastName || '',
          email: r.email || '',
          phone: r.phone || '',
          address: r.address || '',
          country: r.country || '',
          nationality: r.nationality || '',
          gender: r.gender || '',
          message: r.message || '',
          status: r.status || 'pending',
          createdAt: r.createdAt?.toMillis ? r.createdAt.toMillis() : null,
          decidedAt: r.decidedAt?.toMillis ? r.decidedAt.toMillis() : null,
        };
      })
      .filter(r => r.status === 'pending' || (r.decidedAt || 0) > monthAgo)
      .sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ requests });
  } catch (err) {
    console.error('referral/requests error:', err);
    return NextResponse.json({ error: 'Could not load join requests.' }, { status: 500 });
  }
}
