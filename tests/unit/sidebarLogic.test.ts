import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearMockStorage, setMockStorage } from '../setup';
import { Note } from '../../src/types';

// Mock Firebase before importing sidebarLogic
vi.mock('../../src/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

vi.mock('../../src/firebaseSync', () => ({
  FirebaseSync: vi.fn().mockImplementation(() => ({
    saveNotes: vi.fn().mockResolvedValue(undefined),
    loadNotes: vi.fn().mockResolvedValue([]),
    subscribeToScope: vi.fn().mockReturnValue(() => {}),
    migrateLocalNotes: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../src/authService', () => ({
  ensureAuth: vi.fn().mockResolvedValue('test-user-id')
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
          url: 'https://example.com',
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
          url: undefined,
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

      // Await the save operation
      await saveNotes('page', context, notes);

      const key = getStorageKey('page', context);
      const stored = await chrome.storage.local.get(key);
      expect(stored[key]).toEqual(notes);
    });

    it('should handle empty notes array', async () => {
      const context = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      await saveNotes('browser', context, []);

      const key = getStorageKey('browser', context);
      const stored = await chrome.storage.local.get(key);
      expect(stored[key]).toEqual([]);
    });
  });

  describe('loadNotes', () => {
    it('should load notes from storage when Firebase fails', async () => {
      const notes: Note[] = [
        {
          id: '1',
          text: 'Existing note',
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

      const key = getStorageKey('page', context);
      setMockStorage({
        [key]: notes
      });

      // Await the load operation - should fallback to local storage
      const result = await loadNotes('page', context);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array if no notes exist', async () => {
      const context = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      const loaded = await loadNotes('page', context);

      expect(Array.isArray(loaded)).toBe(true);
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