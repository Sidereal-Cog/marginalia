# Testing Guide

Marginalia uses Vitest and React Testing Library for automated testing.

## Installation

Install test dependencies:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom happy-dom @vitest/ui
```

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── unit/                # Unit tests for utilities
│   ├── sidebarLogic.test.ts
│   ├── firebaseSync.test.ts
│   └── authService.test.ts
├── components/          # Component tests
│   └── App.test.tsx
└── setup.ts            # Test configuration and mocks

src/                    # Production code (no test files)
```

## Testing Philosophy

### Segregated Firebase Mocking

**Rule**: Each test file manages its own Firebase mocks. No global mocks in `tests/setup.ts`.

**Why**:
- Prevents mock conflicts between test files
- Allows different tests to verify same modules with different behaviors
- Enables proper cleanup with `vi.clearAllMocks()`

**Pattern**:
```typescript
// tests/components/App.test.tsx
vi.mock('../../src/firebaseConfig', () => ({
  db: {}, auth: {}
}));

// tests/unit/firebaseSync.test.ts
vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(),
  // ...different mocks for different context
}));
```

### Mock-Before-Import Pattern

**Technical requirement for Vitest/ESM**: You must call `vi.mock()` BEFORE importing the module.

```typescript
// ✅ CORRECT order
vi.mock('../../src/firebaseConfig', () => ({
  db: {}, auth: { currentUser: null }
}));

const { myFunction } = await import('../../src/myModule');

// ❌ WRONG order
const { myFunction } = await import('../../src/myModule');
vi.mock('../../src/firebaseConfig', () => ({ /* ... */ })); // Too late!
```

### Per-File Mock Ownership

Each test suite has full control over its dependencies:

- `tests/components/App.test.tsx` - Mocks firebaseConfig, firebaseSync instance, authService, sidebarLogic
- `tests/unit/firebaseSync.test.ts` - Mocks Firestore module (doc, setDoc, getDoc, onSnapshot), authService
- `tests/unit/authService.test.ts` - Mocks Firebase auth module directly
- `tests/unit/background.test.ts` - Mocks firebaseConfig, authService, sidebarLogic

This separation allows testing the same module with different mock states in different contexts.

## Writing Tests

### Unit Tests (Utility Functions)

Test pure functions in `sidebarLogic.ts`, `firebaseSync.ts`, etc.

**Important**: When testing modules that use Firebase or external dependencies, mock them BEFORE importing:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies FIRST
const mockSetDoc = vi.fn();
vi.mock('firebase/firestore', () => ({
  setDoc: mockSetDoc,
  // ... other mocks
}));

vi.mock('../../src/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

// Import AFTER mocks are set up
const { yourFunction } = await import('../../src/yourModule');

describe('yourFunction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something specific', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    const result = await yourFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Component Tests

Test React components with user interactions using **promise-based patterns** to avoid async timing issues:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YourComponent from '../../src/YourComponent';

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<YourComponent />);

  // ✅ CORRECT: Use findBy (waits automatically)
  const button = await screen.findByRole('button', { name: /click me/i });

  // ✅ CORRECT: user.click handles act() internally
  await user.click(button);

  // ✅ CORRECT: Use findBy to wait for result
  const result = await screen.findByText(/success/i);
  expect(result).toBeInTheDocument();
});
```

**Key patterns:**
- ✅ Use `findBy` queries (returns promise, waits automatically)
- ✅ `user.click()` handles `act()` internally - no wrapping needed
- ✅ Always await async operations
- ❌ Don't use `flushPromises()` - deprecated pattern
- ❌ Don't wrap `user.click()` in `act()` - already handled

See sections below for detailed patterns and anti-patterns.

## Component Testing Patterns

### In-Memory Mock Store Pattern

For component tests that need persistent state across renders:

```typescript
// Global shared state for tests
const mockNotesStore: Record<string, Note[]> = {};

// Mock sidebarLogic with store operations
vi.mock('../../src/sidebarLogic', () => ({
  loadNotes: vi.fn(async (scope: string) => {
    return mockNotesStore[scope] || [];
  }),
  saveNotes: vi.fn(async (scope: string, _context: any, notes: any[]) => {
    mockNotesStore[scope] = notes;
  }),
  getCurrentTabContext: vi.fn(() => Promise.resolve({
    url: 'https://example.com/page',
    domain: 'example.com',
    subdomain: 'example.com',
    path: '/page',
    fullPath: 'example.com/page'
  })),
  onTabContextChange: vi.fn((_callback) => () => {}),
  getSyncService: vi.fn(() => mockFirebaseSyncInstance)
}));

