# .claude Directory

This directory contains configuration files for [Claude Code](https://docs.claude.com/en/docs/claude-code), Anthropic's AI coding assistant CLI tool.

## Files

### CLAUDE.md
Main context file that Claude Code automatically loads. Contains:
- Project architecture and tech stack
- Code standards and patterns
- Common commands
- Firebase data structure
- Testing workflow
- Troubleshooting guide

This file gives Claude Code full context about the Marginalia project without needing to scan the entire codebase.

### settings.json
Permission configuration for Claude Code. Defines:
- **Allowed tools**: What Claude can read/write/execute
- **Denied paths**: Sensitive files Claude should never access (Firebase config, .env files)

This ensures Claude Code doesn't accidentally modify sensitive files or output directories.

### commands/
Custom slash commands that extend Claude Code's capabilities:

- `/test-feature` - Run full test suite and build after implementing a feature
- `/add-component [name]` - Create a new React component following project patterns
- `/prepare-release [version]` - Prepare a new release with version bumps
- `/debug-extension [issue]` - Debug common browser extension issues

## Usage

### Setup

These files are already in your repo. Claude Code will automatically discover and use them when you run it from the project directory:

```bash
# Just run Claude Code from your project root
claude

# Claude will automatically load .claude/CLAUDE.md
# and respect permissions in .claude/settings.json
```

### Custom Commands

Use slash commands during a Claude Code session:

```bash
# After implementing a feature
> /test-feature

# When you need a new component
> /add-component NoteEditor

# Before creating a release
> /prepare-release 1.2.0

# When debugging an issue
> /debug-extension "badges not showing"
```

### Modifying Configuration

**To add more allowed paths:**
Edit `settings.json` and add to the `allowedTools` array:
```json
"allowedTools": [
  "Write(new-directory/**)"
]
```

**To add custom commands:**
Create a new `.md` file in the `commands/` directory:
```bash
echo "Your command description here" > commands/my-command.md
```

**To update context:**
Edit `CLAUDE.md` to add new patterns, gotchas, or conventions as you discover them.

## Why This Exists

Claude Code works best with explicit context about:
- Your coding standards
- Project architecture
- Common patterns
- Things to avoid
- Testing requirements

These files provide that context efficiently, so Claude doesn't need to:
1. Read your entire codebase every time
2. Re-learn your patterns in each session
3. Guess at conventions

## Documentation

For more on Claude Code configuration:
- [Official Claude Code docs](https://docs.claude.com/en/docs/claude-code)
- [Settings reference](https://docs.claude.com/en/docs/claude-code/settings)

## Maintenance

Update these files when:
- You discover new patterns or gotchas
- You change tech stack or major dependencies
- You add new conventions or standards
- You find common issues that should be documented

Think of this directory as "institutional knowledge" for AI assistants working on your codebase.