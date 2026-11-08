// Loads Firebase and shares it with the other files as window.FB.
// IMPORTS: loads the Firebase code (app, sign-in, database) from Google.
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  orderBy,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// CONNECT: starts Firebase with the keys from config.js (skipped while they are still placeholders).
const cfg = window.FIREBASE_CONFIG;

let auth = null,
    db   = null;

if(!String(cfg.apiKey).startsWith('YOUR')){
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db   = getFirestore(app);
}

// SHARE: makes the Firebase tools available to the other files as window.FB.
window.FB = {
  auth,
  db,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  query,
  orderBy,
  increment,
  serverTimestamp
};
