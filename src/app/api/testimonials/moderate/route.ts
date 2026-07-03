import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const SUPER_ADMIN_EMAIL = 'rachelejr779@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { idToken, testimonialId, action } = await req.json();
    if (!idToken || !testimonialId || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if (decoded.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await adminDb.collection('testimonials').doc(testimonialId).update({ status: newStatus });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Failed to moderate testimonial' }, { status: 500 });
  }
}
