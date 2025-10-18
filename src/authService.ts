import { auth } from './firebaseConfig';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

export const ensureAuth = async (): Promise<string> => {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  
  const result = await signInAnonymously(auth);
  return result.user.uid;
};

export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid || null;
};