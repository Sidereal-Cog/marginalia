import { describe, it, expect, beforeEach, vi } from 'vitest';
import browser from 'webextension-polyfill';
import { Note, UrlContext } from '../../src/types';

// Mock Firebase config before imports
vi.mock('../../src/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user' } }
}));

// Mock authService
let mockOnAuthChangeCallback: ((user: any) => void) | null = null;
vi.mock('../../src/authService', () => ({
  onAuthChange: vi.fn((callback) => {
    mockOnAuthChangeCallback = callback;
    return () => {}; // cleanup function
  }),
  getCurrentUserId: vi.fn(() => 'test-user-id')
}));

// Mock sidebarLogic with proper types
let mockLoadNotesImpl: (scope: string, context: UrlContext) => Promise<Note[]> = vi.fn().mockResolvedValue([]);
let mockGetCurrentTabContextImpl: () => Promise<UrlContext | null> = vi.fn().mockResolvedValue({
  url: 'https://example.com/test',
  domain: 'example.com',
  subdomain: 'example.com',
  path: '/test',
  fullPath: '/test'
});

vi.mock('../../src/sidebarLogic', () => ({
  initializeSync: vi.fn().mockResolvedValue(undefined),
  getCurrentTabContext: vi.fn((...args) => mockGetCurrentTabContextImpl(...args)),
  loadNotes: vi.fn((...args) => mockLoadNotesImpl(...args))
}));

// Import after mocks
const { formatBadgeText, clearBadge, updateBadge } = await import('../../src/background');
const { loadNotes, getCurrentTabContext } = await import('../../src/sidebarLogic');

describe('background - Badge functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockLoadNotesImpl = vi.fn().mockResolvedValue([]);
    mockGetCurrentTabContextImpl = vi.fn().mockResolvedValue({
      url: 'https://example.com/test',
      domain: 'example.com',
      subdomain: 'example.com',
      path: '/test',
      fullPath: '/test'
    });
  });

  describe('formatBadgeText', () => {
    it('should return empty string for 0', () => {
      expect(formatBadgeText(0)).toBe('');
    });

    it('should return number as string for 1-99', () => {
      expect(formatBadgeText(1)).toBe('1');
      expect(formatBadgeText(50)).toBe('50');
      expect(formatBadgeText(99)).toBe('99');
    });

    it('should return "99+" for counts over 99', () => {
      expect(formatBadgeText(100)).toBe('99+');
      expect(formatBadgeText(142)).toBe('99+');
      expect(formatBadgeText(999)).toBe('99+');
    });
  });

  describe('clearBadge', () => {
    it('should set badge text to empty string', () => {
      clearBadge();

      expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('updateBadge', () => {
    it('should clear badge when no context available', async () => {
      mockGetCurrentTabContextImpl = vi.fn().mockResolvedValue(null);

      await updateBadge();

      expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });

    it('should show count of contextual notes (page + subdomain + domain)', async () => {
      const mockContext: UrlContext = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      mockGetCurrentTabContextImpl = vi.fn().mockResolvedValue(mockContext);

      // Mock different note counts for each scope
      mockLoadNotesImpl = vi.fn((scope: string) => {
        const mockNote = (id: string): Note => ({
          id,
          text: `Note ${id}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        if (scope === 'page') return Promise.resolve([mockNote('1'), mockNote('2')]);
        if (scope === 'subdomain') return Promise.resolve([mockNote('3')]);
        if (scope === 'domain') return Promise.resolve([mockNote('4'), mockNote('5')]);
        if (scope === 'browser') return Promise.resolve([mockNote('6')]);
        return Promise.resolve([]);
      });

      await updateBadge();

      // Should call loadNotes for page, subdomain, domain (but NOT browser)
      expect(loadNotes).toHaveBeenCalledWith('page', mockContext);
      expect(loadNotes).toHaveBeenCalledWith('subdomain', mockContext);
      expect(loadNotes).toHaveBeenCalledWith('domain', mockContext);
      expect(loadNotes).not.toHaveBeenCalledWith('browser', expect.anything());

      // Total: 2 (page) + 1 (subdomain) + 2 (domain) = 5
      expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '5' });
      expect(browser.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4a9eff' });
      expect(browser.action.setBadgeTextColor).toHaveBeenCalledWith({ color: '#ffffff' });
    });

    it('should exclude browser-wide notes from count', async () => {
      const mockContext: UrlContext = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      mockGetCurrentTabContextImpl = vi.fn().mockResolvedValue(mockContext);

      // Mock notes: only browser scope has notes
      mockLoadNotesImpl = vi.fn((scope: string) => {
        if (scope === 'browser') {
          return Promise.resolve([
            { id: '1', text: 'Browser note', createdAt: Date.now(), updatedAt: Date.now() }
          ]);
        }
        return Promise.resolve([]);
      });

      await updateBadge();

      // Badge should be clear since browser notes are excluded
      expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(browser.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });

    it('should show "99+" for counts over 99', async () => {
      const mockContext: UrlContext = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      mockGetCurrentTabContextImpl = vi.fn().mockResolvedValue(mockContext);

      // Create 100 notes for page scope
      const manyNotes: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: `Note ${i}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }));

      mockLoadNotesImpl = vi.fn((scope: string) => {
        if (scope === 'page') return Promise.resolve(manyNotes);
        return Promise.resolve([]);
      });

      await updateBadge();

      expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '99+' });
    });

    it('should clear badge when count is 0', async () => {
      const mockContext: UrlContext = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      mockGetCurrentTabContextImpl = vi.fn().mockResolvedValue(mockContext);
      mockLoadNotesImpl = vi.fn().mockResolvedValue([]);

      await updateBadge();

      expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(browser.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });

    it('should not clear badge on error', async () => {
      const mockContext: UrlContext = {
        url: 'https://example.com/test',
        domain: 'example.com',
        subdomain: 'example.com',
        path: '/test',
        fullPath: '/test'
      };

      mockGetCurrentTabContextImpl = vi.fn().mockResolvedValue(mockContext);
      mockLoadNotesImpl = vi.fn().mockRejectedValue(new Error('Load failed'));

      await updateBadge();

      // Should not call setBadgeText when error occurs
      expect(browser.action.setBadgeText).not.toHaveBeenCalled();
    });
  });

  // Note: Message listener integration (UPDATE_BADGE, GET_CURRENT_TAB) is tested
  // in App.test.tsx via integration tests that verify the full message flow
});
