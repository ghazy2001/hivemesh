# HiveMesh Swarm Engine — Setup Guide

Thank you for acquiring the **HiveMesh Parallel Swarm Orchestrator**! Follow these quick steps to start running parallel agent swarms in Claude Code, Cursor, or your terminal.

---

## Step 1: Verify Prerequisites
Ensure you have Node.js (v22+) and Git installed:
```bash
npx hivemesh doctor
```
You should see all green checkmarks for Node.js, Git, and SQLite FTS5.

---

## Step 2: Configure Your Agent

### For Claude Code / Claude Desktop:
Add the configuration from `mcp-config.template.json` to your `claude_desktop_config.json` or project `.mcp.json`:
```json
{
  "mcpServers": {
    "hivemesh": {
      "command": "npx",
      "args": ["-y", "hivemesh@latest", "run"]
    }
  }
}
```

### For Cursor:
1. Copy `cursor-rules.md` into your project at `.cursor/rules/hivemesh.mdc`.
2. Reference `@hivemesh` in Cursor Composer to plan and launch parallel swarms.

---

## Step 3: Run Your First Parallel Swarm
Run in your project root:
```bash
npx hivemesh run "Add WebAuthn biometric passkeys with session refresh" --roles backend,frontend,security
```

Inspect active swarms anytime:
```bash
npx hivemesh status
```

Clean up when finished:
```bash
npx hivemesh clean <swarmId>
```

---

## Support & Open Source Repository
* **GitHub**: https://github.com/ghazy2001/hivemesh
* **Author**: Mahmoud Ghazy (@ghazy2001)
