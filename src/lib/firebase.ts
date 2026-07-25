import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD0nxeXjXSJAG7FtiJoNM66IbLCM3xxUP0",
  authDomain: "tarsyn-ea9de.firebaseapp.com",
  projectId: "tarsyn-ea9de",
  storageBucket: "tarsyn-ea9de.firebasestorage.app",
  messagingSenderId: "694719927105",
  appId: "1:694719927105:web:2d09459b12ea1643bd07c0",
  measurementId: "G-3714TPW6PE"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;

// SECOND NAMED FIREBASE APP INSTANCE - used exclusively by the member portal
// (src/app/member/page.tsx) so an admin session and a member session can be
// signed in at the same time in the same browser without one overwriting
// the other. The default 'auth' above stays for admin/organizer pages.
const memberApp = getApps().find(a => a.name === 'memberApp')
  || initializeApp(firebaseConfig, 'memberApp');

export const memberDb = getFirestore(memberApp);
export const memberAuth = getAuth(memberApp);
export const memberStorage = getStorage(memberApp);
