# Marginalia Development Guide

Marginalia is a proprietary Chrome/Brave/Firefox extension for context-aware note-taking with Firebase sync.

## Project Overview

**What it does**: Context-aware notes organized by URL scope (browser-wide, domain, subdomain, page-specific) with real-time Firebase sync across devices.

**Tech Stack**: React 19 + TypeScript 5.7 + Tailwind + Vite + Firebase + webextension-polyfill

**Architecture**: Single codebase, dual manifests, separate builds for Chrome and Firefox

## Code Standards

### TypeScript & React
- **Strict mode** - No `any` types, full type safety
- **Functional components only** - Hooks exclusively (useState, useEffect, useCallback, useMemo, useRef)
- **Tailwind utilities only** - No custom CSS except dynamic height calculations
- **Separation of concerns**:
  - `App.tsx` - UI components and state
  - `background.ts` - Tab listeners, browser detection, and toolbar badge updates
  - `sidebarLogic.ts` - Browser API utilities
  - `firebaseSync.ts` - Firestore operations
  - `authService.ts` - Authentication logic

### Browser APIs
- **Always use webextension-polyfill**: `import browser from 'webextension-polyfill'`
- **Never use `chrome.*` directly** in new code
- **Type assertions for browser-specific APIs**: `(browser as any).sidePanel` or `(browser as any).sidebarAction`
- **Keep browser API calls out of React components** - use sidebarLogic.ts

### Browser Detection
```typescript
const hasSidePanel = typeof (browser as any).sidePanel !== 'undefined';
const isFirefox = typeof (browser as any).sidebarAction !== 'undefined';
```

### Message Listener Pattern
```typescript
browser.runtime.onMessage.addListener((message: unknown) => {
  if (typeof message === 'object' && message !== null && 'type' in message) {
    const msg = message as YourMessageType;
    // Now type-safe
  }
});
```

## Marginalia-Specific Patterns

### Note Structure
Always use: `{ id: string, text: string, createdAt: number, updatedAt: number }`

### Auto-scaling Textareas
```typescript
const textareaRef = useRef<HTMLTextAreaElement>(null);

useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }
}, [value]);
```

### Firebase Patterns
- **Write**: `await syncService.saveNotes()` → update local cache
- **Read**: Try Firebase first, fall back to local cache on error
- **Path escaping**: Replace `/` with `~` in Firestore document paths
- **Subscriptions**: Subscribe to Firestore changes for all scopes in App.tsx
- **Offline handling**: Always wrap Firebase calls in try/catch with local cache fallback
- **Email verification**: Users must verify email before accessing notes (enforced in Firestore rules)
- **Rate limiting**: Client-side throttling prevents writes faster than 1 req/sec per context
- **Data validation**: Max 100 notes per context, max 50KB per note (enforced client and server-side)
- **Security rules deployment**: Run `npm run firebase:deploy` to deploy firestore.rules
- **Timestamps**: Always use `serverTimestamp()` for document `updatedAt` field (Firestore timestamp, not number)
- **Timestamp validation**: Security rules check `updatedAt is timestamp` for all writes

### Authentication Flow
- **authService.ts** - All Firebase auth operations (sign up, sign in, password reset, sign out)
  - `signUpWithEmail()` - Creates account and sends verification email
  - `signInWithEmail()` - Signs in and forces JWT token refresh to get latest email verification status
  - `isEmailVerified()` - Checks if current user's email is verified
  - `resendVerificationEmail()` - Resends verification email
  - `refreshUserToken()` - Forces refresh of user object and JWT token, returns updated verification status
- **options.tsx** - Auth UI with three modes: signin, signup, reset
  - Shows success message after signup with verification instructions
  - Shows amber verification notice when email not verified
- **App.tsx** - Shows loading → unauthenticated UI → main UI based on auth state
  - Tracks `emailVerified` state from auth listener
  - Auth listener calls `user.reload()` to get fresh verification status
  - Shows amber verification banner with "Resend" and "Check Status" buttons when not verified
  - "Check Status" button forces token refresh and updates UI immediately
- **background.ts** - Service worker auth listener
  - Calls `user.reload()` on auth state changes to refresh email verification status
- **Auth state** - Both App and Options subscribe to `onAuthChange` listener
- **Auth tokens** - JWT tokens refreshed on sign-in and when "Check Status" clicked
- **JWT token claims** - Include `email_verified` claim checked by Firestore security rules
- **Token refresh timing** - Sign-in, auth state changes, and manual refresh via "Check Status" button
- **User data** - Isolated under `/users/{userId}` in Firestore
- **Email verification** - Required for Firestore access, enforced by security rules

