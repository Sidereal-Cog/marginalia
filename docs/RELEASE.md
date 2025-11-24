# Release Process

This document outlines the workflow for creating version releases of Marginalia.

## Branch Strategy

- **development** - Active development branch where all new features and fixes are committed
- **master** - Stable release branch, only updated during version releases
- **Tags** - Each release is tagged (e.g., `v1.0.0`, `v1.1.0`)

## Initial Setup (First Time Only)

If you haven't set up the branching structure yet:

```bash
# Rename current branch to development if needed
git branch -m main development

# Create master branch from current state
git checkout -b master

# Push both branches
git push -u origin master
git push -u origin development

# Switch back to development for ongoing work
git checkout development
```

## Standard Release Process

### 1. Pre-Release Preparation (on development branch)

```bash
# Ensure you're on development
git checkout development

# Make sure everything is committed
git status

# Deploy Firebase security rules
npm run firebase:deploy

# Run full test suite
npm test

# Run linting
npm run lint
```

### 2. Update Version and Documentation

Update version numbers in:
- `manifest-chrome.json` - Chrome extension version (e.g., `"version": "1.1.0"`)
- `manifest-firefox.json` - Firefox extension version (e.g., `"version": "1.1.0"`)
- `package.json` - npm package version (e.g., `"version": "1.1.0"`)

Update `CHANGELOG.md`:
- Add a new section for the version
- List all Added, Changed, Fixed, and Removed items
- Include the release date

Example CHANGELOG entry:
```markdown
## [1.1.0] - 2025-10-26

### Added
- Firefox support with webextension-polyfill
- Enhanced logged-out experience with CTA

### Changed
- Build system now creates separate Chrome and Firefox packages
```

### 3. Commit Version Changes

```bash
# Commit version and changelog updates
git add manifest-chrome.json manifest-firefox.json package.json CHANGELOG.md
git commit -m "chore: prepare v1.1.0 release"

# Push to development
git push origin development
```

### 4. Build and Package

```bash
# Build both browser versions and create release packages
npm run package

# This creates:
# - dist/chrome/ (built Chrome extension)
# - dist/firefox/ (built Firefox extension)
# - releases/marginalia-chrome-1.1.0.zip
# - releases/marginalia-firefox-1.1.0.zip
```

### 5. Merge to Master

```bash
# Switch to master
git checkout master

# Merge development (--no-ff preserves merge history)
git merge --no-ff development -m "Release v1.1.0"

# Push master
git push origin master
```

### 6. Create Git Tag

```bash
# Create annotated tag on master
git tag -a v1.1.0 -m "Release v1.1.0 - Brief description of changes"

# Push the tag
git push origin v1.1.0
```

### 7. Submit to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select your extension
3. Click "Package" → "Upload new package"
4. Upload `releases/marginalia-chrome-1.1.0.zip`
5. Update store listing if needed (description, screenshots, etc.)
6. Click "Submit for review"
7. Wait for approval (typically 1-3 business days)

### 8. Submit to Firefox Add-ons (AMO)

#### First-Time AMO Setup

If this is your first Firefox submission:

