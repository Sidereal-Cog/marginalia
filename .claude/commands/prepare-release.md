---
description: Prepare a new release version
allowed-tools: Bash(git *), Bash(npm *)
---

Prepare a new release following the Marginalia release workflow:

## Version Update

Update version in ALL three files:
1. `package.json` - version field
2. `manifest-chrome.json` - version field
3. `manifest-firefox.json` - version field

Version: $ARGUMENTS

## Pre-Release Checklist

Run these checks:
1. `npm test` - All tests must pass
2. `npm run lint` - Linting must pass
3. `npm run build` - Build must succeed for both browsers
4. Test extension in Chrome manually
5. Test extension in Firefox manually
6. Verify all features work identically in both browsers

## Update CHANGELOG.md

Add entry for this version with:
- New features
- Bug fixes
- Breaking changes (if any)
- Improvements

## Create Release Branch

```bash
git checkout development
git checkout -b release/v$ARGUMENTS
```

After version updates and changelog:
```bash
git add package.json manifest-chrome.json manifest-firefox.json CHANGELOG.md
git commit -m "chore: bump version to v$ARGUMENTS"
```

See RELEASE.md for complete release workflow.