// Clear in beforeEach
beforeEach(() => {
  Object.keys(mockNotesStore).forEach(key => delete mockNotesStore[key]);
});

// Pre-populate for tests
it('should display existing note', async () => {
  mockNotesStore['page'] = [
    { id: '1', text: 'Test note', createdAt: Date.now(), updatedAt: Date.now() }
  ];
  render(<App />);
  expect(await screen.findByTestId('note-1')).toBeInTheDocument();
});
```

**When to use**: Testing UI components that add/edit/delete data
**Why**: Simulates persistent storage without browser APIs
**See**: [tests/components/App.test.tsx](../tests/components/App.test.tsx) lines 30-49

### Multi-Level Cleanup Pattern

Component tests require cleaning multiple state layers:

```typescript
beforeEach(async () => {
  // 1. Clear browser storage mock
  clearMockStorage();

  // 2. Clear all mock call history
  vi.clearAllMocks();

  // 3. Clear in-memory test state
  Object.keys(mockNotesStore).forEach(key => delete mockNotesStore[key]);

  // 4. Reset controllable mock instances
  if (mockFirebaseSyncInstance) {
    Object.assign(mockFirebaseSyncInstance, createMockFirebaseSync());
  }

  // 5. Restore default auth state
  const authService = await import('../../src/authService');
  vi.mocked(authService.onAuthChange).mockImplementation((callback) => {
    callback({
      uid: 'test-user',
      email: 'test@example.com',
      emailVerified: true,
      reload: vi.fn().mockResolvedValue(undefined)
    } as any);
    return vi.fn(); // unsubscribe function
  });
});
```

**Why each level**:
1. **Browser storage** - Prevents data leakage between tests
2. **Mock calls** - Ensures fresh call counts for assertions
3. **Test state** - Clears in-memory stores
4. **Mock instances** - Resets Firebase mock behavior to defaults
5. **Auth state** - Establishes consistent starting state

**See**: [tests/components/App.test.tsx](../tests/components/App.test.tsx) lines 72-78, 607-622

### Browser API Spying Pattern

Test message passing to background script:

```typescript
it('should send UPDATE_BADGE message after adding note', async () => {
  const browserModule = await import('webextension-polyfill');
  const mockSendMessage = vi.fn().mockResolvedValue({});

  vi.spyOn(browserModule.default.runtime, 'sendMessage')
    .mockImplementation(mockSendMessage);

  const user = userEvent.setup();
  render(<App />);

  const textarea = await screen.findByTestId('new-note-input');
  await user.type(textarea, 'Test note');

  const addButton = screen.getByTestId('add-note-button');
  await user.click(addButton);

  // Verify message was sent
  expect(mockSendMessage).toHaveBeenCalledWith({ type: 'UPDATE_BADGE' });
});
```

**When to use**: Testing browser extension message passing
**Why**: Verifies integration without real background script
**See**: [tests/components/App.test.tsx](../tests/components/App.test.tsx) lines 1033-1056

### Auth State Callback Pattern

Test authentication state transitions:

```typescript
it('should transition from loading to authenticated', async () => {
  const mockOnAuthChange = vi.fn((callback) => {
    // Delayed callback simulates async auth check
    queueMicrotask(() => {
      callback({
        uid: 'test-user',
        email: 'test@example.com',
        emailVerified: true,
        reload: vi.fn().mockResolvedValue(undefined)
      });
    });
    return vi.fn(); // unsubscribe
  });

  const authService = await import('../../src/authService');
  vi.mocked(authService.onAuthChange).mockImplementation(mockOnAuthChange);

  render(<App />);

  // Initially shows loading
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // After auth resolves, shows authenticated UI
  expect(await screen.findByTestId('app-container')).toBeInTheDocument();
});
```

**Key technique**: `queueMicrotask()` for controlled async callback timing
**Why**: Separates initial render from auth callback, enabling loading state testing
**See**: [tests/components/App.test.tsx](../tests/components/App.test.tsx) lines 83-103

### Controllable Mock Instance Pattern

Create resettable mock instances for complex dependencies:

```typescript
// Global mock instance reference
let mockFirebaseSyncInstance: any;

