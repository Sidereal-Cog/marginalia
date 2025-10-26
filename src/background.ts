import browser from 'webextension-polyfill';
import type { TabChangeMessage } from './types';
import { initializeSync } from './sidebarLogic';
import { onAuthChange } from './authService';

// Initialize Firebase sync when user is authenticated
onAuthChange((user) => {
  if (user) {
    console.log('User authenticated:', user.uid);
    initializeSync().then(() => {
      console.log('Firebase sync initialized');
    }).catch((error) => {
      console.error('Failed to initialize Firebase sync:', error);
    });
  } else {
    console.log('User signed out');
  }
});

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
  } catch (error) {
    // Expected when sidebar isn't open - ignore
  }
});

// Listen for tab updates (URL changes, page loads)
browser.tabs.onUpdated.addListener((
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
    } catch (error) {
      // Expected when sidebar isn't open - ignore
    }
  }
});

// Handle messages from sidebar
browser.runtime.onMessage.addListener((
  message: unknown,
  _sender: browser.Runtime.MessageSender
): Promise<{ tab: browser.Tabs.Tab }> | undefined => {
  // Type guard for message
  if (typeof message === 'object' && message !== null && 'type' in message) {
    const msg = message as { type: string };
    if (msg.type === 'GET_CURRENT_TAB') {
      return browser.tabs.query({ active: true, currentWindow: true })
        .then(tabs => ({ tab: tabs[0] }));
    }
  }
  return undefined;
});