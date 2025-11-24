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
  - `background.ts` - Tab listeners and browser detection
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

### Authentication Flow
- **authService.ts** - All Firebase auth operations (sign up, sign in, password reset, sign out)
- **options.tsx** - Auth UI with three modes: signin, signup, reset
- **App.tsx** - Shows loading → unauthenticated UI → main UI based on auth state
- **Auth state** - Both App and Options subscribe to `onAuthChange` listener
- **Auth tokens** - Auto-refresh by Firebase, sessions persist indefinitely
- **User data** - Isolated under `/users/{userId}` in Firestore

### Context Updates
Load ALL scopes when context changes to populate badge counts correctly - not just the current tab

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
- Wrap React state changes in `act()`
- Use `vi.spyOn()` for browser module properties (read-only)
- Restore auth mocks in `afterEach` for auth integration tests

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

# Package
npm run package              # Build + create release zips
```

### Testing Checklist
1. Build and refresh extension
2. Check service worker console (Chrome) or background console (Firefox)
3. Test badge counts update correctly
4. Test context switching between tabs
5. Test offline mode (disconnect internet)
6. Test sync across devices
7. Run test suite
8. Test auth flow (sign up, sign in, sign out, password reset)
9. Test in both Chrome and Firefox

## Design System

- **Colors**: Indigo (primary), purple (accent), gray scale
- **Spacing**: p-3/p-4 for padding, gap-2/gap-3 for gaps
- **Effects**: Elevated shadow on hovers
- **Responsive**: 280px-600px width range

## Common Issues

| Problem | Solution |
|---------|----------|
| Sidebar doesn't update | Check onTabContextChange callback, add console logs |
| Badges don't show | Load all scopes on context change, not just current tab |
| Textarea height wrong | Use ref + useEffect pattern, not inline handlers |
| TypeScript errors | Import types from types.ts, check Browser types available |
| Firebase not working | Check service worker console, verify config |
| Notes not syncing | Check Firebase console for auth and data structure |
| Path errors in Firestore | Escape paths with `~` instead of `/` |
| Tests failing | Check mocks before imports, verify browser.* pattern |
| Auth not persisting | Firebase auto-refreshes tokens, check for sign-out calls |
| Extension broken in Firefox | Verify manifest-firefox.json, check addon ID |

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