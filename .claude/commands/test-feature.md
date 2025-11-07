---
description: Run full test suite and build to verify no regressions
allowed-tools: Bash(npm *)
---

Run the following checks to verify the feature works correctly:

1. Run all tests: `npm test`
2. Build both browsers: `npm run build`
3. Check for TypeScript errors
4. Verify tests pass with good coverage

If any issues are found, fix them before considering the feature complete.