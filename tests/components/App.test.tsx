import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { clearMockStorage } from '../setup';

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

// Mock sidebarLogic - in-memory store for notes
const mockNotesStore: Record<string, any[]> = {};

vi.mock('../../src/sidebarLogic', () => ({
  getCurrentTabContext: vi.fn(() => Promise.resolve({
    url: 'https://example.com/page',
    domain: 'example.com',
    subdomain: 'example.com', // No subdomain, so subdomain tab won't show
    path: '/page',
    fullPath: 'example.com/page'
  })),
  onTabContextChange: vi.fn((_callback) => {
    // Don't trigger context changes during tests
    return () => {};
  }),
  loadNotes: vi.fn(async (scope: string) => {
    return mockNotesStore[scope] || [];
  }),
  saveNotes: vi.fn(async (scope: string, _context: any, notes: any[]) => {
    mockNotesStore[scope] = notes;
  }),
  getSyncService: vi.fn(() => mockFirebaseSyncInstance)
}));

// Updated mock to include onAuthChange and getCurrentUserId
vi.mock('../../src/authService', () => ({
  onAuthChange: vi.fn((callback) => {
    // Simulate authenticated user
    callback({ uid: 'test-user-id', email: 'test@example.com', emailVerified: true, reload: vi.fn().mockResolvedValue(undefined) });
    return vi.fn(); // Return unsubscribe function
  }),
  getCurrentUserId: vi.fn(() => 'test-user-id'),
  signOut: vi.fn().mockResolvedValue(undefined),
  resendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  getAuthErrorMessage: vi.fn((error) => error?.message || 'An error occurred')
}));

