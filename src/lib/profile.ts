// UNIMUNITY - profile photo (member + organizer/admin)
//
// Two deliberately separate storage locations, matching the security
// boundary Rachele asked for - this is NOT a general-purpose "user
// profile" system, just the minimum needed for a real photo to replace
// the letter-avatar in the support widget's Messages tab:
//
//   - A member's photo lives on their OWN members/{memberId} document
//     (photoUrl field only) - the same document contribution-log/page.tsx
//     already reads `m.photoUrl` from, so this finally populates a field
//     that was already anticipated. firestore.rules was extended with one
//     extra OR-branch on the existing update rule: a member may update
//     ONLY the photoUrl field of a members/{id} doc where
//     resource.data.userId == their own uid - role/groupId/payments/etc.
//     remain fully protected, same as before.
//
//   - An organizer/admin's photo lives in a brand-new publicProfiles/{uid}
//     collection, containing ONLY {photoUrl, displayName} - never the
//     private users/{uid} document, which stays locked to
//     request.auth.uid == uid (unchanged). This exists because a member
//     has no read access to another uid's private `users` doc, and
//     broadening that would have exposed email/role/billing fields no one
//     asked to share. publicProfiles is a new, minimal, additive
//     collection: readable by any signed-in user, writable only by its
//     own uid, and the write rule itself rejects any key other than
//     photoUrl/displayName.
//
// Both paths reuse the exact same Storage upload mechanism chat.ts
// already uses for voice/video/file messages (ref + uploadBytes +
// getDownloadURL) - no new storage system, and storage.rules already
// allows any authenticated write / public read, so no Storage rules
// change was needed for this feature.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit as fsLimit,
  updateDoc,
  setDoc,
  Firestore,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { db, storage } from './firebase';

// Mirrors the paperclip-attachment limit already used for chat files
// (MAX_ATTACHMENT_BYTES in MessagesContent.tsx), kept smaller since this
// is a single profile photo, not an arbitrary document.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function extensionFor(file: File): string {
  const fromName = file.name?.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

// Finds the members/{id} document that belongs to this signed-in member
// (the same where('userId','==',uid) lookup already used in
// member/page.tsx, member/payment-grid/page.tsx, etc.) so the photo
// upload can target the correct document without the caller needing to
// already know its id.
export async function getMyMemberDocId(uid: string, firestoreDb: Firestore = db): Promise<string | null> {
  const q = query(collection(firestoreDb, 'members'), where('userId', '==', uid), fsLimit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].id;
}

export async function getMemberPhotoUrl(memberId: string, firestoreDb: Firestore = db): Promise<string | null> {
  const snap = await getDoc(doc(firestoreDb, 'members', memberId));
  if (!snap.exists()) return null;
  const data = snap.data() as { photoUrl?: unknown };
  return typeof data.photoUrl === 'string' ? data.photoUrl : null;
}

// Uploads a member's own photo and writes ONLY photoUrl to their own
// members/{memberId} doc - firestore.rules enforces that this is the only
// field such a request may touch, so this function intentionally never
// sends any other field in the same update.
export async function uploadMemberPhoto(
  memberId: string,
  file: File,
  storageInstance: FirebaseStorage = storage,
  firestoreDb: Firestore = db
): Promise<string> {
  const path = `profile-photos/members/${memberId}_${Date.now()}.${extensionFor(file)}`;
  const storageRef = ref(storageInstance, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(firestoreDb, 'members', memberId), { photoUrl: url });
  return url;
}

export interface PublicProfile {
  photoUrl?: string;
  displayName?: string;
}

export async function getPublicProfile(uid: string, firestoreDb: Firestore = db): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(firestoreDb, 'publicProfiles', uid));
  return snap.exists() ? (snap.data() as PublicProfile) : null;
}

// Uploads an organizer/admin's own photo into the new publicProfiles/{uid}
// doc. Only photoUrl and displayName are ever written here - the rule
// (request.resource.data.keys().hasOnly(['photoUrl','displayName']))
// rejects anything else, so this is also enforced server-side, not just
// by this function's own discipline.
export async function uploadOrganizerPhoto(
  uid: string,
  displayName: string,
  file: File,
  storageInstance: FirebaseStorage = storage,
  firestoreDb: Firestore = db
): Promise<string> {
  const path = `profile-photos/organizers/${uid}_${Date.now()}.${extensionFor(file)}`;
  const storageRef = ref(storageInstance, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await setDoc(doc(firestoreDb, 'publicProfiles', uid), { photoUrl: url, displayName }, { merge: true });
  return url;
}
