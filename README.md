# Marginalia

A cross-browser extension for context-aware note-taking that organizes your notes by URL scope (browser-wide, domain, subdomain, or page-specific) with Firebase sync across devices.

**Supported Browsers:** Chrome, Brave, Firefox

## Features

**Context-Aware Notes** - Take notes that automatically organize by scope:
- **Browser-wide** - Notes available everywhere
- **Domain** - Notes for `example.com`
- **Subdomain** - Notes for `app.example.com`
- **Page** - Notes for specific URLs like `/dashboard`

**Cross-Device Sync** - Firebase integration for real-time sync across all your devices with offline support.

**Side Panel/Sidebar Interface** - Clean, always-accessible panel with tabbed navigation for different note scopes.

**Smart Context Detection** - Automatically detects URL changes and shows relevant notes as you browse.

**Options Page** - Access extension information and usage guide via right-click → Options.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons
- **Firebase** - Cloud sync and email/password authentication
- **WebExtension Polyfill** - Cross-browser compatibility
- **Chrome Extension Manifest V3** - Side panel API
- **Vitest** - Testing framework

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- Chrome, Brave, or Firefox browser
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
   - Enable Firestore Database and Email/Password Authentication
   - Add your Firebase config to `src/firebaseConfig.ts`

4. Add extension icons:
   - Place icon files (16x16, 32x32, 48x48, 128x128 PNG) in `public/assets/`
   - Update both `manifest-chrome.json` and `manifest-firefox.json` with icon paths

5. **Firefox only:** Update the addon ID in `manifest-firefox.json`:
   ```json
   "browser_specific_settings": {
     "gecko": {
       "id": "marginalia@yourdomain.com"
     }
   }
   ```

## Multi-Browser Support

Marginalia supports both Chrome/Brave and Firefox browsers with a single codebase.

### Chrome/Brave Installation

1. Build the Chrome version:
```bash
npm run build:chrome
```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist/chrome` folder

### Firefox Installation

1. Build the Firefox version:
```bash
npm run build:firefox
```

2. Load the extension in Firefox:
   - Open Firefox and go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Navigate to `dist/firefox` and select `manifest.json`

**Note:** Firefox temporary add-ons are removed when Firefox closes. For permanent installation, you'll need to sign the extension through addons.mozilla.org.

### Development

During development, use browser-specific dev commands:

```bash
# For Chrome development (default, fastest iteration)
npm run dev

# For Firefox development
npm run dev:firefox
```

Both commands watch for file changes and rebuild automatically. Remember to refresh the extension after each rebuild:
- **Chrome:** Click the refresh button in `chrome://extensions/`
- **Firefox:** Click "Reload" in `about:debugging`

### Building for Release

To build both browser versions:

```bash
npm run build        # Builds both Chrome and Firefox versions
npm run package      # Builds and creates zip files for both browsers
```

This creates:
- `releases/marginalia-chrome-{version}.zip`
- `releases/marginalia-firefox-{version}.zip`

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
│   ├── sidebarLogic.ts      # Browser API utilities
│   ├── firebaseConfig.ts    # Firebase initialization
│   ├── authService.ts       # Email/password authentication
│   ├── firebaseSync.ts      # Firestore sync operations
│   ├── types.ts             # TypeScript type definitions
│   ├── main.tsx             # React entry point
│   └── index.css            # Tailwind styles
├── tests/
│   ├── setup.ts            # Test configuration
│   ├── unit/               # Unit tests
│   └── components/         # Component tests
├── manifest-chrome.json    # Chrome-specific manifest
├── manifest-firefox.json   # Firefox-specific manifest
├── index.html               # Side panel HTML
├── options.html             # Options page HTML
├── vitest.config.ts         # Vitest configuration
└── vite.config.ts           # Vite build configuration
```

## How It Works

1. Open the extension options page to create an account or sign in
2. Click the extension icon to open the side panel/sidebar
3. The panel shows your current browsing context (domain, subdomain, path)
4. Switch between tabs to view notes at different scope levels
5. Add notes using the input field - they're automatically saved and synced
6. Notes sync in real-time across all your devices
7. Works offline with automatic sync when reconnected
8. Right-click the extension icon → Options to manage your account

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
- **Mocked Dependencies** - Browser APIs and Firebase fully mocked
- **Promise-Based Patterns** - Reliable async testing without flaky timeouts

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Development Workflow

1. Make your changes in `src/`
2. Run tests: `npm test`
3. Build: `npm run build` (builds both browsers)
4. Test in Chrome: Load `dist/chrome` in `chrome://extensions/`
5. Test in Firefox: Load `dist/firefox` in `about:debugging`
6. Check service worker/background console for errors
7. Verify all features work identically in both browsers

## Firebase Setup

1. Create Firebase project at console.firebase.google.com
2. Enable Firestore Database (start in test mode)
3. Enable Email/Password Authentication in Authentication > Sign-in method
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