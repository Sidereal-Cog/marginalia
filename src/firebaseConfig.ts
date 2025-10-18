import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAxZPo3DcNsVgLrFWfY8v2CA0ryaDttp-c",
  authDomain: "marginalia-13647.firebaseapp.com",
  projectId: "marginalia-13647",
  storageBucket: "marginalia-13647.firebasestorage.app",
  messagingSenderId: "262866256069",
  appId: "1:262866256069:web:6b58d730d8b252ea8830ac"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);