import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBIYyC0v2KW-NGBjYmtRP1ZWkWSeoO4h8I",
  authDomain: "invoice-generator-12.firebaseapp.com",
  projectId: "invoice-generator-12",
  storageBucket: "invoice-generator-12.firebasestorage.app",
  messagingSenderId: "465658363744",
  appId: "1:465658363744:web:8cc41192d9b4054ad12805"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