1. Create an account at [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
2. Go to "My Add-ons" → "Submit a New Add-on"
3. Choose "On this site" (listed on AMO)
4. Upload `releases/marginalia-firefox-1.1.0.zip`
5. Fill out required information:
   - Add-on name: Marginalia
   - Add-on URL: marginalia (or your preferred slug)
   - Summary and description
   - Categories: Productivity, Tools
   - Privacy policy URL (if collecting data)
   - License: All Rights Reserved (proprietary)
6. Upload screenshots and icons
7. Submit for review

**Important First-Time Notes:**
- Initial review takes longer (1-2 weeks typical)
- Reviewers may request changes or clarifications
- Your extension will receive a unique add-on ID
- Save this ID - it's required for future updates

#### Updating an Existing AMO Listing

For subsequent releases:

1. Go to [AMO Developer Hub](https://addons.mozilla.org/developers/)
2. Click on your extension → "Manage Status & Versions"
3. Click "Upload New Version"
4. Upload `releases/marginalia-firefox-1.1.0.zip`
5. Fill in "Version notes" (what's new in this version)
6. If you made code changes:
   - Describe the changes
   - Explain how features work
   - Provide test credentials if auth is required
7. Submit for review

**Update Review Notes:**
- Updates typically review faster (1-3 days)
- Significant changes may trigger longer review
- You can provide reviewer guidance in submission notes

#### AMO Submission Best Practices

**What Reviewers Look For:**
- Clear, accurate extension description
- All permissions justified and explained
- No obfuscated code
- Privacy policy if collecting any data
- Source code availability (if using build tools)

**For Marginalia Specifically:**
- Explain Firebase integration and data storage
- Justify `tabs` and `storage` permissions
- Note that user data stays in their Firebase account
- Mention authentication requirement

**Common Review Issues to Avoid:**
- Minified code without source maps
- Unclear permission usage
- Missing privacy policy
- Vague version notes
- External dependencies not explained

#### Providing Source Code

Since Marginalia uses a build process (Vite, TypeScript), you may need to provide source code:

1. Create a source package:
```bash
# Create a clean copy without node_modules, dist, etc.
git archive -o marginalia-source-v1.1.0.tar.gz HEAD
```

2. Include build instructions in submission notes:
```
This extension is built with Vite and TypeScript.

To build:
1. npm install
2. npm run build:firefox
3. Output is in dist/firefox/

Dependencies are in package.json.
Firebase configuration is in src/firebaseConfig.ts (requires user's own Firebase project).
```

3. Upload source package when requested by reviewers

#### After Approval

- **Automatic updates**: Users get updates automatically via Firefox
- **Update frequency**: You can update as often as needed
- **Version increments**: Must increase version number for each submission
- **Distribution**: Extension listed publicly on AMO

#### Self-Distribution Alternative

If you prefer not to list on AMO (private distribution):

1. Build the extension: `npm run build:firefox`
2. Package it: `npm run package`
3. Users must:
   - Download `marginalia-firefox-1.1.0.zip`
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the zip file

**Limitations of self-distribution:**
- Extension removed when Firefox closes (temporary)
- No automatic updates
- Users must manually reinstall after each Firefox restart
- Not suitable for general distribution

**Self-hosting with signing (advanced):**
1. Submit to AMO as "unlisted"
2. Get signed XPI file back
3. Distribute signed XPI yourself
4. Users can install permanently
5. Still need AMO account, but not listed publicly

### 9. Create GitHub Release

1. Go to your repository → Releases → New Release
2. Select the tag you just created (e.g., `v1.1.0`)
3. Release title: `v1.1.0 - [Brief Description]`
4. Copy the CHANGELOG entry for this version into the description
5. Attach both zip files:
   - `releases/marginalia-chrome-1.1.0.zip`
   - `releases/marginalia-firefox-1.1.0.zip`
6. Publish release

### 10. Continue Development

```bash
# Switch back to development for new work
git checkout development

# Continue with new features
```

## Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.0 → 1.0.1): Bug fixes, minor tweaks, no new features
- **Minor** (1.0.0 → 1.1.0): New features, non-breaking changes
- **Major** (1.0.0 → 2.0.0): Breaking changes, major architectural overhauls

## Hotfix Process

If you need to fix a critical bug in production:

```bash
# Create hotfix branch from master
git checkout master
git checkout -b hotfix/v1.0.1

# Make the fix and update version
# Update manifest-chrome.json, manifest-firefox.json, package.json, CHANGELOG.md
git commit -m "fix: critical bug description"

# Merge to master
git checkout master
git merge --no-ff hotfix/v1.0.1 -m "Hotfix v1.0.1"
git push origin master

# Tag the hotfix
git tag -a v1.0.1 -m "Hotfix v1.0.1 - Critical bug fix"
git push origin v1.0.1

# Merge back to development
git checkout development
git merge master
git push origin development

# Delete hotfix branch
git branch -d hotfix/v1.0.1

# Submit hotfix to Chrome Web Store and AMO following normal process
```

## Pre-Release Checklist

Before creating a release, ensure:

- [ ] Firebase security rules deployed (`npm run firebase:deploy`)
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds for both browsers (`npm run build`)
- [ ] Extension loads and works in Chrome
- [ ] Extension loads and works in Firefox
- [ ] All features work identically in both browsers
- [ ] Email verification flow works (signup, verification email sent)
- [ ] Version numbers updated in manifest-chrome.json, manifest-firefox.json, and package.json
- [ ] CHANGELOG.md updated with all changes
- [ ] All changes committed to development branch

## Troubleshooting

**Problem:** Merge conflicts when merging development to master
- **Solution:** Resolve conflicts carefully, prioritizing master's stability. Test thoroughly after resolving.

**Problem:** Forgot to update version numbers
- **Solution:** Make the change on development, commit, then cherry-pick to master before tagging.

**Problem:** Need to undo a release
- **Solution:** Delete the tag locally and remotely, revert the merge commit on master.
  ```bash
  git tag -d v1.1.0
  git push origin :refs/tags/v1.1.0
  git revert -m 1 <merge-commit-hash>
  ```

**Problem:** AMO review rejection
- **Solution:** Read reviewer feedback carefully, make requested changes on development, create a new version (bump patch number), and resubmit.

**Problem:** Chrome Web Store vs AMO version mismatch
- **Solution:** Both stores should have the same version number. If one is rejected, increment the version and submit both again together.

**Problem:** Firefox extension not working after approval
- **Solution:** Check Firefox browser console for errors, verify manifest-firefox.json is correct, ensure all browser.* API calls are properly polyfilled.