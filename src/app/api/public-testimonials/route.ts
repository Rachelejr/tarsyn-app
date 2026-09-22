import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Public, read-only endpoint that returns approved testimonials for
// display on the home page. Anonymous visitors browsing unimunity.com are
// not signed in to either Firebase Auth instance, so a direct client-side
// Firestore read (firestore.rules requires request.auth != null on
// /testimonials/{id}) is not possible from the home page. This route uses
// the admin SDK instead, exactly like the other repair-* endpoints, and
// only ever exposes testimonials whose status is "approved" - pending and
// rejected ones never leave the server.
export async function GET() {
  try {
    // No orderBy here on purpose - see the same fix in
    // admin/testimonials/page.tsx: pairing where('status', '==', ...) with
    // orderBy('createdAt', ...) needs a composite Firestore index that was
    // never created, so this always failed silently and the home page
    // never showed any approved review. Sorted by hand below instead.
    const snap = await adminDb
      .collection('testimonials')
      .where('status', '==', 'approved')
      .get();

    const testimonials = snap.docs
      .map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          authorName: data.authorName || 'UNIMUNITY user',
          authorRole: data.authorRole === 'member' ? 'member' : 'organizer',
          rating: typeof data.rating === 'number' ? data.rating : 5,
          text: data.text || '',
          _createdAtMs: data.createdAt?.toMillis?.() ?? 0,
        };
      })
      .sort((a, b) => b._createdAtMs - a._createdAtMs)
      .slice(0, 9)
      .map(({ _createdAtMs, ...rest }) => rest);

    return NextResponse.json({ testimonials });
  } catch (e: any) {
    console.error('public-testimonials error:', e);
    // Fail safe: an empty list just means the home page falls back to the
    // "leave a review" CTA - it must never break the home page itself.
    return NextResponse.json({ testimonials: [] }, { status: 200 });
  }
}