describe( 'App', () => {
  describe('App - Auth Integration', () => {
    // Store the original auth mock to restore it after auth tests
    const defaultAuthMock = vi.fn((callback: any) => {
      callback({ uid: 'test-user-id', email: 'test@example.com', reload: vi.fn().mockResolvedValue(undefined) } as any);
      return vi.fn();
    });
    
    beforeEach(() => {
      // Clear all mocks and storage
      clearMockStorage();
      vi.clearAllMocks();
      // Clear notes store
      Object.keys(mockNotesStore).forEach(key => delete mockNotesStore[key]);
    });
    
    afterEach(async () => {
      // Restore default authenticated mock for other tests
      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(defaultAuthMock);
    });
    
    describe('Loading state', () => {
      it('should show loading indicator while auth initializes', async () => {
        // Mock onAuthChange to not call callback immediately
        const mockOnAuthChange = vi.fn((_callback) => {
          // Don't call callback - simulate waiting for auth
          return vi.fn(); // Return unsubscribe
        });

        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);

        render(<App />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // Wait for async operations to complete (prevents act warnings)
        await waitFor(() => {
          expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
      });
      
      it('should hide loading state after auth resolves', async () => {
        const mockOnAuthChange = vi.fn((callback) => {
          // Queue callback to run after initial render completes
          queueMicrotask(() => {
            callback(null);
          });
          return vi.fn();
        });

        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);

        render(<App />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();

        await waitFor(() => {
          expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Welcome to Marginalia')).toBeInTheDocument();
      });
    });
    
    describe('Unauthenticated state', () => {
      beforeEach(async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          callback(null); // No user
          return vi.fn();
        });
      });
      
      it('should show auth prompt when not authenticated', async () => {
        render(<App />);

        expect(await screen.findByText('Welcome to Marginalia')).toBeInTheDocument();
        expect(screen.getByText(/Context-aware note-taking that follows you as you browse/i)).toBeInTheDocument();
      });
      
      it('should show branded header in unauthenticated state', async () => {
        render(<App />);

        expect(await screen.findByText('Marginalia')).toBeInTheDocument();
        expect(screen.getByText('Scribbles in the sidebar')).toBeInTheDocument();
      });
      
      it('should show FileText icon badge', async () => {
        render(<App />);

        await screen.findByText('Welcome to Marginalia');

        // Check for the icon container with stellar blue background
        const iconContainer = screen.getByText('Welcome to Marginalia')
        .closest('div')
        ?.querySelector('.bg-stellar-blue');

        expect(iconContainer).toBeInTheDocument();
      });
      
      it('should show CTA button', async () => {
        render(<App />);

        const ctaButton = await screen.findByRole('button', { name: /sign in or create account/i });
        expect(ctaButton).toBeInTheDocument();
      });
      
      it('should call openOptionsPage when CTA button clicked', async () => {
        const user = userEvent.setup();

        // Mock browser.runtime.openOptionsPage
        const mockOpenOptionsPage = vi.fn().mockResolvedValue(undefined);
        const browserModule = await import('webextension-polyfill');

        // Spy on the method - assumes runtime.openOptionsPage exists in global mock
        vi.spyOn(browserModule.default.runtime, 'openOptionsPage').mockImplementation(mockOpenOptionsPage);

        render(<App />);

        const ctaButton = await screen.findByRole('button', { name: /sign in or create account/i });

        await user.click(ctaButton);

        await waitFor(() => {
          expect(mockOpenOptionsPage).toHaveBeenCalled();
        });
      });
      
      it('should show helper text below CTA button', async () => {
        render(<App />);

        expect(await screen.findByText('Click above to open the sign-in page')).toBeInTheDocument();
      });
      
      it('should not show main UI when unauthenticated', async () => {
        render(<App />);

        await screen.findByText('Welcome to Marginalia');

        expect(screen.queryByTestId('app-container')).not.toBeInTheDocument();
        expect(screen.queryByTestId('tab-browser')).not.toBeInTheDocument();
        expect(screen.queryByTestId('new-note-input')).not.toBeInTheDocument();
      });
    });
    
    describe('Authenticated state', () => {
      beforeEach(async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          callback({ uid: 'test-user', email: 'test@example.com', reload: vi.fn().mockResolvedValue(undefined) } as any);
          return vi.fn();
        });
      });
      
      it('should show main UI when authenticated', async () => {
        render(<App />);

        expect(await screen.findByTestId('app-container')).toBeInTheDocument();
        expect(screen.getByTestId('tab-browser')).toBeInTheDocument();
      });
      
      it('should display user email in header', async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          callback({ uid: 'test-user', email: 'user@example.com', reload: vi.fn().mockResolvedValue(undefined) } as any);
          return vi.fn();
        });

        render(<App />);

        const emailElement = await screen.findByTestId('user-email');
        expect(emailElement).toHaveTextContent('user@example.com');
      });
      
      it('should not show unauthenticated UI when authenticated', async () => {
        render(<App />);

        await waitFor(() => {
          expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });

        expect(screen.queryByText('Sign In or Create Account')).not.toBeInTheDocument();
        expect(screen.queryByText(/Context-aware note-taking that follows you/i)).not.toBeInTheDocument();
      });
    });
    
    describe('Auth state transitions', () => {
      it('should transition from loading to unauthenticated', async () => {
        let authCallback: ((user: any) => void) | null = null;
        
        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          authCallback = callback;
          return vi.fn();
        });
        
        render(<App />);
        
        // Should show loading initially
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        
        // Trigger auth callback with no user
        act(() => {
          authCallback!(null);
        });
        
        await waitFor(() => {
          expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });
        
        expect(screen.getByText('Welcome to Marginalia')).toBeInTheDocument();
      });
      
      it('should transition from unauthenticated to authenticated', async () => {
        let authCallback: ((user: any) => void) | null = null;

        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          authCallback = callback;
          callback(null); // Start unauthenticated
          return vi.fn();
        });

        render(<App />);

        expect(await screen.findByText('Welcome to Marginalia')).toBeInTheDocument();

        // Simulate user signing in
        act(() => {
          authCallback!({ uid: 'new-user', email: 'new@example.com', reload: vi.fn().mockResolvedValue(undefined) } as any);
        });

        await waitFor(() => {
          expect(screen.queryByText('Welcome to Marginalia')).not.toBeInTheDocument();
        });

        expect(screen.getByTestId('app-container')).toBeInTheDocument();
      });
      
      it('should transition from authenticated to unauthenticated on sign out', async () => {
        let authCallback: ((user: any) => void) | null = null;

        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          authCallback = callback;
          callback({ uid: 'test-user', email: 'test@example.com', reload: vi.fn().mockResolvedValue(undefined) } as any); // Start authenticated
          return vi.fn();
        });

        render(<App />);

        expect(await screen.findByTestId('app-container')).toBeInTheDocument();

        // Simulate sign out
        act(() => {
          authCallback!(null);
        });

        await waitFor(() => {
          expect(screen.queryByTestId('app-container')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Welcome to Marginalia')).toBeInTheDocument();
      });
    });
    
    describe('Sign out button', () => {
      beforeEach(async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          callback({ uid: 'test-user', email: 'test@example.com', reload: vi.fn().mockResolvedValue(undefined) } as any);
          return vi.fn();
        });
      });
      
      it('should call signOut when sign out button clicked with confirmation', async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.signOut).mockResolvedValue(undefined);

        // Mock window.confirm to return true
        global.confirm = vi.fn(() => true);

        const user = userEvent.setup();
        render(<App />);

        const signOutButton = await screen.findByTestId('signout-button');
        await user.click(signOutButton);

        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Are you sure you want to sign out?')
        );
        expect(authService.signOut).toHaveBeenCalled();
      });
      
      it('should not sign out if user cancels confirmation', async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.signOut).mockResolvedValue(undefined);

        // Mock window.confirm to return false
        global.confirm = vi.fn(() => false);

        const user = userEvent.setup();
        render(<App />);

        const signOutButton = await screen.findByTestId('signout-button');
        await user.click(signOutButton);

        expect(global.confirm).toHaveBeenCalled();
        expect(authService.signOut).not.toHaveBeenCalled();
      });
      
      it('should have sign out button in header', async () => {
        render(<App />);

        const signOutButton = await screen.findByTestId('signout-button');
        expect(signOutButton).toBeInTheDocument();
        expect(signOutButton).toHaveAttribute('aria-label', 'Sign out');
        expect(signOutButton).toHaveAttribute('title', 'Sign out');
      });
    });
    
    describe('Auth cleanup', () => {
      it('should unsubscribe from auth changes on unmount', async () => {
        const mockUnsubscribe = vi.fn();

        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          callback({ uid: 'test-user', email: 'test@example.com', reload: vi.fn().mockResolvedValue(undefined) } as any);
          return mockUnsubscribe;
        });

        const { unmount } = render(<App />);

        await screen.findByTestId('app-container');

        expect(mockUnsubscribe).not.toHaveBeenCalled();

        unmount();

        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });
    
    describe('Accessibility', () => {
      it('should have accessible structure in unauthenticated state', async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          callback(null);
          return vi.fn();
        });

        render(<App />);

        // Check heading structure
        const heading = await screen.findByRole('heading', { name: /welcome to marginalia/i });
        expect(heading).toBeInTheDocument();

        // Check button has accessible name
        const ctaButton = screen.getByRole('button', { name: /sign in or create account/i });
        expect(ctaButton).toBeInTheDocument();
      });
      
      it('should maintain focus management', async () => {
        const authService = await import('../../src/authService');
        vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
          callback(null);
          return vi.fn();
        });

        const user = userEvent.setup();
        render(<App />);

        const ctaButton = await screen.findByRole('button', { name: /sign in or create account/i });

        // Button should be focusable
        await user.tab();
        expect(ctaButton).toHaveFocus();
      });
    });
  });

  describe('Email Verification Banner', () => {
    beforeEach(() => {
      clearMockStorage();
      vi.clearAllMocks();
      Object.keys(mockNotesStore).forEach(key => delete mockNotesStore[key]);
    });

    it('should show banner when authenticated but not verified', async () => {
      const mockOnAuthChange = vi.fn((callback) => {
        callback({ uid: 'test-user-id', email: 'test@example.com', emailVerified: false, reload: vi.fn().mockResolvedValue(undefined) });
        return vi.fn();
      });

      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);

      render(<App />);

      expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();
    });

    it('should hide banner when email is verified', async () => {
      const mockOnAuthChange = vi.fn((callback) => {
        callback({ uid: 'test-user-id', email: 'test@example.com', emailVerified: true, reload: vi.fn().mockResolvedValue(undefined) });
        return vi.fn();
      });

      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);

      render(<App />);

      await screen.findByTestId('app-container');

      expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
    });

    it('should hide banner when not authenticated', async () => {
      const mockOnAuthChange = vi.fn((callback) => {
        callback(null);
        return vi.fn();
      });

      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);

      render(<App />);

      await screen.findByText('Welcome to Marginalia');

      expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
    });

    it('should call resendVerificationEmail when resend button clicked', async () => {
      const user = userEvent.setup();
      const mockResendVerificationEmail = vi.fn().mockResolvedValue(undefined);

      const mockOnAuthChange = vi.fn((callback) => {
        callback({ uid: 'test-user-id', email: 'test@example.com', emailVerified: false, reload: vi.fn().mockResolvedValue(undefined) });
        return vi.fn();
      });

      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);
      vi.mocked(authService.resendVerificationEmail).mockImplementation(mockResendVerificationEmail);

      render(<App />);

      const resendButton = await screen.findByRole('button', { name: /resend/i });
      await user.click(resendButton);

      expect(mockResendVerificationEmail).toHaveBeenCalled();
    });

    it('should show success message after resending verification', async () => {
      const user = userEvent.setup();
      const mockResendVerificationEmail = vi.fn().mockResolvedValue(undefined);

      const mockOnAuthChange = vi.fn((callback) => {
        callback({ uid: 'test-user-id', email: 'test@example.com', emailVerified: false, reload: vi.fn().mockResolvedValue(undefined) });
        return vi.fn();
      });

      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);
      vi.mocked(authService.resendVerificationEmail).mockImplementation(mockResendVerificationEmail);

      render(<App />);

      const resendButton = await screen.findByRole('button', { name: /resend/i });
      await user.click(resendButton);

      expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
    });

    it('should show error message if resend fails', async () => {
      const user = userEvent.setup();
      const mockResendVerificationEmail = vi.fn().mockRejectedValue({
        code: 'auth/too-many-requests',
        message: 'Too many requests'
      });

      const mockOnAuthChange = vi.fn((callback) => {
        callback({ uid: 'test-user-id', email: 'test@example.com', emailVerified: false, reload: vi.fn().mockResolvedValue(undefined) });
        return vi.fn();
      });

      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);
      vi.mocked(authService.resendVerificationEmail).mockImplementation(mockResendVerificationEmail);
      vi.mocked(authService.getAuthErrorMessage).mockReturnValue('Too many failed attempts. Please try again later.');

      render(<App />);

      const resendButton = await screen.findByRole('button', { name: /resend/i });
      await user.click(resendButton);

      expect(await screen.findByText(/too many failed attempts/i)).toBeInTheDocument();
    });

    it('should disable resend button while sending', async () => {
      const user = userEvent.setup();
      let resolveResend: () => void;
      const mockResendVerificationEmail = vi.fn(() => {
        return new Promise<void>((resolve) => {
          resolveResend = resolve;
        });
      });

      const mockOnAuthChange = vi.fn((callback) => {
        callback({ uid: 'test-user-id', email: 'test@example.com', emailVerified: false, reload: vi.fn().mockResolvedValue(undefined) });
        return vi.fn();
      });

      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);
      vi.mocked(authService.resendVerificationEmail).mockImplementation(mockResendVerificationEmail);

      render(<App />);

      const resendButton = await screen.findByRole('button', { name: /resend/i });
      await user.click(resendButton);

      await waitFor(() => {
        expect(resendButton).toBeDisabled();
      });

      act(() => {
        resolveResend!();
      });

      await waitFor(() => {
        expect(resendButton).not.toBeDisabled();
      });
    });
  });

  describe('App - Main Functionality', () => {
    beforeEach(async () => {
      clearMockStorage();
      vi.clearAllMocks();
      Object.keys(mockNotesStore).forEach(key => delete mockNotesStore[key]);

      // Reset Firebase mock instance to default behavior
      if (mockFirebaseSyncInstance) {
        Object.assign(mockFirebaseSyncInstance, createMockFirebaseSync());
      }

      // Restore authenticated user mock
      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
        callback({
          uid: 'test-user-id',
          email: 'test@example.com',
          emailVerified: true,
          reload: vi.fn().mockResolvedValue(undefined)
        } as any);
        return vi.fn();
      });
    });
    
    it('should render the app with header', async () => {
      render(<App />);

      expect(await screen.findByText('Marginalia')).toBeInTheDocument();
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });

    it('should display user email', async () => {
      render(<App />);

      const userEmail = await screen.findByTestId('user-email');
      expect(userEmail).toHaveTextContent('test@example.com');
    });

    it('should have a sign out button', async () => {
      render(<App />);

      const signOutButton = await screen.findByTestId('signout-button');
      expect(signOutButton).toBeInTheDocument();
      expect(signOutButton).toHaveAttribute('aria-label', 'Sign out');
    });

    it('should render tab navigation', async () => {
      render(<App />);

      // For example.com (no subdomain), only 3 tabs should appear: Page, Domain, Browser
      expect(await screen.findByTestId('tab-page')).toBeInTheDocument();
      expect(screen.getByTestId('tab-domain')).toBeInTheDocument();
      expect(screen.getByTestId('tab-browser')).toBeInTheDocument();

      // Subdomain tab should NOT be present when domain === subdomain
      expect(screen.queryByTestId('tab-subdomain')).not.toBeInTheDocument();
    });

    it('should have accessible tab roles', async () => {
      render(<App />);

      const pageTab = await screen.findByTestId('tab-page');
      expect(pageTab).toHaveAttribute('role', 'tab');
      expect(pageTab).toHaveAttribute('aria-label', 'Page tab');
      expect(pageTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should have a textarea for adding notes', async () => {
      render(<App />);

      const textarea = await screen.findByTestId('new-note-input');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('aria-label', 'New note input');
    });

    it('should have an add note button', async () => {
      render(<App />);

      const addButton = await screen.findByTestId('add-note-button');
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveAttribute('aria-label', 'Add note');
    });

    it('should handle empty state', async () => {
      render(<App />);

      const emptyState = await screen.findByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent('No notes yet. Add one above!');
    });

    it('should display current context', async () => {
      render(<App />);

      // Page tab is selected by default, so should show the path
      const scopeDisplay = await screen.findByTestId('current-scope');
      expect(scopeDisplay).toHaveTextContent('/page');
    });
    
    it('should allow switching between tabs', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Click on Domain tab
      const domainTab = await screen.findByTestId('tab-domain');
      await user.click(domainTab);

      await waitFor(() => {
        expect(domainTab).toHaveAttribute('aria-selected', 'true');
        expect(domainTab).toHaveClass('border-stellar-blue');
      });
    });

    it('should create a new note when text is entered', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = await screen.findByTestId('new-note-input');
      await user.type(textarea, 'Test note');

      const addButton = screen.getByTestId('add-note-button');
      await user.click(addButton);

      // Note should appear in the list
      expect(await screen.findByText('Test note')).toBeInTheDocument();
    });

    it('should clear textarea after creating note', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = await screen.findByTestId('new-note-input') as HTMLTextAreaElement;
      await user.type(textarea, 'Test note');

      const addButton = screen.getByTestId('add-note-button');
      await user.click(addButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
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
      // Pre-populate the notes store
      mockNotesStore['page'] = [mockNote];

      render(<App />);

      // Note should be visible
      const noteElement = await screen.findByTestId('note-1');
      expect(noteElement).toBeInTheDocument();

      // Find and click the menu button
      const menuButton = within(noteElement).getByTestId('note-menu-button');
      await user.click(menuButton);

      // Menu should be open
      const menu = await screen.findByTestId('note-menu');
      expect(menu).toBeInTheDocument();

      // Click delete
      const deleteButton = within(menu).getByTestId('delete-note-button');
      await user.click(deleteButton);

      // Note should be gone
      await waitFor(() => {
        expect(screen.queryByTestId('note-1')).not.toBeInTheDocument();
      });
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
      // Pre-populate the notes store
      mockNotesStore['page'] = [mockNote];

      render(<App />);

      // Note should be visible
      const noteElement = await screen.findByTestId('note-1');
      expect(noteElement).toBeInTheDocument();

      // Open menu and click edit
      const menuButton = within(noteElement).getByTestId('note-menu-button');
      await user.click(menuButton);

      const menu = await screen.findByTestId('note-menu');
      const editButton = within(menu).getByTestId('edit-note-button');
      await user.click(editButton);

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

      // Pre-populate the notes store
      mockNotesStore['page'] = [mockNote];

      render(<App />);

      const noteElement = await screen.findByTestId('note-1');

      // Open menu and click edit
      const menuButton = within(noteElement).getByTestId('note-menu-button');
      await user.click(menuButton);

      const menu = await screen.findByTestId('note-menu');
      const editButton = within(menu).getByTestId('edit-note-button');
      await user.click(editButton);

      // Edit mode should be active
      const editMode = await screen.findByTestId('edit-mode');
      const editInput = within(editMode).getByTestId('edit-note-input');
      await user.clear(editInput);
      await user.type(editInput, 'Changed text');

      // Cancel the edit
      const cancelButton = within(editMode).getByTestId('cancel-edit-button');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByTestId('edit-mode')).not.toBeInTheDocument();
      });

      // Original text should still be visible
      expect(screen.getByText('Original note text')).toBeInTheDocument();
    });
    
    it('should show subdomain tab when URL has subdomain', async () => {
      // Need to dynamically import browser to mock it
      const browserModule = await import('webextension-polyfill');

      // Mock both chrome and browser APIs
      const tabs = [{
        id: 1,
        url: 'https://app.example.com/page',
        active: true
      }];

      // Mock chrome.tabs.query (callback pattern)
      vi.spyOn(chrome.tabs, 'query').mockImplementation(((queryInfo: any, callback?: any) => {
        if (callback) {
          callback(tabs);
          return undefined;
        }
        return Promise.resolve(tabs);
      }) as any);

      // Mock browser.tabs.query (promise pattern)
      vi.spyOn(browserModule.default.tabs, 'query').mockResolvedValue(tabs as any);

      // Mock getCurrentTabContext to return context with subdomain
      const sidebarLogic = await import('../../src/sidebarLogic');
      vi.mocked(sidebarLogic.getCurrentTabContext).mockResolvedValue({
        url: 'https://app.example.com/page',
        domain: 'example.com',
        subdomain: 'app.example.com', // Has subdomain, so subdomain tab should show
        path: '/page',
        fullPath: 'app.example.com/page'
      });

      render(<App />);

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
      // Pre-populate the notes store
      mockNotesStore['page'] = [pageNote];
      mockNotesStore['domain'] = [domainNote];

      render(<App />);

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

      // Verify initial context (page tab shows path)
      await screen.findByTestId('current-scope');
      expect(screen.getByTestId('current-scope')).toHaveTextContent('/page');

      // Switch to domain tab
      const domainTab = screen.getByTestId('tab-domain');
      await user.click(domainTab);

      // Now should show domain - query fresh element
      expect(await screen.findByText('example.com')).toBeInTheDocument();
    });
    
    it('should have accessible menu button', async () => {
      const mockNote = {
        id: '1',
        text: 'Test note',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Pre-populate the notes store
      mockNotesStore['page'] = [mockNote];

      render(<App />);

      const noteElement = await screen.findByTestId('note-1');
      const menuButton = within(noteElement).getByTestId('note-menu-button');

      expect(menuButton).toHaveAttribute('aria-label', 'Note options');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      // Wait for all background async operations to complete (prevents act warnings)
      // This test triggers loadNotes() for all 4 scopes, so we need extra time
      await waitFor(() => {
        expect(menuButton).toHaveAttribute('aria-label', 'Note options');
      }, { interval: 100, timeout: 500 });
    });

    it('should update aria-expanded when menu opens', async () => {
      const user = userEvent.setup();

      const mockNote = {
        id: '1',
        text: 'Test note',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Pre-populate the notes store
      mockNotesStore['page'] = [mockNote];

      render(<App />);

      const noteElement = await screen.findByTestId('note-1');
      const menuButton = within(noteElement).getByTestId('note-menu-button');

      // Initially collapsed
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');

      // Click to open
      await user.click(menuButton);

      // Should be expanded
      await waitFor(() => {
        expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Badge update messages', () => {
    beforeEach(async () => {
      clearMockStorage();
      vi.clearAllMocks();
      Object.keys(mockNotesStore).forEach(key => delete mockNotesStore[key]);

      // Reset Firebase mock
      if (mockFirebaseSyncInstance) {
        Object.assign(mockFirebaseSyncInstance, createMockFirebaseSync());
      }

      // Set up authenticated user
      const authService = await import('../../src/authService');
      vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
        callback({
          uid: 'test-user',
          email: 'test@example.com',
          emailVerified: true,
          reload: vi.fn().mockResolvedValue(undefined)
        } as any);
        return vi.fn();
      });
    });

    it('should send UPDATE_BADGE message after adding note', async () => {
      const user = userEvent.setup();
      const mockSendMessage = vi.fn().mockResolvedValue({});

      const browserModule = await import('webextension-polyfill');
      vi.spyOn(browserModule.default.runtime, 'sendMessage').mockImplementation(mockSendMessage);

      render(<App />);

      const textarea = await screen.findByTestId('new-note-input');
      const addButton = screen.getByTestId('add-note-button');

      await user.type(textarea, 'Test note');
      await user.click(addButton);

      // Should have sent UPDATE_BADGE message
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({ type: 'UPDATE_BADGE' });
      });
    });

    it('should send UPDATE_BADGE message after deleting note', async () => {
      const user = userEvent.setup();
      const mockSendMessage = vi.fn().mockResolvedValue({});

      const browserModule = await import('webextension-polyfill');
      vi.spyOn(browserModule.default.runtime, 'sendMessage').mockImplementation(mockSendMessage);

      const mockNote = {
        id: '1',
        text: 'Note to delete',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Pre-populate the notes store
      mockNotesStore['page'] = [mockNote];

      render(<App />);

      const noteElement = await screen.findByTestId('note-1');
      const menuButton = within(noteElement).getByTestId('note-menu-button');
      await user.click(menuButton);

      const menu = await screen.findByTestId('note-menu');
      const deleteButton = within(menu).getByTestId('delete-note-button');

      vi.clearAllMocks(); // Clear previous sendMessage calls

      await user.click(deleteButton);

      // Should have sent UPDATE_BADGE message
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({ type: 'UPDATE_BADGE' });
      });
    });

    it('should not fail if background script unavailable when updating badge', async () => {
      const user = userEvent.setup();
      const mockSendMessage = vi.fn().mockRejectedValue(new Error('Background script not available'));

      const browserModule = await import('webextension-polyfill');
      vi.spyOn(browserModule.default.runtime, 'sendMessage').mockImplementation(mockSendMessage);

      render(<App />);

      const textarea = await screen.findByTestId('new-note-input');
      const addButton = screen.getByTestId('add-note-button');

      await user.type(textarea, 'Test note');
      await user.click(addButton);

      // Note should still be added even if sendMessage fails
      expect(await screen.findByText('Test note')).toBeInTheDocument();
    });
  });
});