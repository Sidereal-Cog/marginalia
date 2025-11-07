---
description: Debug browser extension issues
---

## Debugging Checklist for Marginalia

### 1. Build and Reload
```bash
npm run build
```
Then refresh extension in `chrome://extensions/` or reload in Firefox `about:debugging`

### 2. Check Service Worker Console (Chrome)
- Go to `chrome://extensions/`
- Click "service worker (inactive)" link
- Look for errors in console

### 3. Check Browser Console
- Open the extension panel/sidebar
- Right-click → Inspect
- Check console for errors

### 4. Common Issues

**"Sidebar doesn't update"**
- Check `onTabContextChange` callback in background.ts
- Add console.log to verify callback fires
- Check browser.tabs.query is working

**"Badges don't show"**
- Verify all scopes load on context change (not just current)
- Check `loadNotesForAllScopes()` in sidebarLogic.ts
- Verify badge update logic in background.ts

**"Firebase not working"**
- Check service worker console for auth errors
- Verify firebaseConfig.ts has correct project settings
- Check Firestore console for security rule errors

**"Tests failing"**
- Verify mocks set up BEFORE imports
- Check browser API mocks in tests/setup.ts
- Use `await screen.findBy...` not `getBy...`

**"TypeScript errors"**
- Check imports from types.ts
- Verify @types/chrome and @types/webextension-polyfill installed
- Use `(browser as any)` for browser-specific APIs

**"Extension doesn't work in Firefox"**
- Verify manifest-firefox.json has correct addon ID
- Check Firefox console in `about:debugging`
- Verify webextension-polyfill is being used

### 5. Firebase Debugging

Check Firestore console:
- Auth state (Firebase Console → Authentication)
- Data structure (Firebase Console → Firestore)
- Security rules (ensure user can read/write own data)

### 6. Network Issues

- Disconnect internet and verify offline mode works
- Reconnect and verify sync resumes
- Check browser.storage.local for cached data

Issue description: $ARGUMENTS