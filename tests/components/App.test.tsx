import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { clearMockStorage, setMockStorage } from '../setup';

// Mock Firebase for App component
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

// Helper to flush all promises
const flushPromises = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

describe('App', () => {
  beforeEach(() => {
    clearMockStorage();
    vi.clearAllMocks();
    
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
    
    // Use findBy which returns a promise
    const header = await screen.findByText('Marginalia');
    expect(header).toBeInTheDocument();
  });

  it('should render tab navigation', async () => {
    render(<App />);
    await flushPromises();

    // Look for tab buttons by role first
    const tabs = await screen.findAllByRole('button');
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    
    // Check for specific tab text
    expect(screen.getByText('Page')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Browser')).toBeInTheDocument();
  });

  it('should have a textarea for adding notes', async () => {
    render(<App />);
    await flushPromises();

    const textarea = await screen.findByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('should handle empty state', async () => {
    render(<App />);
    await flushPromises();

    const textarea = await screen.findByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('should render multiple tabs', async () => {
    render(<App />);
    await flushPromises();

    const tabs = await screen.findAllByRole('button');
    expect(tabs.length).toBeGreaterThanOrEqual(3);
  });

  it('should add a new note on Enter', async () => {
    const user = userEvent.setup();
    render(<App />);
    await flushPromises();

    const textarea = await screen.findByRole('textbox');
    
    await act(async () => {
      await user.type(textarea, 'New test note{Enter}');
    });
    
    await flushPromises();

    // Check if note appears
    const note = await screen.findByText('New test note');
    expect(note).toBeInTheDocument();
  });

  it('should not add empty notes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await flushPromises();

    const textarea = await screen.findByRole('textbox');
    
    await act(async () => {
      await user.click(textarea);
      await user.keyboard('{Enter}');
    });
    
    await flushPromises();

    // Textarea should still be empty, no notes added
    expect(textarea).toHaveValue('');
  });

  it('should switch between tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await flushPromises();

    const domainTab = screen.getByText('Domain');
    
    await act(async () => {
      await user.click(domainTab);
    });
    
    await flushPromises();

    // Domain tab should now be active (has specific styling)
    const tabButton = domainTab.closest('button');
    expect(tabButton).toHaveClass('border-indigo-600');
  });
});