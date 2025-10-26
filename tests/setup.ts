import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock storage for tests
const mockStorage: Record<string, any> = {};

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn((keys: string | string[] | null) => {
          if (keys === null) {
            return Promise.resolve(mockStorage);
          }
          if (typeof keys === 'string') {
            return Promise.resolve({ [keys]: mockStorage[keys] });
          }
          const result: Record<string, any> = {};
          keys.forEach(key => {
            if (key in mockStorage) {
              result[key] = mockStorage[key];
            }
          });
          return Promise.resolve(result);
        }),
        set: vi.fn((items: Record<string, any>) => {
          Object.assign(mockStorage, items);
          return Promise.resolve();
        }),
        remove: vi.fn((keys: string | string[]) => {
          const keysArray = Array.isArray(keys) ? keys : [keys];
          keysArray.forEach(key => delete mockStorage[key]);
          return Promise.resolve();
        }),
        clear: vi.fn(() => {
          Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
          return Promise.resolve();
        })
      }
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([{
        id: 1,
        url: 'https://example.com/test',
        active: true
      }])),
      get: vi.fn((tabId: number) => Promise.resolve({
        id: tabId,
        url: 'https://example.com/test',
        active: true
      })),
      onActivated: {
        addListener: vi.fn()
      },
      onUpdated: {
        addListener: vi.fn()
      }
    },
    runtime: {
      sendMessage: vi.fn(() => Promise.resolve()),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      onInstalled: {
        addListener: vi.fn()
      }
    },
    action: {
      onClicked: {
        addListener: vi.fn()
      }
    },
    sidePanel: {
      open: vi.fn(() => Promise.resolve()),
      setPanelBehavior: vi.fn(() => Promise.resolve())
    },
    sidebarAction: {
      toggle: vi.fn(() => Promise.resolve())
    }
  }
}));

// Also mock chrome for backward compatibility (tests that directly use chrome.*)
global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys: string | string[] | null) => {
        if (keys === null) {
          return Promise.resolve(mockStorage);
        }
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage[keys] });
        }
        const result: Record<string, any> = {};
        keys.forEach(key => {
          if (key in mockStorage) {
            result[key] = mockStorage[key];
          }
        });
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, any>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      })
    }
  },
  tabs: {
    query: vi.fn(((queryInfo: any, callback?: any) => {
      const tabs = [{
        id: 1,
        url: 'https://example.com/test',
        active: true
      }];
      if (callback) {
        callback(tabs);
        return undefined;
      }
      return Promise.resolve(tabs);
    }) as any),
    get: vi.fn((tabId: number) => Promise.resolve({
      id: tabId,
      url: 'https://example.com/test',
      active: true
    }))
  },
  runtime: {
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  sidePanel: {
    open: vi.fn(() => Promise.resolve())
  }
} as any;

// DO NOT mock Firebase here - let each test file handle its own Firebase mocks
// This prevents conflicts between global mocks and test-specific mocks

// Helper to clear mock storage between tests
export const clearMockStorage = () => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
};

// Helper to set mock storage data
export const setMockStorage = (data: Record<string, any>) => {
  Object.assign(mockStorage, data);
};

// Helper to get current mock storage
export const getMockStorage = () => ({ ...mockStorage });
