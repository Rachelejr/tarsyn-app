import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export default app;