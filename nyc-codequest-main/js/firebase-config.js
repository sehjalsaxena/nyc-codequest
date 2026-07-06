import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6P60heZFfRMtY7zM09sSzLvwekjQwALo",
  authDomain: "nyc-auth.firebaseapp.com",
  projectId: "nyc-auth",
  storageBucket: "nyc-auth.firebasestorage.app",
  messagingSenderId: "466261296608",
  appId: "1:466261296608:web:d2d7165f6f5fd2bc5f5785"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
