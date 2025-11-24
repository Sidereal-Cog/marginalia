import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Globe, Network, Server, FileText, MoreVertical, Edit2, LogOut, Mail, RefreshCw } from 'lucide-react';
import type { UrlContext, NoteScope, Note } from './types';
import { getCurrentTabContext, onTabContextChange, loadNotes, saveNotes, getSyncService } from './sidebarLogic';
import { onAuthChange, signOut, resendVerificationEmail, getAuthErrorMessage } from './authService';

interface TabConfig {
  label: string;
  scope: NoteScope;
  icon: typeof Globe;
}

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);

  // App state
  const [tabValue, setTabValue] = useState<number>(0);
  const [newNote, setNewNote] = useState<string>('');
  const [context, setContext] = useState<UrlContext | null>(null);
  const [notes, setNotes] = useState<Record<NoteScope, Note[]>>({
    browser: [],
    domain: [],
    subdomain: [],
    page: []
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Email verification state
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  // Tabs in reverse order: Page first, Browser last
  // Filter out subdomain tab if there's no subdomain (domain === subdomain)
  const allTabs: TabConfig[] = [
    { label: 'Page', scope: 'page', icon: FileText },
    { label: 'Subdomain', scope: 'subdomain', icon: Server },
    { label: 'Domain', scope: 'domain', icon: Network },
    { label: 'Browser', scope: 'browser', icon: Globe }
  ];

  const tabs: TabConfig[] = context && context.domain === context.subdomain
    ? allTabs.filter(tab => tab.scope !== 'subdomain')
    : allTabs;

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setIsAuthenticated(!!user);
      setUserEmail(user?.email || null);
      setEmailVerified(user?.emailVerified || false);
      setIsAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // Update context when tab changes
  useEffect(() => {
    const updateContext = async () => {
      const newContext = await getCurrentTabContext();
      setContext(newContext);
    };

    updateContext();
    const unregister = onTabContextChange(updateContext);
    return unregister;
  }, []);

  // Load notes when context or tab changes
  useEffect(() => {
    const loadScopeNotes = async () => {
      if (!context || !isAuthenticated) return;
      
      const currentScope = tabs[tabValue].scope;
      const loadedNotes = await loadNotes(currentScope, context);
      
      setNotes(prev => ({
        ...prev,
        [currentScope]: loadedNotes
      }));
    };

    loadScopeNotes();
  }, [context, tabValue, isAuthenticated]);

  // Load badge counts for all scopes when context changes
  useEffect(() => {
    const loadAllScopeCounts = async () => {
      if (!context || !isAuthenticated) return;

      const allScopes: NoteScope[] = ['page', 'subdomain', 'domain', 'browser'];
      const allNotes: Record<NoteScope, Note[]> = { browser: [], domain: [], subdomain: [], page: [] };

      for (const scope of allScopes) {
        const scopeNotes = await loadNotes(scope, context);
        allNotes[scope] = scopeNotes;
      }

      setNotes(allNotes);
    };

    loadAllScopeCounts();
  }, [context, isAuthenticated]);

  // Subscribe to real-time updates from Firebase
  useEffect(() => {
    if (!context || !isAuthenticated) return;

    const syncService = getSyncService();
    if (!syncService) return;

    const allScopes: NoteScope[] = ['page', 'subdomain', 'domain', 'browser'];
    const unsubscribers: (() => void)[] = [];

    // Subscribe to each scope
    allScopes.forEach(scope => {
      const unsubscribe = syncService.subscribeToScope(scope, context, (updatedNotes) => {
        setNotes(prev => ({
          ...prev,
          [scope]: updatedNotes
        }));
      });
      unsubscribers.push(unsubscribe);
    });

    // Cleanup all subscriptions when context changes or component unmounts
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [context, isAuthenticated]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-resize edit textarea
  useEffect(() => {
    if (editTextareaRef.current) {
      const textarea = editTextareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [editText, editingId]);

  const getCurrentNotes = (): Note[] => {
    return notes[tabs[tabValue].scope] || [];
  };

  const getScopeValue = (): string => {
    if (!context) return tabs[tabValue].label;
    
    const scope = tabs[tabValue].scope;
    switch (scope) {
      case 'browser':
        return 'Browser';
      case 'domain':
        return context.domain;
      case 'subdomain':
        return context.subdomain;
      case 'page':
        return context.path;
      default:
        return tabs[tabValue].label;
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !context) return;

    const currentScope = tabs[tabValue].scope;
    const now = Date.now();
    const newNoteObj: Note = {
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      text: newNote.trim(),
      createdAt: now,
      updatedAt: now
    };
    
    const updatedNotes = [...getCurrentNotes(), newNoteObj];
    
    // Update local state
    setNotes(prev => ({
      ...prev,
      [currentScope]: updatedNotes
    }));

    // Save to Firebase and Chrome storage
    await saveNotes(currentScope, context, updatedNotes);
    
    // Clear input and reset textarea height
    setNewNote('');
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '38px';
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!context) return;

    const currentScope = tabs[tabValue].scope;
    const updatedNotes = getCurrentNotes().filter(note => note.id !== id);
    
    // Update local state
    setNotes(prev => ({
      ...prev,
      [currentScope]: updatedNotes
    }));

    // Save to Firebase and Chrome storage
    await saveNotes(currentScope, context, updatedNotes);
    setOpenMenuId(null);
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.text);
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!context || !editText.trim()) return;

    const currentScope = tabs[tabValue].scope;
    const updatedNotes = getCurrentNotes().map(note =>
      note.id === id
        ? { ...note, text: editText.trim(), updatedAt: Date.now() }
        : note
    );
    
    // Update local state
    setNotes(prev => ({
      ...prev,
      [currentScope]: updatedNotes
    }));

    // Save to Firebase and Chrome storage
    await saveNotes(currentScope, context, updatedNotes);
    
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const toggleMenu = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === noteId ? null : noteId);
  };

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out? You\'ll need to sign in again.')) {
      return;
    }

    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setVerificationMessage(null);

    try {
      await resendVerificationEmail();
      setVerificationMessage('Verification email sent! Check your inbox.');
      setTimeout(() => setVerificationMessage(null), 5000);
    } catch (error: any) {
      setVerificationMessage(getAuthErrorMessage(error));
      setTimeout(() => setVerificationMessage(null), 5000);
    } finally {
      setResendingVerification(false);
    }
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="w-full min-w-[280px] max-w-[600px] h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Unauthenticated state
  if (!isAuthenticated) {
    const handleOpenOptions = async () => {
      const browser = (await import('webextension-polyfill')).default;
      browser.runtime.openOptionsPage();
    };

    return (
      <div className="w-full min-w-[280px] max-w-[600px] h-screen flex flex-col bg-white">
        {/* Header */}
        <div className="bg-deep-navy text-white p-4 shadow-lg flex-shrink-0">
          <h1 className="text-xl font-semibold">Marginalia</h1>
          <p className="text-xs text-silver">Scribbles in the sidebar</p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-stellar-blue rounded-full flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Welcome to Marginalia</h2>
            
            {/* Description */}
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Context-aware note-taking that follows you as you browse.
              Sign in to start organizing your thoughts by page, domain, or keep them browser-wide.
            </p>

            {/* CTA Button */}
            <button
              onClick={handleOpenOptions}
              className="inline-flex items-center gap-2 px-6 py-3 bg-stellar-blue text-white font-medium rounded-lg shadow-lg hover:shadow-xl hover:bg-blue-600 transition-all duration-200 transform hover:scale-105"
            >
              <LogOut className="w-4 h-4 transform rotate-180" />
              Sign In or Create Account
            </button>

            {/* Helper text */}
            <p className="text-xs text-gray-500 mt-4">
              Click above to open the sign-in page
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-[280px] max-w-[600px] h-screen flex flex-col bg-white" data-testid="app-container">
      <div className="bg-deep-navy text-white p-4 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold">Marginalia</h1>
          <div className="flex items-center gap-2">
            {userEmail && (
              <span
                className="text-xs text-silver truncate max-w-[150px]"
                title={userEmail}
                data-testid="user-email"
              >
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Sign out"
              aria-label="Sign out"
              data-testid="signout-button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-silver">Scribbles in the sidebar</p>
      </div>

      {/* Email Verification Banner */}
      {!emailVerified && (
        <div className="bg-amber-50 border-b border-amber-200 p-3 flex-shrink-0">
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-800">
                <strong>Verify your email</strong> to enable sync across devices.
              </p>
              {verificationMessage && (
                <p className="text-xs text-amber-700 mt-1">
                  {verificationMessage}
                </p>
              )}
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resendingVerification}
              className="flex items-center gap-1 text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${resendingVerification ? 'animate-spin' : ''}`} />
              Resend
            </button>
          </div>
        </div>
      )}

      <div className="flex bg-white border-b border-gray-200 flex-shrink-0" role="tablist">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const noteCount = notes[tab.scope]?.length || 0;
          return (
            <button
              key={idx}
              onClick={() => setTabValue(idx)}
              role="tab"
              aria-selected={tabValue === idx}
              aria-label={`${tab.label} tab`}
              data-testid={`tab-${tab.scope}`}
              className={`flex-1 py-3 px-1 sm:px-2 text-xs sm:text-sm font-medium transition-colors flex flex-col items-center gap-1 relative ${
                tabValue === idx
                  ? 'text-stellar-blue border-b-2 border-stellar-blue bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon size={18} />
                {noteCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-stellar-blue text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    aria-label={`${noteCount} notes`}
                    data-testid={`badge-${tab.scope}`}
                  >
                    {noteCount}
                  </span>
                )}
              </div>
              <span className="truncate w-full text-center">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4" data-testid="add-note-container">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Scope:</p>
              <p 
                className="text-sm font-medium text-gray-700 truncate" 
                title={getScopeValue()}
                data-testid="current-scope"
              >
                {getScopeValue()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyPress}
              rows={1}
              aria-label="New note input"
              data-testid="new-note-input"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stellar-blue resize-none overflow-hidden"
              style={{
                minHeight: '38px',
                height: 'auto'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = '38px';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
            <button
              onClick={handleAddNote}
              aria-label="Add note"
              data-testid="add-note-button"
              className="flex-shrink-0 p-2 bg-stellar-blue text-white rounded-md hover:bg-blue-600 transition-colors self-start"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm" data-testid="notes-list">
          {getCurrentNotes().length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm" data-testid="empty-state">
              No notes yet. Add one above!
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {getCurrentNotes().map((note: Note) => (
                <li 
                  key={note.id} 
                  className="p-3 sm:p-4 flex items-start gap-3 group bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-shadow relative rounded-md my-1"
                  data-testid={`note-${note.id}`}
                >
                  {editingId === note.id ? (
                    <div className="flex-1 flex flex-col gap-2" data-testid="edit-mode">
                      <textarea
                        ref={editTextareaRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        aria-label="Edit note"
                        data-testid="edit-note-input"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stellar-blue resize-none overflow-hidden"
                        rows={1}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(note.id)}
                          aria-label="Save edit"
                          data-testid="save-edit-button"
                          className="px-3 py-1 bg-stellar-blue text-white text-sm rounded hover:bg-blue-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          aria-label="Cancel edit"
                          data-testid="cancel-edit-button"
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm text-gray-800 whitespace-pre-wrap break-words"
                          data-testid="note-text"
                        >
                          {note.text}
                        </p>
                        <p 
                          className="text-xs text-gray-400 mt-2"
                          data-testid="note-timestamp"
                        >
                          {new Date(note.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => toggleMenu(e, note.id)}
                          aria-label="Note options"
                          aria-expanded={openMenuId === note.id}
                          data-testid="note-menu-button"
                          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === note.id && (
                          <div 
                            className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]"
                            data-testid="note-menu"
                          >
                            <button
                              onClick={() => handleStartEdit(note)}
                              aria-label="Edit note"
                              data-testid="edit-note-button"
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              aria-label="Delete note"
                              data-testid="delete-note-button"
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}