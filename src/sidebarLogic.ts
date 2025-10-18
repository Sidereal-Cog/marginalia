/// <reference types="chrome"/>

// Utility functions for Chrome API integration in your React app

import type { UrlContext, NoteScope, TabChangeMessage } from './types';

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
      path: urlObj.pathname + urlObj.search,
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
export function onTabContextChange(callback: (context: UrlContext) => void): () => void {
  const updateContext = async () => {
    const context = await getCurrentTabContext();
    if (context) {
      callback(context);
    }
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
 * Save notes for a specific scope
 */
export async function saveNotes(scope: NoteScope, context: UrlContext, notes: string[]): Promise<void> {
  const key = getStorageKey(scope, context);
  await chrome.storage.local.set({ [key]: notes });
}

/**
 * Load notes for a specific scope
 */
export async function loadNotes(scope: NoteScope, context: UrlContext): Promise<string[]> {
  const key = getStorageKey(scope, context);
  const result = await chrome.storage.local.get(key);
  return result[key] || [];
}

/**
 * Example React hook usage:
 * 
 * import { useState, useEffect } from 'react';
 * import { getCurrentTabContext, onTabContextChange } from './sidebarLogic';
 * import type { UrlContext } from './types';
 * 
 * function useBrowserContext() {
 *   const [context, setContext] = useState<UrlContext | null>(null);
 * 
 *   useEffect(() => {
 *     // Get initial context
 *     getCurrentTabContext().then(setContext);
 *     
 *     // Listen for changes
 *     const cleanup = onTabContextChange((newContext) => setContext(newContext));
 *     
 *     return cleanup;
 *   }, []);
 * 
 *   return context;
 * }
 */