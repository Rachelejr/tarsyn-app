import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Shared identity checks for API routes.
// Every route that reads private data or changes anything must call one of
// these first. The uid always comes from the verified Firebase ID token in
// the Authorization header, never from the URL or the request body.

/** Verified uid of the caller, or a 401 response to return as-is. */
export async function getAuthedUid(req: NextRequest | Request): Promise<string | NextResponse> {
  const header = req.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!idToken) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session. Please sign in again.' }, { status: 401 });
  }
}

/** True when the user doc carries a platform admin role. */
export async function isPlatformAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await adminDb.collection('users').doc(uid).get();
    const role = snap.exists ? snap.data()?.role : null;
    // Platform administrator = 'superadmin' ONLY. Every organizer has the
    // role 'admin' (set at sign-up), so 'admin' must never open platform tools.
    return role === 'superadmin';
  } catch {
    return false;
  }
}

/** 403 response helper. */
export function forbidden(message = 'Access denied'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Maintenance, audit, debug and one-off repair routes.
 * They answer 404 unless the caller is a signed-in platform admin, or sends
 * the MAINTENANCE_SECRET (header "x-maintenance-secret" or "?secret=") while
 * that environment variable is set. With no secret configured and no admin
 * token, the route behaves as if it did not exist.
 * Returns null when allowed, otherwise the response to return.
 */
export async function requireMaintenance(req: NextRequest | Request): Promise<NextResponse | null> {
  const notFound = NextResponse.json({ error: 'Not found' }, { status: 404 });

  const secret = process.env.MAINTENANCE_SECRET || '';
  if (secret.length >= 24) {
    const url = new URL(req.url);
    const given = req.headers.get('x-maintenance-secret') || url.searchParams.get('secret') || '';
    if (given && given === secret) return null;
  }

  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) {
    const uidOrError = await getAuthedUid(req);
    if (typeof uidOrError === 'string' && await isPlatformAdmin(uidOrError)) return null;
  }
  return notFound;
}
