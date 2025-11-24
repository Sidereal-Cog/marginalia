import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { onAuthChange, signOut } from './authService';

type AuthMode = 'signin' | 'signup' | 'reset';

export function Options() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auth form state
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);
      setEmailVerified(user?.emailVerified || false);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    
    try {
      const { signInWithEmail } = await import('./authService');
      await signInWithEmail(email, password);
      // Auth state will update automatically via onAuthChange
    } catch (err: any) {
      const { getAuthErrorMessage } = await import('./authService');
      setError(getAuthErrorMessage(err));
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setFormLoading(true);

    try {
      const { signUpWithEmail } = await import('./authService');
      await signUpWithEmail(email, password);
      setSuccessMessage('Account created! Check your email to verify your account.');
      // Auth state will update automatically via onAuthChange
    } catch (err: any) {
      const { getAuthErrorMessage } = await import('./authService');
      setError(getAuthErrorMessage(err));
    } finally {
      setFormLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { resetPassword } = await import('./authService');
      await resetPassword(email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
      setEmail('');
    } catch (err: any) {
      const { getAuthErrorMessage } = await import('./authService');
      setError(getAuthErrorMessage(err));
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" data-testid="loading-state">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-white py-8 px-4" data-testid="authenticated-view">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-deep-navy text-white p-6">
              <h1 className="text-2xl font-semibold">Marginalia</h1>
              <p className="text-sm text-silver mt-1">Scribbles in the sidebar</p>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Account</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4" data-testid="auth-status">
                  <div className="flex items-center gap-2 text-green-800">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Signed in</span>
                  </div>
                  <p className="text-sm text-green-700 mt-2" data-testid="user-email">{userEmail}</p>
                </div>
                {!emailVerified && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4" data-testid="verification-notice">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800">Email Verification Required</p>
                        <p className="text-sm text-amber-700 mt-1">
                          We sent a verification email to <strong>{userEmail}</strong>.
                          Click the link in the email to enable sync across devices.
                        </p>
                        <p className="text-xs text-amber-600 mt-2">
                          Check your spam folder if you don't see it. You can resend the verification email from the extension.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  data-testid="signout-button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">About Marginalia</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Marginalia is a context-aware note-taking extension that organizes your notes by URL scope. 
                  Take notes that follow you as you browse, automatically organized by page, subdomain, domain, 
                  or available everywhere.
                </p>
                <p className="text-sm text-gray-600">
                  All notes sync automatically across your devices.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">How to Use</h2>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                  <li>Click the extension icon to open the side panel</li>
                  <li>Switch between tabs to view notes at different scope levels</li>
                  <li>Add notes using the input field at the top</li>
                  <li>Your notes will automatically sync across all your devices</li>
                  <li>Use the three-dot menu to edit or delete notes</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated - show auth forms
  return (
    <div className="min-h-screen bg-white py-8 px-4" data-testid="unauthenticated-view">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-deep-navy text-white p-6 text-center">
            <h1 className="text-2xl font-semibold">Marginalia</h1>
            <p className="text-sm text-silver mt-1">Scribbles in the sidebar</p>
          </div>

          <div className="p-6">
            {/* Mode switcher - only show for signin/signup */}
            {mode !== 'reset' && (
              <div className="flex gap-2 mb-6" role="tablist" data-testid="mode-switcher">
                <button
                  onClick={() => handleModeSwitch('signin')}
                  role="tab"
                  aria-selected={mode === 'signin'}
                  aria-label="Switch to sign in"
                  data-testid="signin-mode-button"
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    mode === 'signin'
                      ? 'bg-stellar-blue text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleModeSwitch('signup')}
                  role="tab"
                  aria-selected={mode === 'signup'}
                  aria-label="Switch to sign up"
                  data-testid="signup-mode-button"
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    mode === 'signup'
                      ? 'bg-stellar-blue text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Sign In Form */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4" data-testid="signin-form">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="email-input"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stellar-blue focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="password-input"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stellar-blue focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  aria-label={formLoading ? 'Signing in' : 'Sign in'}
                  data-testid="signin-submit-button"
                  className="w-full bg-stellar-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Signing in...' : 'Sign In'}
                </button>

                <button
                  type="button"
                  onClick={() => handleModeSwitch('reset')}
                  aria-label="Forgot password"
                  data-testid="forgot-password-button"
                  className="w-full text-sm text-stellar-blue hover:text-blue-700 mt-2"
                >
                  Forgot password?
                </button>
              </form>
            )}

            {/* Sign Up Form */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4" data-testid="signup-form">
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="email-input"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stellar-blue focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="password-input"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stellar-blue focus:border-transparent"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="confirm-password-input"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stellar-blue focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  aria-label={formLoading ? 'Creating account' : 'Create account'}
                  data-testid="signup-submit-button"
                  className="w-full bg-stellar-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}

            {/* Password Reset Form */}
            {mode === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-4" data-testid="reset-form">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="email-input"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stellar-blue focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  aria-label={formLoading ? 'Sending reset link' : 'Send reset link'}
                  data-testid="reset-submit-button"
                  className="w-full bg-stellar-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  aria-label="Back to sign in"
                  data-testid="back-to-signin-button"
                  className="w-full text-sm text-stellar-blue hover:text-blue-700"
                >
                  Back to sign in
                </button>
              </form>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" data-testid="error-message">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg" role="status" data-testid="success-message">
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}

            {/* Info text */}
            <p className="mt-6 text-xs text-gray-500 text-center">
              Your notes will sync across all your devices
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Only mount in browser context, not during tests
if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <Options />
      </React.StrictMode>
    );
  }
}