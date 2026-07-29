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

// Second, independently named Firebase app instance used exclusively by the
// member portal (/member). This exists because /dashboard (admin) and
// /member (member portal) share the same browser and, without this
// separation, a second Firebase Auth sign-in in one tab silently overwrites
// the session of the other tab - so an organizer testing their own member
// view (or a member and an admin both using the app in the same browser)
// would get logged out of one side unexpectedly.
const MEMBER_APP_NAME = "memberApp";
const memberApp = getApps().find(a => a.name === MEMBER_APP_NAME)
  || initializeApp(firebaseConfig, MEMBER_APP_NAME);

export const memberDb = getFirestore(memberApp);
export const memberAuth = getAuth(memberApp);
export const memberStorage = getStorage(memberApp);
