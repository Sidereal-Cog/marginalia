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

# Run full test suite
npm test

# Run linting
npm run lint
```

### 2. Update Version and Documentation

Update version numbers in:
- `public/manifest.json` - Chrome extension version (e.g., `"version": "1.0.0"`)
- `package.json` - npm package version (e.g., `"version": "1.0.0"`)

Update `CHANGELOG.md`:
- Add a new section for the version
- List all Added, Changed, Fixed, and Removed items
- Include the release date

Example CHANGELOG entry:
```markdown
## [1.1.0] - 2025-01-15

### Added
- Search functionality across all notes
- Dark mode support

### Fixed
- Badge counts not updating on context change
```

### 3. Commit Version Changes

```bash
# Commit version and changelog updates
git add public/manifest.json package.json CHANGELOG.md
git commit -m "chore: prepare v1.1.0 release"

# Push to development
git push origin development
```

### 4. Build and Package

```bash
# Build the extension
npm run build

# Create release zip
npm run package

# This creates: releases/marginalia-1.1.0.zip
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

### 7. Create GitHub Release

1. Go to your repository → Releases → New Release
2. Select the tag you just created (e.g., `v1.1.0`)
3. Release title: `v1.1.0 - [Brief Description]`
4. Copy the CHANGELOG entry for this version into the description
5. Attach the zip file from `releases/marginalia-1.1.0.zip`
6. Publish release

### 8. Continue Development

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
# Update manifest.json, package.json, CHANGELOG.md
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
```

## Pre-Release Checklist

Before creating a release, ensure:

- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Extension loads and works in browser
- [ ] Version numbers updated in manifest.json and package.json
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