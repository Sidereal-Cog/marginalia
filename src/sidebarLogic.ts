/// <reference types="chrome"/>

import type { UrlContext, NoteScope, TabChangeMessage, Note } from './types';
import { FirebaseSync } from './firebaseSync';
import { getCurrentUserId } from './authService';

let syncService: FirebaseSync | null = null;

/**
 * Initialize Firebase sync service
 */
export const initializeSync = async (): Promise<void> => {
  const userId = getCurrentUserId();
  
  if (!userId) {
    console.log('No authenticated user, sync not initialized');
    return;
  }
  
  syncService = new FirebaseSync(userId);
  
  // Check if we need to migrate local notes
  const migrationStatus = await chrome.storage.local.get('_migrated_to_firebase');
  if (!migrationStatus._migrated_to_firebase) {
    console.log('Migrating local notes to Firebase...');
    await syncService.migrateLocalNotes();
    console.log('Migration complete');
  }
};

/**
 * Get the sync service instance
 */
export const getSyncService = (): FirebaseSync | null => {
  return syncService;
};

/**
 * Parse URL into scope contexts
 */
export function parseUrlContext(url: string): UrlContext | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');
    
    // Extract domain (last two parts, e.g., "example.com")
    const domain = parts.length >= 2 
      ? parts.slice(-2).join('.') 
      : hostname;
    
    return {
      url: url,
      domain: domain,
      subdomain: hostname,
      path: urlObj.pathname,
      fullPath: urlObj.pathname + urlObj.search + urlObj.hash
    };
  } catch (e) {
    return null;
  }
}

/**
 * Get current active tab's context
 */
export async function getCurrentTabContext(): Promise<UrlContext | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      if (tabs[0] && tabs[0].url) {
        resolve(parseUrlContext(tabs[0].url));
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Listen for tab changes and call callback with new context
 */
export function onTabContextChange(callback: (context: UrlContext | null) => void): () => void {
  const updateContext = async () => {
    const context = await getCurrentTabContext();
    callback(context);
  };

  // Listen for background messages about tab changes
  const messageListener = (message: TabChangeMessage) => {
    if (message.type === 'TAB_CHANGED' || message.type === 'TAB_UPDATED') {
      updateContext();
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);

  // Return cleanup function
  return () => {
    chrome.runtime.onMessage.removeListener(messageListener);
  };
}

/**
 * Storage key generator for scoped notes
 */
export function getStorageKey(scope: NoteScope, context: UrlContext): string {
  switch (scope) {
    case 'browser':
      return 'notes:browser';
    case 'domain':
      return `notes:domain:${context.domain}`;
    case 'subdomain':
      return `notes:subdomain:${context.subdomain}`;
    case 'page':
      return `notes:page:${context.subdomain}${context.path}`;
    default:
      return 'notes:browser';
  }
}

/**
 * Save notes for a specific scope (with Firebase sync)
 */
export async function saveNotes(scope: NoteScope, context: UrlContext, notes: Note[]): Promise<void> {
  if (!syncService) {
    await initializeSync();
  }
  
  // Save to Firebase if sync is available
  if (syncService) {
    try {
      await syncService.saveNotes(scope, context, notes);
    } catch (error) {
      console.error('Failed to sync to Firebase:', error);
    }
  }
  
  // Always save to local storage as backup
  const key = getStorageKey(scope, context);
  await chrome.storage.local.set({ [key]: notes });
}

/**
 * Load notes for a specific scope (with Firebase sync)
 */
export async function loadNotes(scope: NoteScope, context: UrlContext): Promise<Note[]> {
  if (!syncService) {
    await initializeSync();
  }
  
  // If sync is available, try Firebase first
  if (syncService) {
    try {
      const notes = await syncService.loadNotes(scope, context);
      
      // Update local cache
      const key = getStorageKey(scope, context);
      await chrome.storage.local.set({ [key]: notes });
      
      return notes;
    } catch (error) {
      console.error('Failed to load from Firebase, using local cache:', error);
    }
  }
  
  // Fall back to local storage
  const key = getStorageKey(scope, context);
  const result = await chrome.storage.local.get(key);
  return result[key] || [];
}
