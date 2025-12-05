import browser from 'webextension-polyfill';
import type { TabChangeMessage, NoteScope } from './types';
import { initializeSync, getCurrentTabContext, loadNotes } from './sidebarLogic';
import { onAuthChange } from './authService';

// Initialize Firebase sync when user is authenticated
onAuthChange(async (user) => {
  if (user) {
    // Force refresh user object to get latest email verification status
    await user.reload();

    console.log('User authenticated:', user.uid);
    initializeSync().then(() => {
      console.log('Firebase sync initialized');
      // Update badge after sync initialization
      updateBadge().catch((error) => {
        console.error('Failed to update badge:', error);
      });
    }).catch((error) => {
      console.error('Failed to initialize Firebase sync:', error);
    });
  } else {
    console.log('User signed out');
    // Clear badge on sign-out
    clearBadge();
  }
});

/**
 * Format badge text based on count
 * Shows "99+" for counts over 99, empty string for 0
 */
export function formatBadgeText(count: number): string {
  if (count === 0) {
    return '';
  }
  if (count > 99) {
    return '99+';
  }
  return count.toString();
}

/**
 * Clear the extension icon badge
 */
export function clearBadge(): void {
  browser.action.setBadgeText({ text: '' });
}

/**
 * Update badge with count of contextual notes (page + subdomain + domain)
 * Excludes browser-wide notes
 */
export async function updateBadge(): Promise<void> {
  try {
    // Get current tab context
    const context = await getCurrentTabContext();

    if (!context) {
      clearBadge();
      return;
    }

    // Load notes for contextual scopes only (exclude 'browser')
    const contextualScopes: NoteScope[] = ['page', 'subdomain', 'domain'];
    let totalCount = 0;

    for (const scope of contextualScopes) {
      const notes = await loadNotes(scope, context);
      totalCount += notes.length;
    }

    // Set badge text
    const badgeText = formatBadgeText(totalCount);
    await browser.action.setBadgeText({ text: badgeText });

    // Set badge colors (Stellar Blue background, white text) if showing count
    if (badgeText) {
      await browser.action.setBadgeBackgroundColor({ color: '#4a9eff' });
      await browser.action.setBadgeTextColor({ color: '#ffffff' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
    // Don't clear badge on error - keep previous state
  }
}

// Detect browser and sidebar API availability
const isFirefox = typeof (browser as any).sidebarAction !== 'undefined';
const hasSidePanel = typeof (browser as any).sidePanel !== 'undefined';

// Open side panel/sidebar when extension icon is clicked
browser.action.onClicked.addListener(async (tab) => {
  if (hasSidePanel && tab.windowId) {
    // Chrome: use sidePanel API
    await (browser as any).sidePanel.open({ windowId: tab.windowId });
  } else if (isFirefox) {
    // Firefox: sidebar opens automatically via manifest, but we can toggle it
    await (browser as any).sidebarAction.toggle();
  }
});

// Initialize side panel behavior (Chrome only)
browser.runtime.onInstalled.addListener(() => {
  if (hasSidePanel) {
    (browser as any).sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

// Listen for tab activation (user switches tabs)
browser.tabs.onActivated.addListener(async (activeInfo) => {
  // Send message to sidebar to update context
  const message: TabChangeMessage = {
    type: 'TAB_CHANGED',
    tabId: activeInfo.tabId
  };

  // Silently ignore if sidebar isn't open
  try {
    await browser.runtime.sendMessage(message);
  } catch (_error) {
    // Expected when sidebar isn't open - ignore
  }

  // Update badge for new tab
  await updateBadge();
});

// Listen for tab updates (URL changes, page loads)
browser.tabs.onUpdated.addListener(async (
  tabId: number,
  changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
  tab: browser.Tabs.Tab
) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    // Send message to sidebar to update context
    const message: TabChangeMessage = {
      type: 'TAB_UPDATED',
      tabId: tabId,
      url: tab.url
    };

    // Silently ignore if sidebar isn't open
    try {
      browser.runtime.sendMessage(message);
    } catch (_error) {
      // Expected when sidebar isn't open - ignore
    }

    // Update badge when URL changes or page loads
    // Only update if this is the active tab
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id === tabId) {
      await updateBadge();
    }
  }
});

// Handle messages from sidebar
browser.runtime.onMessage.addListener((
  message: unknown,
  _sender: browser.Runtime.MessageSender
): Promise<any> | undefined => {
  // Type guard for message
  if (typeof message === 'object' && message !== null && 'type' in message) {
    const msg = message as { type: string };
    if (msg.type === 'GET_CURRENT_TAB') {
      return browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => ({ tab: tabs[0] }));
    }
    if (msg.type === 'UPDATE_BADGE') {
      return updateBadge().then(() => ({}));
    }
  }
  return undefined;
});