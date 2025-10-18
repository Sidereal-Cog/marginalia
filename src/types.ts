/**
 * Central type definitions for Marginalia
 */

/**
 * URL context structure parsed from browser tabs
 */
export interface UrlContext {
  url: string;
  domain: string;
  subdomain: string;
  path: string;
  fullPath: string;
}

/**
 * Note scope levels
 */
export type NoteScope = 'browser' | 'domain' | 'subdomain' | 'page';

/**
 * Message types for tab change communication
 */
export interface TabChangeMessage {
  type: 'TAB_CHANGED' | 'TAB_UPDATED';
  tabId: number;
  url?: string;
}

/**
 * Individual note structure
 */
export interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Tab configuration for the UI
 */
export interface TabConfig {
  label: string;
  scope: NoteScope;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

/**
 * Current context state
 */
export interface ContextState {
  url: string;
  domain: string;
  subdomain: string;
  path: string;
}