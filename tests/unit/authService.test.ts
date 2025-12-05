import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock functions for Firebase auth
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockSendEmailVerification = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();

// Create a mutable mock auth object
const createMockAuth = () => ({
  currentUser: null as any
});

const mockAuth = createMockAuth();

// Mock Firebase auth module BEFORE imports
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (auth: any, email: string, password: string) =>
    mockCreateUserWithEmailAndPassword(auth, email, password),
  signInWithEmailAndPassword: (auth: any, email: string, password: string) =>
    mockSignInWithEmailAndPassword(auth, email, password),
  sendPasswordResetEmail: (auth: any, email: string) =>
    mockSendPasswordResetEmail(auth, email),
  sendEmailVerification: (user: any) =>
    mockSendEmailVerification(user),
  signOut: (auth: any) => mockSignOut(auth),
  onAuthStateChanged: (auth: any, callback: any) =>
    mockOnAuthStateChanged(auth, callback)
}));

// Mock firebaseConfig
vi.mock('../../src/firebaseConfig', () => ({
  auth: mockAuth,
  db: {}
}));

// Import authService AFTER mocks are set up
const authServiceModule = await import('../../src/authService');

describe('authService', () => {
  beforeEach(() => {
    // Reset mock auth before each test
    mockAuth.currentUser = null;
    vi.clearAllMocks();
  });

  describe('signUpWithEmail', () => {
    it('should create new user and return user ID', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = { uid: 'new-user-id' };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });
      mockSendEmailVerification.mockResolvedValue(undefined);

      const userId = await authServiceModule.signUpWithEmail(email, password);

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        email,
        password
      );
      expect(userId).toBe('new-user-id');
    });

    it('should send verification email after creating user', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = { uid: 'new-user-id', email };

      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });
      mockSendEmailVerification.mockResolvedValue(undefined);

      await authServiceModule.signUpWithEmail(email, password);

      expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser);
    });

    it('should handle email already in use error', async () => {
      const error = { code: 'auth/email-already-in-use', message: 'Email in use' };
      mockCreateUserWithEmailAndPassword.mockRejectedValue(error);

      await expect(
        authServiceModule.signUpWithEmail('test@example.com', 'password123')
      ).rejects.toThrow();
    });

    it('should handle weak password error', async () => {
      const error = { code: 'auth/weak-password', message: 'Weak password' };
      mockCreateUserWithEmailAndPassword.mockRejectedValue(error);

      await expect(
        authServiceModule.signUpWithEmail('test@example.com', '12345')
      ).rejects.toThrow();
    });

    it('should handle invalid email error', async () => {
      const error = { code: 'auth/invalid-email', message: 'Invalid email' };
      mockCreateUserWithEmailAndPassword.mockRejectedValue(error);

      await expect(
        authServiceModule.signUpWithEmail('invalid-email', 'password123')
      ).rejects.toThrow();
    });
  });

  describe('signInWithEmail', () => {
    it('should sign in user and return user ID', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = {
        uid: 'existing-user-id',
        reload: vi.fn().mockResolvedValue(undefined),
        getIdToken: vi.fn().mockResolvedValue('token')
      };

      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      const userId = await authServiceModule.signInWithEmail(email, password);

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        email,
        password
      );
      expect(userId).toBe('existing-user-id');
    });

    it('should handle user not found error', async () => {
      const error = { code: 'auth/user-not-found', message: 'User not found' };
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      await expect(
        authServiceModule.signInWithEmail('nonexistent@example.com', 'password123')
      ).rejects.toThrow();
    });

    it('should handle wrong password error', async () => {
      const error = { code: 'auth/wrong-password', message: 'Wrong password' };
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      await expect(
        authServiceModule.signInWithEmail('test@example.com', 'wrongpassword')
      ).rejects.toThrow();
    });

    it('should handle too many requests error', async () => {
      const error = { code: 'auth/too-many-requests', message: 'Too many requests' };
      mockSignInWithEmailAndPassword.mockRejectedValue(error);

      await expect(
        authServiceModule.signInWithEmail('test@example.com', 'password123')
      ).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com';
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      await authServiceModule.resetPassword(email);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(mockAuth, email);
    });

    it('should handle user not found error', async () => {
      const error = { code: 'auth/user-not-found', message: 'User not found' };
      mockSendPasswordResetEmail.mockRejectedValue(error);

      await expect(
        authServiceModule.resetPassword('nonexistent@example.com')
      ).rejects.toThrow();
    });

    it('should handle invalid email error', async () => {
      const error = { code: 'auth/invalid-email', message: 'Invalid email' };
      mockSendPasswordResetEmail.mockRejectedValue(error);

      await expect(
        authServiceModule.resetPassword('invalid-email')
      ).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('should sign out current user', async () => {
      mockAuth.currentUser = { uid: 'user-123', email: 'test@example.com' };
      mockSignOut.mockResolvedValue(undefined);

      await authServiceModule.signOut();

      expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    });

    it('should handle sign out errors', async () => {
      const error = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(error);

      await expect(authServiceModule.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentUserId', () => {
    it('should return current user ID when authenticated', () => {
      mockAuth.currentUser = { uid: 'current-user-id' };

      const userId = authServiceModule.getCurrentUserId();

      expect(userId).toBe('current-user-id');
    });

    it('should return null when not authenticated', () => {
      mockAuth.currentUser = null;

      const userId = authServiceModule.getCurrentUserId();

      expect(userId).toBeNull();
    });

    it('should handle undefined currentUser', () => {
      mockAuth.currentUser = undefined as any;

      const userId = authServiceModule.getCurrentUserId();

      expect(userId).toBeNull();
    });
  });

  describe('getUserEmail', () => {
    it('should return current user email when authenticated', () => {
      mockAuth.currentUser = { uid: 'user-123', email: 'test@example.com' };

      const email = authServiceModule.getUserEmail();

      expect(email).toBe('test@example.com');
    });

    it('should return null when not authenticated', () => {
      mockAuth.currentUser = null;

      const email = authServiceModule.getUserEmail();

      expect(email).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', () => {
      mockAuth.currentUser = { uid: 'user-123' };

      const result = authServiceModule.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', () => {
      mockAuth.currentUser = null;

      const result = authServiceModule.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('onAuthChange', () => {
    it('should register auth state listener', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();

      mockOnAuthStateChanged.mockReturnValue(unsubscribe);

      const result = authServiceModule.onAuthChange(callback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(mockAuth, callback);
      expect(result).toBe(unsubscribe);
    });

    it('should call callback when user signs in', () => {
      const callback = vi.fn();
      const mockUser = { uid: 'user-123', email: 'test@example.com' };

      mockOnAuthStateChanged.mockImplementation((auth, cb) => {
        cb(mockUser);
        return vi.fn();
      });

      authServiceModule.onAuthChange(callback);

      expect(callback).toHaveBeenCalledWith(mockUser);
    });

    it('should call callback with null when user signs out', () => {
      const callback = vi.fn();

      mockOnAuthStateChanged.mockImplementation((auth, cb) => {
        cb(null);
        return vi.fn();
      });

      authServiceModule.onAuthChange(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('getAuthErrorMessage', () => {
    it('should return friendly message for email-already-in-use', () => {
      const error = { code: 'auth/email-already-in-use' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('This email is already registered. Please sign in instead.');
    });

    it('should return friendly message for invalid-email', () => {
      const error = { code: 'auth/invalid-email' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('Please enter a valid email address.');
    });

    it('should return friendly message for weak-password', () => {
      const error = { code: 'auth/weak-password' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('Password should be at least 6 characters.');
    });

    it('should return friendly message for user-not-found', () => {
      const error = { code: 'auth/user-not-found' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('No account found with this email.');
    });

    it('should return friendly message for wrong-password', () => {
      const error = { code: 'auth/wrong-password' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('Incorrect password. Please try again.');
    });

    it('should return friendly message for too-many-requests', () => {
      const error = { code: 'auth/too-many-requests' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('Too many failed attempts. Please try again later.');
    });

    it('should return friendly message for network-request-failed', () => {
      const error = { code: 'auth/network-request-failed' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('Network error. Please check your connection.');
    });

    it('should return generic message for unknown errors', () => {
      const error = { code: 'auth/unknown-error', message: 'Unknown error' };
      const message = authServiceModule.getAuthErrorMessage(error);
      expect(message).toBe('Unknown error');
    });

    it('should return default message when no error info provided', () => {
      const message = authServiceModule.getAuthErrorMessage({});
      expect(message).toBe('An error occurred. Please try again.');
    });
  });

  describe('Email Verification', () => {
    describe('isEmailVerified', () => {
      it('should return true when user email is verified', () => {
        mockAuth.currentUser = { uid: 'user-123', emailVerified: true };

        const result = authServiceModule.isEmailVerified();

        expect(result).toBe(true);
      });

      it('should return false when user email is not verified', () => {
        mockAuth.currentUser = { uid: 'user-123', emailVerified: false };

        const result = authServiceModule.isEmailVerified();

        expect(result).toBe(false);
      });

      it('should return false when no user is signed in', () => {
        mockAuth.currentUser = null;

        const result = authServiceModule.isEmailVerified();

        expect(result).toBe(false);
      });
    });

    describe('resendVerificationEmail', () => {
      it('should send verification email to current user', async () => {
        const mockUser = { uid: 'user-123', email: 'test@example.com', emailVerified: false };
        mockAuth.currentUser = mockUser;
        mockSendEmailVerification.mockResolvedValue(undefined);

        await authServiceModule.resendVerificationEmail();

        expect(mockSendEmailVerification).toHaveBeenCalledWith(mockUser);
      });

      it('should throw error when no user is signed in', async () => {
        mockAuth.currentUser = null;

        await expect(authServiceModule.resendVerificationEmail()).rejects.toThrow(
          'No user is currently signed in'
        );
      });

      it('should throw error when email is already verified', async () => {
        mockAuth.currentUser = { uid: 'user-123', email: 'test@example.com', emailVerified: true };

        await expect(authServiceModule.resendVerificationEmail()).rejects.toThrow(
          'Email is already verified'
        );
      });

      it('should handle verification email send failure', async () => {
        const mockUser = { uid: 'user-123', email: 'test@example.com', emailVerified: false };
        mockAuth.currentUser = mockUser;
        const error = new Error('Network error');
        mockSendEmailVerification.mockRejectedValue(error);

        await expect(authServiceModule.resendVerificationEmail()).rejects.toThrow('Network error');
      });
    });
  });
});