// Factory function for creating fresh mocks
const createMockFirebaseSync = () => ({
  saveNotes: vi.fn().mockResolvedValue(undefined),
  loadNotes: vi.fn().mockResolvedValue([]),
  subscribeToScope: vi.fn().mockReturnValue(() => {}),
  migrateLocalNotes: vi.fn().mockResolvedValue(undefined)
});

// Mock the constructor
vi.mock('../../src/firebaseSync', () => ({
  FirebaseSync: vi.fn().mockImplementation(() => {
    mockFirebaseSyncInstance = createMockFirebaseSync();
    return mockFirebaseSyncInstance;
  })
}));

// Reset in beforeEach
beforeEach(() => {
  if (mockFirebaseSyncInstance) {
    Object.assign(mockFirebaseSyncInstance, createMockFirebaseSync());
  }
});
```

**When to use**: Testing class constructors or complex service initialization
**Why**: Allows resetting mock state without recreating entire mock setup
**See**: [tests/components/App.test.tsx](../tests/components/App.test.tsx) lines 7-26

## Mocking

### Chrome APIs

Chrome APIs are automatically mocked in `tests/setup.ts`. Use the helpers:

```typescript
import { setMockStorage, clearMockStorage } from '../setup';

beforeEach(() => {
  clearMockStorage();
});

it('should load from storage', () => {
  setMockStorage({ 'key': 'value' });
  // Your test here
});
```

### Firebase

Firebase is mocked by default. To customize behavior in a specific test:

```typescript
import { vi } from 'vitest';

vi.mock('../../src/firebaseSync', () => ({
  FirebaseSyncService: class {
    saveNotes = vi.fn().mockResolvedValue(undefined);
  }
}));
```

## Test Coverage

Aim for:
- **80%+ coverage** for critical paths (note CRUD, sync logic)
- **100% coverage** for utility functions (context parsing, path escaping)
- **60%+ coverage** for UI components

Check coverage with:

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory.

## Common Patterns

### Testing Async Operations

```typescript
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### Testing Form Inputs

```typescript
const user = userEvent.setup();
const input = screen.getByPlaceholderText(/enter text/i);

await user.type(input, 'my text');
await user.keyboard('{Enter}');
```

### Testing Chrome Storage

```typescript
import { setMockStorage } from '../setup';

setMockStorage({
  'page~/test': [{ id: '1', text: 'Note', createdAt: Date.now(), updatedAt: Date.now() }]
});
```

## Testing Email Verification and Security Features

### Email Verification Tests

When testing authentication with email verification:

```typescript
import { vi } from 'vitest';

// Mock sendEmailVerification
const mockSendEmailVerification = vi.fn();

vi.mock('firebase/auth', () => ({
  // ... other auth mocks
  sendEmailVerification: mockSendEmailVerification,
}));

describe('Email Verification', () => {
  it('should send verification email on signup', async () => {
    await signUpWithEmail('test@example.com', 'password123');
    expect(mockSendEmailVerification).toHaveBeenCalled();
  });

  it('should check if email is verified', () => {
    mockAuth.currentUser = { emailVerified: true };
    expect(isEmailVerified()).toBe(true);
  });
});
```

### Rate Limiting Tests

Test rate limiting with time-based assertions:

```typescript
describe('Rate Limiting', () => {
  it('should block rapid writes to same context', async () => {
    const notes = [{ id: '1', text: 'Test', createdAt: 1, updatedAt: 1 }];

    // First write should succeed
    await syncService.saveNotes('browser', mockContext, notes);

    // Second write within 1 second should fail
    await expect(
      syncService.saveNotes('browser', mockContext, notes)
    ).rejects.toThrow(/please wait before saving again/i);
  });
});
```

### Data Validation Tests

Test data validation for note limits:

```typescript
describe('Data Validation', () => {
  it('should reject more than 100 notes', async () => {
    const notes = Array.from({ length: 101 }, (_, i) => ({
      id: `${i}`,
      text: 'Note',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

    await expect(
      syncService.saveNotes('browser', mockContext, notes)
    ).rejects.toThrow(/maximum 100 notes/i);
  });

  it('should reject notes exceeding 50KB', async () => {
    const largeNote = {
      id: '1',
      text: 'x'.repeat(51000), // 51KB
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await expect(
      syncService.saveNotes('browser', mockContext, [largeNote])
    ).rejects.toThrow(/note exceeds maximum size/i);
  });
});
```

