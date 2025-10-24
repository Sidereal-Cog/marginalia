# Marginalia

A Chrome extension for context-aware note-taking that organizes your notes by URL scope (browser-wide, domain, subdomain, or page-specific) with Firebase sync across devices.

## Features

**Context-Aware Notes** - Take notes that automatically organize by scope:
- **Browser-wide** - Notes available everywhere
- **Domain** - Notes for `example.com`
- **Subdomain** - Notes for `app.example.com`
- **Page** - Notes for specific URLs like `/dashboard`

**Cross-Device Sync** - Firebase integration for real-time sync across all your devices with offline support.

**Side Panel Interface** - Clean, always-accessible sidebar with tabbed navigation for different note scopes.

**Smart Context Detection** - Automatically detects URL changes and shows relevant notes as you browse.

**Options Page** - Access extension information and usage guide via right-click → Options.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons
- **Firebase** - Cloud sync and authentication
- **Chrome Extension Manifest V3** - Side panel API
- **Vitest** - Testing framework

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- Chrome or Brave browser
- Firebase project (for sync features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd marginalia
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a Firebase project at console.firebase.google.com
   - Enable Firestore Database and Anonymous Authentication
   - Add your Firebase config to `src/firebaseConfig.ts`

4. Add extension icons:
   - Place icon files (16x16, 32x32, 48x48, 128x128 PNG) in `public/assets/`
   - Update `public/manifest.json` with icon paths

5. Build the extension:
```bash
npm run build
```

6. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from your project

### Development

Run the development build with hot reload:
```bash
npm run dev
```

This watches for file changes and rebuilds automatically. You'll need to click the refresh button in `chrome://extensions/` after each rebuild.

### Testing

Run the test suite:
```bash
npm test                  # Run tests in watch mode
npm run test:run          # Run tests once (CI mode)
npm run test:coverage     # Generate coverage report
npm run test:ui           # Interactive test UI
```

## Project Structure

```
marginalia/
├── src/
│   ├── App.tsx              # Main React component with tabbed interface
│   ├── options.tsx          # Options page component
│   ├── background.ts        # Service worker for tab change detection
│   ├── sidebarLogic.ts      # Chrome API utilities
│   ├── firebaseConfig.ts    # Firebase initialization
│   ├── authService.ts       # Anonymous authentication
│   ├── firebaseSync.ts      # Firestore sync operations
│   ├── types.ts             # TypeScript type definitions
│   ├── main.tsx             # React entry point
│   └── index.css            # Tailwind styles
├── tests/
│   ├── setup.ts            # Test configuration
│   ├── unit/               # Unit tests
│   └── components/         # Component tests
├── public/
│   ├── manifest.json        # Chrome extension manifest
│   └── assets/              # Icon files
├── index.html               # Side panel HTML
├── options.html             # Options page HTML
├── vitest.config.ts         # Vitest configuration
└── vite.config.ts           # Vite build configuration
```

## How It Works

1. Click the extension icon to open the side panel
2. The panel shows your current browsing context (domain, subdomain, path)
3. Switch between tabs to view notes at different scope levels
4. Add notes using the input field - they're automatically saved and synced
5. Notes sync in real-time across all your devices
6. Works offline with automatic sync when reconnected
7. Right-click the extension icon → Options to view usage guide

## Icon Requirements

Extension requires the following icon sizes in PNG format:
- **16x16** - Toolbar display (most critical for visibility)
- **32x32** - Toolbar at 2x DPI
- **48x48** - Extension management page
- **128x128** - Chrome Web Store and installation

**Design Tips:**
- Use bold lines and high contrast for visibility at 16x16
- Design must work on both light and dark browser themes
- Chrome doesn't support theme-aware icons
- Test 16x16 icon at actual size before finalizing

## Testing

The project includes a comprehensive test suite using Vitest and React Testing Library:

- **Unit Tests** - Test utility functions and services
- **Component Tests** - Test React components and user interactions
- **Mocked Dependencies** - Chrome APIs and Firebase fully mocked
- **Promise-Based Patterns** - Reliable async testing without flaky timeouts

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Development Workflow

1. Make your changes in `src/`
2. Run tests: `npm test`
3. Build: `npm run build`
4. Refresh extension in `chrome://extensions/`
5. Test in the browser
6. Check service worker console for errors

## Firebase Setup

1. Create Firebase project at console.firebase.google.com
2. Enable Firestore Database (start in test mode)
3. Enable Anonymous Authentication
4. Add security rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
5. Add your config to `src/firebaseConfig.ts`

## License

UNLICENSED - This is proprietary software. All rights reserved.