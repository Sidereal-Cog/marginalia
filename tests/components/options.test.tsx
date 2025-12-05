import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

// Mock auth functions
const mockSignInWithEmail = vi.fn();
const mockSignUpWithEmail = vi.fn();
const mockResetPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthChange = vi.fn();
const mockGetAuthErrorMessage = vi.fn();

// Mock Firebase
vi.mock('../../src/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: null }
}));

// Mock authService
vi.mock('../../src/authService', () => ({
  signInWithEmail: (...args: any[]) => mockSignInWithEmail(...args),
  signUpWithEmail: (...args: any[]) => mockSignUpWithEmail(...args),
  resetPassword: (...args: any[]) => mockResetPassword(...args),
  signOut: () => mockSignOut(),
  onAuthChange: (callback: any) => mockOnAuthChange(callback),
  getAuthErrorMessage: (error: any) => mockGetAuthErrorMessage(error)
}));

// We need to import the module to get the Options component
const { Options } = await import('../../src/options');

describe('Options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: user not authenticated
    mockOnAuthChange.mockImplementation((callback) => {
      callback(null);
      return vi.fn(); // Return unsubscribe function
    });

    mockGetAuthErrorMessage.mockImplementation((error) => {
      return error.message || 'An error occurred';
    });
  });

  describe('Loading state', () => {
    it('should show loading state initially', () => {
      // Mock onAuthChange to not call callback immediately
      mockOnAuthChange.mockImplementation(() => vi.fn());

      render(<Options />);

      const loadingState = screen.getByTestId('loading-state');
      expect(loadingState).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated state', () => {
    it('should show sign in form by default', async () => {
      render(<Options />);

      expect(await screen.findByTestId('unauthenticated-view')).toBeInTheDocument();
      expect(await screen.findByText('Marginalia')).toBeInTheDocument();
      expect(screen.getByText('Scribbles in the sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('signin-form')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    it('should show mode switcher', async () => {
      render(<Options />);

      const modeSwitcher = await screen.findByTestId('mode-switcher');
      expect(modeSwitcher).toBeInTheDocument();

      const signinButton = screen.getByTestId('signin-mode-button');
      const signupButton = screen.getByTestId('signup-mode-button');

      expect(signinButton).toHaveAttribute('aria-selected', 'true');
      expect(signupButton).toHaveAttribute('aria-selected', 'false');
    });

    it('should switch to sign up mode', async () => {
      const user = userEvent.setup();
      render(<Options />);

      const signUpButton = await screen.findByTestId('signup-mode-button');

      await user.click(signUpButton);

      // Should show confirm password field in sign up mode
      expect(screen.getByTestId('signup-form')).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(signUpButton).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to password reset mode', async () => {
      const user = userEvent.setup();
      render(<Options />);

      const forgotPasswordButton = await screen.findByTestId('forgot-password-button');

      await user.click(forgotPasswordButton);

      expect(screen.getByTestId('reset-form')).toBeInTheDocument();
      expect(screen.getByTestId('back-to-signin-button')).toBeInTheDocument();
    });
  });

  describe('Sign In form', () => {
    it('should sign in with valid credentials', async () => {
      const user = userEvent.setup();
      mockSignInWithEmail.mockResolvedValue('user-123');

      render(<Options />);

      const emailInput = await screen.findByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const signInButton = screen.getByTestId('signin-submit-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should show error message on sign in failure', async () => {
      const user = userEvent.setup();
      mockSignInWithEmail.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password'
      });
      mockGetAuthErrorMessage.mockReturnValue('Incorrect password. Please try again.');

      render(<Options />);

      const emailInput = await screen.findByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const signInButton = screen.getByTestId('signin-submit-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(signInButton);

      const errorMessage = await screen.findByTestId('error-message');
      expect(errorMessage).toHaveTextContent(/incorrect password/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should disable button while signing in', async () => {
      const user = userEvent.setup();
      mockSignInWithEmail.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('user-123'), 100))
      );

      render(<Options />);

      const emailInput = await screen.findByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const signInButton = screen.getByTestId('signin-submit-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      // Button should show loading state
      expect(signInButton).toBeDisabled();
      expect(signInButton).toHaveTextContent(/signing in/i);
      expect(signInButton).toHaveAttribute('aria-label', 'Signing in');
    });

    it('should have accessible form elements', async () => {
      render(<Options />);

      const emailInput = await screen.findByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('signin-submit-button');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).toHaveAttribute('aria-label', 'Sign in');
    });
  });

  describe('Sign Up form', () => {
    it('should create account with valid details', async () => {
      const user = userEvent.setup();
      mockSignUpWithEmail.mockResolvedValue('new-user-123');

      render(<Options />);

      // Switch to sign up mode
      const signUpModeButton = await screen.findByTestId('signup-mode-button');
      await user.click(signUpModeButton);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const createAccountButton = screen.getByTestId('signup-submit-button');

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(createAccountButton);

      expect(mockSignUpWithEmail).toHaveBeenCalledWith('newuser@example.com', 'password123');
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();

      render(<Options />);

      // Switch to sign up mode
      const signUpModeButton = await screen.findByTestId('signup-mode-button');
      await user.click(signUpModeButton);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const createAccountButton = screen.getByTestId('signup-submit-button');

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(createAccountButton);

      const errorMessage = await screen.findByTestId('error-message');
      expect(errorMessage).toHaveTextContent(/passwords do not match/i);
      expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });

    it('should show error when password is too short', async () => {
      const user = userEvent.setup();

      render(<Options />);

      // Switch to sign up mode
      const signUpModeButton = await screen.findByTestId('signup-mode-button');
      await user.click(signUpModeButton);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const createAccountButton = screen.getByTestId('signup-submit-button');

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, '12345');
      await user.type(confirmPasswordInput, '12345');
      await user.click(createAccountButton);

      const errorMessage = await screen.findByTestId('error-message');
      expect(errorMessage).toHaveTextContent(/password must be at least 6 characters/i);
      expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });

    it('should show error from Firebase on sign up failure', async () => {
      const user = userEvent.setup();
      mockSignUpWithEmail.mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already in use'
      });
      mockGetAuthErrorMessage.mockReturnValue('This email is already registered. Please sign in instead.');

      render(<Options />);

      // Switch to sign up mode
      const signUpModeButton = await screen.findByTestId('signup-mode-button');
      await user.click(signUpModeButton);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const createAccountButton = screen.getByTestId('signup-submit-button');

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(createAccountButton);

      const errorMessage = await screen.findByTestId('error-message');
      expect(errorMessage).toHaveTextContent(/already registered/i);
    });

    it('should show success message after account creation', async () => {
      const user = userEvent.setup();
      mockSignUpWithEmail.mockResolvedValue('new-user-123');

      render(<Options />);

      // Switch to sign up mode
      const signUpModeButton = await screen.findByTestId('signup-mode-button');
      await user.click(signUpModeButton);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByTestId('confirm-password-input');
      const createAccountButton = screen.getByTestId('signup-submit-button');

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(createAccountButton);

      const successMessage = await screen.findByTestId('success-message');
      expect(successMessage).toHaveTextContent(/account created.*check your email/i);
    });
  });

  describe('Password Reset form', () => {
    it('should send password reset email', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue(undefined);

      render(<Options />);

      // Switch to reset mode
      const forgotPasswordButton = await screen.findByTestId('forgot-password-button');
      await user.click(forgotPasswordButton);

      const emailInput = screen.getByTestId('email-input');
      const sendResetButton = screen.getByTestId('reset-submit-button');

      await user.type(emailInput, 'reset@example.com');
      await user.click(sendResetButton);

      expect(mockResetPassword).toHaveBeenCalledWith('reset@example.com');

      const successMessage = await screen.findByTestId('success-message');
      expect(successMessage).toHaveTextContent(/password reset email sent/i);
      expect(successMessage).toHaveAttribute('role', 'status');
    });

    it('should show error on password reset failure', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found'
      });
      mockGetAuthErrorMessage.mockReturnValue('No account found with this email.');

      render(<Options />);

      // Switch to reset mode
      const forgotPasswordButton = await screen.findByTestId('forgot-password-button');
      await user.click(forgotPasswordButton);

      const emailInput = screen.getByTestId('email-input');
      const sendResetButton = screen.getByTestId('reset-submit-button');

      await user.type(emailInput, 'nonexistent@example.com');
      await user.click(sendResetButton);

      const errorMessage = await screen.findByTestId('error-message');
      expect(errorMessage).toHaveTextContent(/no account found/i);
    });

    it('should navigate back to sign in', async () => {
      const user = userEvent.setup();

      render(<Options />);

      // Switch to reset mode
      const forgotPasswordButton = await screen.findByTestId('forgot-password-button');
      await user.click(forgotPasswordButton);

      expect(screen.getByTestId('reset-form')).toBeInTheDocument();

      // Navigate back
      const backButton = screen.getByTestId('back-to-signin-button');
      await user.click(backButton);

      // Should be back at sign in form
      expect(screen.getByTestId('signin-form')).toBeInTheDocument();
      expect(screen.queryByTestId('reset-form')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated state', () => {
    beforeEach(() => {
      mockOnAuthChange.mockImplementation((callback) => {
        callback({ uid: 'user-123', email: 'test@example.com' });
        return vi.fn();
      });
    });

    it('should show account page when authenticated', async () => {
      render(<Options />);

      expect(await screen.findByTestId('authenticated-view')).toBeInTheDocument();
      expect(await screen.findByText('Signed in')).toBeInTheDocument();

      const userEmail = screen.getByTestId('user-email');
      expect(userEmail).toHaveTextContent('test@example.com');

      const signOutButton = screen.getByTestId('signout-button');
      expect(signOutButton).toBeInTheDocument();
      expect(signOutButton).toHaveAttribute('aria-label', 'Sign out');
    });

    it('should show auth status', async () => {
      render(<Options />);

      const authStatus = await screen.findByTestId('auth-status');
      expect(authStatus).toBeInTheDocument();
      expect(authStatus).toHaveTextContent('Signed in');
    });

    it('should show about section', async () => {
      render(<Options />);

      expect(await screen.findByText(/about marginalia/i)).toBeInTheDocument();
      expect(screen.getByText(/context-aware note-taking/i)).toBeInTheDocument();
    });

    it('should show how to use section', async () => {
      render(<Options />);

      expect(await screen.findByText(/how to use/i)).toBeInTheDocument();
      expect(screen.getByText(/click the extension icon/i)).toBeInTheDocument();
    });

    it('should sign out when sign out button clicked', async () => {
      const user = userEvent.setup();
      mockSignOut.mockResolvedValue(undefined);

      render(<Options />);

      const signOutButton = await screen.findByTestId('signout-button');

      await user.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should show verification notice when email not verified', async () => {
      mockOnAuthChange.mockImplementation((callback) => {
        callback({ uid: 'user-123', email: 'test@example.com', emailVerified: false });
        return vi.fn();
      });

      render(<Options />);

      const verificationNotice = await screen.findByTestId('verification-notice');
      expect(verificationNotice).toBeInTheDocument();
      expect(verificationNotice).toHaveTextContent(/email verification required/i);
      expect(verificationNotice).toHaveTextContent('test@example.com');
    });

    it('should hide verification notice when email is verified', async () => {
      mockOnAuthChange.mockImplementation((callback) => {
        callback({ uid: 'user-123', email: 'test@example.com', emailVerified: true });
        return vi.fn();
      });

      render(<Options />);

      await screen.findByTestId('authenticated-view');
      expect(screen.queryByTestId('verification-notice')).not.toBeInTheDocument();
    });
  });

  describe('Form field clearing', () => {
    it('should clear form fields when switching modes', async () => {
      const user = userEvent.setup();

      render(<Options />);

      // Type in sign in form
      const emailInput = (await screen.findByTestId('email-input')) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      expect(emailInput.value).toBe('test@example.com');

      // Switch to sign up
      const signUpButton = screen.getByTestId('signup-mode-button');
      await user.click(signUpButton);

      // Email should be cleared
      const newEmailInput = screen.getByTestId('email-input') as HTMLInputElement;
      expect(newEmailInput.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles and labels', async () => {
      render(<Options />);

      const modeSwitcher = await screen.findByTestId('mode-switcher');
      expect(modeSwitcher).toHaveAttribute('role', 'tablist');

      const signinButton = screen.getByTestId('signin-mode-button');
      expect(signinButton).toHaveAttribute('role', 'tab');
      expect(signinButton).toHaveAttribute('aria-label', 'Switch to sign in');
    });

    it('should have proper form labels', async () => {
      render(<Options />);

      const emailInput = await screen.findByTestId('email-input');
      expect(emailInput).toHaveAccessibleName(/email/i);

      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput).toHaveAccessibleName(/password/i);
    });
  });
});