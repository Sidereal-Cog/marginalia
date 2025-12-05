import { auth } from './firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';

// Email/Password Authentication

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string): Promise<string> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Send email verification immediately after signup
    await sendEmailVerification(result.user);

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

    // Force refresh user object and JWT token to get latest email verification status
    await result.user.reload();
    await result.user.getIdToken(true);

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

// Check if user's email is verified
export const isEmailVerified = (): boolean => {
  return auth.currentUser?.emailVerified || false;
};

// Resend verification email
export const resendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
};

// Force refresh user object and JWT token to get latest email verification status
export const refreshUserToken = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  try {
    // Reload user object from Firebase Auth backend
    await user.reload();
    // Force new JWT token with fresh claims
    await user.getIdToken(true);
    // Return updated email verification status
    return auth.currentUser?.emailVerified || false;
  } catch (error) {
    console.error('Failed to refresh user token:', error);
    throw error;
  }
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
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Please contact support.';
    default:
      return error?.message || 'An error occurred. Please try again.';
  }
};