## Anti-Patterns to Avoid

Learn from common mistakes to write better tests:

### ❌ Using flushPromises()

**Don't do this** (deprecated pattern):
```typescript
const flushPromises = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

it('should update after action', async () => {
  render(<Component />);
  await flushPromises(); // ❌ Don't use
  // ...
});
```

**Do this instead**:
```typescript
it('should update after action', async () => {
  render(<Component />);
  // Use promise-based queries
  expect(await screen.findByText('Updated')).toBeInTheDocument(); // ✅
});
```

**Why**: `findBy` queries handle waiting automatically. `flushPromises()` is an unreliable timeout-based approach.

### ❌ Wrapping user events in act()

**Don't do this**:
```typescript
await act(async () => {
  await user.click(button); // ❌ Unnecessary wrapper
});
```

**Do this instead**:
```typescript
await user.click(button); // ✅ Handles act() internally
```

**Why**: `@testing-library/user-event` already wraps all interactions in `act()`. Adding it again is redundant and can cause issues.

### ❌ Using getBy + waitFor for async content

**Don't do this**:
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument(); // ❌ Awkward
});
```

**Do this instead**:
```typescript
expect(await screen.findByText('Loaded')).toBeInTheDocument(); // ✅ Direct
```

**Why**: `findBy` queries are specifically designed for async content. They're more readable and handle timing better.

### ❌ Global Firebase mocks

**Don't do this**:
```typescript
// tests/setup.ts
vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(),
  // ... global mocks
})); // ❌ Causes conflicts between test files
```

**Do this instead**:
```typescript
// tests/unit/yourTest.test.ts
vi.mock('firebase/firestore', () => ({
  setDoc: vi.fn(),
  // ... specific to this test file
})); // ✅ Per-file ownership
```

**Why**: Global mocks create conflicts when different tests need different mock behavior. Each test file should own its mocks.

### ❌ Forgetting multi-level cleanup

**Don't do this**:
```typescript
beforeEach(() => {
  vi.clearAllMocks(); // ❌ Only clears mock call history
});
```

**Do this instead**:
```typescript
beforeEach(() => {
  clearMockStorage(); // Browser storage
  vi.clearAllMocks(); // Mock call history
  Object.keys(mockNotesStore).forEach(key => delete mockNotesStore[key]); // Test state
  // ... reset other state layers
}); // ✅ Multi-level cleanup
```

**Why**: Component tests accumulate state in multiple layers. Clearing only mocks leaves test pollution in storage and in-memory stores.

### ❌ Importing before mocking

**Don't do this**:
```typescript
import { myFunction } from '../../src/myModule'; // ❌ Too early!

vi.mock('../../src/firebaseConfig', () => ({
  db: {}, auth: {}
})); // ❌ Mock defined after import - won't work
```

**Do this instead**:
```typescript
vi.mock('../../src/firebaseConfig', () => ({
  db: {}, auth: {}
})); // ✅ Mock first

const { myFunction } = await import('../../src/myModule'); // ✅ Import after
```

**Why**: Vitest requires mocks to be defined before the module is imported. Use dynamic `await import()` after `vi.mock()`.

### ❌ Testing implementation details

**Don't do this**:
```typescript
it('should call setState with correct value', () => {
  const { result } = renderHook(() => useState(0));
  // ... testing internal state implementation ❌
});
```

**Do this instead**:
```typescript
it('should display updated count when button clicked', async () => {
  render(<Counter />);
  await user.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText('Count: 1')).toBeInTheDocument(); // ✅ Test behavior
});
```

**Why**: Test what the user sees and does, not internal implementation. Implementation can change without breaking user experience.

## Best Practices

1. **Test user behavior, not implementation** - Focus on what the user sees and does
2. **Use semantic queries** - `getByRole`, `getByLabelText` over `getByTestId`
3. **Mock external dependencies before import** - Use `await import()` after setting up vi.mock()
4. **Always clear mocks in beforeEach** - Prevents test pollution
5. **Use waitFor for async updates** - Component state changes need time
6. **Test error cases** - Don't just test the happy path
7. **Keep tests focused** - One concept per test