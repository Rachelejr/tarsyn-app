import { auth, memberAuth } from '@/lib/firebase';

// Adds the signed-in user's Firebase ID token to API calls, so routes can
// check who is calling. Use 'member' on member-portal pages (/member, /join),
// 'admin' (default) on dashboard pages.
export async function authHeaders(which: 'admin' | 'member' = 'admin'): Promise<Record<string, string>> {
  const user = (which === 'member' ? memberAuth : auth).currentUser;
  const token = user ? await user.getIdToken() : '';
  return token ? { Authorization: 'Bearer ' + token } : {};
}
