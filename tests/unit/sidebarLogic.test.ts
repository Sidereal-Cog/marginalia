import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearMockStorage, setMockStorage } from '../setup';
import { Note } from '../../src/types';

// Create a mock Firebase sync service
let mockFirebaseSyncInstance: any;

// Mock Firebase before importing sidebarLogic
vi.mock('../../src/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

vi.mock('../../src/firebaseSync', () => ({
  FirebaseSync: vi.fn().mockImplementation(() => {
    mockFirebaseSyncInstance = {
      saveNotes: vi.fn().mockResolvedValue(undefined),
      loadNotes: vi.fn().mockResolvedValue([]),
      subscribeToScope: vi.fn().mockReturnValue(() => {}),
      migrateLocalNotes: vi.fn().mockResolvedValue(undefined)
    };
    return mockFirebaseSyncInstance;
  })
}));

// Updated mock to include getCurrentUserId
vi.mock('../../src/authService', () => ({
  getCurrentUserId: vi.fn(() => 'test-user-id')
}));

// Import after mocks
const { 
  getCurrentTabContext,
  saveNotes,
  loadNotes,
  getStorageKey
} = await import('../../src/sidebarLogic');

describe('sidebarLogic', () => {
  beforeEach(() => {
    clearMockStorage();
    vi.clearAllMocks();
    
    // Reset Firebase mock instance
    if (mockFirebaseSyncInstance) {
      mockFirebaseSyncInstance.saveNotes = vi.fn().mockResolvedValue(undefined);
      mockFirebaseSyncInstance.loadNotes = vi.fn().mockResolvedValue([]);
    }
    
    // Set up default successful tab query response
    vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
      const tabs = [{
        id: 1,
        url: 'https://example.com/test',
        active: true
      }];
      if (callback) {
        callback(tabs);
        return undefined;
      }
      return Promise.resolve(tabs);
    }) as any);
  });

  describe('getCurrentTabContext', () => {
    it('should extract context from a full URL', async () => {
      vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
        const tabs = [{
          id: 1,
          url: 'https://app.example.com/dashboard?id=123',
          active: true
        }];
        if (callback) {
          callback(tabs);
          return undefined;
        }
        return Promise.resolve(tabs);
      }) as any);

      const context = await getCurrentTabContext();

      expect(context?.domain).toBe('example.com');
      expect(context?.subdomain).toBe('app.example.com');
      expect(context?.path).toBe('/dashboard');
      expect(context?.fullPath).toContain('/dashboard');
    });

    it('should handle URLs without subdomains', async () => {
      vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
        const tabs = [{
          id: 1,
          url: 'https://example.com/page',
          active: true
        }];
        if (callback) {
          callback(tabs);
          return undefined;
        }
        return Promise.resolve(tabs);
      }) as any);

      const context = await getCurrentTabContext();

      expect(context?.domain).toBe('example.com');
      expect(context?.subdomain).toBe('example.com');
      expect(context?.path).toBe('/page');
    });

    it('should handle root paths', async () => {
      vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
        const tabs = [{
          id: 1,
          url: 'https://example.com/',
          active: true
        }];
        if (callback) {
          callback(tabs);
          return undefined;
        }
        return Promise.resolve(tabs);
      }) as any);

      const context = await getCurrentTabContext();

      expect(context?.path).toBe('/');
    });

    it('should return null for invalid URLs', async () => {
      vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
        const tabs = [{
          id: 1,
          url: undefined, // undefined URL should cause parseUrlContext to return null
          active: true
        }];
        if (callback) {
          callback(tabs);
          return undefined;
        }
        return Promise.resolve(tabs);
      }) as any);

      const context = await getCurrentTabContext();

      expect(context).toBeNull();
    });
  });

  describe('saveNotes', () => {
    it('should save notes to chrome storage', async () => {
      const notes: Note[] = [
        {
          id: '1',
          text: 'Test note',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const context = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      await saveNotes('page', context, notes);

      // Verify storage was called
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should handle empty notes array', async () => {
      const context = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      await saveNotes('page', context, []);

      // Should still save (empty array)
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('loadNotes', () => {
    it('should load notes from storage when Firebase fails', async () => {
      const mockNotes: Note[] = [
        {
          id: '1',
          text: 'Stored note',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      const context = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      // Pre-populate storage
      const key = getStorageKey('page', context);
      setMockStorage({
        [key]: mockNotes
      });

      // Make Firebase throw an error to test fallback
      if (mockFirebaseSyncInstance) {
        mockFirebaseSyncInstance.loadNotes = vi.fn().mockRejectedValue(new Error('Firebase error'));
      }

      const loaded = await loadNotes('page', context);

      // Should fall back to local storage
      expect(loaded).toEqual(mockNotes);
    });

    it('should return empty array if no notes exist', async () => {
      const context = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      // Make Firebase return empty array
      if (mockFirebaseSyncInstance) {
        mockFirebaseSyncInstance.loadNotes = vi.fn().mockResolvedValue([]);
      }

      const loaded = await loadNotes('page', context);

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBe(0);
    });
  });

  describe('getStorageKey', () => {
    const context = {
      url: 'https://app.example.com/dashboard',
      domain: 'example.com',
      subdomain: 'app.example.com',
      path: '/dashboard',
      fullPath: '/dashboard'
    };

    it('should generate browser key', () => {
      const key = getStorageKey('browser', context);
      expect(key).toBe('notes:browser');
    });

    it('should generate domain key', () => {
      const key = getStorageKey('domain', context);
      expect(key).toBe('notes:domain:example.com');
    });

    it('should generate subdomain key', () => {
      const key = getStorageKey('subdomain', context);
      expect(key).toBe('notes:subdomain:app.example.com');
    });

    it('should generate page key', () => {
      const key = getStorageKey('page', context);
      expect(key).toBe('notes:page:app.example.com/dashboard');
    });
  });
});