### Badge System
Marginalia has two types of badges:

1. **Sidebar UI Badges** (in App.tsx):
   - Small circular indicators on each tab showing note counts
   - Displays count for all scopes: page, subdomain, domain, and browser
   - Updates when notes change or context changes
   - Load ALL scopes when context changes to populate counts correctly

2. **Toolbar Icon Badge** (in background.ts):
   - Badge on browser extension icon showing contextual note count
   - Only counts page + subdomain + domain notes (excludes browser-wide)
   - Shows "99+" for counts over 99
   - Clears when count is zero
   - Color: Stellar Blue (#4a9eff) background, white text
   - Updates automatically on:
     - Tab activation (switching tabs)
     - Tab updates (URL changes, page loads)
     - User sign-in (after Firebase sync initialized)
     - Note additions (App sends `UPDATE_BADGE` message to background)
     - Note deletions (App sends `UPDATE_BADGE` message to background)
   - Clears on user sign-out
   - Message passing: App.tsx sends `{ type: 'UPDATE_BADGE' }` to background.ts after note operations

### Cleanup Pattern
Always return cleanup from useEffects that add listeners:
```typescript
useEffect(() => {
  const unsubscribe = onAuthChange(handleAuthChange);
  return () => unsubscribe();
}, []);
```

## Testing

### Setup
- `tests/unit/` - Utility and service tests
- `tests/components/` - React component tests
- `tests/setup.ts` - Global test config (browser API mocks only)
- **No global Firebase mocks** - Each test file manages its own

### Pattern
```typescript
// 1. Mock BEFORE imports
vi.mock('../../src/firebaseConfig', () => ({
  db: {}, auth: { currentUser: null }
}));

// 2. Import AFTER mocks
const { myFunction } = await import('../../src/myModule');

// 3. Use promise-based assertions
const element = await screen.findByText('Expected');
expect(element).toBeInTheDocument();
```

### Common Gotchas
- Use `findBy` queries, not `getBy` + `waitFor`
- Don't wrap `user.click()` in `act()` - it's handled internally
- Use `vi.spyOn()` for browser module properties (read-only)
- Restore auth mocks in `afterEach` for auth integration tests
- Clear all state layers in `beforeEach` (storage, mocks, test state, instances)

See [docs/TESTING.md](../docs/TESTING.md) for comprehensive testing patterns, anti-patterns, and detailed examples.

## Build & Test Workflow

```bash
# Development
npm run dev                  # Chrome watch mode (fastest)
npm run dev:firefox          # Firefox watch mode

# Build
npm run build                # Both browsers
npm run build:chrome         # Chrome only
npm run build:firefox        # Firefox only

# Test
npm test                     # Watch mode
npm run test:run             # CI mode
npm run test:coverage        # Coverage report
npm run test:ui              # Interactive UI

# Firebase
npm run firebase:deploy      # Deploy security rules
npm run firebase:deploy:all  # Deploy all Firebase config

# Package
npm run package              # Build + create release zips
```

### Testing Checklist
1. Build and refresh extension
2. Check service worker console (Chrome) or background console (Firefox)
3. Test toolbar badge updates correctly (contextual notes only)
4. Test sidebar UI badges update correctly (all scopes)
5. Test context switching between tabs (badge updates)
6. Test offline mode (disconnect internet)
7. Test sync across devices
8. Run test suite
9. Test auth flow (sign up, sign in, sign out, password reset, badge clears on sign-out)
10. Test email verification flow:
    - Sign up with new account
    - Verify email in separate tab
    - Click "Check Status" button
    - Verify banner disappears and notes work
11. Test Firestore timestamp handling:
    - Create new note
    - Check Firestore Console that `updatedAt` is a timestamp (not number)
    - Verify rate limiting works correctly
12. Test in both Chrome and Firefox

## Design System

All design follows **BRAND_GUIDELINES.md** - Sidereal Cog brand identity.

- **Colors** (from BRAND_GUIDELINES.md):
  - **Primary**: Deep Navy (#1a1f3a) - Headers, primary UI elements
  - **Accent**: Stellar Blue (#4a9eff) - Links, highlights, interactive elements, toolbar badge
  - **Secondary**: Silver (#c0c8d8) - Secondary text, borders, subtle accents
  - **Background**: White (#ffffff) primary, Dark Void (#0a0e1a) for dark mode
- **Spacing**: Multiples of 4px (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px)
- **Border Radius**: Small (6px), Medium (8px), Large (12px), Circular (50%)
- **Shadows**: Subtle shadows using Deep Navy with opacity
- **Typography**: System fonts (Inter, Space Grotesk, Outfit preferred)
- **Responsive**: 280px-600px width range

## Common Issues

| Problem | Solution |
|---------|----------|
| Sidebar doesn't update | Check onTabContextChange callback, add console logs |
| Sidebar badges don't show | Load all scopes on context change, not just current tab |
| Toolbar badge doesn't update | Check background.ts updateBadge(), verify badge update on tab events |
| Textarea height wrong | Use ref + useEffect pattern, not inline handlers |
| TypeScript errors | Import types from types.ts, check Browser types available |
| Firebase not working | Check service worker console, verify config |
| Notes not syncing | Check Firebase console for auth and data structure |
| Path errors in Firestore | Escape paths with `~` instead of `/` |
| Tests failing | Check mocks before imports, verify browser.* pattern |
| Auth not persisting | Firebase auto-refreshes tokens, check for sign-out calls |
| Extension broken in Firefox | Verify manifest-firefox.json, check addon ID |
| Email not verified error | Check verification banner, click "Resend" or "Check Status" button |
| Rate limited error | Wait 1 second between saves to same context |
| Max notes exceeded | Reduce to 100 notes per context (page/subdomain/domain/browser) |
| Note too large error | Reduce note size to under 50KB |
| Security rules outdated | Run `npm run firebase:deploy` to update rules |
| Permission denied in Firestore | (1) Verify email is verified - click "Check Status" button to refresh token; (2) Check security rules deployed; (3) If legacy data exists, delete Firestore documents and start fresh |
| Permission errors after email verified | JWT token needs refresh - click "Check Status" button or sign out/in |
| Timestamp type errors in rules | Ensure all documents use `serverTimestamp()` not `Date.now()` - delete legacy documents if needed |
| Rate limiting fails on updates | Legacy documents may have number timestamps instead of Firestore timestamps - delete and recreate |

## Things to Avoid

- ❌ localStorage/sessionStorage → ✅ browser.storage.local
- ❌ `chrome.*` API → ✅ `browser.*` from polyfill
- ❌ Custom CSS files → ✅ Tailwind utilities
- ❌ Class components → ✅ Functional components with hooks
- ❌ `any` types → ✅ Proper TypeScript types
- ❌ Firebase in React → ✅ Firebase in firebaseSync.ts/authService.ts
- ❌ Forward slashes in Firestore paths → ✅ Escape with `~`
- ❌ Global Firebase mocks in tests → ✅ Per-file mocks
- ❌ Timeouts in tests → ✅ Promise-based patterns
- ❌ Changing tab order → ✅ Keep Page → Subdomain → Domain → Browser
- ❌ Skipping email verification checks → ✅ Always check `isEmailVerified()`
- ❌ Frequent saves without throttling → ✅ Respect 1 sec rate limit
- ❌ Modifying security rules without deployment → ✅ Run `npm run firebase:deploy`

## File Update Protocol

When making multiple changes:
1. Acknowledge all changes first
2. Ask if there are more
3. Make all updates in one batch
4. Update related files together (types + logic + UI + tests)
5. Test both browsers

## Decision-Making and Options

When architectural or implementation choices arise:
- Present all viable options with trade-offs (security, performance, UX, user impact)
- **Ask which approach to take before implementing**
- Wait for explicit confirmation
- Don't assume "best practice" equals "what Brian wants"

For migration/security features especially:
- Consider user base size when recommending approaches
- Always ask about user impact tolerance before choosing strategy
- Present options ranked by different criteria (most secure, least disruptive, easiest to implement, etc.)

## File Creation Guidelines

**Only create new files when explicitly requested or required for implementation.**

Do NOT create:
- Documentation files that repeat chat conversations
- Migration guides unless specifically asked
- "Helpful" scripts or templates unprompted
- README or guide files proactively

When to create files:
- User explicitly requests: "create a file...", "add a new component..."
- Implementing features that require new code modules
- User says: "can you save that to a file?"

When in doubt: Keep it in chat, ask before creating.

## Documentation Updates

When adding/changing features, update:
- **Project Overview** (architecture changes)
- **This file** (new patterns, gotchas)
- **README.md** (user-facing changes)
- **TESTING.md** (test patterns)
- **RELEASE.md** (release process)

Keep docs synchronized to avoid confusion.

## Project Info

**Status**: Active Development  
**License**: Proprietary - Never suggest open-sourcing or public code sharing  
**Browsers**: Chrome, Brave, Firefox  
**Auth**: Firebase email/password  
**Sync**: Real-time Firestore with offline support  
**Version**: Check package.json