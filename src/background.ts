/// <reference types="chrome"/>

import type { TabChangeMessage } from './types';
import { initializeSync } from './sidebarLogic';

// Initialize Firebase auth on extension load (non-blocking)
initializeSync().then(() => {
  console.log('Firebase sync initialized');
}).catch((error) => {
  console.error('Failed to initialize Firebase sync:', error);
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Initialize side panel behavior
chrome.runtime.onInstalled.addListener(() => {
  // Enable side panel for all sites by default
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Listen for tab activation (user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo: chrome.tabs.TabActiveInfo) => {
  // Send message to sidebar to update context
  const message: TabChangeMessage = {
    type: 'TAB_CHANGED',
    tabId: activeInfo.tabId
  };
  chrome.runtime.sendMessage(message);
});

// Listen for tab updates (URL changes, page loads)
chrome.tabs.onUpdated.addListener((
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    // Send message to sidebar to update context
    const message: TabChangeMessage = {
      type: 'TAB_UPDATED',
      tabId: tabId,
      url: tab.url
    };
    chrome.runtime.sendMessage(message);
  }
});

// Handle messages from sidebar
chrome.runtime.onMessage.addListener((
  message: { type: string },
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: { tab: chrome.tabs.Tab }) => void
) => {
  if (message.type === 'GET_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Keep channel open for async response
  }
});