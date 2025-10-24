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
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YourComponent from '../../src/YourComponent';

// Helper to flush all promises
const flushPromises = () => act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<YourComponent />);
  
  // Flush any mount effects
  await flushPromises();
  
  // Use findBy queries (returns promise) instead of getBy + waitFor
  const button = await screen.findByRole('button', { name: /click me/i });
  
  // Wrap async actions in act()
  await act(async () => {
    await user.click(button);
  });
  
  await flushPromises();
  
  // Use findBy to wait for element
  const result = await screen.findByText(/success/i);
  expect(result).toBeInTheDocument();
});
```

**Key patterns:**
- Use `findBy` queries (promise-based) instead of `getBy` + `waitFor`
- Flush promises with `flushPromises()` helper after renders
- Wrap user actions in `act()` for state updates
- Always await async operations

See "Promise-Based Testing Patterns" guide for complete details.

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

## Best Practices

1. **Test user behavior, not implementation** - Focus on what the user sees and does
2. **Use semantic queries** - `getByRole`, `getByLabelText` over `getByTestId`
3. **Mock external dependencies before import** - Use `await import()` after setting up vi.mock()
4. **Always clear mocks in beforeEach** - Prevents test pollution
5. **Use waitFor for async updates** - Component state changes need time
6. **Test error cases** - Don't just test the happy path
7. **Keep tests focused** - One concept per test