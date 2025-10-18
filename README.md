# Marginalia

A Chrome extension for context-aware note-taking that organizes your notes by URL scope (browser-wide, domain, subdomain, or page-specific).

## Features

**Context-Aware Notes** - Take notes that automatically organize by scope:
- **Browser-wide** - Notes available everywhere
- **Domain** - Notes for `example.com`
- **Subdomain** - Notes for `app.example.com`
- **Page** - Notes for specific URLs like `/dashboard`

**Side Panel Interface** - Clean, always-accessible sidebar with tabbed navigation for different note scopes.

**Smart Context Detection** - Automatically detects URL changes and shows relevant notes as you browse.

**Persistent Storage** - All notes saved locally using Chrome's storage API.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons
- **Chrome Extension Manifest V3** - Side panel API

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- Chrome or Brave browser

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

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
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

## Project Structure

```
marginalia/
├── src/
│   ├── App.tsx           # Main React component with tabbed interface
│   ├── background.ts     # Service worker for tab change detection
│   ├── sidebarLogic.ts   # Chrome API utilities
│   ├── types.ts          # TypeScript type definitions
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind styles
├── public/
│   └── manifest.json     # Chrome extension manifest
├── index.html            # Side panel HTML
└── vite.config.ts        # Vite build configuration
```

## How It Works

1. Click the extension icon to open the side panel
2. The panel shows your current browsing context (domain, subdomain, path)
3. Switch between tabs to view notes at different scope levels
4. Add notes using the input field - they're automatically saved to the appropriate scope
5. When you switch tabs or navigate to new URLs, the panel updates to show relevant notes

## Storage Structure

Notes are stored in Chrome's local storage with keys like:
- `notes:browser` - Browser-wide notes
- `notes:domain:example.com` - Domain-specific notes
- `notes:subdomain:app.example.com` - Subdomain-specific notes
- `notes:page:app.example.com/dashboard` - Page-specific notes

## Available Scripts

- `npm run dev` - Development build with watch mode
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Copyright

Copyright © 2025 Brian Crucitti. All rights reserved.

This software and its source code are proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## License

Proprietary - All Rights Reserved

This code is private and confidential. No part of this software may be reproduced, distributed, or transmitted in any form without prior written permission from the copyright holder.