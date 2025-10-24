import React, { useState, useEffect } from 'react';
import { 
  sendMagicLink, 
  completeMagicLinkSignIn, 
  isSignInLink, 
  getAuthErrorMessage 
} from './authService';

interface MagicLinkAuthProps {
  onAuthSuccess: () => void;
}

export const MagicLinkAuth: React.FC<MagicLinkAuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);

  // Check if current URL is a sign-in link on mount
  useEffect(() => {
    const checkForSignInLink = async () => {
      const url = window.location.href;
      
      if (isSignInLink(url)) {
        setIsLoading(true);
        try {
          await completeMagicLinkSignIn(url);
          onAuthSuccess();
        } catch (err: any) {
          console.error('Sign-in error:', err);
          setError(getAuthErrorMessage(err));
          
          // If email is missing, show the form so user can enter it
          if (err.message?.includes('Email not found')) {
            setError('Please enter your email again to complete sign-in');
            // Pre-populate with stored email if available
            const storedEmail = window.localStorage.getItem('emailForSignIn');
            if (storedEmail) {
              setEmail(storedEmail);
            }
          }
        } finally {
          setIsLoading(false);
        }
      }
      
      setIsCheckingLink(false);
    };

    checkForSignInLink();
  }, [onAuthSuccess]);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await sendMagicLink(email);
      setLinkSent(true);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLink = () => {
    setLinkSent(false);
    setError(null);
  };

  // Show loading while checking for sign-in link
  if (isCheckingLink) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-gray-600">Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Marginalia
          </h1>
          <p className="text-gray-600">
            Context-aware notes for the web
          </p>
        </div>

        {!linkSent ? (
          <>
            {/* Email form */}
            <form onSubmit={handleSendLink} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Sign-In Link'}
              </button>
            </form>

            {/* Info text */}
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-800">
                <strong>No password needed!</strong> We'll send you a magic link to sign in. 
                Once you sign in, you'll stay logged in on this browser.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Success message */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Check your email!
                </h2>
                <p className="text-gray-600 mb-4">
                  We sent a sign-in link to <strong>{email}</strong>
                </p>
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-medium">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-500">
                    <li>Click the link in your email</li>
                    <li>If it opens a new tab, close it and return to the extension</li>
                    <li>Click the extension icon again to complete sign-in</li>
                  </ol>
                  <p className="text-xs mt-3">The link will expire in 1 hour.</p>
                </div>
              </div>

              <button
                onClick={handleResendLink}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Send another link
              </button>
            </div>
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Footer info */}
        <p className="mt-6 text-xs text-gray-500 text-center">
          Your notes will sync across all your devices
        </p>
      </div>
    </div>
  );
};