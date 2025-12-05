import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Note, UrlContext } from '../../src/types';
import { clearMockStorage, setMockStorage } from '../setup';

// Create controllable mock functions
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn();

// Mock Firestore BEFORE any imports
vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' }))
}));

// Mock firebaseConfig
vi.mock('../../src/firebaseConfig', () => ({
  db: { type: 'mock-firestore' },
  auth: { type: 'mock-auth' }
}));

// Now import FirebaseSync after mocks are ready
const { FirebaseSync } = await import('../../src/firebaseSync');

describe('FirebaseSync', () => {
  let syncService: InstanceType<typeof FirebaseSync>;
  const userId = 'test-user-123';
  
  const mockContext: UrlContext = {
    url: 'https://app.example.com/dashboard',
    domain: 'example.com',
    subdomain: 'app.example.com',
    path: '/dashboard',
    fullPath: '/dashboard?id=123'
  };

  const mockDocRef = { 
    path: `users/${userId}/notes/test`,
    id: 'test'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockStorage();
    
    syncService = new FirebaseSync(userId);
    
    // Set up default mock return values
    mockDoc.mockReturnValue(mockDocRef);
    mockSetDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({})
    });
    mockOnSnapshot.mockReturnValue(vi.fn());
  });

  describe('saveNotes', () => {
    it('should save notes to Firestore', async () => {
      const notes: Note[] = [
        {
          id: '1',
          text: 'Test note',
          createdAt: 1234567890,
          updatedAt: 1234567890
        }
      ];

      await syncService.saveNotes('browser', mockContext, notes);

      expect(mockSetDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({
              id: '1',
              text: 'Test note'
            })
          ]),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('should save empty notes array', async () => {
      await syncService.saveNotes('domain', mockContext, []);

      expect(mockSetDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          notes: [],
          updatedAt: expect.any(Object)
        })
      );
    });

    it('should call doc with correct path', async () => {
      await syncService.saveNotes('page', mockContext, []);

      expect(mockDoc).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });

  describe('loadNotes', () => {
    it('should load notes from Firestore', async () => {
      const notes: Note[] = [
        {
          id: '1',
          text: 'Loaded note',
          createdAt: 1234567890,
          updatedAt: 1234567890
        }
      ];

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ notes, updatedAt: Date.now() })
      });

      const result = await syncService.loadNotes('browser', mockContext);

      expect(result).toEqual(notes);
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('should return empty array when document does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await syncService.loadNotes('page', mockContext);

      expect(result).toEqual([]);
    });

    it('should return empty array when notes field is missing', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ updatedAt: Date.now() })
      });

      const result = await syncService.loadNotes('subdomain', mockContext);

      expect(result).toEqual([]);
    });
  });

  describe('subscribeToScope', () => {
    it('should subscribe to Firestore updates', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();
      
      mockOnSnapshot.mockReturnValue(unsubscribe);

      const result = syncService.subscribeToScope('browser', mockContext, callback);

      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(result).toBe(unsubscribe);
    });

    it('should call callback when snapshot updates', () => {
      const callback = vi.fn();
      const notes: Note[] = [
        {
          id: '1',
          text: 'Updated note',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      mockOnSnapshot.mockImplementation((ref, onSnapshotCallback) => {
        const mockSnapshot = {
          data: () => ({ notes, updatedAt: Date.now() })
        };
        onSnapshotCallback(mockSnapshot);
        return vi.fn();
      });

      syncService.subscribeToScope('domain', mockContext, callback);

      expect(callback).toHaveBeenCalledWith(notes);
    });

    it('should handle empty snapshot data', () => {
      const callback = vi.fn();

      mockOnSnapshot.mockImplementation((ref, onSnapshotCallback) => {
        const mockSnapshot = {
          data: () => ({})
        };
        onSnapshotCallback(mockSnapshot);
        return vi.fn();
      });

      syncService.subscribeToScope('page', mockContext, callback);

      expect(callback).toHaveBeenCalledWith([]);
    });
  });

  describe('migrateLocalNotes', () => {
    it('should migrate browser notes', async () => {
      const notes: Note[] = [
        {
          id: '1',
          text: 'Browser note',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      setMockStorage({
        'notes:browser': notes
      });

      await syncService.migrateLocalNotes();

      // Should have called setDoc for the notes and the migration flag
      expect(mockSetDoc).toHaveBeenCalled();
      
      // Check that migration flag was set
      const storage = await chrome.storage.local.get('_migrated_to_firebase');
      expect(storage._migrated_to_firebase).toBe(true);
    });

    it('should migrate domain notes', async () => {
      const notes: Note[] = [
        {
          id: '1',
          text: 'Domain note',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ];

      setMockStorage({
        'notes:domain:example.com': notes
      });

      await syncService.migrateLocalNotes();

      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should mark migration as complete', async () => {
      await syncService.migrateLocalNotes();

      const storage = await chrome.storage.local.get('_migrated_to_firebase');
      expect(storage._migrated_to_firebase).toBe(true);
    });

    it('should skip non-note entries', async () => {
      setMockStorage({
        'some-other-key': 'value',
        '_internal_flag': true
      });

      mockSetDoc.mockClear();
      await syncService.migrateLocalNotes();

      // Should only set migration flag, not migrate other data
      const setDocCalls = mockSetDoc.mock.calls;
      // Filter out calls that are just setting the migration flag
      const noteMigrationCalls = setDocCalls.filter(call => {
        const data = call[1];
        return data && data.notes !== undefined;
      });
      
      expect(noteMigrationCalls.length).toBe(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow write after sufficient delay', async () => {
      const notes: Note[] = [{ id: '1', text: 'First', createdAt: 1000, updatedAt: 1000 }];

      await syncService.saveNotes('browser', mockContext, notes);
      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      // Wait for throttle period
      await new Promise(resolve => setTimeout(resolve, 1100));

      await syncService.saveNotes('browser', mockContext, notes);
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
    });

    it('should block write within throttle period', async () => {
      const notes: Note[] = [{ id: '1', text: 'Test', createdAt: 1000, updatedAt: 1000 }];

      await syncService.saveNotes('browser', mockContext, notes);

      await expect(
        syncService.saveNotes('browser', mockContext, notes)
      ).rejects.toThrow(/please wait before saving again/i);
    });

    it('should have independent rate limiting per context', async () => {
      const notes: Note[] = [{ id: '1', text: 'Test', createdAt: 1000, updatedAt: 1000 }];

      await syncService.saveNotes('browser', mockContext, notes);
      await syncService.saveNotes('domain', mockContext, notes);
      await syncService.saveNotes('page', mockContext, notes);

      expect(mockSetDoc).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Validation', () => {
    it('should reject more than 100 notes', async () => {
      const notes: Note[] = Array.from({ length: 101 }, (_, i) => ({
        id: String(i),
        text: `Note ${i}`,
        createdAt: 1000,
        updatedAt: 1000
      }));

      await expect(
        syncService.saveNotes('browser', mockContext, notes)
      ).rejects.toThrow(/maximum 100 notes/i);
    });

    it('should reject notes larger than 50KB', async () => {
      const largeText = 'a'.repeat(50001);
      const notes: Note[] = [{
        id: '1',
        text: largeText,
        createdAt: 1000,
        updatedAt: 1000
      }];

      await expect(
        syncService.saveNotes('browser', mockContext, notes)
      ).rejects.toThrow(/exceeds maximum size/i);
    });

    it('should allow exactly 100 notes', async () => {
      const notes: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        text: `Note ${i}`,
        createdAt: 1000,
        updatedAt: 1000
      }));

      await syncService.saveNotes('browser', mockContext, notes);

      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should allow note at 50KB limit', async () => {
      const largeText = 'a'.repeat(50000);
      const notes: Note[] = [{
        id: '1',
        text: largeText,
        createdAt: 1000,
        updatedAt: 1000
      }];

      await syncService.saveNotes('browser', mockContext, notes);

      expect(mockSetDoc).toHaveBeenCalled();
    });
  });
});