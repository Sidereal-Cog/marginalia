# Changelog

All notable changes to Marginalia will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-25

### Initial Release

Marginalia is a Chrome extension for context-aware note-taking that organizes notes by URL scope with Firebase sync across devices.

#### Features

**Context-Aware Organization**
- Four-tier scope system: Browser-wide, Domain, Subdomain, and Page-specific notes
- Automatic context detection based on current URL
- Smart badge counts showing notes available at each scope
- Tab change detection updates context in real-time

**Note Management**
- Create, read, update, and delete notes with simple interface
- Auto-scaling text areas that grow with content
- Timestamps for creation and last update
- Three-dot menu for quick edit/delete actions

**Sync & Offline**
- Firebase integration for real-time cross-device sync
- Offline support with local cache fallback
- Anonymous authentication (no login required)
- Automatic migration of existing local notes to cloud

**User Interface**
- Side panel interface accessible from any tab
- Tabbed navigation between scope levels
- Clean design with Tailwind CSS
- Responsive layout (280px-600px width)
- Lucide React icons throughout

**Technical**
- Built with React 19 and TypeScript
- Chrome Extension Manifest V3
- Comprehensive test suite with Vitest
- Firebase Firestore for data persistence