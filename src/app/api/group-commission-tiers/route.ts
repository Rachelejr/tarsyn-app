﻿import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const DEFAULT_COMMISSION_TIERS = [
  { min: 0, max: 3000, rate: 5 },
  { min: 3000, max: 6000, rate: 4.5 },
  { min: 6000, max: 10000, rate: 4 },
  { min: 10000, max: 20000, rate: 3.5 },
  { min: 20000, max: null, rate: 3 },
];

// Returns the commission tiers that apply to a group. Groups created before
// commission tiers existed have none saved on the group itself - for those
// this falls back to the organizer's current default tiers (Commission
// Settings), and finally to the platform default tiers, so every member
// (old groups included) sees real tiers and is asked to sign them. Uses the
// Admin SDK so a member can safely look this up without needing read access
// to another user's private account document.
export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');
    if (!groupId) {
      return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
    }

    const groupSnap = await adminDb.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) {
      return NextResponse.json({ tiers: DEFAULT_COMMISSION_TIERS, currency: '' });
    }

    const gData = groupSnap.data() as any;
    const currency = gData?.currency || '';
    let tiers = Array.isArray(gData?.commissionAgreement?.tiers) ? gData.commissionAgreement.tiers : [];

    if (tiers.length === 0) {
      const organizerId = gData?.organizerId || gData?.adminId;
      if (organizerId) {
        try {
          const orgSnap = await adminDb.collection('users').doc(organizerId).get();
          const orgTiers = orgSnap.exists ? (orgSnap.data() as any)?.commissionTiers : null;
          tiers = Array.isArray(orgTiers) && orgTiers.length > 0 ? orgTiers : DEFAULT_COMMISSION_TIERS;
        } catch (e) {
          tiers = DEFAULT_COMMISSION_TIERS;
        }
      } else {
        tiers = DEFAULT_COMMISSION_TIERS;
      }
    }

    return NextResponse.json({ tiers, currency });
  } catch (err: any) {
    console.error('group-commission-tiers error:', err);
    return NextResponse.json({ error: err?.message || 'Lookup failed' }, { status: 500 });
  }
}
