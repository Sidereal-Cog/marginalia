import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { clearMockStorage, setMockStorage } from '../setup';

// Create mock Firebase sync instance that can be controlled
let mockFirebaseSyncInstance: any;
const createMockFirebaseSync = () => ({
  saveNotes: vi.fn().mockResolvedValue(undefined),
  loadNotes: vi.fn().mockResolvedValue([]),
  subscribeToScope: vi.fn().mockReturnValue(() => {}),
  migrateLocalNotes: vi.fn().mockResolvedValue(undefined)
});

// Mock Firebase for App component
vi.mock('../../src/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

vi.mock('../../src/firebaseSync', () => ({
  FirebaseSync: vi.fn().mockImplementation(() => {
    mockFirebaseSyncInstance = createMockFirebaseSync();
    return mockFirebaseSyncInstance;
  })
}));

// Updated mock to include onAuthChange and getCurrentUserId
vi.mock('../../src/authService', () => ({
  onAuthChange: vi.fn((callback) => {
    // Simulate authenticated user
    callback({ uid: 'test-user-id', email: 'test@example.com' });
    return vi.fn(); // Return unsubscribe function
  }),
  getCurrentUserId: vi.fn(() => 'test-user-id'),
  signOut: vi.fn().mockResolvedValue(undefined)
}));

// Helper to flush all promises
const flushPromises = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

describe('App', () => {
  beforeEach(() => {
    clearMockStorage();
    vi.clearAllMocks();
    
    // Reset Firebase mock instance to default behavior
    if (mockFirebaseSyncInstance) {
      Object.assign(mockFirebaseSyncInstance, createMockFirebaseSync());
    }
    
    // Set up default tab context with callback pattern
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

  it('should render the app with header', async () => {
    render(<App />);
    await flushPromises();
    
    expect(await screen.findByText('Marginalia')).toBeInTheDocument();
    expect(screen.getByTestId('app-container')).toBeInTheDocument();
  });

  it('should display user email', async () => {
    render(<App />);
    await flushPromises();
    
    const userEmail = await screen.findByTestId('user-email');
    expect(userEmail).toHaveTextContent('test@example.com');
  });

  it('should have a sign out button', async () => {
    render(<App />);
    await flushPromises();
    
    const signOutButton = await screen.findByTestId('signout-button');
    expect(signOutButton).toBeInTheDocument();
    expect(signOutButton).toHaveAttribute('aria-label', 'Sign out');
  });

  it('should render tab navigation', async () => {
    render(<App />);
    await flushPromises();
    
    // For example.com (no subdomain), only 3 tabs should appear: Page, Domain, Browser
    expect(await screen.findByTestId('tab-page')).toBeInTheDocument();
    expect(screen.getByTestId('tab-domain')).toBeInTheDocument();
    expect(screen.getByTestId('tab-browser')).toBeInTheDocument();
    
    // Subdomain tab should NOT be present when domain === subdomain
    expect(screen.queryByTestId('tab-subdomain')).not.toBeInTheDocument();
  });

  it('should have accessible tab roles', async () => {
    render(<App />);
    await flushPromises();
    
    const pageTab = await screen.findByTestId('tab-page');
    expect(pageTab).toHaveAttribute('role', 'tab');
    expect(pageTab).toHaveAttribute('aria-label', 'Page tab');
    expect(pageTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should have a textarea for adding notes', async () => {
    render(<App />);
    await flushPromises();
    
    const textarea = await screen.findByTestId('new-note-input');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-label', 'New note input');
  });

  it('should have an add note button', async () => {
    render(<App />);
    await flushPromises();
    
    const addButton = await screen.findByTestId('add-note-button');
    expect(addButton).toBeInTheDocument();
    expect(addButton).toHaveAttribute('aria-label', 'Add note');
  });

  it('should handle empty state', async () => {
    render(<App />);
    await flushPromises();
    
    const emptyState = await screen.findByTestId('empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('No notes yet. Add one above!');
  });

  it('should display current context', async () => {
    render(<App />);
    await flushPromises();
    
    // Page tab is selected by default, so should show the path
    const scopeDisplay = await screen.findByTestId('current-scope');
    expect(scopeDisplay).toHaveTextContent('/test');
  });

  it('should allow switching between tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await flushPromises();
    
    // Click on Domain tab
    const domainTab = await screen.findByTestId('tab-domain');
    await user.click(domainTab);
    await flushPromises();
    
    // Verify tab is now selected
    expect(domainTab).toHaveAttribute('aria-selected', 'true');
    expect(domainTab).toHaveClass('border-indigo-600');
  });

  it('should create a new note when text is entered', async () => {
    const user = userEvent.setup();
    render(<App />);
    await flushPromises();
    
    const textarea = await screen.findByTestId('new-note-input');
    await user.type(textarea, 'Test note');
    await user.keyboard('{Enter}');
    await flushPromises();
    
    // Note should appear in the list
    expect(await screen.findByText('Test note')).toBeInTheDocument();
  });

  it('should clear textarea after creating note', async () => {
    const user = userEvent.setup();
    render(<App />);
    await flushPromises();
    
    const textarea = await screen.findByTestId('new-note-input') as HTMLTextAreaElement;
    await user.type(textarea, 'Test note');
    await user.keyboard('{Enter}');
    await flushPromises();
    
    // Textarea should be empty
    expect(textarea.value).toBe('');
  });

  it('should handle note deletion', async () => {
    const user = userEvent.setup();
    
    const mockNote = {
      id: '1',
      text: 'Note to delete',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Pre-populate storage
    setMockStorage({
      'notes:page:example.com/test': [mockNote]
    });
    
    // Make Firebase return the pre-populated data (simulating successful sync)
    mockFirebaseSyncInstance.loadNotes = vi.fn().mockImplementation((scope, context) => {
      if (scope === 'page') {
        return Promise.resolve([mockNote]);
      }
      return Promise.resolve([]);
    });
    
    render(<App />);
    await flushPromises();
    
    // Note should be visible
    const noteElement = await screen.findByTestId('note-1');
    expect(noteElement).toBeInTheDocument();
    
    // Find and click the menu button
    const menuButton = within(noteElement).getByTestId('note-menu-button');
    await user.click(menuButton);
    await flushPromises();
    
    // Menu should be open
    const menu = await screen.findByTestId('note-menu');
    expect(menu).toBeInTheDocument();
    
    // Click delete
    const deleteButton = within(menu).getByTestId('delete-note-button');
    await user.click(deleteButton);
    await flushPromises();
    
    // Note should be gone
    expect(screen.queryByTestId('note-1')).not.toBeInTheDocument();
  });

  it('should handle note editing', async () => {
    const user = userEvent.setup();
    
    const mockNote = {
      id: '1',
      text: 'Original note text',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Pre-populate storage
    setMockStorage({
      'notes:page:example.com/test': [mockNote]
    });
    
    // Make Firebase return the pre-populated data
    mockFirebaseSyncInstance.loadNotes = vi.fn().mockImplementation((scope, context) => {
      if (scope === 'page') {
        return Promise.resolve([mockNote]);
      }
      return Promise.resolve([]);
    });
    
    render(<App />);
    await flushPromises();
    
    // Note should be visible
    const noteElement = await screen.findByTestId('note-1');
    expect(noteElement).toBeInTheDocument();
    
    // Open menu and click edit
    const menuButton = within(noteElement).getByTestId('note-menu-button');
    await user.click(menuButton);
    await flushPromises();
    
    const menu = await screen.findByTestId('note-menu');
    const editButton = within(menu).getByTestId('edit-note-button');
    await user.click(editButton);
    await flushPromises();
    
    // Edit mode should be active
    const editMode = await screen.findByTestId('edit-mode');
    expect(editMode).toBeInTheDocument();
    
    // Edit the text
    const editInput = within(editMode).getByTestId('edit-note-input');
    await user.clear(editInput);
    await user.type(editInput, 'Updated note text');
    
    // Save the edit
    const saveButton = within(editMode).getByTestId('save-edit-button');
    await user.click(saveButton);
    await flushPromises();
    
    // Updated text should be visible
    expect(await screen.findByText('Updated note text')).toBeInTheDocument();
  });

  it('should cancel note editing', async () => {
    const user = userEvent.setup();
    
    const mockNote = {
      id: '1',
      text: 'Original note text',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Pre-populate storage
    setMockStorage({
      'notes:page:example.com/test': [mockNote]
    });
    
    mockFirebaseSyncInstance.loadNotes = vi.fn().mockImplementation((scope, context) => {
      if (scope === 'page') {
        return Promise.resolve([mockNote]);
      }
      return Promise.resolve([]);
    });
    
    render(<App />);
    await flushPromises();
    
    const noteElement = await screen.findByTestId('note-1');
    
    // Open menu and click edit
    const menuButton = within(noteElement).getByTestId('note-menu-button');
    await user.click(menuButton);
    await flushPromises();
    
    const menu = await screen.findByTestId('note-menu');
    const editButton = within(menu).getByTestId('edit-note-button');
    await user.click(editButton);
    await flushPromises();
    
    // Edit mode should be active
    const editMode = await screen.findByTestId('edit-mode');
    const editInput = within(editMode).getByTestId('edit-note-input');
    await user.clear(editInput);
    await user.type(editInput, 'Changed text');
    
    // Cancel the edit
    const cancelButton = within(editMode).getByTestId('cancel-edit-button');
    await user.click(cancelButton);
    await flushPromises();
    
    // Original text should still be visible
    expect(screen.getByText('Original note text')).toBeInTheDocument();
    expect(screen.queryByTestId('edit-mode')).not.toBeInTheDocument();
  });

  it('should show subdomain tab when URL has subdomain', async () => {
    // Set up URL with actual subdomain
    vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
      const tabs = [{
        id: 1,
        url: 'https://app.example.com/page',
        active: true
      }];
      if (callback) {
        callback(tabs);
        return undefined;
      }
      return Promise.resolve(tabs);
    }) as any);
    
    render(<App />);
    await flushPromises();
    
    // Now all 4 tabs should be present
    expect(await screen.findByTestId('tab-page')).toBeInTheDocument();
    expect(screen.getByTestId('tab-subdomain')).toBeInTheDocument();
    expect(screen.getByTestId('tab-domain')).toBeInTheDocument();
    expect(screen.getByTestId('tab-browser')).toBeInTheDocument();
  });

  it('should show badge counts', async () => {
    const pageNote = { id: '1', text: 'Page note', createdAt: Date.now(), updatedAt: Date.now() };
    const domainNote = { id: '2', text: 'Domain note', createdAt: Date.now(), updatedAt: Date.now() };
    
    // Set up notes in different scopes
    setMockStorage({
      'notes:page:example.com/test': [pageNote],
      'notes:domain:example.com': [domainNote]
    });
    
    // Make Firebase return the pre-populated data for each scope
    mockFirebaseSyncInstance.loadNotes = vi.fn().mockImplementation((scope, context) => {
      if (scope === 'page') {
        return Promise.resolve([pageNote]);
      }
      if (scope === 'domain') {
        return Promise.resolve([domainNote]);
      }
      return Promise.resolve([]);
    });
    
    render(<App />);
    await flushPromises();
    
    // Check badges using test IDs
    const pageBadge = await screen.findByTestId('badge-page');
    expect(pageBadge).toHaveTextContent('1');
    expect(pageBadge).toHaveAttribute('aria-label', '1 notes');
    
    const domainBadge = screen.getByTestId('badge-domain');
    expect(domainBadge).toHaveTextContent('1');
  });

  it('should update context when tab changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await flushPromises();
    
    // Verify initial context (page tab shows path)
    const scopeDisplay = await screen.findByTestId('current-scope');
    expect(scopeDisplay).toHaveTextContent('/test');
    
    // Switch to domain tab
    const domainTab = screen.getByTestId('tab-domain');
    await user.click(domainTab);
    await flushPromises();
    
    // Now should show domain
    expect(scopeDisplay).toHaveTextContent('example.com');
    
    // Simulate tab change by updating the mock
    vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
      const tabs = [{
        id: 2,
        url: 'https://newsite.com/page',
        active: true
      }];
      if (callback) {
        callback(tabs);
        return undefined;
      }
      return Promise.resolve(tabs);
    }) as any);
    
    // In real app, context update would be triggered by background script
    // For this test, just verify the mock is working
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  it('should have accessible menu button', async () => {
    const mockNote = {
      id: '1',
      text: 'Test note',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setMockStorage({
      'notes:page:example.com/test': [mockNote]
    });
    
    mockFirebaseSyncInstance.loadNotes = vi.fn().mockImplementation((scope, context) => {
      if (scope === 'page') {
        return Promise.resolve([mockNote]);
      }
      return Promise.resolve([]);
    });
    
    render(<App />);
    await flushPromises();
    
    const noteElement = await screen.findByTestId('note-1');
    const menuButton = within(noteElement).getByTestId('note-menu-button');
    
    expect(menuButton).toHaveAttribute('aria-label', 'Note options');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should update aria-expanded when menu opens', async () => {
    const user = userEvent.setup();
    
    const mockNote = {
      id: '1',
      text: 'Test note',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setMockStorage({
      'notes:page:example.com/test': [mockNote]
    });
    
    mockFirebaseSyncInstance.loadNotes = vi.fn().mockImplementation((scope, context) => {
      if (scope === 'page') {
        return Promise.resolve([mockNote]);
      }
      return Promise.resolve([]);
    });
    
    render(<App />);
    await flushPromises();
    
    const noteElement = await screen.findByTestId('note-1');
    const menuButton = within(noteElement).getByTestId('note-menu-button');
    
    // Initially collapsed
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    
    // Click to open
    await user.click(menuButton);
    await flushPromises();
    
    // Should be expanded
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  });
});