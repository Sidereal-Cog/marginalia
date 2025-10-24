import { auth } from './firebaseConfig';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  onAuthStateChanged, 
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';

// Get the extension's URL for magic link redirect
// Use chrome.runtime.getURL which works in both UI and service worker contexts
const getExtensionUrl = (): string => {
  return chrome.runtime.getURL('index.html');
};

const actionCodeSettings = {
  // URL you want to redirect back to after email link is clicked
  url: getExtensionUrl(),
  handleCodeInApp: true,
};

// Email/Password Authentication

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string): Promise<string> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user.uid;
  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<string> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user.uid;
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
};

// Magic Link Authentication (kept for compatibility)

// Send magic link to email
export const sendMagicLink = async (email: string): Promise<void> => {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save email locally so we can complete sign-in after redirect
    window.localStorage.setItem('emailForSignIn', email);
  } catch (error) {
    console.error('Failed to send magic link:', error);
    throw error;
  }
};

// Complete sign-in after user clicks magic link
export const completeMagicLinkSignIn = async (emailLink: string): Promise<string> => {
  try {
    // Get email from storage
    let email = window.localStorage.getItem('emailForSignIn');
    
    // If email not in storage, we need to ask user for it
    if (!email) {
      throw new Error('Email not found. Please enter your email again.');
    }

    const result = await signInWithEmailLink(auth, email, emailLink);
    
    // Clear email from storage
    window.localStorage.removeItem('emailForSignIn');
    
    return result.user.uid;
  } catch (error) {
    console.error('Failed to complete sign-in:', error);
    throw error;
  }
};

// Check if current URL is a sign-in link
export const isSignInLink = (url: string): boolean => {
  return isSignInWithEmailLink(auth, url);
};

// Common Authentication Functions

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Get current user ID
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid || null;
};

// Get user email
export const getUserEmail = (): string | null => {
  return auth.currentUser?.email || null;
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Helper to get user-friendly error messages
export const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-action-code':
      return 'This link has expired or is invalid. Please request a new one.';
    case 'auth/expired-action-code':
      return 'This link has expired. Please request a new one.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return error?.message || 'An error occurred. Please try again.';
  }
}