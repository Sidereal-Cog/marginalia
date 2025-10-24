/// <reference types="chrome"/>

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
  
  // Silently ignore if sidebar isn't open
  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    // Expected when sidebar isn't open - ignore
  }
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
    
    // Silently ignore if sidebar isn't open
    try {
      chrome.runtime.sendMessage(message);
    } catch (error) {
      // Expected when sidebar isn't open - ignore
    }
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