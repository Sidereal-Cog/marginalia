import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create mock functions that we can control
const mockSignInAnonymously = vi.fn();
const mockOnAuthStateChanged = vi.fn();

// Create a mutable mock auth object
const createMockAuth = () => ({
  currentUser: null as any
});

let mockAuth = createMockAuth();

// Mock Firebase auth module
vi.mock('firebase/auth', () => ({
  signInAnonymously: (auth: any) => mockSignInAnonymously(auth),
  onAuthStateChanged: (auth: any, callback: any) => mockOnAuthStateChanged(auth, callback)
}));

// Mock firebaseConfig to use our mock auth
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

  describe('ensureAuth', () => {
    it('should return existing user ID if already authenticated', async () => {
      // Set up existing user
      mockAuth.currentUser = { uid: 'existing-user-id' };

      const userId = await authServiceModule.ensureAuth();

      expect(userId).toBe('existing-user-id');
      expect(mockSignInAnonymously).not.toHaveBeenCalled();
    });

    it('should sign in anonymously if not authenticated', async () => {
      mockAuth.currentUser = null;

      mockSignInAnonymously.mockResolvedValue({
        user: { uid: 'new-user-id' }
      });

      const userId = await authServiceModule.ensureAuth();

      expect(mockSignInAnonymously).toHaveBeenCalled();
      expect(userId).toBe('new-user-id');
    });

    it('should handle authentication errors', async () => {
      mockAuth.currentUser = null;

      const error = new Error('Authentication failed');
      mockSignInAnonymously.mockRejectedValue(error);

      await expect(authServiceModule.ensureAuth()).rejects.toThrow('Authentication failed');
    });
  });

  describe('onAuthChange', () => {
    it('should register auth state listener', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();

      mockOnAuthStateChanged.mockReturnValue(unsubscribe);

      const result = authServiceModule.onAuthChange(callback);

      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      expect(result).toBe(unsubscribe);
    });

    it('should call callback when auth state changes', () => {
      const callback = vi.fn();
      const mockUser = { uid: 'user-123' };

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

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const mockUnsubscribe = vi.fn();

      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const unsubscribe = authServiceModule.onAuthChange(callback);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
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
});