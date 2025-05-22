chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Fires when the active tab in a window changes.
chrome.tabs.onActivated.addListener( async ( { tabId } ) => {
  let tab = await chrome.tabs.get(tabId);
  chrome.storage.sync.set( { url: tab.url } );
})

// Fired when a tab is updated.
chrome.tabs.onUpdated.addListener( async ( tabId, changeInfo, tab ) => {
  chrome.storage.sync.set( { url: tab.url } );
})
