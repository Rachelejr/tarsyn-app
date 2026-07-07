import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Outil de diagnostic temporaire : affiche le contenu BRUT d'un membre dans
// Firestore, sans passer par la Console web. A supprimer une fois le
// debogage termine (ne devrait pas rester en production).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const tynId = req.nextUrl.searchParams.get('tynId');
    const groupId = req.nextUrl.searchParams.get('groupId');
    const gridOf = req.nextUrl.searchParams.get('gridOf');

    if (gridOf) {
      const gridId = gridOf + '_current';
      const gridSnap = await adminDb.collection('paymentGrids').doc(gridId).get();
      if (!gridSnap.exists) {
        return NextResponse.json({ found: false, gridId });
      }
      const data = gridSnap.data() as any;
      const weekEntries = Object.entries(data?.weeks || {}) as [string, string][];
      weekEntries.sort((a, b) => Number(a[0]) - Number(b[0]));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weeksWithWeekday = weekEntries.slice(0, 10).map(([idx, dateStr]) => ({
        weekIndex: idx,
        date: dateStr,
        weekday: dayNames[new Date(dateStr + 'T12:00:00Z').getUTCDay()],
      }));
      return NextResponse.json({
        found: true,
        gridId,
        startDate: data?.startDate || null,
        startDateWeekday: data?.startDate ? dayNames[new Date(data.startDate + 'T12:00:00Z').getUTCDay()] : null,
        startYear: data?.startYear || null,
        totalWeeksStored: weekEntries.length,
        first10Weeks: weeksWithWeekday,
      });
    }

    let snap;
    if (tynId) {
      snap = await adminDb.collection('members').where('tynId', '==', tynId).limit(5).get();
    } else if (groupId) {
      snap = await adminDb.collection('members').where('groupId', '==', groupId).limit(20).get();
    } else {
      return NextResponse.json({ error: 'Provide ?tynId=..., ?groupId=..., or ?gridOf=<groupId>' }, { status: 400 });
    }

    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ count: results.length, members: results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}