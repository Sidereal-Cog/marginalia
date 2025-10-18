import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Globe, Network, Server, FileText, MoreVertical, Edit2 } from 'lucide-react';
import type { UrlContext, NoteScope, Note } from './types';
import { getCurrentTabContext, onTabContextChange, loadNotes, saveNotes, getSyncService } from './sidebarLogic';

interface TabConfig {
  label: string;
  scope: NoteScope;
  icon: typeof Globe;
}

export default function App() {
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

  // Load initial context and set up listener
  useEffect(() => {
    getCurrentTabContext().then(setContext);
    
    const cleanup = onTabContextChange(setContext);
    
    return cleanup;
  }, []);

  // Load notes when context changes
  useEffect(() => {
    if (!context) return;

    // Load notes for all scopes to populate badges
    const loadAllNotes = async () => {
      const allScopes: NoteScope[] = ['page', 'subdomain', 'domain', 'browser'];
      const loadedNotes: Record<NoteScope, Note[]> = {
        browser: [],
        domain: [],
        subdomain: [],
        page: []
      };

      for (const scope of allScopes) {
        loadedNotes[scope] = await loadNotes(scope, context);
      }

      setNotes(loadedNotes);
    };

    loadAllNotes();
  }, [context]);

  // Subscribe to Firebase real-time updates for all scopes
  useEffect(() => {
    if (!context) return;

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
  }, [context]);

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

  return (
    <div className="w-full min-w-[280px] max-w-[600px] h-screen flex flex-col bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg flex-shrink-0">
        <h1 className="text-xl font-semibold">Marginalia</h1>
        <p className="text-xs text-indigo-100 mt-1">Scribbles in the sidebar</p>
      </div>
      
      <div className="flex bg-white border-b border-gray-200 flex-shrink-0">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const noteCount = notes[tab.scope]?.length || 0;
          return (
            <button
              key={idx}
              onClick={() => setTabValue(idx)}
              className={`flex-1 py-3 px-1 sm:px-2 text-xs sm:text-sm font-medium transition-colors flex flex-col items-center gap-1 relative ${
                tabValue === idx
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <Icon size={18} />
                {noteCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
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
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-1">Scope:</p>
              <p className="text-sm font-medium text-gray-700 truncate" title={getScopeValue()}>
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
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden"
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
              className="flex-shrink-0 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors self-start"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          {getCurrentNotes().length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No notes yet. Add one above!
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {getCurrentNotes().map((note: Note) => (
                <li 
                  key={note.id} 
                  className="p-3 sm:p-4 flex items-start gap-3 group bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] transition-shadow relative rounded-md my-1"
                >
                  {editingId === note.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        ref={editTextareaRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden"
                        rows={1}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(note.id)}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                          {note.text}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(note.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => toggleMenu(e, note.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === note.id && (
                          <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                            <button
                              onClick={() => handleStartEdit(note)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
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